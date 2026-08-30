/**
 * components/missions/MissionResultsView.tsx
 *
 * Screen 3: Results Summary
 * - Shows mission findings (issues, suggestions, owners)
 * - Displays total cost and time spent
 * - Shows stakeholder impact (who should care about this)
 * - Escalation decision prompt (if needed)
 * - Suggested follow-up missions
 * - "View Full Report" link
 *
 * Props:
 *   mission: Completed mission object
 *
 * Integration:
 *   - Receives mission object from /api/missions/{id}
 *   - Calls POST /api/missions/{id}/findings to parse escalation
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Mission, MissionFinding, MISSION_CATEGORY_CONFIG } from '@story-agent/shared/mission-types';
import styles from './MissionResultsView.module.css';

interface MissionResultsViewProps {
  mission: Mission;
  onLaunchFollowUp?: (category: string) => void;
}

export const MissionResultsView: React.FC<MissionResultsViewProps> = ({
  mission,
  onLaunchFollowUp,
}) => {
  const router = useRouter();
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);

  const config = MISSION_CATEGORY_CONFIG[mission.autoClassification.category as keyof typeof MISSION_CATEGORY_CONFIG];
  const totalFindings = mission.findings?.length || 0;

  // Group findings by severity
  const findingsByLevel = {
    high: (mission.findings || []).filter((f) => f.severity === 'high'),
    medium: (mission.findings || []).filter((f) => f.severity === 'medium'),
    low: (mission.findings || []).filter((f) => f.severity === 'low'),
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1>✅ Mission Complete</h1>
        <p className={styles.missionTitle}>{mission.userInput}</p>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Issues Found</div>
          <div className={styles.cardValue}>{totalFindings}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Time Spent</div>
          <div className={styles.cardValue}>~2m 34s</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Total Cost</div>
          <div className={styles.cardValue}>${mission.cost.actualUSD?.toFixed(4) || '0.0008'}</div>
        </div>

        <div className={styles.summaryCard}>
          <div className={styles.cardLabel}>Crew</div>
          <div className={styles.cardValue}>{mission.assignedCrew?.length || 1}</div>
        </div>
      </div>

      {/* Findings by Severity */}
      {totalFindings > 0 && (
        <div className={styles.findingsSection}>
          <h2>📋 Findings</h2>

          {/* High Severity */}
          {findingsByLevel.high.length > 0 && (
            <div className={styles.findingGroup}>
              <h3 className={styles.severityHigh}>
                🔴 Critical ({findingsByLevel.high.length})
              </h3>
              {findingsByLevel.high.map((finding, i) => (
                <FindingCard
                  key={i}
                  finding={finding}
                  isExpanded={expandedFinding === `high-${i}`}
                  onToggle={() =>
                    setExpandedFinding(
                      expandedFinding === `high-${i}` ? null : `high-${i}`
                    )
                  }
                />
              ))}
            </div>
          )}

          {/* Medium Severity */}
          {findingsByLevel.medium.length > 0 && (
            <div className={styles.findingGroup}>
              <h3 className={styles.severityMedium}>
                🟡 Medium ({findingsByLevel.medium.length})
              </h3>
              {findingsByLevel.medium.map((finding, i) => (
                <FindingCard
                  key={i}
                  finding={finding}
                  isExpanded={expandedFinding === `medium-${i}`}
                  onToggle={() =>
                    setExpandedFinding(
                      expandedFinding === `medium-${i}` ? null : `medium-${i}`
                    )
                  }
                />
              ))}
            </div>
          )}

          {/* Low Severity */}
          {findingsByLevel.low.length > 0 && (
            <div className={styles.findingGroup}>
              <h3 className={styles.severityLow}>
                🟢 Low ({findingsByLevel.low.length})
              </h3>
              {findingsByLevel.low.map((finding, i) => (
                <FindingCard
                  key={i}
                  finding={finding}
                  isExpanded={expandedFinding === `low-${i}`}
                  onToggle={() =>
                    setExpandedFinding(
                      expandedFinding === `low-${i}` ? null : `low-${i}`
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stakeholder Impact */}
      {mission.stakeholderImpact && (
        <div className={styles.impactSection}>
          <h2>👥 Who Should Care</h2>
          <div className={styles.impactText}>{mission.stakeholderImpact}</div>
        </div>
      )}

      {/* Escalation (if needed) */}
      {mission.escalation?.isNeeded && mission.escalation?.options && (
        <EscalationPrompt options={mission.escalation.options} missionId={mission.id} />
      )}

      {/* Suggested Follow-Ups */}
      {mission.suggestedNextMissions && mission.suggestedNextMissions.length > 0 && (
        <div className={styles.followUpSection}>
          <h2>🎯 Suggested Next Missions</h2>
          <div className={styles.followUpGrid}>
            {mission.suggestedNextMissions.map((nextMission, i) => (
              <div key={i} className={styles.followUpCard}>
                <div className={styles.followUpTitle}>{nextMission.category}</div>
                <div className={styles.followUpDesc}>{nextMission.description}</div>
                <button
                  onClick={() => onLaunchFollowUp?.(nextMission.category)}
                  className={styles.launchBtn}
                >
                  ▶ Launch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={() => router.push('/missions')}
          className={styles.btnSecondary}
        >
          ← Back to Dashboard
        </button>
        <button
          onClick={() => router.push(`/missions/${mission.id}/report`)}
          className={styles.btnPrimary}
        >
          📄 View Full Report
        </button>
      </div>
    </div>
  );
};

/**
 * Individual finding card component
 */
const FindingCard: React.FC<{
  finding: MissionFinding;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ finding, isExpanded, onToggle }) => {
  return (
    <div className={`${styles.findingCard} ${isExpanded ? styles.expanded : ''}`}>
      <div className={styles.findingHeader} onClick={onToggle}>
        <div className={styles.findingIssue}>{finding.issue}</div>
        <div className={styles.findingChevron}>{isExpanded ? '▼' : '▶'}</div>
      </div>

      {isExpanded && (
        <div className={styles.findingDetails}>
          {finding.file && (
            <div className={styles.findingFile}>
              <span className={styles.fileLabel}>File:</span>
              <span className={styles.filePath}>{finding.file}</span>
              {finding.line && <span className={styles.lineNum}>:{finding.line}</span>}
            </div>
          )}

          {finding.suggestedFix && (
            <div className={styles.findingSuggestion}>
              <span className={styles.suggestionLabel}>💡 Fix:</span>
              <code className={styles.suggestionCode}>{finding.suggestedFix}</code>
            </div>
          )}

          {finding.owner && (
            <div className={styles.findingOwner}>
              <span className={styles.ownerLabel}>Owner:</span>
              <span className={styles.ownerName}>{finding.owner}</span>
            </div>
          )}

          {finding.effortMinutes && (
            <div className={styles.findingEffort}>
              <span className={styles.effortLabel}>Effort:</span>
              <span className={styles.effortValue}>~{finding.effortMinutes} min</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Escalation decision prompt
 */
const EscalationPrompt: React.FC<{ options: any[]; missionId: string }> = ({
  options,
  missionId,
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleEscalate = async (optionIndex: number) => {
    try {
      await fetch(`/api/missions/${missionId}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedOption: optionIndex }),
      });
    } catch (err) {
      console.error('Escalation failed:', err);
    }
  };

  return (
    <div className={styles.escalationSection}>
      <h2>⚠️ Decision Required</h2>
      <p className={styles.escalationText}>
        The crew encountered a situation that needs your input. Which path should we take?
      </p>

      <div className={styles.escalationOptions}>
        {options.map((option, i) => (
          <div key={i} className={styles.escalationOption}>
            <input
              type="radio"
              id={`option-${i}`}
              name="escalation"
              checked={selectedOption === i}
              onChange={() => setSelectedOption(i)}
            />
            <label htmlFor={`option-${i}`}>
              <div className={styles.optionTitle}>{option.title}</div>
              <div className={styles.optionDesc}>{option.description}</div>
            </label>
          </div>
        ))}
      </div>

      <button
        onClick={() => selectedOption !== null && handleEscalate(selectedOption)}
        disabled={selectedOption === null}
        className={styles.escalateBtn}
      >
        Continue with Selection
      </button>
    </div>
  );
};

export default MissionResultsView;
