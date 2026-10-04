/**
 * AutoProcure AI - Historical Analysis Agent
 *
 * Part 2 Specialist Agent
 * Reuses existing historicalAnalysisEngine.ts without duplicating calculations.
 * Interprets historical demand, consumption velocity, 24-month horizon, and run-rates.
 */

import { PurchaseRequest } from '../../../types/procurement';
import { AgentExecutionResult, RiskLevel } from '../types';
import { getHistoricalAnalysis, HistoricalEvidence } from '../agentTools';

export function runHistoricalAgent(
  request: Partial<PurchaseRequest>
): {
  result: AgentExecutionResult;
  evidence: HistoricalEvidence;
} {
  const quantity = Math.max(1, Number(request.quantity) || 1);
  const evidence = getHistoricalAnalysis(request, quantity);

  let finding = '';
  let riskLevel: RiskLevel = 'LOW';
  let recommendedNextStep = '';

  const monthsOfSupply = evidence.monthsOfSupply;
  const avgMonthly = evidence.avgMonthlyUsage;

  if (evidence.recommendationStatus === 'POTENTIAL_EXCESS' || monthsOfSupply > 4) {
    riskLevel = 'HIGH';
    finding = `Historical consumption analysis indicates that requested volume (${quantity} units) represents ${monthsOfSupply} months of supply against an average velocity of ${avgMonthly} units/month. Annualized consumption is ${evidence.annualizedConsumption} units/year. Volume poses inventory holding risk.`;
    recommendedNextStep = 'Pass finding to DECISION_AGENT and RISK_VALIDATION_AGENT to evaluate quantity reduction or phased delivery.';
  } else if (evidence.recommendationStatus === 'POTENTIAL_SHORTFALL' || monthsOfSupply < 0.8) {
    riskLevel = 'MEDIUM';
    finding = `Requested quantity (${quantity} units) provides only ${monthsOfSupply} months of supply against historical baseline (${avgMonthly} units/month). May breach minimum safety stock thresholds if replenishment lead time exceeds 30 days.`;
    recommendedNextStep = 'Pass to DECISION_AGENT to evaluate potential buffer adjustment or expediting.';
  } else {
    riskLevel = 'LOW';
    finding = `Historical consumption aligns with standard operational velocity (${avgMonthly} units/month baseline, ${evidence.annualizedConsumption} units annualized). Requested quantity provides ${monthsOfSupply} months of supply, consistent with normal quarterly replenishment policy.`;
    recommendedNextStep = 'Proceed to authoritative DECISION_AGENT for 4-gate budget and policy synthesis.';
  }

  const result: AgentExecutionResult = {
    agentName: 'HISTORICAL_AGENT',
    status: 'COMPLETED',
    action: 'EVALUATE_CONSUMPTION_VELOCITY',
    evidence: {
      avgMonthlyUsage: evidence.avgMonthlyUsage,
      annualizedConsumption: evidence.annualizedConsumption,
      monthsOfSupply: evidence.monthsOfSupply,
      totalPurchasedQuantity: evidence.totalPurchasedQuantity,
      totalConsumedQuantity: evidence.totalConsumedQuantity,
      consumptionTrend: evidence.consumptionTrend,
      recommendationStatus: evidence.recommendationStatus,
      isExcessFlagged: evidence.isExcessFlagged,
      suggestedAction: evidence.suggestedAction,
      availablePeriodLabel: evidence.availablePeriodLabel,
    },
    finding,
    riskLevel,
    recommendedNextStep,
    timestamp: new Date().toISOString(),
  };

  return { result, evidence };
}
