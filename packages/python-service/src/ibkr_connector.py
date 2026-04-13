"""
IBKR Gateway Connector - Complete Integration
Handles all communication with Interactive Brokers
"""

from ib_insync import IB, Stock, Contract, Order, util
import asyncio
import logging
import os
import math
from datetime import datetime
from typing import Dict, List, Optional

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MarketDataSubscriptionTracker:
    """
    Track active market data subscriptions to prevent exceeding IBKR's limit.
    IBKR typically allows ~100 concurrent market data subscriptions per connection.
    """
    MAX_SUBSCRIPTIONS = 95  # Conservative limit, actual is ~100

    def __init__(self):
        self.subscriptions = {}  # {symbol: count}
        self.total = 0

    def request(self, symbol: str) -> bool:
        """Request a market data subscription. Returns True if allowed, False if at limit."""
        if self.total >= self.MAX_SUBSCRIPTIONS:
            logger.warning(f"Market data subscription limit reached ({self.total}/{self.MAX_SUBSCRIPTIONS})")
            return False

        self.subscriptions[symbol] = self.subscriptions.get(symbol, 0) + 1
        self.total += 1
        logger.debug(f"Market data subscription requested: {symbol} (total: {self.total})")
        return True

    def cancel(self, symbol: str) -> None:
        """Cancel a market data subscription."""
        if symbol in self.subscriptions:
            self.subscriptions[symbol] -= 1
            if self.subscriptions[symbol] <= 0:
                del self.subscriptions[symbol]
            self.total -= 1
            logger.debug(f"Market data subscription cancelled: {symbol} (total: {self.total})")

    def get_usage(self) -> Dict[str, int]:
        """Get current subscription usage."""
        return {
            'total': self.total,
            'max': self.MAX_SUBSCRIPTIONS,
            'usage_percent': (self.total / self.MAX_SUBSCRIPTIONS) * 100 if self.MAX_SUBSCRIPTIONS > 0 else 0,
            'symbols': len(self.subscriptions)
        }


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
        self.market_data_type = 4  # Request delayed/frozen data by default
        self.subscriptions = MarketDataSubscriptionTracker()

    async def connect(self, retries=8):
        """Connect to IBKR Gateway with exponential backoff retry logic"""
        for attempt in range(retries):
            try:
                logger.info(f"Connecting to IBKR ({attempt+1}/{retries})...")

                # Pre-connection delay: give gateway API time to fully initialize
                # Especially important on first attempt right after IBC login completes
                if attempt == 0:
                    logger.info("Gateway freshly started, waiting for API initialization (10 sec for headless port init)...")
                    await asyncio.sleep(10)  # Increased wait for headless mode API port initialization

                # Try multiple clientIds to avoid conflicts
                client_ids_to_try = [1, 2, 3, 4, 5]
                connection_successful = False

                for client_id in client_ids_to_try:
                    try:
                        logger.info(f"Attempting connection to {self.host}:{self.port} with clientId={client_id}...")
                        # ib_insync.connect() needs to run IN the ib event loop, not in a thread
                        # Use a timeout wrapper to detect if connection fails
                        self.ib.connect(
                            self.host,
                            self.port,
                            client_id,
                            False  # readonly=False
                        )
                        # Wait for connection to establish
                        await asyncio.sleep(2)

                        # Check if actually connected (ib_insync sets .isConnected attribute)
                        if hasattr(self.ib, 'isConnected') and self.ib.isConnected():
                            self.client_id = client_id
                            logger.info(f"[SUCCESS] Connected with clientId={client_id}")
                            connection_successful = True
                            break
                        else:
                            logger.warning(f"ClientId {client_id}: TCP connection made but API handshake failed")
                            self.ib.disconnect()
                            await asyncio.sleep(1)

                    except Exception as e:
                        logger.warning(f"ClientId {client_id}: {type(e).__name__}: {str(e)[:100]}")
                        continue

                if not connection_successful:
                    raise Exception(f"Failed to establish IBKR connection with any of {len(client_ids_to_try)} clientIds")

                logger.info(f"✅ Connected to IBKR Gateway on {self.host}:{self.port}")

                # WARMUP: Give API time to stabilize after connection
                logger.info("Warming up API (waiting for full initialization)...")
                await asyncio.sleep(3)

                # WARMUP REQUEST: Verify API is functional before proceeding
                try:
                    logger.info("Sending warmup request to verify API readiness...")
                    managed = await asyncio.wait_for(
                        asyncio.to_thread(self.ib.managedAccounts),
                        timeout=5
                    )
                    logger.info(f"✅ API warmup successful - Account ID: {managed[0] if managed else 'N/A'}")
                except asyncio.TimeoutError:
                    logger.warning("⚠️ API warmup timeout, but continuing (retry will happen if needed)...")
                except Exception as e:
                    logger.warning(f"⚠️ API warmup request failed: {e}, but continuing...")

                self.connected = True

                # Request market data type: prefer 4 (delayed-frozen), fallback to 1 (realtime)
                try:
                    self.ib.reqMarketDataType(self.market_data_type)
                    logger.info(f"Market data type requested: {self.market_data_type} (delayed-frozen)")
                except Exception as e:
                    logger.warning(f"Failed to request market data type {self.market_data_type}: {e}")
                    logger.info("Falling back to market data type 1 (realtime)")
                    self.market_data_type = 1
                    self.ib.reqMarketDataType(self.market_data_type)

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

    def _get_valid_price(self, *candidates: float) -> Optional[float]:
        """
        Return first valid (non-nan, positive) price from candidates.
        Handles ib_insync's use of float('nan') for missing values.
        Python's 'or' operator treats 0.0 as falsy, causing incorrect fallback.
        This method explicitly checks for NaN and negative values.
        """
        for price in candidates:
            if price is not None and not math.isnan(price) and price > 0:
                return price
        return None

    def register_event_callbacks(self, on_update):
        """Register callbacks for IBKR events"""
        try:
            logger.info("Registering IBKR event callbacks...")

            # Position updates
            self.ib.positionEvent += lambda pos: on_update('position')

            # Order status updates
            self.ib.orderStatusEvent += lambda trade: on_update('order')

            # Account value updates
            self.ib.accountValueEvent += lambda val: on_update('account')

            # Execution updates
            self.ib.execDetailsEvent += lambda trade, fill: on_update('order')

            logger.info("✅ Event callbacks registered")
        except Exception as e:
            logger.error(f"Error registering callbacks: {e}")

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
        """Get current positions from IBKR with real-time market data"""
        if not self.connected:
            return {}

        try:
            positions = self.ib.positions()

            position_dict = {}
            for pos in positions:
                symbol = pos.contract.symbol
                quantity = pos.position
                avg_cost = pos.avgCost

                # Request market data for this position to get current price
                current_price = None
                try:
                    contract = Stock(symbol, 'SMART', 'USD')
                    self.ib.qualifyContracts(contract)

                    # Check subscription limit before requesting market data
                    if not self.subscriptions.request(symbol):
                        logger.warning(f"Market data subscription limit reached, using avg_cost for {symbol}")
                        current_price = avg_cost
                    else:
                        try:
                            # Request market data (uses configured market data type)
                            ticker = self.ib.reqMktData(contract, '', False, False)

                            # Wait up to 2 seconds for ticker data to arrive (ib_insync handles async internally)
                            await asyncio.sleep(2)

                            # Use valid price (non-nan, positive) with fallback chain
                            current_price = self._get_valid_price(
                                ticker.last,
                                ticker.close,
                                ticker.bid,
                                avg_cost
                            ) or avg_cost

                        finally:
                            # Cancel market data subscription to avoid hitting limit
                            try:
                                self.ib.cancelMktData(contract)
                                self.subscriptions.cancel(symbol)
                            except Exception as e:
                                logger.warning(f"Failed to cancel market data for {symbol}: {e}")

                except Exception as e:
                    logger.warning(f"Failed to get market data for {symbol}: {e}, using avg_cost")
                    current_price = avg_cost

                # Calculate financial metrics
                market_value = quantity * current_price if current_price else 0
                cost_basis = quantity * avg_cost if avg_cost else 0
                unrealized_pl = market_value - cost_basis
                unrealized_plpc = (unrealized_pl / cost_basis * 100) if cost_basis else 0

                position_dict[symbol] = {
                    'symbol': symbol,
                    'qty': str(quantity),
                    'avg_entry_price': str(avg_cost) if avg_cost else '0',
                    'current_price': str(current_price) if current_price else '0',
                    'market_value': str(market_value),
                    'unrealized_pl': str(unrealized_pl),
                    'unrealized_plpc': str(unrealized_plpc),
                    'account': pos.account,
                    'side': 'long' if quantity > 0 else 'short'
                }

            self.positions_cache = position_dict
            logger.info(f"Updated {len(positions)} positions with market data")
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
        """Get market data with subscription tracking and type fallback"""
        if not self.connected:
            return None

        try:
            contract = Stock(symbol, 'SMART', 'USD')
            self.ib.qualifyContracts(contract)

            # Check subscription limit
            if not self.subscriptions.request(symbol):
                logger.warning(f"Market data subscription limit reached for {symbol}")
                return None

            try:
                # Request market data (uses configured market data type: 4 or 1)
                ticker = self.ib.reqMktData(contract, '', False, False)

                # Wait up to 2 seconds for ticker data to arrive
                await asyncio.sleep(2)

                return {
                    'symbol': symbol,
                    'last': self._get_valid_price(ticker.last) or 0,
                    'bid': self._get_valid_price(ticker.bid) or 0,
                    'ask': self._get_valid_price(ticker.ask) or 0,
                    'volume': ticker.volume or 0,
                    'timestamp': datetime.now().isoformat(),
                }
            finally:
                # Cancel subscription
                try:
                    self.ib.cancelMktData(contract)
                    self.subscriptions.cancel(symbol)
                except Exception as e:
                    logger.warning(f"Failed to cancel market data for {symbol}: {e}")

        except Exception as e:
            logger.error(f"Error getting market data for {symbol}: {e}")
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
