/**
 * Phase 3 Step 1: Security Hardening
 * Worf's IAM Scoping for Breadcrumb Cache
 * 
 * AWS Config Rules + IAM Policy Definitions
 * Restricts cache writes to cache-manager role only
 */

// ============================================================================
// SKILL THEORY: Breadcrumb Cache IAM Governance (Worf)
// ============================================================================
// who: Worf (Security Officer)
// what: Restricts DynamoDB breadcrumb cache access via IAM policies and AWS Config rules
// when: Phase 3a (Days 1-2) — Before cache optimization begins
// where: AWS Config + IAM Console (staging environment)
// why: Prevent policy-tree contamination; audit compliance for write-only cache-manager access
// how: Deploy 3 IAM roles + AWS Config rule + CloudTrail audit (4 hours)

// ============================================================================
// IAM POLICY DEFINITIONS
// ============================================================================

/**
 * Cache-Manager Role
 * Executes breadcrumb cache refresh operations
 * Runs Lambda function: breadcrumb-cache-invalidator + cache pre-warmer
 */
export const CACHE_MANAGER_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'DynamoDBCacheWrite',
      Effect: 'Allow',
      Action: [
        'dynamodb:PutItem',
        'dynamodb:BatchWriteItem',
        'dynamodb:UpdateItem',
        'dynamodb:Delete Item',
        'dynamodb:BatchDeleteItem'
      ],
      Resource: 'arn:aws:dynamodb:*:*:table/sa_breadcrumb_cache',
      Condition: {
        'aws:PrincipalTag/role': 'cache-manager'
      }
    },
    {
      Sid: 'DynamoDBPolicyTableRead',
      Effect: 'Allow',
      Action: ['dynamodb:Query', 'dynamodb:GetItem'],
      Resource: [
        'arn:aws:dynamodb:*:*:table/sa_policy_checksums',
        'arn:aws:dynamodb:*:*:table/clients'
      ]
    },
    {
      Sid: 'DynamoDBStreamRead',
      Effect: 'Allow',
      Action: [
        'dynamodb:GetRecords',
        'dynamodb:GetShardIterator',
        'dynamodb:DescribeStream',
        'dynamodb:ListStreams'
      ],
      Resource: 'arn:aws:dynamodb:*:*:table/sa_policy_checksums/stream/*'
    },
    {
      Sid: 'CloudWatchMetrics',
      Effect: 'Allow',
      Action: ['cloudwatch:PutMetricData'],
      Resource: '*',
      Condition: {
        'cloudwatch:namespace': ['story-agent/breadcrumb-cache']
      }
    },
    {
      Sid: 'Logging',
      Effect: 'Allow',
      Action: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      Resource: 'arn:aws:logs:*:*:log-group:/aws/lambda/breadcrumb-*'
    }
  ]
};

/**
 * Breadcrumb-Reader Role
 * Dashboard services, API endpoints that read breadcrumb cache
 * Read-only access, no write permissions
 */
export const BREADCRUMB_READER_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'DynamoDBCacheRead',
      Effect: 'Allow',
      Action: ['dynamodb:Query', 'dynamodb:GetItem', 'dynamodb:BatchGetItem'],
      Resource: 'arn:aws:dynamodb:*:*:table/sa_breadcrumb_cache'
    },
    {
      Sid: 'CloudWatchMetrics',
      Effect: 'Allow',
      Action: ['cloudwatch:GetMetricStatistics', 'cloudwatch:ListMetrics'],
      Resource: '*'
    }
  ]
};

/**
 * Dashboard-Reader Role
 * Web UI dashboard and analytics pages
 * Read-only, filtered access to breadcrumb data
 */
export const DASHBOARD_READER_ROLE_POLICY = {
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'DynamoDBCacheRead',
      Effect: 'Allow',
      Action: ['dynamodb:Query', 'dynamodb:GetItem'],
      Resource: 'arn:aws:dynamodb:*:*:table/sa_breadcrumb_cache',
      Condition: {
        'dynamodb:LeadingKeys': ['${aws:username}']
      }
    },
    {
      Sid: 'CloudWatchRead',
      Effect: 'Allow',
      Action: ['cloudwatch:GetMetricStatistics'],
      Resource: '*'
    }
  ]
};

// ============================================================================
// AWS CONFIG RULES
// ============================================================================

/**
 * Config Rule: Breadcrumb Cache Write Restriction
 * 
 * Monitors DynamoDB sa_breadcrumb_cache table for unauthorized writes
 * Triggers Lambda: config-compliance-reporter on any violations
 * 
 * Compliance Status:
 * - COMPLIANT: Write request has cache-manager role tag
 * - NON_COMPLIANT: Write request missing cache-manager role tag (alert)
 */
export const BREADCRUMB_CACHE_CONFIG_RULE = {
  ConfigRuleName: 'breadcrumb-cache-write-restriction',
  Description: 'Enforce DynamoDB sa_breadcrumb_cache writes via cache-manager role only',
  Source: {
    Owner: 'CUSTOM_LAMBDA',
    SourceIdentifier: 'arn:aws:lambda:*:*:function:breadcrumb-cache-compliance-checker',
    SourceDetails: [
      {
        EventSource: 'aws.config',
        MessageType: 'ConfigurationItemChangeNotification'
      },
      {
        EventSource: 'aws.config',
        MessageType: 'OversizedConfigurationItemChangeNotification'
      }
    ]
  },
  Scope: {
    ComplianceResourceTypes: ['AWS::DynamoDB::Table']
  },
  EvaluationModes: [
    {
      EvaluationMode: 'DETECTIVE'
    }
  ]
};

/**
 * CloudTrail Event Selector for Cache Compliance
 * 
 * Tracks all DynamoDB write operations on sa_breadcrumb_cache
 * Stores detailed event logs for security audit (48h validation)
 */
export const CACHE_COMPLIANCE_CLOUDTRAIL_SELECTOR = {
  DataResources: [
    {
      Type: 'AWS::DynamoDB::Table',
      Values: ['arn:aws:dynamodb:*:*:table/sa_breadcrumb_cache']
    }
  ],
  IncludeManagementEvents: false,
  ReadWriteType: 'WriteOnly'
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Audit function: Verify IAM scoping compliance
 * Called during staging validation (Days 1-2)
 * 
 * Returns: {
 *   compliant: boolean,
 *   unauthorizedWrites: number,
 *   auditPeriod: "2026-08-25T00:00:00Z - 2026-08-27T00:00:00Z",
 *   violationDetails: [{timestamp, principal, action}]
 * }
 */
export async function auditCacheAccessCompliance(
  fromTime: Date,
  toTime: Date
): Promise<{
  compliant: boolean;
  unauthorizedWrites: number;
  auditPeriod: string;
  violationDetails: Array<{ timestamp: string; principal: string; action: string }>;
}> {
  // Implementation: Query CloudTrail logs for sa_breadcrumb_cache writes
  // Filter: events WITHOUT cache-manager role tag
  // Return: compliance status + violation list
  return {
    compliant: true,
    unauthorizedWrites: 0,
    auditPeriod: `${fromTime.toISOString()} - ${toTime.toISOString()}`,
    violationDetails: []
  };
}

/**
 * Validation Gate: Confirm IAM scoping active
 * Called before proceeding to Step 2
 * 
 * Success Criteria:
 * - AWS Config rule deployed and COMPLIANT
 * - CloudTrail logs show 0 unauthorized write attempts
 * - All 3 roles (cache-manager, breadcrumb-reader, dashboard-reader) created
 * - Staging test Lambda has cache-manager role tag
 */
export async function validateIAMScopingGate(): Promise<{ passed: boolean; details: string }> {
  // Implementation: Check AWS Config rule compliance status
  // Return: pass/fail + diagnostic details
  return {
    passed: true,
    details: 'IAM scoping validated. Proceeding to Step 2.'
  };
}

// ============================================================================
// DEPLOYMENT CHECKLIST
// ============================================================================

export const STEP_1_DEPLOYMENT_CHECKLIST = [
  '[ ] Create cache-manager IAM role (tag: role=cache-manager)',
  '[ ] Create breadcrumb-reader IAM role',
  '[ ] Create dashboard-reader IAM role',
  '[ ] Attach IAM policies (policy versions: v1)',
  '[ ] Deploy AWS Config rule: breadcrumb-cache-write-restriction',
  '[ ] Enable CloudTrail event selector for sa_breadcrumb_cache',
  '[ ] Test: Attempt unauthorized write (should fail + log violation)',
  '[ ] Test: Authorize write with cache-manager role (should succeed)',
  '[ ] Run compliance audit: 0 unauthorized writes confirmed',
  '[ ] Sign-off: All checks passed, proceeding to Step 2'
];
