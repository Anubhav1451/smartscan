import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PhoneFrame({ children, currentScreen, onNavigate }) {
  const { user, profile } = useAuth();
  const isStaff = profile?.role === 'exit_staff';
  const isManager = profile?.role === 'manager';

  return (
    <div className="min-h-screen bg-cream sm:bg-neutral-900 sm:py-6 sm:px-4 flex flex-col items-center justify-center font-sans antialiased">
      {/* Top Quick Switcher Bar for reviewers */}
      <div className="w-full max-w-[420px] mb-2 hidden sm:flex items-center justify-between text-xs bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/10">
        {!user ? (
          <span className="w-full text-center py-1 font-semibold text-white/80">
            SmartScan · Phase 2 Live Prototype (Sign in below)
          </span>
        ) : isStaff ? (
          <span className="w-full text-center py-1 font-semibold text-white/80">
            Exit Staff Mode · {profile?.store?.name || 'FreshMart'}
          </span>
        ) : isManager ? (
          <span className="w-full text-center py-1 font-semibold text-white/80">
            Manager Mode · {profile?.store?.name || 'FreshMart'}
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className={`flex-1 py-1 rounded-full font-semibold transition-all ${
                currentScreen === 'home' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => onNavigate('store')}
              className={`flex-1 py-1 rounded-full font-semibold transition-all ${
                currentScreen === 'store' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Store
            </button>
            <button
              type="button"
              onClick={() => onNavigate('scanner')}
              className={`flex-1 py-1 rounded-full font-semibold transition-all ${
                currentScreen === 'scanner' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Scan
            </button>
            <button
              type="button"
              onClick={() => onNavigate('cart')}
              className={`flex-1 py-1 rounded-full font-semibold transition-all ${
                currentScreen === 'cart' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Cart
            </button>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className={`flex-1 py-1 rounded-full font-semibold transition-all ${
                currentScreen === 'orders' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Orders
            </button>
          </>
        )}
      </div>

      {/* Device Viewport (~390x844 mobile viewport) */}
      <div className="w-full sm:max-w-[400px] h-screen sm:h-[844px] bg-cream sm:rounded-[42px] sm:shadow-2xl sm:border-[8px] sm:border-neutral-800 flex flex-col overflow-hidden relative">
        
        {/* iOS-Style Status Bar */}
        <div className="px-6 pt-3 pb-1 flex items-center justify-between text-ink text-[12px] font-semibold bg-cream z-30 shrink-0">
          <span>9:41</span>
          
          {/* Dynamic Capsule Notch (visible on desktop mockup) */}
          <div className="hidden sm:block w-24 h-4 bg-neutral-800 rounded-full"></div>

          {/* Status Icons */}
          <div className="flex items-center space-x-1.5 text-ink">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Screen View Container */}
        <div className="flex-1 overflow-hidden relative flex flex-col">
          {children}
        </div>
      </div>
      
      {/* Design System Reference Tagline */}
      <div className="mt-3 text-center text-white/50 text-xs hidden sm:block">
        Design G: SmartScan Green System · Mobile Viewport (~390×844)
      </div>
    </div>
  );
}
