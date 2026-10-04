import React, { ReactNode, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useProcure } from '../../context/ProcurementContext';
import { AuthLoadingScreen } from './AuthLoadingScreen';
import { LoginView } from '../../views/LoginView';
import { AccessDenied } from './AccessDenied';
import { isRequisitionerRole } from '../../types/procurement';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isAuthLoading, enterpriseRole } = useAuth();
  const { currentRoute, navigateTo } = useProcure();

  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated && currentRoute !== '/login') {
        // Redirect unauthenticated users immediately to /login
        navigateTo('/login');
      } else if (isAuthenticated && currentRoute === '/login') {
        // Redirect authenticated users from /login to /dashboard
        navigateTo('/dashboard');
      }
    }
  }, [isAuthenticated, isAuthLoading, currentRoute, navigateTo]);

  // While Firebase is initializing auth state, show professional loading screen without flicker
  if (isAuthLoading) {
    return <AuthLoadingScreen />;
  }

  // If unauthenticated and on a protected route, show LoginView immediately while route syncs
  if (!isAuthenticated && currentRoute !== '/login') {
    return <LoginView />;
  }

  // TEST 8 & Direct URL manipulation protection:
  // If user is REQUISITIONER and tries to access /decision or /analytics directly:
  if (isAuthenticated && isRequisitionerRole(enterpriseRole)) {
    if (currentRoute === '/decision') {
      return (
        <AccessDenied
          title="Access Denied — Decision Authority Restricted"
          requiredRole="PURCHASE_MANAGER or ADMIN"
          currentRole="REQUISITIONER"
          attemptedResource="/decision (Purchase Manager Decision Authority)"
          message="Requisitioners cannot approve, reject, or modify managerial decisions. Only authorized Purchase Managers or Administrators can make approval decisions."
        />
      );
    }
    if (currentRoute === '/analytics') {
      return (
        <AccessDenied
          title="Access Denied — Spend Analytics Restricted"
          requiredRole="PURCHASE_MANAGER or ADMIN"
          currentRole="REQUISITIONER"
          attemptedResource="/analytics (Executive Spend & Historical Analytics)"
          message="Company-wide historical trends, supplier spend ledgers, and site performance analytics are reserved for procurement leadership."
        />
      );
    }
  }

  return <>{children}</>;
};
