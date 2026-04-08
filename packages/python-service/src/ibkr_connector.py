"""
IBKR Gateway Connector - Complete Integration
Handles all communication with Interactive Brokers
"""

from ib_insync import IB, Stock, Contract, Order, util
import asyncio
import logging
import os
from datetime import datetime
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IBKRConnector:
    """Complete IBKR integration for trading system"""

    def __init__(self):
        self.ib = IB()
        self.host = os.getenv('IB_GATEWAY_HOST', '127.0.0.1')
        self.port = int(os.getenv('IB_GATEWAY_PORT', 4002))
        self.client_id = 1
        self.connected = False
        self.positions_cache = {}
        self.orders_cache = {}

    async def connect(self, retries=8):
        """Connect to IBKR Gateway with exponential backoff retry logic"""
        for attempt in range(retries):
            try:
                logger.info(f"Connecting to IBKR ({attempt+1}/{retries})...")

                # Use async connection with timeout
                await self.ib.connectAsync(
                    host=self.host,
                    port=self.port,
                    clientId=self.client_id,
                    readonly=False,
                    timeout=20
                )

                logger.info(f"✅ Connected to IBKR Gateway on {self.host}:{self.port}")
                self.connected = True

                # Request market data type 4 (delayed-frozen data)
                self.ib.reqMarketDataType(4)
                logger.info("Market data type requested: 4 (delayed-frozen)")

                # Get managed accounts (paper accounts need explicit ID)
                try:
                    managed = self.ib.managedAccounts()
                    account_id = managed[0] if managed else ''
                    logger.info(f"Account ID: {account_id}")
                except Exception as e:
                    logger.warning(f"Could not get managed accounts: {e}")

                await self._initialize()
                return True

            except Exception as e:
                logger.warning(f"Connection attempt {attempt+1} failed: {e}")
                wait_time = min(2 ** attempt, 30)  # Cap at 30 seconds
                logger.info(f"Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)

        logger.error(f"Failed to connect after {retries} attempts")
        return False

    async def _initialize(self):
        """Initialize connection and cache data"""
        try:
            logger.info("Initializing IBKR connection...")

            # Get account summary
            account = await self.get_account_summary()
            logger.info(f"Account: {account.get('net_liquidation', 0)}")

            # Get positions
            positions = await self.get_positions()
            logger.info(f"Positions: {len(positions)}")

            # Get open orders
            orders = await self.get_open_orders()
            logger.info(f"Open orders: {len(orders)}")

            logger.info("✅ Initialization complete")
        except Exception as e:
            logger.error(f"Initialization error: {e}")

    async def get_account_summary(self) -> Dict:
        """Get account information from IBKR"""
        if not self.connected:
            return {}

        try:
            summary = self.ib.accountSummary()

            account_data = {
                'net_liquidation': 0,
                'total_cash': 0,
                'buying_power': 0,
                'excess_liquidity': 0,
                'currency': 'USD',
            }

            for value in summary:
                if value.tag == 'NetLiquidation':
                    account_data['net_liquidation'] = float(value.value)
                elif value.tag == 'TotalCashValue':
                    account_data['total_cash'] = float(value.value)
                elif value.tag == 'BuyingPower':
                    account_data['buying_power'] = float(value.value)
                elif value.tag == 'ExcessLiquidity':
                    account_data['excess_liquidity'] = float(value.value)

            return account_data
        except Exception as e:
            logger.error(f"Error getting account summary: {e}")
            return {}

    async def get_positions(self) -> Dict:
        """Get current positions from IBKR"""
        if not self.connected:
            return {}

        try:
            positions = self.ib.positions()

            position_dict = {}
            for pos in positions:
                symbol = pos.contract.symbol
                position_dict[symbol] = {
                    'symbol': symbol,
                    'quantity': pos.position,
                    'avg_cost': pos.avgCost,
                    'account': pos.account,
                }

            self.positions_cache = position_dict
            logger.info(f"Updated {len(positions)} positions")
            return position_dict
        except Exception as e:
            logger.error(f"Error getting positions: {e}")
            return {}

    async def get_open_orders(self) -> List[Dict]:
        """Get open orders from IBKR"""
        if not self.connected:
            return []

        try:
            trades = self.ib.openOrders()

            orders = []
            for trade in trades:
                orders.append({
                    'order_id': trade.order.orderId,
                    'symbol': trade.contract.symbol,
                    'action': trade.order.action,
                    'quantity': trade.order.totalQuantity,
                    'status': trade.orderStatus.status,
                    'filled': trade.orderStatus.filled,
                    'price': trade.order.lmtPrice if trade.order.orderType == 'LMT' else 'MKT',
                })

            self.orders_cache = {o['order_id']: o for o in orders}
            return orders
        except Exception as e:
            logger.error(f"Error getting open orders: {e}")
            return []

    async def submit_order(self, symbol: str, quantity: int, order_type: str = 'MKT',
                          price: Optional[float] = None) -> Optional[Dict]:
        """Submit order to IBKR"""
        if not self.connected:
            logger.error("Not connected to IBKR")
            return None

        try:
            # Create contract
            contract = Stock(symbol, 'SMART', 'USD')
            self.ib.qualifyContracts(contract)

            # Create order
            order = Order()
            order.action = 'BUY' if quantity > 0 else 'SELL'
            order.totalQuantity = abs(quantity)
            order.orderType = order_type

            if order_type == 'LMT' and price:
                order.lmtPrice = price

            # Submit
            trade = self.ib.placeOrder(contract, order)
            await asyncio.sleep(1)

            result = {
                'order_id': trade.order.orderId,
                'symbol': symbol,
                'action': order.action,
                'quantity': order.totalQuantity,
                'status': trade.orderStatus.status,
                'timestamp': datetime.now().isoformat(),
            }

            logger.info(f"Order submitted: {symbol} {order.action} {order.totalQuantity}")
            return result
        except Exception as e:
            logger.error(f"Error submitting order: {e}")
            return None

    async def cancel_order(self, order_id: int) -> bool:
        """Cancel order by ID"""
        if not self.connected:
            return False

        try:
            self.ib.cancelOrder(order_id)
            logger.info(f"Order {order_id} cancelled")
            return True
        except Exception as e:
            logger.error(f"Error cancelling order: {e}")
            return False

    async def get_market_data(self, symbol: str) -> Optional[Dict]:
        """Get real-time market data"""
        if not self.connected:
            return None

        try:
            contract = Stock(symbol, 'SMART', 'USD')
            self.ib.qualifyContracts(contract)
            self.ib.reqMktData(contract)

            await asyncio.sleep(2)

            return {
                'symbol': symbol,
                'last': contract.last,
                'bid': contract.bid,
                'ask': contract.ask,
                'volume': contract.volume,
                'timestamp': datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"Error getting market data: {e}")
            return None

    async def get_historical_data(self, symbol: str, bar_size: str = '1 day',
                                  duration: str = '1 M') -> List[Dict]:
        """Get historical data"""
        if not self.connected:
            return []

        try:
            contract = Stock(symbol, 'SMART', 'USD')
            self.ib.qualifyContracts(contract)

            bars = self.ib.reqHistoricalData(
                contract,
                endDateTime='',
                durationStr=duration,
                barSizeSetting=bar_size,
                whatToShow='TRADES',
                useRTH=True,
            )

            data = []
            for bar in bars:
                data.append({
                    'date': str(bar.date),
                    'open': bar.open,
                    'high': bar.high,
                    'low': bar.low,
                    'close': bar.close,
                    'volume': bar.volume,
                })

            logger.info(f"Retrieved {len(data)} bars for {symbol}")
            return data
        except Exception as e:
            logger.error(f"Error getting historical data: {e}")
            return []

    async def disconnect(self):
        """Gracefully disconnect"""
        if self.connected:
            self.ib.disconnect()
            self.connected = False
            logger.info("Disconnected from IBKR")

# Global instance
_connector: Optional[IBKRConnector] = None

def get_connector() -> IBKRConnector:
    """Get or create connector instance"""
    global _connector
    if _connector is None:
        _connector = IBKRConnector()
    return _connector
