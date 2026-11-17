import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Barcode, 
  Zap, 
  Check, 
  Plus, 
  AlertCircle, 
  Loader2, 
  Copy, 
  CheckCircle2,
  ScanLine,
  ArrowRight
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { api } from '../services/api';

export default function ManagerAddProductModal({
  isOpen,
  onClose,
  store,
  existingCategories = [],
  onProductSaved,
  initialBarcode = null
}) {
  const [step, setStep] = useState('scan'); // 'scan' | 'form' | 'success'
  const [hasCamera, setHasCamera] = useState(true);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Lookup result state
  const [lookupResult, setLookupResult] = useState(null);

  // Form fields
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [savedProduct, setSavedProduct] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const barcodeHandlerRef = useRef(null);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (readerRef.current && typeof readerRef.current.reset === 'function') {
      try {
        readerRef.current.reset();
      } catch (e) {
        // ignore reset error on teardown
      }
      readerRef.current = null;
    }
  };

  // Reset internal states
  const resetForm = () => {
    stopCamera();
    setStep('scan');
    setSearching(false);
    setSaving(false);
    setError('');
    setLookupResult(null);
    setBarcode('');
    setName('');
    setCategory(existingCategories[0] || 'Apparel');
    setCustomCategory('');
    setPrice('');
    setStock('10');
    setSavedProduct(null);
    setManualBarcode('');
  };

  // Handle modal close
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  // Perform barcode lookup
  const handleBarcodeResolved = async (code) => {
    const cleaned = (code || '').trim();
    if (!cleaned || searching) return;

    setSearching(true);
    setError('');
    stopCamera();

    try {
      const res = await api.lookupBarcodeForManager(store.id, cleaned);
      setLookupResult(res);
      setBarcode(cleaned);

      if (res.status === 'EXISTS_CURRENT_STORE') {
        const prod = res.product;
        setName(prod.name);
        setCategory(prod.category);
        setCustomCategory('');
        setPrice(prod.price.toString());
        setStock(prod.stock.toString());
      } else if (res.status === 'EXISTS_OTHER_STORE') {
        setName(res.other_product?.name || '');
        setCategory(res.other_product?.category || existingCategories[0] || 'Apparel');
        setCustomCategory('');
        setPrice('');
        setStock('10');
      } else {
        setName('');
        setCategory(existingCategories[0] || 'Apparel');
        setCustomCategory('');
        setPrice('');
        setStock('10');
      }

      setStep('form');
    } catch (err) {
      console.error('Barcode lookup failed:', err);
      setError(err.message || 'Failed to verify barcode.');
    } finally {
      setSearching(false);
    }
  };
  barcodeHandlerRef.current = handleBarcodeResolved;

  // Initialize or teardown when modal opens / closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    resetForm();

    if (initialBarcode) {
      handleBarcodeResolved(initialBarcode);
      return;
    }

    let codeReader;
    let activeStream;

    const startCamera = async () => {
      try {
        codeReader = new BrowserMultiFormatReader();
        readerRef.current = codeReader;

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

          const track = stream.getVideoTracks()[0];
          if (track) {
            const capabilities = track.getCapabilities ? track.getCapabilities() : {};
            if ('torch' in capabilities) {
              setTorchSupported(true);
            }
          }

          codeReader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result && barcodeHandlerRef.current) {
              barcodeHandlerRef.current(result.getText());
            }
          });
        }
      } catch (err) {
        console.warn('Manager camera init error or denied:', err);
        setHasCamera(false);
      }
    };

    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      clearTimeout(timer);
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (codeReader && typeof codeReader.reset === 'function') {
        try {
          codeReader.reset();
        } catch (e) {}
      }
    };
  }, [isOpen, initialBarcode]);

  // Toggle torch
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

  // Submit manual barcode form
  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      handleBarcodeResolved(manualBarcode.trim());
    }
  };

  // Save or update product form submission
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setError('');

    const finalCategory = category === '__NEW__' ? customCategory.trim() : category.trim();

    if (!name.trim()) {
      setError('Product name cannot be empty.');
      return;
    }
    if (!finalCategory) {
      setError('Please select or specify a category.');
      return;
    }

    const priceNum = parseInt(price, 10);
    const stockNum = parseInt(stock, 10);

    if (isNaN(priceNum) || priceNum < 0) {
      setError('Price must be a valid whole number (INR) >= 0.');
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setError('Stock must be a valid whole number >= 0.');
      return;
    }

    setSaving(true);
    try {
      let saved;
      if (lookupResult?.status === 'EXISTS_CURRENT_STORE') {
        // Edit existing product
        saved = await api.updateStoreProduct(store.id, lookupResult.product.id, {
          name: name.trim(),
          category: finalCategory,
          price: priceNum,
          stock: stockNum
        });
      } else {
        // Add new product to this store
        saved = await api.addStoreProduct(store.id, {
          barcode: barcode.trim(),
          name: name.trim(),
          category: finalCategory,
          price: priceNum,
          stock: stockNum
        });
      }

      setSavedProduct(saved);
      setStep('success');
      if (onProductSaved) {
        onProductSaved(saved);
      }
    } catch (err) {
      console.error('Failed to save product:', err);
      setError(err.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const categoriesList = Array.from(new Set([...existingCategories, 'Apparel', 'Accessories', 'Grocery', 'Dairy', 'Snacks', 'Care', 'Home']));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0C3B21] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Barcode className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Add Product to Catalogue</h3>
              <p className="text-[11px] text-white/70">Store: <span className="text-white font-semibold">{store.name} ({store.code})</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: SCANNER */}
          {step === 'scan' && (
            <div className="space-y-4">
              <div className="relative aspect-video max-h-56 bg-neutral-900 rounded-2xl overflow-hidden flex flex-col items-center justify-center shadow-inner">
                {hasCamera ? (
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-white/60 p-4 text-center">
                    <Camera className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-xs">Camera preview unavailable.</p>
                    <p className="text-[10px] text-white/40 mt-1">Use the manual barcode lookup below</p>
                  </div>
                )}

                {/* Viewfinder Framing Overlay */}
                <div className="relative w-56 h-28 flex items-center justify-center z-10 pointer-events-none">
                  <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                  <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-red-500/80 shadow-[0_0_8px_#DC2626] animate-pulse"></div>
                </div>

                {torchSupported && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    aria-label="Toggle Torch"
                    className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-20 ${
                      torchOn ? 'bg-amber-400 text-neutral-900' : 'bg-black/50 text-white'
                    }`}
                  >
                    <Zap className="w-4 h-4" />
                  </button>
                )}

                <div className="absolute bottom-2 text-[11px] text-white/80 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs z-10">
                  {searching ? 'Looking up product...' : 'Align barcode within frame'}
                </div>
              </div>

              {/* Manual Barcode Entry Fallback */}
              <div className="p-4 bg-[#F6F2E7]/70 rounded-2xl border border-[#14532D]/10 space-y-2">
                <span className="text-xs font-semibold text-[#16130E] block">
                  Manual Barcode Entry (Camera fallback)
                </span>
                <form onSubmit={handleManualSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={manualBarcode}
                    onChange={(e) => setManualBarcode(e.target.value)}
                    placeholder="e.g. 80000000378472"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-[#16130E] focus:outline-none focus:border-[#14532D]"
                  />
                  <button
                    type="submit"
                    disabled={searching || !manualBarcode.trim()}
                    className="px-4 py-2.5 bg-[#14532D] hover:bg-[#0C3B21] text-white text-xs font-semibold rounded-xl transition disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Look Up'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* STEP 2: PRODUCT FORM */}
          {step === 'form' && (
            <form onSubmit={handleSaveProduct} className="space-y-4">
              
              {/* Context Banner */}
              {lookupResult?.status === 'EXISTS_CURRENT_STORE' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>Product already exists in {store.name}</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Editing this product will update its price and stock in this store without creating duplicates.
                  </p>
                </div>
              )}

              {lookupResult?.status === 'EXISTS_OTHER_STORE' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs space-y-2">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Product found in {lookupResult.other_product?.store_name || 'another store'}!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Existing title: <strong>{lookupResult.other_product?.name}</strong> ({lookupResult.other_product?.category})
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setName(lookupResult.other_product?.name || '');
                      setCategory(lookupResult.other_product?.category || 'Apparel');
                      setCustomCategory('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-[11px] font-semibold transition"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Name & Category</span>
                  </button>
                </div>
              )}

              {lookupResult?.status === 'NEW_PRODUCT' && (
                <div className="p-3 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-800 text-xs flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  <span>New product barcode: <strong>{barcode}</strong>. Fill details below to add.</span>
                </div>
              )}

              {/* Form Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#16130E] mb-1">Barcode</label>
                  <input
                    type="text"
                    value={barcode}
                    disabled
                    className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-xs font-mono text-neutral-600 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#16130E] mb-1">Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sweatshirt (Off-White, M)"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-[#16130E] focus:outline-none focus:border-[#14532D]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#16130E] mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-[#16130E] focus:outline-none focus:border-[#14532D]"
                    >
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__NEW__">+ New Category...</option>
                    </select>
                  </div>

                  {category === '__NEW__' ? (
                    <div>
                      <label className="block text-xs font-semibold text-[#16130E] mb-1">Custom Category</label>
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter category"
                        required
                        className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs text-[#16130E] focus:outline-none focus:border-[#14532D]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-[#16130E] mb-1">Price (INR)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="899"
                          required
                          className="w-full pl-7 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-[#14532D] focus:outline-none focus:border-[#14532D]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {category === '__NEW__' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#16130E] mb-1">Price (INR)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-500">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="899"
                        required
                        className="w-full pl-7 pr-3 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-bold text-[#14532D] focus:outline-none focus:border-[#14532D]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#16130E] mb-1">Stock Units</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="25"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-neutral-300 rounded-xl text-xs font-mono text-[#16130E] focus:outline-none focus:border-[#14532D]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('scan');
                    setError('');
                  }}
                  className="px-4 py-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-xl transition"
                >
                  Back to Scan
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#14532D] hover:bg-[#0C3B21] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{lookupResult?.status === 'EXISTS_CURRENT_STORE' ? 'Update Product' : 'Save to Catalogue'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'success' && savedProduct && (
            <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-[#16130E]">Product Saved Successfully</h4>
                <p className="text-xs text-[#43543F]">
                  Added to <strong>{store.name}</strong> catalogue and ready for customer scanning.
                </p>
              </div>

              <div className="w-full p-4 bg-[#F6F2E7]/70 rounded-2xl border border-[#14532D]/10 text-left space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#43543F]">Product:</span>
                  <span className="font-bold text-[#16130E]">{savedProduct.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#43543F]">Barcode:</span>
                  <span className="font-mono text-[#16130E]">{savedProduct.barcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#43543F]">Price:</span>
                  <span className="font-bold text-[#14532D]">₹{savedProduct.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#43543F]">Stock:</span>
                  <span className="font-semibold text-[#16130E]">{savedProduct.stock} units</span>
                </div>
              </div>

              <div className="w-full flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-3 bg-[#F6F2E7] hover:bg-neutral-200 text-[#16130E] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <ScanLine className="w-4 h-4" />
                  <span>Scan Another</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-3 bg-[#14532D] hover:bg-[#0C3B21] text-white text-xs font-bold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Done</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

