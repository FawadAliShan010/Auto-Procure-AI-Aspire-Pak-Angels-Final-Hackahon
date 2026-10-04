/**
 * AutoProcure AI - Procurement Decision Agent
 *
 * Part 2 Specialist Agent
 * Reuses procurementEngine.ts and decisionEngine.ts without replacing either.
 * Contextualizes the deterministic 4-gate outputs into agentic evidence.
 */

import { PurchaseRequest } from '../../../types/procurement';
import { AgentExecutionResult, RiskLevel } from '../types';
import { runExistingProcurementEngine, ProcurementEngineEvidence } from '../agentTools';

export function runDecisionAgent(
  request: Partial<PurchaseRequest>
): {
  result: AgentExecutionResult;
  engineEvidence: ProcurementEngineEvidence;
} {
  // Execute existing 4-gate deterministic engine
  const engineEvidence = runExistingProcurementEngine(request);
  const { gate1, gate2, gate3, gate4, decisionResult } = engineEvidence;

  let riskLevel: RiskLevel = 'LOW';
  if (decisionResult.decision === 'HOLD' || decisionResult.decision === 'REJECT') {
    riskLevel = 'HIGH';
  } else if (decisionResult.decision === 'REDUCE' || decisionResult.decision === 'INVESTIGATE') {
    riskLevel = 'MEDIUM';
  }

  // Generate concise evidence-based finding respecting deterministic calculation
  const decisionWord = decisionResult.decision;
  let finding = `Deterministic Engine Decision: ${decisionWord}. ${decisionResult.headline}`;

  if (decisionResult.transferQuantity > 0 && decisionResult.purchaseQuantity > 0) {
    finding += ` Split execution recommended: ${decisionResult.transferQuantity} units transferred from sister site, and ${decisionResult.purchaseQuantity} units purchased externally (Estimated Savings: $${decisionResult.estimatedSavings.toLocaleString()}).`;
  } else if (decisionResult.transferQuantity > 0 && decisionResult.purchaseQuantity === 0) {
    finding += ` 100% internal fulfillment: ${decisionResult.transferQuantity} units transferred internally (Avoids $${decisionResult.estimatedSavings.toLocaleString()} in external spend).`;
  } else if (gate2.status === 'Warning' || gate2.status === 'Failed') {
    finding += ` Budget impact: Department ceiling exceeded by $${gate2.variance.toLocaleString()}.`;
  }

  const result: AgentExecutionResult = {
    agentName: 'DECISION_AGENT',
    status: 'COMPLETED',
    action: 'SYNTHESIZE_DETERMINISTIC_GATES',
    evidence: {
      decision: decisionResult.decision,
      headline: decisionResult.headline,
      estimatedSavings: decisionResult.estimatedSavings,
      transferQuantity: decisionResult.transferQuantity,
      purchaseQuantity: decisionResult.purchaseQuantity,
      gate1: {
        standardized: gate1.standardized,
        sku: gate1.matchedItemCode,
        category: gate1.category,
        confidence: gate1.confidenceScore,
      },
      gate2: {
        estimatedCost: gate2.estimatedCost,
        availableBudget: gate2.availableBudget,
        status: gate2.status,
        variance: gate2.variance,
      },
      gate3: {
        localStock: gate3.localAvailable,
        totalSisterStock: gate3.totalSisterStock,
        status: gate3.status,
        recommendedTransferQuantity: gate3.recommendedTransferQuantity,
      },
      gate4: {
        avgMonthlyUsage: gate4.avgMonthlyUsage,
        monthsOfSupply: gate4.monthsOfSupply,
        status: gate4.status,
      },
    },
    finding,
    riskLevel,
    recommendedNextStep: 'Submit consolidated findings to RISK_VALIDATION_AGENT to challenge evidence and detect anomalies.',
    timestamp: new Date().toISOString(),
  };

  return { result, engineEvidence };
}
