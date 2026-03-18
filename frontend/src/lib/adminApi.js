const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')

async function apiFetch(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = { ...(options.headers || {}) }
  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...headers,
    },
    ...options,
  })

  if (!res.ok) {
    let message = 'Request failed'
    try {
      const data = await res.json()
      message = data.detail || data.error || JSON.stringify(data)
    } catch {
      message = await res.text()
    }
    throw new Error(message || `HTTP ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

function getAdminAccessToken() {
  try {
    return localStorage.getItem('admin_access_token') || ''
  } catch {
    return ''
  }
}

function setAdminTokens({ access_token, refresh_token }) {
  try {
    localStorage.setItem('admin_access_token', access_token)
    localStorage.setItem('admin_refresh_token', refresh_token)
  } catch {}
}

export function clearAdminTokens() {
  try {
    localStorage.removeItem('admin_access_token')
    localStorage.removeItem('admin_refresh_token')
  } catch {}
}

export const adminApi = {
  async login({ email, password, remember_me = false }) {
    const data = await apiFetch('/v1/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me }),
    })
    setAdminTokens(data)
    return data
  },

  async me() {
    const token = getAdminAccessToken()
    return apiFetch('/v1/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async listAdminUsers() {
    const token = getAdminAccessToken()
    return apiFetch('/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async overview() {
    const token = getAdminAccessToken()
    return apiFetch('/v1/admin/overview', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async createAdminUser({ email, password, name, role }) {
    const token = getAdminAccessToken()
    return apiFetch('/v1/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, password, name, role }),
    })
  },

  async enableAdminUser(adminId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/users/${adminId}/enable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async disableAdminUser(adminId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/users/${adminId}/disable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // ── App users (desktop users) ─────────────────────────────────────────────
  async listAppUsers({ q = '', limit = 50, offset = 0 } = {}) {
    const token = getAdminAccessToken()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    return apiFetch(`/v1/admin/app-users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async getAppUser(userId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/app-users/${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async disableAppUser(userId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/app-users/${encodeURIComponent(userId)}/disable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async enableAppUser(userId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/app-users/${encodeURIComponent(userId)}/enable`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async forceLogoutAppUser(userId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/app-users/${encodeURIComponent(userId)}/force-logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // ── Subscriptions ───────────────────────────────────────────────────────────
  async listSubscriptions({ q = '', status = '', limit = 50, offset = 0 } = {}) {
    const token = getAdminAccessToken()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status_filter', status)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    return apiFetch(`/v1/admin/subscriptions?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async updateSubscription(subId, body) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/subscriptions/${encodeURIComponent(subId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },

  async triggerSubscriptionSync(subId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/subscriptions/${encodeURIComponent(subId)}/sync-now`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // ── Payments ────────────────────────────────────────────────────────────────
  async listPayments({ q = '', status = '', limit = 50, offset = 0 } = {}) {
    const token = getAdminAccessToken()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status_filter', status)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    return apiFetch(`/v1/admin/payments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async getPaymentByReference(reference) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/payments/paystack/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async resendPaymentReceipt(paymentId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/payments/${encodeURIComponent(paymentId)}/resend-receipt`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // ── Devices ─────────────────────────────────────────────────────────────────
  async listDevices({ q = '', limit = 50, offset = 0 } = {}) {
    const token = getAdminAccessToken()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('limit', String(limit))
    params.set('offset', String(offset))
    return apiFetch(`/v1/admin/devices?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async unbindDevice(bindingId) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/devices/${encodeURIComponent(bindingId)}/unbind`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  // ── Apps / Products ────────────────────────────────────────────────────────
  async listApps() {
    const token = getAdminAccessToken()
    return apiFetch('/v1/admin/apps', {
      headers: { Authorization: `Bearer ${token}` },
    })
  },

  async updateApp(appId, body) {
    const token = getAdminAccessToken()
    return apiFetch(`/v1/admin/apps/${encodeURIComponent(appId)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  },

  // ── Releases / Downloads ────────────────────────────────────────────────
  async createRelease(formData) {
    const token = getAdminAccessToken()
    return apiFetch('/v1/admin/releases', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
  },
}

