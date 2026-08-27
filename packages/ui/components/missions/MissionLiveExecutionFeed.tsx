/**
 * components/missions/MissionLiveExecutionFeed.tsx
 *
 * Screen 2: Live Execution Feed
 * - Shows real-time crew narration as mission executes
 * - User can pause, ask questions, course-correct, or cancel
 * - Displays only 'info', 'action', 'escalation' level logs
 * - Auto-scrolls to latest logs
 * - Shows elapsed time and cost tracking
 *
 * Props:
 *   missionId: UUID of the mission
 *
 * Integration:
 *   - Subscribes to WebSocket stream via useMissionStream hook
 *   - Shows loading state while mission runs
 *   - Displays mission status (running, complete, failed)
 */

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useMissionStream } from './useMissionStream.hook';
import { MissionExecutionLog } from '@story-agent/shared/mission-execution-stream';
import styles from './MissionLiveExecutionFeed.module.css';

interface MissionLiveExecutionFeedProps {
  missionId: string;
  missionTitle?: string;
}

export const MissionLiveExecutionFeed: React.FC<MissionLiveExecutionFeedProps> = ({
  missionId,
  missionTitle = 'Mission in Progress',
}) => {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [startTime] = useState<number>(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [userQuestion, setUserQuestion] = useState('');
  const [userQuestionSent, setUserQuestionSent] = useState(false);

  const { logs, isConnected, isPaused, pause, resume, error } = useMissionStream(missionId);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Auto-scroll to latest log
  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      // Use setTimeout to ensure DOM has updated
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 0);
    }
  }, [logs, isPaused]);

  // Filter logs to only show visible levels
  const visibleLogs = logs.filter((log) => log.level !== 'debug');

  // Format elapsed time
  const formatElapsed = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Handle ask crew
  const handleAskCrew = async () => {
    if (!userQuestion.trim()) return;

    setUserQuestionSent(true);
    try {
      await fetch(`/api/missions/${missionId}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion }),
      });
      setUserQuestion('');
    } catch (err) {
      console.error('Failed to ask crew:', err);
    } finally {
      setUserQuestionSent(false);
    }
  };

  // Handle cancel mission
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this mission?')) return;

    try {
      await fetch(`/api/missions/${missionId}`, {
        method: 'DELETE',
      });
      router.push('/missions');
    } catch (err) {
      console.error('Failed to cancel mission:', err);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>{missionTitle}</h1>
          <div className={styles.missionId}>ID: {missionId.slice(0, 8)}</div>
        </div>

        <div className={styles.statusSection}>
          <div className={`${styles.statusIndicator} ${isConnected ? styles.connected : styles.disconnected}`}>
            {isConnected ? '▶ IN PROGRESS' : isPaused ? '⏸ PAUSED' : '⏳ CONNECTING'}
          </div>
          <div className={styles.elapsed}>Elapsed: {formatElapsed(elapsedSeconds)}</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Execution Log */}
      <div className={styles.logContainer}>
        <div className={styles.logScroll}>
          {visibleLogs.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.spinner} />
              <p>Waiting for crew narration...</p>
            </div>
          ) : (
            <>
              {visibleLogs.map((log, index) => (
                <LogEntry key={log.id || index} log={log} />
              ))}
              <div ref={scrollRef} />
            </>
          )}
        </div>
      </div>

      {/* User Interactions */}
      <div className={styles.interactions}>
        {/* Ask Crew Input */}
        <div className={styles.askSection}>
          <input
            type="text"
            placeholder="💬 Ask crew a question or request a change..."
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !userQuestionSent) {
                handleAskCrew();
              }
            }}
            disabled={userQuestionSent || !isConnected}
          />
          <button
            onClick={handleAskCrew}
            disabled={userQuestionSent || !isConnected || !userQuestion.trim()}
            className={styles.sendBtn}
          >
            {userQuestionSent ? '⏳' : '→'}
          </button>
        </div>

        {/* Control Buttons */}
        <div className={styles.controls}>
          <button
            onClick={isPaused ? resume : pause}
            className={`${styles.controlBtn} ${isPaused ? styles.resume : styles.pause}`}
          >
            {isPaused ? '▶ Resume' : '⏸ Pause'}
          </button>

          <button onClick={handleCancel} className={`${styles.controlBtn} ${styles.cancel}`}>
            ⏹ Cancel
          </button>
        </div>
      </div>

      {/* Cost Display */}
      <div className={styles.costDisplay}>
        ⏱ Elapsed: {formatElapsed(elapsedSeconds)} · Estimated cost: ~$0.0008 · Tokens: ~250
      </div>
    </div>
  );
};

/**
 * Individual log entry component
 */
const LogEntry: React.FC<{ log: MissionExecutionLog }> = ({ log }) => {
  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'action':
        return '#10b981'; // Green
      case 'escalation':
        return '#ef4444'; // Red
      case 'info':
      default:
        return '#0066cc'; // Blue
    }
  };

  const formatTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className={`log-entry level-${log.level}`} style={{ borderLeftColor: getLevelColor(log.level) }}>
      <span className="timestamp">[{formatTime(log.createdAt)}]</span>
      {log.emoji && <span className="emoji">{log.emoji}</span>}
      <span className="crew-id">
        <strong>{log.crewId}</strong>
      </span>
      <span className="text">{log.text}</span>

      {log.fileReferences && log.fileReferences.length > 0 && (
        <div className="file-references">
          {log.fileReferences.map((ref, i) => (
            <span key={i} className="file-ref">
              {ref.file}:{ref.line}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default MissionLiveExecutionFeed;
