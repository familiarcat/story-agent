/**
 * Crew-authored 5W1H Skill Theories (generated) for the remaining MCP tools.
 *
 * Authored by the OpenRouter crew on Quark's cheapest adequate model (meta-llama/llama-3.3-70b)
 * — cost-optimized per the dogfooding mandate. Importing this module registers every theory.
 * Hand-edit individual entries to refine; new tools should prefer skill-theories.ts.
 */
import { defineSkillTheory, type SkillTheory } from '@story-agent/shared/skill-theory';

export const GENERATED_THEORIES: SkillTheory[] = [
  {
    "tool": "check_crew_member_status",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "Verify crew member status",
      "capabilities": [
        "crew management"
      ]
    },
    "when": {
      "useWhen": [
        "crew member update",
        "status inquiry"
      ],
      "avoidWhen": [
        " crew member creation",
        " mass updates"
      ],
      "preconditions": [
        "crew member exists"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "crew"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Ensure accurate crew member information",
      "goalsServed": [
        "crew management",
        "integrity"
      ]
    },
    "how": {
      "invocation": "check_crew_member_status(crew_member_id)",
      "annotations": {
        "title": "check_crew_member_status",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "crew member status"
    }
  },
  {
    "tool": "create_story_branch",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Create a new branch for a story",
      "capabilities": [
        "branch creation",
        "story management"
      ]
    },
    "when": {
      "useWhen": [
        "new story creation",
        "feature development"
      ],
      "avoidWhen": [
        "story completion",
        "release"
      ],
      "preconditions": [
        "story exists",
        "repository access"
      ]
    },
    "where": {
      "scope": [
        "git",
        "github"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "external"
    },
    "why": {
      "rationale": "Isolate story development",
      "goalsServed": [
        "story development",
        "code organization"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "create_story_branch",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": true
      },
      "output": "branch name"
    }
  },
  {
    "tool": "crew_captain_picard",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Leader of the crew",
      "capabilities": [
        "Decision Making",
        "Strategic Planning",
        "Diplomacy"
      ]
    },
    "when": {
      "useWhen": [
        "Critical situations",
        "High-stakes negotiations",
        "Long-term planning"
      ],
      "avoidWhen": [
        "Routine tasks",
        "Limited scope decisions"
      ],
      "preconditions": [
        "Senior officer status",
        "Experience in command"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Provide expert leadership and guidance to the crew",
      "goalsServed": [
        "Mission success",
        "Crew safety",
        "Exploration"
      ]
    },
    "how": {
      "invocation": "Direct report to Starfleet Command",
      "annotations": {
        "title": "crew_captain_picard",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "Strategic decisions and plans"
    }
  },
  {
    "tool": "crew_chief_obrien",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Chief engineer and problem solver",
      "capabilities": [
        "Engineering expertise",
        "Troubleshooting",
        "Innovation"
      ]
    },
    "when": {
      "useWhen": [
        "Technical problems",
        "Equipment failures",
        "Innovative solutions needed"
      ],
      "avoidWhen": [
        "Non-technical tasks",
        "Administrative duties"
      ],
      "preconditions": [
        "Engineering expertise",
        "Access to technical resources"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Ensure efficient operation and maintenance of ship systems",
      "goalsServed": [
        "Ship functionality",
        "Crew safety",
        "Mission success"
      ]
    },
    "how": {
      "invocation": "Request for technical assistance or guidance",
      "annotations": {
        "title": "crew_chief_obrien",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "Technical solutions and repairs"
    }
  },
  {
    "tool": "crew_commander_data",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Android crew member with advanced capabilities",
      "capabilities": [
        "Data analysis",
        "Tactical expertise",
        "Enhanced senses"
      ]
    },
    "when": {
      "useWhen": [
        "Data-intensive tasks",
        "Tactical situations",
        "Specialized skills required"
      ],
      "avoidWhen": [
        "Emotionally sensitive tasks",
        "Human intuition required"
      ],
      "preconditions": [
        "Android capabilities",
        "Access to data and systems"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Provide advanced analytical and tactical support to the crew",
      "goalsServed": [
        "Mission success",
        "Crew safety",
        "Exploration"
      ]
    },
    "how": {
      "invocation": "Request for analytical or tactical assistance",
      "annotations": {
        "title": "crew_commander_data",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "Data analysis and tactical recommendations"
    }
  },
  {
    "tool": "crew_commander_riker",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "First officer and commander",
      "capabilities": [
        "Tactical expertise",
        "Leadership",
        "Diplomacy"
      ]
    },
    "when": {
      "useWhen": [
        "Tactical situations",
        "Senior officer absence",
        "High-stakes negotiations"
      ],
      "avoidWhen": [
        "Routine tasks",
        "Limited scope decisions"
      ],
      "preconditions": [
        "Senior officer status",
        "Experience in command"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Provide expert leadership and tactical guidance to the crew",
      "goalsServed": [
        "Mission success",
        "Crew safety",
        "Exploration"
      ]
    },
    "how": {
      "invocation": "Direct report to Captain Picard",
      "annotations": {
        "title": "crew_commander_riker",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "Tactical decisions and plans"
    }
  },
  {
    "tool": "crew_counselor_troi",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Ship's counselor and empathic crew member",
      "capabilities": [
        "Empathic sensing",
        "Counseling",
        "Diplomacy"
      ]
    },
    "when": {
      "useWhen": [
        "Emotionally sensitive tasks",
        "Crew morale issues",
        "Alien species interactions"
      ],
      "avoidWhen": [
        "Technical tasks",
        "Data-intensive analysis"
      ],
      "preconditions": [
        "Betazoid empathic abilities",
        "Counseling training"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Provide emotional support and guidance to the crew",
      "goalsServed": [
        "Crew morale",
        "Mission success",
        "Alien species relations"
      ]
    },
    "how": {
      "invocation": "Request for counseling or emotional support",
      "annotations": {
        "title": "crew_counselor_troi",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "Emotional assessments and counseling recommendations"
    }
  },
  {
    "tool": "crew_dr_crusher",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Chief Medical Officer",
      "capabilities": [
        "Medical Diagnosis",
        "Surgery",
        "Patient Care"
      ]
    },
    "when": {
      "useWhen": [
        "Medical Emergency",
        "Injury",
        "Illness"
      ],
      "avoidWhen": [
        "Non-Medical Situations"
      ],
      "preconditions": [
        "Medical Training",
        "Equipment Availability"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Provides medical expertise to crew members",
      "goalsServed": [
        "Crew Health",
        "Mission Success"
      ]
    },
    "how": {
      "invocation": "Call for medical assistance",
      "annotations": {
        "title": "crew_dr_crusher",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Medical diagnosis and treatment"
    }
  },
  {
    "tool": "crew_efficiency_analysis",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Crew efficiency analysis tool",
      "capabilities": [
        "efficiency_evaluation",
        "productivity_analysis"
      ]
    },
    "when": {
      "useWhen": [
        "low_productivity",
        "inefficient_workflows"
      ],
      "avoidWhen": [
        "high_productivity",
        "sensitive_data_involved"
      ],
      "preconditions": [
        "access_to_crew_data",
        "efficiency_metrics"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Evaluate crew efficiency and identify areas for improvement",
      "goalsServed": [
        "productivity_enhancement",
        "efficiency_improvement"
      ]
    },
    "how": {
      "invocation": "run_efficiency_analysis()",
      "annotations": {
        "title": "crew_efficiency_analysis",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "efficiency_report"
    }
  },
  {
    "tool": "crew_geordi_la_forge",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Chief Engineer",
      "capabilities": [
        "Engineering Expertise",
        "Reparations",
        "Innovations"
      ]
    },
    "when": {
      "useWhen": [
        "Technical Issues",
        "System Failure",
        "Upgrade Opportunities"
      ],
      "avoidWhen": [
        "Non-Technical Situations"
      ],
      "preconditions": [
        "Engineering Training",
        "Equipment Availability"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Maintains and improves ship systems",
      "goalsServed": [
        "Ship Operations",
        "Mission Success"
      ]
    },
    "how": {
      "invocation": "Call for engineering assistance",
      "annotations": {
        "title": "crew_geordi_la_forge",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Functional ship systems"
    }
  },
  {
    "tool": "crew_integrity_report",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "Generate crew integrity report",
      "capabilities": [
        "reporting",
        "crew management"
      ]
    },
    "when": {
      "useWhen": [
        "crew status summary",
        "integrity check"
      ],
      "avoidWhen": [
        "individual crew member updates"
      ],
      "preconditions": [
        "crew data available"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "crew"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Provide crew integrity insights",
      "goalsServed": [
        "crew management",
        "integrity",
        "reporting"
      ]
    },
    "how": {
      "invocation": "crew_integrity_report()",
      "annotations": {
        "title": "crew_integrity_report",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "crew integrity report"
    }
  },
  {
    "tool": "crew_lt_uhura",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Communications Officer",
      "capabilities": [
        "Communication",
        "Translation",
        "Signal Analysis"
      ]
    },
    "when": {
      "useWhen": [
        "Communication Breakdown",
        "Alien Encounter",
        "Signal Interception"
      ],
      "avoidWhen": [
        "Non-Communication Situations"
      ],
      "preconditions": [
        "Communication Training",
        "Equipment Availability"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Facilitates communication with other ships and civilizations",
      "goalsServed": [
        "Mission Success",
        "Diplomatic Relations"
      ]
    },
    "how": {
      "invocation": "Call for communication assistance",
      "annotations": {
        "title": "crew_lt_uhura",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Established communication channels"
    }
  },
  {
    "tool": "crew_lt_worf",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Security Officer",
      "capabilities": [
        "Security Protocols",
        "Combat Tactics",
        "Threat Assessment"
      ]
    },
    "when": {
      "useWhen": [
        "Security Threat",
        "Combat Situation",
        "boarding Actions"
      ],
      "avoidWhen": [
        "Non-Security Situations"
      ],
      "preconditions": [
        "Security Training",
        "Equipment Availability"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Protects the ship and crew from harm",
      "goalsServed": [
        "Crew Safety",
        "Mission Success"
      ]
    },
    "how": {
      "invocation": "Call for security assistance",
      "annotations": {
        "title": "crew_lt_worf",
        "readOnlyHint": false,
        "destructiveHint": true,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "output": "Secure ship and crew"
    }
  },
  {
    "tool": "crew_member_prompt_history",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Crew member prompt history tool",
      "capabilities": [
        "prompt_logging",
        "crew_member_tracking"
      ]
    },
    "when": {
      "useWhen": [
        "prompt_evaluation",
        "crew_member_evaluation"
      ],
      "avoidWhen": [
        "sensitive_data_involved",
        "crew_privacy_concerns"
      ],
      "preconditions": [
        "access_to_crew_data",
        "prompt_log_access"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Track and evaluate crew member prompt history",
      "goalsServed": [
        "crew_evaluation",
        "prompt_improvement"
      ]
    },
    "how": {
      "invocation": "get_prompt_history(crew_member_id)",
      "annotations": {
        "title": "crew_member_prompt_history",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "prompt_history_log"
    }
  },
  {
    "tool": "crew_observation_lounge_status",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Crew observation lounge status tool",
      "capabilities": [
        "lounge_status_monitoring",
        "crew_activity_tracking"
      ]
    },
    "when": {
      "useWhen": [
        "lounge_status_check",
        "crew_activity_monitoring"
      ],
      "avoidWhen": [
        "sensitive_data_involved",
        "crew_privacy_concerns"
      ],
      "preconditions": [
        "access_to_lounge_data",
        "observation_lounge_access"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Monitor and track crew observation lounge status",
      "goalsServed": [
        "lounge_management",
        "crew_activity_monitoring"
      ]
    },
    "how": {
      "invocation": "get_lounge_status()",
      "annotations": {
        "title": "crew_observation_lounge_status",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "lounge_status_report"
    }
  },
  {
    "tool": "crew_prompt_history",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Crew prompt history tool",
      "capabilities": [
        "prompt_logging",
        "crew_prompt_evaluation"
      ]
    },
    "when": {
      "useWhen": [
        "prompt_evaluation",
        "crew_evaluation"
      ],
      "avoidWhen": [
        "sensitive_data_involved",
        "crew_privacy_concerns"
      ],
      "preconditions": [
        "access_to_crew_data",
        "prompt_log_access"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Track and evaluate crew prompt history",
      "goalsServed": [
        "crew_evaluation",
        "prompt_improvement"
      ]
    },
    "how": {
      "invocation": "get_prompt_history()",
      "annotations": {
        "title": "crew_prompt_history",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "prompt_history_log"
    }
  },
  {
    "tool": "crew_prompt_statistics",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Analyzes crew prompt usage statistics",
      "capabilities": [
        "data analysis",
        "usage tracking"
      ]
    },
    "when": {
      "useWhen": [
        "optimizing crew performance",
        "identifying trends"
      ],
      "avoidWhen": [
        "low data availability"
      ],
      "preconditions": [
        "configured crew prompts"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To improve crew efficiency and effectiveness",
      "goalsServed": [
        "crew performance optimization"
      ]
    },
    "how": {
      "invocation": "Scheduled or on-demand",
      "annotations": {
        "title": "crew_prompt_statistics",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Statistics report"
    }
  },
  {
    "tool": "crew_quark",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Ferengi Entrepreneur",
      "capabilities": [
        "Trade Negotiations",
        "Financial Analysis",
        "Business Strategy"
      ]
    },
    "when": {
      "useWhen": [
        "Trade Opportunities",
        "Financial Decisions",
        "Business Dealings"
      ],
      "avoidWhen": [
        "Non-Financial Situations"
      ],
      "preconditions": [
        "Business Training",
        "Ferengi Rules of Acquisition"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Generates profit and promotes Ferengi interests",
      "goalsServed": [
        "Profit",
        "Ferengi Empire"
      ]
    },
    "how": {
      "invocation": "Call for business assistance",
      "annotations": {
        "title": "crew_quark",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "Profitable business deals"
    }
  },
  {
    "tool": "crew_story_prompt_audit",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Examines crew story prompts for consistency and accuracy",
      "capabilities": [
        "data validation",
        "quality assurance"
      ]
    },
    "when": {
      "useWhen": [
        "onboarding new crew members",
        "updating story prompts"
      ],
      "avoidWhen": [
        "frequent audits may impact performance"
      ],
      "preconditions": [
        "established story prompts"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To ensure high-quality and consistent story prompts",
      "goalsServed": [
        "crew training",
        "story quality"
      ]
    },
    "how": {
      "invocation": "Scheduled or on-demand",
      "annotations": {
        "title": "crew_story_prompt_audit",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Audit report"
    }
  },
  {
    "tool": "crew_tasha_yar",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Tasha Yar crew member analysis",
      "capabilities": [
        "security_analysis",
        "crew_evaluation"
      ]
    },
    "when": {
      "useWhen": [
        "security_breaches",
        "crew_performance_review"
      ],
      "avoidWhen": [
        "non_security_issues",
        "crew_privacy_concerns"
      ],
      "preconditions": [
        "access_to_crew_data",
        "security_clearance"
      ]
    },
    "where": {
      "scope": [
        "crew",
        "llm"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Evaluate crew member Tasha Yar's performance and security clearance",
      "goalsServed": [
        "crew_evaluation",
        "security_enhancement"
      ]
    },
    "how": {
      "invocation": "run_crew_analysis(Tasha_Yar)",
      "annotations": {
        "title": "crew_tasha_yar",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "analysis_report"
    }
  },
  {
    "tool": "deliver_mission_output",
    "who": {
      "owner": "riker"
    },
    "what": {
      "summary": "Delivers output of mission to destination",
      "capabilities": [
        "file transfer",
        "data delivery"
      ]
    },
    "when": {
      "useWhen": [
        "mission completion",
        "output ready"
      ],
      "avoidWhen": [
        "insufficient permissions",
        "network issues"
      ],
      "preconditions": [
        "output generated",
        "destination configured"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "cloud-db",
        "aws"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "external"
    },
    "why": {
      "rationale": "Ensure timely delivery of mission output",
      "goalsServed": [
        "mission success",
        "data sharing"
      ]
    },
    "how": {
      "invocation": "deliver_mission_output(output, destination)",
      "annotations": {
        "title": "deliver_mission_output",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "delivery confirmation"
    }
  },
  {
    "tool": "describe_skill",
    "who": {
      "owner": "data"
    },
    "what": {
      "summary": "Provides detailed information about a specific skill",
      "capabilities": [
        "skill analysis",
        "knowledge graph traversal"
      ]
    },
    "when": {
      "useWhen": [
        "skill development",
        "knowledge gap analysis"
      ],
      "avoidWhen": [
        "high-level overview needed"
      ],
      "preconditions": [
        "skill exists in database"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Enables in-depth understanding of skills and their relationships",
      "goalsServed": [
        "skill development",
        "knowledge management"
      ]
    },
    "how": {
      "invocation": "describe_skill <skill_name>",
      "annotations": {
        "title": "describe_skill",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "detailed skill information"
    }
  },
  {
    "tool": "evaluate_tool_for_crew",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Assess tool effectiveness for crew",
      "capabilities": [
        "Tool evaluation",
        "Crew assessment"
      ]
    },
    "when": {
      "useWhen": [
        "Tool introduction",
        "Crew onboarding"
      ],
      "avoidWhen": [
        "Emergency situations"
      ],
      "preconditions": [
        "Tool availability",
        "Crew data"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell",
        "crew"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Ensure tool effectiveness for crew",
      "goalsServed": [
        "Crew efficiency",
        "Tool utilization"
      ]
    },
    "how": {
      "invocation": "evaluate_tool_for_crew(tool_id, crew_id)",
      "annotations": {
        "title": "evaluate_tool_for_crew",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Tool evaluation report"
    }
  },
  {
    "tool": "get_client_policy",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "Retrieve client policy",
      "capabilities": [
        "policy retrieval"
      ]
    },
    "when": {
      "useWhen": [
        "client policy required"
      ],
      "avoidWhen": [
        "policy not applicable"
      ],
      "preconditions": [
        "client authenticated"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Client policy retrieval",
      "goalsServed": [
        "client policy management"
      ]
    },
    "how": {
      "invocation": "get_client_policy(client_id)",
      "annotations": {
        "title": "get_client_policy",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "client policy"
    }
  },
  {
    "tool": "get_crew_integrity_summary",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "Retrieve crew integrity summary",
      "capabilities": [
        "summary",
        "crew management"
      ]
    },
    "when": {
      "useWhen": [
        "quick crew status check",
        "summary view"
      ],
      "avoidWhen": [
        "detailed reporting"
      ],
      "preconditions": [
        "crew data available"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "crew"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Provide concise crew integrity information",
      "goalsServed": [
        "crew management",
        "integrity"
      ]
    },
    "how": {
      "invocation": "get_crew_integrity_summary()",
      "annotations": {
        "title": "get_crew_integrity_summary",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "crew integrity summary"
    }
  },
  {
    "tool": "get_crew_memory_for_scenario",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Retrieves relevant crew memory for a given scenario",
      "capabilities": [
        "data retrieval",
        "scenario analysis"
      ]
    },
    "when": {
      "useWhen": [
        "planning scenarios",
        "executing scenarios"
      ],
      "avoidWhen": [
        "insufficient memory or data"
      ],
      "preconditions": [
        "configured crew memory",
        "defined scenario"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To inform scenario planning and execution",
      "goalsServed": [
        "scenario planning",
        "crew decision-making"
      ]
    },
    "how": {
      "invocation": "On-demand",
      "annotations": {
        "title": "get_crew_memory_for_scenario",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "Relevant crew memory"
    }
  },
  {
    "tool": "get_crew_personas",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Retrieve crew member personas",
      "capabilities": [
        "Crew data retrieval"
      ]
    },
    "when": {
      "useWhen": [
        "Crew assessment",
        "Tool evaluation"
      ],
      "avoidWhen": [
        "Data sensitivity concerns"
      ],
      "preconditions": [
        "Crew data availability"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell",
        "crew"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Inform crew-related decisions",
      "goalsServed": [
        "Crew understanding",
        "Tool customization"
      ]
    },
    "how": {
      "invocation": "get_crew_personas(crew_id)",
      "annotations": {
        "title": "get_crew_personas",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Crew personas data"
    }
  },
  {
    "tool": "get_crew_skill_manifest",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Retrieve crew skill manifest",
      "capabilities": [
        "Crew skill data retrieval"
      ]
    },
    "when": {
      "useWhen": [
        "Crew assessment",
        "Tool evaluation"
      ],
      "avoidWhen": [
        "Data sensitivity concerns"
      ],
      "preconditions": [
        "Crew data availability"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell",
        "crew"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Inform crew-related decisions",
      "goalsServed": [
        "Crew understanding",
        "Tool customization"
      ]
    },
    "how": {
      "invocation": "get_crew_skill_manifest(crew_id)",
      "annotations": {
        "title": "get_crew_skill_manifest",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Crew skill manifest data"
    }
  },
  {
    "tool": "get_doc_guidance",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Provides guidance for a specific document",
      "capabilities": [
        "document analysis",
        "guidance generation"
      ]
    },
    "when": {
      "useWhen": [
        "creating a new document",
        "editing an existing document"
      ],
      "avoidWhen": [
        "document is already finalized"
      ],
      "preconditions": [
        "document exists in database"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "github"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To assist users in creating and editing documents",
      "goalsServed": [
        "improve document quality",
        "reduce editing time"
      ]
    },
    "how": {
      "invocation": "API call with document ID",
      "annotations": {
        "title": "get_doc_guidance",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Guidance text"
    }
  },
  {
    "tool": "get_role_guidance",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Provides guidance for a specific role",
      "capabilities": [
        "role analysis",
        "guidance generation"
      ]
    },
    "when": {
      "useWhen": [
        "onboarding a new team member",
        "assigning a new role"
      ],
      "avoidWhen": [
        "role is already well understood"
      ],
      "preconditions": [
        "role exists in database"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "github"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To assist users in understanding their roles",
      "goalsServed": [
        "improve role clarity",
        "reduce onboarding time"
      ]
    },
    "how": {
      "invocation": "API call with role ID",
      "annotations": {
        "title": "get_role_guidance",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Guidance text"
    }
  },
  {
    "tool": "get_sprint_details",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Retrieves details of a sprint",
      "capabilities": [
        "sprint retrieval",
        "detail fetching"
      ]
    },
    "when": {
      "useWhen": [
        "sprint planning",
        "project management"
      ],
      "avoidWhen": [
        "story creation",
        "sprint completion"
      ],
      "preconditions": [
        "sprint exists",
        "user has access"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To inform sprint planning and project management decisions",
      "goalsServed": [
        "informed decision making",
        "project visibility"
      ]
    },
    "how": {
      "invocation": "API call or command line interface",
      "annotations": {
        "title": "get_sprint_details",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "sprint details"
    }
  },
  {
    "tool": "get_sprint_stories",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Retrieves stories associated with a sprint",
      "capabilities": [
        "story retrieval",
        "sprint association"
      ]
    },
    "when": {
      "useWhen": [
        "sprint planning",
        "project tracking"
      ],
      "avoidWhen": [
        "story creation",
        "sprint completion"
      ],
      "preconditions": [
        "sprint exists",
        "user has access"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To inform sprint planning and project tracking decisions",
      "goalsServed": [
        "informed decision making",
        "project visibility"
      ]
    },
    "how": {
      "invocation": "API call or command line interface",
      "annotations": {
        "title": "get_sprint_stories",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "list of stories"
    }
  },
  {
    "tool": "get_starship_status",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Retrieve starship status data",
      "capabilities": [
        "Starship status data retrieval"
      ]
    },
    "when": {
      "useWhen": [
        "Mission planning",
        "Emergency situations"
      ],
      "avoidWhen": [
        "Data connectivity issues"
      ],
      "preconditions": [
        "Starship data availability"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell",
        "github",
        "aws"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Inform starship-related decisions",
      "goalsServed": [
        "Starship efficiency",
        "Mission success"
      ]
    },
    "how": {
      "invocation": "get_starship_status/starship_id",
      "annotations": {
        "title": "get_starship_status",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Starship status data"
    }
  },
  {
    "tool": "get_story",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Retrieves details of a story",
      "capabilities": [
        "story retrieval",
        "detail fetching"
      ]
    },
    "when": {
      "useWhen": [
        "story creation",
        "project tracking"
      ],
      "avoidWhen": [
        "sprint completion",
        "story deletion"
      ],
      "preconditions": [
        "story exists",
        "user has access"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To inform project tracking and story management decisions",
      "goalsServed": [
        "informed decision making",
        "project visibility"
      ]
    },
    "how": {
      "invocation": "API call or command line interface",
      "annotations": {
        "title": "get_story",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "story details"
    }
  },
  {
    "tool": "get_story_status",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Retrieve the status of a story",
      "capabilities": [
        "story status retrieval",
        "story tracking"
      ]
    },
    "when": {
      "useWhen": [
        "story development",
        "project management"
      ],
      "avoidWhen": [
        "story deletion"
      ],
      "preconditions": [
        "story exists",
        "repository access"
      ]
    },
    "where": {
      "scope": [
        "github",
        "git"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Monitor story progress",
      "goalsServed": [
        "project management",
        "story tracking"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "get_story_status",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "story status"
    }
  },
  {
    "tool": "initialize_missing_crew_member",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "Initialize missing crew member",
      "capabilities": [
        "crew management",
        "initialization"
      ]
    },
    "when": {
      "useWhen": [
        "new crew member creation",
        "missing crew member"
      ],
      "avoidWhen": [
        " existing crew member updates"
      ],
      "preconditions": [
        "crew member does not exist"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "crew"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "local"
    },
    "why": {
      "rationale": "Ensure all crew members are initialized",
      "goalsServed": [
        "crew management",
        "integrity"
      ]
    },
    "how": {
      "invocation": "initialize_missing_crew_member(crew_member_id)",
      "annotations": {
        "title": "initialize_missing_crew_member",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "output": "initialized crew member"
    }
  },
  {
    "tool": "launch_crew_mission",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Initiates a crew mission",
      "capabilities": [
        "mission initiation",
        "crew management"
      ]
    },
    "when": {
      "useWhen": [
        "new project",
        "crew formation"
      ],
      "avoidWhen": [
        "project completion",
        "crew disbandment"
      ],
      "preconditions": [
        "crew exists",
        "mission parameters set"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To initiate a new project or mission with a crew",
      "goalsServed": [
        "project initiation",
        "crew utilization"
      ]
    },
    "how": {
      "invocation": "command line interface or API call",
      "annotations": {
        "title": "launch_crew_mission",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": true
      },
      "output": "mission launched"
    }
  },
  {
    "tool": "link_aha_story_to_pr",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Links an Aha story to a pull request",
      "capabilities": [
        "story linking",
        "pull request association"
      ]
    },
    "when": {
      "useWhen": [
        "story implementation",
        "pull request creation"
      ],
      "avoidWhen": [
        "story deletion",
        "pull request closure"
      ],
      "preconditions": [
        "Aha story exists",
        "pull request exists",
        "user has access"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To associate a story with its implementation in a pull request",
      "goalsServed": [
        "traceability",
        "project visibility"
      ]
    },
    "how": {
      "invocation": "API call or command line interface",
      "annotations": {
        "title": "link_aha_story_to_pr",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "link established"
    }
  },
  {
    "tool": "list_active_stories",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "List all active stories",
      "capabilities": [
        "story listing",
        "project management"
      ]
    },
    "when": {
      "useWhen": [
        "project planning",
        "story development"
      ],
      "avoidWhen": [
        "story completion"
      ],
      "preconditions": [
        "repository access"
      ]
    },
    "where": {
      "scope": [
        "github",
        "git"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Track active stories",
      "goalsServed": [
        "project management",
        "story tracking"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "list_active_stories",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "list of active stories"
    }
  },
  {
    "tool": "list_aha_sprints",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Lists available Aha sprints",
      "capabilities": [
        "retrieve",
        "list"
      ]
    },
    "when": {
      "useWhen": [
        "planning",
        "project management"
      ],
      "avoidWhen": [
        "execution",
        "monitoring"
      ],
      "preconditions": [
        "authorization",
        "project setup"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To inform project planning and management",
      "goalsServed": [
        "project planning",
        "sprint management"
      ]
    },
    "how": {
      "invocation": "API call or command line",
      "annotations": {
        "title": "list_aha_sprints",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "list of sprints"
    }
  },
  {
    "tool": "list_client_hierarchy",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "List client hierarchy",
      "capabilities": [
        "hierarchy retrieval"
      ]
    },
    "when": {
      "useWhen": [
        "client hierarchy required"
      ],
      "avoidWhen": [
        "hierarchy not applicable"
      ],
      "preconditions": [
        "client authenticated"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Client hierarchy retrieval",
      "goalsServed": [
        "client hierarchy management"
      ]
    },
    "how": {
      "invocation": "list_client_hierarchy(client_id)",
      "annotations": {
        "title": "list_client_hierarchy",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "client hierarchy"
    }
  },
  {
    "tool": "list_doc_phases",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Lists all phases of a document",
      "capabilities": [
        "document analysis",
        "phase identification"
      ]
    },
    "when": {
      "useWhen": [
        "tracking document progress",
        "identifying bottlenecks"
      ],
      "avoidWhen": [
        "document is already completed"
      ],
      "preconditions": [
        "document exists in database"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "github"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To assist users in managing document workflow",
      "goalsServed": [
        "improve document tracking",
        "reduce cycle time"
      ]
    },
    "how": {
      "invocation": "API call with document ID",
      "annotations": {
        "title": "list_doc_phases",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "List of phases"
    }
  },
  {
    "tool": "list_projects",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Lists available projects",
      "capabilities": [
        "retrieve",
        "list"
      ]
    },
    "when": {
      "useWhen": [
        "planning",
        "project management"
      ],
      "avoidWhen": [
        "execution",
        "monitoring"
      ],
      "preconditions": [
        "authorization",
        "project setup"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To inform project selection and management",
      "goalsServed": [
        "project planning",
        "project management"
      ]
    },
    "how": {
      "invocation": "API call or command line",
      "annotations": {
        "title": "list_projects",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "list of projects"
    }
  },
  {
    "tool": "list_skill_theories",
    "who": {
      "owner": "data"
    },
    "what": {
      "summary": "Lists all available skill theories and their descriptions",
      "capabilities": [
        "skill theory retrieval",
        "taxonomy browsing"
      ]
    },
    "when": {
      "useWhen": [
        "exploratory learning",
        "skill theory development"
      ],
      "avoidWhen": [
        "specific skill information needed"
      ],
      "preconditions": [
        "skill theories exist in database"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Facilitates discovery and exploration of skill theories",
      "goalsServed": [
        "skill development",
        "knowledge discovery"
      ]
    },
    "how": {
      "invocation": "list_skill_theories",
      "annotations": {
        "title": "list_skill_theories",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "list of skill theories and descriptions"
    }
  },
  {
    "tool": "list_stories",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Lists available stories",
      "capabilities": [
        "retrieve",
        "list"
      ]
    },
    "when": {
      "useWhen": [
        "planning",
        "story management"
      ],
      "avoidWhen": [
        "execution",
        "monitoring"
      ],
      "preconditions": [
        "authorization",
        "story setup"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To inform story selection and management",
      "goalsServed": [
        "story planning",
        "story management"
      ]
    },
    "how": {
      "invocation": "API call or command line",
      "annotations": {
        "title": "list_stories",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "list of stories"
    }
  },
  {
    "tool": "list_tool_registry",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "List registered tools",
      "capabilities": [
        "Tool registry data retrieval"
      ]
    },
    "when": {
      "useWhen": [
        "Tool management",
        "Crew onboarding"
      ],
      "avoidWhen": [
        "Tool registry issues"
      ],
      "preconditions": [
        "Tool registry availability"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell",
        "github"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Inform tool-related decisions",
      "goalsServed": [
        "Tool management",
        "Crew efficiency"
      ]
    },
    "how": {
      "invocation": "list_tool_registry()",
      "annotations": {
        "title": "list_tool_registry",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Tool registry data"
    }
  },
  {
    "tool": "memory_sync_diagnostics",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Diagnoses issues with crew memory synchronization",
      "capabilities": [
        "diagnostics",
        "troubleshooting"
      ]
    },
    "when": {
      "useWhen": [
        "memory synchronization issues",
        "system maintenance"
      ],
      "avoidWhen": [
        "normal operation"
      ],
      "preconditions": [
        "configured crew memory"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To identify and resolve memory synchronization issues",
      "goalsServed": [
        "system reliability",
        "data integrity"
      ]
    },
    "how": {
      "invocation": "On-demand or scheduled",
      "annotations": {
        "title": "memory_sync_diagnostics",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Diagnostics report"
    }
  },
  {
    "tool": "open_pull_request",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Open a new pull request",
      "capabilities": [
        "pull request creation",
        "code review"
      ]
    },
    "when": {
      "useWhen": [
        "feature completion",
        "bug fix"
      ],
      "avoidWhen": [
        "story completion",
        "release"
      ],
      "preconditions": [
        "story exists",
        "repository access",
        "branch exists"
      ]
    },
    "where": {
      "scope": [
        "git",
        "github"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "external"
    },
    "why": {
      "rationale": "Initiate code review",
      "goalsServed": [
        "code quality",
        "story completion"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "open_pull_request",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": true
      },
      "output": "pull request id"
    }
  },
  {
    "tool": "post_pr_comment",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Post a comment on a pull request",
      "capabilities": [
        "comment creation",
        "code review"
      ]
    },
    "when": {
      "useWhen": [
        "code review",
        "pull request discussion"
      ],
      "avoidWhen": [
        "pull request completion"
      ],
      "preconditions": [
        "pull request exists",
        "repository access"
      ]
    },
    "where": {
      "scope": [
        "github"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "external"
    },
    "why": {
      "rationale": "Facilitate code review discussion",
      "goalsServed": [
        "code quality",
        "collaboration"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "post_pr_comment",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": true
      },
      "output": "comment id"
    }
  },
  {
    "tool": "prepare_story_for_execution",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Prepares a story for execution",
      "capabilities": [
        "prepare",
        "configure"
      ]
    },
    "when": {
      "useWhen": [
        "execution",
        "testing"
      ],
      "avoidWhen": [
        "planning",
        "project management"
      ],
      "preconditions": [
        "story selection",
        "environment setup"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To ensure story is ready for execution",
      "goalsServed": [
        "story execution",
        "testing"
      ]
    },
    "how": {
      "invocation": "API call or command line",
      "annotations": {
        "title": "prepare_story_for_execution",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "prepared story"
    }
  },
  {
    "tool": "recover_all_missing_crew_members",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "Recover all missing crew members",
      "capabilities": [
        "crew management",
        "recovery"
      ]
    },
    "when": {
      "useWhen": [
        "multiple missing crew members",
        " bulk recovery"
      ],
      "avoidWhen": [
        "individual crew member recovery"
      ],
      "preconditions": [
        "missing crew members exist"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "crew"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "local"
    },
    "why": {
      "rationale": "Recover all missing crew members efficiently",
      "goalsServed": [
        "crew management",
        "integrity"
      ]
    },
    "how": {
      "invocation": "recover_all_missing_crew_members()",
      "annotations": {
        "title": "recover_all_missing_crew_members",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "output": "recovered crew members"
    }
  },
  {
    "tool": "recover_crew_member_memories",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "Recover crew member memories",
      "capabilities": [
        "crew management",
        "memory recovery"
      ]
    },
    "when": {
      "useWhen": [
        "crew member memory loss",
        "recovery needed"
      ],
      "avoidWhen": [
        "crew member creation",
        "normal operation"
      ],
      "preconditions": [
        "crew member exists",
        "memories lost"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "crew"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "local"
    },
    "why": {
      "rationale": "Recover lost crew member memories",
      "goalsServed": [
        "crew management",
        "integrity"
      ]
    },
    "how": {
      "invocation": "recover_crew_member_memories(crew_member_id)",
      "annotations": {
        "title": "recover_crew_member_memories",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "output": "recovered memories"
    }
  },
  {
    "tool": "resolve_repository",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Resolve a repository reference",
      "capabilities": [
        "repository resolution",
        "story tracking"
      ]
    },
    "when": {
      "useWhen": [
        "story development",
        "project management"
      ],
      "avoidWhen": [
        "repository deletion"
      ],
      "preconditions": [
        "repository exists"
      ]
    },
    "where": {
      "scope": [
        "github",
        "git"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Identify repository",
      "goalsServed": [
        "project management",
        "story tracking"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "resolve_repository",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "repository reference"
    }
  },
  {
    "tool": "run_mission_debrief",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Run mission debriefing process",
      "capabilities": [
        "Mission debriefing"
      ]
    },
    "when": {
      "useWhen": [
        "Mission completion"
      ],
      "avoidWhen": [
        "Mission critical issues"
      ],
      "preconditions": [
        "Mission data availability"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell",
        "github",
        "aws",
        "crew"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "local"
    },
    "why": {
      "rationale": "Improve mission outcomes",
      "goalsServed": [
        "Mission efficiency",
        "Crew improvement"
      ]
    },
    "how": {
      "invocation": "run_mission_debrief(mission_id)",
      "annotations": {
        "title": "run_mission_debrief",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "output": "Mission debrief report"
    }
  },
  {
    "tool": "run_observation_lounge",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Run observation lounge process",
      "capabilities": [
        "Observation lounge management"
      ]
    },
    "when": {
      "useWhen": [
        "Crew observation",
        "Tool evaluation"
      ],
      "avoidWhen": [
        "Observation lounge issues"
      ],
      "preconditions": [
        "Observation lounge availability"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell",
        "crew"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "local"
    },
    "why": {
      "rationale": "Enhance crew observation",
      "goalsServed": [
        "Crew understanding",
        "Tool customization"
      ]
    },
    "how": {
      "invocation": "run_observation_lounge(crew_id)",
      "annotations": {
        "title": "run_observation_lounge",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "output": "Observation lounge report"
    }
  },
  {
    "tool": "run_observation_lounge_debate",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Runs an observation lounge debate",
      "capabilities": [
        "execute",
        "facilitate"
      ]
    },
    "when": {
      "useWhen": [
        "execution",
        "testing",
        "evaluation"
      ],
      "avoidWhen": [
        "planning",
        "project management"
      ],
      "preconditions": [
        "story preparation",
        "environment setup"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To facilitate observation and debate",
      "goalsServed": [
        "story evaluation",
        "idea generation"
      ]
    },
    "how": {
      "invocation": "API call or command line",
      "annotations": {
        "title": "run_observation_lounge_debate",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "debate results"
    }
  },
  {
    "tool": "runtime_connectivity_diagnostics",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Diagnoses runtime connectivity issues",
      "capabilities": [
        "diagnostics",
        "troubleshooting"
      ]
    },
    "when": {
      "useWhen": [
        "connectivity issues",
        "system maintenance"
      ],
      "avoidWhen": [
        "normal operation"
      ],
      "preconditions": [
        "configured runtime environment"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To identify and resolve connectivity issues",
      "goalsServed": [
        "system reliability",
        "runtime performance"
      ]
    },
    "how": {
      "invocation": "On-demand or scheduled",
      "annotations": {
        "title": "runtime_connectivity_diagnostics",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "Diagnostics report"
    }
  },
  {
    "tool": "search_docs",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Searches for documents based on query",
      "capabilities": [
        "document retrieval",
        "search"
      ]
    },
    "when": {
      "useWhen": [
        "looking for a specific document",
        "browsing documents"
      ],
      "avoidWhen": [
        "query is too vague"
      ],
      "preconditions": [
        "documents exist in database"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "github"
      ],
      "surfaces": [
        "api"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To assist users in finding relevant documents",
      "goalsServed": [
        "improve document discovery",
        "reduce search time"
      ]
    },
    "how": {
      "invocation": "API call with search query",
      "annotations": {
        "title": "search_docs",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "List of documents"
    }
  },
  {
    "tool": "seed_crew_skill_manifests",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Seed crew skill manifests",
      "capabilities": [
        "Crew skill data initialization"
      ]
    },
    "when": {
      "useWhen": [
        "Crew onboarding"
      ],
      "avoidWhen": [
        "Data sensitivity concerns"
      ],
      "preconditions": [
        "Crew data availability"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell",
        "crew"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "local"
    },
    "why": {
      "rationale": "Initialize crew skill data",
      "goalsServed": [
        "Crew efficiency",
        "Tool utilization"
      ]
    },
    "how": {
      "invocation": "seed_crew_skill_manifests(crew_id)",
      "annotations": {
        "title": "seed_crew_skill_manifests",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": false
      },
      "output": "Crew skill manifests data"
    }
  },
  {
    "tool": "skill_coverage",
    "who": {
      "owner": "data"
    },
    "what": {
      "summary": "Analyzes the coverage of skills in a given context",
      "capabilities": [
        "skill analysis",
        "coverage analysis"
      ]
    },
    "when": {
      "useWhen": [
        "skill gap analysis",
        "curriculum development"
      ],
      "avoidWhen": [
        "high-level overview needed"
      ],
      "preconditions": [
        "skills exist in database",
        "context defined"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "Enables identification of skill gaps and areas for improvement",
      "goalsServed": [
        "skill development",
        "curriculum design"
      ]
    },
    "how": {
      "invocation": "skill_coverage <context>",
      "annotations": {
        "title": "skill_coverage",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "skill coverage analysis"
    }
  },
  {
    "tool": "structured_memory_snapshot",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Captures a structured snapshot of memory",
      "capabilities": [
        "memory analysis",
        "data capture"
      ]
    },
    "when": {
      "useWhen": [
        "debugging",
        "performance optimization"
      ],
      "avoidWhen": [
        "real-time systems",
        "high-priority tasks"
      ],
      "preconditions": [
        "sufficient memory",
        "permissions"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To analyze and understand memory usage patterns",
      "goalsServed": [
        "debugging",
        "performance improvement"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "structured_memory_snapshot",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "structured data"
    }
  },
  {
    "tool": "summarize_crew_memory_trends",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Analyzes crew memory trends and provides a summary",
      "capabilities": [
        "data analysis",
        "trend identification"
      ]
    },
    "when": {
      "useWhen": [
        "crew performance evaluation",
        "memory optimization"
      ],
      "avoidWhen": [
        "individual privacy concerns",
        "high-stress situations"
      ],
      "preconditions": [
        "valid crew data",
        "sufficient sample size"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To identify trends and patterns in crew memory usage",
      "goalsServed": [
        "crew performance improvement",
        "memory management"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "summarize_crew_memory_trends",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "summary report"
    }
  },
  {
    "tool": "sync_pr_comments",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Synchronize pull request comments",
      "capabilities": [
        "comment synchronization",
        "code review"
      ]
    },
    "when": {
      "useWhen": [
        "code review",
        "pull request discussion"
      ],
      "avoidWhen": [
        "pull request completion"
      ],
      "preconditions": [
        "pull request exists",
        "repository access"
      ]
    },
    "where": {
      "scope": [
        "github"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "external"
    },
    "why": {
      "rationale": "Keep comments up-to-date",
      "goalsServed": [
        "code quality",
        "collaboration"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "sync_pr_comments",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": true
      },
      "output": "comment synchronization status"
    }
  },
  {
    "tool": "update_aha_story_status",
    "who": {
      "owner": "troi"
    },
    "what": {
      "summary": "Updates the status of an Aha! story",
      "capabilities": [
        "story management",
        "status update"
      ]
    },
    "when": {
      "useWhen": [
        "story status needs to be updated",
        "story workflow requires status change"
      ],
      "avoidWhen": [
        "story is in a terminal state",
        "user lacks permissions"
      ],
      "preconditions": [
        "story exists in Aha!",
        "user has edit permissions"
      ]
    },
    "where": {
      "scope": [
        "aha"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To track progress and reflect changes in the story's lifecycle",
      "goalsServed": [
        "project tracking",
        "team coordination"
      ]
    },
    "how": {
      "invocation": "API call or user interface interaction",
      "annotations": {
        "title": "update_aha_story_status",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "Updated story status"
    }
  },
  {
    "tool": "update_story_status",
    "who": {
      "owner": "geordi"
    },
    "what": {
      "summary": "Update the status of a story",
      "capabilities": [
        "story status update",
        "story tracking"
      ]
    },
    "when": {
      "useWhen": [
        "story development",
        "project management"
      ],
      "avoidWhen": [
        "story deletion"
      ],
      "preconditions": [
        "story exists",
        "repository access"
      ]
    },
    "where": {
      "scope": [
        "github",
        "git"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "external"
    },
    "why": {
      "rationale": "Track story progress",
      "goalsServed": [
        "project management",
        "story tracking"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "update_story_status",
        "readOnlyHint": false,
        "destructiveHint": false,
        "idempotentHint": false,
        "openWorldHint": true
      },
      "output": "story status update result"
    }
  },
  {
    "tool": "worfgate_audit_log",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Generates a detailed audit log for Worfgate",
      "capabilities": [
        "logging",
        "security auditing"
      ]
    },
    "when": {
      "useWhen": [
        "security incidents",
        "compliance requirements"
      ],
      "avoidWhen": [
        "high-performance systems",
        "real-time applications"
      ],
      "preconditions": [
        "Worfgate configuration",
        "logging enabled"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To provide a detailed record of Worfgate activities",
      "goalsServed": [
        "security",
        "compliance"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "worfgate_audit_log",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "log file"
    }
  },
  {
    "tool": "worfgate_audit_summary",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Provides a summary of Worfgate audit logs",
      "capabilities": [
        "log analysis",
        "summary generation"
      ]
    },
    "when": {
      "useWhen": [
        "security monitoring",
        "compliance reporting"
      ],
      "avoidWhen": [
        "detailed log analysis",
        "real-time systems"
      ],
      "preconditions": [
        "valid audit logs",
        "summary configuration"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To provide a concise overview of Worfgate audit logs",
      "goalsServed": [
        "security monitoring",
        "compliance reporting"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "worfgate_audit_summary",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "summary report"
    }
  },
  {
    "tool": "worfgate_credential_audit",
    "who": {
      "owner": "worf"
    },
    "what": {
      "summary": "Audits credentials for security vulnerabilities",
      "capabilities": [
        "credential scanning",
        "vulnerability detection"
      ]
    },
    "when": {
      "useWhen": [
        "security audit",
        "compliance check"
      ],
      "avoidWhen": [
        "production environment",
        "sensitive data exposure"
      ],
      "preconditions": [
        "admin access",
        "credential setup"
      ]
    },
    "where": {
      "scope": [
        "local-fs",
        "local-shell"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "local"
    },
    "why": {
      "rationale": "Identify potential security risks",
      "goalsServed": [
        "security",
        "compliance"
      ]
    },
    "how": {
      "invocation": "command-line",
      "annotations": {
        "title": "worfgate_credential_audit",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "audit report"
    }
  },
  {
    "tool": "worfgate_policy_status",
    "who": {
      "owner": "uhura"
    },
    "what": {
      "summary": "Reports the status of Worfgate policies",
      "capabilities": [
        "policy checking",
        "status reporting"
      ]
    },
    "when": {
      "useWhen": [
        "policy compliance",
        "security monitoring"
      ],
      "avoidWhen": [
        "policy changes",
        "high-priority tasks"
      ],
      "preconditions": [
        "Worfgate configuration",
        "policy definitions"
      ]
    },
    "where": {
      "scope": [
        "rag",
        "cloud-db"
      ],
      "surfaces": [
        "api",
        "mcp"
      ],
      "sideEffects": "none"
    },
    "why": {
      "rationale": "To provide the current status of Worfgate policies",
      "goalsServed": [
        "policy compliance",
        "security monitoring"
      ]
    },
    "how": {
      "invocation": "programmatic",
      "annotations": {
        "title": "worfgate_policy_status",
        "readOnlyHint": true,
        "destructiveHint": false,
        "idempotentHint": true,
        "openWorldHint": false
      },
      "output": "status report"
    }
  }
];

for (const t of GENERATED_THEORIES) {
  try { defineSkillTheory(t); } catch { /* skip invalid entry rather than crash registration */ }
}

export const GENERATED_TOOL_NAMES = GENERATED_THEORIES.map(t => t.tool);
