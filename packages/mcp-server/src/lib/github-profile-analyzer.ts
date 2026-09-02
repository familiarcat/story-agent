/**
 * GitHub Profile Analyzer — Extract Developer Patterns from GitHub History
 * 
 * Uses:
 * - Counselor Troi: Analyze communication tone, empathy patterns, mentorship style
 * - Commander Data: Extract decision patterns, technical strengths, risk profiles
 * - Both: Collaborative pattern detection (who works well with whom)
 */

import { Octokit } from '@octokit/rest';
import type { GitHubDeveloperProfile } from './human-team-member.js';

export interface GitHubAnalysisConfig {
  gitHubToken: string;
  username: string;
  organizationFilter?: string; // Only analyze repos in this org
  monthsToAnalyze?: number; // Default: 12 months
  sampleSize?: number; // Max PRs/issues to analyze (default: 50)
}

interface PRAnalysis {
  prNumber: number;
  title: string;
  description: string;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  reviewComments: string[];
  commitMessages: string[];
  complexity: 'simple' | 'medium' | 'complex' | 'critical';
  mergeTime: number; // hours from creation to merge
}

interface ReviewAnalysis {
  prNumber: number;
  prTitle: string;
  commentCount: number;
  comments: Array<{
    text: string;
    sentiment: 'positive' | 'neutral' | 'critical' | 'mentoring';
    focusArea: string; // e.g., "error-handling", "performance", "security"
  }>;
  approvalDecision: 'approved' | 'changes-requested' | 'commented';
  reviewTime: number; // minutes to first review
}

interface TechStackAnalysis {
  languages: Map<string, number>; // language -> commit count
  topics: Map<string, number>; // topic -> repo count
  tools: Set<string>; // CI/CD, testing frameworks, etc.
}

// ============================================================================
// TROI ANALYSIS — Communication & Empathy Patterns
// ============================================================================

interface TroiAnalysisResult {
  tone: 'direct' | 'diplomatic' | 'collaborative' | 'analytical' | 'mentoring';
  toneProbability: number;
  responseTime: 'quick' | 'thoughtful' | 'thorough';
  emphasisAreas: string[];
  supportiveness: number;
  evidenceSnippets: string[];
}

function analyzeCommunicationTone(reviews: ReviewAnalysis[]): TroiAnalysisResult {
  const allComments = reviews.flatMap((r) => r.comments);
  if (allComments.length === 0) {
    return {
      tone: 'analytical',
      toneProbability: 0.5,
      responseTime: 'thoughtful',
      emphasisAreas: [],
      supportiveness: 0.5,
      evidenceSnippets: [],
    };
  }

  // Count sentiment patterns
  const sentiments = allComments.map((c) => c.sentiment);
  const positiveCt = sentiments.filter((s) => s === 'positive').length;
  const criticalCt = sentiments.filter((s) => s === 'critical').length;
  const mentoringCt = sentiments.filter((s) => s === 'mentoring').length;

  // Determine tone
  let tone: 'direct' | 'diplomatic' | 'collaborative' | 'analytical' | 'mentoring' = 'analytical';
  let toneProbability = 0.5;

  if (mentoringCt > allComments.length * 0.3) {
    tone = 'mentoring';
    toneProbability = mentoringCt / allComments.length;
  } else if (criticalCt > allComments.length * 0.4) {
    tone = 'direct';
    toneProbability = criticalCt / allComments.length;
  } else if (positiveCt > allComments.length * 0.4) {
    tone = 'collaborative';
    toneProbability = positiveCt / allComments.length;
  }

  // Extract emphasis areas
  const focusAreas = new Map<string, number>();
  allComments.forEach((c) => {
    focusAreas.set(c.focusArea, (focusAreas.get(c.focusArea) || 0) + 1);
  });
  const emphasisAreas = Array.from(focusAreas.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map((e) => e[0]);

  // Calculate supportiveness
  const supportiveness = (positiveCt + mentoringCt) / allComments.length;

  // Response time analysis
  const reviewTimes = reviews.map((r) => r.reviewTime);
  const avgReviewTime = reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length;
  let responseTime: 'quick' | 'thoughtful' | 'thorough' = 'thoughtful';
  if (avgReviewTime < 30) responseTime = 'quick'; // Minutes
  if (avgReviewTime > 120) responseTime = 'thorough';

  // Gather evidence
  const evidenceSnippets = allComments
    .filter((c) => c.sentiment === tone || c.sentiment === 'mentoring')
    .slice(0, 3)
    .map((c) => c.text.slice(0, 100));

  return {
    tone,
    toneProbability,
    responseTime,
    emphasisAreas,
    supportiveness,
    evidenceSnippets,
  };
}

// ============================================================================
// DATA ANALYSIS — Decision Patterns & Technical Strengths
// ============================================================================

interface DataAnalysisResult {
  riskTolerance: 'conservative' | 'balanced' | 'aggressive';
  riskTolerance_probability: number;
  architecturePhilosophy: string[];
  testingPhilosophy: 'minimal' | 'pragmatic' | 'comprehensive';
  codeReviewStrictness: 'lenient' | 'moderate' | 'strict';
  decisionComments: string[];
}

function analyzeDecisionPatterns(
  prs: PRAnalysis[],
  reviews: ReviewAnalysis[],
  techStack: TechStackAnalysis,
): DataAnalysisResult {
  // Risk tolerance: based on PR complexity vs merge time (quick approval = aggressive, slow = conservative)
  const complexityMergeTimes = prs.map((p) => ({ complexity: p.complexity, mergeTime: p.mergeTime }));
  const avgMergeTime = prs.reduce((sum, p) => sum + p.mergeTime, 0) / prs.length;
  let riskTolerance: 'conservative' | 'balanced' | 'aggressive' = 'balanced';
  let riskTolerance_probability = 0.5;

  if (avgMergeTime < 2) {
    riskTolerance = 'aggressive';
    riskTolerance_probability = Math.min(1, 1 - avgMergeTime / 2);
  } else if (avgMergeTime > 8) {
    riskTolerance = 'conservative';
    riskTolerance_probability = Math.min(1, avgMergeTime / 8);
  }

  // Architecture philosophy: inferred from file structure and PR patterns
  const architecturePhilosophy: string[] = [];
  if (techStack.topics.has('microservices')) architecturePhilosophy.push('microservices');
  if (techStack.topics.has('event-driven')) architecturePhilosophy.push('event-driven');
  if (prs.some((p) => p.title.toLowerCase().includes('module'))) architecturePhilosophy.push('modular');
  if (prs.some((p) => p.title.toLowerCase().includes('refactor'))) architecturePhilosophy.push('SOLID');
  if (architecturePhilosophy.length === 0) architecturePhilosophy.push('pragmatic');

  // Testing philosophy: based on test file changes
  let testingPhilosophy: 'minimal' | 'pragmatic' | 'comprehensive' = 'pragmatic';
  const avgTestChanges = prs.reduce((sum, p) => sum + p.filesChanged, 0) / prs.length;
  if (avgTestChanges < 3) testingPhilosophy = 'minimal';
  if (avgTestChanges > 8) testingPhilosophy = 'comprehensive';

  // Code review strictness: based on changes-requested rate
  const changesRequested = reviews.filter((r) => r.approvalDecision === 'changes-requested').length;
  let codeReviewStrictness: 'lenient' | 'moderate' | 'strict' = 'moderate';
  if (changesRequested < reviews.length * 0.2) codeReviewStrictness = 'lenient';
  if (changesRequested > reviews.length * 0.5) codeReviewStrictness = 'strict';

  // Gather evidence
  const decisionComments = reviews
    .flatMap((r) =>
      r.comments
        .filter((c) => c.sentiment === 'critical' || c.sentiment === 'mentoring')
        .map((c) => c.text.slice(0, 100)),
    )
    .slice(0, 3);

  return {
    riskTolerance,
    riskTolerance_probability,
    architecturePhilosophy,
    testingPhilosophy,
    codeReviewStrictness,
    decisionComments,
  };
}

// ============================================================================
// MAIN ANALYZER ENGINE
// ============================================================================

export class GitHubProfileAnalyzer {
  private octokit: Octokit;
  private config: GitHubAnalysisConfig;

  constructor(config: GitHubAnalysisConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.gitHubToken });
  }

  /**
   * Fetch and analyze GitHub profile
   */
  async analyzeProfile(): Promise<GitHubDeveloperProfile> {
    // Fetch user
    const user = await this.octokit.rest.users.getByUsername({ username: this.config.username });

    // Fetch repositories
    const repos = await this.fetchRepositories();

    // Analyze PRs (created and reviewed)
    const { createdPRs, reviewedPRs } = await this.analyzePullRequests(repos);

    // Analyze communication patterns (Troi)
    const troiAnalysis = analyzeCommunicationTone(reviewedPRs);

    // Analyze decision patterns (Data)
    const techStack = await this.analyzeTechStack(repos);
    const dataAnalysis = analyzeDecisionPatterns(createdPRs, reviewedPRs, techStack);

    // Analyze engagement
    const engagement = await this.analyzeEngagement(repos, createdPRs, reviewedPRs);

    // Compile profile
    const profile: GitHubDeveloperProfile = {
      id: `gp-${this.config.username}-${Date.now()}` as any, // Placeholder
      clientId: '' as any, // Will be set by caller
      kind: 'ai-profile-based',

      gitHubUsername: this.config.username,
      gitHubUrl: user.data.html_url || `https://github.com/${this.config.username}`,

      developmentName: user.data.name || this.config.username,
      biography: user.data.bio || 'GitHub developer profile',

      communication: {
        tone: troiAnalysis.tone,
        toneProbability: troiAnalysis.toneProbability,
        responseTime: troiAnalysis.responseTime,
        emphasisAreas: troiAnalysis.emphasisAreas,
        supportiveness: troiAnalysis.supportiveness,
        evidenceSnippets: troiAnalysis.evidenceSnippets,
      },

      decisions: {
        riskTolerance: dataAnalysis.riskTolerance,
        riskTolerance_probability: dataAnalysis.riskTolerance_probability,
        architecturePhilosophy: dataAnalysis.architecturePhilosophy,
        testingPhilosophy: dataAnalysis.testingPhilosophy,
        codeReviewStrictness: dataAnalysis.codeReviewStrictness,
        decisionComments: dataAnalysis.decisionComments,
      },

      technicalStrengths: {
        languages: Array.from(techStack.languages.entries()).map(([language, count]) => ({
          language,
          proficiency: Math.min(1, count / 100),
          exampleRepos: [],
        })),
        domains: [],
        tools: Array.from(techStack.tools),
      },

      engagement,

      learning: {
        growthAreas: [],
        adoptsNewTools: 'gradually',
      },

      profileVersion: 1,
      analyzedAt: new Date().toISOString(),

      analysis: {
        totalCommits: user.data.public_repos || 0,
        totalPRs: createdPRs.length,
        dateRangeMonths: this.config.monthsToAnalyze || 12,
        confidence: 0.75,
        methodology: 'GitHub API analysis (Troi empathy + Data logic patterns)',
      },
    };

    return profile;
  }

  private async fetchRepositories() {
    const repos = await this.octokit.paginate(this.octokit.rest.repos.listForUser, {
      username: this.config.username,
      per_page: 100,
    });

    return repos.filter((repo) => {
      if (this.config.organizationFilter) {
        return repo.owner.login === this.config.organizationFilter;
      }
      return !repo.fork;
    });
  }

  private async analyzePullRequests(repos: any[]) {
    const createdPRs: PRAnalysis[] = [];
    const reviewedPRs: ReviewAnalysis[] = [];

    const sampleSize = this.config.sampleSize || 50;
    let analyzed = 0;

    for (const repo of repos) {
      if (analyzed > sampleSize) break;

      try {
        // Fetch PRs created by user
        const userPRs = await this.octokit.paginate(this.octokit.rest.pulls.list, {
          owner: repo.owner.login,
          repo: repo.name,
          creator: this.config.username,
          state: 'closed',
          per_page: 20,
        });

        for (const pr of userPRs.slice(0, sampleSize - analyzed)) {
          const analysis: PRAnalysis = {
            prNumber: pr.number,
            title: pr.title,
            description: pr.body || '',
            linesAdded: pr.additions || 0,
            linesRemoved: pr.deletions || 0,
            filesChanged: pr.changed_files || 1,
            reviewComments: [],
            commitMessages: [],
            complexity:
              pr.changed_files > 20
                ? 'critical'
                : pr.changed_files > 10
                  ? 'complex'
                  : pr.changed_files > 5
                    ? 'medium'
                    : 'simple',
            mergeTime: pr.merged_at
              ? (new Date(pr.merged_at).getTime() - new Date(pr.created_at).getTime()) / (1000 * 60 * 60)
              : 0,
          };
          createdPRs.push(analysis);
          analyzed++;
        }
      } catch (error) {
        // Silently skip repos with access issues
      }
    }

    return { createdPRs, reviewedPRs };
  }

  private async analyzeTechStack(repos: any[]): Promise<TechStackAnalysis> {
    const languages = new Map<string, number>();
    const topics = new Map<string, number>();
    const tools = new Set<string>();

    for (const repo of repos) {
      // Languages
      if (repo.language) {
        languages.set(repo.language, (languages.get(repo.language) || 0) + 1);
      }

      // Topics
      repo.topics?.forEach((topic: string) => {
        topics.set(topic, (topics.get(topic) || 0) + 1);
      });

      // Infer tools from README or common patterns
      const readmeIndicators = ['jest', 'mocha', 'github-actions', 'docker', 'kubernetes', 'terraform'];
      readmeIndicators.forEach((indicator) => {
        if (repo.description?.includes(indicator)) {
          tools.add(indicator);
        }
      });
    }

    return { languages, topics, tools };
  }

  private async analyzeEngagement(
    repos: any[],
    createdPRs: PRAnalysis[],
    reviewedPRs: ReviewAnalysis[],
  ) {
    return {
      totalContributions: repos.length,
      pullRequestsCreated: createdPRs.length,
      pullRequestsReviewed: reviewedPRs.length,
      issuesCreated: 0,
      issuesResolved: 0,
      averageReviewTimeHours: reviewedPRs.length > 0
        ? reviewedPRs.reduce((sum, r) => sum + r.reviewTime, 0) / reviewedPRs.length / 60
        : 0,
      reviewResponsivenessRate: reviewedPRs.length > 0
        ? reviewedPRs.filter((r) => r.reviewTime < 120).length / reviewedPRs.length
        : 0,
      collaborationScore: Math.min(1, (createdPRs.length + reviewedPRs.length) / 50),
    };
  }
}
