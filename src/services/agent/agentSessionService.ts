/**
 * AutoProcure AI - Agent Session Service
 *
 * Part 2 & Part 3 Isolated Session & Approval Store
 * Manages operational state for agent_sessions in memory and coordinates
 * with the dedicated backend endpoints (/api/agent/*).
 * Does NOT interfere with purchase_requests or historical_transactions collections.
 */

import {
  AgentExecutionContext,
  HumanDecisionStatus,
  AgentAuditEvent,
} from './types';
import { procurementAgentOrchestrator, OrchestratorRunOptions } from './orchestrator';
import { processHumanDecision, TransitionResult } from './approvalStateMachine';
import { auditTrailService } from './auditTrailService';

class AgentSessionService {
  private inMemorySessions: Map<string, AgentExecutionContext> = new Map();

  /**
   * Run a new agent session. Tries backend endpoint first; if unavailable,
   * seamlessly falls back to client-side orchestrator execution without failing.
   */
  public async startAgentSession(options: OrchestratorRunOptions): Promise<AgentExecutionContext> {
    // In browser environment, try backend endpoint; in Node/test environment, execute directly
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/agent/procurement-agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: options.requestId,
            purchaseRequest: options.purchaseRequest,
            userId: options.userId,
            userRole: options.userRole,
            procurementObjective: options.procurementObjective,
          }),
        });

        if (response.ok) {
          const remoteContext: AgentExecutionContext = await response.json();
          this.inMemorySessions.set(remoteContext.sessionId, remoteContext);
          return remoteContext;
        }
      } catch (err) {
        console.warn('Backend agent endpoint unavailable, running local orchestrator fallback:', err);
      }
    }

    const localContext = await procurementAgentOrchestrator.executeSession(options);
    this.inMemorySessions.set(localContext.sessionId, localContext);
    return localContext;
  }

  /**
   * Submit a human approval decision (Purchase Manager Gateway)
   */
  public async submitHumanApproval(
    sessionId: string,
    decision: HumanDecisionStatus,
    actor: { id: string; name: string; role: string },
    comments?: string
  ): Promise<TransitionResult> {
    // 1. Try remote server endpoint if in browser
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/api/agent/approval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, decision, actor, comments }),
        });

        if (response.ok) {
          const result: TransitionResult = await response.json();
          if (result.context) {
            this.inMemorySessions.set(result.context.sessionId, result.context);
          }
          return result;
        }
      } catch (err) {
        console.warn('Remote approval endpoint unavailable, processing locally:', err);
      }
    }

    // 2. Local fallback state machine execution
    const session = this.inMemorySessions.get(sessionId);
    if (!session) {
      return {
        success: false,
        previousState: 'ANALYZING',
        newState: 'ANALYZING',
        humanDecision: { decision: 'PENDING', actorId: '', actorName: '', actorRole: '', timestamp: '' },
        error: `Session ${sessionId} not found.`,
        context: null as any,
      };
    }

    const transitionResult = processHumanDecision(session, decision, actor, comments);
    if (transitionResult.success) {
      this.inMemorySessions.set(sessionId, transitionResult.context);
    }
    return transitionResult;
  }

  public getSession(sessionId: string): AgentExecutionContext | undefined {
    return this.inMemorySessions.get(sessionId);
  }

  public getAllSessions(): AgentExecutionContext[] {
    return Array.from(this.inMemorySessions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getSessionAuditTrail(sessionId: string): AgentAuditEvent[] {
    const session = this.inMemorySessions.get(sessionId);
    if (session && session.auditTrail && session.auditTrail.length > 0) {
      return session.auditTrail;
    }
    return auditTrailService.getSessionEvents(sessionId);
  }

  public clearSessions(): void {
    this.inMemorySessions.clear();
    auditTrailService.clear();
  }
}

export const agentSessionService = new AgentSessionService();
