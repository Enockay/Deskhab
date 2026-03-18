import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { adminApi } from '../lib/adminApi'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await adminApi.login({ email, password, remember_me: remember })
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Unable to login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <span className="text-white font-black">D</span>
          </div>
          <span className="text-xl font-bold">
            <span className="text-white">Desk</span>
            <span className="text-emerald-400">Hab</span>
            <span className="text-gray-500 text-sm ml-2">Admin</span>
          </span>
        </Link>

        <div className="bg-[#16181f] rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-7">
          <h1 className="text-xl font-extrabold text-white mb-1">Admin login</h1>
          <p className="text-gray-400 text-xs mb-5">
            Sign in to manage users, subscriptions, and releases.
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                placeholder="admin@deskhab.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 pr-14 text-sm text-white outline-none focus:border-emerald-400/60"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] px-2 py-1 rounded-lg border border-white/10 hover:bg-white/5 text-gray-200"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-300 select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-emerald-500"
              />
              Remember me
            </label>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-[11px] text-gray-500 mt-5">
            Tip: the SQLAdmin panel is still available at <span className="text-gray-300">/admin</span> on the backend.
          </p>
        </div>
      </div>
    </div>
  )
}

