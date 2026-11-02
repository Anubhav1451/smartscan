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
};
