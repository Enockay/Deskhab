import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const Logo = () => (
  <Link
    to="/"
    className="flex items-center  shrink-0"
    aria-label="DeskHab Home"
  >
    <img
      src="/deskhablogo.png"
      alt="DeskHab"
      className="block h-10 sm:h-11 md:h-12 w-auto max-w-[140px] sm:max-w-[160px] md:max-w-[180px] object-contain select-none"
      loading="eager"
      decoding="async"
    />
    <span
      className="
        text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-200 to-sky-300
        font-extrabold text-xl sm:text-2xl tracking-tight leading-none hidden sm:inline
        drop-shadow-[0_0_18px_rgba(16,185,129,0.35)]
      "
    >
      Deskhab
    </span>
  </Link>
)

const navLinks = [
  { label: 'Home', section: 'top' },
  { label: 'Features', section: 'features' },
  { label: 'Pricing', section: 'pricing' },
  { label: 'How it works', section: 'how-it-works' },
]

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  const isHome = location.pathname === '/'

  const scrollToSection = (section) => {
    const performScroll = () => {
      if (section === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      const el = document.getElementById(section)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }

    if (!isHome) {
      navigate('/')
      setTimeout(performScroll, 50)
    } else {
      performScroll()
    }

    setMobileOpen(false)
    setMoreOpen(false)
  }

  return (
    <header className="w-full bg-[#111318] border-b border-white/10 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Logo />

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ label, section }) => (
              <button
                key={label}
                type="button"
                onClick={() => scrollToSection(section)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${label === 'Home' && isHome
                    ? 'text-white bg-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/8'
                  }`}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/create-account"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white border border-white/20
                         bg-white/8 hover:bg-white/14 hover:border-white/40 transition-all"
            >
              Get started free
            </Link>

            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center
                           text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/8 transition-all"
              >
                <span className="text-lg leading-none tracking-widest">···</span>
              </button>

              {moreOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#1a1d26] border border-white/10 shadow-xl overflow-hidden z-50">
                  <button
                    type="button"
                    onClick={() => scrollToSection('pricing')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    View Pricing
                  </button>
                  <Link
                    to="/create-account"
                    onClick={() => setMoreOpen(false)}
                    className="block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    Create Account
                  </Link>
                  <a
                    href="mailto:support@deskhab.com"
                    className="block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    Contact Support
                  </a>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-10 h-10 rounded-xl border border-white/20 flex flex-col items-center
                       justify-center gap-1.5 text-gray-400 hover:text-white transition-colors"
          >
            <span className={`block w-5 h-0.5 bg-current transition-all ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-current transition-all ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-current transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#111318] px-4 py-4 flex flex-col gap-2">
          {navLinks.map(({ label, section }) => (
            <button
              key={label}
              type="button"
              onClick={() => scrollToSection(section)}
              className="text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="border-t border-white/10 pt-3 mt-1 flex flex-col gap-2">
            <Link
              to="/create-account"
              onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 text-center transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}