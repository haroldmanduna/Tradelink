// Tiny fetch wrapper. Uses a relative /api base so the same build works
// whether served by the backend (prod) or via the Vite dev proxy.
const BASE = import.meta.env.VITE_API_URL || '';

let authToken = localStorage.getItem('tl_token') || null;

export function setToken(token) {
  authToken = token;
  if (token) localStorage.setItem('tl_token', token);
  else localStorage.removeItem('tl_token');
}

export function getToken() {
  return authToken;
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (authToken) headers.Authorization = 'Bearer ' + authToken;
  const res = await fetch(BASE + '/api' + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  del: (p) => request('DELETE', p),
};

export const CATEGORY_LABELS = {
  electrician: 'Electrician',
  plumber: 'Plumber',
  mechanic: 'Mechanic',
  handyman: 'Handyman',
  carpenter: 'Carpenter',
  painter: 'Painter',
  welder: 'Welder',
  builder: 'Builder',
};

export const CATEGORY_ICON = {
  electrician: '⚡',
  plumber: '🔧',
  mechanic: '🔩',
  handyman: '🛠️',
  carpenter: '🪚',
  painter: '🎨',
  welder: '🔥',
  builder: '🧱',
};
