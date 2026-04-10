import { WebSocket } from 'ws';
interface WsPayload {
    type: string;
    timestamp: string;
    data: any;
}
declare class WSManager {
    private clients;
    addClient(ws: WebSocket): void;
    removeClient(ws: WebSocket): void;
    broadcast(payload: WsPayload): void;
    getClientCount(): number;
}
export declare const wsManager: WSManager;
export {};
//# sourceMappingURL=wsManager.d.ts.map