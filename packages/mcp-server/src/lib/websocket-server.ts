/**
 * WebSocket Server - Real-time crew state broadcasting
 *
 * Provides real-time updates to UI clients as crew members execute.
 * Clients subscribe to specific stories and receive state updates via WebSocket.
 *
 * Protocol:
 *   Client → Server: { type: "subscribe", storyRef: "STORY-123" }
 *   Server → Client: { type: "state:initial", storyRef: "STORY-123", payload: {...} }
 *   Server → Client: { type: "state:updated", storyRef: "STORY-123", payload: {...} }
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import type { WebSocketMessage, CrewExecutionState } from '@story-agent/shared';
import { crewStateBroadcaster } from './crew-state-broadcaster.js';

interface ClientSubscription {
  clientId: string;
  storyRef: string;
  unsubscribe: () => void;
}

export class CrewWebSocketServer {
  private wss: WebSocketServer;
  private clientSubscriptions: Map<WebSocket, Set<ClientSubscription>> = new Map();
  private clientIdCounter = 0;

  constructor(httpServer: HTTPServer) {
    this.wss = new WebSocketServer({ server: httpServer });
    this.setupConnectionHandler();
    console.log('[WS] WebSocket server initialized');
  }

  private setupConnectionHandler(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = `client-${++this.clientIdCounter}-${Date.now()}`;
      this.clientSubscriptions.set(ws, new Set());

      console.log(`[WS] New client connected: ${clientId}`);

      // Send ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Ping every 30s

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString()) as WebSocketMessage;
          this.handleMessage(ws, clientId, message);
        } catch (err) {
          console.error(`[WS] Message parse error from ${clientId}:`, err);
          ws.send(
            JSON.stringify({
              type: 'error',
              error: 'Invalid message format',
            })
          );
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log(`[WS] Client disconnected: ${clientId}`);
        clearInterval(pingInterval);

        // Unsubscribe from all stories
        const subs = this.clientSubscriptions.get(ws);
        if (subs) {
          subs.forEach(sub => sub.unsubscribe());
          this.clientSubscriptions.delete(ws);
        }
      });

      ws.on('error', (err: Error) => {
        console.error(`[WS] Error from ${clientId}:`, err.message);
      });

      ws.on('pong', () => {
        // Client received our ping
      });
    });
  }

  private async handleMessage(
    ws: WebSocket,
    clientId: string,
    message: WebSocketMessage
  ): Promise<void> {
    switch (message.type) {
      case 'subscribe': {
        if (!message.storyRef) {
          ws.send(JSON.stringify({ type: 'error', error: 'Missing storyRef' }));
          return;
        }

        this.subscribeToStory(ws, clientId, message.storyRef);
        break;
      }

      case 'unsubscribe': {
        if (!message.storyRef) {
          ws.send(JSON.stringify({ type: 'error', error: 'Missing storyRef' }));
          return;
        }

        this.unsubscribeFromStory(ws, message.storyRef);
        break;
      }

      case 'ping': {
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      }

      default:
        console.warn(`[WS] Unknown message type: ${message.type}`);
    }
  }

  private subscribeToStory(
    ws: WebSocket,
    clientId: string,
    storyRef: string
  ): void {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    // Check if already subscribed
    const subs = this.clientSubscriptions.get(ws);
    if (subs && [...subs].some((s: ClientSubscription) => s.storyRef === storyRef)) {
      console.log(`[WS] ${clientId} already subscribed to ${storyRef}`);
      return;
    }

    // Send initial state
    const currentState = crewStateBroadcaster.getStoryState(storyRef);
    if (currentState) {
      ws.send(
        JSON.stringify({
          type: 'state:initial',
          storyRef,
          payload: currentState,
          timestamp: new Date().toISOString(),
        } as WebSocketMessage<CrewExecutionState>)
      );
    } else {
      ws.send(
        JSON.stringify({
          type: 'error',
          error: `No execution state found for story: ${storyRef}`,
        })
      );
      return;
    }

    // Subscribe to future updates
    const unsubscribe = crewStateBroadcaster.subscribe(
      storyRef,
      clientId,
      (state: CrewExecutionState) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'state:updated',
              storyRef,
              payload: state,
              timestamp: new Date().toISOString(),
            } as WebSocketMessage<CrewExecutionState>)
          );
        }
      }
    );

    // Track subscription
    const sub: ClientSubscription = { clientId, storyRef, unsubscribe };
    subs?.add(sub);

    console.log(
      `[WS] ${clientId} subscribed to ${storyRef} (${crewStateBroadcaster.getSubscriptionCount(storyRef)} total)`
    );
  }

  private unsubscribeFromStory(ws: WebSocket, storyRef: string): void {
    const subs = this.clientSubscriptions.get(ws);
    if (!subs) return;

    const sub = Array.from(subs).find(s => s.storyRef === storyRef);
    if (sub) {
      sub.unsubscribe();
      subs.delete(sub);
      console.log(
        `[WS] Client unsubscribed from ${storyRef} (${crewStateBroadcaster.getSubscriptionCount(storyRef)} remaining)`
      );
    }
  }

  /**
   * Broadcast a message to all connected clients (useful for system announcements).
   */
  broadcastAll(message: WebSocketMessage): void {
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Get number of active connections.
   */
  getConnectionCount(): number {
    let count = 0;
    this.wss.clients.forEach(() => {
      count++;
    });
    return count;
  }

  /**
   * Shut down the server.
   */
  async close(): Promise<void> {
    return new Promise(resolve => {
      this.wss.close(() => {
        console.log('[WS] WebSocket server closed');
        resolve();
      });
    });
  }
}
