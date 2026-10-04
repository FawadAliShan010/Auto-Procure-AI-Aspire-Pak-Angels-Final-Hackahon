import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { ProcurementProvider, useProcure } from './context/ProcurementContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { SubmitPRView } from './views/SubmitPRView';
import { ProcessingView } from './views/ProcessingView';
import { AnalysisView } from './views/AnalysisView';
import { DecisionView } from './views/DecisionView';
import { RecommendationView } from './views/RecommendationView';
import { RequestsView } from './views/RequestsView';
import { AnalyticsView } from './views/AnalyticsView';
import { SettingsView } from './views/SettingsView';
import { HistoricalDataView } from './views/HistoricalDataView';
import { motion, AnimatePresence } from 'motion/react';

const AppContent: React.FC = () => {
  const { currentRoute } = useProcure();

  const renderCurrentView = () => {
    switch (currentRoute) {
      case '/login':
        return <LoginView />;
      case '/dashboard':
        return <DashboardView />;
      case '/submit':
        return <SubmitPRView />;
      case '/processing':
        return <ProcessingView />;
      case '/analysis':
        return <AnalysisView />;
      case '/decision':
        return <DecisionView />;
      case '/recommendation':
        return <RecommendationView />;
      case '/requests':
        return <RequestsView />;
      case '/analytics':
        return <AnalyticsView />;
      case '/settings':
        return <SettingsView />;
      case '/historical-data':
        return <HistoricalDataView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <ProtectedRoute>
      <AppLayout>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRoute}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {renderCurrentView()}
          </motion.div>
        </AnimatePresence>
      </AppLayout>
    </ProtectedRoute>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ProcurementProvider>
        <AppContent />
      </ProcurementProvider>
    </AuthProvider>
  );
}
