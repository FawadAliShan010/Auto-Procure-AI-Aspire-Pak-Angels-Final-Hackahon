/**
 * AutoProcure AI - Planning Agent
 *
 * Part 2 Specialist Agent
 * Responsible for determining the dynamic investigation plan based on
 * the procurement request parameters, item type, quantity scale, and available data.
 */

import { PurchaseRequest } from '../../../types/procurement';
import { AgentExecutionResult, AgentPlanStep } from '../types';

export function runPlanningAgent(
  request: Partial<PurchaseRequest>,
  procurementObjective: string
): {
  result: AgentExecutionResult;
  plan: AgentPlanStep[];
} {
  const itemDesc = (request.itemDescription || '').trim();
  const quantity = Math.max(1, Number(request.quantity) || 1);
  const price = Math.max(0, Number(request.estimatedPrice) || 0);
  const grossCommitment = quantity * price;

  const planSteps: AgentPlanStep[] = [];
  let stepCounter = 1;

  // Step 1: Always check warehouse inventory & transfer potential
  planSteps.push({
    stepIndex: stepCounter++,
    specialist: 'INVENTORY_AGENT',
    objective: 'Audit local depot stock, sister site availability, and idle/excess inventories for transfer feasibility.',
    requiredTools: ['getInventoryEvidence'],
    status: 'PENDING',
    conditionReason: 'Immediate stock verification prevents unnecessary external spending.',
  });

  // Step 2: Conditional planning based on volume & commitment
  // For high-volume (>20 units) or high-spend (> $1,000), prioritize Historical Velocity
  planSteps.push({
    stepIndex: stepCounter++,
    specialist: 'HISTORICAL_AGENT',
    objective: 'Evaluate 24-month consumption velocity, demand run-rate, and calculate months-of-supply horizon.',
    requiredTools: ['getHistoricalAnalysis'],
    status: 'PENDING',
    conditionReason: quantity > 10
      ? `Volume (${quantity} units) warrants consumption velocity verification against historical baseline.`
      : 'Verify request alignment with standard monthly consumption run-rates.',
  });

  // Step 3: Run authoritative deterministic procurement decision engine
  planSteps.push({
    stepIndex: stepCounter++,
    specialist: 'DECISION_AGENT',
    objective: 'Execute authoritative 4-gate procurement evaluation (catalog, budget, inventory, consumption).',
    requiredTools: ['runExistingProcurementEngine', 'runExistingDecisionEngine'],
    status: 'PENDING',
    conditionReason: 'Deterministic policy rules must synthesize official decision and financial savings.',
  });

  // Step 4: Risk and policy validation
  planSteps.push({
    stepIndex: stepCounter++,
    specialist: 'RISK_VALIDATION_AGENT',
    objective: 'Challenge evidence for conflicting signals, duplicate open POs, budget variance, and over-purchasing.',
    requiredTools: ['validateProcurementEvidence', 'getOpenPOEvidence'],
    status: 'PENDING',
    conditionReason: 'Independent challenge ensures fiduciary compliance prior to purchase manager review.',
  });

  const finding = `Formulated dynamic ${planSteps.length}-stage investigation plan for "${itemDesc || 'Item'}" (Qty: ${quantity}, Commitment: $${grossCommitment.toLocaleString()}). Prioritizing internal inventory reuse before evaluating historical run-rates and deterministic policy clearance.`;

  const result: AgentExecutionResult = {
    agentName: 'PLANNING_AGENT',
    status: 'COMPLETED',
    action: 'DETERMINE_INVESTIGATION_PLAN',
    evidence: {
      totalSteps: planSteps.length,
      requestedItem: itemDesc,
      quantity,
      estimatedCommitment: grossCommitment,
      highSpendTrack: grossCommitment > 1000,
      highVolumeTrack: quantity > 25,
      plannedSpecialists: planSteps.map((s) => s.specialist),
    },
    finding,
    riskLevel: 'LOW',
    recommendedNextStep: 'Execute Step 1: Consult INVENTORY_AGENT for stock and transfer feasibility.',
    timestamp: new Date().toISOString(),
  };

  return { result, plan: planSteps };
}
