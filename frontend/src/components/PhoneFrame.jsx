import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

export default function PhoneFrame({ children, currentScreen, onNavigate }) {
  return (
    <div className="min-h-screen bg-cream sm:bg-neutral-900 sm:py-6 sm:px-4 flex flex-col items-center justify-center font-sans antialiased">
      {/* Top Phase 1 Quick Switcher Bar for reviewers */}
      <div className="w-full max-w-[420px] mb-2 hidden sm:flex items-center justify-between text-xs bg-white/10 backdrop-blur-md rounded-full p-1 border border-white/10">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`flex-1 py-1.5 rounded-full font-semibold transition-all ${
            currentScreen === 'home' 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-white/70 hover:text-white'
          }`}
        >
          1. Home
        </button>
        <button
          type="button"
          onClick={() => onNavigate('store')}
          className={`flex-1 py-1.5 rounded-full font-semibold transition-all ${
            currentScreen === 'store' 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-white/70 hover:text-white'
          }`}
        >
          2. Store
        </button>
        <button
          type="button"
          onClick={() => onNavigate('scanner')}
          className={`flex-1 py-1.5 rounded-full font-semibold transition-all ${
            currentScreen === 'scanner' 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-white/70 hover:text-white'
          }`}
        >
          3. Scanner
        </button>
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
