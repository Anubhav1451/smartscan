import React from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, LogOut, ShieldAlert } from 'lucide-react';

export default function ManagerPlaceholder() {
  const { profile, signOut } = useAuth();
  const storeName = profile?.store?.name || 'FreshMart';

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none relative justify-between p-6">
      <header className="flex justify-between items-center pt-2">
        <span className="text-xs font-bold text-primary uppercase tracking-wider">Manager View</span>
        <button
          type="button"
          onClick={signOut}
          className="p-1.5 rounded-full hover:bg-neutral-200 text-ink-muted transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      <div className="my-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary-dark text-white flex items-center justify-center mx-auto shadow-md">
          <BarChart3 className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-ink">Manager Dashboard</h2>
          <span className="inline-block px-3 py-1 bg-surface-tint text-primary text-xs font-semibold rounded-full">
            Coming in Phase 3
          </span>
          <p className="text-xs text-ink-muted max-w-xs mx-auto mt-2 leading-relaxed">
            KPI metrics, 7-day sales charts, top products, and live transaction logs for <span className="font-bold text-ink">{storeName}</span> are scheduled for Phase 3.
          </p>
        </div>
      </div>

      <div className="text-center pb-2">
        <button
          type="button"
          onClick={signOut}
          className="w-full py-3 bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-semibold rounded-card transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
