/**
 * AutoProcure AI - Human Approval State Machine & Role Security
 *
 * Part 3 Approval Gateway Layer
 * Enforces controlled state transitions, strict Purchase Manager role security,
 * safety validation preconditions, and bounded execution boundaries.
 */

import {
  ApprovalState,
  HumanDecisionStatus,
  HumanApprovalRecord,
  AgentExecutionContext,
  RiskLevel,
} from './types';
import { auditTrailService } from './auditTrailService';
import { isPurchaseManagerRole } from '../../types/procurement';

export interface TransitionResult {
  success: boolean;
  previousState: ApprovalState;
  newState: ApprovalState;
  humanDecision: HumanApprovalRecord;
  error?: string;
  context: AgentExecutionContext;
}

// Valid transitions lookup table
const ALLOWED_TRANSITIONS: Record<ApprovalState, ApprovalState[]> = {
  ANALYZING: ['RECOMMENDATION_READY', 'BLOCKED', 'FAILED' as any],
  RECOMMENDATION_READY: ['WAITING_FOR_APPROVAL', 'BLOCKED'],
  WAITING_FOR_APPROVAL: ['APPROVED', 'REJECTED', 'RETURNED_FOR_REVIEW', 'BLOCKED'],
  APPROVED: ['APPROVED_FOR_EXECUTION'],
  APPROVED_FOR_EXECUTION: ['COMPLETED'],
  REJECTED: ['COMPLETED', 'WAITING_FOR_APPROVAL'],
  RETURNED_FOR_REVIEW: ['ANALYZING'],
  BLOCKED: ['WAITING_FOR_APPROVAL', 'RETURNED_FOR_REVIEW', 'REJECTED', 'APPROVED'],
  COMPLETED: [],
};

export function canTransition(from: ApprovalState, to: ApprovalState): boolean {
  const allowed = ALLOWED_TRANSITIONS[from];
  return Boolean(allowed && allowed.includes(to));
}

/**
 * Validates all safety preconditions prior to allowing an approval or rejection transition
 */
export function validateApprovalSafety(
  context: AgentExecutionContext,
  actorRole: string
): { isValid: boolean; error?: string } {
  // 1. Role verification: Only PURCHASE_MANAGER or ADMIN can approve
  if (!isPurchaseManagerRole(actorRole)) {
    return {
      isValid: false,
      error: `Unauthorized: User role "${actorRole}" does not have authority to approve or reject procurement proposals. Only authorized PURCHASE_MANAGER or ADMIN roles may authorize actions.`,
    };
  }

  // 2. Request existence
  if (!context.procurementRequest || !context.requestId) {
    return { isValid: false, error: 'Safety Violation: Procurement request record is missing.' };
  }

  // 3. Evidence existence
  if (!context.existingEngineResults || !context.existingEngineResults.decisionResult) {
    return { isValid: false, error: 'Safety Violation: Deterministic procurement engine evidence is missing.' };
  }

  // 4. Risk assessment existence
  if (!context.riskAssessment || !context.riskAssessment.riskLevel) {
    return { isValid: false, error: 'Safety Violation: Risk assessment is incomplete or risk level is unknown.' };
  }

  // 5. Action proposal existence
  if (!context.actionProposal || !context.actionProposal.proposalType) {
    return { isValid: false, error: 'Safety Violation: No valid action proposal found for this session.' };
  }

  // 6. Current approval state validity
  if (
    context.approvalState !== 'WAITING_FOR_APPROVAL' &&
    context.approvalState !== 'RECOMMENDATION_READY' &&
    context.approvalState !== 'BLOCKED'
  ) {
    return {
      isValid: false,
      error: `Safety Violation: Cannot approve requisition from current state "${context.approvalState}". Must be WAITING_FOR_APPROVAL.`,
    };
  }

  return { isValid: true };
}

/**
 * Executes a human decision transition within the approval state machine
 */
export function processHumanDecision(
  context: AgentExecutionContext,
  decision: HumanDecisionStatus,
  actor: { id: string; name: string; role: string },
  comments?: string
): TransitionResult {
  const previousState = context.approvalState;

  // 1. Enforce safety validation and role permissions
  const safety = validateApprovalSafety(context, actor.role);
  if (!safety.isValid) {
    auditTrailService.recordEvent({
      sessionId: context.sessionId,
      requestId: context.requestId,
      actorType: 'SYSTEM',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'APPROVAL_SECURITY_CHECK_FAILED',
      status: 'REJECTED',
      riskLevel: 'HIGH',
      summary: safety.error || 'Approval rejected by security boundary.',
      approvalState: context.approvalState,
    });

    return {
      success: false,
      previousState,
      newState: previousState,
      humanDecision: context.humanDecision,
      error: safety.error,
      context,
    };
  }

  // 2. Determine target state based on human decision
  let targetState: ApprovalState = 'WAITING_FOR_APPROVAL';
  if (decision === 'APPROVED') {
    targetState = 'APPROVED';
  } else if (decision === 'REJECTED') {
    targetState = 'REJECTED';
  } else if (decision === 'RETURNED_FOR_REVIEW') {
    targetState = 'RETURNED_FOR_REVIEW';
  }

  // 3. Verify state transition validity
  if (!canTransition(previousState, targetState)) {
    return {
      success: false,
      previousState,
      newState: previousState,
      humanDecision: context.humanDecision,
      error: `Illegal state transition from "${previousState}" to "${targetState}".`,
      context,
    };
  }

  // 4. Update Human Approval Record
  const approvalRecord: HumanApprovalRecord = {
    decision,
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.role,
    timestamp: new Date().toISOString(),
    comments: comments || (decision === 'APPROVED' ? 'Approved by Purchase Manager' : 'Reviewed by Purchase Manager'),
  };

  context.humanDecision = approvalRecord;
  context.approvalState = targetState;

  // 5. If approved, advance through execution boundary
  if (targetState === 'APPROVED') {
    // Controlled action execution boundary: marked as APPROVED_FOR_EXECUTION, zero external ERP/vendor calls
    context.approvalState = 'APPROVED_FOR_EXECUTION';
    context.workflowStatus = 'CONSOLIDATED';

    auditTrailService.recordEvent({
      sessionId: context.sessionId,
      requestId: context.requestId,
      actorType: 'HUMAN_PURCHASE_MANAGER',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'HUMAN_APPROVED',
      status: 'APPROVED_FOR_EXECUTION',
      riskLevel: context.riskAssessment?.riskLevel || 'LOW',
      summary: `Purchase Manager ${actor.name} approved proposal "${context.actionProposal?.title}". Marked APPROVED_FOR_EXECUTION. Bounded autonomy: external SAP/supplier calls safely deferred.`,
      approvalState: 'APPROVED_FOR_EXECUTION',
      details: {
        comments: approvalRecord.comments,
        actionProposal: context.actionProposal,
      },
    });

    context.events.push({
      id: `EVT-${Date.now()}-APPROVAL`,
      timestamp: new Date().toISOString(),
      type: 'EVIDENCE_CONSOLIDATED',
      message: `Purchase Manager ${actor.name} approved action proposal (${approvalRecord.comments || 'No comment'}).`,
    });
  } else if (targetState === 'REJECTED') {
    context.workflowStatus = 'CONSOLIDATED';
    auditTrailService.recordEvent({
      sessionId: context.sessionId,
      requestId: context.requestId,
      actorType: 'HUMAN_PURCHASE_MANAGER',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'HUMAN_REJECTED',
      status: 'REJECTED',
      riskLevel: 'MEDIUM',
      summary: `Purchase Manager ${actor.name} rejected proposal: ${comments || 'Declined without additional notes'}.`,
      approvalState: 'REJECTED',
    });

    context.events.push({
      id: `EVT-${Date.now()}-REJECTION`,
      timestamp: new Date().toISOString(),
      type: 'EVIDENCE_CONSOLIDATED',
      message: `Purchase Manager ${actor.name} rejected action proposal.`,
    });
  } else if (targetState === 'RETURNED_FOR_REVIEW') {
    context.workflowStatus = 'PLANNING';
    auditTrailService.recordEvent({
      sessionId: context.sessionId,
      requestId: context.requestId,
      actorType: 'HUMAN_PURCHASE_MANAGER',
      actorId: actor.id,
      actorRole: actor.role,
      action: 'RETURNED_FOR_REVIEW',
      status: 'RETURNED_FOR_REVIEW',
      riskLevel: 'LOW',
      summary: `Proposal returned to requisitioner/agent for further specification: ${comments || 'Clarification needed'}.`,
      approvalState: 'RETURNED_FOR_REVIEW',
    });

    context.events.push({
      id: `EVT-${Date.now()}-RETURN`,
      timestamp: new Date().toISOString(),
      type: 'EVIDENCE_CONSOLIDATED',
      message: `Proposal returned for further investigation by ${actor.name}.`,
    });
  }

  // Refresh context audit trail
  context.auditTrail = auditTrailService.getSessionEvents(context.sessionId);

  return {
    success: true,
    previousState,
    newState: context.approvalState,
    humanDecision: approvalRecord,
    context,
  };
}
