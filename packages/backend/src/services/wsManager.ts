import { WebSocket } from 'ws';
import { logger } from '../config/logger';

interface WsPayload {
  type: string;
  timestamp: string;
  data: any;
}

class WSManager {
  private clients: Set<WebSocket> = new Set();

  addClient(ws: WebSocket): void {
    this.clients.add(ws);
    logger.info(`WebSocket client connected. Total clients: ${this.clients.size}`);
  }

  removeClient(ws: WebSocket): void {
    this.clients.delete(ws);
    logger.info(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
  }

  broadcast(payload: WsPayload): void {
    const message = JSON.stringify(payload);
    let successCount = 0;

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message, (err) => {
          if (err) {
            logger.error('Failed to send WS message:', err);
          } else {
            successCount++;
          }
        });
      }
    }

    if (this.clients.size > 0) {
      logger.debug(`Broadcast sent to ${successCount}/${this.clients.size} clients`);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }
}

// Singleton instance
export const wsManager = new WSManager();
