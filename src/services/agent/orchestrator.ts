/**
 * AutoProcure AI - Procurement Agent Orchestrator
 *
 * Part 2 & Part 3 Complete Orchestration Layer
 * Coordinates the full agentic procurement workflow:
 * GOAL → PLAN → SPECIALIST AGENTS → TOOLS → EVIDENCE → DECISION → RISK VALIDATION → ACTION PROPOSAL → APPROVAL GATEWAY
 *
 * Reuses existing application services without inventing fake procurement information.
 */

import { PurchaseRequest } from '../../types/procurement';
import {
  AgentExecutionContext,
  AgentEvent,
  AgentPlanStep,
  SpecialistAgentName,
  WorkflowStatus,
  ApprovalState,
} from './types';
import { runPlanningAgent } from './specialists/planningAgent';
import { runInventoryAgent } from './specialists/inventoryAgent';
import { runHistoricalAgent } from './specialists/historicalAgent';
import { runDecisionAgent } from './specialists/decisionAgent';
import { runRiskValidationAgent } from './specialists/riskValidationAgent';
import { normalizeAgentResult, synthesizePreliminaryRecommendation } from './agentNormalizer';
import { getProcurementRequest } from './agentTools';
import { generateActionProposal } from './actionProposalService';
import { auditTrailService } from './auditTrailService';

export interface OrchestratorRunOptions {
  requestId?: string;
  purchaseRequest?: Partial<PurchaseRequest>;
  userId?: string;
  userRole?: string;
  procurementObjective?: string;
}

export class ProcurementAgentOrchestrator {
  /**
   * Main entry point to coordinate the complete agentic investigation
   */
  public async executeSession(options: OrchestratorRunOptions): Promise<AgentExecutionContext> {
    const startTime = new Date().toISOString();
    const sessionId = `SESSION-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const req = getProcurementRequest(options.requestId, options.purchaseRequest);
    const requestId = req.id || `PR-${Date.now()}`;
    const itemTitle = (req.itemDescription || 'Requisition Item').trim();
    const quantity = Math.max(1, Number(req.quantity) || 1);
    const unitPrice = Math.max(1, Number(req.estimatedPrice) || 25);

    const objective =
      options.procurementObjective ||
      `Determine whether requested volume (${quantity} units of "${itemTitle}") should be externally procured, fulfilled via inter-warehouse transfer, or held for review.`;

    const events: AgentEvent[] = [];
    const addEvent = (
      type: AgentEvent['type'],
      message: string,
      specialist?: SpecialistAgentName,
      details?: string
    ) => {
      events.push({
        id: `EVT-${Date.now()}-${events.length + 1}`,
        timestamp: new Date().toISOString(),
        type,
        specialist,
        message,
        details,
      });
    };

    // 0. Audit Event: AGENT_SESSION_STARTED
    auditTrailService.recordEvent({
      sessionId,
      requestId,
      actorType: 'AGENT',
      actorId: options.userId || 'usr-system',
      actorRole: options.userRole || 'PURCHASE_MANAGER',
      action: 'AGENT_SESSION_STARTED',
      status: 'INITIATED',
      summary: `Started agentic investigation for requisition "${itemTitle}" (${quantity} units).`,
      approvalState: 'ANALYZING',
    });

    // 1. OBJECTIVE IDENTIFIED
    addEvent('OBJECTIVE_IDENTIFIED', `Procurement Objective: ${objective}`);

    // 2. PLANNING: Determine investigation plan
    addEvent('SPECIALIST_SELECTED', 'Selected PLANNING_AGENT to formulate dynamic investigation plan', 'PLANNING_AGENT');
    const { result: planResult, plan: dynamicPlan } = runPlanningAgent(req, objective);
    const normalizedPlanResult = normalizeAgentResult(planResult);

    addEvent('TOOL_INVOKED', 'Planning Agent evaluated commitment scale and warehouse scope', 'PLANNING_AGENT');
    addEvent('EVIDENCE_RECEIVED', `Formulated dynamic ${dynamicPlan.length}-stage investigation plan`, 'PLANNING_AGENT');
    addEvent('PLAN_CREATED', `Plan created with ${dynamicPlan.length} milestones`, 'PLANNING_AGENT');

    auditTrailService.recordEvent({
      sessionId,
      requestId,
      actorType: 'AGENT',
      actorId: 'PLANNING_AGENT',
      agentName: 'PLANNING_AGENT',
      action: 'PLAN_CREATED',
      status: 'COMPLETED',
      summary: `Dynamic ${dynamicPlan.length}-milestone plan established: ${dynamicPlan.map((p) => p.specialist).join(' → ')}.`,
      toolUsed: 'runPlanningAgent',
      approvalState: 'ANALYZING',
    });

    const agentResults: AgentExecutionContext['agentResults'] = {
      PLANNING_AGENT: normalizedPlanResult,
    };
    const toolResults: Record<string, any> = {
      dynamicPlan,
    };

    // 3. STEP 1: INVENTORY AGENT
    const invStep = dynamicPlan.find((s) => s.specialist === 'INVENTORY_AGENT');
    if (invStep) invStep.status = 'IN_PROGRESS';

    addEvent('SPECIALIST_SELECTED', 'Selected INVENTORY_AGENT to audit local depot and sister warehouse stock', 'INVENTORY_AGENT');
    addEvent('TOOL_INVOKED', 'Invoking getInventoryEvidence tool (catalog and warehouse matrix)', 'INVENTORY_AGENT');

    const { result: invResult, evidence: invEvidence } = runInventoryAgent(req);
    const normalizedInvResult = normalizeAgentResult(invResult);
    agentResults.INVENTORY_AGENT = normalizedInvResult;
    toolResults.inventoryEvidence = invEvidence;
    if (invStep) invStep.status = 'COMPLETED';

    addEvent('EVIDENCE_RECEIVED', `Inventory Agent observed: Local=${invEvidence.localWarehouseStock}, Sister Usable=${invEvidence.excessOrIdleStock}, Transferrable=${invEvidence.transferrableQuantity}`, 'INVENTORY_AGENT');

    auditTrailService.recordEvent({
      sessionId,
      requestId,
      actorType: 'AGENT',
      actorId: 'INVENTORY_AGENT',
      agentName: 'INVENTORY_AGENT',
      action: 'INVENTORY_ANALYSIS_COMPLETED',
      status: 'COMPLETED',
      riskLevel: normalizedInvResult.riskLevel,
      summary: `Inventory analysis: ${invEvidence.localWarehouseStock} units local, ${invEvidence.excessOrIdleStock} units sister idle/excess, ${invEvidence.transferrableQuantity} units transferrable.`,
      toolUsed: 'getInventoryEvidence',
      approvalState: 'ANALYZING',
    });

    // 4. OBSERVE & DECIDE NEXT STEP (Conditional Routing)
    if (invEvidence.isSufficientLocally || invEvidence.transferrableQuantity >= quantity) {
      addEvent('NEXT_STEP_DECIDED', 'Sufficient stock identified. Proceeding to HISTORICAL_AGENT to audit run-rate before committing transfer allocation.');
    } else {
      addEvent('NEXT_STEP_DECIDED', `Deficit of ${invEvidence.deficitQuantity} units detected. Escalating to HISTORICAL_AGENT and DECISION_AGENT to evaluate external purchase requirements.`);
    }

    // 5. STEP 2: HISTORICAL ANALYSIS AGENT
    const histStep = dynamicPlan.find((s) => s.specialist === 'HISTORICAL_AGENT');
    if (histStep) histStep.status = 'IN_PROGRESS';

    addEvent('SPECIALIST_SELECTED', 'Selected HISTORICAL_AGENT to evaluate consumption run-rates and velocity', 'HISTORICAL_AGENT');
    addEvent('TOOL_INVOKED', 'Invoking getHistoricalAnalysis tool (24-month horizon & consumption velocity)', 'HISTORICAL_AGENT');

    const { result: histResult, evidence: histEvidence } = runHistoricalAgent(req);
    const normalizedHistResult = normalizeAgentResult(histResult);
    agentResults.HISTORICAL_AGENT = normalizedHistResult;
    toolResults.historicalEvidence = histEvidence;
    if (histStep) histStep.status = 'COMPLETED';

    addEvent('EVIDENCE_RECEIVED', `Historical Agent observed: Baseline=${histEvidence.avgMonthlyUsage}/mo, Supply Horizon=${histEvidence.monthsOfSupply} months, Status=${histEvidence.recommendationStatus}`, 'HISTORICAL_AGENT');

    auditTrailService.recordEvent({
      sessionId,
      requestId,
      actorType: 'AGENT',
      actorId: 'HISTORICAL_AGENT',
      agentName: 'HISTORICAL_AGENT',
      action: 'HISTORICAL_ANALYSIS_COMPLETED',
      status: 'COMPLETED',
      riskLevel: normalizedHistResult.riskLevel,
      summary: `Historical consumption: ${histEvidence.avgMonthlyUsage}/mo baseline, ${histEvidence.monthsOfSupply} months supply coverage.`,
      toolUsed: 'getHistoricalAnalysis',
      approvalState: 'ANALYZING',
    });

    // 6. STEP 3: PROCUREMENT DECISION AGENT (Deterministic Gates)
    const decStep = dynamicPlan.find((s) => s.specialist === 'DECISION_AGENT');
    if (decStep) decStep.status = 'IN_PROGRESS';

    addEvent('SPECIALIST_SELECTED', 'Selected DECISION_AGENT to execute authoritative 4-gate procurement evaluation', 'DECISION_AGENT');
    addEvent('TOOL_INVOKED', 'Invoking runExistingProcurementEngine & runExistingDecisionEngine', 'DECISION_AGENT');

    const { result: decResult, engineEvidence } = runDecisionAgent(req);
    const normalizedDecResult = normalizeAgentResult(decResult);
    agentResults.DECISION_AGENT = normalizedDecResult;
    toolResults.engineEvidence = engineEvidence;
    if (decStep) decStep.status = 'COMPLETED';

    addEvent('EVIDENCE_RECEIVED', `Decision Agent synthesized: ${engineEvidence.decisionResult.decision} - ${engineEvidence.decisionResult.headline}`, 'DECISION_AGENT');

    auditTrailService.recordEvent({
      sessionId,
      requestId,
      actorType: 'AGENT',
      actorId: 'DECISION_AGENT',
      agentName: 'DECISION_AGENT',
      action: 'DECISION_ANALYSIS_COMPLETED',
      status: 'COMPLETED',
      riskLevel: normalizedDecResult.riskLevel,
      summary: `Authoritative decision synthesized: ${engineEvidence.decisionResult.decision}. ${engineEvidence.decisionResult.headline}`,
      toolUsed: 'runExistingProcurementEngine',
      approvalState: 'ANALYZING',
    });

    // 7. STEP 4: RISK / POLICY VALIDATION AGENT
    const riskStep = dynamicPlan.find((s) => s.specialist === 'RISK_VALIDATION_AGENT');
    if (riskStep) riskStep.status = 'IN_PROGRESS';

    addEvent('SPECIALIST_SELECTED', 'Selected RISK_VALIDATION_AGENT to cross-examine evidence and detect conflicts', 'RISK_VALIDATION_AGENT');
    addEvent('TOOL_INVOKED', 'Invoking validateProcurementEvidence & getOpenPOEvidence', 'RISK_VALIDATION_AGENT');

    const { result: riskResult, assessment: riskAssessment } = runRiskValidationAgent(req, {
      inventoryEvidence: invEvidence,
      historicalEvidence: histEvidence,
      engineEvidence,
    });
    const normalizedRiskResult = normalizeAgentResult(riskResult);
    agentResults.RISK_VALIDATION_AGENT = normalizedRiskResult;
    toolResults.riskAssessment = riskAssessment;
    if (riskStep) riskStep.status = 'COMPLETED';

    addEvent('RISK_VALIDATED', `Risk Agent audit: Status=${riskAssessment.validationStatus}, RiskLevel=${riskAssessment.riskLevel}, ${riskAssessment.conflicts.length} conflict(s)`, 'RISK_VALIDATION_AGENT');

    auditTrailService.recordEvent({
      sessionId,
      requestId,
      actorType: 'AGENT',
      actorId: 'RISK_VALIDATION_AGENT',
      agentName: 'RISK_VALIDATION_AGENT',
      action: 'RISK_VALIDATION_COMPLETED',
      status: 'COMPLETED',
      riskLevel: riskAssessment.riskLevel,
      summary: `Risk audit completed: ValidationStatus=${riskAssessment.validationStatus}, Conflicts=${riskAssessment.conflicts.length}.`,
      toolUsed: 'validateProcurementEvidence',
      approvalState: 'ANALYZING',
    });

    // 8. CONSOLIDATE EVIDENCE & SYNTHESIZE PRELIMINARY RECOMMENDATION
    addEvent('EVIDENCE_CONSOLIDATED', 'Consolidated evidence across all 5 specialist agents into preliminary recommendation');

    const preliminaryRec = synthesizePreliminaryRecommendation({
      itemTitle,
      quantity,
      decision: engineEvidence.decisionResult.decision,
      headline: engineEvidence.decisionResult.headline,
      transferQuantity: engineEvidence.decisionResult.transferQuantity,
      purchaseQuantity: engineEvidence.decisionResult.purchaseQuantity,
      estimatedSavings: engineEvidence.decisionResult.estimatedSavings,
      riskLevel: riskAssessment.riskLevel,
      validationStatus: riskAssessment.validationStatus,
      riskFindings: riskAssessment.findings,
      conflicts: riskAssessment.conflicts,
    });

    // 9. PART 3: ACTION PROPOSAL GENERATION
    const actionProposal = generateActionProposal({
      requestId,
      itemTitle,
      quantity,
      unitPrice,
      department: req.department || 'Operations',
      decisionResult: engineEvidence.decisionResult,
      riskLevel: riskAssessment.riskLevel,
      validationStatus: riskAssessment.validationStatus,
      agentResults,
      conflicts: riskAssessment.conflicts,
    });

    addEvent('EVIDENCE_CONSOLIDATED', `Generated Action Proposal: ${actionProposal.title} (${actionProposal.riskCategory})`);

    auditTrailService.recordEvent({
      sessionId,
      requestId,
      actorType: 'AGENT',
      actorId: 'ORCHESTRATOR',
      action: 'ACTION_PROPOSED',
      status: 'PROPOSAL_GENERATED',
      riskLevel: riskAssessment.riskLevel,
      summary: `Action proposal generated: [${actionProposal.proposalType}] ${actionProposal.title}. Risk: ${actionProposal.riskCategory}. Requires Human Approval: ${actionProposal.requiresHumanApproval}.`,
      approvalState: 'RECOMMENDATION_READY',
    });

    // 10. APPROVAL GATEWAY ROUTING
    let initialApprovalState: ApprovalState = 'WAITING_FOR_APPROVAL';
    if (riskAssessment.validationStatus === 'BLOCKED' || actionProposal.riskCategory === 'CRITICAL') {
      initialApprovalState = 'BLOCKED';
      addEvent('STEP_SKIPPED', 'Policy blocked due to critical risk or validation anomalies. Requisition placed on administrative hold.');
    } else {
      addEvent('NEXT_STEP_DECIDED', 'Action proposal routed to Purchase Manager Approval Gateway for authorization.');
    }

    auditTrailService.recordEvent({
      sessionId,
      requestId,
      actorType: 'AGENT',
      actorId: 'ORCHESTRATOR',
      action: 'HUMAN_APPROVAL_REQUESTED',
      status: 'PENDING_REVIEW',
      riskLevel: riskAssessment.riskLevel,
      summary: `Routed to Purchase Manager gateway. Waiting for authorization.`,
      approvalState: initialApprovalState,
    });

    const completedAt = new Date().toISOString();
    const finalWorkflowStatus: WorkflowStatus = 'CONSOLIDATED';

    const context: AgentExecutionContext = {
      sessionId,
      requestId,
      userId: options.userId || 'usr-system',
      userRole: options.userRole || 'PURCHASE_MANAGER',
      procurementObjective: objective,
      procurementRequest: req,
      executionPlan: dynamicPlan,
      agentResults,
      toolResults,
      existingEngineResults: {
        gate1: engineEvidence.gate1,
        gate2: engineEvidence.gate2,
        gate3: engineEvidence.gate3,
        gate4: engineEvidence.gate4,
        decisionResult: engineEvidence.decisionResult,
      },
      riskAssessment,
      preliminaryRecommendation: preliminaryRec,
      actionProposal,
      approvalState: initialApprovalState,
      humanDecision: {
        decision: 'PENDING',
        actorId: '',
        actorName: '',
        actorRole: '',
        timestamp: '',
      },
      auditTrail: auditTrailService.getSessionEvents(sessionId),
      workflowStatus: finalWorkflowStatus,
      events,
      createdAt: startTime,
      completedAt,
    };

    return context;
  }
}

export const procurementAgentOrchestrator = new ProcurementAgentOrchestrator();
