import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  ChevronRight, 
  ScanLine, 
  Home as HomeIcon, 
  FileText, 
  User, 
  Shirt,
  Apple,
  Tv,
  Sofa
} from 'lucide-react';
import { 
  MOCK_USER, 
  MOCK_STORES, 
  MOCK_HOME_CATEGORIES 
} from '../data/mockData';

// Brand mark: Shopping bag outline with a check mark inside (docs/02_DESIGN.md & design board)
function SmartScanBrandMark({ className = "w-8 h-8" }) {
  return (
    <div className={`rounded-card-sm bg-primary flex items-center justify-center p-1.5 shadow-xs shrink-0 ${className}`}>
      <svg 
        viewBox="0 0 24 24" 
        fill="none" 
        className="w-full h-full"
      >
        {/* Shopping bag handle */}
        <path 
          d="M9 7V5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7" 
          stroke="#F6F2E7" 
          strokeWidth="2" 
          strokeLinecap="round" 
        />
        {/* Shopping bag body */}
        <path 
          d="M5 7H19L18 20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20L5 7Z" 
          stroke="#F6F2E7" 
          strokeWidth="1.8" 
          strokeLinejoin="round" 
        />
        {/* Check mark inside bag */}
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

const CATEGORY_ICONS = {
  fash: Shirt,
  groc: Apple,
  elec: Tv,
  home: Sofa,
};

export default function HomeScreen({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStores = MOCK_STORES.filter(store => 
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none">
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 space-y-5">
        
        {/* App Header with locked brand mark */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center space-x-2.5">
            <SmartScanBrandMark />
            <span className="font-bold text-lg tracking-tight text-ink">SmartScan</span>
          </div>
          <div className="w-2.5 h-2.5 rounded-full bg-success"></div>
        </header>

        {/* User Greeting */}
        <div className="space-y-0.5">
          <h2 className="text-xl font-bold tracking-tight text-ink">
            {MOCK_USER.greeting}
          </h2>
          <p className="text-xs text-ink-muted font-medium">
            {MOCK_USER.subtitle}
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
            <button 
              type="button" 
              className="text-xs text-ink-muted hover:text-primary flex items-center font-medium"
            >
              See all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {filteredStores.map((store) => (
              <div 
                key={store.id}
                onClick={() => onNavigate('store', { storeId: store.id })}
                className="bg-white rounded-card p-3 border border-surface-tint shadow-xs flex flex-col items-center text-center cursor-pointer hover:border-primary/40 transition-all active:scale-[0.98] group"
              >
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
            ))}
          </div>
        </div>

        {/* Shop by Category Section */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-ink tracking-tight">Shop by Category</h3>
          
          <div className="grid grid-cols-4 gap-2">
            {MOCK_HOME_CATEGORIES.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.id] || ShoppingBag;
              return (
                <div 
                  key={cat.id}
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
          className="flex flex-col items-center text-ink-muted hover:text-ink space-y-1"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px]">Store</span>
        </button>

        <button 
          type="button" 
          className="flex flex-col items-center text-ink-muted hover:text-ink space-y-1 opacity-60 cursor-default"
        >
          <FileText className="w-5 h-5" />
          <span className="text-[10px]">Orders</span>
        </button>

        <button 
          type="button" 
          className="flex flex-col items-center text-ink-muted hover:text-ink space-y-1 opacity-60 cursor-default"
        >
          <User className="w-5 h-5" />
          <span className="text-[10px]">Profile</span>
        </button>
      </nav>
    </div>
  );
}
