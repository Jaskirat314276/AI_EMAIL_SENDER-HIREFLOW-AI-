const BASE = 'http://localhost:4000';

async function req(path, { method = 'GET', body, headers = {}, isForm = false } = {}) {
  const opts = {
    method,
    credentials: 'include',
    headers: isForm ? headers : { 'Content-Type': 'application/json', ...headers },
  };
  if (body !== undefined) opts.body = isForm ? body : JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const msg = data?.error || (typeof data === 'string' ? data : `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data;
}

export const api = {
  health: () => req('/health'),

  auth: {
    me:      () => req('/auth/me'),
    connectUrl: () => `${BASE}/auth/google`,
    logout:  () => req('/auth/logout', { method: 'POST' }),
  },

  profile: {
    get:     () => req('/profile').then((d) => d.profile),
    update:  (patch) => req('/profile', { method: 'PUT', body: patch }).then((d) => d.profile),
  },

  recipients: {
    list:    () => req('/recipients').then((d) => d.recipients),
    add:     (recipient) => req('/recipients', { method: 'POST', body: recipient }),
    update:  (id, patch) => req(`/recipients/${id}`, { method: 'PUT', body: patch }).then((d) => d.recipient),
    remove:  (id) => req(`/recipients/${id}`, { method: 'DELETE' }),
    clear:   () => req('/recipients', { method: 'DELETE' }),
  },

  upload: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return req('/upload', { method: 'POST', body: fd, isForm: true });
  },

  generate: {
    preview: (recipient, tone = 'Direct') =>
      req('/preview', { method: 'POST', body: { recipient, tone } }),
    all:     ({ tone = 'Direct', regenerate = false, recipient_ids = null } = {}) =>
      req('/generate', { method: 'POST', body: { tone, regenerate, recipient_ids } }),
    updateDraft: (recipient_id, { subject, body }) =>
      req(`/sends/${recipient_id}`, { method: 'PUT', body: { subject, body } }),
  },

  send: {
    test: () => req('/send/test', { method: 'POST' }),
    one:  (id, { dry_run = false } = {}) =>
      req(`/send/${id}`, { method: 'POST', body: { dry_run } }),
    // repointed to the non-blocking enqueue endpoint
    all:  ({ include_failed = false, dry_run = false } = {}) =>
      req('/send', { method: 'POST', body: { include_failed, dry_run } }),
    queue: {
      start:    ({ include_failed = false, dry_run = false, recipient_ids = null } = {}) =>
        req('/send/queue', { method: 'POST', body: { include_failed, dry_run, recipient_ids } }),
      pause:    () => req('/send/pause',  { method: 'POST' }),
      resume:   () => req('/send/resume', { method: 'POST' }),
      cancel:   () => req('/send/cancel', { method: 'POST' }),
      status:   () => req('/send/queue/status'),
      settings: (patch) => req('/send/queue/settings', { method: 'PUT', body: patch }).then((d) => d.settings),
    },
  },

  tracker: {
    list:   () => req('/tracker').then((d) => d.applications),
    update: (recipient_id, patch) =>
      req(`/tracker/${recipient_id}`, { method: 'PATCH', body: patch }).then((d) => d.row),
  },
};

export const BASE_URL = BASE;
