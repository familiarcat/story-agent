/**
 * components/missions/MissionEntryForm.tsx
 *
 * Screen 1: Task Entry Form
 * - User enters natural language mission description
 * - Real-time classification (debounced)
 * - Shows classification result with estimated time/cost/crew
 * - Launch button to start mission execution
 *
 * Component Props: None (page-level)
 * State:
 *   - input: User's mission description
 *   - classification: Real-time classification result
 *   - isClassifying: Loading state
 *   - error: Classification error (if any)
 *
 * Integration:
 *   - Calls POST /api/missions/classify (debounced, 300ms)
 *   - Calls POST /api/missions to launch
 *   - Navigates to /missions/[id]/live on success
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  MissionClassificationResponse,
  MISSION_CATEGORY_CONFIG,
} from '@story-agent/shared/mission-types';
import styles from './MissionEntryForm.module.css';

export const MissionEntryForm: React.FC = () => {
  const router = useRouter();

  // Form state
  const [input, setInput] = useState('');
  const [classification, setClassification] = useState<MissionClassificationResponse | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced classification effect
  useEffect(() => {
    // Clear previous error when user types
    setError(null);

    // If input is too short, clear classification
    if (input.length < 10) {
      setClassification(null);
      return;
    }

    // Debounce: wait 300ms before classifying
    const timeout = setTimeout(async () => {
      setIsClassifying(true);
      try {
        const res = await fetch('/api/missions/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userInput: input }),
        });

        if (!res.ok) {
          throw new Error(`Classification failed: ${res.statusText}`);
        }

        const data: MissionClassification = await res.json();
        setClassification(data);
      } catch (err) {
        console.error('Classification failed:', err);
        setError(err instanceof Error ? err.message : 'Classification failed');
        setClassification(null);
      } finally {
        setIsClassifying(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [input]);

  // Launch mission
  const handleLaunch = useCallback(async () => {
    if (!classification) return;

    setIsLaunching(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: input,
          category: classification.category,
          assignedCrew: classification.assignedCrew,
        }),
      });

      if (!res.ok) {
        throw new Error(`Mission launch failed: ${res.statusText}`);
      }

      const mission = await res.json();

      // Navigate to live feed
      router.push(`/missions/${mission.id}/live`);
    } catch (err) {
      console.error('Mission launch failed:', err);
      setError(err instanceof Error ? err.message : 'Mission launch failed');
    } finally {
      setIsLaunching(false);
    }
  }, [classification, input, router]);

  // Get category emoji and colors
  const getCategoryBadge = (category: string) => {
    const config = MISSION_CATEGORY_CONFIG[category as keyof typeof MISSION_CATEGORY_CONFIG];
    if (!config) return null;

    if (category.startsWith('A')) {
      return { emoji: '⚡', label: 'QUICK', color: 'blue' };
    }
    if (category === 'B3') {
      return { emoji: '🧠', label: 'INNOVATION', color: 'green' };
    }
    return { emoji: '👥', label: 'COLLABORATIVE', color: 'purple' };
  };

  const badge = classification ? getCategoryBadge(classification.category) : null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>📋 Story Agent Mission Control</h1>
        <p className={styles.subtitle}>Describe what you want to accomplish in natural language</p>
      </div>

      {/* Input Section */}
      <div className={styles.inputSection}>
        <label htmlFor="mission-input" className={styles.label}>
          What do you want to accomplish?
        </label>

        <textarea
          id="mission-input"
          className={styles.textarea}
          placeholder="e.g., Audit TypeScript strict mode across repo"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          disabled={isClassifying || isLaunching}
        />

        <div className={styles.charCount}>
          {input.length} / 500 characters
        </div>
      </div>

      {/* Classification State */}
      {isClassifying && input.length >= 10 && (
        <div className={styles.classifying}>
          <div className={styles.spinner} />
          <span>Analyzing...</span>
        </div>
      )}

      {/* Classification Result */}
      {classification && !isClassifying && (
        <div className={`${styles.classificationResult} ${styles[`color-${badge?.color}`]}`}>
          {/* Category Badge */}
          <div className={styles.categoryBadge}>
            <span className={styles.emoji}>{badge?.emoji}</span>
            <span className={styles.categoryLabel}>{classification.category}</span>
            <span className={styles.categoryName}>{badge?.label}</span>
          </div>

          {/* Details Grid */}
          <div className={styles.details}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Description:</span>
              <span className={styles.detailValue}>{classification.reasoning}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Crew:</span>
              <span className={styles.detailValue}>{classification.assignedCrew.join(', ')}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Estimated Time:</span>
              <span className={styles.detailValue}>{classification.estimatedTime}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Estimated Cost:</span>
              <span className={styles.detailValue}>~${classification.estimatedCost.toFixed(3)}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Confidence:</span>
              <span className={styles.detailValue}>
                {Math.round(classification.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Impact Description */}
          <div className={styles.impact}>
            {classification.category.startsWith('A') ? (
              <p>🎯 Quick deterministic task · Results in seconds</p>
            ) : (
              <p>👥 Multi-crew collaborative analysis · Real-time narration</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className={styles.actions}>
            <button
              onClick={handleLaunch}
              disabled={isLaunching}
              className={styles.btnPrimary}
            >
              {isLaunching ? '⏳ Launching...' : '▶ Launch Mission'}
            </button>
            <button
              onClick={() => setInput('')}
              disabled={isLaunching}
              className={styles.btnSecondary}
            >
              ← Clear
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className={styles.error}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className={styles.closeError}>
            ✕
          </button>
        </div>
      )}

      {/* Suggestions */}
      {input.length === 0 && (
        <div className={styles.suggestions}>
          <h3>Try these example missions:</h3>
          <div className={styles.suggestionGrid}>
            <div
              className={styles.suggestionCard}
              onClick={() => setInput('Audit TypeScript strict mode across codebase')}
            >
              <div className={styles.suggestionEmoji}>🔍</div>
              <div className={styles.suggestionText}>Audit code style</div>
            </div>
            <div
              className={styles.suggestionCard}
              onClick={() => setInput('Run security audit on Supabase permissions')}
            >
              <div className={styles.suggestionEmoji}>🔒</div>
              <div className={styles.suggestionText}>Security scan</div>
            </div>
            <div
              className={styles.suggestionCard}
              onClick={() => setInput('Summarize current sprint velocity and metrics')}
            >
              <div className={styles.suggestionEmoji}>📊</div>
              <div className={styles.suggestionText}>Sprint summary</div>
            </div>
            <div
              className={styles.suggestionCard}
              onClick={() => setInput('Design new mission system architecture')}
            >
              <div className={styles.suggestionEmoji}>🏗️</div>
              <div className={styles.suggestionText}>Architecture review</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionEntryForm;
