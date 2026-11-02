import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Search, 
  Plus, 
  ShoppingBag, 
  ArrowRight,
  ScanLine,
  MapPin
} from 'lucide-react';
import { 
  MOCK_STORE_CATEGORIES, 
  MOCK_FRESHMART_PRODUCTS, 
  MOCK_CANONICAL_CART 
} from '../data/mockData';

export default function StoreScreen({ onNavigate }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = MOCK_FRESHMART_PRODUCTS.filter(product => {
    const matchesCategory = selectedCategory === 'all' || 
      product.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none relative">
      {/* Top Header */}
      <header className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-surface-tint bg-cream/90 backdrop-blur-xs sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <button 
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="Back to Stores"
            className="w-8 h-8 rounded-full bg-white border border-surface-tint flex items-center justify-center text-ink hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-sm tracking-tight text-ink leading-tight">FreshMart</h2>
            <p className="text-[11px] text-ink-muted">Grocery Store</p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => onNavigate('scanner')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary-dark transition-colors"
        >
          <ScanLine className="w-3.5 h-3.5" />
          <span>Scan</span>
        </button>
      </header>

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-32 space-y-3">
        
        {/* Location Breadcrumb */}
        <div className="flex items-center text-[11px] text-ink-muted font-medium">
          <MapPin className="w-3 h-3 text-primary mr-1" />
          <span>Rajpur Road, Dehradun</span>
          <span className="mx-1 text-ink-muted/50">›</span>
        </div>

        {/* Store Card Banner */}
        <div className="bg-primary-dark text-white rounded-card p-3 shadow-xs relative overflow-hidden">
          <h3 className="font-extrabold text-xs tracking-wider uppercase">FRESHMART</h3>
          <p className="text-[11px] text-white/80 font-normal mt-0.5">Daily grocery, zero queue</p>
        </div>

        {/* Product Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-white text-xs pl-9 pr-3 py-2 rounded-card-sm border border-surface-tint placeholder:text-ink-muted focus:outline-none focus:border-primary transition-colors shadow-xs"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {MOCK_STORE_CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-xs' 
                    : 'bg-white text-ink-muted border border-surface-tint hover:border-primary/40'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Product 2-Column Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {filteredProducts.map((prod) => (
            <div 
              key={prod.id}
              className={`bg-white rounded-card p-2.5 border border-surface-tint shadow-xs flex flex-col justify-between transition-all ${
                prod.isOutOfStock ? 'opacity-45 select-none bg-disabled-bg/25 border-surface-tint/40' : 'hover:border-primary/40'
              }`}
            >
              {/* Product Badge / Thumbnail */}
              <div className="w-full h-16 rounded-card-sm bg-cream flex items-center justify-center mb-1.5 relative">
                <div className={`w-10 h-10 rounded-card-sm ${prod.badgeBg} ${prod.badgeText} font-bold text-xs flex items-center justify-center shadow-2xs`}>
                  {prod.badge}
                </div>
              </div>

              {/* Product Info */}
              <div className="space-y-0.5 mb-1.5">
                <h4 className="font-semibold text-xs text-ink leading-tight line-clamp-1">
                  {prod.name}
                </h4>
                <p className="text-[10px] text-ink-muted">{prod.category}</p>
              </div>

              {/* Price and Add Action */}
              <div className="flex items-center justify-between pt-1 border-t border-surface-tint/60">
                <div className="flex flex-col">
                  <span className="font-extrabold text-xs text-ink">
                    ₹{prod.price}
                  </span>
                  {prod.isOutOfStock && (
                    <span className="text-[9px] text-ink-muted font-medium">Out of Stock</span>
                  )}
                </div>

                {prod.isOutOfStock ? (
                  <button 
                    disabled
                    type="button"
                    aria-label="Out of Stock"
                    className="w-6 h-6 rounded-full bg-disabled-bg text-disabled flex items-center justify-center cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button 
                    type="button"
                    onClick={() => onNavigate('scanner')}
                    aria-label={`Add ${prod.name}`}
                    className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary-dark transition-colors active:scale-90 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Floating Bottom Cart Bar (Design Board: 3 items | ₹317 ->) */}
      <div className="absolute bottom-4 left-4 right-4 z-30">
        <div 
          onClick={() => onNavigate('scanner')}
          className="bg-primary text-white rounded-card-lg py-3.5 px-5 flex items-center justify-between shadow-lg cursor-pointer hover:bg-primary-dark transition-all active:scale-[0.99]"
        >
          <div className="flex items-center space-x-2.5 font-bold text-xs">
            <ShoppingBag className="w-4 h-4 text-white" />
            <span>{MOCK_CANONICAL_CART.summaryText}</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs font-semibold text-white/90">
            <span>View Cart</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
