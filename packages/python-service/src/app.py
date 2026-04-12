"""
Python Service - Flask API for Trading System
Bridges between Frontend/Backend and IBKR Gateway

CRITICAL: Uses dedicated event loop thread + run_coroutine_threadsafe() for thread-safe
asyncio communication. This is the ONLY correct pattern for Flask + ib_insync integration.
See: https://docs.python.org/3/library/asyncio-dev.html#debug-mode
"""

import asyncio
import logging
import os
import sys
import threading
import time
from datetime import datetime
from concurrent.futures import Future

# Add src directory to path BEFORE imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from ibkr_connector import get_connector
from scheduler import start_scheduler, stop_scheduler, get_scan_status, run_daily_scan
from notifications import get_notifier

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app
app = Flask(__name__)
CORS(app)

# ======================
# DEDICATED IB_INSYNC EVENT LOOP THREAD (Topic 5 fix)
# ======================

_ib_loop: asyncio.AbstractEventLoop = None
_loop_ready = threading.Event()

def _start_ib_event_loop():
    """
    Run ib_insync in a dedicated background thread with its own event loop.
    This is the ONLY correct pattern for Flask + ib_insync.

    Why NOT loop.run_until_complete(): It must be called from the thread that
    owns the loop, and CANNOT be called while the loop is already running.
    ib.run() keeps the loop running forever, so run_until_complete() will crash.

    Correct pattern: dedicated thread with run_coroutine_threadsafe().
    """
    global _ib_loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    _ib_loop = loop

    try:
        logger.info("IB event loop thread: starting ib_insync connection...")
        connector = get_connector()

        # Connect synchronously in the asyncio thread
        async def connect_ib():
            await connector.connect(retries=3)

        loop.run_until_complete(connect_ib())
        logger.info("IB event loop thread: IBKR connected successfully")
    except Exception as e:
        logger.error(f"IB event loop thread: connection failed: {e}")

    _loop_ready.set()

    try:
        logger.info("IB event loop thread: starting ib.run() (runs forever)")
        connector.ib.run()
    except Exception as e:
        logger.error(f"IB event loop thread: ib.run() crashed: {e}")
    finally:
        logger.info("IB event loop thread: shutting down")
        loop.close()

def _ib_call(coro, timeout=10):
    """
    Thread-safe bridge from Flask thread → ib_insync event loop thread.

    ONLY correct way to schedule async work from a different thread.
    See: https://docs.python.org/3/library/asyncio.html#asyncio.run_coroutine_threadsafe

    Returns: result (not a Future) or raises exception
    Timeout: seconds to wait (default 10, set higher for slow operations)
    """
    if _ib_loop is None:
        raise RuntimeError("IB event loop not initialized")

    future: Future = asyncio.run_coroutine_threadsafe(coro, _ib_loop)
    return future.result(timeout=timeout)

# Start IB event loop thread at module level (BEFORE Flask starts)
_ib_thread = threading.Thread(target=_start_ib_event_loop, daemon=True)
_ib_thread.start()

# Wait for IBKR connection with 30-second timeout (don't block forever)
if not _loop_ready.wait(timeout=30):
    logger.warning("IBKR connection timeout after 30s — continuing anyway (server will retry)")
else:
    logger.info("IBKR event loop thread started and ready")

# Start scheduler at MODULE LEVEL (works for all deployment methods: docker, direct python, gunicorn)
# Module-level code runs regardless of how app.py is invoked
start_scheduler()
logger.info("Scheduler initialized at module level")

# ======================
# WEBSOCKET BACKGROUND PUSH (BUG 2 FIX)
# ======================

BACKEND_WS_UPDATE_URL = os.getenv('BACKEND_WS_UPDATE_URL', 'http://localhost:6005/api/ws-update')
FALLBACK_INTERVAL = 30  # seconds

def _collect_and_post():
    """
    Background function to collect IBKR data and POST to backend for WebSocket broadcast.
    Uses thread-safe _ib_call() to get real position data (not raw cache).

    This runs every FALLBACK_INTERVAL seconds and pushes updates to connected clients.
    """
    try:
        connector = get_connector()
        if not connector.connected:
            logger.debug("IBKR not connected, skipping WS update")
            return

        # Use _ib_call to get real data with market prices (thread-safe)
        async def _get_all():
            account = await connector.get_account_summary()
            positions = await connector.get_positions()
            open_orders = connector.ib.openOrders()
            return account, positions, open_orders

        account_data, positions_dict, open_orders = _ib_call(_get_all(), timeout=30)

        # Build portfolio data
        portfolio_data = {
            'totalEquity': str(account_data.get('net_liquidation', 0)),
            'cash': str(account_data.get('total_cash', 0)),
            'buyingPower': str(account_data.get('buying_power', 0)),
            'dayPnL': '0',
            'unrealizedPnL': str(account_data.get('net_liquidation', 0))
        }

        # Build positions list (positions_dict has real market data)
        positions_list = []
        for symbol, pos_data in positions_dict.items():
            positions_list.append({
                'symbol': pos_data.get('symbol', symbol),
                'qty': pos_data.get('qty', '0'),
                'avg_entry_price': pos_data.get('avg_entry_price', '0'),
                'current_price': pos_data.get('current_price', '0'),
                'market_value': pos_data.get('market_value', '0'),
                'unrealized_pl': pos_data.get('unrealized_pl', '0'),
                'unrealized_plpc': pos_data.get('unrealized_plpc', '0'),
            })

        # Build orders list
        orders_list = []
        for trade in open_orders:
            orders_list.append({
                'id': str(trade.order.orderId),
                'symbol': trade.contract.symbol,
                'qty': str(trade.order.totalQuantity),
                'side': trade.order.action.lower() if trade.order.action else 'buy',
                'status': trade.orderStatus.status if trade.orderStatus else 'pending',
                'created_at': datetime.now().isoformat()
            })

        payload = {
            'type': 'portfolio_update',
            'timestamp': datetime.now().isoformat(),
            'data': {
                'portfolio': portfolio_data,
                'positions': positions_list,
                'orders': orders_list
            }
        }

        # POST to backend
        response = requests.post(BACKEND_WS_UPDATE_URL, json=payload, timeout=5)
        if response.status_code == 200:
            logger.debug(f"Posted WS update: {len(positions_list)} positions")
        else:
            logger.warning(f"Backend returned {response.status_code}")

    except Exception as e:
        logger.error(f"Error in _collect_and_post: {e}")

def _ws_update_loop():
    """Infinite loop for WebSocket updates - collects IBKR data and POSTs to backend every FALLBACK_INTERVAL seconds"""
    while True:
        time.sleep(FALLBACK_INTERVAL)
        _collect_and_post()

_ws_thread = threading.Thread(target=_ws_update_loop, daemon=True)
_ws_thread.start()
logger.info(f"WebSocket push thread started (interval: {FALLBACK_INTERVAL}s)")

# ======================
# HEALTH CHECK ENDPOINT
# ======================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    connector = get_connector()
    return jsonify({
        'status': 'healthy',
        'ibkr_connected': connector.connected,
        'timestamp': datetime.now().isoformat(),
    })

# ======================
# ACCOUNT ENDPOINTS
# ======================

@app.route('/account/summary', methods=['GET'])
def account_summary():
    """Get account information"""
    async def get_data():
        connector = get_connector()
        return await connector.get_account_summary()

    data = _ib_call(get_data())
    return jsonify(data)

# ======================
# POSITIONS ENDPOINTS
# ======================

@app.route('/positions', methods=['GET'])
def get_positions():
    """Get current positions"""
    async def get_data():
        connector = get_connector()
        return await connector.get_positions()

    positions = _ib_call(get_data())
    return jsonify(positions)

# ======================
# ORDERS ENDPOINTS
# ======================

@app.route('/orders', methods=['GET'])
def get_open_orders():
    """Get all open orders"""
    async def get_data():
        connector = get_connector()
        return await connector.get_open_orders()

    orders = _ib_call(get_data())
    return jsonify(orders)

@app.route('/orders', methods=['POST'])
def submit_order():
    """Submit new order"""
    data = request.json

    async def submit():
        connector = get_connector()
        return await connector.submit_order(
            symbol=data.get('symbol'),
            quantity=int(data.get('quantity', 0)),
            order_type=data.get('order_type', 'MKT'),
            price=data.get('price')
        )

    result = _ib_call(submit())

    if result:
        return jsonify(result), 200
    else:
        return jsonify({'error': 'Failed to submit order'}), 400

@app.route('/orders/<int:order_id>', methods=['DELETE'])
def cancel_order(order_id):
    """Cancel order by ID"""
    async def cancel():
        connector = get_connector()
        return await connector.cancel_order(order_id)

    success = _ib_call(cancel())

    if success:
        return jsonify({'status': 'cancelled'}), 200
    else:
        return jsonify({'error': 'Failed to cancel order'}), 400

# ======================
# MARKET DATA ENDPOINTS
# ======================

@app.route('/market/<symbol>', methods=['GET'])
def get_market_data(symbol):
    """Get market data for symbol"""
    async def get_data():
        connector = get_connector()
        return await connector.get_market_data(symbol)

    data = _ib_call(get_data())

    if data:
        return jsonify(data), 200
    else:
        return jsonify({'error': 'Failed to get market data'}), 400

@app.route('/historical/<symbol>', methods=['GET'])
def get_historical_data(symbol):
    """Get historical data"""
    bar_size = request.args.get('bar_size', '1 day')
    duration = request.args.get('duration', '1 M')

    async def get_data():
        connector = get_connector()
        return await connector.get_historical_data(symbol, bar_size, duration)

    data = _ib_call(get_data())
    return jsonify(data)

# ======================
# TRADING SIGNAL ENDPOINTS
# ======================

@app.route('/signals/generate', methods=['POST'])
def generate_signals():
    """Generate trading signals (placeholder - links to backend strategies)"""
    data = request.json
    symbols = data.get('symbols', [])

    # This would call your actual strategy engine
    # For now, return template
    signals = []
    for symbol in symbols:
        signals.append({
            'symbol': symbol,
            'strategy': 'Trend Breakout',
            'type': 'BUY',
            'confidence': 0.85,
            'entry': 100.00,
            'stop': 95.00,
            'target': 110.00,
            'compliant': True,
        })

    return jsonify({
        'total': len(signals),
        'signals': signals,
    })

@app.route('/signals/execute', methods=['POST'])
def execute_signal():
    """Execute a trading signal"""
    data = request.json
    signal = data.get('signal', {})

    async def execute():
        connector = get_connector()
        return await connector.submit_order(
            symbol=signal.get('symbol'),
            quantity=int(signal.get('quantity', 10)),
            order_type='MKT'
        )

    result = _ib_call(execute())

    if result:
        return jsonify(result), 200
    else:
        return jsonify({'error': 'Execution failed'}), 400

# ======================
# SCHEDULER / AUTOMATED SCANNING
# ======================

@app.route('/scan/trigger', methods=['GET'])
def trigger_scan():
    """Manually trigger the daily scan immediately"""
    try:
        logger.info("Manual scan triggered via API")
        results = run_daily_scan()
        return jsonify({
            'success': True,
            'message': f'Scan completed: {len(results)} signals found',
            'signals': results
        }), 200
    except Exception as e:
        logger.error(f"Scan trigger failed: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/scan/status', methods=['GET'])
def scan_status():
    """Get status of last scan"""
    try:
        status = get_scan_status()
        return jsonify({
            'success': True,
            'data': status
        }), 200
    except Exception as e:
        logger.error(f"Failed to get scan status: {e}")
        return jsonify({'error': str(e)}), 500

# ======================
# ERROR HANDLERS
# ======================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def server_error(error):
    logger.error(f"Server error: {error}")
    return jsonify({'error': 'Internal server error'}), 500

# ======================
# RUN
# ======================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 6105))
    logger.info(f"Starting Python service on port {port}")

    # IBKR is already connected in the dedicated event loop thread
    # Scheduler is already started at module level (works for all deployment methods)

    try:
        app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
    finally:
        # Cleanup on shutdown
        stop_scheduler()
        logger.info("Python service shutdown complete")
