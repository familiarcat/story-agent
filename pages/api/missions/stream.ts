/**
 * pages/api/missions/[missionId]/stream.ts
 *
 * WebSocket endpoint for real-time mission execution logs
 * Client connects, subscribes to logs for a specific mission
 * Server pushes logs as they arrive from crew execution
 *
 * Protocol:
 *   1. Client connects: ws://localhost:3000/api/missions/{missionId}/stream
 *   2. Server sends log entries as JSON: { type: 'log', data: MissionExecutionLogEntry }
 *   3. Server sends status updates: { type: 'status', data: { status, message } }
 *   4. On close: server cleans up subscription
 *
 * For MVP: Use socket.io for compatibility
 * TODO: Replace with native WebSocket for production
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'socket.io';
import { MissionStreamMessage } from '@story-agent/shared/mission-execution-stream';

/**
 * In-memory execution log store (for MVP)
 * TODO: Replace with Supabase realtime after migration
 */
const executionLogStore: Map<string, any[]> = new Map();

/**
 * In-memory subscriptions (for MVP)
 */
const subscriptions: Map<string, Set<string>> = new Map();

/**
 * Socket.IO server instance (singleton)
 */
let io: Server | null = null;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // This is a socket.io handler, not a regular HTTP handler
  if (res.socket.server.io) {
    // Socket.IO already attached
    res.end();
    return;
  }

  // Initialize Socket.IO
  io = new Server(res.socket.server, {
    path: '/api/missions/stream',
    addTrailingSlash: false,
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Subscribe to mission execution logs
    socket.on('subscribe', (missionId: string) => {
      console.log(`Client ${socket.id} subscribed to mission ${missionId}`);

      // Join room named after mission
      socket.join(`mission-${missionId}`);

      // Send historical logs for this mission
      const logs = executionLogStore.get(missionId) || [];
      logs.forEach((log) => {
        socket.emit('log', log);
      });
    });

    // Handle user questions during mission
    socket.on('ask', (data: { missionId: string; question: string }) => {
      console.log(`Question on mission ${data.missionId}: ${data.question}`);
      // TODO: Pass question to crew via MCP
      // For now, just broadcast to all subscribers
      io?.to(`mission-${data.missionId}`).emit('ask', data.question);
    });

    // Handle pause
    socket.on('pause', (missionId: string) => {
      console.log(`Mission ${missionId} paused by client ${socket.id}`);
      io?.to(`mission-${missionId}`).emit('paused', { missionId });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  res.socket.server.io = io;
  res.end();
}

/**
 * Public API: Emit log entry to all subscribers of a mission
 * Called by crew execution pipeline
 */
export function emitExecutionLog(missionId: string, log: any) {
  if (!io) return;

  // Store in history
  if (!executionLogStore.has(missionId)) {
    executionLogStore.set(missionId, []);
  }
  executionLogStore.get(missionId)!.push(log);

  // Broadcast to all subscribers
  io.to(`mission-${missionId}`).emit('log', log);
}

/**
 * Public API: Update mission status
 */
export function updateMissionStatus(
  missionId: string,
  status: 'running' | 'complete' | 'failed',
  message?: string
) {
  if (!io) return;

  io.to(`mission-${missionId}`).emit('status', {
    missionId,
    status,
    message,
  });
}
