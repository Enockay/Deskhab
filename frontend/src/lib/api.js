const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
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

export const authApi = {
  async register({ email, password, remember_me, name }) {
    return apiFetch('/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me, name }),
    })
  },
  async verifyEmail({ email, code }) {
    return apiFetch('/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    })
  },
  async googleSetPassword({ id_token, password, name }) {
    return apiFetch('/v1/auth/google/set-password', {
      method: 'POST',
      body: JSON.stringify({ id_token, password, name }),
    })
  },
  async emailStatus(email) {
    return apiFetch(`/v1/auth/email-status?email=${encodeURIComponent(email)}`)
  },
  async resendCode(email) {
    return apiFetch(`/v1/auth/resend-code?email=${encodeURIComponent(email)}`, {
      method: 'POST',
    })
  },
  async forgotPassword(email) {
    return apiFetch(`/v1/auth/forgot-password?email=${encodeURIComponent(email)}`, {
      method: 'POST',
    })
  },
  async resetPassword({ token, newPassword }) {
    return apiFetch(
      `/v1/auth/reset-password?token=${encodeURIComponent(token)}&new_password=${encodeURIComponent(newPassword)}`,
      { method: 'POST' },
    )
  },
}

export const subscriptionApi = {
  async startTrial({ email }) {
    return apiFetch('/v1/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify({ app_slug: 'smartcalender', email }),
    })
  },
  async verify(reference) {
    return apiFetch(`/v1/subscription/verify?reference=${encodeURIComponent(reference)}`)
  },
  async renew({ userSlug, token }) {
    return apiFetch('/v1/subscription/renew', {
      method: 'POST',
      body: JSON.stringify({
        user_slug: userSlug,
        token,
        app_slug: 'smartcalender',
      }),
    })
  },
}

export const appsApi = {
  async getLatestReleaseArtifact({ appSlug, platform, channel = 'stable' }) {
    return apiFetch(
      `/v1/apps/${encodeURIComponent(appSlug)}/releases/latest?platform=${encodeURIComponent(platform)}&channel=${encodeURIComponent(channel)}`
    )
  },
  async getAppImages({ appSlug }) {
    return apiFetch(`/v1/apps/${encodeURIComponent(appSlug)}/images`)
  },
}
