import {
  PurchaseRequest,
  Gate1Result,
  Gate2Result,
  Gate3Result,
  Gate4Result,
  AIDecisionResult,
  DecisionType,
} from '../types/procurement';
import {
  ITEM_MASTER_CATALOG,
  DEPARTMENT_BUDGETS,
  MasterCatalogItem,
} from '../data/mockProcurementData';
import { evaluateProcurementDecision } from './decisionEngine';
import {
  matchItemIdentity,
  calculateHistoricalMetrics,
  synthesizeRecommendation,
  analyzeLineItemHistory,
} from './historicalAnalysisEngine';
import { HistoricalTransactionDoc, ItemMasterDoc } from '../types/procurementDataModel';

export function analyzePurchaseRequest(input: Partial<PurchaseRequest>): {
  gate1: Gate1Result;
  gate2: Gate2Result;
  gate3: Gate3Result;
  gate4: Gate4Result;
  decisionResult: AIDecisionResult;
} {
  const rawText = (input.itemDescription || '').trim();
  const quantity = Math.max(1, Number(input.quantity) || 1);
  const dept = input.department || 'IT / Technology';
  const unitPrice = Math.max(1, Number(input.estimatedPrice) || 25);
  const totalCost = quantity * unitPrice;

  // 1. GATE 1: AI Cleaning & Standardization
  let matchedItem: MasterCatalogItem = ITEM_MASTER_CATALOG[0];
  const typosFound: string[] = [];

  const lower = rawText.toLowerCase();
  if (lower.includes('helm') || lower.includes('saftey') || lower.includes('safety')) {
    matchedItem = ITEM_MASTER_CATALOG[1]; // Helmet
    if (lower.includes('saftey')) typosFound.push('Typo: "saftey" corrected to "Safety"');
    if (lower.includes('helms')) typosFound.push('Informal: "helms" standardized to "Safety Helmet"');
    if (lower.includes('refit')) typosFound.push('Project context tagged: Site Refit Project');
  } else if (lower.includes('pip') || lower.includes('steele') || lower.includes('steel') || lower.includes('3in')) {
    matchedItem = ITEM_MASTER_CATALOG[2]; // Pipe
    if (lower.includes('steele')) typosFound.push('Typo: "steele" corrected to "steel"');
    if (lower.includes('pip')) typosFound.push('Truncation: "pip" expanded to "pipe"');
    if (lower.includes('3in')) typosFound.push('Specification: "3in" expanded to "3-inch carbon-steel pipe"');
    if (lower.includes('50 count') || lower.includes('count')) typosFound.push('Unit extraction: extracted numeric quantity');
  } else if (lower.includes('chair') || lower.includes('ergo') || lower.includes('desk')) {
    matchedItem = ITEM_MASTER_CATALOG[3]; // Chair
    typosFound.push('Standardized to ergonomic master catalog specification');
  } else if (lower.includes('hydraul') || lower.includes('seal') || lower.includes('kit')) {
    matchedItem = {
      sku: '#HYD-SEAL-09',
      officialTitle: 'Hydraulic Seal Kit',
      category: 'Hydraulics & Seals',
      glCode: '5140',
      glName: 'Machine Components',
      standardUnitPrice: 75,
      avgMonthlyConsumption: 8,
      localWarehouseStock: 0,
      sisterSiteStock: [
        { siteId: 'WH-B', siteName: 'Warehouse B', quantity: 15, status: 'reserve' },
      ],
      warehouses: [
        { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 0, location: 'Local Central Depot', stockStatus: 'Out of Stock', isLocal: true },
        { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 15, location: 'Plant 4 Storage, Bay 7', stockStatus: 'Reserved', isLocal: false },
        { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 0, location: 'Regional Yard C', stockStatus: 'Out of Stock', isLocal: false },
      ],
      preceding90Days: [
        { month: 'Jun', usage: 7 },
        { month: 'Jul', usage: 9 },
        { month: 'Aug', usage: 8 },
      ],
    };
    typosFound.push('Mapped to ISO-4406 fluid seal specs');
  } else {
    // Default / Charger
    matchedItem = ITEM_MASTER_CATALOG[0];
    if (lower.includes('65w') && !lower.includes('usb-c')) {
      typosFound.push('Added missing interface protocol: "USB-C Type"');
    }
  }

  const gate1: Gate1Result = {
    originalInput: rawText || 'Unspecified Item',
    standardized: matchedItem.officialTitle,
    matchedItemCode: matchedItem.sku.replace('#', ''),
    category: matchedItem.category,
    glCode: `${matchedItem.glCode} • ${matchedItem.glName}`,
    confidenceScore: 0.98,
    typosCorrected: typosFound.length > 0 ? typosFound : ['Casing and terminology standardized against item master'],
  };

  // 2. GATE 2: Budget Check
  const availableBudget = DEPARTMENT_BUDGETS[dept] ?? 1000;
  const variance = totalCost - availableBudget;
  const remainingBudget = Math.max(0, availableBudget - totalCost);
  let gate2Status: 'Passed' | 'Warning' | 'Failed' = 'Passed';
  let gate2Message = 'Within approved department ceiling';

  if (variance > 0) {
    if (variance > availableBudget * 1.5) {
      gate2Status = 'Failed';
      gate2Message = `Budget exceeded by $${variance.toLocaleString()} (Available: $${availableBudget.toLocaleString()})`;
    } else {
      gate2Status = 'Warning';
      gate2Message = `Budget exceeded by $${variance.toLocaleString()} ($${totalCost.toLocaleString()} cost vs $${availableBudget.toLocaleString()} available)`;
    }
  }

  const gate2: Gate2Result = {
    estimatedCost: totalCost,
    availableBudget,
    status: gate2Status,
    variance: Math.max(0, variance),
    remainingBudget,
    message: gate2Message,
  };

  // 3. GATE 3: Inventory / Warehouse Search
  const warehousesList = matchedItem.warehouses || [
    { warehouseId: 'WH-A', name: 'Warehouse A', quantity: matchedItem.localWarehouseStock, location: 'Local Depot Yard', stockStatus: matchedItem.localWarehouseStock > 0 ? 'In Stock' : 'Out of Stock', isLocal: true },
    { warehouseId: 'WH-B', name: 'Warehouse B', quantity: matchedItem.sisterSiteStock[0]?.quantity ?? 0, location: 'Logistics Depot North', stockStatus: 'Excess / Idle', isLocal: false },
    { warehouseId: 'WH-C', name: 'Warehouse C', quantity: matchedItem.sisterSiteStock[1]?.quantity ?? 0, location: 'Central Distribution Yard', stockStatus: 'Reserved', isLocal: false },
  ];

  const otherSitesStock = matchedItem.sisterSiteStock;
  const totalSisterStock = otherSitesStock.reduce((acc, s) => acc + s.quantity, 0);
  const localStock = matchedItem.localWarehouseStock;
  const totalAvailableAcrossWarehouses = warehousesList.reduce((sum, w) => sum + (w.stockStatus !== 'Reserved' ? w.quantity : 0), 0);

  let gate3Status: 'Found' | 'Not Found' | 'Partial' = 'Not Found';
  let recommendedTransferQuantity = 0;

  if (totalSisterStock > 0 || totalAvailableAcrossWarehouses > 0) {
    gate3Status = 'Found';
    recommendedTransferQuantity = Math.min(quantity, totalSisterStock);
  }

  const transferSource = warehousesList.find(w => !w.isLocal && (w.stockStatus === 'Excess / Idle' || w.quantity > 0));
  const transferRecommendation = recommendedTransferQuantity > 0
    ? `Transfer ${recommendedTransferQuantity} units from ${transferSource?.name || 'Warehouse B'} (${transferSource?.location || 'Regional Depot'}) to satisfy request without external PO expenditure.`
    : 'No internal idle inventory available for inter-warehouse transfer. Standard external PO recommended.';

  const gate3: Gate3Result = {
    localWarehouseName: 'Warehouse A',
    localAvailable: localStock,
    otherSites: otherSitesStock,
    warehouses: warehousesList,
    totalSisterStock,
    status: gate3Status,
    recommendedTransferQuantity,
    transferRecommendation,
  };

  // 4. GATE 4: Upgraded Historical Consumption & Requirement Analysis Engine (Stage 1 & Stage 2)
  const avgMonthlyUsage = matchedItem.avgMonthlyConsumption || 10;
  const monthsOfSupply = Number((quantity / Math.max(1, avgMonthlyUsage)).toFixed(1));

  // Synthesize 24-month historical metrics based on item's monthly velocity
  const baselineTxs: HistoricalTransactionDoc[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const txDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const dateIso = txDate.toISOString().split('T')[0];
    const isRecent = i < 3;
    const monthlyVariance = 0.85 + ((i * 7) % 30) / 100;
    const pQty = Math.round(avgMonthlyUsage * monthlyVariance);
    const cQty = Math.round(avgMonthlyUsage * monthlyVariance * 0.95);

    baselineTxs.push({
      transactionId: `TX-HIST-${matchedItem.sku}-${i}`,
      importBatchId: 'BATCH-INITIAL-DATA',
      originalFileId: 'FILE-SYSTEM-MASTER',
      rowIndex: i + 1,
      transactionDate: dateIso,
      itemId: matchedItem.sku.replace('#', ''),
      rawItemDescription: rawText || matchedItem.officialTitle,
      standardizedItemDescription: matchedItem.officialTitle,
      quantityPurchased: pQty,
      quantityConsumed: cQty,
      unit: 'EA',
      siteLocation: 'Plant-A Regional Depot',
      department: dept,
      dataQualityStatus: 'VALID',
      createdAt: dateIso,
    });
  }

  const histMetrics = calculateHistoricalMetrics(baselineTxs, quantity, 24);
  const catalogItem: ItemMasterDoc = {
    itemId: matchedItem.sku.replace('#', ''),
    officialSku: matchedItem.sku.replace('#', ''),
    standardizedDescription: matchedItem.officialTitle,
    unspscCategory: matchedItem.category,
    glCode: matchedItem.glCode,
    avgMonthlyConsumption: matchedItem.avgMonthlyConsumption,
    active: true,
    aliases: [matchedItem.officialTitle.toLowerCase(), rawText.toLowerCase()],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const itemMatch = matchItemIdentity(
    {
      sku: matchedItem.sku.replace('#', ''),
      rawDescription: rawText,
      standardizedDescription: matchedItem.officialTitle,
    },
    [catalogItem]
  );

  const rec = synthesizeRecommendation(itemMatch, histMetrics, quantity);

  let gate4Status: 'Optimal' | 'High' | 'Low' = 'Optimal';
  let usageMsg = `Normal run-rate (~${monthsOfSupply} months of supply)`;

  if (rec.status === 'POTENTIAL_EXCESS') {
    gate4Status = 'High';
    usageMsg = `Requested volume (${quantity}) represents ~${monthsOfSupply} months of supply (${avgMonthlyUsage} units/mo baseline)`;
  } else if (rec.status === 'POTENTIAL_SHORTFALL') {
    gate4Status = 'Low';
    usageMsg = 'Below typical minimum maintenance safety buffer';
  }

  // Recommended external quantity is requested quantity minus any transferred idle units
  const recommendedQuantity = Math.max(0, quantity - recommendedTransferQuantity);

  const gate4: Gate4Result = {
    avgMonthlyUsage,
    requestedQuantity: quantity,
    monthsOfSupply,
    recommendedQuantity: recommendedQuantity === 0 && recommendedTransferQuantity > 0 ? 0 : (recommendedQuantity || Math.min(quantity, Math.ceil(avgMonthlyUsage * 2))),
    status: gate4Status,
    usageFlagMessage: usageMsg,
    preceding90Days: matchedItem.preceding90Days || [
      { month: 'Jun', usage: Math.round(avgMonthlyUsage * 1.1) },
      { month: 'Jul', usage: Math.round(avgMonthlyUsage * 0.9) },
      { month: 'Aug', usage: Math.round(avgMonthlyUsage * 1.0) },
    ],
    // Rich historical metrics
    availablePeriodLabel: histMetrics.availablePeriodLabel,
    annualizedConsumption: histMetrics.annualizedConsumption,
    totalPurchasedQuantity: histMetrics.totalPurchasedQuantity,
    totalConsumedQuantity: histMetrics.totalConsumedQuantity,
    quantityVariance: histMetrics.quantityVariance,
    percentageVariance: histMetrics.percentageVariance,
    consumptionTrend: histMetrics.consumptionTrend,
    recommendationStatus: rec.status,
    recommendationStatusLabel: rec.statusLabel,
    keyEvidence: rec.keyEvidence,
    suggestedAction: rec.suggestedAction,
    isExcessFlagged: rec.isExcessFlagged,
    dataQualityWarning: histMetrics.dataQualityWarning,
    historicalAnalysis: {
      metrics: histMetrics,
      recommendation: rec,
      itemMatching: itemMatch,
    },
  };

  // 5. DECISION SYNTHESIS & RECOMMENDATION
  const engineResult = evaluateProcurementDecision({
    standardizedItem: gate1.standardized,
    itemCode: gate1.matchedItemCode,
    itemMatchingConfidence: gate1.confidenceScore,
    quantity,
    unitPrice,
    department: dept,
    availableBudget,
    otherSiteInventory: warehousesList
      .filter((w) => !w.isLocal)
      .map((w) => ({
        siteId: w.warehouseId,
        siteName: w.name,
        quantity: w.quantity,
        status: w.stockStatus === 'Excess / Idle' ? 'excess/project-canceled' : (w.stockStatus === 'In Stock' ? 'in-stock' : 'reserve'),
      })),
    historicalUsage: gate4.preceding90Days,
    urgency: (input as any).urgency || 'normal',
    localInventory: gate3.localAvailable,
  });

  const decisionResult: AIDecisionResult = {
    decision: engineResult.decision,
    headline: engineResult.headline,
    reasoning: engineResult.reasoning,
    recommendedActions: engineResult.recommendedActions as any,
    estimatedSavings: engineResult.calculations.estimatedSavings,
    purchaseQuantity: engineResult.calculations.recommendedQuantity,
    transferQuantity: engineResult.calculations.inventoryTransferQuantity,
  };

  return { gate1, gate2, gate3, gate4, decisionResult };
}
