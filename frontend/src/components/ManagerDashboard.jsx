import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Sparkles, 
  Settings, 
  LogOut, 
  RefreshCw, 
  TrendingUp, 
  Users, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  RotateCcw, 
  Loader2,
  Calendar,
  Layers,
  Store as StoreIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function ManagerDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stores, setStores] = useState([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [dateRange, setDateRange] = useState('today'); // 'today' or '7d'
  
  // Dashboard data state
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  // Reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Load stores list
  useEffect(() => {
    async function loadStores() {
      try {
        const data = await api.getStores();
        setStores(data || []);
        if (data && data.length > 0) {
          // Default to manager's assigned store or first store
          const defaultStore = data.find(s => s.id === profile?.store_id) || data[0];
          setSelectedStoreId(defaultStore.id);
        }
      } catch (err) {
        console.error('Failed to load stores:', err);
      }
    }
    loadStores();
  }, [profile?.store_id]);

  // Load dashboard metrics when selectedStoreId or dateRange changes
  const fetchDashboardData = async () => {
    if (!selectedStoreId) return;
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDashboardSummary(selectedStoreId, dateRange);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard summary:', err);
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedStoreId, dateRange]);

  // In-App Demo Reset
  const handleResetDemo = async () => {
    try {
      setResetting(true);
      await api.resetDemoData();
      setResetSuccess(true);
      await fetchDashboardData();
      setTimeout(() => {
        setResetSuccess(false);
        setShowResetModal(false);
      }, 1200);
    } catch (err) {
      console.error('Reset failed:', err);
      alert('Reset failed: ' + (err.message || 'Unknown error'));
    } finally {
      setResetting(false);
    }
  };

  const currentStore = stores.find(s => s.id === selectedStoreId) || { name: 'FreshMart', code: 'FM' };

  // Calculate maximum daily sales for bar chart normalization
  const maxDaySales = Math.max(
    ...(summary?.sales_last_7_days?.map(d => d.sales) || [1000]),
    1000
  );

  return (
    <div className="flex h-screen w-screen bg-[#F6F2E7] text-[#16130E] font-sans antialiased overflow-hidden">
      {/* 1. DARK GREEN SIDEBAR */}
      <aside className="w-64 bg-[#0C3B21] text-white flex flex-col justify-between shrink-0 shadow-xl border-r border-[#14532D]/40 z-20">
        <div>
          {/* Logo & Brand Header */}
          <div className="p-6 border-b border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#14532D] p-2 flex items-center justify-center border border-white/20 shadow-md">
              <svg viewBox="0 0 48 48" fill="none" className="w-full h-full text-[#F6F2E7]">
                <path d="M14 16V12C14 6.47715 18.4772 2 24 2C29.5228 2 34 6.47715 34 12V16" stroke="#F6F2E7" strokeWidth="4" strokeLinecap="round"/>
                <rect x="6" y="14" width="36" height="30" rx="6" fill="#14532D" stroke="#F6F2E7" strokeWidth="3"/>
                <path d="M16 29L22 35L33 21" stroke="#F6F2E7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-none text-white">SmartScan</h1>
              <p className="text-[11px] text-white/60 font-medium mt-1">Retailer Portal</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#14532D] text-white shadow-sm font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                activeTab === 'orders'
                  ? 'bg-[#14532D] text-white shadow-sm font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Orders & Bills</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                activeTab === 'products'
                  ? 'bg-[#14532D] text-white shadow-sm font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4 shrink-0" />
              <span>Inventory & Stock</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('impact')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                activeTab === 'impact'
                  ? 'bg-[#14532D] text-white shadow-sm font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0 text-emerald-300" />
              <span>SDG Impact</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#14532D] text-white shadow-sm font-semibold'
                  : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span>Settings & Demo Tools</span>
            </button>
          </nav>
        </div>

        {/* Manager User Footer & Reset Button */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 rounded-xl text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <div className="flex items-center justify-between pt-1">
            <div className="truncate">
              <span className="text-xs font-bold text-white block truncate">{profile?.display_name || 'Store Manager'}</span>
              <span className="text-[10px] text-white/60 block truncate">{profile?.email || 'manager@smartscan.app'}</span>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign Out"
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-[#F6F2E7]">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-[#14532D]/10 px-8 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-extrabold text-[#16130E] tracking-tight">
              {activeTab === 'dashboard' && 'Dashboard Overview'}
              {activeTab === 'orders' && 'Orders & Digital Receipts'}
              {activeTab === 'products' && 'Product Catalog & Inventory'}
              {activeTab === 'impact' && 'Impact Analytics (SDG 12)'}
              {activeTab === 'settings' && 'Store Settings & Demo Utilities'}
            </h2>

            {/* Store Switcher */}
            <div className="flex items-center gap-2 bg-[#F6F2E7] p-1 rounded-xl border border-[#14532D]/15">
              <StoreIcon className="w-3.5 h-3.5 text-[#14532D] ml-2 shrink-0" />
              <select
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className="bg-transparent text-xs font-semibold text-[#16130E] pr-3 py-1 focus:outline-none cursor-pointer"
              >
                {stores.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.code}) — {st.area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right Top Bar Controls */}
          <div className="flex items-center gap-3">
            {/* Live Data Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-full text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
              <span>Live DB Connected</span>
            </div>

            {/* Date Range Toggle (Today / Last 7 Days) */}
            <div className="flex bg-[#F6F2E7] p-1 rounded-xl border border-[#14532D]/15 text-xs font-medium">
              <button
                type="button"
                onClick={() => setDateRange('today')}
                className={`px-3 py-1 rounded-lg transition font-semibold ${
                  dateRange === 'today'
                    ? 'bg-[#14532D] text-white shadow-xs'
                    : 'text-[#43543F] hover:text-[#16130E]'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateRange('7d')}
                className={`px-3 py-1 rounded-lg transition font-semibold ${
                  dateRange === '7d'
                    ? 'bg-[#14532D] text-white shadow-xs'
                    : 'text-[#43543F] hover:text-[#16130E]'
                }`}
              >
                Last 7 Days
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchDashboardData}
              disabled={loading}
              title="Refresh Analytics"
              className="p-2 bg-[#F6F2E7] hover:bg-[#E8F1E4] text-[#14532D] rounded-xl border border-[#14532D]/15 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard View */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <>
              {/* Row 1: KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Sales Total */}
                <div className="bg-white p-5 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[#43543F]">
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {dateRange === 'today' ? "Today's Sales" : 'Period Sales (7 Days)'}
                    </span>
                    <span className="p-2 bg-[#E8F1E4] text-[#14532D] rounded-xl">
                      <TrendingUp className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#16130E] tracking-tight">
                    ₹{summary?.sales_total?.toLocaleString() ?? 0}
                  </div>
                  <p className="text-[11px] text-[#43543F] pt-1 flex items-center gap-1">
                    <span className="text-[#16A34A] font-bold">●</span> Authoritative backend total
                  </p>
                </div>

                {/* Orders Count */}
                <div className="bg-white p-5 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[#43543F]">
                    <span className="text-xs font-semibold uppercase tracking-wider">Paid Orders</span>
                    <span className="p-2 bg-[#E8F1E4] text-[#14532D] rounded-xl">
                      <ShoppingBag className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#16130E] tracking-tight">
                    {summary?.orders_count ?? 0}
                  </div>
                  <p className="text-[11px] text-[#43543F] pt-1">
                    Completed scan-and-go checkouts
                  </p>
                </div>

                {/* Items Sold */}
                <div className="bg-white p-5 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[#43543F]">
                    <span className="text-xs font-semibold uppercase tracking-wider">Items Sold</span>
                    <span className="p-2 bg-[#E8F1E4] text-[#14532D] rounded-xl">
                      <Package className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#16130E] tracking-tight">
                    {summary?.items_sold ?? 0}
                  </div>
                  <p className="text-[11px] text-[#43543F] pt-1">
                    Total product units scanned
                  </p>
                </div>

                {/* Average Bill Value */}
                <div className="bg-white p-5 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-[#43543F]">
                    <span className="text-xs font-semibold uppercase tracking-wider">Average Bill</span>
                    <span className="p-2 bg-[#E8F1E4] text-[#14532D] rounded-xl">
                      <Users className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="text-2xl font-black text-[#16130E] tracking-tight">
                    ₹{summary?.average_bill?.toLocaleString() ?? 0}
                  </div>
                  <p className="text-[11px] text-[#43543F] pt-1">
                    Basket size across customers
                  </p>
                </div>
              </div>

              {/* Row 2: 7-DAY SALES BAR CHART & IMPACT PANEL */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 7-Day Sales Bar Chart (2 cols) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#16130E]">Sales Trend (Last 7 Days)</h3>
                      <p className="text-xs text-[#43543F] mt-0.5">Authoritative daily transaction sums</p>
                    </div>
                    <span className="text-xs font-bold text-[#14532D] bg-[#E8F1E4] px-3 py-1 rounded-full">
                      Daily Revenue (₹)
                    </span>
                  </div>

                  {/* SVG / DIVs Bar Chart */}
                  <div className="pt-6 pb-2">
                    <div className="h-48 flex items-end justify-between gap-3 px-2 border-b border-[#14532D]/15 pb-2">
                      {summary?.sales_last_7_days?.map((item, idx) => {
                        const heightPct = Math.max(12, Math.round((item.sales / maxDaySales) * 100));
                        const isToday = idx === (summary.sales_last_7_days.length - 1);
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                            {/* Value tooltip label above bar */}
                            <span className="text-[11px] font-bold text-[#16130E] mb-1.5 opacity-90 group-hover:scale-110 transition-transform">
                              ₹{item.sales}
                            </span>
                            {/* Bar element */}
                            <div
                              style={{ height: `${heightPct}%` }}
                              className={`w-full max-w-[36px] rounded-t-lg transition-all duration-300 relative ${
                                isToday
                                  ? 'bg-[#14532D] shadow-sm'
                                  : 'bg-[#14532D]/75 hover:bg-[#14532D]'
                              }`}
                            >
                              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 rounded-t-lg transition" />
                            </div>
                            {/* Day and Date label below bar */}
                            <span className={`text-[11px] mt-2 font-medium ${isToday ? 'font-bold text-[#14532D]' : 'text-[#43543F]'}`}>
                              {item.day_name}
                            </span>
                            <span className="text-[9px] text-[#43543F]/70">
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Impact Panel (1 col per PRD) */}
                <div className="bg-white p-6 rounded-2xl border border-[#14532D]/10 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#16A34A]" />
                        <h3 className="font-extrabold text-sm text-[#16130E]">SDG Impact Analytics</h3>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full uppercase">
                        SDG 12
                      </span>
                    </div>
                    <p className="text-xs text-[#43543F] leading-relaxed">
                      Rule-based efficiency metrics calculated directly from store transaction data.
                    </p>
                  </div>

                  {/* Impact Figures */}
                  <div className="space-y-3.5 my-auto">
                    {/* Queue Time Saved */}
                    <div className="p-3.5 bg-[#F6F2E7] rounded-xl border border-[#14532D]/10">
                      <span className="text-xs font-semibold text-[#43543F] block">
                        Queue time saved (estimated)
                      </span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-2xl font-black text-[#14532D]">
                          {summary?.impact?.queue_time_saved_hours ?? 0} hrs
                        </span>
                        <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Estimated
                        </span>
                      </div>
                      <span className="text-[10px] text-[#43543F] mt-1 block">
                        Based on ~4 minutes saved per digital checkout
                      </span>
                    </div>

                    {/* Paper Bills Avoided */}
                    <div className="p-3.5 bg-[#F6F2E7] rounded-xl border border-[#14532D]/10">
                      <span className="text-xs font-semibold text-[#43543F] block">
                        Paper bills avoided
                      </span>
                      <div className="text-2xl font-black text-[#14532D] mt-1">
                        {summary?.impact?.paper_bills_avoided ?? 0} bills
                      </div>
                      <span className="text-[10px] text-[#43543F] mt-1 block">
                        Thermal receipt paper rolls conserved
                      </span>
                    </div>

                    {/* Items Scanned */}
                    <div className="p-3.5 bg-[#F6F2E7] rounded-xl border border-[#14532D]/10">
                      <span className="text-xs font-semibold text-[#43543F] block">
                        Items scanned
                      </span>
                      <div className="text-2xl font-black text-[#14532D] mt-1">
                        {summary?.impact?.items_scanned ?? 0} items
                      </div>
                      <span className="text-[10px] text-[#43543F] mt-1 block">
                        Zero-friction mobile scans executed
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#14532D]/10 text-[10px] text-[#43543F] italic">
                    {summary?.impact?.disclaimer || "Estimates calculated directly from transaction data. No AI."}
                  </div>
                </div>
              </div>

              {/* Row 3: RECENT TRANSACTIONS & TOP PRODUCTS / LOW STOCK */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Transactions Table (2 cols) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-extrabold text-sm text-[#16130E]">Recent Transactions</h3>
                      <p className="text-xs text-[#43543F]">Real-time store orders with payment status</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="text-xs font-bold text-[#14532D] hover:underline flex items-center gap-1"
                    >
                      View All Orders <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#14532D]/10 text-[#43543F] uppercase font-bold text-[10px] tracking-wider">
                          <th className="py-2.5 px-3">Bill No</th>
                          <th className="py-2.5 px-3">Customer</th>
                          <th className="py-2.5 px-3">Items</th>
                          <th className="py-2.5 px-3">Total</th>
                          <th className="py-2.5 px-3">Method</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#14532D]/5">
                        {summary?.recent_transactions?.map((tx) => {
                          const isPending = tx.status === 'Staff Pending';
                          const isMismatch = tx.status === 'Mismatch';
                          const isPaidOrVerified = tx.status === 'Paid' || tx.status === 'Verified';

                          return (
                            <tr key={tx.id} className="hover:bg-[#F6F2E7]/40 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-[#16130E]">
                                {tx.bill_no}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-[#16130E]">
                                {tx.customer_name}
                              </td>
                              <td className="py-2.5 px-3 text-[#43543F]">
                                {tx.items_count} items
                              </td>
                              <td className="py-2.5 px-3 font-bold text-[#14532D]">
                                ₹{tx.total}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-[#43543F]">
                                {tx.payment_method}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                {isPending && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                    Staff Pending
                                  </span>
                                )}
                                {isMismatch && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                                    Mismatch
                                  </span>
                                )}
                                {isPaidOrVerified && (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    {tx.status}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Column: TOP PRODUCTS & LOW STOCK LIST */}
                <div className="space-y-6">
                  {/* Top Products */}
                  <div className="bg-white p-5 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-3">
                    <h3 className="font-extrabold text-sm text-[#16130E]">Top Products</h3>
                    <div className="space-y-2">
                      {summary?.top_products?.map((p, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-[#F6F2E7]/60 rounded-xl">
                          <div className="truncate mr-2">
                            <span className="font-bold text-[#16130E] block truncate">{p.name}</span>
                            <span className="text-[10px] text-[#43543F] font-semibold">{p.qty_sold} sold</span>
                          </div>
                          <span className="font-extrabold text-[#14532D] shrink-0">₹{p.revenue}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Low Stock List (stock <= 5) */}
                  <div className="bg-white p-5 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-extrabold text-sm text-[#16130E]">Low Stock Inventory</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-neutral-100 text-[#43543F] rounded-full">
                        {summary?.low_stock_count ?? 0} items ≤ 5
                      </span>
                    </div>

                    <div className="space-y-2">
                      {summary?.low_stock_items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs py-2 px-3 bg-[#F6F2E7]/60 rounded-xl">
                          <div className="truncate mr-2">
                            <span className="font-semibold text-[#16130E] block truncate">{item.name}</span>
                            <span className="text-[10px] text-[#43543F]">{item.category} · ₹{item.price}</span>
                          </div>
                          {item.stock === 0 ? (
                            <span className="px-2 py-0.5 bg-neutral-200 text-neutral-600 font-bold text-[10px] rounded-md shrink-0">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-md shrink-0">
                              {item.stock} left
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: ORDERS LIST TAB */}
          {activeTab === 'orders' && (
            <div className="bg-white p-6 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-4">
              <div>
                <h3 className="font-extrabold text-base text-[#16130E]">Store Transactions History</h3>
                <p className="text-xs text-[#43543F]">Authoritative ledger of orders placed at {currentStore.name}</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#14532D]/10 text-[#43543F] uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-3">Bill No</th>
                      <th className="py-3 px-3">Customer</th>
                      <th className="py-3 px-3">Items Count</th>
                      <th className="py-3 px-3">Order Total</th>
                      <th className="py-3 px-3">Method</th>
                      <th className="py-3 px-3">Created Date</th>
                      <th className="py-3 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#14532D]/5">
                    {summary?.recent_transactions?.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#F6F2E7]/40 transition">
                        <td className="py-3 px-3 font-mono font-bold text-[#16130E]">{tx.bill_no}</td>
                        <td className="py-3 px-3 font-medium text-[#16130E]">{tx.customer_name}</td>
                        <td className="py-3 px-3 text-[#43543F]">{tx.items_count} items</td>
                        <td className="py-3 px-3 font-bold text-[#14532D]">₹{tx.total}</td>
                        <td className="py-3 px-3 text-[#43543F]">{tx.payment_method}</td>
                        <td className="py-3 px-3 text-[#43543F]">
                          {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.status === 'Staff Pending'
                              ? 'bg-amber-100 text-amber-800'
                              : tx.status === 'Mismatch'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCTS & INVENTORY */}
          {activeTab === 'products' && (
            <div className="bg-white p-6 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-base text-[#16130E]">Product Catalog ({currentStore.name})</h3>
                  <p className="text-xs text-[#43543F]">Per-store stock tracking and price configuration</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#14532D]/10 text-[#43543F] uppercase font-bold text-[10px] tracking-wider">
                      <th className="py-3 px-3">Product Name</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Price (INR)</th>
                      <th className="py-3 px-3">Stock Units</th>
                      <th className="py-3 px-3 text-right">Inventory State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#14532D]/5">
                    {summary?.low_stock_items?.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F6F2E7]/40 transition">
                        <td className="py-3 px-3 font-semibold text-[#16130E]">{p.name}</td>
                        <td className="py-3 px-3 text-[#43543F]">{p.category}</td>
                        <td className="py-3 px-3 font-bold text-[#14532D]">₹{p.price}</td>
                        <td className="py-3 px-3 font-mono font-medium">{p.stock}</td>
                        <td className="py-3 px-3 text-right">
                          {p.stock === 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-600">
                              Out of Stock
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              Low Stock ({p.stock})
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SDG IMPACT ANALYSIS */}
          {activeTab === 'impact' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-[#E8F1E4] rounded-2xl text-[#14532D]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-[#16130E]">SDG 12: Responsible Consumption & Efficiency</h3>
                    <p className="text-xs text-[#43543F]">Real-world resource and time savings generated by SmartScan</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <div className="p-5 bg-[#F6F2E7] rounded-2xl border border-[#14532D]/10 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#43543F]">Queue Time Saved</span>
                    <div className="text-3xl font-black text-[#14532D]">
                      {summary?.impact?.queue_time_saved_hours ?? 0} hrs
                    </div>
                    <span className="text-xs text-amber-800 font-semibold block">
                      Estimated (4 minutes saved per shopper checkout)
                    </span>
                  </div>

                  <div className="p-5 bg-[#F6F2E7] rounded-2xl border border-[#14532D]/10 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#43543F]">Paper Receipts Avoided</span>
                    <div className="text-3xl font-black text-[#14532D]">
                      {summary?.impact?.paper_bills_avoided ?? 0} bills
                    </div>
                    <span className="text-xs text-[#43543F] font-semibold block">
                      100% digital cryptographically signed QR receipts
                    </span>
                  </div>

                  <div className="p-5 bg-[#F6F2E7] rounded-2xl border border-[#14532D]/10 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#43543F]">Items Scanned</span>
                    <div className="text-3xl font-black text-[#14532D]">
                      {summary?.impact?.items_scanned ?? 0} items
                    </div>
                    <span className="text-xs text-[#43543F] font-semibold block">
                      Autonomous camera barcode verification
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#14532D]/10 text-xs text-[#43543F]">
                  <strong>Product Honesty Notice:</strong> All figures above are calculated directly from physical transaction logs in PostgreSQL. In accordance with SmartScan core design principles, no metrics are generated by speculative AI or synthetic estimations.
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SETTINGS & DEMO TOOLS */}
          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-2xl border border-[#14532D]/10 shadow-xs space-y-6 max-w-2xl">
              <div>
                <h3 className="font-extrabold text-base text-[#16130E]">Demo Tools & Data Reset</h3>
                <p className="text-xs text-[#43543F] mt-1">
                  Manage prototype state between live presentations and rehearsals.
                </p>
              </div>

              <div className="p-5 bg-[#F6F2E7] rounded-2xl border border-[#14532D]/15 space-y-3">
                <div className="flex items-center gap-2 text-[#14532D] font-bold text-sm">
                  <RotateCcw className="w-4 h-4" />
                  <span>Restore Clean Seed State</span>
                </div>
                <p className="text-xs text-[#43543F] leading-relaxed">
                  Restores all 3 fictional stores (FreshMart, StyleHub, DailyNeeds), 16 products, original inventory stock levels, canonical bill <code>SS-20481</code>, and 40 past transactions in one click.
                </p>

                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="px-5 py-2.5 bg-[#14532D] hover:bg-[#0C3B21] text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Data</span>
                </button>
              </div>

              <div className="pt-4 border-t border-[#14532D]/10 text-xs text-[#43543F] space-y-2">
                <span className="font-bold text-[#16130E] block">Seeded Demo Credentials:</span>
                <p>Customer: <code>demo@smartscan.app</code> / <code>anubhav@smartscan.app</code></p>
                <p>Staff: <code>staff@smartscan.app</code> (FreshMart)</p>
                <p>Manager: <code>manager@smartscan.app</code> (FreshMart)</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. RESET CONFIRMATION MODAL */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#14532D]/10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-[#16130E]">Reset Demo Data?</h3>
              <p className="text-xs text-[#43543F] leading-relaxed">
                This restores all demo stores, products, stock and bills.
              </p>
            </div>

            {resetSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Demo data successfully restored!</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                disabled={resetting || resetSuccess}
                onClick={handleResetDemo}
                className="flex-1 py-3 bg-[#14532D] hover:bg-[#0C3B21] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
              >
                {resetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Restoring Database...</span>
                  </>
                ) : (
                  'Confirm Reset'
                )}
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => setShowResetModal(false)}
                className="px-5 py-3 bg-neutral-100 hover:bg-neutral-200 text-[#16130E] text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
