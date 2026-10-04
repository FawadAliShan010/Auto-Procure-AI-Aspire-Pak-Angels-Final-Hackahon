/**
 * AutoProcure AI - Risk / Policy Validation Agent
 *
 * Part 2 Specialist Agent
 * Challenges evidence gathered by prior specialists.
 * Checks for conflicting evidence, duplicate Open POs, missing critical fields,
 * unwarranted external spend when sister stock exists, and policy anomalies.
 */

import { PurchaseRequest } from '../../../types/procurement';
import { AgentExecutionResult, AgentRiskAssessment, RiskLevel, ValidationStatus } from '../types';
import { getOpenPOEvidence, InventoryEvidence, HistoricalEvidence, ProcurementEngineEvidence } from '../agentTools';

export function runRiskValidationAgent(
  request: Partial<PurchaseRequest>,
  priorEvidence: {
    inventoryEvidence?: InventoryEvidence;
    historicalEvidence?: HistoricalEvidence;
    engineEvidence?: ProcurementEngineEvidence;
  }
): {
  result: AgentExecutionResult;
  assessment: AgentRiskAssessment;
} {
  const conflicts: string[] = [];
  const findings: string[] = [];
  const missingDataWarnings: string[] = [];

  const rawItem = (request.itemDescription || '').trim();
  const quantity = Math.max(1, Number(request.quantity) || 1);
  const department = request.department || '';

  // 1. Check Missing Critical Data
  if (!rawItem) {
    missingDataWarnings.push('Missing item description in requisition input.');
  }
  if (!department) {
    missingDataWarnings.push('Department unspecified; default departmental budget assumptions applied.');
  }
  if (!request.estimatedPrice || Number(request.estimatedPrice) <= 0) {
    missingDataWarnings.push('Missing or non-positive estimated unit price; standard catalog pricing inferred.');
  }

  // 2. Check Open PO Overlap
  const openPOs = getOpenPOEvidence(rawItem, department);
  if (openPOs.hasActivePOs) {
    conflicts.push(
      `Open PO Conflict: Found ${openPOs.openPOCount} active PO(s) (${openPOs.openPORefs.join(', ')}) with ${openPOs.totalPendingUnits} pending units already in transit for this commodity.`
    );
  }

  // 3. Challenge Inventory vs External Spend
  const inv = priorEvidence.inventoryEvidence;
  if (inv) {
    if (inv.localWarehouseStock >= quantity) {
      conflicts.push(
        `Unnecessary Procurement: Local warehouse already possesses ${inv.localWarehouseStock} units, fully covering requested ${quantity} units without expenditure.`
      );
    } else if (inv.excessOrIdleStock >= quantity) {
      conflicts.push(
        `Avoidable External Expenditure: Sister facility possesses ${inv.excessOrIdleStock} idle/excess units capable of 100% transfer fulfillment.`
      );
    }
  }

  // 4. Challenge Historical Run-Rate
  const hist = priorEvidence.historicalEvidence;
  if (hist) {
    if (hist.monthsOfSupply > 6) {
      conflicts.push(
        `Excessive Volume Warning: Requested volume represents ${hist.monthsOfSupply} months of supply based on annualized usage of ${hist.annualizedConsumption} units/year.`
      );
    }
  }

  // 5. Check Engine Consistency & Gate Alignment
  const eng = priorEvidence.engineEvidence;
  if (eng) {
    if (eng.gate1.confidenceScore < 0.80) {
      findings.push(
        `Low Catalog Confidence (${(eng.gate1.confidenceScore * 100).toFixed(0)}%): Item taxonomy could not be unambiguously verified against active ERP Master Catalog.`
      );
    }
    if (eng.gate2.status === 'Failed') {
      conflicts.push(
        `Budget Breach: Commitment exceeds department ceiling by $${eng.gate2.variance.toLocaleString()}. Requires special financial controller override.`
      );
    }
  }

  // Determine Overall Risk Level and Validation Status
  let riskLevel: RiskLevel = 'LOW';
  let validationStatus: ValidationStatus = 'PASS';

  if (conflicts.some((c) => c.includes('Budget Breach') || c.includes('Open PO Conflict'))) {
    riskLevel = 'HIGH';
    validationStatus = 'REVIEW_REQUIRED';
  }

  if (conflicts.length >= 2 || missingDataWarnings.some((m) => m.includes('Missing item description'))) {
    riskLevel = 'CRITICAL';
    validationStatus = 'BLOCKED';
  } else if (conflicts.length > 0 || missingDataWarnings.length > 0 || findings.length > 0) {
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
    if (validationStatus === 'PASS') validationStatus = 'REVIEW_REQUIRED';
  }

  const assessment: AgentRiskAssessment = {
    riskLevel,
    validationStatus,
    findings: findings.length > 0 ? findings : ['All evidence aligned with enterprise procurement guidelines.'],
    conflicts,
    missingDataWarnings,
  };

  const findingSummary =
    validationStatus === 'PASS'
      ? 'Risk audit passed. No duplicate open POs, excessive volume, or conflicting inventory signals detected.'
      : validationStatus === 'REVIEW_REQUIRED'
      ? `Risk audit flagged ${conflicts.length} conflict(s) requiring buyer attention: ${conflicts[0]}`
      : `Critical risk detected: Requisition validation blocked due to ${conflicts.length} policy anomalies.`;

  const result: AgentExecutionResult = {
    agentName: 'RISK_VALIDATION_AGENT',
    status: 'COMPLETED',
    action: 'CHALLENGE_PROCUREMENT_EVIDENCE',
    evidence: {
      riskLevel,
      validationStatus,
      conflictsIdentified: conflicts.length,
      conflictsList: conflicts,
      missingDataCount: missingDataWarnings.length,
      hasActiveOpenPOs: openPOs.hasActivePOs,
      openPOCount: openPOs.openPOCount,
      openPOUnits: openPOs.totalPendingUnits,
    },
    finding: findingSummary,
    riskLevel,
    recommendedNextStep:
      validationStatus === 'PASS'
        ? 'Clear preliminary recommendation for purchase manager endorsement.'
        : 'Highlight risk items in executive summary for purchase manager investigation.',
    timestamp: new Date().toISOString(),
  };

  return { result, assessment };
}
