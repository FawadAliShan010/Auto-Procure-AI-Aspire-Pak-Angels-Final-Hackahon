/**
 * AutoProcure AI - Agentic Procurement System Type Definitions
 *
 * Part 2 & Part 3 Complete Agent Layer
 * Defines contracts, operational state, specialist agents, tools, action proposals,
 * approval state machine, audit trail, and execution context.
 */

import {
  PurchaseRequest,
  Gate1Result,
  Gate2Result,
  Gate3Result,
  Gate4Result,
  AIDecisionResult,
} from '../../types/procurement';

export type SpecialistAgentName =
  | 'PLANNING_AGENT'
  | 'INVENTORY_AGENT'
  | 'HISTORICAL_AGENT'
  | 'DECISION_AGENT'
  | 'RISK_VALIDATION_AGENT';

export type AgentStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ValidationStatus = 'PASS' | 'REVIEW_REQUIRED' | 'BLOCKED';

export type WorkflowStatus =
  | 'IDLE'
  | 'PLANNING'
  | 'EXECUTING'
  | 'VALIDATING'
  | 'CONSOLIDATED'
  | 'FAILED';

export interface AgentExecutionResult {
  agentName: SpecialistAgentName;
  status: AgentStatus;
  action: string;
  evidence: Record<string, any>;
  finding: string; // Concise, evidence-based summary (no private reasoning)
  riskLevel?: RiskLevel;
  recommendedNextStep?: string;
  timestamp: string;
}

export interface AgentPlanStep {
  stepIndex: number;
  specialist: SpecialistAgentName;
  objective: string;
  requiredTools: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  conditionReason?: string;
}

export type AgentEventType =
  | 'OBJECTIVE_IDENTIFIED'
  | 'PLAN_CREATED'
  | 'SPECIALIST_SELECTED'
  | 'TOOL_INVOKED'
  | 'EVIDENCE_RECEIVED'
  | 'NEXT_STEP_DECIDED'
  | 'RISK_VALIDATED'
  | 'EVIDENCE_CONSOLIDATED'
  | 'STEP_SKIPPED';

export interface AgentEvent {
  id: string;
  timestamp: string;
  type: AgentEventType;
  specialist?: SpecialistAgentName;
  message: string;
  details?: string;
}

export interface PreliminaryRecommendation {
  headline: string;
  recommendedAction: string;
  rationale: string[];
  transferRecommended: number;
  purchaseRecommended: number;
  estimatedSavings: number;
  policyClearance: 'CLEAR' | 'CAUTION' | 'RESTRICTED';
  riskLevel: RiskLevel;
  validationStatus: ValidationStatus;
}

export interface AgentRiskAssessment {
  riskLevel: RiskLevel;
  validationStatus: ValidationStatus;
  findings: string[];
  conflicts: string[];
  missingDataWarnings: string[];
}

// ============================================================================
// PART 3 ADDITIONS: ACTION PROPOSAL, APPROVAL STATE & AUDIT TRAIL
// ============================================================================

export type ActionProposalType =
  | 'NO_ACTION'
  | 'PROCEED_WITH_PURCHASE'
  | 'REDUCE_REQUEST'
  | 'HOLD_REQUEST'
  | 'INVESTIGATE_FURTHER'
  | 'USE_INTERNAL_TRANSFER'
  | 'EXPEDITE_EXISTING_REQUIREMENT'
  | 'PURCHASE_MANAGER_REVIEW';

export type AutonomyRiskCategory = 'LOW_RISK' | 'MEDIUM_RISK' | 'HIGH_RISK' | 'CRITICAL';

export interface ActionProposal {
  proposalId: string;
  proposalType: ActionProposalType;
  riskCategory: AutonomyRiskCategory;
  title: string;
  description: string;
  requiresHumanApproval: boolean;
  approvalGateway: 'NONE' | 'PURCHASE_MANAGER_REQUIRED' | 'BLOCKED_PENDING_REVIEW';
  transferQuantity: number;
  purchaseQuantity: number;
  financialCommitment: number;
  estimatedSavings: number;
  rationale: string[];
  justification: string;
  createdAt: string;
}

export type ApprovalState =
  | 'ANALYZING'
  | 'RECOMMENDATION_READY'
  | 'WAITING_FOR_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED_FOR_REVIEW'
  | 'BLOCKED'
  | 'APPROVED_FOR_EXECUTION'
  | 'COMPLETED';

export type HumanDecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED_FOR_REVIEW';

export interface HumanApprovalRecord {
  decision: HumanDecisionStatus;
  actorId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  comments?: string;
}

export type AuditEventType =
  | 'AGENT_SESSION_STARTED'
  | 'PLAN_CREATED'
  | 'INVENTORY_ANALYSIS_COMPLETED'
  | 'HISTORICAL_ANALYSIS_COMPLETED'
  | 'DECISION_ANALYSIS_COMPLETED'
  | 'RISK_VALIDATION_COMPLETED'
  | 'ACTION_PROPOSED'
  | 'HUMAN_APPROVAL_REQUESTED'
  | 'HUMAN_APPROVED'
  | 'HUMAN_REJECTED'
  | 'RETURNED_FOR_REVIEW'
  | 'WORKFLOW_COMPLETED';

export interface AgentAuditEvent {
  eventId: string;
  sessionId: string;
  requestId: string;
  timestamp: string;
  actorType: 'AGENT' | 'HUMAN_PURCHASE_MANAGER' | 'HUMAN_REQUISITIONER' | 'ADMIN' | 'SYSTEM';
  actorId: string;
  actorRole?: string;
  agentName?: SpecialistAgentName;
  action: string;
  status: string;
  riskLevel?: RiskLevel;
  summary: string;
  toolUsed?: string;
  approvalState: ApprovalState;
  details?: Record<string, any>;
}

export interface AgentExecutionContext {
  sessionId: string;
  requestId: string;
  userId: string;
  userRole: string;
  procurementObjective: string;
  procurementRequest: Partial<PurchaseRequest>;
  executionPlan: AgentPlanStep[];
  agentResults: Partial<Record<SpecialistAgentName, AgentExecutionResult>>;
  toolResults: Record<string, any>;
  existingEngineResults?: {
    gate1?: Gate1Result;
    gate2?: Gate2Result;
    gate3?: Gate3Result;
    gate4?: Gate4Result;
    decisionResult?: AIDecisionResult;
  };
  riskAssessment?: AgentRiskAssessment;
  preliminaryRecommendation?: PreliminaryRecommendation;
  actionProposal?: ActionProposal;
  approvalState: ApprovalState;
  humanDecision: HumanApprovalRecord;
  auditTrail: AgentAuditEvent[];
  workflowStatus: WorkflowStatus;
  events: AgentEvent[];
  createdAt: string;
  completedAt?: string;
}
