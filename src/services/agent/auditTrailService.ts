/**
 * AutoProcure AI - Agent Audit Trail Service
 *
 * Part 3 Isolated Audit Trail
 * Maintains operational event tracking for all agentic workflows, human approvals,
 * and state transitions without exposing hidden chain-of-thought.
 */

import {
  AgentAuditEvent,
  ApprovalState,
  RiskLevel,
  SpecialistAgentName,
} from './types';

class AuditTrailService {
  // Isolated in-memory store for agent audit events
  private auditEvents: AgentAuditEvent[] = [];

  public recordEvent(params: {
    sessionId: string;
    requestId: string;
    actorType: AgentAuditEvent['actorType'];
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
  }): AgentAuditEvent {
    const event: AgentAuditEvent = {
      eventId: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sessionId: params.sessionId,
      requestId: params.requestId,
      timestamp: new Date().toISOString(),
      actorType: params.actorType,
      actorId: params.actorId,
      actorRole: params.actorRole,
      agentName: params.agentName,
      action: params.action,
      status: params.status,
      riskLevel: params.riskLevel,
      summary: params.summary,
      toolUsed: params.toolUsed,
      approvalState: params.approvalState,
      details: params.details,
    };

    this.auditEvents.push(event);
    return event;
  }

  public getSessionEvents(sessionId: string): AgentAuditEvent[] {
    return this.auditEvents
      .filter((e) => e.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  public getAllEvents(): AgentAuditEvent[] {
    return [...this.auditEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public clear(): void {
    this.auditEvents = [];
  }
}

export const auditTrailService = new AuditTrailService();
