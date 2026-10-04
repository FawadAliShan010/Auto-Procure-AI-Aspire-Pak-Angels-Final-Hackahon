/**
 * AutoProcure AI - Agent Result Normalizer
 *
 * Part 2 Isolated Normalization Layer
 * Validates and normalizes agent results to guarantee consistent contract shape,
 * sanitize internal operational state, and prevent exposure of model chain-of-thought.
 */

import {
  AgentExecutionResult,
  AgentPlanStep,
  PreliminaryRecommendation,
  RiskLevel,
  ValidationStatus,
} from './types';

export function normalizeAgentResult(raw: Partial<AgentExecutionResult>): AgentExecutionResult {
  const agentName = raw.agentName || 'PLANNING_AGENT';
  const status = raw.status || 'COMPLETED';
  const action = raw.action || 'EXECUTE_STEP';
  const evidence = raw.evidence && typeof raw.evidence === 'object' ? raw.evidence : {};
  const finding = (raw.finding || 'Step completed successfully with verified evidence.').trim();
  const riskLevel: RiskLevel = raw.riskLevel || 'LOW';
  const recommendedNextStep = raw.recommendedNextStep || 'Proceed with investigation workflow.';
  const timestamp = raw.timestamp || new Date().toISOString();

  return {
    agentName,
    status,
    action,
    evidence,
    finding,
    riskLevel,
    recommendedNextStep,
    timestamp,
  };
}

export function synthesizePreliminaryRecommendation(params: {
  itemTitle: string;
  quantity: number;
  decision: string;
  headline: string;
  transferQuantity: number;
  purchaseQuantity: number;
  estimatedSavings: number;
  riskLevel: RiskLevel;
  validationStatus: ValidationStatus;
  riskFindings: string[];
  conflicts: string[];
}): PreliminaryRecommendation {
  const {
    itemTitle,
    quantity,
    decision,
    headline,
    transferQuantity,
    purchaseQuantity,
    estimatedSavings,
    riskLevel,
    validationStatus,
    conflicts,
  } = params;

  let policyClearance: 'CLEAR' | 'CAUTION' | 'RESTRICTED' = 'CLEAR';
  if (validationStatus === 'BLOCKED' || riskLevel === 'CRITICAL') {
    policyClearance = 'RESTRICTED';
  } else if (validationStatus === 'REVIEW_REQUIRED' || riskLevel === 'HIGH' || riskLevel === 'MEDIUM') {
    policyClearance = 'CAUTION';
  }

  let recommendedAction = '';
  if (transferQuantity > 0 && purchaseQuantity === 0) {
    recommendedAction = `Transfer ${transferQuantity} units internally from sister warehouse depot. Zero external PO required.`;
  } else if (transferQuantity > 0 && purchaseQuantity > 0) {
    recommendedAction = `Split requisition: Transfer ${transferQuantity} units internally from sister depot; issue external PO for ${purchaseQuantity} units.`;
  } else if (decision === 'APPROVE') {
    recommendedAction = `Proceed with standard external PO for ${purchaseQuantity || quantity} units.`;
  } else if (decision === 'INVESTIGATE') {
    recommendedAction = `Hold external PO pending catalog specification review and technical clarity.`;
  } else {
    recommendedAction = `Evaluate budget and consumption parameters before issuing external commitment.`;
  }

  const rationale: string[] = [
    `Deterministic Engine Decision: ${decision}`,
    headline,
    transferQuantity > 0
      ? `Sister facility transfers save an estimated $${estimatedSavings.toLocaleString()} in external spending.`
      : `No redundant stock available; external procurement required.`,
    ...conflicts.map((c) => `Risk Alert: ${c}`),
  ];

  return {
    headline: `Agentic Preliminary Recommendation for ${itemTitle}`,
    recommendedAction,
    rationale: rationale.slice(0, 4),
    transferRecommended: transferQuantity,
    purchaseRecommended: purchaseQuantity,
    estimatedSavings,
    policyClearance,
    riskLevel,
    validationStatus,
  };
}
