import React, { useState } from 'react';
import { useProcure } from '../../context/ProcurementContext';
import {
  Search,
  Bell,
  Sparkles,
  Database,
  Plus,
  Command,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { AITestSuiteModal } from '../common/AITestSuiteModal';
import { UserAvatar } from '../common/UserAvatar';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const { navigateTo, requests, setSelectedRequestForModal, addToast, currentUser, updateDraft } = useProcure();
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isAITestOpen, setIsAITestOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      addToast('Signed Out', 'You have been successfully signed out.', 'info');
      navigateTo('/login');
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  const filteredRequests = searchQuery.trim()
    ? requests.filter(
        (r) =>
          r.itemDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.department.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectPR = (pr: any) => {
    setSelectedRequestForModal(pr);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  return (
    <header className="h-15 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search requests, items, codes, or requesters..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchResults(true);
            }}
            onFocus={() => setShowSearchResults(true)}
            className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all focus:bg-white"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          ) : (
            <kbd className="absolute right-2.5 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Live Search Popup */}
        {showSearchResults && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-40 max-h-80 overflow-y-auto">
            <div className="p-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Matching Requests ({filteredRequests.length})</span>
              <button
                onClick={() => setShowSearchResults(false)}
                className="hover:text-slate-800 text-[11px] cursor-pointer"
              >
                Close
              </button>
            </div>
            {filteredRequests.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500">
                No requisitions match "{searchQuery}"
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredRequests.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleSelectPR(r)}
                    className="p-3 hover:bg-slate-50/80 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {r.id}
                        </span>
                        <span className="text-xs font-semibold text-slate-900">
                          {r.itemDescription}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">
                        {r.department} • Qty: {r.quantity}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-800">
                      ${(r.quantity * r.estimatedPrice).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Gemini AI Integration Test Suite Button */}
        <button
          onClick={() => setIsAITestOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold transition-all cursor-pointer shadow-2xs hover:shadow-xs"
          title="Open Gemini AI Integration Test Suite"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">AI Test Suite</span>
          <span className="text-[9px] bg-indigo-200/60 text-indigo-800 px-1.5 py-0.2 rounded font-mono font-bold">Gemini 3.8</span>
        </button>

        {/* ERP System Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>SAP S/4HANA</span>
        </div>

        {/* Submit PR Quick Button */}
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => navigateTo('/submit')}
        >
          New Requisition
        </Button>

        {/* Notifications */}
        <button
          onClick={() =>
            addToast(
              'System Audits Complete',
              'All 4 pre-submission verification gates are operational.',
              'info'
            )
          }
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors relative cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
        </button>

        {/* User Profile & Sign Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <UserAvatar
            id="header-user-avatar"
            name={currentUser.name}
            avatarUrl={currentUser.avatarUrl}
            role={currentUser.role}
            size="sm"
            showRoleBadge={true}
          />
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
              {currentUser.name}
            </div>
            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {currentUser.email || currentUser.role}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Test Suite Modal */}
      <AITestSuiteModal
        isOpen={isAITestOpen}
        onClose={() => setIsAITestOpen(false)}
        onApplyScenarioToDraft={(text, dept, qty, price) => {
          updateDraft({
            itemDescription: text,
            department: dept as any,
            quantity: qty,
            estimatedPrice: price,
          });
          navigateTo('/submit');
          addToast('Test Scenario Applied to Draft', `Loaded "${text}"`, 'success');
        }}
      />
    </header>
  );
};
