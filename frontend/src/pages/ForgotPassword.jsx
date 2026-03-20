import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StepHeader from '../components/StepHeader'
import { authApi } from '../lib/api'

export default function ForgotPassword() {
  const [searchParams] = useSearchParams()
  const emailFromQuery = searchParams.get('email') || ''

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (emailFromQuery && !email) setEmail(emailFromQuery)
  }, [emailFromQuery])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authApi.forgotPassword(email)
      setDone(true)
    } catch (err) {
      setError(err.message || 'Could not send reset email.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center" />
          <span className="text-xl font-bold">
            <span className="text-white">Desk</span>
            <span className="text-emerald-400">Hab</span>
          </span>
        </Link>

        <div className="bg-[#16181f] rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-7">
          <StepHeader current={2} />
          <h1 className="text-xl font-bold text-white mb-2">Forgot password</h1>
          <p className="text-gray-400 text-xs mb-5">
            Enter your email and we&apos;ll send you a password reset link.
          </p>

          {done ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
              If an account exists for <span className="font-semibold">{email}</span>, you&apos;ll receive a reset link shortly.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-300">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoFocus
                  required
                  className="px-3.5 py-2.5 rounded-xl bg-white/6 border border-white/12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs shadow shadow-emerald-500/25 transition-all"
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}

          <div className="pt-4 text-center">
            <Link to="/create-account" className="text-[11px] text-gray-400 hover:text-gray-300 transition-colors">
              ← Back
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

