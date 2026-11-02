import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Coins, 
  LogOut, 
  RefreshCw, 
  Camera, 
  X, 
  ShieldCheck,
  Check,
  Loader2
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function StaffScreen() {
  const { profile, signOut } = useAuth();
  const [cashOrders, setCashOrders] = useState([]);
  const [loadingCash, setLoadingCash] = useState(true);
  const [confirmingId, setConfirmingId] = useState(null);

  // Verification state
  const [manualBillId, setManualBillId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null); // { status, bill_no, order_id, ... }
  const [markingUsed, setMarkingUsed] = useState(false);

  // RFID Simulation state
  const [rfidExtraItem, setRfidExtraItem] = useState(false);
  const [rfidChecking, setRfidChecking] = useState(false);
  const [rfidResult, setRfidResult] = useState(null);
  const [managerAlerted, setManagerAlerted] = useState(false);

  // Scanner modal state
  const [showScanner, setShowScanner] = useState(false);
  const videoRef = useRef(null);
  const scannerStreamRef = useRef(null);
  const codeReaderRef = useRef(null);

  const storeName = profile?.store?.name || 'FreshMart';

  const loadCashPending = async () => {
    try {
      setLoadingCash(true);
      const data = await api.getStaffCashPending();
      setCashOrders(data || []);
    } catch (err) {
      console.error('Failed to load cash pending:', err);
    } finally {
      setLoadingCash(false);
    }
  };

  useEffect(() => {
    loadCashPending();
    const interval = setInterval(loadCashPending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle Verify QR / ID
  const handleVerify = async (billIdOrPayload) => {
    const cleaned = (billIdOrPayload || manualBillId).trim();
    if (!cleaned) return;

    setVerifying(true);
    setRfidResult(null);
    setRfidExtraItem(false);
    setManagerAlerted(false);
    try {
      const res = await api.verifyExitBill(cleaned);
      setVerifyResult(res);
      if (showScanner) {
        closeScanner();
      }
    } catch (err) {
      setVerifyResult({
        status: 'INVALID',
        message: err.message || 'Bill verification failed.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleRunRfidCheck = async () => {
    if (!verifyResult?.order_id && !verifyResult?.bill_no) return;
    setRfidChecking(true);
    setManagerAlerted(false);
    try {
      await new Promise((r) => setTimeout(r, 800));
      const target = verifyResult.order_id || verifyResult.bill_no;
      const res = await api.rfidCheck(target, rfidExtraItem);
      setRfidResult(res);
    } catch (err) {
      console.error('RFID check failed:', err);
      setRfidResult({
        status: 'MISMATCH',
        message: err.message || 'RFID sensor check failed.',
      });
    } finally {
      setRfidChecking(false);
    }
  };


  // Mark Bill Used
  const handleMarkUsed = async () => {
    if (!verifyResult?.order_id && !verifyResult?.bill_no) return;
    setMarkingUsed(true);
    try {
      const target = verifyResult.order_id || verifyResult.bill_no;
      await api.markBillUsed(target);
      setVerifyResult((prev) => ({
        ...prev,
        status: 'ALREADY_USED',
        used_at: new Date().toISOString(),
        message: 'Bill marked USED successfully.',
      }));
    } catch (err) {
      console.error('Failed to mark used:', err);
    } finally {
      setMarkingUsed(false);
    }
  };

  // Confirm Cash Received
  const handleConfirmCash = async (orderId) => {
    setConfirmingId(orderId);
    try {
      await api.confirmCash(orderId);
      await loadCashPending();
    } catch (err) {
      console.error('Failed to confirm cash:', err);
      alert(err.message || 'Failed to confirm cash payment.');
    } finally {
      setConfirmingId(null);
    }
  };

  // QR Camera Scanner for Exit Bill
  const openScanner = async () => {
    setShowScanner(true);
    try {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      scannerStreamRef.current = stream;

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();

          codeReader.decodeFromVideoElement(videoRef.current, (result) => {
            if (result) {
              const text = result.getText();
              handleVerify(text);
            }
          });
        }
      }, 200);
    } catch (err) {
      console.warn('Staff scanner error:', err);
    }
  };

  const closeScanner = () => {
    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (codeReaderRef.current && typeof codeReaderRef.current.reset === 'function') {
      codeReaderRef.current.reset();
    }
    setShowScanner(false);
  };

  return (
    <div className="flex flex-col h-full bg-cream text-ink select-none relative">
      {/* Top Header */}
      <header className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-surface-tint bg-cream/90 backdrop-blur-xs sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success"></span>
            <span className="font-extrabold text-xs text-primary uppercase tracking-wider">Staff Gate</span>
          </div>
          <h2 className="font-bold text-sm text-ink leading-tight">{storeName}</h2>
        </div>

        <button
          type="button"
          onClick={signOut}
          title="Sign out"
          aria-label="Sign Out"
          className="p-1.5 rounded-full hover:bg-neutral-200 text-ink-muted transition"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </header>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 pb-20">
        
        {/* Verification Action Card */}
        <div className="bg-white rounded-card p-5 border border-surface-tint shadow-xs space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-ink">Verify Exit QR</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Scan customer's digital bill QR or type the bill reference to authorize exit.
            </p>
          </div>

          <button
            type="button"
            onClick={openScanner}
            className="w-full py-4 bg-primary hover:bg-primary-dark text-white font-bold text-sm rounded-card shadow-sm flex items-center justify-center gap-2.5 transition active:scale-[0.99]"
          >
            <Camera className="w-5 h-5" />
            <span>Scan Customer Bill QR</span>
          </button>

          {/* Manual Entry Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(manualBillId);
            }}
            className="flex gap-2 pt-1"
          >
            <input
              type="text"
              value={manualBillId}
              onChange={(e) => setManualBillId(e.target.value)}
              placeholder="e.g. SS-20481 or QR text"
              className="flex-1 bg-cream/60 text-xs px-3 py-2.5 rounded-card-sm border border-surface-tint placeholder:text-ink-muted focus:outline-none focus:border-primary font-mono"
            />
            <button
              type="submit"
              disabled={verifying}
              className="px-4 py-2.5 bg-cream-card hover:bg-surface-tint text-ink text-xs font-semibold rounded-card-sm transition disabled:opacity-60 flex items-center gap-1"
            >
              {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Verify'}
            </button>
          </form>
        </div>

        {/* Verification Result Display */}
        {verifyResult && (
          <div className="bg-white rounded-card p-4 border border-surface-tint shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
            {/* Status Header */}
            {verifyResult.status === 'VERIFIED' && (
              <div className="flex items-center gap-2.5 p-3 bg-success/10 border border-success/30 rounded-card-sm text-success">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <div className="leading-tight">
                  <span className="font-extrabold text-xs tracking-wider uppercase">VERIFIED</span>
                  <p className="text-[11px] text-ink-muted mt-0.5">Payment confirmed. Authorized for exit.</p>
                </div>
              </div>
            )}

            {verifyResult.status === 'ALREADY_USED' && (
              <div className="flex items-center gap-2.5 p-3 bg-pending-bg border border-pending/30 rounded-card-sm text-pending">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="leading-tight">
                  <span className="font-extrabold text-xs tracking-wider uppercase">ALREADY USED</span>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    This bill was already verified and marked used.
                  </p>
                </div>
              </div>
            )}

            {verifyResult.status === 'WRONG_STORE' && (
              <div className="flex items-center gap-2.5 p-3 bg-alert-bg border border-alert/30 rounded-card-sm text-alert">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="leading-tight">
                  <span className="font-extrabold text-xs tracking-wider uppercase">WRONG STORE</span>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {verifyResult.message || 'Bill belongs to another store.'}
                  </p>
                </div>
              </div>
            )}

            {verifyResult.status === 'INVALID' && (
              <div className="flex items-center gap-2.5 p-3 bg-alert-bg border border-alert/30 rounded-card-sm text-alert">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div className="leading-tight">
                  <span className="font-extrabold text-xs tracking-wider uppercase">INVALID</span>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    {verifyResult.message || 'Invalid bill code or unpaid transaction.'}
                  </p>
                </div>
              </div>
            )}

            {/* Bill Details */}
            {verifyResult.bill_no && (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-ink">
                  <span className="text-ink-muted">Bill Number</span>
                  <span className="font-mono font-bold">{verifyResult.bill_no}</span>
                </div>
                {verifyResult.total !== undefined && (
                  <div className="flex justify-between items-center text-ink">
                    <span className="text-ink-muted">Billed Total</span>
                    <span className="font-extrabold text-primary">₹{verifyResult.total}</span>
                  </div>
                )}
                {verifyResult.customer_name && (
                  <div className="flex justify-between items-center text-ink">
                    <span className="text-ink-muted">Customer</span>
                    <span className="font-medium">{verifyResult.customer_name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Checklist of billed items */}
            {verifyResult.items && verifyResult.items.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-surface-tint">
                <span className="text-[11px] font-bold text-ink-muted uppercase">Billed Items Checklist</span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {verifyResult.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded-xs bg-cream">
                      <div className="flex items-center gap-1.5 truncate">
                        <Check className="w-3.5 h-3.5 text-success shrink-0" />
                        <span className="truncate">{it.name_snapshot || it.name}</span>
                      </div>
                      <span className="font-semibold text-ink-muted shrink-0 ml-2">×{it.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SIMULATED RFID BAG CHECK PANEL */}
            {verifyResult.status === 'VERIFIED' && (
              <div className="pt-3 border-t border-surface-tint space-y-3">
                <div className="bg-surface-tint/60 rounded-card-sm p-3 border border-surface-tint space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="font-bold text-xs text-primary uppercase tracking-wide">
                        SIMULATED RFID BAG CHECK
                      </span>
                    </div>
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold">
                      Simulated Sensor
                    </span>
                  </div>

                  <p className="text-[11px] text-ink-muted">
                    Simulates physical RFID portal antenna scanning items currently placed inside customer bag.
                  </p>

                  {/* Bag contents simulation setup */}
                  <div className="p-2.5 bg-cream rounded-xs border border-surface-tint/80 space-y-2">
                    <span className="text-[10px] font-bold uppercase text-ink-muted block">
                      Simulation Setup
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                      <input
                        type="checkbox"
                        checked={rfidExtraItem}
                        onChange={(e) => {
                          setRfidExtraItem(e.target.checked);
                          setRfidResult(null);
                          setManagerAlerted(false);
                        }}
                        className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary"
                      />
                      <span className="font-medium text-ink">
                        Add unbilled item <strong className="text-alert font-semibold">(Demo T-Shirt)</strong>
                      </span>
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={rfidChecking}
                    onClick={handleRunRfidCheck}
                    className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xs transition flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    {rfidChecking ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Scanning bag via RFID...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Run Bag Check</span>
                      </>
                    )}
                  </button>
                </div>

                {/* RFID Match Result */}
                {rfidResult?.status === 'MATCH' && (
                  <div className="p-3 bg-success/10 border border-success/30 rounded-card-sm text-success space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span className="font-bold text-xs uppercase tracking-wide">All items match the bill</span>
                    </div>
                    <p className="text-[11px] text-ink-muted">
                      RFID sensor verified all {verifyResult.items?.length || 0} billed items inside the bag. No extra items detected.
                    </p>
                  </div>
                )}

                {/* RFID Mismatch Result (Full Red Alert Panel) */}
                {rfidResult?.status === 'MISMATCH' && (
                  <div className="p-3.5 bg-alert/10 border-2 border-alert rounded-card-sm text-alert space-y-2.5 animate-in fade-in zoom-in-95">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-extrabold text-xs tracking-wider uppercase block">
                          MISMATCH DETECTED
                        </span>
                        <p className="text-xs font-semibold text-alert mt-0.5">
                          MISMATCH — 1 item in the bag is not on the bill: <u>Demo T-Shirt</u>
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] text-ink-muted bg-white/70 p-2 rounded-xs border border-alert/20">
                      Unscanned item was detected by the simulated RFID exit antenna. The bill cannot be marked used until resolved.
                    </p>

                    {managerAlerted && (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xs text-pending text-xs font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Store Manager alerted. Customer held at Exit Gate.</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={markingUsed}
                        onClick={handleMarkUsed}
                        className="flex-1 py-2.5 bg-success hover:bg-success/90 text-white font-bold text-xs rounded-xs transition shadow-xs"
                      >
                        {markingUsed ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                        ) : (
                          'Item Returned — Proceed'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setManagerAlerted(true)}
                        className="px-3 py-2.5 bg-alert/20 hover:bg-alert/30 text-alert border border-alert/40 font-bold text-xs rounded-xs transition"
                      >
                        Call Manager
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              {verifyResult.status === 'VERIFIED' && rfidResult?.status !== 'MISMATCH' && (
                <button
                  type="button"
                  disabled={markingUsed}
                  onClick={handleMarkUsed}
                  className="flex-1 py-3 bg-success hover:bg-success/90 text-white font-bold text-xs rounded-card-sm transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {markingUsed ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Allow Exit / Mark Used</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setVerifyResult(null);
                  setRfidResult(null);
                  setRfidExtraItem(false);
                  setManagerAlerted(false);
                }}
                className="px-4 py-3 bg-neutral-100 hover:bg-neutral-200 text-ink text-xs font-semibold rounded-card-sm transition"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}


        {/* Cash Payments Pending Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-pending" />
              <h3 className="font-bold text-sm text-ink">Cash Payments Pending</h3>
            </div>
            <button
              type="button"
              onClick={loadCashPending}
              className="p-1 text-ink-muted hover:text-primary transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCash ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingCash && cashOrders.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-muted">
              Loading pending cash orders...
            </div>
          ) : cashOrders.length === 0 ? (
            <div className="p-4 bg-white rounded-card border border-surface-tint text-center text-xs text-ink-muted">
              No cash payments pending at this time.
            </div>
          ) : (
            <div className="space-y-2.5">
              {cashOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded-card p-3.5 border border-surface-tint shadow-xs space-y-2.5"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-xs text-ink">
                        {ord.customer_name || 'Customer'}
                      </h4>
                      <p className="text-[11px] text-ink-muted">
                        {ord.items_count} item(s) · Ref {ord.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-sm text-primary">₹{ord.total}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={confirmingId === ord.id}
                    onClick={() => handleConfirmCash(ord.id)}
                    className="w-full py-2.5 bg-pending hover:bg-pending/90 text-white text-xs font-bold rounded-card-sm shadow-xs flex items-center justify-center gap-1.5 transition disabled:opacity-60"
                  >
                    {confirmingId === ord.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Confirm Cash Received (₹{ord.total})</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Camera Scanner Modal Overlay */}
      {showScanner && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col justify-between p-4 animate-in fade-in">
          <div className="flex justify-between items-center text-white">
            <span className="text-xs font-bold">Scanning Customer Bill QR</span>
            <button
              type="button"
              onClick={closeScanner}
              className="p-1 rounded-full bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative aspect-square max-w-xs mx-auto w-full rounded-card overflow-hidden border-2 border-white/30 flex items-center justify-center">
            <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
            <div className="absolute inset-8 border-2 border-primary rounded-lg pointer-events-none"></div>
          </div>

          <div className="text-center text-white/70 text-xs pb-4">
            Point camera at the customer's SmartScan Bill QR code
          </div>
        </div>
      )}
    </div>
  );
}
