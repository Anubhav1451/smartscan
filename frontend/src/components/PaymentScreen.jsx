import React, { useState } from 'react';
import { 
  ChevronLeft, 
  CreditCard, 
  Smartphone, 
  Coins, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

export default function PaymentScreen({ onNavigate, orderData }) {
  const { clearCart, selectedStore } = useCart();
  const [selectedMethod, setSelectedMethod] = useState('UPI_MOCK');
  const [processing, setProcessing] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [error, setError] = useState('');

  const orderId = orderData?.orderId;
  const total = orderData?.total ?? 317;
  const storeName = selectedStore?.name || 'FreshMart';

  const handlePay = async () => {
    if (!orderId) {
      setError('Order identifier missing. Please return to cart and retry.');
      return;
    }

    setError('');
    setProcessing(true);

    try {
      if (selectedMethod === 'CASH') {
        // Place into CASH_PENDING
        await api.payCash(orderId);
        clearCart();
        onNavigate('cash-pending-customer', {
          orderId,
          total,
          storeName,
        });
        return;
      }

      // 1.2s realistic processing delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Call backend mock-pay with Idempotency-Key
      const idempotencyKey = `idemp-${orderId}-${Date.now()}`;
      const billData = await api.mockPay(orderId, idempotencyKey);

      // Trigger success checkmark animation
      setSuccessAnim(true);
      clearCart();

      setTimeout(() => {
        onNavigate('bill', { bill: billData });
      }, 900);
    } catch (err) {
      console.error('Payment processing failed:', err);
      setError(err.message || 'Payment simulation failed. Please retry.');
      setProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none relative">
      {/* Top Header */}
      <header className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-surface-tint bg-cream/90 backdrop-blur-xs sticky top-0 z-20">
        <button 
          type="button"
          disabled={processing || successAnim}
          onClick={() => onNavigate('cart')}
          className="flex items-center space-x-1.5 text-xs font-semibold text-ink hover:text-primary transition-colors disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Payment</span>
        </button>

        <span className="text-[11px] font-semibold text-primary bg-surface-tint px-2.5 py-0.5 rounded-full">
          Demo Stage
        </span>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-28">
        
        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-alert-bg border border-alert/20 rounded-card-sm flex items-start justify-between gap-2 text-alert text-xs animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
            <button
              type="button"
              onClick={handlePay}
              className="text-xs font-bold underline shrink-0 hover:opacity-80"
            >
              Retry
            </button>
          </div>
        )}

        {/* Server Total Banner */}
        <div className="bg-white rounded-card p-5 border border-surface-tint shadow-xs text-center space-y-1">
          <span className="text-xs text-ink-muted font-medium">Authoritative Server Total</span>
          <div className="text-3xl font-extrabold text-primary">₹{total}</div>
          <p className="text-[11px] text-ink-muted">
            Order ID: <span className="font-mono font-semibold text-ink">{orderId ? orderId.slice(0, 8) + '...' : 'PENDING'}</span>
          </p>
        </div>

        {/* Payment Methods Choice */}
        <div className="space-y-2.5">
          <h4 className="font-bold text-xs text-ink">Select Payment Method</h4>

          {/* Option 1: Mock UPI */}
          <div 
            onClick={() => !processing && setSelectedMethod('UPI_MOCK')}
            className={`bg-white rounded-card p-3.5 border shadow-xs cursor-pointer transition flex items-center justify-between ${
              selectedMethod === 'UPI_MOCK' 
                ? 'border-primary ring-1 ring-primary/40 bg-surface-tint/20' 
                : 'border-surface-tint hover:border-primary/40'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-card-sm bg-primary/10 text-primary flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-ink">Mock UPI</h5>
                <p className="text-[11px] text-ink-muted">Instant activation & digital QR receipt</p>
              </div>
            </div>

            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedMethod === 'UPI_MOCK' ? 'border-primary' : 'border-neutral-300'
            }`}>
              {selectedMethod === 'UPI_MOCK' && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          </div>

          {/* Option 2: Cash at Exit */}
          <div 
            onClick={() => !processing && setSelectedMethod('CASH')}
            className={`bg-white rounded-card p-3.5 border shadow-xs cursor-pointer transition flex items-center justify-between ${
              selectedMethod === 'CASH' 
                ? 'border-primary ring-1 ring-primary/40 bg-surface-tint/20' 
                : 'border-surface-tint hover:border-primary/40'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-card-sm bg-amber-100 text-amber-800 flex items-center justify-center">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-xs text-ink">Cash at Exit Counter</h5>
                <p className="text-[11px] text-ink-muted">Pay exit staff in cash to activate bill</p>
              </div>
            </div>

            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              selectedMethod === 'CASH' ? 'border-primary' : 'border-neutral-300'
            }`}>
              {selectedMethod === 'CASH' && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          </div>
        </div>

        {/* Mock UPI Provider Details (generic rows, NO real brand logos per rules) */}
        {selectedMethod === 'UPI_MOCK' && (
          <div className="bg-white rounded-card p-3 border border-surface-tint shadow-xs space-y-2">
            <span className="text-[10px] uppercase font-bold text-ink-muted tracking-wider">
              Generic Mock UPI Apps
            </span>
            <div className="space-y-1.5 text-xs text-ink">
              <div className="p-2 rounded-card-sm bg-cream flex items-center justify-between">
                <span>FastUPI Sandbox</span>
                <span className="text-[10px] text-success font-semibold">Active</span>
              </div>
              <div className="p-2 rounded-card-sm bg-cream flex items-center justify-between">
                <span>Direct Bank Pay (Demo)</span>
                <span className="text-[10px] text-success font-semibold">Ready</span>
              </div>
            </div>
          </div>
        )}

        {/* Mandatory Demo Disclaimer */}
        <div className="p-3 bg-surface-tint/60 rounded-card-sm border border-surface-tint flex items-center gap-2 text-ink-muted text-xs">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
          <span>Mock payment — no real money moves.</span>
        </div>

      </div>

      {/* Floating Pay Button */}
      <div className="absolute bottom-4 left-4 right-4 z-30">
        <button
          type="button"
          disabled={processing || successAnim}
          onClick={handlePay}
          className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-card-lg shadow-lg flex items-center justify-center gap-2 transition active:scale-[0.99] disabled:opacity-85"
        >
          {successAnim ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-success-bright animate-bounce" />
              <span>Payment Successful!</span>
            </>
          ) : processing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processing mock payment...</span>
            </>
          ) : (
            <span>
              {selectedMethod === 'CASH' ? `Proceed with Cash (₹${total})` : `Pay ₹${total}`}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
