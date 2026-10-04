export type RoutePath =
  | '/login'
  | '/dashboard'
  | '/submit'
  | '/processing'
  | '/analysis'
  | '/decision'
  | '/recommendation'
  | '/requests'
  | '/analytics'
  | '/settings'
  | '/historical-data';

export type EnterpriseRole = 'REQUISITIONER' | 'PURCHASE_MANAGER' | 'ADMIN';

export type UserRole =
  | EnterpriseRole
  | 'Procurement Director'
  | 'Procurement Team'
  | 'Department Requisitioner'
  | 'Operations Lead';

export const normalizeRole = (role?: string): EnterpriseRole => {
  if (!role) return 'REQUISITIONER';
  const upper = role.toUpperCase();
  if (upper === 'ADMIN' || upper.includes('ADMINISTRATOR')) return 'ADMIN';
  if (
    upper === 'PURCHASE_MANAGER' ||
    upper.includes('DIRECTOR') ||
    upper.includes('PROCUREMENT') ||
    upper.includes('MANAGER')
  ) {
    return 'PURCHASE_MANAGER';
  }
  return 'REQUISITIONER';
};

export const isRequisitionerRole = (role?: string): boolean => {
  return normalizeRole(role) === 'REQUISITIONER';
};

export const isPurchaseManagerRole = (role?: string): boolean => {
  const norm = normalizeRole(role);
  return norm === 'PURCHASE_MANAGER' || norm === 'ADMIN';
};

export const isAdminRole = (role?: string): boolean => {
  return normalizeRole(role) === 'ADMIN';
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  profilePicturePath?: string;
}

export type Department =
  | 'IT / Technology'
  | 'Maintenance'
  | 'HR'
  | 'Operations'
  | 'Facilities & Safety'
  | 'Production Plant'
  | 'Engineering'
  | 'Marketing';

export type GateStatus = 'PASSED' | 'WARNING' | 'FAILED' | 'FOUND' | 'HIGH' | 'OPTIMAL';

export type DecisionType = 'APPROVE' | 'PROCEED' | 'REDUCE' | 'HOLD' | 'INVESTIGATE' | 'EXPEDITE' | 'REJECT' | 'REJECTED';

export type PRStatus = 'DRAFT' | 'PENDING_VALIDATION' | 'AUDITED' | 'APPROVED' | 'REDUCE' | 'ON_HOLD' | 'INVESTIGATE' | 'EXPEDITED' | 'REJECTED';

export interface Gate1Result {
  originalInput: string;
  standardized: string;
  matchedItemCode: string;
  category: string;
  glCode: string;
  confidenceScore: number;
  typosCorrected: string[];
}

export interface Gate2Result {
  estimatedCost: number;
  availableBudget: number;
  status: 'Passed' | 'Warning' | 'Failed';
  variance: number; // positive if exceeded, 0 if within budget
  remainingBudget: number; // budget left after deduction, or 0 if exceeded
  message: string;
}

export interface SisterSiteStock {
  siteId: string;
  siteName: string;
  quantity: number;
  status: 'excess/project-canceled' | 'idle' | 'reserve';
}

export interface WarehouseInventory {
  warehouseId: string;
  name: string; // 'Warehouse A' | 'Warehouse B' | 'Warehouse C'
  quantity: number;
  location: string;
  stockStatus: 'In Stock' | 'Excess / Idle' | 'Reserved' | 'Out of Stock';
  isLocal?: boolean;
}

export interface Gate3Result {
  localWarehouseName: string;
  localAvailable: number;
  otherSites: SisterSiteStock[];
  warehouses: WarehouseInventory[];
  totalSisterStock: number;
  status: 'Found' | 'Not Found' | 'Partial';
  recommendedTransferQuantity: number;
  transferRecommendation: string;
}

export interface Gate4Result {
  avgMonthlyUsage: number;
  requestedQuantity: number;
  monthsOfSupply: number;
  recommendedQuantity: number;
  status: 'Optimal' | 'High' | 'Low';
  usageFlagMessage: string;
  preceding90Days: Array<{
    month: string;
    usage: number;
  }>;
  // Extended Historical Intelligence Metrics (Stage 1 & Stage 2)
  availablePeriodLabel?: string;
  annualizedConsumption?: number | null;
  totalPurchasedQuantity?: number | null;
  totalConsumedQuantity?: number | null;
  quantityVariance?: number | null;
  percentageVariance?: number | null;
  consumptionTrend?: 'STABLE' | 'INCREASING' | 'DECREASING' | 'VOLATILE' | 'INSUFFICIENT_DATA';
  recommendationStatus?: string;
  recommendationStatusLabel?: string;
  keyEvidence?: string[];
  suggestedAction?: string;
  isExcessFlagged?: boolean;
  dataQualityWarning?: string;
  historicalAnalysis?: any;
}

export interface AIDecisionResult {
  decision: DecisionType;
  headline: string;
  calculations?: {
    totalCost: number;
    budgetVariance: number;
    remainingBudget: number;
    budgetUtilizationPercent?: number;
    inventoryTransferQuantity: number;
    availableTransferStock?: number;
    primaryTransferSource?: string;
    averageMonthlyUsage: number;
    coverageMonths: number;
    recommendedQuantity: number;
    estimatedSavings: number;
    savingsBreakdown: {
      transferSavings: number;
      volumeReductionSavings: number;
    };
    [key: string]: any;
  };
  reasoning: string[];
  recommendedActions: Array<{
    type?: string;
    text: string;
    quantity?: number;
    site?: string;
  }>;
  confidenceScore?: number;
  appliedThresholds?: Record<string, any>;
  auditFlags?: string[];
  estimatedSavings?: number;
  transferQuantity?: number;
  purchaseQuantity?: number;
  recommendedQuantity?: number;
  primaryTransferSource?: string;
  [key: string]: any;
}

export interface RequisitionLineItem {
  id: string;
  sku?: string;
  itemDescription: string;
  quantity: number;
  estimatedPrice: number;
  unit?: string;
  gate1?: Gate1Result;
  gate2?: Gate2Result;
  gate3?: Gate3Result;
  gate4?: Gate4Result;
  decisionResult?: AIDecisionResult;
  managerDecision?: {
    decision: 'APPROVE' | 'REDUCE' | 'HOLD' | 'REJECT' | 'CLARIFICATION' | 'REANALYSIS';
    approvedQuantity: number;
    overrideReasonCategory?: string;
    justification: string;
    managerId: string;
    timestamp: string;
  };
}

export interface PurchaseRequest {
  id: string;
  employeeName: string;
  department: Department;
  itemDescription: string;
  quantity: number;
  estimatedPrice: number;
  requiredDate: string;
  additionalNotes?: string;
  createdAt: string;
  status: PRStatus;
  
  // Analysis results (populated once checked)
  gate1?: Gate1Result;
  gate2?: Gate2Result;
  gate3?: Gate3Result;
  gate4?: Gate4Result;
  decisionResult?: AIDecisionResult;

  // Multi-item PR support
  lineItems?: RequisitionLineItem[];

  erpSynced?: boolean;
  erpRefId?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

export interface GeminiStandardizationOutput {
  standardizedDescription: string;
  category: string;
  suggestedItemCode: string;
  glCode: string;
  corrections: string[];
  confidence: number;
  source?: 'gemini-live' | 'deterministic-fallback' | 'deterministic-mock' | 'gemini-simulated';
}

export interface GeminiReasoningOutput {
  executiveHeadline: string;
  anomalyExplanation: string;
  humanReadableReasoning: string[];
  actionableGuidance?: string;
  source?: string;
}

export interface AITestSuiteResult {
  status: 'PASSED' | 'PASSED_WITH_FALLBACK';
  testName: string;
  description?: string;
  input?: any;
  response?: any;
  validation?: { isValid: boolean; errors: string[] };
  source?: string;
  note?: string;
  simulatedMalformedInput?: any;
  validationCaughtErrors?: string[];
  didCrash?: boolean;
  gracefulFallbackApplied?: boolean;
  recoveredResponse?: any;
  simulatedCondition?: string;
  fallbackEngaged?: boolean;
  fallbackResponse?: any;
  confidenceScore?: number;
  triggersInvestigateGate?: boolean;
  gateAction?: string;
}
