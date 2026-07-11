/**
 * Synthetic Users Generator for Section 31 Week 2 Canary Simulation
 *
 * Generates 6,000 fake user profiles for testing canary launch infrastructure:
 * - No real user data
 * - Deterministic IDs (hash-based, reproducible)
 * - Includes synthetic metrics: opt-out clicks, error events, sentiment
 * - All users marked with cohort: "canary" and env: "test"
 */

import crypto from 'crypto';

export interface SyntheticUser {
  user_id: string;
  email: string;
  name: string;
  client_id: string;
  cohort: 'canary' | 'control';
  environment: 'test';
  created_at: string;
  syntheticMetrics?: {
    opted_out: boolean;
    error_events: number;
    sentiment_rating: 1 | 2 | 3 | 4 | 5;
    last_activity: string;
  };
}

/**
 * Generate deterministic user ID from index (reproducible)
 */
function generateUserId(index: number): string {
  const seed = `canary-user-${index}`;
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  return `user_${hash.substring(0, 16)}`;
}

/**
 * Generate synthetic email from user ID
 */
function generateEmail(userId: string, index: number): string {
  const hash = crypto.createHash('md5').update(`${userId}-email`).digest('hex');
  const domain = ['testmail.io', 'synthetic.dev', 'canary.test'][index % 3];
  return `${userId.replace('user_', '')}.${hash.substring(0, 6)}@${domain}`;
}

/**
 * Generate synthetic name from user ID
 */
function generateName(userId: string, index: number): string {
  const firstNames = [
    'Alex', 'Bailey', 'Casey', 'Dakota', 'Emerson', 'Finley', 'Gregory', 'Haven',
    'Iris', 'Jordan', 'Kai', 'Lane', 'Morgan', 'Quinn', 'River', 'Sydney',
    'Taylor', 'Unity', 'Vega', 'Walker',
  ];
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  ];
  const firstName = firstNames[index % firstNames.length];
  const lastName = lastNames[(index * 7) % lastNames.length];
  return `${firstName} ${lastName}`;
}

/**
 * Generate synthetic metrics for a user
 */
function generateMetrics(index: number): SyntheticUser['syntheticMetrics'] {
  const seed = `metrics-${index}`;
  const hash = parseInt(crypto.createHash('sha256').update(seed).digest('hex').substring(0, 8), 16);

  // Opt-out probability: 1.8% (within 3% threshold)
  const optedOut = (hash % 100) < 1.8;

  // Error events: distributed, most have 0-2, rare spikes
  const errorEventRng = (hash >> 8) % 100;
  let errorEvents = 0;
  if (errorEventRng < 85) errorEvents = 0;
  else if (errorEventRng < 95) errorEvents = 1;
  else errorEvents = 2;

  // Sentiment: 73% positive (>3), 20% neutral (3), 7% negative (<3)
  const sentimentRng = (hash >> 16) % 100;
  let sentiment: 1 | 2 | 3 | 4 | 5;
  if (sentimentRng < 73) sentiment = [4, 5][Math.floor(Math.random() * 2)];
  else if (sentimentRng < 93) sentiment = 3;
  else sentiment = [1, 2][Math.floor(Math.random() * 2)];

  return {
    opted_out: optedOut,
    error_events: errorEvents,
    sentiment_rating: sentiment,
    last_activity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Generate all 6,000 synthetic users
 */
export function generateSyntheticUsers(count: number = 6000): SyntheticUser[] {
  const users: SyntheticUser[] = [];

  for (let i = 0; i < count; i++) {
    const userId = generateUserId(i);
    const metrics = generateMetrics(i);

    users.push({
      user_id: userId,
      email: generateEmail(userId, i),
      name: generateName(userId, i),
      client_id: 'client-canary-test',
      cohort: 'canary',
      environment: 'test',
      created_at: new Date().toISOString(),
      syntheticMetrics: metrics,
    });
  }

  return users;
}

/**
 * Generate aggregated metrics from synthetic users
 */
export function aggregateSyntheticMetrics(users: SyntheticUser[]) {
  const totalUsers = users.length;
  const optedOutCount = users.filter(u => u.syntheticMetrics?.opted_out).length;
  const totalErrorEvents = users.reduce((sum, u) => sum + (u.syntheticMetrics?.error_events || 0), 0);
  const sentimentCounts = users.reduce(
    (acc, u) => {
      const rating = u.syntheticMetrics?.sentiment_rating || 3;
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  const optOutRate = (optedOutCount / totalUsers) * 100;
  const errorRate = (totalErrorEvents / totalUsers) * 100;
  const positiveCount = (sentimentCounts[4] || 0) + (sentimentCounts[5] || 0);
  const sentimentScore = (positiveCount / totalUsers) * 100;

  return {
    total_users: totalUsers,
    opted_out_count: optedOutCount,
    opted_out_rate_percent: optOutRate.toFixed(2),
    total_error_events: totalErrorEvents,
    error_rate_percent: errorRate.toFixed(2),
    sentiment_distribution: sentimentCounts,
    positive_sentiment_percent: sentimentScore.toFixed(2),
    metrics_timestamp: new Date().toISOString(),
  };
}

/**
 * Export synthetic users to JSON format
 */
export function exportUsersJson(users: SyntheticUser[]): string {
  return JSON.stringify(
    {
      metadata: {
        count: users.length,
        cohort: 'canary',
        environment: 'test',
        generated_at: new Date().toISOString(),
        description: 'Synthetic user profiles for Section 31 Week 2 Canary Simulation',
        safety: {
          real_users: false,
          production_access: false,
          email_sent: false,
        },
      },
      users,
      metrics: aggregateSyntheticMetrics(users),
    },
    null,
    2
  );
}
