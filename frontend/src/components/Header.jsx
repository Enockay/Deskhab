import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const Logo = () => (
  <Link to="/" className="flex items-center gap-3 shrink-0">
    {/* Icon */}
    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg">
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="18" height="12" rx="2" stroke="white" strokeWidth="1.8" fill="none"/>
        <rect x="5" y="8" width="4" height="3" rx="0.5" fill="white" opacity="0.9"/>
        <rect x="5" y="13" width="4" height="1.5" rx="0.5" fill="white" opacity="0.6"/>
        <rect x="10" y="8" width="7" height="1.5" rx="0.5" fill="white" opacity="0.6"/>
        <rect x="10" y="11" width="5" height="1.5" rx="0.5" fill="white" opacity="0.6"/>
        <rect x="10" y="13" width="3" height="1.5" rx="0.5" fill="white" opacity="0.4"/>
      </svg>
    </div>
    {/* Wordmark */}
    <span className="text-xl font-bold tracking-tight">
      <span className="text-white">Desktop</span>
      <span className="text-emerald-400">Hab</span>
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
      // allow route change to render before scrolling
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

          {/* Logo */}
          <Logo />

          {/* Desktop nav */}
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

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/create-account"
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white border border-white/20
                         bg-white/8 hover:bg-white/14 hover:border-white/40 transition-all"
            >
              Get started free
            </Link>

            {/* More (...) */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center
                           text-gray-400 hover:text-white hover:border-white/40 hover:bg-white/8 transition-all"
              >
                <span className="text-lg leading-none tracking-widest">···</span>
              </button>
              {moreOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl bg-[#1a1d26] border border-white/10
                                shadow-xl overflow-hidden z-50">
                  <button
                    type="button"
                    onClick={() => scrollToSection('pricing')}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors"
                  >
                    View Pricing
                  </button>
                  <Link to="/create-account" onClick={() => setMoreOpen(false)}
                    className="block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors">
                    Create Account
                  </Link>
                  <a href="mailto:support@deskhab.com"
                    className="block px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-white/8 transition-colors">
                    Contact Support
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
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

      {/* Mobile menu */}
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
            <Link to="/create-account" onClick={() => setMobileOpen(false)}
              className="px-4 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 text-center transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
