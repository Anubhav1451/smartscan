import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginScreen() {
  const { signIn, signInDemo, signInStaffDemo, signInManagerDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await signInDemo();
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleStaffDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await signInStaffDemo();
    } catch (err) {
      setError(err.message || 'Staff login failed.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleManagerDemo = async () => {
    setError('');
    setDemoLoading(true);
    try {
      await signInManagerDemo();
    } catch (err) {
      setError(err.message || 'Manager login failed.');
    } finally {
      setDemoLoading(false);
    }
  };


  return (
    <div className="flex-1 flex flex-col justify-between px-6 py-8 overflow-y-auto bg-cream">
      {/* Brand & Header */}
      <div className="flex flex-col items-center text-center mt-3">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-md mb-2.5 p-2.5">
          {/* Locked SVG Brand Logo */}
          <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9 text-cream" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 16V12C14 6.47715 18.4772 2 24 2C29.5228 2 34 6.47715 34 12V16" stroke="#F6F2E7" strokeWidth="4" strokeLinecap="round"/>
            <rect x="6" y="14" width="36" height="30" rx="6" fill="#14532D" stroke="#F6F2E7" strokeWidth="3"/>
            <path d="M16 29L22 35L33 21" stroke="#F6F2E7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 className="text-xl font-bold text-ink tracking-tight">SmartScan</h1>
        <p className="text-ink-muted text-xs font-medium">Scan. Pay. Walk Out.</p>
        <span className="text-[10px] font-semibold text-primary uppercase tracking-wider bg-surface-tint px-2.5 py-0.5 rounded-full mt-1.5">
          Multi-Retailer Scan-and-Go
        </span>
      </div>

      {/* Login Form */}
      <div className="w-full max-w-sm mx-auto my-6">
        {error && (
          <div className="mb-4 p-3 bg-alert-bg border border-alert/20 rounded-card-sm flex items-start gap-2.5 text-alert text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Email address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-card text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white border border-neutral-200 rounded-card text-ink text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white font-semibold rounded-card shadow-sm flex items-center justify-center gap-2 transition disabled:opacity-70 text-sm mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <span className="relative px-3 bg-cream text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
            Fast Demo Access
          </span>
        </div>

        {/* One-Tap Demo Login Button */}
        <button
          type="button"
          onClick={handleDemoSignIn}
          disabled={loading || demoLoading}
          className="w-full py-3.5 bg-cream-card hover:bg-surface-tint border border-primary/20 text-ink font-semibold rounded-card shadow-xs flex items-center justify-center gap-2.5 transition disabled:opacity-70 text-sm"
        >
          {demoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Continue as Demo Customer</span>
            </>
          )}
        </button>

        {/* Quick Staff & Manager links */}
        <div className="mt-4 text-center space-y-2">
          <button
            type="button"
            onClick={handleStaffDemo}
            className="text-xs text-primary hover:underline font-semibold block w-full"
          >
            Switch to Exit Staff Demo (FreshMart)
          </button>
          <button
            type="button"
            onClick={handleManagerDemo}
            className="text-xs text-primary-dark hover:underline font-semibold block w-full"
          >
            Switch to Manager Dashboard Demo (FreshMart)
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-ink-muted">
        <span>SmartScan · Stage Prototype</span>
      </div>
    </div>
  );
}
