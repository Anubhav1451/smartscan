import React, { useEffect } from 'react';
import { 
  ChevronLeft, 
  Barcode, 
  ScanLine, 
  ShoppingBag, 
  ArrowRight
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function StoreScreen({ onNavigate }) {
  const { selectedStore, cartCount, cartTotal } = useCart();

  useEffect(() => {
    if (!selectedStore?.id) {
      onNavigate('home');
    }
  }, [selectedStore?.id]);

  const storeName = selectedStore?.name || 'FreshMart';
  const storeArea = selectedStore?.area || 'Rajpur Road, Dehradun';

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none relative">
      {/* Top Header */}
      <header className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-surface-tint bg-cream/90 backdrop-blur-xs sticky top-0 z-20">
        <div className="flex items-center space-x-2.5">
          <button 
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="Back to Stores"
            className="w-8 h-8 rounded-full bg-white border border-surface-tint flex items-center justify-center text-ink hover:text-primary transition-colors shadow-2xs"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-sm tracking-tight text-ink leading-tight">{storeName}</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                Open
              </span>
            </div>
            <p className="text-[11px] text-ink-muted">{storeArea}</p>
          </div>
        </div>
      </header>

      {/* Main Content: ONE large Design-G scan card */}
      <div className="flex-1 overflow-y-auto px-5 py-6 flex flex-col justify-center items-center">
        <div 
          onClick={() => onNavigate('scanner')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate('scanner'); }}
          className="w-full bg-primary text-white rounded-card-lg p-8 shadow-md cursor-pointer hover:bg-primary-dark transition-all active:scale-[0.99] flex flex-col items-center justify-center text-center space-y-5 border border-primary-dark/20 group"
        >
          {/* Barcode Icon */}
          <div className="w-24 h-24 rounded-2xl bg-white/15 flex items-center justify-center group-hover:bg-white/20 transition-all shadow-inner group-hover:scale-105 duration-200">
            <Barcode className="w-12 h-12 text-white stroke-[2]" />
          </div>

          {/* Title and Instruction Line */}
          <div className="space-y-2 max-w-[260px]">
            <h3 className="text-xl font-bold tracking-tight text-white">Scan Product</h3>
            <p className="text-xs text-white/85 leading-relaxed font-normal">
              Scan a product barcode to add it to your cart
            </p>
          </div>

          {/* Action Affordance */}
          <div className="pt-2">
            <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-primary text-xs font-bold shadow-xs group-hover:bg-cream transition-colors">
              <ScanLine className="w-4 h-4 stroke-[2.5]" />
              <span>Open Scanner</span>
            </span>
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar (whenever the cart has items) */}
      {cartCount > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-30">
          <div 
            onClick={() => onNavigate('cart')}
            role="button"
            tabIndex={0}
            className="bg-primary text-white rounded-card-lg py-3.5 px-5 flex items-center justify-between shadow-lg cursor-pointer hover:bg-primary-dark transition-all active:scale-[0.99]"
          >
            <div className="flex items-center space-x-2.5 font-bold text-xs">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>{cartCount} {cartCount === 1 ? 'item' : 'items'} · ₹{cartTotal}</span>
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-white/90">
              <span>View Cart</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
