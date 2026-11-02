import React, { useState } from 'react';
import { 
  ChevronLeft, 
  Flashlight, 
  Barcode, 
  Check, 
  Plus, 
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { MOCK_DETECTED_PRODUCT } from '../data/mockData';

export default function ScannerScreen({ onNavigate }) {
  const [torchOn, setTorchOn] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isAdded, setIsAdded] = useState(false);

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2500);
  };

  const handleAddDetected = () => {
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2500);
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
          <span>Scan Product Barcode</span>
        </button>

        <button 
          type="button"
          onClick={() => setTorchOn(!torchOn)}
          aria-label="Toggle Torch"
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            torchOn ? 'bg-pending text-white shadow-xs' : 'bg-white border border-surface-tint text-ink-muted hover:text-ink'
          }`}
        >
          <Flashlight className="w-4 h-4" />
        </button>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        
        {/* Camera Viewfinder Card */}
        <div className="w-full aspect-[4/4.2] bg-primary-dark rounded-card p-6 flex flex-col items-center justify-center relative overflow-hidden shadow-md">
          {/* Torch Light Glow Simulation if enabled */}
          {torchOn && (
            <div className="absolute inset-0 bg-white/10 pointer-events-none animate-pulse"></div>
          )}

          {/* Viewfinder Corner Framing Overlay */}
          <div className="relative w-56 h-36 flex items-center justify-center">
            {/* Top-Left Corner */}
            <div className="absolute -top-2 -left-2 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
            {/* Top-Right Corner */}
            <div className="absolute -top-2 -right-2 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
            {/* Bottom-Left Corner */}
            <div className="absolute -bottom-2 -left-2 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
            {/* Bottom-Right Corner */}
            <div className="absolute -bottom-2 -right-2 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-lg"></div>

            {/* Barcode Graphic Inside Viewfinder */}
            <div className="bg-white px-4 py-3 rounded-card-sm shadow-md flex flex-col items-center space-y-1.5 border border-white/20 relative overflow-hidden">
              {/* Laser Scanning Beam Line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-alert/80 shadow-[0_0_8px_#DC2626] animate-pulse"></div>
              
              {/* Barcode Lines Graphic */}
              <div className="flex items-end space-x-[2px] h-10 px-1">
                {[3,1,2,4,1,3,2,1,4,2,3,1,2,4,1,2,3,1,4,2,1,3,2,4,1,3,2,1,4,2].map((w, idx) => (
                  <div 
                    key={idx} 
                    className="bg-ink h-full rounded-[0.5px]" 
                    style={{ width: `${w * 1.5}px` }}
                  ></div>
                ))}
              </div>
              
              {/* Barcode Numbers */}
              <span className="font-mono text-[10px] text-ink tracking-widest font-semibold">
                8901234 567890
              </span>
            </div>
          </div>

          <p className="text-[11px] text-white/70 font-medium mt-4">
            Align barcode within the frame
          </p>
        </div>

        {/* Manual Barcode Entry Fallback (docs/01_PRD.md requirement) */}
        <div className="bg-white rounded-card p-3.5 border border-surface-tint shadow-xs space-y-2">
          <div className="flex items-center space-x-1.5 text-ink-muted text-[11px] font-medium">
            <Barcode className="w-3.5 h-3.5 text-primary" />
            <span>Type barcode manually (camera fallback)</span>
          </div>

          <form onSubmit={handleManualAdd} className="flex space-x-2">
            <input 
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="e.g. 8901234567890"
              className="flex-1 bg-cream/60 text-xs px-3 py-2 rounded-card-sm border border-surface-tint placeholder:text-ink-muted focus:outline-none focus:border-primary font-mono"
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-card-sm hover:bg-primary-dark transition-colors active:scale-95"
            >
              Add
            </button>
          </form>
        </div>

        {/* Last-Scanned / Detected Product Card (Design G Board) */}
        <div className="bg-white rounded-card p-4 border border-surface-tint shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-card-sm bg-surface-tint text-primary font-bold text-sm flex items-center justify-center shadow-2xs">
                {MOCK_DETECTED_PRODUCT.badge}
              </div>
              <div className="space-y-0.5">
                <h4 className="font-bold text-xs text-ink">
                  {MOCK_DETECTED_PRODUCT.name}
                </h4>
                <p className="text-primary font-extrabold text-sm">
                  ₹{MOCK_DETECTED_PRODUCT.price}
                </p>
              </div>
            </div>

            <span className="text-[10px] bg-surface-tint text-primary font-semibold px-2 py-0.5 rounded-full">
              Detected
            </span>
          </div>

          {/* Primary Action Button */}
          <button 
            type="button"
            onClick={handleAddDetected}
            className={`w-full py-3.5 rounded-card-sm text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 ${
              isAdded 
                ? 'bg-success text-white' 
                : 'bg-primary text-white hover:bg-primary-dark active:scale-[0.99]'
            }`}
          >
            {isAdded ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Quick Return to Store Navigation Footer */}
      <footer className="px-5 py-3 border-t border-surface-tint bg-white flex justify-between items-center text-xs font-semibold">
        <button 
          type="button"
          onClick={() => onNavigate('store')}
          className="text-ink-muted hover:text-ink"
        >
          Back to Products
        </button>
        <button 
          type="button"
          onClick={() => onNavigate('home')}
          className="text-primary hover:text-primary-dark flex items-center space-x-1"
        >
          <span>Store List</span>
        </button>
      </footer>
    </div>
  );
}
