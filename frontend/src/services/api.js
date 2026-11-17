import { supabase } from './supabase';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 
  import.meta.env.VITE_API_BASE_URL || 
  'http://localhost:8000'
).replace(/\/+$/, '');

/**
 * Helper to make authenticated requests with Supabase JWT
 */
async function request(path, options = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const errorMsg = data?.detail?.error || data?.detail || data?.error || response.statusText;
    const errorCode = data?.detail?.code || data?.code || 'API_ERROR';
    const err = new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    err.status = response.status;
    err.code = errorCode;
    err.details = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth Profile
  async getMe() {
    return request('/auth/me');
  },

  // Stores & Products
  async getStores() {
    return request('/stores');
  },

  async getStoreProducts(storeId, search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/stores/${storeId}/products${query}`);
  },

  async lookupProductByBarcode(storeId, barcode) {
    return request(`/products/by-barcode?store_id=${encodeURIComponent(storeId)}&barcode=${encodeURIComponent(barcode)}`);
  },

  // Checkout & Orders
  async checkout({ store_id, items, payment_method = 'UPI_MOCK' }) {
    return request('/checkout', {
      method: 'POST',
      body: JSON.stringify({ store_id, items, payment_method }),
    });
  },

  async mockPay(orderId, idempotencyKey) {
    return request(`/orders/${orderId}/mock-pay`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey || `pay-${orderId}-${Date.now()}`,
      },
    });
  },

  async payCash(orderId) {
    return request(`/orders/${orderId}/pay/cash`, {
      method: 'POST',
    });
  },

  async getMyOrders() {
    return request('/orders/my');
  },

  async getOrder(orderId) {
    return request(`/orders/${orderId}`);
  },

  async getBill(billNo) {
    return request(`/bills/${encodeURIComponent(billNo)}`);
  },

  // Manager Products & Catalogue (Feature A)
  async lookupBarcodeForManager(storeId, barcode) {
    return request(`/stores/${storeId}/products/barcode-lookup?barcode=${encodeURIComponent(barcode)}`);
  },

  async addStoreProduct(storeId, productData) {
    return request(`/stores/${storeId}/products`, {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  },

  async updateStoreProduct(storeId, productId, updateData) {
    return request(`/stores/${storeId}/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  },

  // Manager Unknown Scans Queue (Part 2 - Feature C)
  async getStoreUnknownScans(storeId) {
    return request(`/stores/${storeId}/unknown-scans`);
  },

  async deleteStoreUnknownScan(storeId, scanId) {
    return request(`/stores/${storeId}/unknown-scans/${scanId}`, {
      method: 'DELETE',
    });
  },

  // Bulk Product Import (Part 3 - Feature B)
  async downloadImportTemplate(storeId) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const res = await fetch(`${API_BASE_URL}/stores/${storeId}/products/import-template`, {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });
    if (!res.ok) throw new Error('Failed to download template');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartscan_products_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  async previewImportProducts(storeId, file) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/stores/${storeId}/products/import-preview`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail?.error || data?.detail || 'Import preview failed');
    }
    return data;
  },

  async executeImportProducts(storeId, file) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE_URL}/stores/${storeId}/products/import`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.detail?.error || data?.detail || 'Import execution failed');
    }
    return data;
  },

  // Exit Staff
  async getStaffCashPending() {
    return request('/staff/cash-pending');
  },

  async confirmCash(orderId) {
    return request(`/orders/${orderId}/cash-confirm`, {
      method: 'POST',
    });
  },

  async verifyExitBill(billId) {
    return request('/exit/verify', {
      method: 'POST',
      body: JSON.stringify({ bill_id: billId }),
    });
  },

  async markBillUsed(billId) {
    return request('/exit/use', {
      method: 'POST',
      body: JSON.stringify({ bill_id: billId }),
    });
  },

  async rfidCheck(billId, extraItem = false) {
    return request('/exit/rfid-check', {
      method: 'POST',
      body: JSON.stringify({ bill_id: billId, extra_item: extraItem }),
    });
  },

  // Manager Dashboard
  async getDashboardSummary(storeId, range = 'today') {
    const query = new URLSearchParams();
    if (storeId) query.set('store_id', storeId);
    if (range) query.set('range', range);
    return request(`/dashboard/summary?${query.toString()}`);
  },

  async resetDemoData() {
    return request('/dashboard/reset-demo', {
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
  },
};

