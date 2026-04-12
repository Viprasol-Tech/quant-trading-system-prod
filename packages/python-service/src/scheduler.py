"""
APScheduler - Automated trading system jobs
Handles: daily scans, position monitoring, risk checks
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import requests
import logging
import os
from datetime import datetime
import pytz
from notifications import get_notifier

logger = logging.getLogger(__name__)

BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:6005')

# Asset universe to scan (Shariah-compliant, confirmed on IBKR)
ASSET_UNIVERSE = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
    'SPUS', 'HLAL', 'UMMA',
    'GLD', 'GLDM', 'IAU', 'IAUM', 'SGOL', 'BAR',
    'SLV', 'SIVR', 'PSLV',
    'CVX', 'COP', 'XOM'
]

# Track last scan results
_last_scan_time = None
_last_scan_symbols = []
_last_scan_signals = 0

scheduler = BackgroundScheduler(timezone=pytz.timezone('America/New_York'))


def run_daily_scan():
    """
    Daily Market Scan (runs Monday-Friday at 4:30 PM US Eastern)
    Scans all symbols for trading signals
    """
    global _last_scan_time, _last_scan_symbols, _last_scan_signals

    logger.info(f"Starting daily scan at {datetime.now(pytz.timezone('America/New_York'))}")

    results = []
    symbols_checked = 0

    for symbol in ASSET_UNIVERSE:
        try:
            symbols_checked += 1

            # POST to backend: trigger signal generation for this symbol
            response = requests.post(
                f'{BACKEND_URL}/api/signals/scan',
                json={'symbol': symbol},
                timeout=30
            )

            if response.ok:
                data = response.json()
                if data.get('data'):  # If signal was generated
                    results.append({
                        'symbol': symbol,
                        'signal': data.get('data'),
                        'timestamp': datetime.now().isoformat()
                    })
                    logger.info(f"SIGNAL: {symbol} -> {data.get('data', {}).get('action')}")

        except Exception as e:
            logger.warning(f"Scan failed for {symbol}: {e}")

    _last_scan_time = datetime.now().isoformat()
    _last_scan_symbols = [r['symbol'] for r in results]
    _last_scan_signals = len(results)

    logger.info(f"Daily scan complete. Checked {symbols_checked} symbols, {len(results)} signals generated.")
    return results


def monitor_positions():
    """
    Position Monitor (runs every 5 minutes during market hours)
    Checks active positions against their stop loss and take profit levels
    """
    try:
        # Get current positions with real market data
        pos_response = requests.get(f'{BACKEND_URL}/api/positions', timeout=10)
        if not pos_response.ok:
            logger.debug("Failed to get positions, skipping monitor cycle")
            return

        positions_data = pos_response.json()
        # Backend returns: {"data": {"positions": [...], "count": N}}
        data = positions_data.get('data', {})

        # Extract positions array from data dict
        if isinstance(data, dict):
            positions_list = data.get('positions', [])  # Extract 'positions' key specifically
        elif isinstance(data, list):
            positions_list = data  # Already a list
        else:
            logger.debug("No open positions to monitor")
            return

        if not positions_list:
            logger.debug("No open positions to monitor")
            return

        # Monitor each position against its SL/TP from signals_log
        for pos_data in positions_list:
            try:
                symbol = pos_data.get('symbol', '')
                # Backend returns camelCase: currentPrice not current_price
                current_price = float(pos_data.get('currentPrice') or pos_data.get('current_price', 0))
                qty = abs(float(pos_data.get('qty', 0)))

                if not symbol or current_price <= 0 or qty <= 0:
                    continue

                # Fetch the most recent acted-on signal for this symbol
                sig_response = requests.get(
                    f'{BACKEND_URL}/api/signals/active/{symbol}',
                    timeout=5
                )

                if not sig_response.ok:
                    logger.debug(f"No active signal for {symbol}")
                    continue

                signal = sig_response.json().get('data')
                if not signal:
                    continue

                stop_loss = float(signal.get('stop_loss', 0))
                take_profit = float(signal.get('take_profit', 0))

                if stop_loss <= 0 and take_profit <= 0:
                    continue

                # Check stop loss
                if stop_loss > 0 and current_price <= stop_loss:
                    logger.warning(
                        f"STOP LOSS HIT: {symbol} at ${current_price:.2f} "
                        f"(stop=${stop_loss:.2f})"
                    )
                    # Submit close order
                    close_response = requests.post(
                        f'{BACKEND_URL}/api/positions/{symbol}/close',
                        json={'quantity': qty},
                        timeout=10
                    )
                    if close_response.ok:
                        logger.info(f"Stop loss order submitted for {symbol} ({qty} shares)")
                        notifier = get_notifier()
                        notifier.send_alert(
                            subject=f"Stop Loss Triggered: {symbol}",
                            body=f"Stop loss hit at ${current_price:.2f} (target: ${stop_loss:.2f}). "
                                 f"Close order submitted for {int(qty)} shares.",
                            alert_type='warning'
                        )
                    continue  # Don't check TP if SL hit

                # Check take profit
                if take_profit > 0 and current_price >= take_profit:
                    logger.info(
                        f"TAKE PROFIT HIT: {symbol} at ${current_price:.2f} "
                        f"(target=${take_profit:.2f})"
                    )
                    close_response = requests.post(
                        f'{BACKEND_URL}/api/positions/{symbol}/close',
                        json={'quantity': qty},
                        timeout=10
                    )
                    if close_response.ok:
                        logger.info(f"Take profit order submitted for {symbol} ({qty} shares)")
                        notifier = get_notifier()
                        notifier.send_alert(
                            subject=f"Take Profit Hit: {symbol}",
                            body=f"Take profit hit at ${current_price:.2f} (target: ${take_profit:.2f}). "
                                 f"Close order submitted for {int(qty)} shares.",
                            alert_type='info'
                        )

            except Exception as e:
                logger.warning(f"Error monitoring {symbol}: {e}")

    except Exception as e:
        logger.error(f"Position monitor error: {e}")


def check_risk():
    """
    Risk Check — runs every 30 minutes during market hours
    Checks drawdown and alerts if thresholds breached
    """
    try:
        # Get current account equity and risk metrics
        response = requests.get(f'{BACKEND_URL}/api/risk/metrics', timeout=10)
        if not response.ok:
            logger.debug("Failed to get risk metrics, skipping check")
            return

        data = response.json().get('data', {})

        # Parse metrics (they may come as strings with % signs)
        portfolio_heat_str = str(data.get('portfolioHeat', '0')).replace('%', '').strip()
        current_drawdown_str = str(data.get('currentDrawdown', '0')).replace('%', '').strip()

        try:
            portfolio_heat = float(portfolio_heat_str) if portfolio_heat_str else 0
            current_drawdown = float(current_drawdown_str) if current_drawdown_str else 0
        except ValueError:
            logger.warning(f"Could not parse metrics: heat={portfolio_heat_str}, dd={current_drawdown_str}")
            return

        logger.info(f"Risk check: Heat={portfolio_heat:.1f}%, Drawdown={current_drawdown:.1f}%")

        notifier = get_notifier()

        # Alert at each drawdown threshold
        if current_drawdown >= 20:
            logger.critical(f"DRAWDOWN HALTED: {current_drawdown:.1f}% >= 20%")
            notifier.notify_drawdown_threshold(current_drawdown, 20)

        elif current_drawdown >= 15:
            logger.warning(f"DRAWDOWN RED: {current_drawdown:.1f}% >= 15%")
            notifier.notify_drawdown_threshold(current_drawdown, 15)

        elif current_drawdown >= 10:
            logger.warning(f"DRAWDOWN ORANGE: {current_drawdown:.1f}% >= 10%")
            notifier.notify_drawdown_threshold(current_drawdown, 10)

        elif current_drawdown >= 5:
            logger.info(f"DRAWDOWN YELLOW: {current_drawdown:.1f}% >= 5%")
            notifier.notify_drawdown_threshold(current_drawdown, 5)

        # Alert on high portfolio heat
        if portfolio_heat > 7:
            logger.warning(f"HIGH PORTFOLIO HEAT: {portfolio_heat:.1f}% (limit: 7%)")
            notifier.send_alert(
                subject=f"Portfolio Heat Warning: {portfolio_heat:.1f}%",
                body=f"Current portfolio heat ({portfolio_heat:.1f}%) exceeds limit (7%). "
                     f"Current drawdown: {current_drawdown:.1f}%",
                alert_type='warning'
            )

    except Exception as e:
        logger.error(f"Risk check error: {e}")


def start_scheduler():
    """
    Start the APScheduler

    CRITICAL: WERKZEUG guard prevents duplicate execution in Flask debug reloader.
    Flask reloader spawns two processes: parent (not running) and child (runs the app).
    WERKZEUG_RUN_MAIN env var is set ONLY in the child process.
    Without this guard, APScheduler starts in BOTH processes, duplicating all jobs.
    """
    # WERKZEUG guard: skip ONLY in Flask reloader PARENT process (development only)
    # WERKZEUG_RUN_MAIN='true' is set ONLY in the child process
    # In production (docker, direct python app.py), WERKZEUG_RUN_MAIN is never set
    # and scheduler MUST start
    if os.environ.get('FLASK_ENV') == 'development' and \
       os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        logger.warning("APScheduler: Skipping in Flask reloader parent process (dev mode)")
        return

    if not scheduler.running:
        # Schedule daily scan: 4:30 PM Eastern, Monday-Friday
        # (Two windows to ensure coverage: 9:30-9:55 AM and 10:00 AM-3:55 PM)
        scheduler.add_job(
            run_daily_scan,
            CronTrigger(hour=16, minute=30, day_of_week='mon-fri'),
            id='daily_scan',
            name='Daily Market Scan',
            replace_existing=True
        )
        logger.info("Scheduled: Daily scan at 16:30 ET (Mon-Fri)")

        # Schedule position monitor: every 5 minutes during market hours
        # Two jobs for precise coverage: 9:30-9:55 AM + 10:00 AM-3:55 PM
        # APScheduler cannot express "9:30 to 15:55 every 5 min" in a single CronTrigger

        # Job 1: 9:30 AM to 9:55 AM (market open window)
        scheduler.add_job(
            monitor_positions,
            CronTrigger(hour=9, minute='30,35,40,45,50,55', day_of_week='mon-fri', timezone='America/New_York'),
            id='position_monitor_open',
            name='Position Monitor (Market Open)',
            replace_existing=True
        )
        logger.info("Scheduled: Position monitor at 9:30-9:55 AM ET (Mon-Fri)")

        # Job 2: 10:00 AM to 3:55 PM (main market hours)
        scheduler.add_job(
            monitor_positions,
            CronTrigger(hour='10-15', minute='*/5', day_of_week='mon-fri', timezone='America/New_York'),
            id='position_monitor_main',
            name='Position Monitor (Main Hours)',
            replace_existing=True
        )
        logger.info("Scheduled: Position monitor every 5 min at 10:00 AM-3:55 PM ET (Mon-Fri)")

        # Schedule risk check: every 30 minutes during market hours
        # Hour range 9-16 covers 9:00-16:59 (captures full trading day)
        scheduler.add_job(
            check_risk,
            CronTrigger(hour='9-16', minute='*/30', day_of_week='mon-fri'),
            id='risk_check',
            name='Risk Check',
            replace_existing=True
        )
        logger.info("Scheduled: Risk check every 30 min (9:00-16:59 ET, Mon-Fri)")

        scheduler.start()
        logger.info("APScheduler started (in WERKZEUG child process)")


def stop_scheduler():
    """Stop the APScheduler"""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler stopped")


def get_scan_status():
    """Get status of last scan"""
    return {
        'last_scan_time': _last_scan_time,
        'last_scan_symbols': _last_scan_symbols,
        'last_scan_signals': _last_scan_signals,
        'symbols_to_scan': len(ASSET_UNIVERSE),
        'scheduler_running': scheduler.running
    }
