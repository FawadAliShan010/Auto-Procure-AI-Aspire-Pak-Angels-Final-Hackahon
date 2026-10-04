/**
 * AutoProcure AI - Persistent Data Model Definitions
 * Strictly generic and decoupled from single product archetypes.
 */

export type EnterpriseRole = 'REQUISITIONER' | 'PURCHASE_MANAGER' | 'ADMIN';

export type RequisitionStatus =
  | 'DRAFT'
  | 'PENDING_AUDIT'
  | 'AUDITED'
  | 'MANAGER_REVIEW'
  | 'APPROVED'
  | 'REDUCED'
  | 'HOLD'
  | 'REJECTED'
  | 'DISPATCHED';

export type RequisitionPriority = 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT';

export type GateEvaluationStatus = 'PASS' | 'WARN' | 'FAIL' | 'REVIEW' | 'INFO';

export type ManagerDecisionType =
  | 'APPROVE'
  | 'REDUCE'
  | 'HOLD'
  | 'REJECT'
  | 'EXPEDITE'
  | 'OVERRIDE'
  | 'TRANSFER_FIRST';

export type FileImportStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'PARTIAL';

export type ImportBatchStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'READY_FOR_IMPORT'
  | 'IMPORTING'
  | 'COMPLETED'
  | 'COMPLETED_WITH_WARNINGS'
  | 'FAILED'
  | 'CANCELLED';

export type DataQualityStatus = 'VALID' | 'WARNING' | 'CORRECTED' | 'FLAGGED';

export type AuditEntityType =
  | 'PURCHASE_REQUISITION'
  | 'LINE_ITEM'
  | 'ITEM_MASTER'
  | 'UPLOADED_FILE'
  | 'IMPORT_BATCH'
  | 'HISTORICAL_TRANSACTION'
  | 'USER'
  | 'USER_PROFILE';

/**
 * 1. User Profile Document
 * Path: /users/{userId}
 */
export interface UserProfileDoc {
  id: string; // Auth UID
  displayName: string;
  email: string;
  role: EnterpriseRole;
  department?: string;
  profilePictureRef?: string; // Cloud Storage URI or public URL
  profilePicturePath?: string; // Cloud Storage object path (e.g. profilePictures/{uid}/profile_123.jpg)
  profilePictureUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 7. Generic Gate Evaluation Result
 * Extensible for Gate 1-4 and future pipeline additions
 */
export interface GenericGateResult {
  gateName: string; // e.g. 'Gate 1 — Data Cleaning', 'Gate 2 — Budget Check'
  status: GateEvaluationStatus;
  timestamp: string;
  relevantMetrics: Record<string, string | number | boolean | null>;
  recommendation: string;
  explanation: string;
  confidence?: number; // 0.0 to 1.0
  flags?: string[];
}

/**
 * 3. Purchase Requisition Line Item Document
 * Path: /purchase_requisitions/{requisitionId}/line_items/{lineItemId}
 */
export interface RequisitionLineItemDoc {
  itemId: string;
  requisitionId: string;
  sku?: string; // Master Item SKU once resolved
  originalDescription: string;
  standardizedDescription: string;
  requestedQuantity: number;
  unit: string;
  estimatedUnitPrice: number;
  totalValue: number;
  glCode?: string;
  unspscCategory?: string;
  gateResults: Record<string, GenericGateResult>;
  finalDecision?: {
    decision: 'APPROVE' | 'REDUCE' | 'HOLD' | 'REJECT' | 'PENDING';
    approvedQuantity?: number;
    managerId?: string;
    justification?: string;
    timestamp?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * 2. Purchase Requisition Document
 * Path: /purchase_requisitions/{requisitionId}
 */
export interface PurchaseRequisitionDoc {
  requisitionId: string;
  requester: {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
  };
  department: string;
  siteLocation: string;
  requestDate: string;
  status: RequisitionStatus;
  priority: RequisitionPriority;
  totalEstimatedValue: number;
  currency: string;
  lineItemCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 4. Master Item Catalog Document
 * Path: /item_master/{itemId}
 * Generic across all commodity codes and equipment
 */
export interface ItemMasterDoc {
  itemId: string;
  officialSku: string;
  standardizedDescription: string;
  category?: string;
  unit?: string;
  glCode?: string;
  unspscCode?: string;
  unspscCategory?: string;
  avgMonthlyConsumption?: number;
  aliases: string[]; // Alternate synonyms, common typos
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 5. Historical Transaction Record Document
 * Path: /historical_transactions/{transactionId}
 * Supports real past purchases & consumption logs
 */
export interface HistoricalTransactionDoc {
  transactionId: string;
  itemId?: string; // SKU if mapped
  rawItemDescription: string;
  standardizedItemDescription?: string;
  transactionDate: string; // ISO date
  quantityPurchased?: number;
  quantityConsumed?: number;
  siteLocation?: string;
  department?: string;
  unit?: string;
  unitPrice?: number;
  totalValue?: number;
  sourceFileId?: string; // Links to UploadedFileMetadataDoc
  originalFileId?: string;
  rowIndex?: number;
  importBatchId?: string;
  dataQualityStatus?: DataQualityStatus;
  createdAt: string;
}

/**
 * 6. Uploaded File Metadata Document
 * Path: /uploaded_files/{fileId}
 * Real files stored in Firebase Storage; metadata tracked here
 */
export interface UploadedFileMetadataDoc {
  fileId: string;
  originalFilename: string;
  storagePath: string; // Firebase Storage reference
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
  fileType: string;
  fileSize: number;
  importStatus: FileImportStatus;
  totalRows: number;
  validRows: number;
  correctedRows: number;
  warningRows: number;
  rejectedRows: number;
  importBatchId: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 7. Import Batch Document
 * Path: /import_batches/{batchId}
 * Tracks full audit lifecycle of each ingestion execution
 */
export interface ImportBatchDoc {
  batchId: string;
  sourceFileId: string;
  originalFilename: string;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  };
  uploadedAt: string;
  importStartTime: string;
  importCompletionTime?: string;
  totalRows: number;
  validRows: number;
  correctedRows: number;
  warningRows: number;
  rejectedRows: number;
  duplicateRows: number;
  unmatchedItemCount: number;
  lowConfidenceItemCount: number;
  dateRange?: {
    minDate: string;
    maxDate: string;
  };
  importStatus: ImportBatchStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 8. Manager Decision Record Document
 * Path: /manager_decisions/{decisionId}
 */
export interface ManagerDecisionDoc {
  id: string;
  requisitionId: string;
  lineItemId?: string;
  managerId: string;
  managerName?: string;
  managerEmail?: string;
  manager?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  decision: ManagerDecisionType;
  originalQuantity: number;
  approvedQuantity: number;
  transferQuantity?: number;
  justification: string;
  overrideAiReason?: string;
  savingsEstimated?: number;
  aiRecommendation?: string;
  decisionTimestamp?: string;
  timestamp?: string;
  createdAt: string;
}

/**
 * 9. Procurement System Audit Log Document
 * Path: /audit_logs/{logId}
 */
export interface AuditLogDoc {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  timestamp: string;
  previousValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  reason?: string;
}
