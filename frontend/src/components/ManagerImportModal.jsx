import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  Loader2, 
  ArrowRight, 
  RefreshCw,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api';

export default function ManagerImportModal({
  isOpen,
  onClose,
  store,
  onImportComplete
}) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preview' | 'result'
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState('all'); // 'all' | 'add' | 'update' | 'errors'

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep('upload');
    setFile(null);
    setPreviewData(null);
    setImportResult(null);
    setLoading(false);
    setError('');
    setActivePreviewTab('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      await api.downloadImportTemplate(store.id);
    } catch (err) {
      console.error('Download template failed:', err);
      // Fallback: client-side generate
      const csvContent = "barcode,name,category,price,stock\n8901234567890,Sample Product Name,General,199,25\n";
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "smartscan_products_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileChange = (e) => {
    setError('');
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        setError('Please select a valid .csv file.');
        return;
      }
      setFile(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setError('');
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (!dropped.name.endsWith('.csv')) {
        setError('Please select a valid .csv file.');
        return;
      }
      setFile(dropped);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setError('Please select a CSV file first.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const preview = await api.previewImportProducts(store.id, file);
      setPreviewData(preview);
      setStep('preview');
    } catch (err) {
      console.error('Preview failed:', err);
      setError(err.message || 'Failed to generate preview. Please verify CSV format.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError('');
      const result = await api.executeImportProducts(store.id, file);
      setImportResult(result);
      setStep('result');
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      console.error('Import failed:', err);
      setError(err.message || 'Import execution failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0C3B21] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight">Bulk Import Products</h3>
              <p className="text-[11px] text-white/70">Store: <span className="text-white font-semibold">{store.name} ({store.code})</span></p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD CSV */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 bg-[#F6F2E7] rounded-2xl border border-[#14532D]/15">
                <div>
                  <h4 className="text-xs font-bold text-[#16130E]">Need the CSV format?</h4>
                  <p className="text-[11px] text-[#43543F] mt-0.5">
                    Download the standard 5-column template (barcode, name, category, price, stock).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 bg-white hover:bg-[#E8F1E4] text-[#14532D] border border-[#14532D]/20 font-bold text-xs rounded-xl shadow-2xs transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </button>
              </div>

              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                  file
                    ? 'border-[#14532D] bg-[#E8F1E4]/30'
                    : 'border-[#14532D]/30 hover:border-[#14532D] bg-[#F6F2E7]/40 hover:bg-[#F6F2E7]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-[#E8F1E4] text-[#14532D] flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>

                {file ? (
                  <div>
                    <span className="font-bold text-xs text-[#16130E] block">{file.name}</span>
                    <span className="text-[11px] text-[#43543F]">
                      {(file.size / 1024).toFixed(1)} KB · Click to change file
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="font-bold text-xs text-[#16130E] block">
                      Choose a CSV file or drag and drop here
                    </span>
                    <span className="text-[11px] text-[#43543F]">
                      Accepts standard comma-separated .csv files
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={!file || loading}
                  onClick={handlePreview}
                  className="px-5 py-2.5 bg-[#14532D] hover:bg-[#0C3B21] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analysing CSV...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Preview</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW BREAKDOWN */}
          {step === 'preview' && previewData && (
            <div className="space-y-4">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-4 gap-2.5">
                <div className="p-3 bg-[#F6F2E7] rounded-xl border border-[#14532D]/10 text-center">
                  <span className="text-[10px] text-[#43543F] font-bold block uppercase">Total Rows</span>
                  <span className="text-lg font-black text-[#16130E]">{previewData.total_rows}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">New to Add</span>
                  <span className="text-lg font-black text-emerald-700">{previewData.to_add_count}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <span className="text-[10px] text-blue-800 font-bold block uppercase">To Update</span>
                  <span className="text-lg font-black text-blue-700">{previewData.to_update_count}</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                  <span className="text-[10px] text-red-800 font-bold block uppercase">Errors</span>
                  <span className="text-lg font-black text-red-700">{previewData.to_fail_count}</span>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex bg-[#F6F2E7] p-1 rounded-xl text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('all')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    activePreviewTab === 'all' ? 'bg-[#14532D] text-white shadow-2xs' : 'text-[#43543F] hover:text-[#16130E]'
                  }`}
                >
                  All ({previewData.total_rows})
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('add')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    activePreviewTab === 'add' ? 'bg-[#14532D] text-white shadow-2xs' : 'text-[#43543F] hover:text-[#16130E]'
                  }`}
                >
                  New ({previewData.to_add_count})
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('update')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    activePreviewTab === 'update' ? 'bg-[#14532D] text-white shadow-2xs' : 'text-[#43543F] hover:text-[#16130E]'
                  }`}
                >
                  Update ({previewData.to_update_count})
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('errors')}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    activePreviewTab === 'errors' ? 'bg-[#14532D] text-white shadow-2xs' : 'text-[#43543F] hover:text-[#16130E]'
                  }`}
                >
                  Errors ({previewData.to_fail_count})
                </button>
              </div>

              {/* Rows Details Table */}
              <div className="max-h-56 overflow-y-auto border border-[#14532D]/15 rounded-xl bg-white">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-[#F6F2E7]/80 sticky top-0 border-b border-[#14532D]/10 text-[#43543F] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-2.5">Row</th>
                      <th className="py-2 px-2.5">Barcode</th>
                      <th className="py-2 px-2.5">Product</th>
                      <th className="py-2 px-2.5">Action / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {/* Add rows */}
                    {(activePreviewTab === 'all' || activePreviewTab === 'add') &&
                      previewData.to_add.map((item, idx) => (
                        <tr key={`add-${idx}`} className="hover:bg-emerald-50/30">
                          <td className="py-2 px-2.5 font-mono text-[#43543F]">{item.row}</td>
                          <td className="py-2 px-2.5 font-mono">{item.barcode}</td>
                          <td className="py-2 px-2.5 font-medium">{item.name} (₹{item.price})</td>
                          <td className="py-2 px-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              + Will Add
                            </span>
                          </td>
                        </tr>
                      ))}

                    {/* Update rows */}
                    {(activePreviewTab === 'all' || activePreviewTab === 'update') &&
                      previewData.to_update.map((item, idx) => (
                        <tr key={`up-${idx}`} className="hover:bg-blue-50/30">
                          <td className="py-2 px-2.5 font-mono text-[#43543F]">{item.row}</td>
                          <td className="py-2 px-2.5 font-mono">{item.barcode}</td>
                          <td className="py-2 px-2.5 font-medium">
                            {item.name} (₹{item.old_price} → ₹{item.new_price})
                          </td>
                          <td className="py-2 px-2.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              ↻ Will Update
                            </span>
                          </td>
                        </tr>
                      ))}

                    {/* Error rows */}
                    {(activePreviewTab === 'all' || activePreviewTab === 'errors') &&
                      previewData.failed.map((item, idx) => (
                        <tr key={`err-${idx}`} className="hover:bg-red-50/30">
                          <td className="py-2 px-2.5 font-mono text-red-700 font-bold">{item.row}</td>
                          <td className="py-2 px-2.5 font-mono text-neutral-500">{item.barcode || '—'}</td>
                          <td className="py-2 px-2.5 font-medium text-neutral-500">{item.name || '—'}</td>
                          <td className="py-2 px-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800">
                              {item.reason}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-between border-t border-[#14532D]/10">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#16130E] text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Choose Different File
                </button>
                <button
                  type="button"
                  disabled={previewData.valid_count === 0 || loading}
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 bg-[#14532D] hover:bg-[#0C3B21] disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importing Products...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Import ({previewData.valid_count} Valid)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: RESULT SUMMARY */}
          {step === 'result' && importResult && (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-base text-[#16130E]">Catalogue Import Completed!</h4>
                <p className="text-xs text-[#43543F]">
                  Products are now live in {store.name} and ready for customer scanning.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto pt-2">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[10px] text-emerald-800 font-bold block uppercase">Added</span>
                  <span className="text-xl font-black text-emerald-700">{importResult.added_count}</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-center">
                  <span className="text-[10px] text-blue-800 font-bold block uppercase">Updated</span>
                  <span className="text-xl font-black text-blue-700">{importResult.updated_count}</span>
                </div>
                <div className="p-3 bg-neutral-100 rounded-xl border border-neutral-200 text-center">
                  <span className="text-[10px] text-neutral-600 font-bold block uppercase">Skipped</span>
                  <span className="text-xl font-black text-neutral-700">{importResult.failed_count}</span>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 bg-[#14532D] hover:bg-[#0C3B21] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

