/**
 * AutoProcure AI - Action Proposal & Controlled Autonomy Layer
 *
 * Part 3 Action Proposal Layer
 * Synthesizes actionable proposals strictly aligned with the authoritative
 * deterministic procurement engine and classifies operational risk.
 */

import {
  ActionProposal,
  ActionProposalType,
  AutonomyRiskCategory,
  RiskLevel,
  ValidationStatus,
  SpecialistAgentName,
  AgentExecutionResult,
} from './types';
import { PurchaseRequest, AIDecisionResult } from '../../types/procurement';

export interface ActionProposalInput {
  requestId: string;
  itemTitle: string;
  quantity: number;
  unitPrice: number;
  department: string;
  decisionResult?: AIDecisionResult;
  riskLevel: RiskLevel;
  validationStatus: ValidationStatus;
  agentResults: Partial<Record<SpecialistAgentName, AgentExecutionResult>>;
  conflicts: string[];
}

export function generateActionProposal(input: ActionProposalInput): ActionProposal {
  const proposalId = `PROP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const decision = input.decisionResult?.decision || 'INVESTIGATE';
  const transferQty = input.decisionResult?.transferQuantity || 0;
  const purchaseQty = input.decisionResult?.purchaseQuantity ?? input.quantity;
  const estimatedSavings = input.decisionResult?.estimatedSavings || 0;
  const totalCommitment = purchaseQty * input.unitPrice;

  let proposalType: ActionProposalType = 'INVESTIGATE_FURTHER';
  let title = '';
  let description = '';
  let justification = '';

  // 1. Align proposal type with authoritative deterministic engine output
  if (decision === 'REDUCE') {
    if (transferQty > 0 && purchaseQty === 0) {
      proposalType = 'USE_INTERNAL_TRANSFER';
      title = `Execute Inter-Warehouse Transfer for ${transferQty} Units`;
      description = `Direct 100% of demand (${transferQty} units) from sister warehouse idle inventory. Avoids all external supplier spend.`;
      justification = `Internal stock is abundant at sister site, saving $${estimatedSavings.toLocaleString()} in avoidable external commitments.`;
    } else {
      proposalType = 'REDUCE_REQUEST';
      title = `Reduce Requisition & Transfer ${transferQty} Sister Units`;
      description = `Fulfill ${transferQty} units via internal transfer from regional depot; limit external PO to ${purchaseQty} units.`;
      justification = `Curbs inventory holding risks while satisfying operational requirement and capturing $${estimatedSavings.toLocaleString()} in savings.`;
    }
  } else if (decision === 'APPROVE') {
    if (transferQty > 0) {
      proposalType = 'USE_INTERNAL_TRANSFER';
      title = `Internal Warehouse Transfer (${transferQty} units)`;
      description = `Prioritize ${transferQty} internal units to fulfill requirement without commercial lead-time.`;
      justification = `Satisfies order with zero delay and protects departmental quarterly budget.`;
    } else {
      proposalType = 'PROCEED_WITH_PURCHASE';
      title = `Proceed With External PO for ${purchaseQty} Units`;
      description = `Requisition parameters fully conform to catalog standards and department budget ceiling. External purchase recommended.`;
      justification = `No internal idle stock available across warehouses; consumption rate matches normal quarterly replenishment.`;
    }
  } else if (decision === 'HOLD') {
    proposalType = 'HOLD_REQUEST';
    title = `Place Purchase on Hold Pending Financial Budget Review`;
    description = `Budget allocation exceeded. Defer external PO issuance until supplemental funds or variance approval is secured.`;
    justification = input.decisionResult?.headline || `Commitment ($${totalCommitment.toLocaleString()}) exceeds approved department ceiling.`;
  } else if (decision === 'EXPEDITE') {
    proposalType = 'EXPEDITE_EXISTING_REQUIREMENT';
    title = `Expedite Priority Order`;
    description = `Critical shortage identified. Accelerate purchase order processing to prevent operational disruption.`;
    justification = `Local depot stock depleted with urgent demand profile.`;
  } else {
    // INVESTIGATE or REJECT
    proposalType = 'INVESTIGATE_FURTHER';
    title = `Investigate Technical Specifications & Sizing`;
    description = `Hold external order pending verification of SKU taxonomy and requisitioner requirements.`;
    justification = input.decisionResult?.headline || `Catalog matching confidence or requisition clarity requires human buyer review.`;
  }

  // 2. Classify Controlled Autonomy Risk Level
  let riskCategory: AutonomyRiskCategory = 'LOW_RISK';
  let approvalGateway: 'NONE' | 'PURCHASE_MANAGER_REQUIRED' | 'BLOCKED_PENDING_REVIEW' = 'NONE';
  let requiresHumanApproval = false;

  if (input.riskLevel === 'CRITICAL' || input.validationStatus === 'BLOCKED') {
    riskCategory = 'CRITICAL';
    approvalGateway = 'BLOCKED_PENDING_REVIEW';
    requiresHumanApproval = true;
  } else if (
    input.riskLevel === 'HIGH' ||
    totalCommitment > 1000 ||
    decision === 'HOLD' ||
    decision === 'INVESTIGATE'
  ) {
    riskCategory = 'HIGH_RISK';
    approvalGateway = 'PURCHASE_MANAGER_REQUIRED';
    requiresHumanApproval = true;
  } else if (input.riskLevel === 'MEDIUM' || decision === 'REDUCE' || input.validationStatus === 'REVIEW_REQUIRED') {
    riskCategory = 'MEDIUM_RISK';
    approvalGateway = 'PURCHASE_MANAGER_REQUIRED';
    requiresHumanApproval = true;
  } else {
    // Low risk: ready for buyer confirmation
    riskCategory = 'LOW_RISK';
    approvalGateway = 'PURCHASE_MANAGER_REQUIRED';
    requiresHumanApproval = true; // Strict safety: human-in-the-loop is always maintained for consequential approvals
  }

  const rationale: string[] = [
    `Deterministic Decision: ${decision}`,
    transferQty > 0
      ? `Inter-facility transfer captures $${estimatedSavings.toLocaleString()} in spend avoidance.`
      : `External procurement required for ${purchaseQty} units ($${totalCommitment.toLocaleString()}).`,
    ...input.conflicts.slice(0, 2),
  ];

  return {
    proposalId,
    proposalType,
    riskCategory,
    title,
    description,
    requiresHumanApproval,
    approvalGateway,
    transferQuantity: transferQty,
    purchaseQuantity: purchaseQty,
    financialCommitment: totalCommitment,
    estimatedSavings,
    rationale,
    justification,
    createdAt: new Date().toISOString(),
  };
}
