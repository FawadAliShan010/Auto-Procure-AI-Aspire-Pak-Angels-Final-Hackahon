import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ToastContainer } from '../common/ToastContainer';
import { RequestDetailModal } from '../common/RequestDetailModal';
import { useProcure } from '../../context/ProcurementContext';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { currentRoute } = useProcure();

  // If on login route, display full screen view
  if (currentRoute === '/login') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-between">
        {children}
        <ToastContainer />
        <RequestDetailModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Overlays */}
      <ToastContainer />
      <RequestDetailModal />
    </div>
  );
};
