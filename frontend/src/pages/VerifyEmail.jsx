import { useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import StepHeader from '../components/StepHeader'
import { authApi } from '../lib/api'

function useQuery() {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

export default function VerifyEmail() {
  const navigate = useNavigate()
  const query = useQuery()
  const emailFromQuery = query.get('email') || ''

  const [email] = useState(emailFromQuery)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (code.trim().length !== 6) {
      setError('Enter the 6‑digit code from your email.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await authApi.verifyEmail({ email, code })
      navigate(`/payment?email=${encodeURIComponent(email)}`)
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]
                        rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="5" width="18" height="12" rx="2" stroke="white" strokeWidth="1.8" fill="none" />
              <rect x="5" y="8" width="4" height="3" rx="0.5" fill="white" opacity="0.9" />
              <rect x="10" y="8" width="7" height="1.5" rx="0.5" fill="white" opacity="0.6" />
              <rect x="10" y="11" width="5" height="1.5" rx="0.5" fill="white" opacity="0.6" />
            </svg>
          </div>
          <span className="text-xl font-bold">
            <span className="text-white">Desktop</span>
            <span className="text-emerald-400">Hab</span>
          </span>
        </Link>

        <div className="bg-[#16181f] rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-7">
          <StepHeader current={2} />

          <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-gray-400 text-xs mb-5">
            We&apos;ve sent a 6‑digit verification code to <span className="text-emerald-300 font-medium">{email}</span>.
            Enter it below to continue to payment.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="code" className="text-xs font-medium text-gray-300">
                Verification code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="tracking-[0.4em] text-center text-lg px-3.5 py-2.5 rounded-xl bg-white/6 border border-white/12
                           text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="••••••"
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
              className="mt-2 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60
                         disabled:cursor-not-allowed text-white font-semibold text-xs shadow shadow-emerald-500/25
                         transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Verifying…' : 'Verify and continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

