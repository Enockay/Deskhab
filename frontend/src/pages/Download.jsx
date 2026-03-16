import { Link } from 'react-router-dom'
import StepHeader from '../components/StepHeader'

export default function Download() {
  const platforms = [
    { label: 'macOS', tag: 'DMG', badge: 'Recommended', href: '#' },
    { label: 'Windows', tag: 'EXE', badge: 'Most popular', href: '#' },
    { label: 'Linux', tag: 'AppImage', badge: 'For power users', href: '#' },
  ]

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
      <div className="relative w-full max-w-3xl">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 -top-10 h-64 bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="mb-10">
          <StepHeader current={3} className="max-w-xs" />
        </div>

        <div className="rounded-3xl border border-white/8 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] px-6 py-10 sm:px-10 sm:py-12 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-tight">
              You&apos;re all set. Download DesktopHab.
            </h1>
            <p className="text-gray-400 text-sm sm:text-base max-w-2xl mx-auto">
              Your 5-day free trial is active. Choose your platform below to download the SmartCalender app,
              then sign in with the account you just created.
            </p>
          </div>

          {/* Platform cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {platforms.map(({ label, href, tag, badge }) => (
              <a
                key={label}
                href={href}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]
                           px-5 py-5 flex flex-col items-center justify-between gap-2
                           hover:border-emerald-400/80 hover:bg-emerald-500/5 transition-all duration-200"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-radial-at-t from-emerald-500/20 via-transparent to-transparent transition-opacity" />

                <div className="relative flex flex-col items-center gap-2">
                  <span className="inline-flex items-center gap-2 text-white font-semibold text-base">
                    {label}
                  </span>
                  <span className="text-[11px] text-gray-400 uppercase tracking-[0.16em]">{tag}</span>
                  <span className="mt-2 inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
                    {badge}
                  </span>
                </div>
              </a>
            ))}
          </div>

          {/* Trial + next steps */}
          <div className="flex flex-col items-center gap-3 text-center text-xs text-gray-400 mb-6">
            <p>
              Don&apos;t worry — you won&apos;t be charged today. We&apos;ll email you a reminder before your 5-day trial ends.
            </p>
            <p className="text-[11px] text-gray-500">
              Next step: install DesktopHab, open the app, and sign in with the email you just used to create your account.
            </p>
          </div>

          <div className="flex justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full border border-white/15 text-sm font-semibold text-white
                         hover:bg-white/10 hover:border-white/40 transition-colors"
            >
              Back to site
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

