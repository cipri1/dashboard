const BASE = '/api';

function token() {
  return localStorage.getItem('token') || '';
}

function headers(extra = {}) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...extra };
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    return;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function requestBlob(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
    headers: headers(),
  });
  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    return;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.blob();
}

export const api = {
  // Auth
  login: (body) => request('POST', '/auth/login', body),

  // Parts
  getParts:    ()       => request('GET',    '/parts'),
  createPart:  (body)   => request('POST',   '/parts', body),
  updatePart:  (id, b)  => request('PUT',    `/parts/${id}`, b),
  deletePart:  (id)     => request('DELETE', `/parts/${id}`),

  // Products
  getProducts:   ()      => request('GET',    '/products'),
  createProduct: (body)  => request('POST',   '/products', body),
  updateProduct: (id, b) => request('PUT',    `/products/${id}`, b),
  deleteProduct: (id)    => request('DELETE', `/products/${id}`),

  // Clients
  getClients:   ()      => request('GET',    '/clients'),
  createClient: (body)  => request('POST',   '/clients', body),
  updateClient: (id, b) => request('PUT',    `/clients/${id}`, b),
  deleteClient: (id)    => request('DELETE', `/clients/${id}`),

  // Settings
  getSettings:  ()      => request('GET',    '/settings'),
  updateSettings: (body) => request('PUT',   '/settings', body),

  // Sales
  getSales:       ()         => request('GET',    '/sales'),
  createSale:     (body)     => request('POST',   '/sales', body),
  updateSaleStatus: (id, st) => request('PATCH',  `/sales/${id}/status`, { status: st }),
  deleteSale:     (id)       => request('DELETE', `/sales/${id}`),

  // Audit
  getAudit: (action) => request('GET', `/audit${action ? `?action=${action}` : ''}`),

  // Labels
  getSaleLabel: (id) => requestBlob(`/label/sales/${id}/label`),

  // Users
  getUsers:   ()      => request('GET',    '/users'),
  createUser: (body)  => request('POST',   '/users', body),
  deleteUser: (id)    => request('DELETE', `/users/${id}`),
};
