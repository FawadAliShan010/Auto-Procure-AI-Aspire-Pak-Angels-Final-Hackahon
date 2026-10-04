import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  RoutePath,
  UserProfile,
  PurchaseRequest,
  ToastMessage,
  normalizeRole,
  isRequisitionerRole,
  isPurchaseManagerRole,
  isAdminRole,
  EnterpriseRole,
} from '../types/procurement';
import {
  CURRENT_USER,
  INITIAL_PURCHASE_REQUESTS,
} from '../data/mockProcurementData';
import { analyzePurchaseRequest } from '../services/procurementEngine';
import { useAuth } from './AuthContext';
import {
  createPurchaseRequisition,
  updateRequisitionStatus,
  logAuditEvent,
  recordManagerDecision as recordManagerDecisionService,
} from '../services/persistentDataService';
import {
  PurchaseRequisitionDoc,
  RequisitionLineItemDoc,
  ManagerDecisionDoc,
} from '../types/procurementDataModel';

interface ProcurementContextType {
  currentRoute: RoutePath;
  navigateTo: (route: RoutePath) => void;
  currentUser: UserProfile;
  switchUser: (user: UserProfile) => void;
  requests: PurchaseRequest[];
  setRequests: React.Dispatch<React.SetStateAction<PurchaseRequest[]>>;
  authorizedRequests: PurchaseRequest[];
  activeDraft: Partial<PurchaseRequest>;
  updateDraft: (fields: Partial<PurchaseRequest>) => void;
  resetDraft: () => void;
  currentAnalysisPR: PurchaseRequest | null;
  setCurrentAnalysisPR: (pr: PurchaseRequest | null) => void;
  startAnalysisFlow: (draft: Partial<PurchaseRequest>) => void;
  approveAndSendToERP: (prId: string) => boolean;
  updateRequestStatus: (prId: string, status: PurchaseRequest['status'], note?: string) => boolean;
  recordManagerDecision: (
    requisitionId: string,
    decisionType: 'APPROVE' | 'REDUCE' | 'HOLD' | 'REJECT' | 'TRANSFER_FIRST',
    details: {
      originalQuantity: number;
      approvedQuantity: number;
      transferQuantity?: number;
      justification: string;
      overrideAiReason?: string;
    }
  ) => Promise<boolean>;
  toasts: ToastMessage[];
  addToast: (title: string, description?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
  selectedRequestForModal: PurchaseRequest | null;
  setSelectedRequestForModal: (pr: PurchaseRequest | null) => void;
}

const ProcurementContext = createContext<ProcurementContextType | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Sync route with URL hash or default to dashboard
  const getInitialRoute = (): RoutePath => {
    const hash = window.location.hash.replace('#', '') as RoutePath;
    const validRoutes: RoutePath[] = [
      '/login',
      '/dashboard',
      '/submit',
      '/processing',
      '/analysis',
      '/decision',
      '/recommendation',
      '/requests',
      '/analytics',
      '/settings',
    ];
    return validRoutes.includes(hash) ? hash : '/dashboard';
  };

  const getInitialRequests = (): PurchaseRequest[] => {
    try {
      const stored = localStorage.getItem('autoprocure_requests');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read autoprocure_requests from localStorage', e);
    }
    return INITIAL_PURCHASE_REQUESTS;
  };

  const { userProfile, enterpriseRole } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<RoutePath>(getInitialRoute);
  const [currentUser, setCurrentUser] = useState<UserProfile>(userProfile || CURRENT_USER);

  // Sync currentUser with authenticated Google/Email user
  useEffect(() => {
    if (userProfile) {
      setCurrentUser(userProfile);
      setActiveDraft((prev) => ({
        ...prev,
        employeeName: userProfile.name,
      }));
    }
  }, [userProfile]);

  const [requests, setRequests] = useState<PurchaseRequest[]>(getInitialRequests);
  const [activeDraft, setActiveDraft] = useState<Partial<PurchaseRequest>>({
    employeeName: currentUser.name,
    department: 'IT / Technology',
    itemDescription: 'laptop charger 65w',
    quantity: 10,
    estimatedPrice: 25,
    requiredDate: '2025-09-20',
    additionalNotes: '',
  });

  // Keep localStorage in sync with requests
  useEffect(() => {
    try {
      localStorage.setItem('autoprocure_requests', JSON.stringify(requests));
    } catch (e) {
      console.warn('Could not save autoprocure_requests to localStorage', e);
    }
  }, [requests]);

  // Listen to browser hash change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as RoutePath;
      const validRoutes: RoutePath[] = [
        '/login',
        '/dashboard',
        '/submit',
        '/processing',
        '/analysis',
        '/decision',
        '/recommendation',
        '/requests',
        '/analytics',
        '/settings',
      ];
      if (validRoutes.includes(hash)) {
        setCurrentRoute(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const [currentAnalysisPR, setCurrentAnalysisPR] = useState<PurchaseRequest | null>(null);
  const [selectedRequestForModal, setSelectedRequestForModal] = useState<PurchaseRequest | null>(null);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, description?: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastMessage = { id, title, description, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const navigateTo = (route: RoutePath) => {
    window.location.hash = route;
    setCurrentRoute(route);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchUser = (user: UserProfile) => {
    setCurrentUser(user);
    setActiveDraft((prev) => ({
      ...prev,
      employeeName: user.name,
    }));
    addToast(
      'Active Persona Switched',
      `Switched context to ${user.name} (${user.role})`,
      'info'
    );
  };

  const updateDraft = (fields: Partial<PurchaseRequest>) => {
    setActiveDraft((prev) => ({
      ...prev,
      ...fields,
    }));
  };

  const resetDraft = () => {
    setActiveDraft({
      employeeName: currentUser.name,
      department: 'IT / Technology',
      itemDescription: '',
      quantity: 1,
      estimatedPrice: 0,
      requiredDate: new Date().toISOString().split('T')[0],
      additionalNotes: '',
    });
  };

  // Requisition ownership segregation:
  // Requisitioners can only view their own requests; Managers/Admins view all
  const authorizedRequests = useMemo(() => {
    const role = normalizeRole(currentUser.role);
    if (role === 'ADMIN' || role === 'PURCHASE_MANAGER') {
      return requests;
    }
    const currentUserName = currentUser.name?.toLowerCase().trim();
    const currentUserEmail = currentUser.email?.toLowerCase().trim();
    const currentUserId = currentUser.id;

    return requests.filter((r) => {
      const empName = (r.employeeName || '').toLowerCase().trim();
      const reqId = (r as any).requester?.id;
      const reqEmail = ((r as any).requester?.email || '').toLowerCase().trim();

      return (
        empName === currentUserName ||
        (currentUserEmail && reqEmail === currentUserEmail) ||
        (currentUserId && reqId === currentUserId) ||
        empName.includes(currentUserName)
      );
    });
  }, [requests, currentUser]);

  const startAnalysisFlow = (draft: Partial<PurchaseRequest>) => {
    // Generate new unique PR ID
    const newId = `PR-2025-${Math.floor(1000 + Math.random() * 9000)}`;

    const preliminaryPR: PurchaseRequest = {
      id: newId,
      employeeName: draft.employeeName || currentUser.name,
      department: draft.department || 'IT / Technology',
      itemDescription: draft.itemDescription || '',
      quantity: Number(draft.quantity) || 1,
      estimatedPrice: Number(draft.estimatedPrice) || 0,
      requiredDate: draft.requiredDate || new Date().toISOString().split('T')[0],
      additionalNotes: draft.additionalNotes || '',
      createdAt: 'Just now',
      status: 'AUDITED',
    };

    // Run 4-Gate Audit Engine
    const analyzed = analyzePurchaseRequest(preliminaryPR);
    const newPR: PurchaseRequest = {
      ...preliminaryPR,
      gate1: analyzed.gate1,
      gate2: analyzed.gate2,
      gate3: analyzed.gate3,
      gate4: analyzed.gate4,
      decisionResult: analyzed.decisionResult,
    };

    setCurrentAnalysisPR(newPR);
    // Prepend to requests so user sees it in recent list
    setRequests((prev) => [newPR, ...prev]);

    // Asynchronously record into persistent Firestore model
    const totalEstValue = (newPR.estimatedPrice || 0) * (newPR.quantity || 1);
    const firestorePR: PurchaseRequisitionDoc = {
      requisitionId: newPR.id,
      requester: {
        id: currentUser.id,
        name: newPR.employeeName || currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        department: newPR.department,
      },
      department: newPR.department,
      siteLocation: 'Plant-A Regional Depot',
      requestDate: newPR.requiredDate || new Date().toISOString().split('T')[0],
      status: 'AUDITED',
      priority: 'STANDARD',
      totalEstimatedValue: totalEstValue,
      currency: 'USD',
      lineItemCount: 1,
      notes: newPR.additionalNotes,
      createdAt: newPR.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const lineItemDoc: RequisitionLineItemDoc = {
      itemId: `LINE-${newPR.id}-1`,
      requisitionId: newPR.id,
      sku: newPR.gate1?.matchedItemCode,
      originalDescription: newPR.itemDescription,
      standardizedDescription: newPR.gate1?.standardized || newPR.itemDescription,
      requestedQuantity: newPR.quantity,
      unit: 'EA',
      estimatedUnitPrice: newPR.estimatedPrice,
      totalValue: totalEstValue,
      glCode: newPR.gate1?.glCode,
      unspscCategory: newPR.gate1?.category,
      gateResults: {
        gate1: {
          gateName: 'Gate 1 — Data Cleaning',
          status: (newPR.gate1?.confidenceScore || 0) >= 0.7 ? 'PASS' : 'WARN',
          timestamp: new Date().toISOString(),
          relevantMetrics: {
            confidenceScore: newPR.gate1?.confidenceScore || 0,
            matchedItemCode: newPR.gate1?.matchedItemCode || '',
          },
          recommendation: `Standardized to ${newPR.gate1?.standardized || newPR.itemDescription}`,
          explanation: `Catalog match score ${((newPR.gate1?.confidenceScore || 0) * 100).toFixed(0)}%`,
        },
        gate2: {
          gateName: 'Gate 2 — Budget Check',
          status: newPR.gate2?.status === 'Passed' ? 'PASS' : newPR.gate2?.status === 'Warning' ? 'WARN' : 'FAIL',
          timestamp: new Date().toISOString(),
          relevantMetrics: {
            estimatedCost: newPR.gate2?.estimatedCost || 0,
            availableBudget: newPR.gate2?.availableBudget || 0,
            variance: newPR.gate2?.variance || 0,
          },
          recommendation: newPR.gate2?.message || '',
          explanation: `Remaining budget: $${(newPR.gate2?.remainingBudget || 0).toLocaleString()}`,
        },
        gate3: {
          gateName: 'Gate 3 — Sister-Site Stock Check',
          status: newPR.gate3?.status === 'Found' ? 'INFO' : 'PASS',
          timestamp: new Date().toISOString(),
          relevantMetrics: {
            recommendedTransferQuantity: newPR.gate3?.recommendedTransferQuantity || 0,
            totalSisterStock: newPR.gate3?.totalSisterStock || 0,
          },
          recommendation: newPR.gate3?.transferRecommendation || 'Stock verification completed',
          explanation: `Found ${newPR.gate3?.totalSisterStock || 0} units across sister warehouses`,
        },
        gate4: {
          gateName: 'Gate 4 — Usage & Consumption Check',
          status: newPR.gate4?.status === 'Optimal' ? 'PASS' : newPR.gate4?.status === 'High' ? 'WARN' : 'INFO',
          timestamp: new Date().toISOString(),
          relevantMetrics: {
            monthsOfSupply: newPR.gate4?.monthsOfSupply || 0,
            avgMonthlyUsage: newPR.gate4?.avgMonthlyUsage || 0,
          },
          recommendation: newPR.gate4?.usageFlagMessage || 'Consumption baseline evaluated',
          explanation: `Calculated ${(newPR.gate4?.monthsOfSupply || 0).toFixed(1)} months of supply run rate`,
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    createPurchaseRequisition(firestorePR, [lineItemDoc])
      .then(() => {
        logAuditEvent({
          user: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
          },
          action: 'PR_CREATED_AUDITED',
          entityType: 'PURCHASE_REQUISITION',
          entityId: newPR.id,
          newValue: { totalValue: totalEstValue, status: 'AUDITED' },
          reason: 'Initial 4-gate requisition audit complete',
        }).catch(() => {});
      })
      .catch((err) => {
        console.warn('Persistent storage async sync note:', err?.message || err);
      });

    // Go to /processing route first
    navigateTo('/processing');
  };

  // TEST 2 & RBAC Enforcement: Requisitioners cannot approve or commit POs to ERP
  const approveAndSendToERP = (prId: string): boolean => {
    if (isRequisitionerRole(currentUser.role)) {
      addToast(
        'Permission Denied (RBAC Rule 6.4)',
        'Requisitioners are strictly forbidden from approving purchase requisitions or committing POs to ERP. Only Purchase Managers or Admins have approval authorization.',
        'error'
      );
      return false;
    }

    const erpRef = `SAP-PO-${Math.floor(100000 + Math.random() * 900000)}`;
    setRequests((prev) =>
      prev.map((pr) => (pr.id === prId ? { ...pr, erpSynced: true, erpRefId: erpRef, status: 'APPROVED' } : pr))
    );
    if (currentAnalysisPR && currentAnalysisPR.id === prId) {
      setCurrentAnalysisPR({
        ...currentAnalysisPR,
        erpSynced: true,
        erpRefId: erpRef,
        status: 'APPROVED',
      });
    }

    // Mirror to persistent layer
    updateRequisitionStatus(prId, 'APPROVED').catch(() => {});
    logAuditEvent({
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
      action: 'PR_APPROVED_ERP_COMMITTED',
      entityType: 'PURCHASE_REQUISITION',
      entityId: prId,
      newValue: { status: 'APPROVED', erpRefId: erpRef },
      reason: 'Purchase Manager approved and committed PO to SAP S/4HANA',
    }).catch(() => {});

    addToast(
      'ERP Handshake Complete',
      `PO payload successfully committed to SAP S/4HANA (Ref: ${erpRef})`,
      'success'
    );
    return true;
  };

  // TEST 2 & RBAC Enforcement: Requisitioners cannot approve or reject PRs
  const updateRequestStatus = (
    prId: string,
    status: PurchaseRequest['status'],
    note?: string
  ): boolean => {
    const isRestrictedAction =
      status === 'APPROVED' ||
      status === 'REDUCE' ||
      status === 'ON_HOLD' ||
      status === 'REJECTED' ||
      status === 'EXPEDITED' ||
      status === 'INVESTIGATE';

    if (isRequisitionerRole(currentUser.role) && isRestrictedAction) {
      addToast(
        'Permission Denied (RBAC)',
        'Requisitioners are strictly forbidden from approving, rejecting, or changing manager decision states.',
        'error'
      );
      return false;
    }

    setRequests((prev) =>
      prev.map((pr) => {
        if (pr.id === prId) {
          return {
            ...pr,
            status,
            additionalNotes: note
              ? pr.additionalNotes
                ? `${pr.additionalNotes} | [Audit: ${note}]`
                : `[Audit: ${note}]`
              : pr.additionalNotes,
          };
        }
        return pr;
      })
    );

    if (currentAnalysisPR && currentAnalysisPR.id === prId) {
      setCurrentAnalysisPR({
        ...currentAnalysisPR,
        status,
        additionalNotes: note
          ? currentAnalysisPR.additionalNotes
            ? `${currentAnalysisPR.additionalNotes} | [Audit: ${note}]`
            : `[Audit: ${note}]`
          : currentAnalysisPR.additionalNotes,
      });
    }

    // Mirror to persistent layer
    const mappedStatus =
      status === 'APPROVED'
        ? 'APPROVED'
        : status === 'REDUCE'
        ? 'REDUCED'
        : status === 'ON_HOLD'
        ? 'HOLD'
        : status === 'REJECTED'
        ? 'REJECTED'
        : 'MANAGER_REVIEW';

    updateRequisitionStatus(prId, mappedStatus as any).catch(() => {});
    logAuditEvent({
      user: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
      action: 'PR_STATUS_CHANGED',
      entityType: 'PURCHASE_REQUISITION',
      entityId: prId,
      newValue: { status },
      reason: note || 'Status updated via procurement workflow',
    }).catch(() => {});

    return true;
  };

  // TEST 3 & TEST 5: Purchase Manager Decision Recording with strict RBAC enforcement
  const recordManagerDecision = async (
    requisitionId: string,
    decisionType: 'APPROVE' | 'REDUCE' | 'HOLD' | 'REJECT' | 'TRANSFER_FIRST',
    details: {
      originalQuantity: number;
      approvedQuantity: number;
      transferQuantity?: number;
      justification: string;
      overrideAiReason?: string;
    }
  ): Promise<boolean> => {
    // TEST 3: Requisitioner attempts to modify or create a manager decision -> DENIED
    if (isRequisitionerRole(currentUser.role)) {
      addToast(
        'Permission Denied (RBAC Rule 6.4)',
        'Requisitioners are strictly forbidden from creating or modifying purchase manager decisions.',
        'error'
      );
      throw new Error('Access Denied: Requisitioners cannot record or modify manager decisions.');
    }

    const decisionId = `DEC-${requisitionId}-${Date.now()}`;
    const decisionDoc: ManagerDecisionDoc = {
      id: decisionId,
      requisitionId,
      managerId: currentUser.id,
      managerName: currentUser.name,
      managerEmail: currentUser.email,
      manager: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
      },
      decision: decisionType,
      originalQuantity: details.originalQuantity,
      approvedQuantity: details.approvedQuantity,
      transferQuantity: details.transferQuantity || 0,
      justification: details.justification,
      overrideAiReason: details.overrideAiReason,
      savingsEstimated: 0,
      aiRecommendation: 'Gatekeeper audit recommendations evaluated',
      decisionTimestamp: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      await recordManagerDecisionService(decisionDoc);

      const mappedStatus =
        decisionType === 'APPROVE'
          ? 'APPROVED'
          : decisionType === 'REDUCE'
          ? 'REDUCED'
          : decisionType === 'HOLD'
          ? 'HOLD'
          : 'REJECTED';

      await updateRequisitionStatus(requisitionId, mappedStatus);

      // Also update local state
      updateRequestStatus(
        requisitionId,
        decisionType === 'APPROVE'
          ? 'APPROVED'
          : decisionType === 'REDUCE'
          ? 'REDUCE'
          : decisionType === 'HOLD'
          ? 'ON_HOLD'
          : 'REJECTED',
        details.justification
      );

      logAuditEvent({
        user: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
        },
        action: 'MANAGER_DECISION_RECORDED',
        entityType: 'PURCHASE_REQUISITION',
        entityId: requisitionId,
        newValue: { decision: decisionType, approvedQty: details.approvedQuantity },
        reason: details.justification,
      }).catch(() => {});

      addToast(
        'Manager Decision Recorded',
        `Decision [${decisionType}] persisted to Firestore ledger.`,
        'success'
      );
      return true;
    } catch (err: any) {
      addToast(
        'Decision Record Failed',
        err?.message || 'Error recording manager decision.',
        'error'
      );
      throw err;
    }
  };

  return (
    <ProcurementContext.Provider
      value={{
        currentRoute,
        navigateTo,
        currentUser,
        switchUser,
        requests,
        setRequests,
        authorizedRequests,
        activeDraft,
        updateDraft,
        resetDraft,
        currentAnalysisPR,
        setCurrentAnalysisPR,
        startAnalysisFlow,
        approveAndSendToERP,
        updateRequestStatus,
        recordManagerDecision,
        toasts,
        addToast,
        removeToast,
        selectedRequestForModal,
        setSelectedRequestForModal,
      }}
    >
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcure = () => {
  const context = useContext(ProcurementContext);
  if (!context) {
    throw new Error('useProcure must be used within a ProcurementProvider');
  }
  return context;
};
