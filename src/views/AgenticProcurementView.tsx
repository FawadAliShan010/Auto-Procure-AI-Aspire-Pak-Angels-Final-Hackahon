/**
 * AutoProcure AI - Agentic Procurement View
 *
 * Part 2 & Part 3 Complete UI
 * Demonstrates genuine agentic behavior:
 * GOAL → PLAN → SELECT SPECIALIST → USE TOOL → OBSERVE RESULT → DECIDE NEXT STEP → CONSOLIDATE EVIDENCE → ACTION PROPOSAL → HUMAN APPROVAL GATEWAY → AUDIT TRAIL
 *
 * Independent from the existing deterministic procurement workflow.
 */

import React, { useState } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { INITIAL_PURCHASE_REQUESTS } from '../data/mockProcurementData';
import { PurchaseRequest, isPurchaseManagerRole } from '../types/procurement';
import { agentSessionService } from '../services/agent/agentSessionService';
import { runAgentTestSuite, AgentTestSuiteSummary } from '../services/agent/agentTestSuite';
import {
  AgentExecutionContext,
  AgentExecutionResult,
  SpecialistAgentName,
  RiskLevel,
  ValidationStatus,
  HumanDecisionStatus,
  AgentAuditEvent,
} from '../services/agent/types';
import { Button } from '../components/common/Button';
import {
  Bot,
  BrainCircuit,
  Play,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Package,
  TrendingUp,
  Scale,
  RefreshCw,
  Sparkles,
  ClipboardList,
  Activity,
  FileCheck2,
  Clock,
  History,
  Check,
  X,
  RotateCcw,
  SlidersHorizontal,
  Lock,
  UserCheck,
  ExternalLink,
} from 'lucide-react';

export const AgenticProcurementView: React.FC = () => {
  const { currentUser, addToast } = useProcure();

  // Selected or custom procurement request
  const [selectedPRId, setSelectedPRId] = useState<string>(INITIAL_PURCHASE_REQUESTS[0]?.id || 'PR-CUSTOM');
  const [customItem, setCustomItem] = useState<string>('Hydraulic Seal Kit');
  const [customQty, setCustomQty] = useState<number>(65);
  const [customDept, setCustomDept] = useState<string>('Maintenance');
  const [customPrice, setCustomPrice] = useState<number>(75);

  // Agent Session State
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [sessionContext, setSessionContext] = useState<AgentExecutionContext | null>(null);
  const [approvalComment, setApprovalComment] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'agent_orchestrator' | 'agent_history' | 'agent_test_suite'>('agent_orchestrator');

  // Audit modal for historical inspection
  const [inspectedSession, setInspectedSession] = useState<AgentExecutionContext | null>(null);

  // Test Suite State
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testSummary, setTestSummary] = useState<AgentTestSuiteSummary | null>(null);

  const canApprove = isPurchaseManagerRole(currentUser.role);

  // Handle PR selection change
  const handleSelectPR = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPRId(val);
    if (val !== 'PR-CUSTOM') {
      const pr = INITIAL_PURCHASE_REQUESTS.find((p) => p.id === val);
      if (pr) {
        setCustomItem(pr.itemDescription);
        setCustomQty(pr.quantity);
        setCustomDept(pr.department);
        setCustomPrice(pr.estimatedPrice);
      }
    }
  };

  // Run Agentic Procurement
  const handleStartAgenticAnalysis = async () => {
    setIsRunning(true);
    try {
      const prToAnalyze: Partial<PurchaseRequest> = {
        id: selectedPRId === 'PR-CUSTOM' ? `PR-AGENT-${Date.now()}` : selectedPRId,
        itemDescription: customItem,
        quantity: Number(customQty) || 1,
        department: customDept,
        estimatedPrice: Number(customPrice) || 25,
      };

      const result = await agentSessionService.startAgentSession({
        requestId: prToAnalyze.id,
        purchaseRequest: prToAnalyze,
        userId: currentUser.id,
        userRole: currentUser.role,
      });

      setSessionContext(result);
      addToast('Agentic Analysis Completed', `Session ${result.sessionId} consolidated. Action proposed: ${result.actionProposal?.proposalType}.`, 'success');
    } catch (err: any) {
      console.error('Agentic execution failed:', err);
      addToast('Agentic Execution Failed', err?.message || 'Error running agent session', 'error');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Human Approval Decision
  const handleHumanDecision = async (decision: HumanDecisionStatus) => {
    if (!sessionContext) return;
    setIsApproving(true);
    try {
      const result = await agentSessionService.submitHumanApproval(
        sessionContext.sessionId,
        decision,
        {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role,
        },
        approvalComment || undefined
      );

      if (result.success && result.context) {
        setSessionContext(result.context);
        addToast(
          decision === 'APPROVED' ? 'Proposal Authorized' : decision === 'REJECTED' ? 'Proposal Rejected' : 'Returned for Investigation',
          `State transitioned to ${result.context.approvalState}. Bounded autonomy preserved.`,
          decision === 'APPROVED' ? 'success' : 'info'
        );
      } else {
        addToast('Action Failed', result.error || 'Failed to process human approval decision', 'error');
      }
    } catch (err: any) {
      addToast('Error', err?.message || 'Failed to submit decision', 'error');
    } finally {
      setIsApproving(false);
    }
  };

  // Run Agent Test Suite (27 tests)
  const handleRunAgentTestSuite = async () => {
    setIsTesting(true);
    try {
      const summary = await runAgentTestSuite();
      setTestSummary(summary);
      if (summary.allPassed) {
        addToast('All 27 Agent Tests Passed', `27/27 agentic assertions verified successfully.`, 'success');
      } else {
        addToast('Agent Tests Completed with Warnings', `${summary.passedCount}/${summary.totalTests} tests passed.`, 'warning');
      }
    } catch (err: any) {
      console.error('Agent test suite failed:', err);
      addToast('Test Suite Failed', err?.message || 'Error executing test suite', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const getSpecialistIcon = (agent: SpecialistAgentName) => {
    switch (agent) {
      case 'PLANNING_AGENT':
        return <BrainCircuit className="w-5 h-5 text-indigo-400" />;
      case 'INVENTORY_AGENT':
        return <Package className="w-5 h-5 text-emerald-400" />;
      case 'HISTORICAL_AGENT':
        return <TrendingUp className="w-5 h-5 text-cyan-400" />;
      case 'DECISION_AGENT':
        return <Scale className="w-5 h-5 text-amber-400" />;
      case 'RISK_VALIDATION_AGENT':
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
    }
  };

  const getRiskBadge = (level?: RiskLevel) => {
    switch (level) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">CRITICAL RISK</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">HIGH RISK</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">MEDIUM RISK</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LOW RISK</span>;
    }
  };

  const getStatusBadge = (status?: ValidationStatus) => {
    switch (status) {
      case 'BLOCKED':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">POLICY BLOCKED</span>;
      case 'REVIEW_REQUIRED':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">REVIEW REQUIRED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">POLICY CLEARED</span>;
    }
  };

  const allHistoricalSessions = agentSessionService.getAllSessions();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="p-2 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400">
                <Bot className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Agentic Procurement System
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  PART 3 • HUMAN-IN-THE-LOOP
                </span>
              </h1>
            </div>
            <p className="text-slate-400 text-sm max-w-2xl">
              Autonomous multi-agent investigation with strict human authorization. The AI <span className="text-indigo-300 font-semibold">analyzes, plans, and proposes</span>; the authorized Purchase Manager retains <span className="text-emerald-300 font-semibold">exclusive procurement clearance authority</span>.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
            <button
              onClick={() => setActiveTab('agent_orchestrator')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'agent_orchestrator'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              Agent & Gateway
            </button>
            <button
              onClick={() => setActiveTab('agent_history')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'agent_history'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <History className="w-4 h-4" />
              Audit & History ({allHistoricalSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('agent_test_suite')}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'agent_test_suite'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/40'
              }`}
            >
              <FileCheck2 className="w-4 h-4" />
              Agent Tests (27)
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'agent_history' ? (
        /* Agent Workflow History & Audit Trail Tab */
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  Agentic Workflow History &amp; Audit Logs
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Non-destructive audit trail of all agent investigations, proposal generations, and human approval events.
                </p>
              </div>
            </div>

            {allHistoricalSessions.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No agentic sessions recorded yet. Launch an investigation from the &quot;Agent &amp; Gateway&quot; tab.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-mono border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Session ID</th>
                      <th className="py-3 px-4">Requisition Item</th>
                      <th className="py-3 px-4">Qty</th>
                      <th className="py-3 px-4">AI Proposal</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4">Approval State</th>
                      <th className="py-3 px-4">Human Decision</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {allHistoricalSessions.map((s) => (
                      <tr key={s.sessionId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono text-indigo-400 font-semibold">{s.sessionId}</td>
                        <td className="py-3 px-4 font-semibold text-white">{s.procurementRequest.itemDescription}</td>
                        <td className="py-3 px-4">{s.procurementRequest.quantity}</td>
                        <td className="py-3 px-4 text-slate-200">
                          <span className="font-mono text-[11px] bg-slate-800 px-2 py-0.5 rounded text-indigo-300 border border-slate-700">
                            {s.actionProposal?.proposalType || 'IN_PROGRESS'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{getRiskBadge(s.riskAssessment?.riskLevel)}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-[11px] text-amber-400">{s.approvalState}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`font-bold ${s.humanDecision.decision === 'APPROVED' ? 'text-emerald-400' : s.humanDecision.decision === 'REJECTED' ? 'text-rose-400' : 'text-slate-400'}`}>
                            {s.humanDecision.decision}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {new Date(s.createdAt).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setInspectedSession(s)}
                            className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium"
                          >
                            View Audit ({s.auditTrail.length})
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Inspected Audit Modal / Section */}
          {inspectedSession && (
            <div className="bg-slate-900/90 border border-indigo-500/40 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">
                    Operational Audit Trail: {inspectedSession.sessionId}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectedSession(null)}
                  className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-2">
                {inspectedSession.auditTrail.map((ev) => (
                  <div key={ev.eventId} className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-500">{ev.eventId}</span>
                        <span className="font-bold text-indigo-300 font-mono">{ev.action}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {ev.actorType}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-slate-300">{ev.summary}</div>
                    <div className="text-[11px] text-slate-500 font-mono">State: {ev.approvalState}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'agent_test_suite' ? (
        /* Agent Test Suite Tab */
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck2 className="w-5 h-5 text-indigo-400" />
                  Full Agentic 27-Point Verification Suite (Part 2 &amp; Part 3)
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Validates planning, specialist selection, inventory tools, historical engine integration, conditional routing, action proposals, human approval gateway, RBAC security, state transitions, and audit trails.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={handleRunAgentTestSuite}
                disabled={isTesting}
                className="gap-2"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing 27 Tests...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Run 27 Agent Tests
                  </>
                )}
              </Button>
            </div>

            {testSummary && (
              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400 uppercase font-mono">Total Assertions</div>
                    <div className="text-2xl font-bold text-white mt-1">{testSummary.totalTests}</div>
                  </div>
                  <div className="bg-emerald-950/20 p-4 rounded-xl border border-emerald-500/30">
                    <div className="text-xs text-emerald-400 uppercase font-mono">Passed</div>
                    <div className="text-2xl font-bold text-emerald-400 mt-1">{testSummary.passedCount}</div>
                  </div>
                  <div className="bg-rose-950/20 p-4 rounded-xl border border-rose-500/30">
                    <div className="text-xs text-rose-400 uppercase font-mono">Failed</div>
                    <div className="text-2xl font-bold text-rose-400 mt-1">{testSummary.failedCount}</div>
                  </div>
                  <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60">
                    <div className="text-xs text-slate-400 uppercase font-mono">Suite Status</div>
                    <div className="text-sm font-bold text-indigo-400 mt-2 flex items-center gap-1.5">
                      {testSummary.allPassed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">100% Passing</span>
                        </>
                      ) : (
                        <span className="text-rose-400">Failures Detected</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden mt-6">
                  {testSummary.results.map((t) => (
                    <div key={t.id} className="p-4 bg-slate-900/40 hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-500">{t.id}</span>
                          <span className="text-sm font-semibold text-white">{t.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                            {t.category}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          <span className="text-slate-500">Expected:</span> {t.expected}
                        </div>
                        <div className="text-xs text-slate-300">
                          <span className="text-slate-500">Actual:</span> {t.actual}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {t.passed ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            PASSED
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            FAILED
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!testSummary && (
              <div className="py-12 text-center text-slate-500 text-sm">
                Click &quot;Run 27 Agent Tests&quot; to execute the comprehensive verification suite.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Agent Orchestrator & Human Gateway Tab */
        <div className="space-y-6">
          {/* Input Controls Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                1. Select Real Requisition for Agentic Investigation
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-mono">Logged in as:</span>
                <span className={`text-xs px-2 py-0.5 rounded font-bold border ${canApprove ? 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {currentUser.role} ({currentUser.name})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Select Existing PR or Custom Mock</label>
                <select
                  value={selectedPRId}
                  onChange={handleSelectPR}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-indigo-500 transition-colors"
                >
                  <option value="PR-CUSTOM">⚡ Custom Input (e.g. Hydraulic Seal Kit - 65 units)</option>
                  {INITIAL_PURCHASE_REQUESTS.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.id}: {pr.itemDescription} ({pr.quantity} units, ${pr.estimatedPrice} ea)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Item Description</label>
                <input
                  type="text"
                  value={customItem}
                  onChange={(e) => setCustomItem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={customQty}
                  onChange={(e) => setCustomQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Department</label>
                <input
                  type="text"
                  value={customDept}
                  onChange={(e) => setCustomDept(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Estimated Unit Price ($)</label>
                <input
                  type="number"
                  min="1"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2 flex items-end">
                <Button
                  variant="primary"
                  onClick={handleStartAgenticAnalysis}
                  disabled={isRunning}
                  className="w-full py-2.5 text-sm gap-2"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Orchestrating Specialist Agents...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4" />
                      Start Agentic Procurement Analysis
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Execution Results & Human Gateway View */}
          {sessionContext && (
            <div className="space-y-6">
              {/* Part 3 Dedicated Human-in-the-Loop Approval Gateway */}
              <div className="bg-slate-900/95 border-2 border-indigo-500/50 rounded-2xl p-6 shadow-2xl space-y-5 backdrop-blur-md relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-500/20">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        GATEWAY: {sessionContext.approvalState}
                      </span>
                      {getRiskBadge(sessionContext.riskAssessment?.riskLevel)}
                      {getStatusBadge(sessionContext.riskAssessment?.validationStatus)}
                    </div>
                    <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
                      <ShieldCheck className="w-6 h-6 text-emerald-400" />
                      Purchase Manager Approval Gateway
                    </h2>
                  </div>

                  {/* Distinction Card: AI Recommendation vs. Human Decision */}
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center gap-6 text-xs">
                    <div>
                      <div className="text-slate-500 font-mono text-[10px] uppercase">AI Recommendation</div>
                      <div className="text-indigo-400 font-bold font-mono text-sm mt-0.5">
                        {sessionContext.existingEngineResults?.decisionResult?.decision || 'REVIEW'}
                      </div>
                    </div>
                    <div className="border-l border-slate-800 pl-6">
                      <div className="text-slate-500 font-mono text-[10px] uppercase">Human Decision</div>
                      <div className={`font-bold font-mono text-sm mt-0.5 ${sessionContext.humanDecision.decision === 'APPROVED' ? 'text-emerald-400' : sessionContext.humanDecision.decision === 'REJECTED' ? 'text-rose-400' : 'text-amber-400'}`}>
                        {sessionContext.humanDecision.decision}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actual Evidence Review Matrix */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Request &amp; Item</span>
                    <div className="text-xs font-bold text-white mt-1 truncate">
                      {sessionContext.procurementRequest.itemDescription}
                    </div>
                    <div className="text-[11px] text-slate-400">{sessionContext.procurementRequest.department}</div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Requested Qty &amp; Cost</span>
                    <div className="text-xs font-bold text-white mt-1">
                      {sessionContext.procurementRequest.quantity} units @ ${sessionContext.procurementRequest.estimatedPrice}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Total: ${((sessionContext.procurementRequest.quantity || 1) * (sessionContext.procurementRequest.estimatedPrice || 0)).toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Inventory Usable</span>
                    <div className="text-xs font-bold text-emerald-400 mt-1">
                      {sessionContext.agentResults.INVENTORY_AGENT?.evidence?.excessOrIdleStock || 0} units idle/excess
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Local stock: {sessionContext.agentResults.INVENTORY_AGENT?.evidence?.localWarehouseStock || 0}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-500 font-mono uppercase">Historical Velocity</span>
                    <div className="text-xs font-bold text-cyan-400 mt-1">
                      {sessionContext.agentResults.HISTORICAL_AGENT?.evidence?.monthsOfSupply || 0} mo supply
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Baseline: {sessionContext.agentResults.HISTORICAL_AGENT?.evidence?.avgMonthlyUsage || 0}/mo
                    </div>
                  </div>
                </div>

                {/* Agent Proposed Action Card */}
                {sessionContext.actionProposal && (
                  <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-indigo-300 uppercase">
                        Agent Proposed Action: [{sessionContext.actionProposal.proposalType}]
                      </span>
                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        Estimated Savings: ${sessionContext.actionProposal.estimatedSavings.toLocaleString()}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{sessionContext.actionProposal.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{sessionContext.actionProposal.description}</p>
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-indigo-500/20">
                      <span className="text-indigo-300 font-semibold">Justification: </span>
                      {sessionContext.actionProposal.justification}
                    </div>
                  </div>
                )}

                {/* Human Approval Controls (Purchase Manager Only) */}
                <div className="pt-2 border-t border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-indigo-400" />
                        Human Authorization Controls
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {canApprove
                          ? 'You are signed in with Purchase Manager authority. Select authorization decision below.'
                          : 'Requisitioner role detected: Human authorization controls are restricted to Purchase Manager.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleHumanDecision('RETURNED_FOR_REVIEW')}
                        disabled={!canApprove || isApproving || sessionContext.approvalState === 'APPROVED_FOR_EXECUTION'}
                        className="gap-1.5 text-xs py-2 bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Return for Investigation
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() => handleHumanDecision('REJECTED')}
                        disabled={!canApprove || isApproving || sessionContext.approvalState === 'APPROVED_FOR_EXECUTION'}
                        className="gap-1.5 text-xs py-2"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject Proposal
                      </Button>

                      <Button
                        variant="primary"
                        onClick={() => handleHumanDecision('APPROVED')}
                        disabled={!canApprove || isApproving || sessionContext.approvalState === 'APPROVED_FOR_EXECUTION' || sessionContext.approvalState === 'BLOCKED'}
                        className="gap-1.5 text-xs py-2 bg-emerald-600 hover:bg-emerald-500 text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Proposal
                      </Button>
                    </div>
                  </div>

                  {canApprove && (
                    <div className="pt-1">
                      <input
                        type="text"
                        placeholder="Optional Purchase Manager authorization notes or override comments..."
                        value={approvalComment}
                        onChange={(e) => setApprovalComment(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {sessionContext.approvalState === 'APPROVED_FOR_EXECUTION' && (
                    <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-lg p-3 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>
                        <strong>Status: APPROVED_FOR_EXECUTION</strong>. Authorized by {sessionContext.humanDecision.actorName} ({sessionContext.humanDecision.actorRole}). Controlled execution boundary: External SAP/supplier dispatches safely deferred.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Plan & Specialist Evidence Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Specialist Agent Finding Cards */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      Specialist Agents Invocation ({Object.keys(sessionContext.agentResults).length})
                    </h3>
                    <span className="text-xs text-slate-400">Real application evidence</span>
                  </div>

                  {Object.entries(sessionContext.agentResults).map(([name, rawRes]) => {
                    const res = rawRes as AgentExecutionResult | undefined;
                    return (
                      <div
                        key={name}
                        className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700/80 transition-all space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                              {getSpecialistIcon(name as SpecialistAgentName)}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-white flex items-center gap-2">
                                {name.replace('_', ' ')}
                                {getRiskBadge(res?.riskLevel)}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono">Action: {res?.action}</div>
                            </div>
                          </div>
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            {res?.status}
                          </span>
                        </div>

                        <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80 text-xs text-slate-200 leading-relaxed">
                          <span className="text-slate-400 font-semibold">Finding: </span>
                          {res?.finding}
                        </div>

                        {res?.recommendedNextStep && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <ArrowRight className="w-3 h-3 text-indigo-400" />
                            <span className="text-slate-500 font-semibold">Next Step:</span> {res.recommendedNextStep}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Right Col: Safe Operational Event Stream */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      Agent Activity Stream
                    </h3>
                    <span className="text-[11px] text-slate-500 font-mono">{sessionContext.events.length} events</span>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-3 max-h-[550px] overflow-y-auto">
                    {sessionContext.events.map((evt) => (
                      <div key={evt.id} className="relative pl-5 pb-2 border-l border-slate-800 last:border-0 last:pb-0">
                        <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
                        <div className="text-[10px] font-mono text-slate-500">
                          {new Date(evt.timestamp).toLocaleTimeString()}
                        </div>
                        <div className="text-xs text-slate-200 font-medium mt-0.5 leading-snug">
                          {evt.message}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
