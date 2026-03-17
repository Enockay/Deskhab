import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import visaLogo from '../assets/visa.svg'
import mcLogo from '../assets/mc.svg'
import amexLogo from '../assets/amex.svg'
import discLogo from '../assets/disc.svg'
import StepHeader from '../components/StepHeader'
import { subscriptionApi } from '../lib/api'

/* ── helpers ──────────────────────────────────────────────── */
const formatCard = (v) =>
  v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()

const formatExpiry = (v) =>
  v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')

const formatCVC = (v) => v.replace(/\D/g, '').slice(0, 4)

const InputField = ({ label, id, placeholder, value, onChange, error, maxLength, inputMode }) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-[11px] font-medium text-gray-300 tracking-wide">{label}</label>
    <input
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      maxLength={maxLength}
      inputMode={inputMode || 'text'}
      className={`w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border text-white placeholder-gray-500 text-[13px]
                  focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-[0_0_0_1px_rgba(15,23,42,0.9)]
                  ${error
                    ? 'border-red-500/70 bg-red-500/5'
                    : 'border-white/10 hover:border-white/25 focus:border-emerald-500/70 hover:bg-white/[0.05]'}`}
    />
    {error && <p className="text-[11px] text-red-400">{error}</p>}
  </div>
)

const CardBrand = ({ number }) => {
  const n = number.replace(/\s/g, '')
  if (n.startsWith('4'))
    return <span className="text-blue-400 text-xs font-bold tracking-wider">VISA</span>
  if (n.startsWith('5') || n.startsWith('2'))
    return <span className="text-orange-400 text-xs font-bold">MC</span>
  if (n.startsWith('3'))
    return <span className="text-blue-300 text-xs font-bold">AMEX</span>
  return null
}

const plans = {
  pro: { name: 'Pro', price: 1, period: 'mo', billed: '$1.00/mo' },
}

/* ── component ─────────────────────────────────────────────── */
export default function PaymentProcessing() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') || ''
  const plan = plans['pro'] // default; swap with useSearchParams in production

  const [form, setForm] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    country: 'US',
    zip: '',
  })
  const [errors, setErrors] = useState({})
  const [step, setStep] = useState('form') // 'form' | 'processing' | 'success'
  const [formError, setFormError] = useState('')

  const set = (field, formatter) => (e) =>
    setForm((prev) => ({ ...prev, [field]: formatter ? formatter(e.target.value) : e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.cardName.trim()) errs.cardName = 'Name on card is required'
    if (form.cardNumber.replace(/\s/g, '').length < 16) errs.cardNumber = 'Enter a valid 16-digit card number'
    if (form.expiry.length < 5) errs.expiry = 'Enter a valid expiry date'
    if (form.cvc.length < 3) errs.cvc = 'Enter a valid CVC'
    if (!form.zip.trim()) errs.zip = 'Billing ZIP / postal code is required'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setFormError('')
    setStep('processing')
    try {
      if (!email) {
        throw new Error('Missing email. Please restart the signup flow.')
      }
      const res = await subscriptionApi.startTrial({ email })
      if (res?.checkout_url) {
        window.location.href = res.checkout_url
        return
      }
      setStep('success')
    } catch (err) {
      setFormError(err.message || 'Something went wrong starting your trial.')
      setStep('form')
    }
  }

  /* ── success screen ── */
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/40
                          flex items-center justify-center">
            <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3">Free trial started!</h1>
          <p className="text-gray-400 mb-8">
            Your card is saved securely. You won&apos;t be charged today — your{' '}
            <span className="text-white font-semibold">5-day free trial</span> is now active.
          </p>
          <Link
            to="/download"
            className="inline-block px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400
                       text-white font-semibold shadow shadow-emerald-500/25 transition-all"
          >
            Continue to downloads →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px]
                        rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <rect x="2" y="5" width="18" height="12" rx="2" stroke="white" strokeWidth="1.8" fill="none"/>
              <rect x="5" y="8" width="4" height="3" rx="0.5" fill="white" opacity="0.9"/>
              <rect x="10" y="8" width="7" height="1.5" rx="0.5" fill="white" opacity="0.6"/>
              <rect x="10" y="11" width="5" height="1.5" rx="0.5" fill="white" opacity="0.6"/>
            </svg>
          </div>
          <span className="text-xl font-bold">
            <span className="text-white">Desktop</span>
            <span className="text-emerald-400">Hab</span>
          </span>
        </Link>

        <StepHeader current={2} />

        {/* Trial summary card */}
        <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 mb-5">
          {/* Top row */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] text-emerald-400 font-semibold uppercase tracking-widest">
              SmartCalender trial
            </p>
            <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-medium px-2.5 py-1 rounded-full border border-emerald-500/30">
              5-day free trial
            </span>
          </div>

          {/* Price row */}
          <div className="flex items-end justify-between mb-3">
            <p className="text-white font-extrabold text-2xl tracking-tight">$0.00 <span className="text-base font-semibold text-gray-400">today</span></p>
            <p className="text-right text-sm text-gray-300">
              then <span className="text-white font-semibold">$1.00</span><span className="text-gray-500">/mo</span>
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-emerald-500/15 mb-3" />

          {/* Footer row */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-gray-500 text-[11px]">
              Cancel before day&nbsp;5 and you won&apos;t be charged.
            </p>
            <div className="shrink-0 flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium">
              <svg className="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11H9v4l3.25 1.95.75-1.23-2-1.2V7z" clipRule="evenodd"/>
              </svg>
              Charged $1.00 on day 5
            </div>
          </div>
        </div>

        {/* Payment card */}
        <div className="rounded-3xl border border-white/8 shadow-[0_18px_45px_rgba(0,0,0,0.65)] p-8 sm:p-9
                        bg-gradient-to-b from-[#191c26] via-[#151821] to-[#101219]">
          <h1 className="text-[22px] font-semibold text-white mb-1.5 tracking-tight">Add payment details</h1>
          <p className="text-gray-400 text-sm mb-7 leading-relaxed">
            Secured with 256-bit SSL encryption. You&apos;ll only be charged after your free trial.{' '}
            <Link to="/create-account" className="text-emerald-400 hover:text-emerald-300 transition-colors">
              ← Change plan
            </Link>
          </p>

          {/* Accepted cards */}
          <div className="flex items-center gap-3 mb-6">
            {[
              { label: 'VISA', src: visaLogo },
              { label: 'MC', src: mcLogo },
              { label: 'AMEX', src: amexLogo },
              { label: 'DISC', src: discLogo },
            ].map(({ label, src }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 flex items-center justify-center"
              >
                <img src={src} alt={label} className="h-8 w-auto" />
              </div>
            ))}
            <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
              </svg>
              SSL secured
            </div>
          </div>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <InputField label="Name on card" id="cardName" placeholder="Jane Doe"
              value={form.cardName} onChange={set('cardName')} error={errors.cardName} />

            {/* Card number */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cardNumber" className="text-[11px] font-medium text-gray-300 tracking-wide">Card number</label>
              <div className="relative">
                <input id="cardNumber" placeholder="1234 5678 9012 3456"
                  value={form.cardNumber} onChange={set('cardNumber', formatCard)}
                  inputMode="numeric" maxLength={19}
                  className={`w-full px-3.5 py-2.5 pr-14 rounded-2xl bg-white/[0.03] border text-white placeholder-gray-500
                              text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all
                              shadow-[0_0_0_1px_rgba(15,23,42,0.9)]
                              ${errors.cardNumber
                                ? 'border-red-500/70 bg-red-500/5'
                                : 'border-white/10 hover:border-white/25 focus:border-emerald-500/70 hover:bg-white/[0.05]'}`}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  <CardBrand number={form.cardNumber} />
                </span>
              </div>
              {errors.cardNumber && <p className="text-xs text-red-400">{errors.cardNumber}</p>}
            </div>

            {/* Expiry + CVC */}
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Expiry date" id="expiry" placeholder="MM / YY"
                value={form.expiry} onChange={set('expiry', formatExpiry)}
                error={errors.expiry} inputMode="numeric" maxLength={5} />
              <InputField label="CVC" id="cvc" placeholder="123"
                value={form.cvc} onChange={set('cvc', formatCVC)}
                error={errors.cvc} inputMode="numeric" maxLength={4} />
            </div>

            {/* Country + ZIP */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="country" className="text-[11px] font-medium text-gray-300 tracking-wide">Country</label>
                <select id="country" value={form.country}
                  onChange={set('country')}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/25
                             focus:border-emerald-500/70 text-white text-[13px] focus:outline-none focus:ring-2
                             focus:ring-emerald-500/50 transition-all appearance-none shadow-[0_0_0_1px_rgba(15,23,42,0.9)]">
                  <option value="US">🇺🇸 United States</option>
                  <option value="GB">🇬🇧 United Kingdom</option>
                  <option value="CA">🇨🇦 Canada</option>
                  <option value="AU">🇦🇺 Australia</option>
                  <option value="DE">🇩🇪 Germany</option>
                  <option value="KE">🇰🇪 Kenya</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <InputField label="ZIP / Postal code" id="zip" placeholder="10001"
                value={form.zip} onChange={set('zip')} error={errors.zip} />
            </div>

            {/* Processing state */}
            {step === 'processing' && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <svg className="w-5 h-5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                <span className="text-sm text-emerald-300 font-medium">Processing payment…</span>
              </div>
            )}

            <button
              type="submit"
              disabled={step === 'processing'}
              className="mt-3 w-full py-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400
                         hover:from-emerald-400 hover:to-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed
                         text-white font-semibold text-sm tracking-tight shadow-[0_14px_35px_rgba(16,185,129,0.45)]
                         transition-all flex items-center justify-center gap-2 hover:shadow-[0_18px_45px_rgba(16,185,129,0.55)]
                         focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-offset-2 focus:ring-offset-[#101219]"
            >
              {step === 'processing'
                ? 'Processing…'
                : 'Start free trial — $0.00 today'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-5">
            By paying you agree to our{' '}
            <Link to="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>.
            Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  )
}
