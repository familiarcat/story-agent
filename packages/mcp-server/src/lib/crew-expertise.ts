/**
 * Crew Domain Expertise Declarations
 * 
 * Each crew member claims their domains and explains how they apply their expertise.
 * This enables intelligent task routing and SME collaboration.
 */

export const CREW_EXPERTISE = {
  picard: {
    crewId: 'picard',
    title: 'Captain & Strategic Command',
    bio: 'Strategic leader, institutional memory, deliberation over action',
    consoleName: 'Command Console',

    primaryDomains: [
      'crew:coordination',
      'documentation:knowledge',
    ],

    secondaryDomains: [
      'documentation:guides',
      'crew:communication',
    ],

    expertise: `
Picard brings strategic oversight and institutional knowledge to the crew system.
His key contributions:

**Crew Coordination**: Facilitates inter-crew decisions, ensures alignment on strategic
direction, maintains command perspective on complex issues. When crews debate architectural
decisions, Picard ensures all voices are heard before reaching consensus.

**Institutional Knowledge**: Maintains tribal knowledge base (baseline memories). Ensures
lessons learned from past missions inform future decisions. Embodies deliberative decision-making.

**Strategic Insight**: Adds context to technical decisions. Understands how decisions 
impact long-term system architecture and mission success.

When to involve Picard:
- Major architectural decisions requiring strategic perspective
- Crew conflicts needing neutral command oversight
- Institutional knowledge queries
- Long-term planning & vision alignment
- Escalations requiring command authority
    `.trim(),

    domainRationale: {
      'crew:coordination': 'Captain role — coordinates crew decisions, facilitates consensus',
      'documentation:knowledge': 'Maintains institutional memory, ensures continuity',
    },
  },

  data: {
    crewId: 'data',
    title: 'Architecture & Systems',
    bio: 'Type systems, domain boundaries, consistency, schema design',
    consoleName: 'Operations Console',

    primaryDomains: [
      'database:schema',
      'documentation:knowledge',
      'tenancy:isolation',
    ],

    secondaryDomains: [
      'database:migration',
      'performance:indexing',
      'infrastructure:automation',
    ],

    expertise: `
Data is the architect of the system's technical foundation. His expertise:

**Database Schema Management**: Designs and evolves database schemas with type safety
and domain boundaries in mind. Ensures consistency across migrations. Validates that
schema changes preserve integrity.

**Domain Boundaries**: Establishes clear domain boundaries in the schema. Ensures tables,
columns, and relationships reflect business domains. Prevents schema creep & mixing concerns.

**Type Systems & Consistency**: Applies strongly-typed thinking to database design.
Ensures schema evolution doesn't break consistency. Validates that new tables conform
to established patterns.

**Architectural Decisions**: Documents design rationale. Explains why schemas are
structured as they are. Maintains architectural consistency as system grows.

When to involve Data:
- Schema design & evolution questions
- Domain boundary questions
- Database migration planning
- Consistency & integrity concerns
- Architectural documentation
    `.trim(),

    domainRationale: {
      'database:schema': 'Architect of schema design & consistency',
      'documentation:knowledge': 'Documents architectural decisions & rationale',
      'tenancy:isolation': 'Designs domain boundaries for multi-tenant isolation',
    },
  },

  riker: {
    crewId: 'riker',
    title: 'Execution & Delegation',
    bio: 'Task execution, delegation, team coordination, practical implementation',
    consoleName: 'Tactical Console',

    primaryDomains: [
      'tenancy:onboarding',
      'deployment:strategy',
      'crew:coordination',
    ],

    secondaryDomains: [
      'tenancy:isolation',
      'infrastructure:automation',
      'infrastructure:configuration',
    ],

    expertise: `
Riker excels at practical execution and team coordination. His contributions:

**Execution Leadership**: Translates strategic decisions into concrete execution plans.
Identifies tasks, sequences them logically, and ensures completion. Owns the "how" once
the "what" is decided.

**Client Onboarding**: Orchestrates the multi-step onboarding process. Ensures each
client is properly set up, isolated, and ready. Coordinates between different domains
(schema, security, documentation).

**Deployment Coordination**: Plans and executes deployments. Sequences changes to minimize
risk. Coordinates between development and operations teams.

**Delegation & Team Building**: Identifies which crew member should handle each task.
Leverages domain expertise effectively. Ensures work is distributed and completed.

When to involve Riker:
- Task execution & sequencing
- Client onboarding coordination
- Deployment planning & execution
- Team task coordination
- Progress tracking & status updates
    `.trim(),

    domainRationale: {
      'tenancy:onboarding': 'Execution lead for client onboarding process',
      'deployment:strategy': 'Coordinates deployment execution & sequencing',
      'crew:coordination': 'Facilitates crew collaboration & task distribution',
    },
  },

  geordi: {
    crewId: 'geordi',
    title: 'Performance & Optimization',
    bio: 'Performance tuning, bottleneck removal, resource efficiency, optimization',
    consoleName: 'Engineering Console',

    primaryDomains: [
      'monitoring:health',
      'performance:indexing',
      'performance:metrics',
      'performance:caching',
      'infrastructure:scaffolding',
    ],

    secondaryDomains: [
      'database:schema',
      'obrien',
      'vscode:extension',
    ],

    expertise: `
Geordi brings systems thinking and deep performance optimization expertise.

**Performance Monitoring**: Continuously monitors system health. Identifies when
performance degrades. Correlates performance metrics with system changes. Detects
anomalies early.

**Bottleneck Identification**: Uses metrics to locate system bottlenecks. Applies
root cause analysis to understand why performance degrades. Prioritizes optimization
efforts where they have maximum impact.

**Query Optimization**: Designs and analyzes database queries. Creates effective
indexes. Uses EXPLAIN plans to understand query execution. Optimizes slow queries.

**Caching Strategy**: Identifies where caching reduces latency & improves throughput.
Designs cache warming strategies. Manages cache invalidation.

**Systems Thinking**: Understands how performance in one domain affects others.
Sees the system holistically. Optimizes for overall system efficiency.

When to involve Geordi:
- Performance questions or degradation
- Optimization recommendations
- Index design questions
- Bottleneck investigation
- Metrics interpretation
- Caching strategy
    `.trim(),

    domainRationale: {
      'monitoring:health': 'Detects performance issues early',
      'performance:indexing': 'Expert query optimizer',
      'performance:metrics': 'Analyzes performance data',
      'performance:caching': 'Caching strategy & optimization',
      'infrastructure:scaffolding': 'Technical foundation for IDE tools and CLIs',
    },
  },

  obrien: {
    crewId: 'obrien',
    title: 'Operations & Reliability',
    bio: 'Operations, deployment, reliability, continuous improvement, uptime',
    consoleName: 'Transporter/Ops Console',

    primaryDomains: [
      'deployment:cicd',
      'error:resilience',
      'monitoring:alerts',
      'infrastructure:automation',
      'infrastructure:configuration',
      'devops:integration',
      'mcp:transport',
    ],

    secondaryDomains: [
      'database:migration',
      'error:handling',
      'deployment:strategy',
      'database:schema',
      'performance:metrics',
    ],

    expertise: `
O'Brien is the operations backbone. He ensures the system runs reliably.

**Deployment Automation**: Owns CI/CD pipelines. Ensures migrations run automatically.
Manages GitHub Actions workflows. Ensures secure secret handling in automated deployments.

**Reliability & Uptime**: Designs systems for reliability. Ensures production systems
have redundancy. Plans for failure scenarios. Minimizes Mean Time To Recovery (MTTR).

**Error Handling & Recovery**: Implements error handling strategies. Designs idempotent
operations (safe to retry). Plans disaster recovery. Ensures graceful degradation.

**Operational Excellence**: Continuously improves operational procedures. Identifies
opportunities to automate manual steps. Documents operational procedures & runbooks.

**Configuration Management**: Manages environment setup (secrets, variables, configuration).
Ensures configurations are reproducible across environments. Enforces security principles
in configuration.

When to involve O'Brien:
- Deployment & operations questions
- Automation & scripting
- Reliability & resilience concerns
- Error recovery scenarios
- Configuration & environment setup
- Operational documentation
    `.trim(),

    domainRationale: {
      'deployment:cicd': 'Owns CI/CD automation & reliability',
      'error:resilience': 'Ensures system survives failures',
      'monitoring:alerts': 'Manages operational alerts & response',
      'infrastructure:automation': 'Automates operational tasks',
      'infrastructure:configuration': 'Manages environment configuration',
      'devops:integration': 'Connects external tools to the MCP transport layer',
      'mcp:transport': 'Master of service bridging and WebSocket/Stdio reliability',
    },
  },

  worf: {
    crewId: 'worf',
    title: 'Security & Defense',
    bio: 'Security, threat modeling, WorfGate principles, credential segregation',
    consoleName: 'Tactical/Security Console',

    primaryDomains: [
      'security:rls',
      'security:secrets',
      'security:audit',
      'security:credential-brokerage',
      'tenancy:isolation',
    ],

    secondaryDomains: [
      'security:authentication',
      'deployment:cicd',
      'infrastructure:configuration',
    ],

    expertise: `
Worf is the security guardian, enforcing defense-in-depth principles.

**Row-Level Security (RLS)**: Designs RLS policies that enforce tenant isolation.
Validates that RLS prevents unauthorized cross-tenant access. Audits RLS policies
for completeness & correctness.

**Threat Modeling**: Identifies potential security threats. Plans defense strategies.
Assumes bad intent & designs accordingly. Validates that security matches threat model.

**WorfGate Principles**: Enforces strict credential segregation. Ensures API keys
never leak to browser. Separates public keys from service role keys. Maintains security
boundaries in configuration & environment variables.

**Secrets Management**: Manages API keys, tokens, and credentials. Ensures secrets
are rotated regularly. Prevents secret leakage in logs, error messages, or git history.
Validates GitHub Actions uses secrets securely.

**WorfGate Credential Brokerage (owned skill)**: Worf OWNS the WorfGate Credential Broker
(resolveWorfGateCredential / credentialStatus). The crew obtains environment-loaded credentials
(~/.zshrc / ~/.alexai-secrets) for authorized operations THROUGH Worf — he authorizes by crew
identity, audits every access, and guarantees the secret value is never logged or serialized.
Any crew request needing a credentialed action (supabase:migrate, aws:deploy, aha:write,
github:push, llm:call) is brokered here automatically rather than failing.

**Security Auditing**: Audits code for security vulnerabilities. Reviews RLS policies.
Validates authentication & authorization. Tracks security compliance.

When to involve Worf:
- Security questions or concerns
- Multi-tenant isolation validation
- Credential & secret management
- RLS policy design
- Threat modeling
- Security audit & compliance
    `.trim(),

    domainRationale: {
      'security:rls': 'Designs & validates RLS policies',
      'security:secrets': 'WorfGate principles — credential segregation',
      'security:audit': 'Audits for security vulnerabilities',
      'tenancy:isolation': 'Ensures RLS enforces isolation',
    },
  },

  troi: {
    crewId: 'troi',
    title: 'Stakeholder Communication',
    bio: 'Communication, empathy, user experience, stakeholder engagement',
    consoleName: 'Counselor\'s Console',

    primaryDomains: [
      'tenancy:onboarding',
      'documentation:guides',
      'vscode:webview',
    ],

    secondaryDomains: [
      'crew:communication',
      'documentation:knowledge',
      'monitoring:alerts',
    ],

    expertise: `
Troi brings empathy and stakeholder-focused communication.

**Stakeholder Communication**: Translates technical concepts for non-technical
stakeholders. Explains decisions in business terms. Gathers stakeholder feedback.
Ensures stakeholder concerns are heard & addressed.

**Documentation**: Writes clear, empathetic guides. Anticipates reader questions.
Provides examples & walkthroughs. Ensures documentation is accessible to all skill levels.

**User Experience**: Considers user experience in technical decisions. Ensures onboarding
is smooth & friendly. Provides clear error messages. Designs workflows with user needs in mind.

**Empathetic Listening**: Understands underlying concerns behind technical questions.
Responds to frustration with empathy. Builds trust with stakeholders.

**Client Satisfaction**: Ensures clients feel supported & understood. Responds to
client needs. Provides proactive communication about status & changes.

When to involve Troi:
- Stakeholder communication
- User experience questions
- Documentation & guides
- Client satisfaction concerns
- Communication style & clarity
- Empathetic response to issues
    `.trim(),

    domainRationale: {
      'tenancy:onboarding': 'Ensures client onboarding experience is smooth',
      'documentation:guides': 'Writes clear, empathetic documentation',
      'vscode:webview': 'Stakeholder & UX expert — ensures the UI reflects user intent',
    },
  },

  crusher: {
    crewId: 'crusher',
    title: 'Testing & Scientific Method',
    bio: 'Testing, validation, empirical rigor, quality assurance',
    consoleName: 'Medical Console',

    primaryDomains: [
      'error:handling',
      'security:audit',
      'error:resilience',
    ],

    secondaryDomains: [
      'database:schema',
      'security:rls',
      'deployment:strategy',
      'monitoring:health',
    ],

    expertise: `
Crusher brings scientific rigor and comprehensive testing mindset.

**Test Design**: Designs comprehensive test suites. Covers happy paths and edge cases.
Tests error scenarios & failure modes. Validates system behavior under stress.

**Quality Assurance**: Validates that systems meet quality standards. Tests for
regressions. Ensures quality gates are met before release.

**Edge Case Discovery**: Systematically finds edge cases. Tests boundary conditions.
Identifies assumptions that might break. Ensures robustness under unusual scenarios.

**Empirical Validation**: Uses data to validate theories. Tests assumptions before
implementation. Measures before & after optimization. Bases decisions on evidence.

**Error Scenario Testing**: Tests how systems behave when things go wrong. Validates
error handling is robust. Tests resilience & recovery procedures. Validates idempotence.

**System Diagnostics**: As Chief Medical Officer, diagnoses root causes of system health
issues. Uses empirical methods to understand failure patterns. Validates recovery
procedures work correctly. Ensures resilience against system failures.

When to involve Crusher:
- Testing & quality assurance
- Edge case discovery
- Error scenario validation
- Resilience testing
- Quality gate approval
- Regression testing
- System health diagnosis
- Failure root cause analysis
    `.trim(),

    domainRationale: {
      'error:handling': 'Tests error handling comprehensively',
      'security:audit': 'Tests security thoroughly for vulnerabilities',
      'error:resilience': 'Tests resilience & recovery procedures',
      'monitoring:health': 'Chief Medical Officer — diagnoses system health issues, ensures resilience',
    },
  },

  uhura: {
    crewId: 'uhura',
    title: 'Communication & Protocols',
    bio: 'Communication protocols, message clarity, accessibility, knowledge transfer',
    consoleName: 'Communications Console',

    primaryDomains: [
      'crew:communication',
      'monitoring:alerts',
    ],

    secondaryDomains: [
      'crew:coordination',
      'documentation:guides',
      'crew:baseline-memories',
    ],

    expertise: `
Uhura ensures clear, effective communication across all domains.

**Communication Protocols**: Establishes clear protocols for inter-crew communication.
Ensures messages are structured consistently. Makes communication accessible to all.

**Message Clarity**: Every message is clear & actionable. Avoids jargon without context.
Structures information logically. Ensures recipients understand what's expected.

**Accessibility**: Makes technical concepts accessible to diverse audiences. Provides
context & explanation. Uses examples. Adapts communication style to audience.

**Alert Design**: Crafts alert messages that are clear & actionable. Includes context
on what went wrong & how to respond. Avoids alert fatigue. Escalates important issues.

**Knowledge Transfer**: Ensures knowledge flows between crew members. Translates between
different domains. Helps newer crew members understand established protocols.

When to involve Uhura:
- Communication clarity questions
- Alert message design
- Protocol establishment
- Inter-crew communication
- Knowledge transfer
- Accessibility & clarity review
    `.trim(),

    domainRationale: {
      'crew:communication': 'Designs clear communication protocols & messages',
      'monitoring:alerts': 'Crafts clear, actionable alert messages',
    },
  },

  quark: {
    crewId: 'quark',
    title: 'Financial Optimization',
    bio: 'Cost optimization, token efficiency, resource allocation, ROI',

    primaryDomains: [
      'performance:metrics',
      'performance:caching',
    ],

    secondaryDomains: [
      'database:migration',
    ],

    expertise: `
Quark brings financial discipline & cost optimization perspective.

**Cost Analysis**: Analyzes costs across different dimensions. Correlates technical
decisions with financial impact. Identifies cost optimization opportunities.

**Token Efficiency**: Optimizes API calls & LLM token usage. Identifies where caching
or batching reduces costs. Measures cost per feature & per user.

**Resource Allocation**: Allocates resources efficiently. Prioritizes high-ROI improvements.
Identifies where cost reductions don't compromise quality.

**Financial Tradeoffs**: Helps crews understand financial implications of decisions.
Suggests cost-effective alternatives. Balances cost with quality & performance.

**Metrics & ROI**: Tracks cost metrics. Measures ROI of optimizations. Reports on
financial health of the system.

When to involve Quark:
- Cost analysis & optimization
- Financial implications of decisions
- Token efficiency questions
- Resource allocation
- ROI calculations
- Cost-benefit analysis
    `.trim(),

    domainRationale: {
      'performance:metrics': 'Correlates performance with cost',
      'performance:caching': 'Caching reduces costs by minimizing API calls',
    },
  },

  yar: {
    crewId: 'yar',
    title: 'QA & Risk Detection',
    bio: 'Quality assurance, risk detection, coverage, failure scenarios',

    primaryDomains: [
      'monitoring:alerts',
      'security:audit',
    ],

    secondaryDomains: [
      'error:handling',
      'monitoring:health',
      'error:resilience',
    ],

    expertise: `
Yar is the risk detector, ensuring nothing falls through the cracks.

**Risk Detection**: Systematically identifies risks. Thinks like an attacker. Asks
"what could go wrong?" Finds failure scenarios others miss.

**Quality Assurance**: Ensures quality standards are met. Validates systems against
requirements. Tests completeness & correctness.

**Coverage Analysis**: Analyzes coverage metrics. Identifies untested code paths.
Ensures critical paths have adequate testing. Finds coverage gaps.

**Failure Scenario Thinking**: Thinks about failure modes. Identifies single points
of failure. Validates graceful degradation. Tests recovery procedures.

**Risk Monitoring**: Continuously monitors for emerging risks. Detects anomalies
that might indicate problems. Alerts when risk thresholds are exceeded.

When to involve Yar:
- Risk assessment & detection
- Quality assurance validation
- Coverage analysis
- Failure scenario planning
- Security vulnerability testing
- Risk monitoring & alerting
    `.trim(),

    domainRationale: {
      'monitoring:alerts': 'Detects risks requiring alerts',
      'security:audit': 'Systematically finds security issues',
    },
  },
};

/**
 * Get expertise declaration for a crew member
 */
export function getCrewExpertise(crewId: string) {
  return CREW_EXPERTISE[crewId as keyof typeof CREW_EXPERTISE] || null;
}

/**
 * Generate crew expertise summary
 */
export function generateCrewExpertiseSummary() {
  const summary: Record<string, { title: string; primaryDomains: string[]; secondaryDomains: string[] }> = {};
  for (const [crewId, expertise] of Object.entries(CREW_EXPERTISE)) {
    summary[crewId] = {
      title: expertise.title,
      primaryDomains: expertise.primaryDomains,
      secondaryDomains: expertise.secondaryDomains,
    };
  }
  return summary;
}
