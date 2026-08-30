/**
 * components/missions/useMissionStream.hook.ts
 *
 * React Hook: Subscribe to mission execution stream via Socket.IO
 *
 * Returns:
 *   - logs: Array of execution log entries
 *   - isConnected: Boolean (WebSocket connected)
 *   - isPaused: Boolean (user paused mission)
 *   - pause/resume: Functions to control stream
 *   - error: Connection error (if any)
 *
 * Usage:
 *   const { logs, isConnected, isPaused, pause, resume } = useMissionStream(missionId);
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import { MissionExecutionLogEntry } from '@story-agent/shared/mission-execution-stream';

interface MissionStreamHookReturn {
  logs: MissionExecutionLogEntry[];
  isConnected: boolean;
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  error: string | null;
}

export function useMissionStream(missionId: string | undefined): MissionStreamHookReturn {
  const [logs, setLogs] = useState<MissionExecutionLogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Connect to WebSocket stream
  useEffect(() => {
    if (!missionId) return;

    try {
      // Connect to Socket.IO server
      const socket = io(undefined, {
        path: '/api/missions/stream',
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socketRef.current = socket;

      // Handle connection
      socket.on('connect', () => {
        console.log('Connected to mission stream');
        setIsConnected(true);
        setError(null);

        // Subscribe to this mission
        socket.emit('subscribe', missionId);
      });

      // Handle log entries
      socket.on('log', (logEntry: MissionExecutionLogEntry) => {
        setLogs((prev) => [...prev, logEntry]);
      });

      // Handle status updates
      socket.on('status', (statusUpdate: any) => {
        console.log('Mission status:', statusUpdate);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log('Disconnected from mission stream');
        setIsConnected(false);
      });

      // Handle errors
      socket.on('error', (err: any) => {
        console.error('Socket error:', err);
        setError(err?.message || 'Connection error');
      });

      // Cleanup on unmount
      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.error('Failed to connect to stream:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    }
  }, [missionId]);

  // Pause stream
  const pause = useCallback(() => {
    setIsPaused(true);
    if (socketRef.current) {
      socketRef.current.emit('pause', missionId);
    }
  }, [missionId]);

  // Resume stream
  const resume = useCallback(() => {
    setIsPaused(false);
    if (socketRef.current) {
      socketRef.current.emit('resume', missionId);
    }
  }, [missionId]);

  return {
    logs,
    isConnected,
    isPaused,
    pause,
    resume,
    error,
  };
}
