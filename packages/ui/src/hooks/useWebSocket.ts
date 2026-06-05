/**
 * useWebSocket - React hook for real-time crew state updates
 *
 * Usage:
 *   const { state, isConnected } = useWebSocket('STORY-123');
 *   if (state) {
 *     return <div>{state.nextStep}</div>
 *   }
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { CrewExecutionState, WebSocketMessage } from '@story-agent/shared';

interface UseWebSocketOptions {
  url?: string;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  reconnectAttempts?: number;
}

interface UseWebSocketReturn {
  state: CrewExecutionState | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_CREW_WS_URL || 'ws://localhost:8000';

export function useWebSocket(
  storyRef: string,
  options: UseWebSocketOptions = {}
): UseWebSocketReturn {
  const {
    url = DEFAULT_WS_URL,
    autoReconnect = true,
    reconnectInterval = 3000,
    reconnectAttempts = 5,
  } = options;

  const [state, setState] = useState<CrewExecutionState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[useWebSocket] Connected, subscribing to:', storyRef);
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;

        // Subscribe to story
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            storyRef,
          } as WebSocketMessage)
        );
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage<CrewExecutionState>;

          if (message.type === 'state:initial' || message.type === 'state:updated') {
            setState(message.payload || null);
            setIsLoading(false);
          } else if (message.type === 'error') {
            setError(message.error || 'Unknown error');
            setIsLoading(false);
          } else if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (err) {
          console.error('[useWebSocket] Message parse error:', err);
        }
      };

      ws.onerror = (event: Event) => {
        console.error('[useWebSocket] WebSocket error:', event);
        setError('WebSocket connection error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('[useWebSocket] Disconnected from server');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (autoReconnect && reconnectAttemptsRef.current < reconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `[useWebSocket] Reconnecting (attempt ${reconnectAttemptsRef.current}/${reconnectAttempts})...`
          );
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= reconnectAttempts) {
          setError('Failed to reconnect after multiple attempts');
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[useWebSocket] Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      setIsConnected(false);
    }
  }, [url, storyRef, autoReconnect, reconnectInterval, reconnectAttempts]);

  // Connect on mount and when storyRef changes
  useEffect(() => {
    connect();

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return {
    state,
    isConnected,
    isLoading,
    error,
  };
}
