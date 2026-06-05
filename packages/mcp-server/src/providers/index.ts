import type { AgileProvider, AgileProviderName } from '@story-agent/shared';
import { AhaProvider } from './AhaProvider.js';
import { JiraProvider } from './JiraProvider.js';
import { LinearProvider, GitHubProjectsProvider, AzureDevOpsProvider } from './StubProviders.js';

/**
 * Returns a singleton AgileProvider for the current environment.
 *
 * Selection order:
 *   1. AGILE_PROVIDER env var (aha | jira | linear | github-projects | azure-devops)
 *   2. Auto-detected from which credentials are present
 *   3. Falls back to Aha if AHA_DOMAIN + AHA_API_KEY are set
 *
 * Individual provider credentials are read from env vars:
 *   Aha:         AHA_DOMAIN, AHA_API_KEY
 *   Jira:        JIRA_DOMAIN, JIRA_EMAIL, JIRA_API_TOKEN
 *   Linear:      LINEAR_API_KEY
 *   GitHub:      GITHUB_TOKEN, GITHUB_ORG
 *   Azure DevOps: AZURE_DEVOPS_ORG, AZURE_DEVOPS_TOKEN
 */
let _instance: AgileProvider | null = null;

export function getAgileProvider(): AgileProvider {
  if (_instance) return _instance;

  const providerName = (process.env.AGILE_PROVIDER as AgileProviderName | undefined) ?? detectProvider();

  switch (providerName) {
    case 'jira':
      _instance = new JiraProvider(
        requireEnv('JIRA_DOMAIN'),
        requireEnv('JIRA_EMAIL'),
        requireEnv('JIRA_API_TOKEN')
      );
      break;

    case 'linear':
      _instance = new LinearProvider(requireEnv('LINEAR_API_KEY'));
      break;

    case 'github-projects':
      _instance = new GitHubProjectsProvider(
        requireEnv('GITHUB_TOKEN'),
        requireEnv('GITHUB_ORG')
      );
      break;

    case 'azure-devops':
      _instance = new AzureDevOpsProvider(
        requireEnv('AZURE_DEVOPS_ORG'),
        requireEnv('AZURE_DEVOPS_TOKEN')
      );
      break;

    case 'aha':
    default:
      _instance = new AhaProvider(
        requireEnv('AHA_DOMAIN'),
        requireEnv('AHA_API_KEY')
      );
  }

  process.stderr.write(`[story-agent] AgileProvider: ${_instance.name}\n`);
  return _instance;
}

/** Reset the singleton (useful in tests or when env changes) */
export function resetAgileProvider(): void {
  _instance = null;
}

function detectProvider(): AgileProviderName {
  if (process.env.JIRA_DOMAIN && process.env.JIRA_API_TOKEN) return 'jira';
  if (process.env.LINEAR_API_KEY) return 'linear';
  if (process.env.AZURE_DEVOPS_TOKEN) return 'azure-devops';
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_ORG) return 'github-projects';
  return 'aha'; // default
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name} (required by selected AgileProvider)`);
  return val;
}

/** Convenience re-exports so callers don't need to import providers directly */
export { AhaProvider, JiraProvider, LinearProvider, GitHubProjectsProvider, AzureDevOpsProvider };
