"""
Python Service - Flask API for Trading System
Bridges between Frontend/Backend and IBKR Gateway
"""

import asyncio
import logging
import os
import sys
import threading
import time
from datetime import datetime

# Add src directory to path BEFORE imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from ibkr_connector import get_connector

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app
app = Flask(__name__)
CORS(app)

# Global event loop - set before first use
def get_event_loop():
    """Get or create event loop properly"""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                raise RuntimeError("Event loop is closed")
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
    return loop

# Initialize IBKR on startup
def ensure_ibkr_connected():
    """Ensure IBKR is connected before handling requests"""
    async def init():
        connector = get_connector()
        try:
            logger.info("Attempting to connect to IBKR...")
            await connector.connect()
            logger.info("IBKR connection successful!")
        except Exception as e:
            logger.warning(f"IBKR connection failed: {e}")

    try:
        loop = get_event_loop()
        loop.run_until_complete(init())
    except Exception as e:
        logger.error(f"Event loop error: {e}")

# ======================
# WEBSOCKET BACKGROUND THREAD
# ======================

_debounce_timer = None
_debounce_lock = threading.Lock()
BACKEND_WS_UPDATE_URL = os.getenv('BACKEND_URL', 'http://backend:6005') + '/api/ws-update'
DEBOUNCE_INTERVAL = 0.15  # 150ms debounce
FALLBACK_INTERVAL = 30  # 30s fallback

def _collect_and_post():
    """Collect current IBKR data and POST to backend"""
    try:
        connector = get_connector()
        if not connector.connected:
            logger.debug("IBKR not connected, skipping WS update")
            return

        # Get current data from ib_insync cache (thread-safe)
        account_summary = connector.ib.accountSummary()
        positions = connector.ib.positions()
        open_orders = connector.ib.openOrders()

        # Build payload
        portfolio_data = {
            'totalEquity': '0',
            'cash': '0',
            'buyingPower': '0',
            'dayPnL': '0',
            'unrealizedPnL': '0'
        }

        for value in account_summary:
            if value.tag == 'NetLiquidation':
                portfolio_data['totalEquity'] = str(value.value)
            elif value.tag == 'TotalCashValue':
                portfolio_data['cash'] = str(value.value)
            elif value.tag == 'BuyingPower':
                portfolio_data['buyingPower'] = str(value.value)
            elif value.tag == 'DayTradesRemainingT+1':
                portfolio_data['dayPnL'] = str(value.value)

        positions_list = []
        for pos in positions:
            positions_list.append({
                'symbol': pos.contract.symbol,
                'qty': str(pos.position),
                'avg_entry_price': str(pos.avgCost) if pos.avgCost else None,
                'current_price': None,  # Not directly available from position object
                'market_value': str(pos.position * (pos.avgCost or 0)),
                'unrealized_pl': '0',  # Placeholder
                'unrealized_plpc': '0'  # Placeholder
            })

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
        try:
            response = requests.post(BACKEND_WS_UPDATE_URL, json=payload, timeout=5)
            if response.status_code == 200:
                logger.debug(f"Posted WS update to backend ({len(positions_list)} positions, {len(orders_list)} orders)")
            else:
                logger.warning(f"Backend returned {response.status_code}: {response.text}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"Failed to POST to backend: {e}")

    except Exception as e:
        logger.error(f"Error in _collect_and_post: {e}")

def _schedule_update(hint: str):
    """Schedule a debounced update"""
    global _debounce_timer

    with _debounce_lock:
        # Cancel pending timer
        if _debounce_timer is not None:
            _debounce_timer.cancel()

        # Schedule new update
        _debounce_timer = threading.Timer(DEBOUNCE_INTERVAL, _collect_and_post)
        _debounce_timer.daemon = True
        _debounce_timer.start()

def _ibkr_background_thread():
    """Background thread that listens to IBKR events and posts updates"""
    try:
        # Create dedicated event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        logger.info("Starting IBKR background thread...")

        # Connect to IBKR
        connector = get_connector()
        loop.run_until_complete(connector.connect())

        # Register event callbacks
        connector.register_event_callbacks(_schedule_update)

        # Run IBKR event loop in a separate thread
        logger.info("Running IBKR event loop...")
        connector.ib.run()

    except Exception as e:
        logger.error(f"IBKR background thread error: {e}")
    finally:
        logger.info("IBKR background thread exiting")

# Start background thread at module level (before Flask starts)
_bg_thread = threading.Thread(target=_ibkr_background_thread, daemon=True)
_bg_thread.start()
logger.info("IBKR background thread started (daemon)")

# Also setup fallback polling every 30s in case events don't fire
def _fallback_update_loop():
    """Fallback: periodically collect and post data"""
    while True:
        try:
            time.sleep(FALLBACK_INTERVAL)
            _collect_and_post()
        except Exception as e:
            logger.error(f"Fallback update loop error: {e}")

_fallback_thread = threading.Thread(target=_fallback_update_loop, daemon=True)
_fallback_thread.start()
logger.info("Fallback update thread started (daemon)")

# ======================
# HEALTH CHECK ENDPOINT
# ======================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    ensure_ibkr_connected()
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

    data = loop.run_until_complete(get_data())
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

    positions = loop.run_until_complete(get_data())
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

    orders = loop.run_until_complete(get_data())
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

    result = loop.run_until_complete(submit())

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

    success = loop.run_until_complete(cancel())

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

    data = loop.run_until_complete(get_data())

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

    data = loop.run_until_complete(get_data())
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

    result = loop.run_until_complete(execute())

    if result:
        return jsonify(result), 200
    else:
        return jsonify({'error': 'Execution failed'}), 400

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
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
