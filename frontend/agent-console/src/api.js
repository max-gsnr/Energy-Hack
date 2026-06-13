const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8088';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

export const api = {
  health: () => get('/api/health'),
  plant: () => get('/api/plant'),
  findings: () => get('/api/findings'),
  timeline: (id) => get(`/api/timeline/${encodeURIComponent(id)}`),
  dispatch: (finding_id) => post('/api/dispatch', { finding_id }),
  chat: (message, history) => post('/api/chat', { message, history }),
};
