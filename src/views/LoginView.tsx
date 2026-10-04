import React, { useState } from 'react';
import { useProcure } from '../context/ProcurementContext';
import { useAuth } from '../context/AuthContext';
import { CURRENT_USER, ALTERNATE_USER } from '../data/mockProcurementData';
import { EnterpriseRole, UserProfile } from '../types/procurement';
import {
  Hexagon,
  ShieldCheck,
  Sparkles,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';

type AuthMode = 'signin' | 'signup';

export const LoginView: React.FC = () => {
  const { navigateTo, switchUser, addToast } = useProcure();
  const {
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signInWithDemo,
    authError,
    clearAuthError,
  } = useAuth();

  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<EnterpriseRole>('REQUISITIONER');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setLocalError(null);
      clearAuthError();
      await signInWithGoogle();
      addToast('Welcome to AutoProcure AI', 'Successfully authenticated with Google', 'success');
      navigateTo('/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('popup-blocked') || msg.includes('popup')) {
        setLocalError('Google Sign-In popup was blocked by the browser or iframe. Open app in a new browser tab for Google Auth, or use the 1-click Role Sandbox below.');
      } else {
        setLocalError(msg || 'Unable to sign in with Google. Please use Email & Password or the Role Sandbox below.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setLocalError('Please fill in both email and password.');
      return;
    }

    if (authMode === 'signup' && !displayName.trim()) {
      setLocalError('Please enter your full name for the enterprise profile.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLocalError(null);
      clearAuthError();

      if (authMode === 'signup') {
        await signUpWithEmail(email, password, displayName, selectedRole);
        addToast('Account Created', `Welcome to AutoProcure AI, ${displayName}!`, 'success');
      } else {
        await signInWithEmail(email, password);
        addToast('Welcome Back', 'Successfully signed in to AutoProcure AI', 'success');
      }

      navigateTo('/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('operation-not-allowed')) {
        setLocalError('Email/Password provider is not currently toggled on in the Firebase project console. Please use the 1-click Role Sandbox below to immediately access the application with full capabilities.');
      } else {
        setLocalError(msg || 'Authentication failed. Please verify your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSignIn = (persona: UserProfile) => {
    signInWithDemo(persona);
    switchUser(persona);
    addToast('Authenticated (Sandbox)', `Logged in as ${persona.name} (${persona.role})`, 'info');
    navigateTo('/dashboard');
  };

  const displayError = localError || authError;

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-[#090E1A]">
      {/* Left Column: Deep Navy Brand Hero */}
      <div className="flex-1 bg-[#0A0F1D] text-white p-8 md:p-14 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
        <div>
          {/* Top Bar */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md border border-indigo-400/30">
              <Hexagon className="w-5 h-5 fill-white/20 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base">
                  AutoProcure AI
                </span>
                <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 px-1.5 py-0.5 rounded">
                  v2.4
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Enterprise Pre-Submission Gatekeeper
              </span>
            </div>
          </div>

          {/* Value Proposition */}
          <div className="max-w-md space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Role-Based Access Control (RBAC)</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              AI-Powered Autonomous Verification for Enterprise Procurement.
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Enforcing strict segregation of duties across Requisitioners, Purchase Managers, and Administrators before ERP commitment.
            </p>

            {/* Feature Badges */}
            <div className="pt-3 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-white font-semibold">4-Gate Deterministic Engine:</strong>{' '}
                  <span className="text-slate-400">
                    Clean, Budget Check, Sister-Site Stock, Usage Validation
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-white font-semibold">Segregation of Duties:</strong>{' '}
                  <span className="text-slate-400">
                    Requisitioners cannot self-approve; manager approval authority enforced
                  </span>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <strong className="text-white font-semibold">Audit Ledger:</strong>{' '}
                  <span className="text-slate-400">
                    Immutable persistent audit logging for regulatory compliance
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer Note */}
        <div className="pt-8 mt-8 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted with Cloud Firestore Security Rules</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">PRD v2.4</span>
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="w-full md:w-[460px] bg-[#0E1526] p-6 sm:p-10 flex flex-col justify-center border-l border-slate-800">
        <div className="w-full max-w-sm mx-auto">
          {/* Card Title & Mode Toggle */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight mb-1">
              {authMode === 'signin' ? 'Sign In to Workspace' : 'Create Enterprise Account'}
            </h2>
            <p className="text-xs text-slate-400">
              {authMode === 'signin'
                ? 'Authenticate with your corporate identity'
                : 'Register your enterprise procurement profile'}
            </p>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-xl border border-slate-800 mt-4">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setLocalError(null);
                  clearAuthError();
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setLocalError(null);
                  clearAuthError();
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {displayError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Authentication Notice</span>
                <span>{displayError}</span>
              </div>
              <button
                onClick={() => {
                  setLocalError(null);
                  clearAuthError();
                }}
                className="text-rose-400 hover:text-white text-xs cursor-pointer ml-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Primary Action: Continue with Google */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border border-slate-200 mb-4"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-indigo-600 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
              <span className="bg-[#0E1526] px-2.5 text-slate-500">
                Or with Corporate Email
              </span>
            </div>
          </div>

          {/* Email & Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {authMode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="e.g. Fawad Ali Shan"
                    required={authMode === 'signup'}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="fawad.alishan@enterprise.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300">
                  Password
                </label>
                <span className="text-[10px] text-slate-500">Min 6 characters</span>
              </div>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-8 pr-9 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Role selection on sign up */}
            {authMode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Requested Security Clearance
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as EnterpriseRole)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-white text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="REQUISITIONER">Requisitioner (Create & Track PRs)</option>
                  <option value="PURCHASE_MANAGER">Purchase Manager (Review & Approval Authority)</option>
                  <option value="ADMIN">Governance Administrator (System Administration)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Enforces Firestore security rules based on role assignments.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || isGoogleLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed border border-indigo-500"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {authMode === 'signin'
                      ? 'Sign In to Gatekeeper'
                      : 'Create Enterprise Account'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Role Simulation Sandbox (Requisitioner & Manager Personas) */}
          <div className="mt-5 pt-3.5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Development Role Sandbox
              </span>
              <span className="text-[9px] font-mono text-indigo-400 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-800/60">
                2 ROLES
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoSignIn(ALTERNATE_USER)}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/80 hover:bg-slate-850 text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="font-semibold text-[11px] text-white group-hover:text-emerald-300 transition-colors truncate">
                  Marcus Vance
                </div>
                <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                  Requisitioner
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleDemoSignIn(CURRENT_USER)}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/80 hover:bg-slate-850 text-left transition-all cursor-pointer group shadow-2xs"
              >
                <div className="font-semibold text-[11px] text-white group-hover:text-amber-300 transition-colors truncate">
                  Fawad Ali Shan
                </div>
                <div className="text-[9px] font-mono text-amber-400 font-bold uppercase">
                  Manager
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
