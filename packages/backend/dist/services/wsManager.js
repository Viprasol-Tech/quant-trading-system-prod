"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsManager = void 0;
const ws_1 = require("ws");
const logger_1 = require("../config/logger");
class WSManager {
    constructor() {
        this.clients = new Set();
    }
    addClient(ws) {
        this.clients.add(ws);
        logger_1.logger.info(`WebSocket client connected. Total clients: ${this.clients.size}`);
    }
    removeClient(ws) {
        this.clients.delete(ws);
        logger_1.logger.info(`WebSocket client disconnected. Total clients: ${this.clients.size}`);
    }
    broadcast(payload) {
        const message = JSON.stringify(payload);
        let successCount = 0;
        for (const client of this.clients) {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(message, (err) => {
                    if (err) {
                        logger_1.logger.error('Failed to send WS message:', err);
                    }
                    else {
                        successCount++;
                    }
                });
            }
        }
        if (this.clients.size > 0) {
            logger_1.logger.debug(`Broadcast sent to ${successCount}/${this.clients.size} clients`);
        }
    }
    getClientCount() {
        return this.clients.size;
    }
}
// Singleton instance
exports.wsManager = new WSManager();
//# sourceMappingURL=wsManager.js.map