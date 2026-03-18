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

  // Global admin auth handling: if token expired/invalid, redirect the admin to login.
  // (A provider higher up in the tree listens for this event.)
  if (res.status === 401 && typeof window !== 'undefined') {
    clearAdminTokens()
    window.dispatchEvent(new CustomEvent('admin:unauthorized', { detail: { status: 401 } }))
  }

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

function apiUploadWithProgress(path, options = {}, onUploadProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const method = options.method || 'POST'
    const headers = options.headers || {}
    const body = options.body

    const xhr = new XMLHttpRequest()
    xhr.open(method, `${API_BASE_URL}${path}`, true)

    // Set custom headers (do NOT set Content-Type when body is FormData).
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))

    xhr.upload.onprogress = (e) => {
      if (!e || e.lengthComputable === false) return
      if (!e.total) return
      const percent = Math.round((e.loaded * 100) / e.total)
      onUploadProgress(percent)
    }

    xhr.onload = () => {
      const status = xhr.status
      if (status === 401) {
        clearAdminTokens()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('admin:unauthorized', { detail: { status } }))
        }
      }

      if (status >= 200 && status < 300) {
        if (status === 204) return resolve(null)
        try {
          const json = JSON.parse(xhr.responseText || 'null')
          return resolve(json)
        } catch {
          return resolve(null)
        }
      }

      let message = 'Request failed'
      try {
        const data = JSON.parse(xhr.responseText || '{}')
        message = data?.detail || data?.error || JSON.stringify(data)
      } catch {
        message = xhr.responseText || `HTTP ${status}`
      }
      reject(new Error(message || `HTTP ${status}`))
    }

    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.onabort = () => reject(new Error('Upload aborted'))

    xhr.send(body)
  })
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

  async createReleaseWithProgress(formData, onUploadProgress) {
    const token = getAdminAccessToken()
    return apiUploadWithProgress(
      '/v1/admin/releases',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
      onUploadProgress
    )
  },

  async listReleases({ appId, channel = '' } = {}) {
    const token = getAdminAccessToken()
    const params = new URLSearchParams()
    if (appId) params.set('app_id', appId)
    if (channel) params.set('channel', channel)
    const qs = params.toString()
    return apiFetch(`/v1/admin/releases${qs ? `?${qs}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  },
}

