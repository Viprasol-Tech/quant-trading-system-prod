"""
Python Service - Flask API for Trading System
Bridges between Frontend/Backend and IBKR Gateway
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import asyncio
import logging
import os
import sys
from datetime import datetime

# Add src directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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
