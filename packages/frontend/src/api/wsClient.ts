import { useTradingStore } from '../store/tradingStore';

let ws: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: number | null = null;

const WS_URL = 'ws://46.202.89.48:6005/ws';
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

interface WsMessage {
  type: string;
  timestamp: string;
  data: {
    portfolio?: any;
    positions?: any[];
    orders?: any[];
  };
}

function scheduleReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
  console.log(`Scheduling WebSocket reconnect in ${delay}ms (attempt ${reconnectAttempt + 1})`);

  reconnectTimer = window.setTimeout(() => {
    reconnectAttempt++;
    initWebSocket();
  }, delay);
}

export function initWebSocket() {
  if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
    return;
  }

  useTradingStore.getState().setWsStatus('connecting');

  try {
    ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('WebSocket connected');
      useTradingStore.getState().setWsStatus('connected');
      reconnectAttempt = 0;
    };

    ws.onmessage = (event) => {
      try {
        const message: WsMessage = JSON.parse(event.data);

        if (message.type === 'portfolio_update') {
          useTradingStore.getState().setPortfolioUpdate(
            {
              portfolio: message.data.portfolio,
              positions: message.data.positions,
              orders: message.data.orders,
            },
            message.timestamp
          );
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      useTradingStore.getState().setWsStatus('error');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      useTradingStore.getState().setWsStatus('disconnected');
      ws = null;
      scheduleReconnect();
    };
  } catch (error) {
    console.error('Failed to create WebSocket:', error);
    useTradingStore.getState().setWsStatus('error');
    scheduleReconnect();
  }
}

export function destroyWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (ws) {
    ws.close();
    ws = null;
  }

  useTradingStore.getState().setWsStatus('disconnected');
  reconnectAttempt = 0;
}
