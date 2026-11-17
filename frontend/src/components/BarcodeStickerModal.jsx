import React, { useEffect, useRef } from 'react';
import { X, Printer, Barcode as BarcodeIcon, Tag, Check } from 'lucide-react';
import JsBarcode from 'jsbarcode';

export default function BarcodeStickerModal({
  isOpen,
  onClose,
  product,
  store
}) {
  const barcodeSvgRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !product || !product.barcode || !barcodeSvgRef.current) return;

    try {
      JsBarcode(barcodeSvgRef.current, product.barcode, {
        format: "CODE128",
        width: 1.8,
        height: 52,
        displayValue: true,
        fontSize: 13,
        font: "monospace",
        fontOptions: "bold",
        textMargin: 3,
        margin: 4,
        background: "#ffffff",
        lineColor: "#16130E"
      });
    } catch (err) {
      console.warn("JsBarcode rendering fallback:", err);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
      {/* Print Specific CSS to isolate the sticker element */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-sticker-wrapper,
          #printable-sticker-wrapper * {
            visibility: visible !important;
          }
          #printable-sticker-wrapper {
            position: fixed !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) !important;
            border: 1px dashed #666 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 12px !important;
            background: white !important;
          }
        }
      `}</style>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0C3B21] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Printer className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Barcode Sticker Print</h3>
              <p className="text-[11px] text-white/70">Store: <span className="text-white font-semibold">{store?.name || 'SmartScan Store'}</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 flex flex-col items-center">
          
          <p className="text-xs text-[#43543F] text-center max-w-xs">
            Standard 50mm × 32mm retail barcode sticker. Sized for shelf tags and garment label printers.
          </p>

          {/* THE PRINTABLE STICKER PREVIEW */}
          <div
            id="printable-sticker-wrapper"
            className="w-[280px] bg-white border-2 border-dashed border-[#14532D]/40 rounded-2xl p-4 shadow-sm flex flex-col items-center justify-between text-center select-none"
          >
            {/* Store & Category Header */}
            <div className="w-full flex items-center justify-between border-b border-neutral-200 pb-1.5 mb-2">
              <span className="text-[10px] font-black tracking-wider uppercase text-[#14532D]">
                {store?.name || 'SmartScan'}
              </span>
              <span className="text-[9px] font-bold text-neutral-500 uppercase">
                {product.category || 'Retail'}
              </span>
            </div>

            {/* Product Title */}
            <div className="w-full px-1 mb-1">
              <h4 className="font-black text-xs text-[#16130E] leading-tight line-clamp-2">
                {product.name}
              </h4>
            </div>

            {/* Price Tag */}
            <div className="w-full flex items-center justify-center gap-1.5 my-1">
              <span className="text-[11px] font-semibold text-neutral-500">MRP:</span>
              <span className="text-lg font-black text-[#14532D] tracking-tight">
                ₹{product.price}
              </span>
              <span className="text-[9px] text-neutral-400 font-medium">(incl. taxes)</span>
            </div>

            {/* Barcode Vector Graphic */}
            <div className="w-full flex items-center justify-center my-1 bg-white">
              <svg ref={barcodeSvgRef} className="max-w-full h-auto" />
            </div>

            {/* Footer Notice */}
            <div className="w-full border-t border-neutral-200 pt-1 mt-1 flex items-center justify-between text-[8px] text-neutral-400">
              <span className="font-semibold uppercase tracking-wider">SmartScan Verified</span>
              <span>Scan via App</span>
            </div>
          </div>

          {/* Internal Format Notice if starts with SS */}
          {product.barcode?.startsWith('SS') && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-[11px] font-medium flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
              <span>Internal barcode: scans directly into SmartScan app without hardware changes.</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="w-full flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-3 bg-[#14532D] hover:bg-[#0C3B21] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Barcode Sticker</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 bg-neutral-100 hover:bg-neutral-200 text-[#16130E] text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

