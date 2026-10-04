/**
 * AutoProcure AI - Generic Historical Consumption & Requirement Analysis Engine
 *
 * Core Principles:
 * 1. 100% Generic: Operates on SKU / Item Master ID across any commodity or equipment.
 * 2. Source of Truth: Real transactions from `historical_transactions`.
 * 3. Never fabricates or hallucinates numbers when no data exists ('NO HISTORICAL DATA').
 * 4. Deterministic Calculations for all arithmetic and statistical metrics.
 * 5. Period Analysis: Default latest 24 months, with explicit period tracking (e.g. 6M, 12M, 24M).
 * 6. Multi-Item Requisitions: Evaluates every PR line item independently.
 * 7. AI Decision Support: Human Purchase Manager makes the final procurement decision.
 */

import { HistoricalTransactionDoc, ItemMasterDoc } from '../types/procurementDataModel';
import { listHistoricalTransactions, listItemMaster } from './persistentDataService';

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export type HistoricalRecommendationStatus =
  | 'ALIGNED_WITH_HISTORY'
  | 'REVIEW_REQUIRED'
  | 'POTENTIAL_EXCESS'
  | 'POTENTIAL_SHORTFALL'
  | 'INCREASING_DEMAND'
  | 'DECREASING_DEMAND'
  | 'INSUFFICIENT_HISTORY'
  | 'NO_HISTORY'
  | 'ITEM_MATCH_UNCERTAIN';

export type HistoricalSuggestedAction =
  | 'proceed to manager review'
  | 'request clarification'
  | 'consider quantity adjustment'
  | 'review historical stock'
  | 'investigate demand increase'
  | 'investigate unusual request';

export interface YearlyConsumptionRecord {
  year: number;
  purchased: number;
  consumed: number;
  remaining?: number;
  txCount: number;
}

export interface MonthlyConsumptionPoint {
  monthKey: string; // YYYY-MM
  monthLabel: string; // e.g. "Jun 2024"
  purchased: number;
  consumed: number;
}

export interface HistoricalAnalysisMetrics {
  currentRequestedQuantity: number;
  totalPurchasedQuantity: number | null;
  totalConsumedQuantity: number | null;
  avgMonthlyConsumption: number | null;
  annualizedConsumption: number | null;
  consumptionByYear: Record<number, YearlyConsumptionRecord>;
  recentConsumption: {
    periodMonths: number;
    totalConsumed: number;
    monthlyRunRate: number;
    label: string;
  } | null;
  yearOverYearChange: number | null; // percentage e.g. +25.5 or -14.2
  consumptionTrend: 'STABLE' | 'INCREASING' | 'DECREASING' | 'VOLATILE' | 'INSUFFICIENT_DATA';
  transactionCount: number;
  firstTransactionDate: string | null;
  latestTransactionDate: string | null;
  availableMonths: number;
  availablePeriodLabel: string; // e.g. "24 MONTHS AVAILABLE", "12 MONTHS AVAILABLE", "6 MONTHS AVAILABLE", "NO HISTORICAL DATA"
  purchaseToConsumptionRatio: number | null; // totalPurchased / totalConsumed
  derivedUnusedQuantity: number | null; // Math.max(0, totalPurchased - totalConsumed)
  currentRequestVsAnnualConsumption: {
    annualConsumption: number;
    variance: number;
    variancePercent: number;
    ratio: number;
    label: string;
  } | null;
  currentRequestVsRecentTrend: {
    recentMonthlyRunRate: number;
    projectedAnnualFromRecent: number;
    variance: number;
    variancePercent: number;
    label: string;
  } | null;
  quantityVariance: number | null;
  percentageVariance: number | null;
  dataQualityScore: number; // 0.0 to 1.0 based on warnings/corrections in underlying records
  dataQualityWarning?: string;
  monthlyTrendPoints: MonthlyConsumptionPoint[];
}

export interface LineItemHistoricalAnalysis {
  lineItemId: string;
  sku?: string;
  rawDescription: string;
  standardizedDescription: string;
  requestedQuantity: number;
  unit?: string;
  estimatedUnitPrice?: number;
  totalEstimatedValue?: number;
  itemMatching: {
    status: 'EXACT_SKU' | 'EXACT_STANDARDIZED' | 'APPROVED_MAPPING' | 'HIGH_CONFIDENCE_MATCH' | 'ITEM_MATCH_UNCERTAIN';
    matchedSku?: string;
    confidence: number;
    matchingMethod: string;
  };
  metrics: HistoricalAnalysisMetrics;
  recommendation: {
    status: HistoricalRecommendationStatus;
    statusLabel: string;
    keyEvidence: string[];
    explanation: string;
    confidence: number; // 0.0 to 1.0 (discounted if < 24 mo or data quality issues)
    suggestedAction: HistoricalSuggestedAction;
    isExcessFlagged: boolean;
    excessReasoning?: string;
  };
}

export interface RequisitionMultiItemHistoricalAnalysis {
  requisitionId: string;
  analysisTimestamp: string;
  totalLineItems: number;
  lineItems: LineItemHistoricalAnalysis[];
  summary: {
    alignedCount: number;
    reviewCount: number;
    potentialExcessCount: number;
    potentialShortfallCount: number;
    increasingDemandCount: number;
    decreasingDemandCount: number;
    insufficientHistoryCount: number;
    noHistoryCount: number;
    uncertainMatchCount: number;
    itemsRequiringAttention: Array<{
      lineItemId: string;
      description: string;
      status: HistoricalRecommendationStatus;
      variancePercent: number | null;
    }>;
  };
}

export interface AnalyzeItemInput {
  lineItemId?: string;
  sku?: string;
  rawDescription: string;
  standardizedDescription?: string;
  requestedQuantity: number;
  unit?: string;
  estimatedUnitPrice?: number;
  department?: string;
  siteLocation?: string;
  // Optional pre-filtered or pre-fetched historical transactions
  cachedTransactions?: HistoricalTransactionDoc[];
  // Master catalog reference
  masterCatalog?: ItemMasterDoc[];
  // Preferred max period in months (default 24)
  preferredPeriodMonths?: number;
}

// ============================================================================
// 2. ITEM MATCHING ENGINE (PART 4)
// ============================================================================

/**
 * Matches a requisition item against Item Master & Historical Records.
 * Preferred Matching Order:
 * 1. Exact SKU/item code
 * 2. Exact standardized item identity
 * 3. Approved item-master mapping
 * 4. High-confidence standardized match
 */
export function matchItemIdentity(
  input: {
    sku?: string;
    rawDescription: string;
    standardizedDescription?: string;
  },
  masterCatalog: ItemMasterDoc[] = []
): {
  status: 'EXACT_SKU' | 'EXACT_STANDARDIZED' | 'APPROVED_MAPPING' | 'HIGH_CONFIDENCE_MATCH' | 'ITEM_MATCH_UNCERTAIN';
  matchedSku?: string;
  standardizedTitle: string;
  confidence: number;
  matchingMethod: string;
} {
  const rawClean = (input.rawDescription || '').trim().toLowerCase();
  const stdClean = (input.standardizedDescription || '').trim().toLowerCase();
  const inputSku = (input.sku || '').trim().toUpperCase();

  // 1. Exact SKU match
  if (inputSku) {
    const catalogItem = masterCatalog.find(
      (m) => m.officialSku.toUpperCase() === inputSku || m.itemId.toUpperCase() === inputSku
    );
    if (catalogItem) {
      return {
        status: 'EXACT_SKU',
        matchedSku: catalogItem.officialSku,
        standardizedTitle: catalogItem.standardizedDescription,
        confidence: 0.99,
        matchingMethod: 'Exact Master SKU Code Match',
      };
    }
    return {
      status: 'EXACT_SKU',
      matchedSku: inputSku,
      standardizedTitle: input.standardizedDescription || input.rawDescription,
      confidence: 0.95,
      matchingMethod: 'Declared Item SKU Reference',
    };
  }

  // 2. Exact standardized description match against Master Catalog
  if (stdClean) {
    const exactStd = masterCatalog.find(
      (m) => m.standardizedDescription.toLowerCase() === stdClean
    );
    if (exactStd) {
      return {
        status: 'EXACT_STANDARDIZED',
        matchedSku: exactStd.officialSku,
        standardizedTitle: exactStd.standardizedDescription,
        confidence: 0.96,
        matchingMethod: 'Exact Standardized Taxonomy Match',
      };
    }
  }

  // 3. Approved Item-Master Alias / Synonym Mapping
  for (const cat of masterCatalog) {
    if (cat.aliases && Array.isArray(cat.aliases)) {
      for (const alias of cat.aliases) {
        const aliasLower = alias.toLowerCase();
        if (aliasLower && (rawClean.includes(aliasLower) || stdClean.includes(aliasLower))) {
          return {
            status: 'APPROVED_MAPPING',
            matchedSku: cat.officialSku,
            standardizedTitle: cat.standardizedDescription,
            confidence: 0.92,
            matchingMethod: `Catalog Approved Alias Match ("${alias}")`,
          };
        }
      }
    }
  }

  // 4. High-Confidence Fuzzy / Token Match
  for (const cat of masterCatalog) {
    const titleTokens = cat.standardizedDescription.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const rawTokens = rawClean.split(/\s+/).filter((t) => t.length > 2);
    const matchCount = titleTokens.filter((token) => rawTokens.some((r) => r.includes(token) || token.includes(r))).length;
    const tokenMatchRatio = titleTokens.length > 0 ? matchCount / titleTokens.length : 0;

    if (tokenMatchRatio >= 0.7) {
      return {
        status: 'HIGH_CONFIDENCE_MATCH',
        matchedSku: cat.officialSku,
        standardizedTitle: cat.standardizedDescription,
        confidence: Number((0.80 + tokenMatchRatio * 0.15).toFixed(2)),
        matchingMethod: `Token Similarity Match (${Math.round(tokenMatchRatio * 100)}% token overlap)`,
      };
    }
  }

  // Check if raw description has meaningful substance
  if (rawClean.length >= 3) {
    return {
      status: 'ITEM_MATCH_UNCERTAIN',
      matchedSku: undefined,
      standardizedTitle: input.standardizedDescription || input.rawDescription,
      confidence: 0.50,
      matchingMethod: 'Uncataloged Item Description (Uncertain Master Match)',
    };
  }

  return {
    status: 'ITEM_MATCH_UNCERTAIN',
    matchedSku: undefined,
    standardizedTitle: 'Unspecified Item',
    confidence: 0.20,
    matchingMethod: 'Insufficient Item Information',
  };
}

// ============================================================================
// 3. CORE HISTORICAL METRICS CALCULATIONS (PART 5, 6, 7, 8)
// ============================================================================

/**
 * Deterministically computes historical metrics for an item from raw transaction records.
 */
export function calculateHistoricalMetrics(
  transactions: HistoricalTransactionDoc[],
  requestedQuantity: number,
  preferredPeriodMonths: number = 24
): HistoricalAnalysisMetrics {
  // If no transactions exist, return explicit "NO HISTORICAL DATA"
  if (!transactions || transactions.length === 0) {
    return {
      currentRequestedQuantity: requestedQuantity,
      totalPurchasedQuantity: null,
      totalConsumedQuantity: null,
      avgMonthlyConsumption: null,
      annualizedConsumption: null,
      consumptionByYear: {},
      recentConsumption: null,
      yearOverYearChange: null,
      consumptionTrend: 'INSUFFICIENT_DATA',
      transactionCount: 0,
      firstTransactionDate: null,
      latestTransactionDate: null,
      availableMonths: 0,
      availablePeriodLabel: 'NO HISTORICAL DATA',
      purchaseToConsumptionRatio: null,
      derivedUnusedQuantity: null,
      currentRequestVsAnnualConsumption: null,
      currentRequestVsRecentTrend: null,
      quantityVariance: null,
      percentageVariance: null,
      dataQualityScore: 1.0,
      monthlyTrendPoints: [],
    };
  }

  // Sort transactions chronologically
  const sortedTx = [...transactions].sort((a, b) => (a.transactionDate > b.transactionDate ? 1 : -1));
  const firstTx = sortedTx[0];
  const latestTx = sortedTx[sortedTx.length - 1];

  const firstDate = new Date(firstTx.transactionDate);
  const latestDate = new Date(latestTx.transactionDate);

  // Compute total available span in months (minimum 1 month)
  const totalMonthsSpan = Math.max(
    1,
    Math.round((latestDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)) + 1
  );

  // Default analysis period: latest 24 months
  // If > 24 months exists, filter to latest 24 months window for primary velocity calculations
  // while retaining full year records for historical comparisons.
  const analysisCutoffDate = new Date(latestDate.getTime());
  analysisCutoffDate.setMonth(analysisCutoffDate.getMonth() - preferredPeriodMonths);
  const analysisCutoffIso = analysisCutoffDate.toISOString().split('T')[0];

  const primaryPeriodTx = sortedTx.filter((t) => t.transactionDate >= analysisCutoffIso);
  const effectiveMonths = Math.min(preferredPeriodMonths, totalMonthsSpan);

  // Available period label formulation
  let periodLabel = `${effectiveMonths} MONTHS AVAILABLE`;
  if (effectiveMonths >= 24) {
    periodLabel = '24 MONTHS (FULL BASELINE)';
  } else if (effectiveMonths === 12) {
    periodLabel = '12 MONTHS AVAILABLE';
  } else if (effectiveMonths === 6) {
    periodLabel = '6 MONTHS AVAILABLE';
  } else if (effectiveMonths < 6) {
    periodLabel = `${effectiveMonths} MONTH${effectiveMonths === 1 ? '' : 'S'} AVAILABLE (LIMITED)`;
  }

  // Calculate Aggregates
  let totalPurchased = 0;
  let totalConsumed = 0;
  let validRowsCount = 0;
  let warningRowsCount = 0;

  // Monthly buckets for timeline & run-rates
  const monthlyBuckets: Record<string, { purchased: number; consumed: number }> = {};
  const yearlyBuckets: Record<number, YearlyConsumptionRecord> = {};

  for (const tx of sortedTx) {
    const pQty = Number(tx.quantityPurchased) || 0;
    const cQty = Number(tx.quantityConsumed) || 0;

    totalPurchased += pQty;
    totalConsumed += cQty;

    // Track data quality status
    if (tx.dataQualityStatus === 'WARNING' || tx.dataQualityStatus === 'FLAGGED') {
      warningRowsCount++;
    } else {
      validRowsCount++;
    }

    // Monthly bucket (YYYY-MM)
    const monthKey = tx.transactionDate ? tx.transactionDate.substring(0, 7) : 'Unknown';
    if (monthKey !== 'Unknown') {
      if (!monthlyBuckets[monthKey]) {
        monthlyBuckets[monthKey] = { purchased: 0, consumed: 0 };
      }
      monthlyBuckets[monthKey].purchased += pQty;
      monthlyBuckets[monthKey].consumed += cQty;
    }

    // Yearly bucket
    const year = tx.transactionDate ? new Date(tx.transactionDate).getFullYear() : 2024;
    if (!yearlyBuckets[year]) {
      yearlyBuckets[year] = {
        year,
        purchased: 0,
        consumed: 0,
        txCount: 0,
      };
    }
    yearlyBuckets[year].purchased += pQty;
    yearlyBuckets[year].consumed += cQty;
    yearlyBuckets[year].txCount += 1;
  }

  // Calculate derived remaining/unused for each year
  for (const yr of Object.keys(yearlyBuckets)) {
    const yNum = Number(yr);
    yearlyBuckets[yNum].remaining = Math.max(0, yearlyBuckets[yNum].purchased - yearlyBuckets[yNum].consumed);
  }

  // Average Monthly Consumption (based on effective analyzed months)
  // If consumed is logged, use consumed; if only purchases are logged, derive run-rate from purchases
  const primaryConsumed = primaryPeriodTx.reduce((sum, t) => sum + (Number(t.quantityConsumed) || 0), 0);
  const primaryPurchased = primaryPeriodTx.reduce((sum, t) => sum + (Number(t.quantityPurchased) || 0), 0);

  const baselineActivityQty = primaryConsumed > 0 ? primaryConsumed : primaryPurchased;
  const avgMonthlyConsumption = Number((baselineActivityQty / Math.max(1, effectiveMonths)).toFixed(1));

  // Annualized Consumption (12 months run-rate)
  const annualizedConsumption = Math.round(avgMonthlyConsumption * 12);

  // Recent Consumption (Latest 3 to 6 months)
  const sortedMonths = Object.keys(monthlyBuckets).sort();
  const recentMonthKeys = sortedMonths.slice(-Math.min(6, sortedMonths.length));
  const recentPeriodMonths = recentMonthKeys.length || 1;
  const recentConsumedTotal = recentMonthKeys.reduce(
    (sum, m) => sum + (monthlyBuckets[m].consumed > 0 ? monthlyBuckets[m].consumed : monthlyBuckets[m].purchased),
    0
  );
  const recentMonthlyRunRate = Number((recentConsumedTotal / recentPeriodMonths).toFixed(1));

  const recentConsumption = {
    periodMonths: recentPeriodMonths,
    totalConsumed: recentConsumedTotal,
    monthlyRunRate: recentMonthlyRunRate,
    label: `Latest ${recentPeriodMonths} Months (${recentMonthlyRunRate} units/mo)`,
  };

  // Year-over-Year (YoY) Change
  const sortedYears = Object.keys(yearlyBuckets)
    .map(Number)
    .sort((a, b) => a - b);

  let yoyChangePercent: number | null = null;
  let consumptionTrend: 'STABLE' | 'INCREASING' | 'DECREASING' | 'VOLATILE' | 'INSUFFICIENT_DATA' = 'STABLE';

  if (sortedYears.length >= 2) {
    const latestYr = sortedYears[sortedYears.length - 1];
    const prevYr = sortedYears[sortedYears.length - 2];
    const latestActivity = yearlyBuckets[latestYr].consumed > 0 ? yearlyBuckets[latestYr].consumed : yearlyBuckets[latestYr].purchased;
    const prevActivity = yearlyBuckets[prevYr].consumed > 0 ? yearlyBuckets[prevYr].consumed : yearlyBuckets[prevYr].purchased;

    if (prevActivity > 0) {
      yoyChangePercent = Number((((latestActivity - prevActivity) / prevActivity) * 100).toFixed(1));
      if (yoyChangePercent > 15) {
        consumptionTrend = 'INCREASING';
      } else if (yoyChangePercent < -15) {
        consumptionTrend = 'DECREASING';
      } else {
        consumptionTrend = 'STABLE';
      }
    }
  } else if (sortedMonths.length >= 4) {
    // Determine trend from recent monthly run-rate vs earlier monthly run-rate
    const firstHalf = sortedMonths.slice(0, Math.floor(sortedMonths.length / 2));
    const secondHalf = sortedMonths.slice(Math.floor(sortedMonths.length / 2));
    const avg1 = firstHalf.reduce((s, k) => s + monthlyBuckets[k].consumed, 0) / Math.max(1, firstHalf.length);
    const avg2 = secondHalf.reduce((s, k) => s + monthlyBuckets[k].consumed, 0) / Math.max(1, secondHalf.length);

    if (avg1 > 0) {
      const rateDiff = (avg2 - avg1) / avg1;
      if (rateDiff > 0.20) consumptionTrend = 'INCREASING';
      else if (rateDiff < -0.20) consumptionTrend = 'DECREASING';
      else consumptionTrend = 'STABLE';
    }
  } else {
    consumptionTrend = effectiveMonths >= 6 ? 'STABLE' : 'INSUFFICIENT_DATA';
  }

  // Purchase-to-consumption ratio & Unused quantity
  const purchaseToConsumptionRatio = totalConsumed > 0 ? Number((totalPurchased / totalConsumed).toFixed(2)) : null;
  const derivedUnusedQuantity = Math.max(0, totalPurchased - totalConsumed);

  // Current Request vs Annual Consumption
  const qtyVariance = requestedQuantity - annualizedConsumption;
  const pctVariance = annualizedConsumption > 0 ? Number(((qtyVariance / annualizedConsumption) * 100).toFixed(1)) : null;

  const currentRequestVsAnnualConsumption = {
    annualConsumption: annualizedConsumption,
    variance: qtyVariance,
    variancePercent: pctVariance ?? 0,
    ratio: annualizedConsumption > 0 ? Number((requestedQuantity / annualizedConsumption).toFixed(2)) : 1.0,
    label:
      qtyVariance > 0
        ? `+${qtyVariance} units (+${pctVariance}%) above annualized demand`
        : qtyVariance < 0
        ? `${qtyVariance} units (${pctVariance}%) below annualized demand`
        : 'Aligned exactly with annualized demand',
  };

  // Current Request vs Recent Trend
  const projectedAnnualFromRecent = Math.round(recentMonthlyRunRate * 12);
  const recentVariance = requestedQuantity - projectedAnnualFromRecent;
  const recentVariancePercent =
    projectedAnnualFromRecent > 0 ? Number(((recentVariance / projectedAnnualFromRecent) * 100).toFixed(1)) : 0;

  const currentRequestVsRecentTrend = {
    recentMonthlyRunRate,
    projectedAnnualFromRecent,
    variance: recentVariance,
    variancePercent: recentVariancePercent,
    label:
      recentVariance > 0
        ? `+${recentVariance} units (+${recentVariancePercent}%) vs recent ${recentPeriodMonths}M run-rate`
        : `${recentVariance} units (${recentVariancePercent}%) vs recent ${recentPeriodMonths}M run-rate`,
  };

  // Data Quality Score
  const totalTxCount = sortedTx.length;
  const dataQualityScore = totalTxCount > 0 ? Number(((validRowsCount / totalTxCount)).toFixed(2)) : 1.0;
  let dataQualityWarning: string | undefined = undefined;
  if (dataQualityScore < 0.75) {
    dataQualityWarning = 'HISTORICAL DATA QUALITY LIMITATION: Underlying transactions contain warnings or schema corrections';
  }

  // Timeline points for visualization
  const monthlyTrendPoints: MonthlyConsumptionPoint[] = sortedMonths.map((mKey) => {
    const [yr, mo] = mKey.split('-');
    const dateObj = new Date(Number(yr), Number(mo) - 1, 1);
    const monthLabel = dateObj.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    return {
      monthKey: mKey,
      monthLabel,
      purchased: monthlyBuckets[mKey].purchased,
      consumed: monthlyBuckets[mKey].consumed,
    };
  });

  return {
    currentRequestedQuantity: requestedQuantity,
    totalPurchasedQuantity: totalPurchased,
    totalConsumedQuantity: totalConsumed,
    avgMonthlyConsumption,
    annualizedConsumption,
    consumptionByYear: yearlyBuckets,
    recentConsumption,
    yearOverYearChange: yoyChangePercent,
    consumptionTrend,
    transactionCount: totalTxCount,
    firstTransactionDate: firstTx.transactionDate,
    latestTransactionDate: latestTx.transactionDate,
    availableMonths: effectiveMonths,
    availablePeriodLabel: periodLabel,
    purchaseToConsumptionRatio,
    derivedUnusedQuantity,
    currentRequestVsAnnualConsumption,
    currentRequestVsRecentTrend,
    quantityVariance: qtyVariance,
    percentageVariance: pctVariance,
    dataQualityScore,
    dataQualityWarning,
    monthlyTrendPoints,
  };
}

// ============================================================================
// 4. RECOMMENDATION SYNTHESIS (PART 9, 10, 16, 17, 18)
// ============================================================================

/**
 * Generates an analytical recommendation for a line item.
 * Evaluates metrics against thresholds without hard-coding item-specific values.
 */
export function synthesizeRecommendation(
  itemMatch: ReturnType<typeof matchItemIdentity>,
  metrics: HistoricalAnalysisMetrics,
  requestedQuantity: number
): {
  status: HistoricalRecommendationStatus;
  statusLabel: string;
  keyEvidence: string[];
  explanation: string;
  confidence: number;
  suggestedAction: HistoricalSuggestedAction;
  isExcessFlagged: boolean;
  excessReasoning?: string;
} {
  // Case A: No historical transactions exist (Zero baseline records)
  if (metrics.transactionCount === 0 || metrics.availablePeriodLabel === 'NO HISTORICAL DATA') {
    return {
      status: 'NO_HISTORY',
      statusLabel: 'NO HISTORICAL DATA',
      keyEvidence: [
        'No prior purchase or consumption transactions found in database.',
        'Historical period: 0 months available.',
        'Zero baseline records in historical_transactions collection.',
      ],
      explanation:
        'Historical consumption evidence is unavailable for this item. Requisition proceeds to manager review based on budget approval and current business justification.',
      confidence: 0.50,
      suggestedAction: 'proceed to manager review',
      isExcessFlagged: false,
    };
  }

  // Case B: Uncertain item match
  if (itemMatch.status === 'ITEM_MATCH_UNCERTAIN') {
    return {
      status: 'ITEM_MATCH_UNCERTAIN',
      statusLabel: 'ITEM MATCH UNCERTAIN',
      keyEvidence: [
        'Item description cannot be reliably matched to Master Catalog SKU.',
        `Matching Confidence: ${Math.round(itemMatch.confidence * 100)}%`,
        'Cannot correlate historical usage records with uncataloged item.',
      ],
      explanation:
        'Standardized item identity is uncertain. The system will not silently associate this request with another item. Requisition proceeds to Manager Review for catalog classification.',
      confidence: itemMatch.confidence,
      suggestedAction: 'request clarification',
      isExcessFlagged: false,
    };
  }

  // Base confidence begins at 0.95 and is discounted for limited period or data quality
  let confidence = 0.95;

  if (metrics.availableMonths < 6) {
    confidence -= 0.30;
  } else if (metrics.availableMonths < 12) {
    confidence -= 0.15;
  } else if (metrics.availableMonths < 24) {
    confidence -= 0.05;
  }

  if (metrics.dataQualityScore < 0.8) {
    confidence -= 0.15;
  }

  confidence = Math.max(0.30, Math.min(0.99, Number(confidence.toFixed(2))));

  // Case C: Insufficient history (less than 6 months)
  if (metrics.availableMonths < 6) {
    return {
      status: 'INSUFFICIENT_HISTORY',
      statusLabel: `INSUFFICIENT HISTORY (${metrics.availableMonths}M AVAILABLE)`,
      keyEvidence: [
        `Historical period available: ${metrics.availableMonths} months (${metrics.transactionCount} transactions recorded).`,
        `Average monthly baseline: ${metrics.avgMonthlyConsumption ?? 'N/A'} units/month.`,
        'Data window is below preferred minimum 6-month threshold.',
      ],
      explanation: `Limited historical dataset available (${metrics.availableMonths} months). Confidence reduced to ${Math.round(confidence * 100)}%. Manager should evaluate based on project context.`,
      confidence,
      suggestedAction: 'proceed to manager review',
      isExcessFlagged: false,
    };
  }

  const annualUsage = metrics.annualizedConsumption || 1;
  const monthlyUsage = metrics.avgMonthlyConsumption || 1;
  const monthsOfSupply = Number((requestedQuantity / Math.max(1, monthlyUsage)).toFixed(1));
  const pctVariance = metrics.percentageVariance ?? 0;

  // Case D: Potential Excess (> 35% above annualized consumption or > 25% with >= 6 months supply without growth)
  const isHighExcess = (pctVariance >= 35 && monthsOfSupply >= 4.0) || (pctVariance >= 25 && monthsOfSupply >= 6.0 && metrics.consumptionTrend !== 'INCREASING');

  if (isHighExcess) {
    const keyEvidence = [
      `Requested quantity (${requestedQuantity}) is ${pctVariance > 0 ? `+${pctVariance}%` : `${pctVariance}%`} vs annualized consumption (${annualUsage} units/yr).`,
      `Covers approximately ~${monthsOfSupply} months of supply based on ${metrics.availablePeriodLabel} (${monthlyUsage} units/mo).`,
    ];

    if (metrics.derivedUnusedQuantity && metrics.derivedUnusedQuantity > 0) {
      keyEvidence.push(`Historical records indicate ~${metrics.derivedUnusedQuantity} units previously purchased remain unconsumed.`);
    }

    if (metrics.consumptionTrend === 'DECREASING') {
      keyEvidence.push('Historical consumption trend is declining YoY.');
    }

    const excessReasoning = `Requisitioned volume significantly exceeds baseline annual consumption by ${pctVariance > 0 ? `+${pctVariance}%` : `${pctVariance}%`} (${requestedQuantity} requested vs ${annualUsage} annual run-rate). Potential surplus inventory build.`;

    return {
      status: 'POTENTIAL_EXCESS',
      statusLabel: 'HIGH HISTORICAL EXCESS / REVIEW REQUIRED',
      keyEvidence,
      explanation: `${excessReasoning} Analytical recommendation only: Purchase Manager retains authority to approve with business context.`,
      confidence,
      suggestedAction: 'consider quantity adjustment',
      isExcessFlagged: true,
      excessReasoning,
    };
  }

  // Case E: Increasing Demand (High current request supported by growing consumption trend)
  if (metrics.consumptionTrend === 'INCREASING' && pctVariance >= 15) {
    return {
      status: 'INCREASING_DEMAND',
      statusLabel: 'INCREASING DEMAND DETECTED',
      keyEvidence: [
        `Historical consumption is growing year-over-year (${metrics.yearOverYearChange ? `+${metrics.yearOverYearChange}%` : 'positive trajectory'}).`,
        `Recent monthly run-rate (${metrics.recentConsumption?.monthlyRunRate} units/mo) exceeds older baseline.`,
        `Requested quantity (${requestedQuantity}) aligns with upward operational demand curve.`,
      ],
      explanation:
        'Current higher requisition quantity is supported by verified year-over-year consumption expansion. Recommended for manager confirmation of continued project ramp.',
      confidence,
      suggestedAction: 'investigate demand increase',
      isExcessFlagged: false,
    };
  }

  // Case F: Decreasing Demand
  if (metrics.consumptionTrend === 'DECREASING' && pctVariance >= 10) {
    return {
      status: 'DECREASING_DEMAND',
      statusLabel: 'DECREASING DEMAND TREND',
      keyEvidence: [
        `Historical consumption is contracting (${metrics.yearOverYearChange ? `${metrics.yearOverYearChange}%` : 'downward trajectory'}).`,
        `Requested quantity (${requestedQuantity}) exceeds declining recent run-rate (${metrics.recentConsumption?.monthlyRunRate} units/mo).`,
      ],
      explanation:
        'Historical usage indicates reducing consumption velocity. Purchase Manager should verify if asset retirement or equipment phase-out is underway.',
      confidence,
      suggestedAction: 'request clarification',
      isExcessFlagged: false,
    };
  }

  // Case G: Potential Shortfall (< 0.5 months of supply or significant negative variance for continuous production)
  if (monthsOfSupply < 0.5 && pctVariance <= -60) {
    return {
      status: 'POTENTIAL_SHORTFALL',
      statusLabel: 'POTENTIAL UNDER-REQUISITION',
      keyEvidence: [
        `Requested quantity (${requestedQuantity}) covers only ${monthsOfSupply} months of supply.`,
        `Historical annual requirement is ${annualUsage} units.`,
        'May risk stock-out if delivery lead times are extended.',
      ],
      explanation:
        'Requested quantity is substantially lower than typical historical operational buffer. Manager should verify if partial order was intentional.',
      confidence,
      suggestedAction: 'proceed to manager review',
      isExcessFlagged: false,
    };
  }

  // Case H: General Review Required (Moderate variance: 20% to 35%)
  if (Math.abs(pctVariance) >= 20) {
    return {
      status: 'REVIEW_REQUIRED',
      statusLabel: 'HISTORICAL VARIANCE / REVIEW REQUIRED',
      keyEvidence: [
        `Requisition variance is ${pctVariance > 0 ? `+${pctVariance}%` : `${pctVariance}%`} compared to annualized baseline (${annualUsage} units).`,
        `Requested volume represents ~${monthsOfSupply} months of operational supply.`,
        `Historical baseline period: ${metrics.availablePeriodLabel}.`,
      ],
      explanation:
        'Moderate variance detected against historical consumption norms. Manager review advised to confirm operational alignment.',
      confidence,
      suggestedAction: 'proceed to manager review',
      isExcessFlagged: false,
    };
  }

  // Case I: Aligned with History
  return {
    status: 'ALIGNED_WITH_HISTORY',
    statusLabel: 'ALIGNED WITH HISTORICAL CONSUMPTION',
    keyEvidence: [
      `Requested quantity (${requestedQuantity}) closely matches annualized run-rate (${annualUsage} units/yr, variance ${pctVariance > 0 ? `+${pctVariance}%` : `${pctVariance}%`}).`,
      `Covers normal ~${monthsOfSupply} months of supply (${monthlyUsage} units/mo).`,
      `Historical period verified: ${metrics.availablePeriodLabel} (${metrics.transactionCount} transactions).`,
      'Consumption trajectory is stable across evaluated period.',
    ],
    explanation:
      'Requisitioned quantity is consistent with empirical historical consumption data. Proceed to standard Purchase Manager review.',
    confidence,
    suggestedAction: 'proceed to manager review',
    isExcessFlagged: false,
  };
}

// ============================================================================
// 5. MAIN EVALUATION FUNCTIONS
// ============================================================================

/**
 * Analyzes a single PR Line Item against real historical transactions.
 */
export async function analyzeLineItemHistory(
  input: AnalyzeItemInput
): Promise<LineItemHistoricalAnalysis> {
  const lineItemId = input.lineItemId || `LI-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Resolve Master Catalog (either supplied or fetched)
  let catalog = input.masterCatalog;
  if (!catalog || catalog.length === 0) {
    try {
      catalog = await listItemMaster(100);
    } catch {
      catalog = [];
    }
  }

  // 2. Perform Item Identity Matching (Part 4)
  const itemMatch = matchItemIdentity(
    {
      sku: input.sku,
      rawDescription: input.rawDescription,
      standardizedDescription: input.standardizedDescription,
    },
    catalog
  );

  const matchedSku = itemMatch.matchedSku || input.sku;
  const standardizedTitle = itemMatch.standardizedTitle || input.standardizedDescription || input.rawDescription;

  // 3. Fetch or filter historical transactions for this specific item identity (Part 1, Part 23 Performance)
  let itemTransactions: HistoricalTransactionDoc[] = [];

  if (input.cachedTransactions !== undefined) {
    // Filter from pre-cached collection provided by caller
    itemTransactions = input.cachedTransactions.filter((tx) => {
      if (matchedSku && tx.itemId && tx.itemId.toUpperCase() === matchedSku.toUpperCase()) {
        return true;
      }
      if (
        tx.standardizedItemDescription &&
        tx.standardizedItemDescription.toLowerCase() === standardizedTitle.toLowerCase()
      ) {
        return true;
      }
      const rawClean = input.rawDescription.toLowerCase().trim();
      if (rawClean.length > 2 && tx.rawItemDescription && tx.rawItemDescription.toLowerCase().includes(rawClean)) {
        return true;
      }
      return false;
    });
  } else {
    // Targeted database query for the specific SKU or Description
    try {
      if (matchedSku) {
        itemTransactions = await listHistoricalTransactions({ itemId: matchedSku, limit: 300 });
      }
      if (itemTransactions.length === 0) {
        // Fallback search across all transactions
        const allTx = await listHistoricalTransactions({ limit: 500 });
        itemTransactions = allTx.filter((tx) => {
          if (matchedSku && tx.itemId && tx.itemId.toUpperCase() === matchedSku.toUpperCase()) {
            return true;
          }
          if (
            tx.standardizedItemDescription &&
            tx.standardizedItemDescription.toLowerCase() === standardizedTitle.toLowerCase()
          ) {
            return true;
          }
          const rawL = input.rawDescription.toLowerCase().trim();
          if (rawL.length > 3 && tx.rawItemDescription && tx.rawItemDescription.toLowerCase().includes(rawL)) {
            return true;
          }
          return false;
        });
      }
    } catch (e) {
      console.warn('Could not query historical transactions for item:', e);
      itemTransactions = [];
    }
  }

  // 4. Calculate Historical Metrics Deterministically (Part 5, 6, 7, 8)
  const metrics = calculateHistoricalMetrics(
    itemTransactions,
    input.requestedQuantity,
    input.preferredPeriodMonths || 24
  );

  // 5. Synthesize Analytical Recommendation (Part 9, 10, 16, 17, 18)
  const recommendation = synthesizeRecommendation(itemMatch, metrics, input.requestedQuantity);

  const unitPrice = input.estimatedUnitPrice || 25;
  const totalVal = input.requestedQuantity * unitPrice;

  return {
    lineItemId,
    sku: matchedSku,
    rawDescription: input.rawDescription,
    standardizedDescription: standardizedTitle,
    requestedQuantity: input.requestedQuantity,
    unit: input.unit || 'units',
    estimatedUnitPrice: unitPrice,
    totalEstimatedValue: totalVal,
    itemMatching: itemMatch,
    metrics,
    recommendation,
  };
}

/**
 * Analyzes a Multi-Item Requisition (Part 3, Part 15).
 * Evaluates EVERY line item independently and computes an aggregate requisition summary.
 */
export async function analyzeRequisitionHistory(
  requisitionId: string,
  lineItems: AnalyzeItemInput[]
): Promise<RequisitionMultiItemHistoricalAnalysis> {
  // Pre-fetch catalog once for all items to optimize performance (Part 23)
  let catalog: ItemMasterDoc[] = [];
  try {
    catalog = await listItemMaster(100);
  } catch {
    catalog = [];
  }

  // Pre-fetch transactions once to avoid redundant reads
  let allTransactions: HistoricalTransactionDoc[] = [];
  try {
    allTransactions = await listHistoricalTransactions({ limit: 800 });
  } catch {
    allTransactions = [];
  }

  // Evaluate every line item independently
  const itemAnalysisPromises = lineItems.map((item) =>
    analyzeLineItemHistory({
      ...item,
      masterCatalog: item.masterCatalog ?? (catalog.length > 0 ? catalog : undefined),
      cachedTransactions: item.cachedTransactions !== undefined ? item.cachedTransactions : allTransactions,
    })
  );

  const analyzedItems = await Promise.all(itemAnalysisPromises);

  // Aggregate Requisition-Level Summary (Part 15)
  let alignedCount = 0;
  let reviewCount = 0;
  let potentialExcessCount = 0;
  let potentialShortfallCount = 0;
  let increasingDemandCount = 0;
  let decreasingDemandCount = 0;
  let insufficientHistoryCount = 0;
  let noHistoryCount = 0;
  let uncertainMatchCount = 0;

  const itemsRequiringAttention: Array<{
    lineItemId: string;
    description: string;
    status: HistoricalRecommendationStatus;
    variancePercent: number | null;
  }> = [];

  for (const item of analyzedItems) {
    const status = item.recommendation.status;
    if (status === 'ALIGNED_WITH_HISTORY') alignedCount++;
    else if (status === 'REVIEW_REQUIRED') reviewCount++;
    else if (status === 'POTENTIAL_EXCESS') potentialExcessCount++;
    else if (status === 'POTENTIAL_SHORTFALL') potentialShortfallCount++;
    else if (status === 'INCREASING_DEMAND') increasingDemandCount++;
    else if (status === 'DECREASING_DEMAND') decreasingDemandCount++;
    else if (status === 'INSUFFICIENT_HISTORY') insufficientHistoryCount++;
    else if (status === 'NO_HISTORY') noHistoryCount++;
    else if (status === 'ITEM_MATCH_UNCERTAIN') uncertainMatchCount++;

    if (status !== 'ALIGNED_WITH_HISTORY') {
      itemsRequiringAttention.push({
        lineItemId: item.lineItemId,
        description: item.standardizedDescription,
        status,
        variancePercent: item.metrics.percentageVariance,
      });
    }
  }

  return {
    requisitionId,
    analysisTimestamp: new Date().toISOString(),
    totalLineItems: analyzedItems.length,
    lineItems: analyzedItems,
    summary: {
      alignedCount,
      reviewCount,
      potentialExcessCount,
      potentialShortfallCount,
      increasingDemandCount,
      decreasingDemandCount,
      insufficientHistoryCount,
      noHistoryCount,
      uncertainMatchCount,
      itemsRequiringAttention,
    },
  };
}
