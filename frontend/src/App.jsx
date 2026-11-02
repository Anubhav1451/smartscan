import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import PhoneFrame from './components/PhoneFrame';
import LoginScreen from './components/LoginScreen';
import HomeScreen from './components/HomeScreen';
import StoreScreen from './components/StoreScreen';
import ScannerScreen from './components/ScannerScreen';
import CartScreen from './components/CartScreen';
import PaymentScreen from './components/PaymentScreen';
import CashPendingCustomerScreen from './components/CashPendingCustomerScreen';
import BillScreen from './components/BillScreen';
import OrdersListScreen from './components/OrdersListScreen';
import StaffScreen from './components/StaffScreen';
import ManagerPlaceholder from './components/ManagerPlaceholder';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, profile, loading } = useAuth();
  
  const [currentScreen, setCurrentScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const screen = params.get('screen');
      if (screen) return screen;
    }
    return 'home';
  });

  const [screenParams, setScreenParams] = useState({});

  const handleNavigate = (screen, params = {}) => {
    setCurrentScreen(screen);
    setScreenParams(params);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location);
      url.searchParams.set('screen', screen);
      window.history.pushState({}, '', url);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const screen = params.get('screen') || 'home';
      setCurrentScreen(screen);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Loading state
  if (loading) {
    return (
      <PhoneFrame currentScreen="loading" onNavigate={() => {}}>
        <div className="flex-1 flex flex-col items-center justify-center bg-cream text-ink space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-md">
            <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
              <path d="M9 7V5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7" stroke="#F6F2E7" strokeWidth="2" strokeLinecap="round"/>
              <path d="M5 7H19L18 20C18 20.5523 17.5523 21 17 21H7C6.44772 21 6 20.5523 6 20L5 7Z" stroke="#F6F2E7" strokeWidth="1.8" strokeLinejoin="round"/>
              <path d="M9.5 13.5L11.5 15.5L15 11" stroke="#F6F2E7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-xs font-semibold text-ink-muted">Loading SmartScan...</span>
        </div>
      </PhoneFrame>
    );
  }

  // 1. Unauthenticated users always land on Login
  if (!user) {
    return (
      <PhoneFrame currentScreen="login" onNavigate={() => {}}>
        <LoginScreen />
      </PhoneFrame>
    );
  }

  // 2. Exit staff routed to Staff Home
  if (profile?.role === 'exit_staff') {
    return (
      <PhoneFrame currentScreen="staff" onNavigate={() => {}}>
        <StaffScreen />
      </PhoneFrame>
    );
  }

  // 3. Manager routed to placeholder
  if (profile?.role === 'manager') {
    return (
      <PhoneFrame currentScreen="manager" onNavigate={() => {}}>
        <ManagerPlaceholder />
      </PhoneFrame>
    );
  }

  // 4. Customer screens
  return (
    <PhoneFrame currentScreen={currentScreen} onNavigate={handleNavigate}>
      {currentScreen === 'home' && (
        <HomeScreen onNavigate={handleNavigate} />
      )}
      {currentScreen === 'store' && (
        <StoreScreen onNavigate={handleNavigate} />
      )}
      {currentScreen === 'scanner' && (
        <ScannerScreen onNavigate={handleNavigate} />
      )}
      {currentScreen === 'cart' && (
        <CartScreen onNavigate={handleNavigate} />
      )}
      {currentScreen === 'payment' && (
        <PaymentScreen onNavigate={handleNavigate} orderData={screenParams} />
      )}
      {currentScreen === 'cash-pending-customer' && (
        <CashPendingCustomerScreen onNavigate={handleNavigate} orderData={screenParams} />
      )}
      {currentScreen === 'bill' && (
        <BillScreen onNavigate={handleNavigate} billData={screenParams} />
      )}
      {currentScreen === 'orders' && (
        <OrdersListScreen onNavigate={handleNavigate} />
      )}
    </PhoneFrame>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
