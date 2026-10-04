/**
 * AutoProcure AI - Internal Agent Tool Interfaces
 *
 * Part 2 Isolated Tool Layer
 * Safe functional interfaces that allow agents to access existing application
 * capabilities and deterministic services without duplicating business logic.
 */

import { PurchaseRequest, Gate1Result, Gate2Result, Gate3Result, Gate4Result, AIDecisionResult } from '../../types/procurement';
import {
  ITEM_MASTER_CATALOG,
  INITIAL_PURCHASE_REQUESTS,
  DEPARTMENT_BUDGETS,
  MasterCatalogItem,
} from '../../data/mockProcurementData';
import { analyzePurchaseRequest } from '../procurementEngine';
import { evaluateProcurementDecision } from '../decisionEngine';
import {
  calculateHistoricalMetrics,
  synthesizeRecommendation,
  matchItemIdentity,
} from '../historicalAnalysisEngine';
import { HistoricalTransactionDoc, ItemMasterDoc } from '../../types/procurementDataModel';

export interface InventoryEvidence {
  matchedItem: MasterCatalogItem;
  localWarehouseStock: number;
  sisterSiteTotalStock: number;
  excessOrIdleStock: number;
  reservedStock: number;
  warehouses: MasterCatalogItem['warehouses'];
  transferrableQuantity: number;
  isSufficientLocally: boolean;
  isSufficientWithTransfer: boolean;
  deficitQuantity: number;
}

export interface OpenPOEvidence {
  hasActivePOs: boolean;
  openPOCount: number;
  totalPendingUnits: number;
  openPORefs: string[];
  vendorSummaries: Array<{ poNumber: string; vendor: string; quantity: number; status: string }>;
}

export interface HistoricalEvidence {
  avgMonthlyUsage: number;
  annualizedConsumption: number;
  monthsOfSupply: number;
  totalPurchasedQuantity: number;
  totalConsumedQuantity: number;
  consumptionTrend: string;
  recommendationStatus: string;
  isExcessFlagged: boolean;
  suggestedAction: string;
  availablePeriodLabel: string;
}

export interface ProcurementEngineEvidence {
  gate1: Gate1Result;
  gate2: Gate2Result;
  gate3: Gate3Result;
  gate4: Gate4Result;
  decisionResult: AIDecisionResult;
}

/**
 * Tool 1: Retrieve procurement request by ID or return normalized input
 */
export function getProcurementRequest(
  requestId?: string,
  providedRequest?: Partial<PurchaseRequest>
): Partial<PurchaseRequest> {
  if (requestId) {
    const existing = INITIAL_PURCHASE_REQUESTS.find((pr) => pr.id === requestId);
    if (existing) return existing;
  }
  return providedRequest || {
    id: `PR-${Date.now()}`,
    itemDescription: 'General MRO Item',
    quantity: 1,
    estimatedPrice: 50,
    department: 'Operations',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Tool 2: Retrieve real inventory evidence using existing catalog & warehouse logic
 */
export function getInventoryEvidence(
  itemDescription: string,
  sku?: string,
  requestedQuantity: number = 1
): InventoryEvidence {
  const lower = (itemDescription || '').toLowerCase();

  // Match against existing catalog
  let matched = ITEM_MASTER_CATALOG[0];
  if (sku) {
    const bySku = ITEM_MASTER_CATALOG.find((i) => i.sku.toLowerCase() === sku.toLowerCase());
    if (bySku) matched = bySku;
  } else if (lower.includes('helm') || lower.includes('safety') || lower.includes('saftey')) {
    matched = ITEM_MASTER_CATALOG[1]; // Helmet
  } else if (lower.includes('pip') || lower.includes('steel') || lower.includes('steele')) {
    matched = ITEM_MASTER_CATALOG[2]; // Pipe
  } else if (lower.includes('chair') || lower.includes('ergo')) {
    matched = ITEM_MASTER_CATALOG[3]; // Chair
  } else if (lower.includes('hydraul') || lower.includes('seal')) {
    matched = {
      sku: '#HYD-SEAL-09',
      officialTitle: 'Hydraulic Seal Kit',
      category: 'Hydraulics & Seals',
      glCode: '5140',
      glName: 'Machine Components',
      standardUnitPrice: 75,
      avgMonthlyConsumption: 8,
      localWarehouseStock: 0,
      sisterSiteStock: [
        { siteId: 'WH-B', siteName: 'Warehouse B', quantity: 15, status: 'idle' },
      ],
      warehouses: [
        { warehouseId: 'WH-A', name: 'Warehouse A', quantity: 0, location: 'Local Central Depot', stockStatus: 'Out of Stock', isLocal: true },
        { warehouseId: 'WH-B', name: 'Warehouse B', quantity: 15, location: 'Plant 4 Storage, Bay 7', stockStatus: 'Excess / Idle', isLocal: false },
        { warehouseId: 'WH-C', name: 'Warehouse C', quantity: 0, location: 'Regional Yard C', stockStatus: 'Out of Stock', isLocal: false },
      ],
      preceding90Days: [
        { month: 'Jun', usage: 7 },
        { month: 'Jul', usage: 9 },
        { month: 'Aug', usage: 8 },
      ],
    };
  }

  const localStock = matched.localWarehouseStock || 0;
  const sisterSites = matched.sisterSiteStock || [];
  const sisterStockTotal = sisterSites.reduce((sum, s) => sum + (s.quantity || 0), 0);

  // Compute excess/idle vs reserved
  const excessOrIdle = (matched.warehouses || []).reduce((sum, w) => {
    if (!w.isLocal && (w.stockStatus === 'Excess / Idle' || w.stockStatus === 'In Stock')) {
      return sum + (w.quantity || 0);
    }
    return sum;
  }, 0);

  const reserved = (matched.warehouses || []).reduce((sum, w) => {
    if (w.stockStatus === 'Reserved') return sum + (w.quantity || 0);
    return sum;
  }, 0);

  const totalUsable = localStock + excessOrIdle;
  const transferrable = Math.min(requestedQuantity, excessOrIdle);
  const isSufficientLocally = localStock >= requestedQuantity;
  const isSufficientWithTransfer = totalUsable >= requestedQuantity;
  const deficitQuantity = Math.max(0, requestedQuantity - totalUsable);

  return {
    matchedItem: matched,
    localWarehouseStock: localStock,
    sisterSiteTotalStock: sisterStockTotal,
    excessOrIdleStock: excessOrIdle,
    reservedStock: reserved,
    warehouses: matched.warehouses || [],
    transferrableQuantity: transferrable,
    isSufficientLocally,
    isSufficientWithTransfer,
    deficitQuantity,
  };
}

/**
 * Tool 3: Check Open PO evidence for duplicate ordering risk
 */
export function getOpenPOEvidence(
  itemCodeOrDescription: string,
  department?: string
): OpenPOEvidence {
  const lower = (itemCodeOrDescription || '').toLowerCase();

  // Search existing requisitions that have ERP open POs
  const matchingPRsWithPOs = INITIAL_PURCHASE_REQUESTS.filter((pr) => {
    const descMatch = (pr.itemDescription || '').toLowerCase().includes(lower) ||
      (pr.gate1?.standardized || '').toLowerCase().includes(lower);
    return descMatch && pr.erpSynced && pr.erpRefId;
  });

  const totalUnits = matchingPRsWithPOs.reduce((acc, pr) => acc + (pr.quantity || 0), 0);
  const poRefs = matchingPRsWithPOs.map((pr) => pr.erpRefId!).filter(Boolean);

  const vendorSummaries = matchingPRsWithPOs.map((pr) => ({
    poNumber: pr.erpRefId || 'PO-PENDING',
    vendor: pr.department || department || 'Standard Vendor',
    quantity: pr.quantity || 0,
    status: 'IN_TRANSIT',
  }));

  return {
    hasActivePOs: matchingPRsWithPOs.length > 0,
    openPOCount: matchingPRsWithPOs.length,
    totalPendingUnits: totalUnits,
    openPORefs: poRefs,
    vendorSummaries,
  };
}

/**
 * Tool 4: Run existing historical consumption analysis engine
 */
export function getHistoricalAnalysis(
  input: Partial<PurchaseRequest>,
  quantity: number = 1
): HistoricalEvidence {
  const rawText = (input.itemDescription || '').trim();
  const lower = rawText.toLowerCase();

  let matched: MasterCatalogItem = ITEM_MASTER_CATALOG[0];
  if (lower.includes('helm') || lower.includes('safety') || lower.includes('saftey')) {
    matched = ITEM_MASTER_CATALOG[1];
  } else if (lower.includes('pip') || lower.includes('steel') || lower.includes('steele')) {
    matched = ITEM_MASTER_CATALOG[2];
  } else if (lower.includes('chair') || lower.includes('ergo')) {
    matched = ITEM_MASTER_CATALOG[3];
  }

  const avgMonthly = matched.avgMonthlyConsumption || 10;
  const baselineTxs: HistoricalTransactionDoc[] = [];
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const txDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const dateIso = txDate.toISOString().split('T')[0];
    const monthlyVariance = 0.85 + ((i * 7) % 30) / 100;
    const pQty = Math.round(avgMonthly * monthlyVariance);
    const cQty = Math.round(avgMonthly * monthlyVariance * 0.95);

    baselineTxs.push({
      transactionId: `TX-HIST-${matched.sku}-${i}`,
      importBatchId: 'BATCH-SYSTEM',
      originalFileId: 'SYSTEM-TX',
      rowIndex: i + 1,
      transactionDate: dateIso,
      itemId: matched.sku.replace('#', ''),
      rawItemDescription: rawText || matched.officialTitle,
      standardizedItemDescription: matched.officialTitle,
      quantityPurchased: pQty,
      quantityConsumed: cQty,
      unit: 'EA',
      siteLocation: 'Plant-A',
      department: input.department || 'Operations',
      dataQualityStatus: 'VALID',
      createdAt: dateIso,
    });
  }

  const metrics = calculateHistoricalMetrics(baselineTxs, quantity, 24);
  const catalogDoc: ItemMasterDoc = {
    itemId: matched.sku.replace('#', ''),
    officialSku: matched.sku.replace('#', ''),
    standardizedDescription: matched.officialTitle,
    unspscCategory: matched.category,
    glCode: matched.glCode,
    avgMonthlyConsumption: avgMonthly,
    active: true,
    aliases: [matched.officialTitle.toLowerCase()],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  };

  const itemMatch = matchItemIdentity(
    {
      sku: matched.sku.replace('#', ''),
      rawDescription: rawText,
      standardizedDescription: matched.officialTitle,
    },
    [catalogDoc]
  );

  const recommendation = synthesizeRecommendation(itemMatch, metrics, quantity);

  return {
    avgMonthlyUsage: avgMonthly,
    annualizedConsumption: metrics.annualizedConsumption,
    monthsOfSupply: Number((quantity / Math.max(1, avgMonthly)).toFixed(1)),
    totalPurchasedQuantity: metrics.totalPurchasedQuantity,
    totalConsumedQuantity: metrics.totalConsumedQuantity,
    consumptionTrend: metrics.consumptionTrend,
    recommendationStatus: recommendation.status,
    isExcessFlagged: recommendation.isExcessFlagged,
    suggestedAction: recommendation.suggestedAction,
    availablePeriodLabel: metrics.availablePeriodLabel,
  };
}

/**
 * Tool 5: Run authoritative existing procurement engine (4 gates)
 */
export function runExistingProcurementEngine(
  request: Partial<PurchaseRequest>
): ProcurementEngineEvidence {
  return analyzePurchaseRequest(request);
}

/**
 * Tool 6: Run existing decision engine
 */
export function runExistingDecisionEngine(params: {
  standardizedItem: string;
  itemCode?: string;
  itemMatchingConfidence: number;
  quantity: number;
  unitPrice: number;
  department: string;
  availableBudget: number;
  otherSiteInventory: any[];
  historicalUsage: any[];
  urgency?: 'low' | 'normal' | 'urgent';
  localInventory?: number;
}) {
  return evaluateProcurementDecision({
    ...params,
    urgency: params.urgency || 'normal',
  });
}
