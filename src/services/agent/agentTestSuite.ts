/**
 * AutoProcure AI - Agentic Procurement Isolated Test Suite
 *
 * Part 2 & Part 3 Complete Verification Suite
 * Validates 27 automated assertions across the entire agentic architecture:
 * Part 2 Tests (AGENT-TEST-01 to 13)
 * Part 3 Tests (AGENTIC-14 to 27)
 */

import { procurementAgentOrchestrator } from './orchestrator';
import { runPlanningAgent } from './specialists/planningAgent';
import { runInventoryAgent } from './specialists/inventoryAgent';
import { runHistoricalAgent } from './specialists/historicalAgent';
import { runDecisionAgent } from './specialists/decisionAgent';
import { runRiskValidationAgent } from './specialists/riskValidationAgent';
import {
  getInventoryEvidence,
  getHistoricalAnalysis,
  runExistingProcurementEngine,
  runExistingDecisionEngine,
  getProcurementRequest,
  getOpenPOEvidence,
} from './agentTools';
import { normalizeAgentResult, synthesizePreliminaryRecommendation } from './agentNormalizer';
import { generateActionProposal } from './actionProposalService';
import {
  canTransition,
  processHumanDecision,
  validateApprovalSafety,
} from './approvalStateMachine';
import { auditTrailService } from './auditTrailService';
import { agentSessionService } from './agentSessionService';
import { PurchaseRequest } from '../../types/procurement';

export interface AgentTestCaseResult {
  id: string;
  name: string;
  category: 'ORCHESTRATION' | 'SPECIALISTS' | 'TOOLS' | 'INTEGRATION' | 'RESILIENCE' | 'APPROVAL_GATEWAY' | 'AUDIT_TRAIL';
  passed: boolean;
  expected: string;
  actual: string;
  details?: Record<string, any>;
}

export interface AgentTestSuiteSummary {
  totalTests: number;
  passedCount: number;
  failedCount: number;
  allPassed: boolean;
  timestamp: string;
  results: AgentTestCaseResult[];
}

export async function runAgentTestSuite(): Promise<AgentTestSuiteSummary> {
  const results: AgentTestCaseResult[] = [];

  // ==========================================================================
  // TEST 1: Agent orchestrator initialization
  // ==========================================================================
  try {
    const isInstantiated = Boolean(procurementAgentOrchestrator && typeof procurementAgentOrchestrator.executeSession === 'function');
    results.push({
      id: 'AGENT-TEST-01',
      name: 'Agent Orchestrator Initialization',
      category: 'ORCHESTRATION',
      passed: isInstantiated,
      expected: 'ProcurementAgentOrchestrator instantiated with executeSession function',
      actual: isInstantiated ? 'Instantiated with valid execution interface' : 'Initialization failed',
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-01',
      name: 'Agent Orchestrator Initialization',
      category: 'ORCHESTRATION',
      passed: false,
      expected: 'Clean initialization',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 2: Planning
  // ==========================================================================
  try {
    const mockPR: Partial<PurchaseRequest> = {
      itemDescription: 'Safety Helmet',
      quantity: 50,
      department: 'Maintenance',
      estimatedPrice: 25,
    };
    const { result, plan } = runPlanningAgent(mockPR, 'Determine procurement path');
    const isValidPlan = plan.length >= 4 && result.agentName === 'PLANNING_AGENT' && plan[0].specialist === 'INVENTORY_AGENT';
    results.push({
      id: 'AGENT-TEST-02',
      name: 'Planning Agent Dynamic Plan Generation',
      category: 'SPECIALISTS',
      passed: isValidPlan,
      expected: 'Dynamic plan containing at least 4 milestones with prioritized inventory check',
      actual: `Generated ${plan.length} milestones, first specialist: ${plan[0]?.specialist}`,
      details: { planMilestones: plan.map((p) => p.specialist) },
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-02',
      name: 'Planning Agent Dynamic Plan Generation',
      category: 'SPECIALISTS',
      passed: false,
      expected: 'Dynamic plan creation',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 3: Specialist-agent selection
  // ==========================================================================
  try {
    const mockPR: Partial<PurchaseRequest> = { itemDescription: 'Laptop Charger 65W', quantity: 5 };
    const { plan } = runPlanningAgent(mockPR, 'Objective');
    const specialists = plan.map((p) => p.specialist);
    const hasRequiredSpecialists =
      specialists.includes('INVENTORY_AGENT') &&
      specialists.includes('HISTORICAL_AGENT') &&
      specialists.includes('DECISION_AGENT') &&
      specialists.includes('RISK_VALIDATION_AGENT');
    results.push({
      id: 'AGENT-TEST-03',
      name: 'Specialist-Agent Selection Verification',
      category: 'SPECIALISTS',
      passed: hasRequiredSpecialists,
      expected: 'Inventory, Historical, Decision, and Risk agents selected in plan',
      actual: `Selected: ${specialists.join(', ')}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-03',
      name: 'Specialist-Agent Selection Verification',
      category: 'SPECIALISTS',
      passed: false,
      expected: 'Selection of specialist agents',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 4: Inventory tool execution
  // ==========================================================================
  try {
    const inv = getInventoryEvidence('Safety Helmet', '#HS-9912', 50);
    const passed = typeof inv.localWarehouseStock === 'number' && inv.excessOrIdleStock > 0 && Array.isArray(inv.warehouses);
    results.push({
      id: 'AGENT-TEST-04',
      name: 'Inventory Tool Execution (Warehouse & Transfer Audit)',
      category: 'TOOLS',
      passed,
      expected: 'Accurate catalog lookup with local and sister warehouse quantities',
      actual: `Local stock: ${inv.localWarehouseStock}, Idle/Sister: ${inv.excessOrIdleStock}, Warehouses: ${inv.warehouses.length}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-04',
      name: 'Inventory Tool Execution',
      category: 'TOOLS',
      passed: false,
      expected: 'Inventory tool execution',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 5: Historical Analysis tool execution
  // ==========================================================================
  try {
    const hist = getHistoricalAnalysis({ itemDescription: '3-inch carbon-steel pipe' }, 30);
    const passed = hist.avgMonthlyUsage > 0 && hist.annualizedConsumption > 0 && typeof hist.monthsOfSupply === 'number';
    results.push({
      id: 'AGENT-TEST-05',
      name: 'Historical Analysis Tool Execution (24-Month Velocity)',
      category: 'TOOLS',
      passed,
      expected: 'Baseline consumption velocity and months-of-supply calculated',
      actual: `Baseline: ${hist.avgMonthlyUsage}/mo, Annualized: ${hist.annualizedConsumption}/yr, Months of supply: ${hist.monthsOfSupply}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-05',
      name: 'Historical Analysis Tool Execution',
      category: 'TOOLS',
      passed: false,
      expected: 'Historical engine calculation',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 6: Existing procurement engine integration
  // ==========================================================================
  try {
    const eng = runExistingProcurementEngine({
      itemDescription: 'Laptop Charger 65W',
      quantity: 10,
      department: 'IT / Technology',
      estimatedPrice: 25,
    });
    const passed = Boolean(eng.gate1 && eng.gate2 && eng.gate3 && eng.gate4 && eng.decisionResult);
    results.push({
      id: 'AGENT-TEST-06',
      name: 'Authoritative Procurement Engine (4 Gates) Integration',
      category: 'INTEGRATION',
      passed,
      expected: 'Gates 1, 2, 3, 4 and decisionResult fully populated from procurementEngine.ts',
      actual: `Gates verified. Standardized: ${eng.gate1.standardized}, Gate2 Status: ${eng.gate2.status}, Decision: ${eng.decisionResult.decision}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-06',
      name: 'Authoritative Procurement Engine Integration',
      category: 'INTEGRATION',
      passed: false,
      expected: 'Engine execution',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 7: Existing decision engine integration
  // ==========================================================================
  try {
    const dec = runExistingDecisionEngine({
      standardizedItem: 'Laptop Charger 65W USB-C Type',
      itemCode: 'IT-CHR-065W',
      itemMatchingConfidence: 0.98,
      quantity: 10,
      unitPrice: 25,
      department: 'IT / Technology',
      availableBudget: 150,
      otherSiteInventory: [{ siteId: 'WH-C', siteName: 'Depot C', quantity: 10, status: 'excess/project-canceled' }],
      historicalUsage: [{ month: 'Aug', usage: 2 }],
      localInventory: 5,
    });
    const validDec = Boolean(dec && dec.decision && dec.calculations && typeof dec.calculations.estimatedSavings === 'number');
    results.push({
      id: 'AGENT-TEST-07',
      name: 'Authoritative Decision Engine Integration',
      category: 'INTEGRATION',
      passed: validDec,
      expected: 'evaluateProcurementDecision outputs decision, headline, and calculations',
      actual: `Decision: ${dec.decision}, Savings: $${dec.calculations.estimatedSavings}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-07',
      name: 'Authoritative Decision Engine Integration',
      category: 'INTEGRATION',
      passed: false,
      expected: 'Decision engine execution',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 8: Conditional routing
  // ==========================================================================
  try {
    const highVolumePR = { itemDescription: 'Safety Helmet', quantity: 350 };
    const { result: invA } = runInventoryAgent(highVolumePR);
    const { result: histA } = runHistoricalAgent(highVolumePR);

    const singleUnitPR = { itemDescription: 'Laptop Charger 65W', quantity: 1 };
    const { result: invB } = runInventoryAgent(singleUnitPR);
    const { result: histB } = runHistoricalAgent(singleUnitPR);

    const isDifferentFindings = invA.finding !== invB.finding && histA.finding !== histB.finding;
    results.push({
      id: 'AGENT-TEST-08',
      name: 'Conditional Routing and Contextual Evaluation',
      category: 'ORCHESTRATION',
      passed: isDifferentFindings,
      expected: 'Distinct agent findings generated dynamically based on inventory state and volume',
      actual: isDifferentFindings ? 'Conditional pathways correctly generated disparate specialist findings' : 'Identical output across disparate scenarios',
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-08',
      name: 'Conditional Routing and Contextual Evaluation',
      category: 'ORCHESTRATION',
      passed: false,
      expected: 'Dynamic evaluation',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 9: Risk validation
  // ==========================================================================
  try {
    const conflictPR: Partial<PurchaseRequest> = {
      itemDescription: 'Safety Helmet',
      quantity: 50,
      department: 'Maintenance',
      estimatedPrice: 25,
    };
    const { assessment } = runRiskValidationAgent(conflictPR, {
      inventoryEvidence: getInventoryEvidence('Safety Helmet', undefined, 50),
    });
    const detectedConflict = assessment.conflicts.length > 0 || assessment.validationStatus !== 'PASS';
    results.push({
      id: 'AGENT-TEST-09',
      name: 'Risk / Policy Validation Agent Conflict Detection',
      category: 'SPECIALISTS',
      passed: detectedConflict,
      expected: 'Identifies avoidable external purchase when sister stock is available',
      actual: `Status: ${assessment.validationStatus}, Risk: ${assessment.riskLevel}, Conflicts: ${assessment.conflicts.length}`,
      details: { conflicts: assessment.conflicts },
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-09',
      name: 'Risk / Policy Validation Agent Conflict Detection',
      category: 'SPECIALISTS',
      passed: false,
      expected: 'Conflict detection',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 10: Missing-data handling
  // ==========================================================================
  try {
    const incompletePR: Partial<PurchaseRequest> = {
      itemDescription: '',
      quantity: 0,
    };
    const { assessment } = runRiskValidationAgent(incompletePR, {});
    const handledGracefully = assessment.missingDataWarnings.length > 0 && assessment.validationStatus === 'BLOCKED';
    results.push({
      id: 'AGENT-TEST-10',
      name: 'Missing-Data Handling & Graceful Degradation',
      category: 'RESILIENCE',
      passed: handledGracefully,
      expected: 'Flags missing item description with BLOCKED status without throwing exception',
      actual: `Status: ${assessment.validationStatus}, Warnings: ${assessment.missingDataWarnings.join('; ')}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-10',
      name: 'Missing-Data Handling',
      category: 'RESILIENCE',
      passed: false,
      expected: 'Safe error capture',
      actual: `Threw error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 11: Tool failure handling
  // ==========================================================================
  try {
    const corruptReq = getProcurementRequest(undefined, { itemDescription: undefined as any, quantity: -99 });
    const invEvidence = getInventoryEvidence('', undefined, -99);
    const passed = Boolean(corruptReq && invEvidence && invEvidence.localWarehouseStock >= 0);
    results.push({
      id: 'AGENT-TEST-11',
      name: 'Tool Failure Handling & Defensive Boundaries',
      category: 'RESILIENCE',
      passed,
      expected: 'Safe fallback defaults applied on malformed inputs without system crash',
      actual: `Handled gracefully. Local stock: ${invEvidence.localWarehouseStock}, Usable: ${invEvidence.excessOrIdleStock}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-11',
      name: 'Tool Failure Handling',
      category: 'RESILIENCE',
      passed: false,
      expected: 'Graceful recovery',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 12: Agent result normalization
  // ==========================================================================
  try {
    const rawPartial = {
      agentName: 'HISTORICAL_AGENT' as const,
      finding: '  Raw whitespace finding.  ',
    };
    const normalized = normalizeAgentResult(rawPartial);
    const passed =
      normalized.agentName === 'HISTORICAL_AGENT' &&
      normalized.status === 'COMPLETED' &&
      normalized.finding === 'Raw whitespace finding.' &&
      normalized.riskLevel === 'LOW' &&
      Boolean(normalized.timestamp);
    results.push({
      id: 'AGENT-TEST-12',
      name: 'Agent Result Normalization Contract Enforcement',
      category: 'INTEGRATION',
      passed,
      expected: 'Guarantees contract shape, default timestamps, and sanitizes whitespace',
      actual: `Normalized contract verified: Status=${normalized.status}, Risk=${normalized.riskLevel}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-12',
      name: 'Agent Result Normalization Contract Enforcement',
      category: 'INTEGRATION',
      passed: false,
      expected: 'Contract normalization',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 13: Complete agentic session
  // ==========================================================================
  try {
    const session = await procurementAgentOrchestrator.executeSession({
      purchaseRequest: {
        itemDescription: 'Hydraulic Seal Kit',
        quantity: 65,
        department: 'Maintenance',
        estimatedPrice: 75,
      },
    });

    const isComplete =
      Boolean(session.sessionId) &&
      session.workflowStatus === 'CONSOLIDATED' &&
      session.events.length >= 8 &&
      Boolean(session.agentResults.PLANNING_AGENT) &&
      Boolean(session.agentResults.INVENTORY_AGENT) &&
      Boolean(session.agentResults.HISTORICAL_AGENT) &&
      Boolean(session.agentResults.DECISION_AGENT) &&
      Boolean(session.agentResults.RISK_VALIDATION_AGENT) &&
      Boolean(session.preliminaryRecommendation);

    results.push({
      id: 'AGENT-TEST-13',
      name: 'Complete End-to-End Agentic Session Workflow',
      category: 'ORCHESTRATION',
      passed: isComplete,
      expected: 'Goal → Plan → Specialists → Tools → Observe → Risk → Recommendation lifecycle executed',
      actual: `Session ${session.sessionId}: Status=${session.workflowStatus}, Events=${session.events.length}, Recommendation: ${session.preliminaryRecommendation?.recommendedAction}`,
      details: {
        eventsCount: session.events.length,
        recommendation: session.preliminaryRecommendation?.headline,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'AGENT-TEST-13',
      name: 'Complete End-to-End Agentic Session Workflow',
      category: 'ORCHESTRATION',
      passed: false,
      expected: 'Complete session execution',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 14: Action proposal generation
  // ==========================================================================
  try {
    const proposal = generateActionProposal({
      requestId: 'PR-TEST-14',
      itemTitle: '3-inch carbon-steel pipe',
      quantity: 50,
      unitPrice: 145,
      department: 'Operations',
      decisionResult: {
        decision: 'REDUCE',
        headline: 'Volume reduced and internal transfer prioritized',
        reasoning: ['Transfer 45 units from WH-B'],
        recommendedActions: [],
        estimatedSavings: 6525,
        purchaseQuantity: 5,
        transferQuantity: 45,
      },
      riskLevel: 'MEDIUM',
      validationStatus: 'PASS',
      agentResults: {},
      conflicts: [],
    });

    const isValid = Boolean(
      proposal.proposalId &&
      (proposal.proposalType === 'REDUCE_REQUEST' || proposal.proposalType === 'USE_INTERNAL_TRANSFER') &&
      proposal.transferQuantity === 45 &&
      proposal.purchaseQuantity === 5 &&
      proposal.estimatedSavings === 6525 &&
      proposal.requiresHumanApproval === true
    );

    results.push({
      id: 'AGENTIC-14',
      name: 'Action Proposal Generation Alignment',
      category: 'APPROVAL_GATEWAY',
      passed: isValid,
      expected: 'Generates proposal respecting deterministic transfer and purchase quantities',
      actual: `Generated [${proposal.proposalType}] ${proposal.title}. Savings: $${proposal.estimatedSavings}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-14',
      name: 'Action Proposal Generation Alignment',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'Valid proposal generation',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 15: Risk classification
  // ==========================================================================
  try {
    const propCrit = generateActionProposal({
      requestId: 'PR-15-CRIT',
      itemTitle: 'Critical Item',
      quantity: 10,
      unitPrice: 100,
      department: 'Operations',
      riskLevel: 'CRITICAL',
      validationStatus: 'BLOCKED',
      agentResults: {},
      conflicts: ['Critical policy breach'],
    });

    const propHigh = generateActionProposal({
      requestId: 'PR-15-HIGH',
      itemTitle: 'High Value Item',
      quantity: 50,
      unitPrice: 200,
      department: 'Operations',
      riskLevel: 'HIGH',
      validationStatus: 'REVIEW_REQUIRED',
      agentResults: {},
      conflicts: [],
    });

    const passed = propCrit.riskCategory === 'CRITICAL' && propHigh.riskCategory === 'HIGH_RISK';
    results.push({
      id: 'AGENTIC-15',
      name: 'Controlled Autonomy Risk Classification',
      category: 'APPROVAL_GATEWAY',
      passed,
      expected: 'Maps risk levels correctly into CRITICAL and HIGH_RISK categories',
      actual: `Mapped: Critical -> ${propCrit.riskCategory}, High -> ${propHigh.riskCategory}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-15',
      name: 'Controlled Autonomy Risk Classification',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'Risk classification',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 16: Low-risk workflow
  // ==========================================================================
  try {
    const propLow = generateActionProposal({
      requestId: 'PR-16-LOW',
      itemTitle: 'Standard Office Consumable',
      quantity: 2,
      unitPrice: 15,
      department: 'HR',
      decisionResult: {
        decision: 'APPROVE',
        headline: 'Compliant request',
        reasoning: [],
        recommendedActions: [],
        estimatedSavings: 0,
        purchaseQuantity: 2,
        transferQuantity: 0,
      },
      riskLevel: 'LOW',
      validationStatus: 'PASS',
      agentResults: {},
      conflicts: [],
    });

    const isLow = propLow.riskCategory === 'LOW_RISK' && propLow.financialCommitment <= 1000;
    results.push({
      id: 'AGENTIC-16',
      name: 'Low-Risk Workflow Routing',
      category: 'APPROVAL_GATEWAY',
      passed: isLow,
      expected: 'Low-value items classify as LOW_RISK with standard review gateway',
      actual: `Classified as ${propLow.riskCategory}, commitment: $${propLow.financialCommitment}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-16',
      name: 'Low-Risk Workflow Routing',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'Low-risk classification',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 17: Medium-risk workflow
  // ==========================================================================
  try {
    const propMed = generateActionProposal({
      requestId: 'PR-17-MED',
      itemTitle: 'Laptop Charger Replacement',
      quantity: 10,
      unitPrice: 25,
      department: 'IT / Technology',
      decisionResult: {
        decision: 'REDUCE',
        headline: 'Requested quantity exceeds quarterly allocation',
        reasoning: [],
        recommendedActions: [],
        estimatedSavings: 125,
        purchaseQuantity: 5,
        transferQuantity: 5,
      },
      riskLevel: 'MEDIUM',
      validationStatus: 'REVIEW_REQUIRED',
      agentResults: {},
      conflicts: ['Budget warning'],
    });

    const isMed = propMed.riskCategory === 'MEDIUM_RISK' && propMed.requiresHumanApproval === true;
    results.push({
      id: 'AGENTIC-17',
      name: 'Medium-Risk Workflow Confirmation Requirement',
      category: 'APPROVAL_GATEWAY',
      passed: isMed,
      expected: 'Requisitions with reduction or review warnings classify as MEDIUM_RISK',
      actual: `Category: ${propMed.riskCategory}, Requires Approval: ${propMed.requiresHumanApproval}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-17',
      name: 'Medium-Risk Workflow Confirmation Requirement',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'Medium-risk classification',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 18: High-risk human approval routing
  // ==========================================================================
  try {
    const propHigh = generateActionProposal({
      requestId: 'PR-18-HIGH',
      itemTitle: 'Turbine Replacement Flange',
      quantity: 100,
      unitPrice: 450,
      department: 'Maintenance',
      decisionResult: {
        decision: 'HOLD',
        headline: 'Commitment exceeds department quarterly ceiling by $35,000',
        reasoning: [],
        recommendedActions: [],
        estimatedSavings: 0,
        purchaseQuantity: 100,
        transferQuantity: 0,
      },
      riskLevel: 'HIGH',
      validationStatus: 'REVIEW_REQUIRED',
      agentResults: {},
      conflicts: ['Budget variance > 100%'],
    });

    const isHigh = propHigh.riskCategory === 'HIGH_RISK' && propHigh.approvalGateway === 'PURCHASE_MANAGER_REQUIRED';
    results.push({
      id: 'AGENTIC-18',
      name: 'High-Risk Purchase Manager Approval Routing',
      category: 'APPROVAL_GATEWAY',
      passed: isHigh,
      expected: 'High-spend/HOLD requests strictly route to PURCHASE_MANAGER_REQUIRED',
      actual: `Category: ${propHigh.riskCategory}, Gateway: ${propHigh.approvalGateway}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-18',
      name: 'High-Risk Purchase Manager Approval Routing',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'High-risk routing',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 19: Critical blocking
  // ==========================================================================
  try {
    const session = await procurementAgentOrchestrator.executeSession({
      purchaseRequest: {
        itemDescription: '', // Missing item triggers BLOCKED validation
        quantity: 0,
      },
    });

    const isBlocked = session.approvalState === 'BLOCKED' && session.riskAssessment?.validationStatus === 'BLOCKED';
    results.push({
      id: 'AGENTIC-19',
      name: 'Critical Risk Autonomous Workflow Blocking',
      category: 'APPROVAL_GATEWAY',
      passed: isBlocked,
      expected: 'Critical policy violations immediately block the approval state',
      actual: `Approval state: ${session.approvalState}, Validation: ${session.riskAssessment?.validationStatus}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-19',
      name: 'Critical Risk Autonomous Workflow Blocking',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'Workflow blocking',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 20: Purchase Manager authorization
  // ==========================================================================
  try {
    const session = await procurementAgentOrchestrator.executeSession({
      purchaseRequest: {
        itemDescription: 'Safety Helmet',
        quantity: 50,
        department: 'Operations',
        estimatedPrice: 25,
      },
    });

    const decisionResult = processHumanDecision(
      session,
      'APPROVED',
      { id: 'usr-101', name: 'Fawad Ali Shan', role: 'PURCHASE_MANAGER' },
      'Authorized under Q3 safety refresh'
    );

    const isAuthorized =
      decisionResult.success &&
      decisionResult.newState === 'APPROVED_FOR_EXECUTION' &&
      decisionResult.humanDecision.decision === 'APPROVED' &&
      decisionResult.humanDecision.actorRole === 'PURCHASE_MANAGER';

    results.push({
      id: 'AGENTIC-20',
      name: 'Purchase Manager Authorization and Bounded Execution',
      category: 'APPROVAL_GATEWAY',
      passed: isAuthorized,
      expected: 'Authorized Purchase Manager transitions proposal to APPROVED_FOR_EXECUTION',
      actual: `Result: Success=${decisionResult.success}, NewState=${decisionResult.newState}, Decision=${decisionResult.humanDecision.decision}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-20',
      name: 'Purchase Manager Authorization',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'Successful authorization',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 21: Unauthorized approval rejection (Requisitioner cannot approve)
  // ==========================================================================
  try {
    const session = await procurementAgentOrchestrator.executeSession({
      purchaseRequest: {
        itemDescription: 'Laptop Charger 65W',
        quantity: 5,
        department: 'IT / Technology',
        estimatedPrice: 25,
      },
    });

    // Attempt approval with unauthorized REQUISITIONER role
    const rejectionResult = processHumanDecision(
      session,
      'APPROVED',
      { id: 'usr-102', name: 'Marcus Vance', role: 'REQUISITIONER' },
      'Self-approval attempt'
    );

    const isRejected =
      rejectionResult.success === false &&
      Boolean(rejectionResult.error && rejectionResult.error.includes('Unauthorized')) &&
      session.approvalState !== 'APPROVED_FOR_EXECUTION';

    results.push({
      id: 'AGENTIC-21',
      name: 'Unauthorized Role Approval Rejection (RBAC Enforcement)',
      category: 'APPROVAL_GATEWAY',
      passed: isRejected,
      expected: 'Rejects approval attempts by REQUISITIONER with security violation error',
      actual: `Rejection verified. Error: ${rejectionResult.error}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-21',
      name: 'Unauthorized Role Approval Rejection',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'Security rejection',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 22: Approval state transitions
  // ==========================================================================
  try {
    const valid1 = canTransition('ANALYZING', 'RECOMMENDATION_READY');
    const valid2 = canTransition('WAITING_FOR_APPROVAL', 'APPROVED');
    const valid3 = canTransition('WAITING_FOR_APPROVAL', 'REJECTED');
    const valid4 = canTransition('WAITING_FOR_APPROVAL', 'RETURNED_FOR_REVIEW');
    const invalidHop = canTransition('ANALYZING', 'APPROVED'); // Invalid direct hop!

    const passed = valid1 && valid2 && valid3 && valid4 && !invalidHop;
    results.push({
      id: 'AGENTIC-22',
      name: 'Approval State Machine Transition Integrity',
      category: 'APPROVAL_GATEWAY',
      passed,
      expected: 'Permits valid lifecycle transitions while rejecting illegal bypass hops',
      actual: `Valid transitions verified; illegal hop (ANALYZING -> APPROVED) rejected=${!invalidHop}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-22',
      name: 'Approval State Machine Transition Integrity',
      category: 'APPROVAL_GATEWAY',
      passed: false,
      expected: 'Transition verification',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 23: Audit event creation
  // ==========================================================================
  try {
    const testSessionId = `SESS-AUD-${Date.now()}`;
    const event = auditTrailService.recordEvent({
      sessionId: testSessionId,
      requestId: 'PR-AUD-01',
      actorType: 'AGENT',
      actorId: 'RISK_VALIDATION_AGENT',
      action: 'RISK_VALIDATION_COMPLETED',
      status: 'COMPLETED',
      riskLevel: 'LOW',
      summary: 'Automated audit event record verification.',
      approvalState: 'RECOMMENDATION_READY',
    });

    const retrieved = auditTrailService.getSessionEvents(testSessionId);
    const passed = Boolean(event.eventId && retrieved.length >= 1 && retrieved[0].action === 'RISK_VALIDATION_COMPLETED');
    results.push({
      id: 'AGENTIC-23',
      name: 'Structured Operational Audit Event Creation',
      category: 'AUDIT_TRAIL',
      passed,
      expected: 'Emits structured audit event with non-sensitive operational telemetry',
      actual: `Recorded event ${event.eventId}. Retrieved session events: ${retrieved.length}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-23',
      name: 'Structured Operational Audit Event Creation',
      category: 'AUDIT_TRAIL',
      passed: false,
      expected: 'Audit event creation',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 24: Workflow history retrieval
  // ==========================================================================
  try {
    // Run an agent session and ensure it appears in history
    await agentSessionService.startAgentSession({
      purchaseRequest: { itemDescription: 'Office Chair', quantity: 3 },
    });

    const sessions = agentSessionService.getAllSessions();
    const passed = Array.isArray(sessions) && sessions.length >= 1 && Boolean(sessions[0].sessionId);
    results.push({
      id: 'AGENTIC-24',
      name: 'Agent Workflow History Retrieval',
      category: 'AUDIT_TRAIL',
      passed,
      expected: 'Returns active and past agentic sessions ordered by timestamp',
      actual: `Retrieved ${sessions.length} session(s) in workflow history`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-24',
      name: 'Agent Workflow History Retrieval',
      category: 'AUDIT_TRAIL',
      passed: false,
      expected: 'History retrieval',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 25: Missing evidence handling
  // ==========================================================================
  try {
    const corruptContext: any = {
      sessionId: 'CORRUPT-SESS',
      requestId: 'CORRUPT-PR',
      procurementRequest: {},
      existingEngineResults: null, // missing!
      riskAssessment: null, // missing!
      actionProposal: null, // missing!
      approvalState: 'WAITING_FOR_APPROVAL',
    };

    const safety = validateApprovalSafety(corruptContext, 'PURCHASE_MANAGER');
    const passed = safety.isValid === false && Boolean(safety.error);
    results.push({
      id: 'AGENTIC-25',
      name: 'Missing Evidence Safety Boundary Enforcement',
      category: 'RESILIENCE',
      passed,
      expected: 'Refuses approval transition when critical evidence is missing',
      actual: `Intercepted corrupt context: ${safety.error}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-25',
      name: 'Missing Evidence Safety Boundary Enforcement',
      category: 'RESILIENCE',
      passed: false,
      expected: 'Safety check',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 26: Agent failure handling
  // ==========================================================================
  try {
    // Run session with extreme empty input
    const session = await procurementAgentOrchestrator.executeSession({
      purchaseRequest: {},
    });

    const passed =
      Boolean(session.sessionId) &&
      session.workflowStatus === 'CONSOLIDATED' &&
      session.approvalState === 'BLOCKED' &&
      session.riskAssessment?.validationStatus === 'BLOCKED';

    results.push({
      id: 'AGENTIC-26',
      name: 'Agent Failure Defense & Deterministic Fallback',
      category: 'RESILIENCE',
      passed,
      expected: 'Safe fallback state engaged when inputs are incomplete without uncaught exceptions',
      actual: `Handled safely: ApprovalState=${session.approvalState}, Workflow=${session.workflowStatus}`,
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-26',
      name: 'Agent Failure Defense & Deterministic Fallback',
      category: 'RESILIENCE',
      passed: false,
      expected: 'Safe fallback',
      actual: `Error: ${err?.message}`,
    });
  }

  // ==========================================================================
  // TEST 27: Complete end-to-end workflow
  // ==========================================================================
  try {
    // Full lifecycle: Request -> Plan -> Specialists -> Evidence -> Proposal -> Human Decision -> Audit Trail
    const session = await procurementAgentOrchestrator.executeSession({
      purchaseRequest: {
        itemDescription: 'Hydraulic Seal Kit',
        quantity: 65,
        department: 'Maintenance',
        estimatedPrice: 75,
      },
    });

    const decisionResult = processHumanDecision(
      session,
      'APPROVED',
      { id: 'usr-101', name: 'Fawad Ali Shan', role: 'PURCHASE_MANAGER' },
      'End-to-End Test Approval'
    );

    const auditEvents = auditTrailService.getSessionEvents(session.sessionId);

    const hasStartEvent = auditEvents.some((e) => e.action === 'AGENT_SESSION_STARTED');
    const hasPlanEvent = auditEvents.some((e) => e.action === 'PLAN_CREATED');
    const hasProposalEvent = auditEvents.some((e) => e.action === 'ACTION_PROPOSED');
    const hasApprovalEvent = auditEvents.some((e) => e.action === 'HUMAN_APPROVED');

    const isCompleteWorkflow =
      decisionResult.success &&
      session.approvalState === 'APPROVED_FOR_EXECUTION' &&
      hasStartEvent &&
      hasPlanEvent &&
      hasProposalEvent &&
      hasApprovalEvent &&
      auditEvents.length >= 6;

    results.push({
      id: 'AGENTIC-27',
      name: 'Complete End-to-End Agentic & Human-in-the-Loop Workflow',
      category: 'INTEGRATION',
      passed: isCompleteWorkflow,
      expected: 'Plan -> Specialists -> Proposal -> PM Gateway Approval -> Audit Trail completed seamlessly',
      actual: `End-to-end verified. Session=${session.sessionId}, FinalState=${session.approvalState}, AuditEvents=${auditEvents.length}`,
      details: {
        auditEventsCount: auditEvents.length,
        approvalState: session.approvalState,
        actionProposal: session.actionProposal?.title,
      },
    });
  } catch (err: any) {
    results.push({
      id: 'AGENTIC-27',
      name: 'Complete End-to-End Agentic & Human-in-the-Loop Workflow',
      category: 'INTEGRATION',
      passed: false,
      expected: 'Full lifecycle execution',
      actual: `Error: ${err?.message}`,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.length - passedCount;

  return {
    totalTests: results.length,
    passedCount,
    failedCount,
    allPassed: failedCount === 0,
    timestamp: new Date().toISOString(),
    results,
  };
}
