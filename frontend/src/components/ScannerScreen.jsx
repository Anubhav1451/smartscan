import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  Zap, 
  Barcode, 
  Check, 
  Plus, 
  ShoppingBag,
  AlertCircle,
  Camera,
  Loader2
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

export default function ScannerScreen({ onNavigate }) {
  const { selectedStore, addToCart, cartCount, cartTotal } = useCart();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const barcodeHandlerRef = useRef(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  
  // Detection card states: null | { type: 'FOUND' | 'OUT_OF_STOCK' | 'NOT_FOUND', product?: any, barcode?: string }
  const [detectionState, setDetectionState] = useState(null);
  const [isAdded, setIsAdded] = useState(false);

  // Initialize camera and ZXing reader
  useEffect(() => {
    if (!selectedStore?.id) {
      onNavigate('home');
      return;
    }

    let codeReader;
    let activeStream;

    const startCamera = async () => {
      try {
        codeReader = new BrowserMultiFormatReader();
        readerRef.current = codeReader;

        // Try getting environment (back) camera
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        activeStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();

          // Check torch capability
          const track = stream.getVideoTracks()[0];
          if (track) {
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            if ('torch' in capabilities) {
              setTorchSupported(true);
            }
          }

          // Start continuous decode
          codeReader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result && barcodeHandlerRef.current) {
              barcodeHandlerRef.current(result.getText());
            }
          });
        }
      } catch (err) {
        console.warn('Camera initialization failed or permission denied:', err);
        setHasCamera(false);
      }
    };

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (codeReader && typeof codeReader.reset === 'function') {
        codeReader.reset();
      }
    };
  }, [selectedStore?.id]);

  // Toggle real torch if supported
  const toggleTorch = async () => {
    if (!streamRef.current || !torchSupported) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        await track.applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  const handleBarcodeScanned = async (barcode) => {
    if (searching) return;
    const cleaned = barcode.trim();
    if (!cleaned) return;

    // Trigger vibration if supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }

    setSearching(true);
    try {
      const product = await api.lookupProductByBarcode(selectedStore.id, cleaned);
      if (product.stock <= 0 || !product.in_stock) {
        setDetectionState({ type: 'OUT_OF_STOCK', product });
      } else {
        setDetectionState({ type: 'FOUND', product });
      }
    } catch (err) {
      setDetectionState({ type: 'NOT_FOUND', barcode: cleaned });
    } finally {
      setSearching(false);
    }
  };
  barcodeHandlerRef.current = handleBarcodeScanned;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarcodeScanned(manualBarcode.trim());
  };

  const handleAddDetected = () => {
    if (!detectionState?.product) return;
    const ok = addToCart(detectionState.product, 1);
    if (ok) {
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
      }, 2000);
    }
  };

  const storeName = selectedStore?.name || 'Store';

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
          <span>{storeName} · Scanner</span>
        </button>

        {torchSupported ? (
          <button 
            type="button"
            onClick={toggleTorch}
            aria-label="Toggle Torch"
            title="Toggle Torch"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              torchOn 
                ? 'bg-pending text-white shadow-xs' 
                : 'bg-white border border-surface-tint text-ink-muted hover:text-primary'
            }`}
          >
            <Zap className={`w-4 h-4 ${torchOn ? 'fill-current' : 'stroke-[2.2]'}`} />
          </button>
        ) : (
          <div className="w-8 h-8"></div>
        )}
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 pb-24">
        
        {/* Camera Viewfinder Card */}
        <div className="w-full aspect-[4/4.2] bg-primary-dark rounded-card relative overflow-hidden shadow-md flex flex-col items-center justify-center">
          {/* Live Video Feed */}
          {hasCamera ? (
            <video
              ref={videoRef}
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 p-4 text-center">
              <Camera className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-xs">Camera preview unavailable.</p>
              <p className="text-[10px] text-white/40 mt-1">Use the manual barcode lookup below</p>
            </div>
          )}

          {/* Viewfinder Corner Framing Overlay */}
          <div className="relative w-56 h-36 flex items-center justify-center z-10 pointer-events-none">
            {/* Top-Left Corner */}
            <div className="absolute -top-2 -left-2 w-7 h-7 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
            {/* Top-Right Corner */}
            <div className="absolute -top-2 -right-2 w-7 h-7 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
            {/* Bottom-Left Corner */}
            <div className="absolute -bottom-2 -left-2 w-7 h-7 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
            {/* Bottom-Right Corner */}
            <div className="absolute -bottom-2 -right-2 w-7 h-7 border-b-4 border-r-4 border-white rounded-br-lg"></div>

            {/* Scanning Laser Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-alert/80 shadow-[0_0_8px_#DC2626] animate-pulse"></div>
          </div>

          <p className="text-[11px] text-white/80 font-medium mt-auto mb-3 z-10 px-3 py-1 bg-black/40 rounded-full backdrop-blur-xs">
            {searching ? 'Looking up product...' : 'Align barcode within the frame'}
          </p>
        </div>

        {/* Manual Barcode Entry Fallback (docs/01_PRD.md & prompt requirement) */}
        <div className="bg-white rounded-card p-3.5 border border-surface-tint shadow-xs space-y-2">
          <div className="flex items-center space-x-1.5 text-ink-muted text-[11px] font-medium">
            <Barcode className="w-3.5 h-3.5 text-primary" />
            <span>Type barcode manually (camera fallback)</span>
          </div>

          <form onSubmit={handleManualSubmit} className="flex space-x-2">
            <input 
              type="text"
              value={manualBarcode}
              onChange={(e) => setManualBarcode(e.target.value)}
              placeholder="e.g. 8901234567890"
              className="flex-1 bg-cream/60 text-xs px-3 py-2 rounded-card-sm border border-surface-tint placeholder:text-ink-muted focus:outline-none focus:border-primary font-mono"
            />
            <button 
              type="submit"
              disabled={searching}
              className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-card-sm hover:bg-primary-dark transition-colors active:scale-95 disabled:opacity-60 flex items-center gap-1"
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Look Up'}
            </button>
          </form>
        </div>

        {/* Dynamic Detection State Cards */}
        {detectionState?.type === 'FOUND' && (
          <div className="bg-white rounded-card p-4 border border-surface-tint shadow-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-card-sm bg-surface-tint text-primary font-bold text-sm flex items-center justify-center shadow-2xs">
                  {detectionState.product.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-ink">
                    {detectionState.product.name}
                  </h4>
                  <p className="text-primary font-extrabold text-sm">
                    ₹{detectionState.product.price}
                  </p>
                </div>
              </div>

              <span className="text-[10px] bg-surface-tint text-primary font-semibold px-2 py-0.5 rounded-full">
                Detected
              </span>
            </div>

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
        )}

        {detectionState?.type === 'OUT_OF_STOCK' && (
          <div className="bg-white rounded-card p-4 border border-surface-tint shadow-xs space-y-3 opacity-90 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-card-sm bg-neutral-100 text-ink-muted font-bold text-sm flex items-center justify-center">
                  {detectionState.product.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-xs text-ink">
                    {detectionState.product.name}
                  </h4>
                  <span className="text-xs text-ink-muted font-semibold">
                    Out of Stock (₹{detectionState.product.price})
                  </span>
                </div>
              </div>

              <span className="text-[10px] bg-neutral-100 text-ink-muted font-medium px-2 py-0.5 rounded-full">
                Stock 0
              </span>
            </div>

            <div className="p-2.5 bg-neutral-50 rounded-card-sm text-center text-xs text-ink-muted">
              This product is currently out of stock and cannot be added.
            </div>

            <button
              type="button"
              onClick={() => setDetectionState(null)}
              className="w-full py-2.5 bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-semibold rounded-card-sm transition"
            >
              Scan Another Product
            </button>
          </div>
        )}

        {detectionState?.type === 'NOT_FOUND' && (
          <div className="bg-white rounded-card p-4 border border-surface-tint shadow-xs space-y-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-cream-card text-ink flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-ink-muted" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-xs text-ink">
                  Product not found in this store
                </h4>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Barcode <span className="font-mono font-semibold">{detectionState.barcode}</span> is not registered at {storeName}.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDetectionState(null)}
                className="flex-1 py-2.5 bg-primary text-white text-xs font-semibold rounded-card-sm hover:bg-primary-dark transition"
              >
                Scan Again
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualBarcode(detectionState.barcode);
                  setDetectionState(null);
                }}
                className="flex-1 py-2.5 bg-cream-card text-ink text-xs font-semibold rounded-card-sm hover:bg-surface-tint transition"
              >
                Type Manually
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Floating Bottom Cart Bar if items exist */}
      {cartCount > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-30">
          <div 
            onClick={() => onNavigate('cart')}
            className="bg-primary text-white rounded-card-lg py-3 px-5 flex items-center justify-between shadow-lg cursor-pointer hover:bg-primary-dark transition-all active:scale-[0.99]"
          >
            <div className="flex items-center space-x-2 font-bold text-xs">
              <ShoppingBag className="w-4 h-4 text-white" />
              <span>{cartCount} items · ₹{cartTotal}</span>
            </div>
            <span className="text-xs font-semibold text-white/90">View Cart →</span>
          </div>
        </div>
      )}
    </div>
  );
}
