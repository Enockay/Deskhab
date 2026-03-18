import { useEffect, useState } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { subscriptionApi } from '../lib/api'
import StepHeader from '../components/StepHeader'

function useQuery() {
  const { search } = useLocation()
  return new URLSearchParams(search)
}

export default function PaymentCallback() {
  const navigate = useNavigate()
  const query = useQuery()
  const reference = query.get('reference') || query.get('trxref') || ''
  const checkoutKind =
    query.get('kind') ||
    ((typeof window !== 'undefined' && sessionStorage.getItem('checkout_kind')) || 'trial')

  const [status, setStatus] = useState('verifying')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!reference) {
      setStatus('error')
      setError('Missing transaction reference.')
      return
    }

    const run = async () => {
      try {
        await subscriptionApi.verify(reference)
        setStatus('success')
        // Clear the flow marker so refreshes don't mis-route.
        try { sessionStorage.removeItem('checkout_kind') } catch {}

        // If this was a renewal flow, keep user on this screen (desktop app will unlock via socket).
        if (checkoutKind !== 'renewal') {
          setTimeout(() => navigate('/download'), 1200)
        }
      } catch (err) {
        setStatus('error')
        setError(err.message || 'Unable to verify payment.')
      }
    }

    run()
  }, [reference, navigate])

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
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

          {status === 'verifying' && (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Confirming your payment…</h1>
              <p className="text-gray-400 text-xs mb-4">
                Please wait while we verify your transaction with Paystack.
              </p>
              <div className="flex items-center justify-center">
                <svg className="w-6 h-6 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </>
          )}

          {status === 'success' && (
            <>
              {checkoutKind === 'renewal' ? (
                <>
                  <h1 className="text-xl font-bold text-white mb-2">Account upgraded ✅</h1>
                  <p className="text-gray-400 text-xs mb-4">
                    Your subscription is active. You can return to the DesktopHab app — it will unlock automatically.
                  </p>
                  <Link
                    to="/"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-white"
                  >
                    Back to site
                  </Link>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-white mb-2">Payment verified ✅</h1>
                  <p className="text-gray-400 text-xs">
                    Your free trial is active. Redirecting you to the download page…
                  </p>
                </>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-xl font-bold text-white mb-2">Payment issue</h1>
              <p className="text-red-300 text-xs mb-4">{error}</p>
              <Link
                to="/payment"
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-white"
              >
                Try payment again
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

