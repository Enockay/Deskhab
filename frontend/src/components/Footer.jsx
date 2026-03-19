import { Link, useNavigate, useLocation } from 'react-router-dom'

const Logo = () => (
  <Link to="/" className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="18" height="12" rx="2" stroke="white" strokeWidth="1.8" fill="none"/>
        <rect x="5" y="8" width="4" height="3" rx="0.5" fill="white" opacity="0.9"/>
        <rect x="5" y="13" width="4" height="1.5" rx="0.5" fill="white" opacity="0.6"/>
        <rect x="10" y="8" width="7" height="1.5" rx="0.5" fill="white" opacity="0.6"/>
        <rect x="10" y="11" width="5" height="1.5" rx="0.5" fill="white" opacity="0.6"/>
        <rect x="10" y="13" width="3" height="1.5" rx="0.5" fill="white" opacity="0.4"/>
      </svg>
    </div>
    <span className="text-lg font-bold">
      <span className="text-white">Desktop</span>
      <span className="text-emerald-400">Hab</span>
    </span>
  </Link>
)

const footerLinks = {
  Product: [
    { label: 'Features', section: 'features' },
    { label: 'Pricing', section: 'pricing' },
    { label: 'How it works', section: 'how-it-works' },
    // Placeholder items for now – keep as plain text
    { label: 'Changelog' },
    { label: 'Roadmap' },
  ],
  Company: [
    { label: 'About (coming soon)' },
    { label: 'Blog (coming soon)' },
    { label: 'Careers (coming soon)' },
    { label: 'Press kit (coming soon)' },
  ],
  Support: [
    { label: 'Documentation (coming soon)' },
    { label: 'API reference (coming soon)' },
    { label: 'Status', to: 'https://status.deskhab.com' },
    { label: 'Contact us', to: 'mailto:support@deskhab.com' },
  ],
  Legal: [
    { label: 'Privacy policy (coming soon)' },
    { label: 'Terms of service (coming soon)' },
    { label: 'Cookie policy (coming soon)' },
    { label: 'Security (coming soon)' },
  ],
}

const socialLinks = [
  {
    label: 'Twitter / X',
    href: 'https://x.com/deskhab',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: 'https://github.com/deskhab',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483
          0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608
          1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338
          -2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65
          0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337
          1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688
          0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747
          0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com/company/deskhab',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
  },
]

export default function Footer() {
  const navigate = useNavigate()
  const location = useLocation()

  const isHome = location.pathname === '/'

  const scrollToSection = (section) => {
    if (!section) return

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
  }
  return (
    <footer className="bg-[#0d0f14] border-t border-white/8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

        {/* Top section */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 mb-14">
          {/* Brand column */}
          <div className="col-span-2">
            <Logo />
            <p className="mt-4 text-sm text-gray-400 leading-relaxed max-w-xs">
              The remote team workspace that keeps everyone in sync — without the chaos.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="w-9 h-9 rounded-lg border border-white/12 flex items-center justify-center
                             text-gray-400 hover:text-white hover:border-white/30 hover:bg-white/8 transition-all"
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {Object.entries(footerLinks).map(([section, links]) => (
            <div key={section}>
              <h4 className="text-white font-semibold text-sm mb-4">{section}</h4>
              <ul className="flex flex-col gap-2.5">
                {links.map(({ label, to, section }) => (
                  <li key={label}>
                    {to && (to.startsWith('http') || to.startsWith('mailto')) ? (
                      <a
                        href={to}
                        target={to.startsWith('http') ? '_blank' : undefined}
                        rel="noreferrer"
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {label}
                      </a>
                    ) : section ? (
                      <button
                        type="button"
                        onClick={() => scrollToSection(section)}
                        className="text-sm text-gray-400 hover:text-white transition-colors text-left"
                      >
                        {label}
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500 cursor-default">
                        {label}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} DesktopHab, Inc. All rights reserved.
            </p>
            <p className="text-xs text-gray-500">
              Designed by
           
            <a
              href="https://blackie-networks.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs  ml-1 text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              blackie-networks
            </a>
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  )
}
