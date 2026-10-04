/**
 * AutoProcure AI - Persistent Data Service
 * Decoupled, generic Firestore access layer for all enterprise procurement entities.
 * Handles both authenticated Cloud Firestore operations and offline/demo session persistence.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import {
  UserProfileDoc,
  PurchaseRequisitionDoc,
  RequisitionLineItemDoc,
  ItemMasterDoc,
  HistoricalTransactionDoc,
  UploadedFileMetadataDoc,
  ImportBatchDoc,
  ManagerDecisionDoc,
  AuditLogDoc,
  RequisitionStatus,
  FileImportStatus,
  GenericGateResult,
} from '../types/procurementDataModel';

// ==========================================
// LOCAL DEMO / SANDBOX PERSISTENCE FALLBACK
// ==========================================

const DEMO_STORAGE_PREFIX = 'autoprocure_demo_db_';

function saveLocal<T>(coll: string, id: string, docData: T): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const key = `${DEMO_STORAGE_PREFIX}${coll}`;
    const raw = localStorage.getItem(key);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = { ...docData, updatedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    // Local storage fallback silent
  }
}

function getLocal<T>(coll: string, id: string): T | null {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    const key = `${DEMO_STORAGE_PREFIX}${coll}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const map = JSON.parse(raw);
    return (map[id] as T) || null;
  } catch {
    return null;
  }
}

function listLocal<T>(coll: string): T[] {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
    const key = `${DEMO_STORAGE_PREFIX}${coll}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const map = JSON.parse(raw);
    return Object.values(map) as T[];
  } catch {
    return [];
  }
}

// ==========================================
// 1. USER PROFILES
// ==========================================

export const getUserProfile = async (userId: string): Promise<UserProfileDoc | null> => {
  if (!auth.currentUser) {
    return getLocal<UserProfileDoc>('users', userId);
  }
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    return snap.exists() ? (snap.data() as UserProfileDoc) : getLocal<UserProfileDoc>('users', userId);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const saveUserProfile = async (profile: UserProfileDoc): Promise<void> => {
  saveLocal('users', profile.id, profile);
  if (!auth.currentUser) {
    return;
  }
  const path = `users/${profile.id}`;
  try {
    await setDoc(doc(db, 'users', profile.id), {
      ...profile,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// ==========================================
// 2 & 3. PURCHASE REQUISITIONS & LINE ITEMS
// ==========================================

export const createPurchaseRequisition = async (
  requisition: PurchaseRequisitionDoc,
  lineItems: RequisitionLineItemDoc[] = []
): Promise<void> => {
  // Always record locally so demo and offline sessions remain fully functional
  saveLocal('purchase_requisitions', requisition.requisitionId, requisition);
  for (const item of lineItems) {
    saveLocal(`pr_line_items_${requisition.requisitionId}`, item.itemId, item);
  }

  // Only dispatch to Cloud Firestore if an authenticated user is signed in
  if (!auth.currentUser) {
    return;
  }

  const prPath = `purchase_requisitions/${requisition.requisitionId}`;
  try {
    await setDoc(doc(db, 'purchase_requisitions', requisition.requisitionId), requisition);

    // Persist line items in subcollection
    for (const item of lineItems) {
      const itemPath = `purchase_requisitions/${requisition.requisitionId}/line_items/${item.itemId}`;
      try {
        await setDoc(
          doc(db, 'purchase_requisitions', requisition.requisitionId, 'line_items', item.itemId),
          item
        );
      } catch (lineErr) {
        handleFirestoreError(lineErr, OperationType.WRITE, itemPath);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, prPath);
  }
};

export const getPurchaseRequisition = async (
  requisitionId: string
): Promise<PurchaseRequisitionDoc | null> => {
  if (!auth.currentUser) {
    return getLocal<PurchaseRequisitionDoc>('purchase_requisitions', requisitionId);
  }
  const path = `purchase_requisitions/${requisitionId}`;
  try {
    const snap = await getDoc(doc(db, 'purchase_requisitions', requisitionId));
    return snap.exists()
      ? (snap.data() as PurchaseRequisitionDoc)
      : getLocal<PurchaseRequisitionDoc>('purchase_requisitions', requisitionId);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const getRequisitionLineItems = async (
  requisitionId: string
): Promise<RequisitionLineItemDoc[]> => {
  if (!auth.currentUser) {
    return listLocal<RequisitionLineItemDoc>(`pr_line_items_${requisitionId}`);
  }
  const path = `purchase_requisitions/${requisitionId}/line_items`;
  try {
    const snap = await getDocs(
      collection(db, 'purchase_requisitions', requisitionId, 'line_items')
    );
    const items = snap.docs.map((d) => d.data() as RequisitionLineItemDoc);
    return items.length > 0 ? items : listLocal<RequisitionLineItemDoc>(`pr_line_items_${requisitionId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const listPurchaseRequisitions = async (filters?: {
  department?: string;
  status?: RequisitionStatus;
}): Promise<PurchaseRequisitionDoc[]> => {
  if (!auth.currentUser) {
    let list = listLocal<PurchaseRequisitionDoc>('purchase_requisitions');
    if (filters?.department) {
      list = list.filter((pr) => pr.department === filters.department);
    }
    if (filters?.status) {
      list = list.filter((pr) => pr.status === filters.status);
    }
    return list;
  }

  const path = 'purchase_requisitions';
  try {
    let q = query(collection(db, 'purchase_requisitions'), orderBy('createdAt', 'desc'), limit(50));

    if (filters?.department) {
      q = query(q, where('department', '==', filters.department));
    }
    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as PurchaseRequisitionDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const updateRequisitionStatus = async (
  requisitionId: string,
  status: RequisitionStatus
): Promise<void> => {
  const localPR = getLocal<PurchaseRequisitionDoc>('purchase_requisitions', requisitionId);
  if (localPR) {
    saveLocal('purchase_requisitions', requisitionId, { ...localPR, status });
  }

  if (!auth.currentUser) {
    return;
  }

  const path = `purchase_requisitions/${requisitionId}`;
  try {
    await updateDoc(doc(db, 'purchase_requisitions', requisitionId), {
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const updateLineItemGateResults = async (
  requisitionId: string,
  lineItemId: string,
  gateResults: Record<string, GenericGateResult>
): Promise<void> => {
  const localItem = getLocal<RequisitionLineItemDoc>(`pr_line_items_${requisitionId}`, lineItemId);
  if (localItem) {
    saveLocal(`pr_line_items_${requisitionId}`, lineItemId, { ...localItem, gateResults });
  }

  if (!auth.currentUser) {
    return;
  }

  const path = `purchase_requisitions/${requisitionId}/line_items/${lineItemId}`;
  try {
    await updateDoc(
      doc(db, 'purchase_requisitions', requisitionId, 'line_items', lineItemId),
      {
        gateResults,
        updatedAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// ==========================================
// 4. ITEM MASTER (GENERIC CATALOG)
// ==========================================

export const getItemMaster = async (itemId: string): Promise<ItemMasterDoc | null> => {
  if (!auth.currentUser) {
    return getLocal<ItemMasterDoc>('item_master', itemId);
  }
  const path = `item_master/${itemId}`;
  try {
    const snap = await getDoc(doc(db, 'item_master', itemId));
    return snap.exists() ? (snap.data() as ItemMasterDoc) : getLocal<ItemMasterDoc>('item_master', itemId);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const saveItemMaster = async (item: ItemMasterDoc): Promise<void> => {
  saveLocal('item_master', item.itemId, item);
  if (!auth.currentUser) {
    return;
  }
  const path = `item_master/${item.itemId}`;
  try {
    await setDoc(doc(db, 'item_master', item.itemId), {
      ...item,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const listItemMaster = async (maxLimit: number = 100): Promise<ItemMasterDoc[]> => {
  if (!auth.currentUser) {
    return listLocal<ItemMasterDoc>('item_master');
  }
  const path = 'item_master';
  try {
    const q = query(
      collection(db, 'item_master'),
      where('active', '==', true),
      limit(maxLimit)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ItemMasterDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

// ==========================================
// 5. HISTORICAL TRANSACTION RECORDS
// ==========================================

export const createHistoricalTransaction = async (
  tx: HistoricalTransactionDoc
): Promise<void> => {
  saveLocal('historical_transactions', tx.transactionId, tx);
  if (!auth.currentUser) {
    return;
  }
  const path = `historical_transactions/${tx.transactionId}`;
  try {
    await setDoc(doc(db, 'historical_transactions', tx.transactionId), tx);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const batchCreateHistoricalTransactions = async (
  txs: HistoricalTransactionDoc[],
  onProgress?: (saved: number, total: number) => void
): Promise<void> => {
  const total = txs.length;
  // Always update local storage demo replica
  for (const tx of txs) {
    saveLocal('historical_transactions', tx.transactionId, tx);
  }

  if (!auth.currentUser) {
    if (onProgress) onProgress(total, total);
    return;
  }

  // Firestore writeBatch max is 500 ops; we chunk in sizes of 250 for safety
  const CHUNK_SIZE = 250;
  let savedCount = 0;

  for (let i = 0; i < txs.length; i += CHUNK_SIZE) {
    const chunk = txs.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const tx of chunk) {
      const ref = doc(db, 'historical_transactions', tx.transactionId);
      batch.set(ref, tx);
    }

    try {
      await batch.commit();
      savedCount += chunk.length;
      if (onProgress) {
        onProgress(savedCount, total);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'historical_transactions/batch');
    }
  }
};

export const listHistoricalTransactions = async (
  filter?: {
    importBatchId?: string;
    itemId?: string;
    dataQualityStatus?: string;
    siteLocation?: string;
    department?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
): Promise<HistoricalTransactionDoc[]> => {
  const maxLimit = filter?.limit || 500;

  if (!auth.currentUser) {
    let items = listLocal<HistoricalTransactionDoc>('historical_transactions');
    if (filter?.importBatchId) {
      items = items.filter((t) => t.importBatchId === filter.importBatchId);
    }
    if (filter?.itemId) {
      items = items.filter((t) => (t.itemId || '').toLowerCase() === filter.itemId!.toLowerCase());
    }
    if (filter?.dataQualityStatus && filter.dataQualityStatus !== 'ALL') {
      items = items.filter((t) => t.dataQualityStatus === filter.dataQualityStatus);
    }
    if (filter?.siteLocation) {
      items = items.filter((t) => (t.siteLocation || '').toLowerCase().includes(filter.siteLocation!.toLowerCase()));
    }
    if (filter?.department) {
      items = items.filter((t) => (t.department || '').toLowerCase().includes(filter.department!.toLowerCase()));
    }
    if (filter?.startDate) {
      items = items.filter((t) => t.transactionDate >= filter.startDate!);
    }
    if (filter?.endDate) {
      items = items.filter((t) => t.transactionDate <= filter.endDate!);
    }
    return items.sort((a, b) => (b.transactionDate > a.transactionDate ? 1 : -1)).slice(0, maxLimit);
  }

  const path = 'historical_transactions';
  try {
    let q = query(collection(db, 'historical_transactions'));
    if (filter?.importBatchId) {
      q = query(q, where('importBatchId', '==', filter.importBatchId));
    }
    if (filter?.itemId) {
      q = query(q, where('itemId', '==', filter.itemId));
    }
    if (filter?.dataQualityStatus && filter.dataQualityStatus !== 'ALL') {
      q = query(q, where('dataQualityStatus', '==', filter.dataQualityStatus));
    }
    q = query(q, limit(maxLimit));
    const snap = await getDocs(q);
    let results = snap.docs.map((d) => d.data() as HistoricalTransactionDoc);
    
    // In-memory client filters for complex combined conditions
    if (filter?.siteLocation) {
      results = results.filter((t) => (t.siteLocation || '').toLowerCase().includes(filter.siteLocation!.toLowerCase()));
    }
    if (filter?.department) {
      results = results.filter((t) => (t.department || '').toLowerCase().includes(filter.department!.toLowerCase()));
    }
    if (filter?.startDate) {
      results = results.filter((t) => t.transactionDate >= filter.startDate!);
    }
    if (filter?.endDate) {
      results = results.filter((t) => t.transactionDate <= filter.endDate!);
    }
    return results.sort((a, b) => (b.transactionDate > a.transactionDate ? 1 : -1));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const listHistoricalTransactionsForItem = async (
  skuOrItemId: string,
  maxLimit: number = 100
): Promise<HistoricalTransactionDoc[]> => {
  return listHistoricalTransactions({ itemId: skuOrItemId, limit: maxLimit });
};

// ==========================================
// 6. UPLOADED FILE METADATA
// ==========================================

export const createUploadedFileMetadata = async (
  metadata: UploadedFileMetadataDoc
): Promise<void> => {
  saveLocal('uploaded_files', metadata.fileId, metadata);
  if (!auth.currentUser) {
    return;
  }
  const path = `uploaded_files/${metadata.fileId}`;
  try {
    await setDoc(doc(db, 'uploaded_files', metadata.fileId), metadata);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getUploadedFileMetadata = async (
  fileId: string
): Promise<UploadedFileMetadataDoc | null> => {
  if (!auth.currentUser) {
    return getLocal<UploadedFileMetadataDoc>('uploaded_files', fileId);
  }
  const path = `uploaded_files/${fileId}`;
  try {
    const snap = await getDoc(doc(db, 'uploaded_files', fileId));
    return snap.exists() ? (snap.data() as UploadedFileMetadataDoc) : getLocal<UploadedFileMetadataDoc>('uploaded_files', fileId);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const listUploadedFiles = async (
  limitCount: number = 50
): Promise<UploadedFileMetadataDoc[]> => {
  if (!auth.currentUser) {
    const list = listLocal<UploadedFileMetadataDoc>('uploaded_files');
    return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()).slice(0, limitCount);
  }

  const path = 'uploaded_files';
  try {
    const q = query(collection(db, 'uploaded_files'), limit(limitCount));
    const snap = await getDocs(q);
    const files = snap.docs.map((d) => d.data() as UploadedFileMetadataDoc);
    return files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const updateUploadedFileStatus = async (
  fileId: string,
  status: FileImportStatus,
  summary?: Partial<UploadedFileMetadataDoc>
): Promise<void> => {
  const local = getLocal<UploadedFileMetadataDoc>('uploaded_files', fileId);
  if (local) {
    saveLocal('uploaded_files', fileId, { ...local, importStatus: status, ...summary });
  }

  if (!auth.currentUser) {
    return;
  }
  const path = `uploaded_files/${fileId}`;
  try {
    await updateDoc(doc(db, 'uploaded_files', fileId), {
      importStatus: status,
      ...summary,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

// ==========================================
// 7. IMPORT BATCHES
// ==========================================

export const createImportBatch = async (batch: ImportBatchDoc): Promise<void> => {
  saveLocal('import_batches', batch.batchId, batch);
  if (!auth.currentUser) {
    return;
  }
  const path = `import_batches/${batch.batchId}`;
  try {
    await setDoc(doc(db, 'import_batches', batch.batchId), batch);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const updateImportBatch = async (
  batchId: string,
  updateData: Partial<ImportBatchDoc>
): Promise<void> => {
  const local = getLocal<ImportBatchDoc>('import_batches', batchId);
  if (local) {
    saveLocal('import_batches', batchId, { ...local, ...updateData, updatedAt: new Date().toISOString() });
  }

  if (!auth.currentUser) {
    return;
  }
  const path = `import_batches/${batchId}`;
  try {
    await updateDoc(doc(db, 'import_batches', batchId), {
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const getImportBatch = async (batchId: string): Promise<ImportBatchDoc | null> => {
  if (!auth.currentUser) {
    return getLocal<ImportBatchDoc>('import_batches', batchId);
  }
  const path = `import_batches/${batchId}`;
  try {
    const snap = await getDoc(doc(db, 'import_batches', batchId));
    return snap.exists() ? (snap.data() as ImportBatchDoc) : getLocal<ImportBatchDoc>('import_batches', batchId);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const listImportBatches = async (
  limitCount: number = 50
): Promise<ImportBatchDoc[]> => {
  if (!auth.currentUser) {
    const list = listLocal<ImportBatchDoc>('import_batches');
    return list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()).slice(0, limitCount);
  }

  const path = 'import_batches';
  try {
    const q = query(collection(db, 'import_batches'), limit(limitCount));
    const snap = await getDocs(q);
    const batches = snap.docs.map((d) => d.data() as ImportBatchDoc);
    return batches.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

// ==========================================
// 8. PURCHASE MANAGER DECISIONS
// ==========================================

export const recordManagerDecision = async (
  decision: ManagerDecisionDoc
): Promise<void> => {
  saveLocal('manager_decisions', decision.id, decision);
  if (!auth.currentUser) {
    return;
  }
  const path = `manager_decisions/${decision.id}`;
  try {
    await setDoc(doc(db, 'manager_decisions', decision.id), decision);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getDecisionsForRequisition = async (
  requisitionId: string
): Promise<ManagerDecisionDoc[]> => {
  if (!auth.currentUser) {
    return listLocal<ManagerDecisionDoc>('manager_decisions').filter(
      (d) => d.requisitionId === requisitionId
    );
  }
  const path = 'manager_decisions';
  try {
    const q = query(
      collection(db, 'manager_decisions'),
      where('requisitionId', '==', requisitionId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ManagerDecisionDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

// ==========================================
// 9. AUDIT HISTORY
// ==========================================

export const logAuditEvent = async (
  event: Omit<AuditLogDoc, 'id' | 'timestamp'>
): Promise<string> => {
  const logId = `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const auditRecord: AuditLogDoc = {
    ...event,
    id: logId,
    timestamp: new Date().toISOString(),
  };

  saveLocal('audit_logs', logId, auditRecord);

  if (!auth.currentUser) {
    return logId;
  }

  const path = `audit_logs/${logId}`;
  try {
    await setDoc(doc(db, 'audit_logs', logId), auditRecord);
    return logId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const recordAuditLog = logAuditEvent;

export const createManagerDecisionDoc = (params: {
  requisitionId: string;
  lineItemId?: string;
  managerId: string;
  managerName?: string;
  managerEmail?: string;
  decision: any;
  originalQuantity: number;
  approvedQuantity: number;
  transferQuantity?: number;
  justification: string;
  overrideAiReason?: string;
  savingsEstimated?: number;
  aiRecommendation?: string;
}): ManagerDecisionDoc => {
  const now = new Date().toISOString();
  return {
    id: `DEC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    requisitionId: params.requisitionId,
    lineItemId: params.lineItemId,
    managerId: params.managerId,
    managerName: params.managerName,
    managerEmail: params.managerEmail,
    decision: params.decision,
    originalQuantity: params.originalQuantity,
    approvedQuantity: params.approvedQuantity,
    transferQuantity: params.transferQuantity,
    justification: params.justification,
    overrideAiReason: params.overrideAiReason,
    savingsEstimated: params.savingsEstimated,
    aiRecommendation: params.aiRecommendation,
    createdAt: now,
    timestamp: now,
    decisionTimestamp: now,
  };
};

export const getAuditHistory = async (
  entityId: string
): Promise<AuditLogDoc[]> => {
  if (!auth.currentUser) {
    return listLocal<AuditLogDoc>('audit_logs').filter((a) => a.entityId === entityId);
  }
  const path = 'audit_logs';
  try {
    const q = query(
      collection(db, 'audit_logs'),
      where('entityId', '==', entityId),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as AuditLogDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};
