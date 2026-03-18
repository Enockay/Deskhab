import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import StepHeader from '../components/StepHeader'
import { subscriptionApi } from '../lib/api'

export default function RenewSmartCalender() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [status, setStatus] = useState('loading') // 'loading' | 'redirecting' | 'error'
  const [error, setError] = useState('')

  useEffect(() => {
    async function run() {
      if (!token) {
        setStatus('error')
        setError('This renewal link is missing a token.')
        return
      }
      try {
        const res = await subscriptionApi.renew({ userSlug: slug, token })
        setStatus('redirecting')
        // Mark this flow so the callback page shows "Account upgraded" instead of download redirect.
        sessionStorage.setItem('checkout_kind', 'renewal')
        window.location.href = res.checkout_url
      } catch (err) {
        setStatus('error')
        setError(err.message || 'Could not start renewal.')
      }
    }
    run()
  }, [slug, token])

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-xl">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 -top-10 h-64 bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="mb-10">
          <StepHeader current={3} className="max-w-xs" />
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] px-6 py-10 sm:px-10 sm:py-12 shadow-[0_18px_45px_rgba(0,0,0,0.7)] text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-tight">
            Renew SmartCalender
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-8">
            We&apos;re getting your renewal ready. You&apos;ll be redirected to our secure payment partner to
            complete the process.
          </p>

          {status === 'loading' || status === 'redirecting' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-xs text-gray-400">
                {status === 'loading' ? 'Checking your renewal link…' : 'Redirecting you to Paystack…'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs text-red-400 mb-2">{error}</p>
              <Link
                to="/"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full border border-white/20 text-xs font-medium text-white hover:bg-white/10 hover:border-white/40 transition-colors"
              >
                Back to site
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

