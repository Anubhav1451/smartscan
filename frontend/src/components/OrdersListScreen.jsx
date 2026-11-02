import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  FileText, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Loader2 
} from 'lucide-react';
import { api } from '../services/api';

export default function OrdersListScreen({ onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getMyOrders()
      .then((data) => {
        if (mounted) setOrders(data || []);
      })
      .catch((err) => console.error('Failed to load orders:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const handleOrderClick = async (order) => {
    try {
      const fullOrder = await api.getOrder(order.id);
      onNavigate('bill', { bill: fullOrder });
    } catch (e) {
      onNavigate('bill', { bill: order });
    }
  };

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
          <span>My Orders & Bills</span>
        </button>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 pb-20">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-ink-muted text-xs">
            <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
            <span>Loading orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FileText className="w-10 h-10 text-ink-muted/50 mx-auto" />
            <h4 className="font-bold text-xs text-ink">No orders yet</h4>
            <p className="text-[11px] text-ink-muted">Start shopping and your digital receipts will appear here.</p>
          </div>
        ) : (
          orders.map((ord) => {
            const storeName = ord.stores?.name || 'FreshMart';
            const billNo = ord.bill_no || `Order ${ord.id.slice(0, 8)}`;
            const dateStr = ord.created_at ? new Date(ord.created_at).toLocaleDateString() : '';

            return (
              <div
                key={ord.id}
                onClick={() => handleOrderClick(ord)}
                className="bg-white rounded-card p-3.5 border border-surface-tint shadow-xs cursor-pointer hover:border-primary/40 transition flex items-center justify-between active:scale-[0.99]"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-ink">{billNo}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      ord.status === 'BILL_ACTIVE' 
                        ? 'bg-success/15 text-success' 
                        : ord.status === 'VERIFIED_USED' 
                        ? 'bg-neutral-200 text-neutral-700' 
                        : 'bg-pending-bg text-pending'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-muted">{storeName} · {dateStr}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-sm text-primary">₹{ord.total}</span>
                  <ChevronRight className="w-4 h-4 text-ink-muted" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
