import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import StepHeader from '../components/StepHeader'
import { subscriptionApi } from '../lib/api'

export default function PaymentProcessing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''

  const [status, setStatus] = useState('redirecting') // 'redirecting' | 'error'
  const [error, setError] = useState('')

  const startCheckout = async () => {
    if (!email) {
      setStatus('error')
      setError('Missing email. Please restart the signup flow.')
      return
    }

    try {
      const res = await subscriptionApi.startTrial({ email })
      if (!res?.checkout_url) throw new Error('Checkout URL missing from server response.')
      window.location.href = res.checkout_url
    } catch (err) {
      setStatus('error')
      setError(err.message || 'Could not start Paystack checkout.')
    }
  }

  useEffect(() => {
    startCheckout()
  }, [email])

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]
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

        <div className="bg-[#16181f] rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-7 text-center">
          <StepHeader current={3} />

          {status === 'redirecting' ? (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Redirecting to Paystack…</h1>
              <p className="text-gray-400 text-xs mb-4">
                We&apos;re opening a secure Paystack checkout to start your free trial.
              </p>
              <div className="flex items-center justify-center">
                <svg className="w-6 h-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Payment issue</h1>
              <p className="text-red-300 text-xs mb-4">{error}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStatus('redirecting')
                    setError('')
                    startCheckout()
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-white"
                >
                  Try again
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/verify-email?email=${encodeURIComponent(email)}`)}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-semibold text-white transition-colors"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
