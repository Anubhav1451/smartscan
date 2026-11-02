import React from 'react';
import { ShoppingBag, CheckCircle, Smartphone, ShieldCheck, Database, Server } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-cream text-ink flex flex-col font-sans">
      {/* Top Bar */}
      <header className="bg-primary text-white px-6 py-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 p-2 rounded-card-sm flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">SmartScan</h1>
            <p className="text-xs text-white/80 font-medium">Scan. Pay. Walk Out.</p>
          </div>
        </div>
        <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">
          Phase 0: Skeleton Ready
        </span>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        {/* Project Status Card */}
        <section className="bg-white rounded-card p-6 shadow-sm border border-surface-tint">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="w-6 h-6 text-success" />
            <h2 className="text-lg font-bold">Phase 0 — Project Foundation Initialized</h2>
          </div>
          <p className="text-ink-muted text-sm leading-relaxed mb-6">
            Frontend (Vite + React + Tailwind PWA) and Backend (FastAPI) skeletons are configured.
            The design tokens from <code className="bg-cream-card px-2 py-0.5 rounded text-xs font-mono">docs/02_DESIGN.md</code> are
            locked in <code className="bg-cream-card px-2 py-0.5 rounded text-xs font-mono">tailwind.config.js</code> and CSS variables.
          </p>

          {/* Design System Token Verification Swatches */}
          <div className="border-t border-surface-tint pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
              Design Token Palette Check
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-card-sm bg-primary text-white flex flex-col justify-between h-20">
                <span className="font-semibold">primary</span>
                <span className="text-white/80 text-[10px]">#14532D</span>
              </div>
              <div className="p-3 rounded-card-sm bg-primary-dark text-white flex flex-col justify-between h-20">
                <span className="font-semibold">primary-dark</span>
                <span className="text-white/80 text-[10px]">#0C3B21</span>
              </div>
              <div className="p-3 rounded-card-sm bg-cream-card text-ink border border-surface-tint flex flex-col justify-between h-20">
                <span className="font-semibold">cream-card</span>
                <span className="text-ink-muted text-[10px]">#F6EBD7</span>
              </div>
              <div className="p-3 rounded-card-sm bg-surface-tint text-ink border border-surface-alt flex flex-col justify-between h-20">
                <span className="font-semibold">surface-tint</span>
                <span className="text-ink-muted text-[10px]">#E8F1E4</span>
              </div>
              <div className="p-3 rounded-card-sm bg-success text-white flex flex-col justify-between h-20">
                <span className="font-semibold">success</span>
                <span className="text-white/80 text-[10px]">#16A34A</span>
              </div>
              <div className="p-3 rounded-card-sm bg-pending-bg text-pending border border-pending/20 flex flex-col justify-between h-20">
                <span className="font-semibold">pending</span>
                <span className="text-[10px]">#B45309</span>
              </div>
              <div className="p-3 rounded-card-sm bg-alert-bg text-alert border border-alert/20 flex flex-col justify-between h-20">
                <span className="font-semibold">alert</span>
                <span className="text-[10px]">#DC2626</span>
              </div>
              <div className="p-3 rounded-card-sm bg-ink text-white flex flex-col justify-between h-20">
                <span className="font-semibold">ink</span>
                <span className="text-white/80 text-[10px]">#16130E</span>
              </div>
            </div>
          </div>
        </section>

        {/* Core Pillars Overview */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-card border border-surface-tint shadow-sm">
            <Smartphone className="w-5 h-5 text-primary mb-2" />
            <h4 className="font-bold text-sm mb-1">Customer & Staff PWA</h4>
            <p className="text-xs text-ink-muted">
              Mobile-first scanner, in-app store select, mock UPI checkout, and exit verification.
            </p>
          </div>
          <div className="bg-white p-5 rounded-card border border-surface-tint shadow-sm">
            <Server className="w-5 h-5 text-primary mb-2" />
            <h4 className="font-bold text-sm mb-1">FastAPI Backend</h4>
            <p className="text-xs text-ink-muted">
              Single authority for prices, stock validation, order states, and transaction aggregates.
            </p>
          </div>
          <div className="bg-white p-5 rounded-card border border-surface-tint shadow-sm">
            <Database className="w-5 h-5 text-primary mb-2" />
            <h4 className="font-bold text-sm mb-1">Supabase DB & Auth</h4>
            <p className="text-xs text-ink-muted">
              Multi-store schema with RLS policies, EAN-13 demo catalog, and one-command reset.
            </p>
          </div>
        </section>

        {/* Prototype Honesty Notice */}
        <footer className="text-center text-xs text-ink-muted py-4">
          <p>SmartScan Working Prototype · HIMOVATION 2026 · Solve-a-Thon: AI for SDGs</p>
          <p className="mt-1">
            Payments are <strong className="font-medium text-ink">MOCK</strong> · 
            RFID is <strong className="font-medium text-ink">SIMULATED</strong> · 
            Analytics are <strong className="font-medium text-ink">RULE-BASED</strong>
          </p>
        </footer>
      </main>
    </div>
  );
}
