import { useEffect, useRef, useState } from 'react'
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
  const GOOGLE_CLIENT_ID =
    import.meta.env.VITE_GOOGLE_CLIENT_ID ||
    import.meta.env.VITE_CLIENT_ID ||
    ''
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
  const [googleReady, setGoogleReady] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [googleCredential, setGoogleCredential] = useState('')
  const [googleProfile, setGoogleProfile] = useState(null)
  const [googlePassword, setGooglePassword] = useState('')
  const [googleConfirmPassword, setGoogleConfirmPassword] = useState('')
  const [showGooglePassword, setShowGooglePassword] = useState(false)
  const [googleError, setGoogleError] = useState('')
  const [googleInitError, setGoogleInitError] = useState('')
  const [googleRetrySeed, setGoogleRetrySeed] = useState(0)
  const googleBtnRef = useRef(null)
  const googlePasswordsMatch =
    googleConfirmPassword.length > 0 &&
    googlePassword.length > 0 &&
    googlePassword === googleConfirmPassword
  const googlePasswordsMismatch =
    googleConfirmPassword.length > 0 &&
    googlePassword.length > 0 &&
    googlePassword !== googleConfirmPassword
  const passwordsMatch =
    form.confirmPassword.length > 0 && form.password.length > 0 && form.password === form.confirmPassword
  const passwordsMismatch =
    form.confirmPassword.length > 0 && form.password.length > 0 && form.password !== form.confirmPassword

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const decodeGoogleCredential = (credential) => {
    try {
      const middle = credential.split('.')[1]
      if (!middle) return null
      const normalized = middle.replace(/-/g, '+').replace(/_/g, '/')
      const json = atob(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '='))
      return JSON.parse(json)
    } catch {
      return null
    }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    let cancelled = false
    const scriptId = 'google-identity-services'
    const existing = document.getElementById(scriptId)
    const script = existing || document.createElement('script')

    const initGoogle = () => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return
      try {
        setGoogleInitError('')
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            const profile = decodeGoogleCredential(response?.credential || '')
            if (!response?.credential || !profile?.email) {
              setGoogleError('Google sign-in failed. Please try again.')
              return
            }
            setGoogleError('')
            setGoogleCredential(response.credential)
            setGoogleProfile({
              email: profile.email,
              name: profile.name || profile.given_name || '',
            })
          },
        })
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width: 320,
        })
        // If GIS doesn't inject the button, avoid infinite loading state.
        setTimeout(() => {
          if (!cancelled && googleBtnRef.current && googleBtnRef.current.childElementCount === 0) {
            setGoogleInitError('Google sign-in could not be rendered. Please retry.')
            setGoogleReady(false)
          } else if (!cancelled) {
            setGoogleReady(true)
          }
        }, 700)
      } catch {
        setGoogleInitError('Google sign-in initialization failed. Please retry.')
        setGoogleReady(false)
      }
    }

    if (!existing) {
      script.id = scriptId
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogle
      document.head.appendChild(script)
    } else {
      initGoogle()
    }

    // Hard timeout to prevent endless "Loading Google sign-in..." UI.
    const timeoutId = setTimeout(() => {
      if (!cancelled && !googleReady && !googleCredential) {
        setGoogleInitError('Google sign-in is taking too long. Please retry.')
      }
    }, 6000)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [GOOGLE_CLIENT_ID, googleRetrySeed])

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

  const handleGooglePasswordSubmit = async (e) => {
    e.preventDefault()
    if (googlePassword.length < 8) {
      setGoogleError('Password must be at least 8 characters.')
      return
    }
    if (googlePassword !== googleConfirmPassword) {
      setGoogleError('Passwords do not match.')
      return
    }

    setGoogleError('')
    setGoogleLoading(true)
    try {
      await authApi.googleSetPassword({
        id_token: googleCredential,
        password: googlePassword,
        name: googleProfile?.name || undefined,
      })
      try { sessionStorage.setItem('download_flow_kind', 'trial') } catch {}
      navigate('/download')
    } catch (err) {
      setGoogleError(err.message || 'Could not finish Google sign-up.')
    } finally {
      setGoogleLoading(false)
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
            <span className="text-white">Desk</span>
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
                <span>— 5-day free trial, then $2/month.</span>
              </div>
            </div>
          )}

          <h1 className="text-xl font-bold mb-1">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-200 to-sky-300">
              Create your account
            </span>
          </h1>
          <p className="text-xs mb-6">
            <span className="text-cyan-200/90">Log in</span>{' '}
            <span className="text-gray-400">to the app with your email account.</span>
          </p>

          {!googleCredential && (
            <p className="text-xs text-emerald-300/90 mb-6 text-center tracking-wide">Sign up with email</p>
          )}

          <div className="mb-5">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-[0.12em]">
                <span className="bg-[#16181f] px-3 text-gray-400">or continue with Google</span>
              </div>
            </div>

            {!GOOGLE_CLIENT_ID && (
              <div className="text-center text-[11px] text-amber-300/90 border border-amber-500/30 bg-amber-500/10 rounded-xl px-3 py-2">
                Google sign-in is not configured. Add <code>VITE_GOOGLE_CLIENT_ID</code> (or <code>VITE_CLIENT_ID</code>) in frontend <code>.env</code> and restart Vite.
              </div>
            )}

            {GOOGLE_CLIENT_ID && !googleCredential && (
              <>
                <div className="flex justify-center min-h-[44px]" ref={googleBtnRef} />
                {!googleReady && !googleInitError && (
                  <p className="mt-2 text-center text-[11px] text-gray-500">Loading Google sign-in…</p>
                )}
                {googleInitError && (
                  <div className="mt-3 text-center space-y-2">
                    <p className="text-[11px] text-amber-300/90">{googleInitError}</p>
                    <p className="text-[11px] text-gray-500">
                      If you see &quot;origin is not allowed&quot;, add your frontend URL to Google OAuth
                      Authorized JavaScript origins (for example: http://localhost:5173).
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setGoogleInitError('')
                        setGoogleReady(false)
                        setGoogleRetrySeed((n) => n + 1)
                      }}
                      className="px-3 py-1.5 rounded-lg border border-white/20 text-[11px] text-white hover:bg-white/10 transition-colors"
                    >
                      Retry Google sign-in
                    </button>
                  </div>
                )}
              </>
            )}

            {GOOGLE_CLIENT_ID && googleCredential && (
              <form onSubmit={handleGooglePasswordSubmit} className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                <p className="text-xs text-emerald-200 font-semibold">
                  Google account confirmed: <span className="text-white">{googleProfile?.email}</span>
                </p>
                <p className="text-[11px] text-gray-300">
                  Set your Deskhab login password for the desktop app.
                </p>

                <div className="flex flex-col gap-1">
                  <label htmlFor="googlePassword" className="text-xs font-medium text-gray-300">Create password</label>
                  <div className="relative">
                    <input
                      id="googlePassword"
                      type={showGooglePassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={googlePassword}
                      onChange={(e) => setGooglePassword(e.target.value)}
                      autoComplete="new-password"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-white/6 border border-white/12 text-white placeholder-gray-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <button type="button" onClick={() => setShowGooglePassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                      {showGooglePassword
                        ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <InputField
                  label="Confirm password"
                  id="googleConfirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={googleConfirmPassword}
                  onChange={(e) => setGoogleConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {googlePasswordsMatch && (
                  <p className="text-[11px] text-emerald-300 -mt-2">Passwords match.</p>
                )}
                {googlePasswordsMismatch && (
                  <p className="text-[11px] text-red-400 -mt-2">Passwords do not match.</p>
                )}

                {googleError && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
                    {googleError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={googleLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-xs transition-all"
                >
                  {googleLoading ? 'Finalizing…' : 'Continue with Google'}
                </button>
              </form>
            )}
          </div>

          {!googleCredential && (
            <>
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
                  <p className="text-[11px] text-gray-500">
                    Keep this password. You will use it to log in to the app.
                  </p>
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
                {passwordsMatch && (
                  <p className="text-[11px] text-emerald-300 -mt-2">Passwords match.</p>
                )}
                {passwordsMismatch && (
                  <p className="text-[11px] text-red-400 -mt-2">Passwords do not match.</p>
                )}

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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
