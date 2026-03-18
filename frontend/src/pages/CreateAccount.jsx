import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import StepHeader from '../components/StepHeader'
import { authApi } from '../lib/api'

const InputField = ({ label, id, type = 'text', placeholder, value, onChange, error, autoComplete }) => (
  <div className="flex flex-col gap-1">
    <label htmlFor={id} className="text-xs font-medium text-gray-300">
      {label}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoComplete={autoComplete}
      className={`w-full px-3.5 py-2.5 rounded-xl bg-white/6 border text-white placeholder-gray-500
                  text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all
                  ${error ? 'border-red-500/60' : 'border-white/12 hover:border-white/24 focus:border-emerald-500/60'}`}
    />
    {error && <p className="text-xs text-red-400">{error}</p>}
  </div>
)

export default function CreateAccount() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const plan = searchParams.get('plan') || 'free'

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.fullName.trim()) errs.fullName = 'Full name is required'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errs.email = 'Enter a valid email address'
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    if (!form.agreeTerms) errs.agreeTerms = 'You must agree to the terms'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setFormError('')
    setLoading(true)
    try {
      const res = await authApi.register({
        email: form.email,
        password: form.password,
        remember_me: false,
        name: form.fullName,
      })
      // After we create the account we move into email verification step.
      navigate(`/verify-email?email=${encodeURIComponent(form.email)}${res?.code ? `&code=${res.code}` : ''}`)
    } catch (err) {
      setFormError(err.message || 'Something went wrong creating your account.')
    } finally {
    setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">

      {/* Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px]
                        rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">

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

        {/* Card */}
        <div className="bg-[#16181f] rounded-2xl border border-white/10 shadow-2xl p-6 sm:p-7">
          <StepHeader current={1} />

          {/* Plan badge */}
          {plan !== 'free' && (
            <div className="mb-5 flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-medium">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300">
                <span className="text-base leading-none">✦</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                <span>Starting your</span>
                <span className="capitalize font-bold">{plan}</span>
                <span>— first month $1, then renewals $2/month.</span>
              </div>
            </div>
          )}

          <h1 className="text-xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-gray-400 text-xs mb-6">
            Already have an account?{' '}
            <Link to="/signin" className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>

          {/* OAuth */}
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                             border border-white/12 hover:border-white/24 hover:bg-white/4
                             text-white text-sm font-medium transition-all mb-6">
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-gray-500">or with email</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {formError && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
              {formError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <InputField
              label="Full name"
              id="fullName"
              placeholder="Jane Doe"
              value={form.fullName}
              onChange={set('fullName')}
              error={errors.fullName}
              autoComplete="name"
            />
            <InputField
              label="Work email"
              id="email"
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              autoComplete="email"
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-xs font-medium text-gray-300">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                  className={`w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/6 border text-white placeholder-gray-500
                              text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all
                              ${errors.password ? 'border-red-500/60' : 'border-white/12 hover:border-white/24 focus:border-emerald-500/60'}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                  {showPassword
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
            </div>
            <InputField
              label="Confirm password"
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            {/* Terms */}
            <div className="flex flex-col gap-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={form.agreeTerms} onChange={set('agreeTerms')}
                  className="mt-0.5 w-4 h-4 accent-emerald-500 rounded" />
                <span className="text-xs text-gray-400">
                  I agree to the{' '}
                  <Link to="/terms" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-emerald-400 hover:text-emerald-300 transition-colors">
                    Privacy Policy
                  </Link>
                </span>
              </label>
              {errors.agreeTerms && <p className="text-[11px] text-red-400 ml-7">{errors.agreeTerms}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60
                         disabled:cursor-not-allowed text-white font-semibold text-xs shadow shadow-emerald-500/25
                         transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creating account…
                </>
              ) : (
                'Create my account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
