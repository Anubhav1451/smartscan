import React, { useEffect, useState } from 'react';
import { 
  ChevronLeft, 
  Coins, 
  Clock, 
  RefreshCw, 
  ArrowRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export default function CashPendingCustomerScreen({ onNavigate, orderData }) {
  const orderId = orderData?.orderId;
  const total = orderData?.total ?? 0;
  const storeName = orderData?.storeName || 'FreshMart';

  const [status, setStatus] = useState('CASH_PENDING');
  const [checking, setChecking] = useState(false);

  // Poll backend every 2.5 seconds to detect staff cash confirmation
  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(async () => {
      try {
        setChecking(true);
        const order = await api.getOrder(orderId);
        if (order.status === 'BILL_ACTIVE' || order.status === 'VERIFIED_USED') {
          clearInterval(interval);
          onNavigate('bill', { bill: order });
        }
      } catch (err) {
        console.warn('Polling cash status error:', err);
      } finally {
        setChecking(false);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [orderId]);

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none relative">
      {/* Top Header */}
      <header className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-surface-tint bg-cream/90 backdrop-blur-xs sticky top-0 z-20">
        <button 
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center space-x-1.5 text-xs font-semibold text-ink hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Home</span>
        </button>

        <span className="text-[11px] font-semibold text-pending bg-pending-bg px-2.5 py-0.5 rounded-full flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>CASH PENDING</span>
        </span>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-5 text-center flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-pending-bg text-pending flex items-center justify-center shadow-xs">
          <Coins className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-ink">Pay Cash at Exit Counter</h2>
          <p className="text-xs text-ink-muted max-w-xs leading-relaxed">
            Please show this screen to the {storeName} exit staff and pay <span className="font-bold text-ink">₹{total}</span> in cash.
          </p>
        </div>

        {/* Counter Instruction Card */}
        <div className="w-full bg-white rounded-card p-4 border border-surface-tint shadow-xs space-y-3 text-left">
          <div className="flex justify-between items-center text-xs">
            <span className="text-ink-muted">Amount Due</span>
            <span className="text-lg font-extrabold text-primary">₹{total}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-ink-muted">Order Reference</span>
            <span className="font-mono font-semibold text-ink text-[11px]">
              {orderId ? orderId.slice(0, 13) : 'PENDING'}
            </span>
          </div>

          <div className="pt-2 border-t border-surface-tint text-[11px] text-ink-muted leading-relaxed">
            Your digital bill with QR will activate automatically as soon as staff confirms receipt of cash.
          </div>
        </div>

        {/* Real-time sync badge */}
        <div className="flex items-center gap-1.5 text-xs text-ink-muted">
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-primary' : ''}`} />
          <span>Listening for staff confirmation...</span>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="p-4 bg-white border-t border-surface-tint">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="w-full py-3 bg-cream-card hover:bg-surface-tint text-ink text-xs font-semibold rounded-card transition"
        >
          Return to Store Home
        </button>
      </div>
    </div>
  );
}
