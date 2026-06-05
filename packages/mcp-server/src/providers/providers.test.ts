import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetAgileProvider, getAgileProvider } from '../providers/index.js';
import { AhaProvider } from '../providers/AhaProvider.js';
import { JiraProvider } from '../providers/JiraProvider.js';

// Save and restore env vars around each test
const originalEnv: Record<string, string | undefined> = {};
const PROVIDER_VARS = [
  'AGILE_PROVIDER',
  'AHA_DOMAIN', 'AHA_API_KEY',
  'JIRA_DOMAIN', 'JIRA_EMAIL', 'JIRA_API_TOKEN',
  'LINEAR_API_KEY',
  'GITHUB_TOKEN', 'GITHUB_ORG',
  'AZURE_DEVOPS_ORG', 'AZURE_DEVOPS_TOKEN',
];

beforeEach(() => {
  PROVIDER_VARS.forEach(k => { originalEnv[k] = process.env[k]; delete process.env[k]; });
  resetAgileProvider();
});

afterEach(() => {
  PROVIDER_VARS.forEach(k => {
    if (originalEnv[k] === undefined) delete process.env[k];
    else process.env[k] = originalEnv[k];
  });
  resetAgileProvider();
});

describe('getAgileProvider — provider selection', () => {
  it('selects Aha when AHA_DOMAIN and AHA_API_KEY are set', () => {
    process.env.AHA_DOMAIN = 'mycompany.aha.io';
    process.env.AHA_API_KEY = 'test-key';
    const provider = getAgileProvider();
    expect(provider.name).toBe('aha');
  });

  it('selects Jira when AGILE_PROVIDER=jira and Jira env vars are set', () => {
    process.env.AGILE_PROVIDER = 'jira';
    process.env.JIRA_DOMAIN = 'mycompany.atlassian.net';
    process.env.JIRA_EMAIL = 'user@company.com';
    process.env.JIRA_API_TOKEN = 'jira-token';
    const provider = getAgileProvider();
    expect(provider.name).toBe('jira');
  });

  it('auto-detects Jira when JIRA_DOMAIN and JIRA_API_TOKEN are set', () => {
    process.env.JIRA_DOMAIN = 'mycompany.atlassian.net';
    process.env.JIRA_EMAIL = 'user@company.com';
    process.env.JIRA_API_TOKEN = 'jira-token';
    const provider = getAgileProvider();
    expect(provider.name).toBe('jira');
  });

  it('auto-detects Linear when LINEAR_API_KEY is set', () => {
    process.env.LINEAR_API_KEY = 'lin_api_token';
    const provider = getAgileProvider();
    expect(provider.name).toBe('linear');
  });

  it('auto-detects GitHub Projects when GITHUB_TOKEN + GITHUB_ORG are set', () => {
    process.env.GITHUB_TOKEN = 'ghp_token';
    process.env.GITHUB_ORG = 'my-org';
    const provider = getAgileProvider();
    expect(provider.name).toBe('github-projects');
  });

  it('returns the same singleton on repeated calls', () => {
    process.env.AHA_DOMAIN = 'mycompany.aha.io';
    process.env.AHA_API_KEY = 'test-key';
    const a = getAgileProvider();
    const b = getAgileProvider();
    expect(a).toBe(b);
  });

  it('returns a fresh instance after resetAgileProvider()', () => {
    process.env.AHA_DOMAIN = 'mycompany.aha.io';
    process.env.AHA_API_KEY = 'test-key';
    const a = getAgileProvider();
    resetAgileProvider();
    const b = getAgileProvider();
    expect(a).not.toBe(b);
  });

  it('throws when AGILE_PROVIDER=jira but Jira env vars are missing', () => {
    process.env.AGILE_PROVIDER = 'jira';
    expect(() => getAgileProvider()).toThrow('JIRA_DOMAIN');
  });

  it('throws when AGILE_PROVIDER=aha but AHA_DOMAIN is missing', () => {
    process.env.AGILE_PROVIDER = 'aha';
    expect(() => getAgileProvider()).toThrow('AHA_DOMAIN');
  });
});

describe('AhaProvider — constructor', () => {
  it('constructs successfully with valid credentials', () => {
    const provider = new AhaProvider('mycompany.aha.io', 'test-key');
    expect(provider.name).toBe('aha');
  });

  it('throws if domain is empty', () => {
    expect(() => new AhaProvider('', 'key')).toThrow();
  });

  it('throws if apiKey is empty', () => {
    expect(() => new AhaProvider('mycompany.aha.io', '')).toThrow();
  });
});

describe('JiraProvider — constructor', () => {
  it('constructs successfully with valid credentials', () => {
    const provider = new JiraProvider(
      'mycompany.atlassian.net',
      'user@example.com',
      'api-token'
    );
    expect(provider.name).toBe('jira');
  });

  it('throws if domain is empty', () => {
    expect(() => new JiraProvider('', 'user@example.com', 'token')).toThrow();
  });

  it('throws if email is empty', () => {
    expect(() => new JiraProvider('mycompany.atlassian.net', '', 'token')).toThrow();
  });

  it('throws if token is empty', () => {
    expect(() => new JiraProvider('mycompany.atlassian.net', 'user@example.com', '')).toThrow();
  });
});
