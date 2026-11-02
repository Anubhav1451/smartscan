import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingBag, 
  ArrowRight, 
  ScanLine, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

export default function CartScreen({ onNavigate }) {
  const { selectedStore, items, updateQty, removeFromCart, clearCart, cartTotal, cartCount } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const storeName = selectedStore?.name || 'FreshMart';

  const handleProceedToPay = async () => {
    if (!selectedStore?.id || items.length === 0) return;
    setError('');
    setLoading(true);

    try {
      // Backend decides prices, totals, and validates stock server-side
      const payload = {
        store_id: selectedStore.id,
        items: items.map((it) => ({ barcode: it.barcode, qty: it.qty })),
        payment_method: 'UPI_MOCK',
      };

      const res = await api.checkout(payload);

      // Navigate to Payment screen with backend order id and authoritative server total
      onNavigate('payment', {
        orderId: res.order_id,
        total: res.total,
        storeId: res.store_id,
        items: res.items,
      });
    } catch (err) {
      console.error('Checkout failed:', err);
      setError(err.message || 'Checkout failed. Please check stock and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none relative">
      {/* Top Header */}
      <header className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-surface-tint bg-cream/90 backdrop-blur-xs sticky top-0 z-20">
        <button 
          type="button"
          onClick={() => onNavigate('store')}
          className="flex items-center space-x-1.5 text-xs font-semibold text-ink hover:text-primary transition-colors"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Cart · {storeName}</span>
        </button>

        {items.length > 0 && (
          <button
            type="button"
            onClick={clearCart}
            className="text-xs text-ink-muted hover:text-alert font-medium transition"
          >
            Clear All
          </button>
        )}
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-28">
        
        {/* Error alert if checkout fails */}
        {error && (
          <div className="p-3 bg-alert-bg border border-alert/20 rounded-card-sm flex items-start gap-2.5 text-alert text-xs animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty Cart State */}
        {items.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-surface-tint flex items-center justify-center text-primary">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-ink">Your cart is empty</h3>
              <p className="text-xs text-ink-muted max-w-xs">
                Scan product barcodes in {storeName} to add items to your cart.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('scanner')}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-card shadow-xs flex items-center gap-2 transition"
            >
              <ScanLine className="w-4 h-4" />
              <span>Start Scanning</span>
            </button>
          </div>
        ) : (
          <>
            {/* Items List */}
            <div className="space-y-2.5">
              {items.map((item) => (
                <div
                  key={item.barcode}
                  className="bg-white rounded-card p-3 border border-surface-tint shadow-xs flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-card-sm bg-surface-tint text-primary font-bold text-xs flex items-center justify-center shrink-0">
                      {item.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-ink truncate max-w-[140px]">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-ink-muted">
                        ₹{item.price} each
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper & Remove */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center bg-cream rounded-full p-1 border border-surface-tint">
                      <button
                        type="button"
                        onClick={() => updateQty(item.barcode, item.qty - 1)}
                        aria-label="Decrease quantity"
                        className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-ink hover:text-primary shadow-2xs active:scale-90 transition"
                      >
                        <Minus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                      <span className="w-7 text-center text-xs font-bold text-ink">
                        {item.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(item.barcode, item.qty + 1)}
                        aria-label="Increase quantity"
                        className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-ink hover:text-primary shadow-2xs active:scale-90 transition"
                      >
                        <Plus className="w-3 h-3 stroke-[2.5]" />
                      </button>
                    </div>

                    <div className="text-right min-w-[50px]">
                      <span className="font-extrabold text-xs text-ink">
                        ₹{item.price * item.qty}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.barcode)}
                      aria-label="Remove item"
                      className="p-1 text-ink-muted hover:text-alert transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Add More Button */}
            <button
              type="button"
              onClick={() => onNavigate('scanner')}
              className="w-full py-2.5 bg-white hover:bg-cream-card border border-surface-tint text-primary text-xs font-semibold rounded-card flex items-center justify-center gap-1.5 transition shadow-2xs"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>Scan More Items</span>
            </button>

            {/* Bill Summary */}
            <div className="bg-white rounded-card p-4 border border-surface-tint shadow-xs space-y-2.5">
              <h4 className="font-bold text-xs text-ink">Payment Summary</h4>
              
              <div className="flex justify-between text-xs text-ink-muted">
                <span>Items ({cartCount})</span>
                <span>₹{cartTotal}</span>
              </div>
              
              <div className="flex justify-between text-xs text-ink-muted">
                <span>Taxes & Store Surcharge</span>
                <span className="text-success font-medium">Included</span>
              </div>

              <div className="pt-2 border-t border-surface-tint flex justify-between items-center">
                <span className="font-bold text-sm text-ink">To Pay</span>
                <span className="font-extrabold text-base text-primary">₹{cartTotal}</span>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Floating Checkout Button */}
      {items.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-30">
          <button
            type="button"
            disabled={loading}
            onClick={handleProceedToPay}
            className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-card-lg shadow-lg flex items-center justify-between px-6 transition active:scale-[0.99] disabled:opacity-70"
          >
            <span>Proceed to Pay</span>
            <div className="flex items-center gap-2">
              <span>₹{cartTotal}</span>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
