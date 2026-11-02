import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  ScanLine, 
  Home as HomeIcon, 
  FileText, 
  LogOut, 
  Shirt,
  Apple,
  Tv,
  Sofa,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

// Brand mark: Shopping bag outline with a check mark inside (docs/02_DESIGN.md & design board)
function SmartScanBrandMark({ className = "w-8 h-8" }) {
  return (
    <div className={`rounded-card-sm bg-primary flex items-center justify-center p-1.5 shadow-xs shrink-0 ${className}`}>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-full h-full"
      >
        <path 
          d="M9 7V5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7" 
          stroke="#F6F2E7" 
          strokeWidth="2" 
          strokeLinecap="round" 
        />
        <path 
          d="M5 7H19L18 20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20L5 7Z" 
          stroke="#F6F2E7" 
          strokeWidth="1.8" 
          strokeLinejoin="round" 
        />
        <path 
          d="M9.5 13.5L11.5 15.5L15 11" 
          stroke="#F6F2E7" 
          strokeWidth="2.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </svg>
    </div>
  );
}

const CATEGORY_ITEMS = [
  { id: 'fashion', label: 'Fashion', icon: Shirt },
  { id: 'grocery', label: 'Grocery', icon: Apple },
  { id: 'electronics', label: 'Electronics', icon: Tv },
  { id: 'home', label: 'Home', icon: Sofa },
];

export default function HomeScreen({ onNavigate }) {
  const { profile, signOut } = useAuth();
  const { selectStore, selectedStore, pendingStoreSwitch, confirmStoreSwitch, cancelStoreSwitch, cartCount } = useCart();
  
  const [stores, setStores] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getStores()
      .then((data) => {
        if (mounted) {
          setStores(data);
          // If no store selected yet, set default to FreshMart
          if (!selectedStore && data.length > 0) {
            const fm = data.find(s => s.code === 'FM') || data[0];
            selectStore(fm, true);
          }
        }
      })
      .catch((err) => console.error('Failed to load stores:', err))
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, []);

  const handleStoreClick = (store) => {
    const canSwitch = selectStore(store);
    if (canSwitch) {
      onNavigate('store');
    }
  };

  const filteredStores = stores.filter(store => 
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayName = profile?.display_name || 'Anubhav';

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none relative">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 space-y-5">
        
        {/* App Header with locked brand mark and logout */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2.5">
            <SmartScanBrandMark />
            <span className="font-bold text-lg tracking-tight text-ink">SmartScan</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
            <button
              type="button"
              onClick={signOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 rounded-full hover:bg-neutral-200 text-ink-muted transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* User Greeting */}
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Hello, {displayName}!
          </h2>
          <p className="text-xs text-ink-muted font-medium">
            Scan products and walk out without lines
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stores or products..."
            className="w-full bg-white text-xs pl-10 pr-4 py-3 rounded-card-sm border border-surface-tint placeholder:text-ink-muted focus:outline-none focus:border-primary transition-colors shadow-xs"
          />
        </div>

        {/* Scan Hero Banner */}
        <div 
          onClick={() => onNavigate('scanner')}
          className="bg-primary text-white rounded-card p-5 shadow-sm relative overflow-hidden cursor-pointer hover:bg-primary-dark transition-all active:scale-[0.99] group"
        >
          <div className="max-w-[70%] space-y-1">
            <h3 className="text-base font-bold tracking-tight">Scan. Pay. Walk Out.</h3>
            <p className="text-xs text-white/80 font-normal">No Queues. No Hassle.</p>
          </div>
          
          <button 
            type="button" 
            aria-label="Start Scanning"
            className="absolute right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-card-sm bg-white/15 flex items-center justify-center text-white group-hover:bg-white/25 transition-colors"
          >
            <ScanLine className="w-5 h-5" />
          </button>
        </div>

        {/* Our Stores Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-ink tracking-tight">Our Stores</h3>
            <span className="text-[11px] text-ink-muted font-medium">Tap to enter store</span>
          </div>

          {loading ? (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-white/60 animate-pulse rounded-card"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filteredStores.map((store) => {
                const isSelected = selectedStore?.id === store.id;
                return (
                  <div 
                    key={store.id}
                    onClick={() => handleStoreClick(store)}
                    className={`bg-white rounded-card p-3 border shadow-xs flex flex-col items-center text-center cursor-pointer transition-all active:scale-[0.98] group relative ${
                      isSelected ? 'border-primary ring-1 ring-primary/30' : 'border-surface-tint hover:border-primary/40'
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute -top-1.5 bg-primary text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                        Active
                      </span>
                    )}
                    <div className={`w-14 h-12 rounded-card-sm flex items-center justify-center mb-2 shadow-xs transition-transform group-hover:scale-105 ${
                      store.code === 'FM' ? 'bg-primary text-white' :
                      store.code === 'SH' ? 'bg-primary-dark text-white' :
                      'bg-ink text-white'
                    }`}>
                      <span className="font-extrabold text-sm tracking-wider">{store.code}</span>
                    </div>
                    <span className="font-bold text-xs text-ink truncate w-full">{store.name}</span>
                    <span className="text-[10px] text-ink-muted truncate w-full mt-0.5">{store.area}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shop by Category Section */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-ink tracking-tight">Shop by Category</h3>
          
          <div className="grid grid-cols-4 gap-2">
            {CATEGORY_ITEMS.map((cat) => {
              const Icon = cat.icon;
              return (
                <div 
                  key={cat.id}
                  onClick={() => onNavigate('store', { category: cat.id })}
                  className="bg-white rounded-card p-2 border border-surface-tint shadow-xs flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-all active:scale-[0.98]"
                >
                  <div className="w-9 h-9 rounded-card-sm bg-surface-tint text-primary flex items-center justify-center mb-1.5 shadow-2xs">
                    <Icon className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[10px] font-semibold text-ink leading-tight text-center whitespace-nowrap">
                    {cat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Cross-Store Switch Modal Guard */}
      {pendingStoreSwitch && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-6 backdrop-blur-2xs">
          <div className="bg-white rounded-card p-5 max-w-xs w-full shadow-xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-pending-bg text-pending flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-ink">Switch Store?</h4>
              <p className="text-xs text-ink-muted mt-1 leading-relaxed">
                You currently have {cartCount} item(s) in your cart from <span className="font-semibold text-ink">{selectedStore?.name}</span>. Switching to <span className="font-semibold text-ink">{pendingStoreSwitch.name}</span> will clear your cart.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelStoreSwitch}
                className="flex-1 py-2.5 text-xs font-semibold text-ink-muted bg-neutral-100 hover:bg-neutral-200 rounded-card-sm transition"
              >
                Keep Cart
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmStoreSwitch();
                  onNavigate('store');
                }}
                className="flex-1 py-2.5 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-card-sm transition"
              >
                Clear & Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="bg-white border-t border-surface-tint py-2.5 px-6 flex justify-around items-center shrink-0">
        <button 
          type="button" 
          onClick={() => onNavigate('home')}
          className="flex flex-col items-center text-primary font-semibold space-y-1"
        >
          <HomeIcon className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px]">Home</span>
        </button>

        <button 
          type="button" 
          onClick={() => onNavigate('store')}
          className="flex flex-col items-center text-ink-muted hover:text-ink space-y-1 relative"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">Store</span>
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-primary text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        <button 
          type="button" 
          onClick={() => onNavigate('orders')}
          className="flex flex-col items-center text-ink-muted hover:text-ink space-y-1"
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Orders</span>
        </button>
      </nav>
    </div>
  );
}
