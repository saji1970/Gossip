const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:3100';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}

export async function sendMessage(userId, message) {
  return request('/api/conversation/chat', {
    method: 'POST',
    body: JSON.stringify({ userId, message }),
  });
}

export async function getContext(userId) {
  return request(`/api/conversation/context/${userId}`);
}

export async function clearContext(userId) {
  return request(`/api/conversation/context/${userId}`, { method: 'DELETE' });
}

export async function healthCheck() {
  try {
    await request('/health');
    return true;
  } catch {
    return false;
  }
}
