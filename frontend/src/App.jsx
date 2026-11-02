import React, { useState, useEffect } from 'react';
import PhoneFrame from './components/PhoneFrame';
import HomeScreen from './components/HomeScreen';
import StoreScreen from './components/StoreScreen';
import ScannerScreen from './components/ScannerScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const screen = params.get('screen');
      if (screen && ['home', 'store', 'scanner'].includes(screen)) {
        return screen;
      }
    }
    return 'home';
  });

  const handleNavigate = (screen) => {
    setCurrentScreen(screen);
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
    </PhoneFrame>
  );
}
