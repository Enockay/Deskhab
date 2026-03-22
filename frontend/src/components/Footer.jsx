import { Link, useNavigate, useLocation } from 'react-router-dom'

// ─── Logo ─────────────────────────────────────────────────────────────────────
const Logo = () => (
  <Link to="/" className="inline-flex items-center gap-2.5 no-underline" aria-label="DeskHab Home">
    <img
      src="/deskhablogo.png"
      alt="DeskHab"
      className="h-9 w-auto object-contain"
      loading="eager"
      decoding="async"
    />
    <span className="text-xl font-bold italic tracking-tight bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent">
      Deskhab
    </span>
  </Link>
)

// ─── Data ─────────────────────────────────────────────────────────────────────
const footerLinks = {
  Product: [
    { label: 'Features',     to: '/features' },
    { label: 'Pricing',      to: '/pricing'  },
    { label: 'How it works', section: 'how-it-works' },
  ],
  Company: [
    { label: 'About',      to: '/about' },
    { label: 'Contact us', to: '/about' },
  ],
  Legal: [
    { label: 'Privacy policy',   to: '/privacy'  },
    { label: 'Terms of service', to: '/terms'    },
    { label: 'Cookie policy',    to: '/cookies'  },
    { label: 'Security',         to: '/security' },
  ],
}

const socialLinks = [
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@deskhab',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.76h-3.09v13.23a2.73 2.73 0 1 1-1.88-2.6V9.42a5.82 5.82 0 1 0 5.06 5.75V8.77a7.88 7.88 0 0 0 4.68 1.54V6.69z" />
      </svg>
    ),
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/deskhab',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2zm0 1.9A3.85 3.85 0 0 0 3.9 7.75v8.5a3.85 3.85 0 0 0 3.85 3.85h8.5a3.85 3.85 0 0 0 3.85-3.85v-8.5a3.85 3.85 0 0 0-3.85-3.85h-8.5zm8.95 1.45a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3zM12 7a5 5 0 1 1 0 10A5 5 0 0 1 12 7zm0 1.9a3.1 3.1 0 1 0 0 6.2 3.1 3.1 0 0 0 0-6.2z" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/deskhab',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13.5 22v-8h2.6l.4-3h-3V9.1c0-.86.25-1.45 1.48-1.45h1.58V5a21.6 21.6 0 0 0-2.3-.12c-2.28 0-3.84 1.39-3.84 3.94V11H8v3h2.42v8h3.08z" />
      </svg>
    ),
  },
  {
    label: 'X / Twitter',
    href: 'https://x.com/deskhab',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
        <path d="M3 3l18 18M21 3L3 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
]

// ─── Nav Link ─────────────────────────────────────────────────────────────────
function NavLink({ label, to, section, onScroll }) {
  const base = 'group inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-100 transition-colors duration-150'

  const inner = (
    <>
      <span className="block w-0 h-px bg-emerald-400 transition-all duration-200 group-hover:w-2.5 rounded-full" />
      {label}
    </>
  )

  if (to && (to.startsWith('http') || to.startsWith('mailto'))) {
    return (
      <a href={to} target={to.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={base}>
        {inner}
      </a>
    )
  }
  if (to) return <Link to={to} className={base}>{inner}</Link>
  if (section) {
    return (
      <button
        type="button"
        onClick={() => onScroll(section)}
        className={`${base} text-left bg-transparent border-0 p-0 cursor-pointer font-[inherit]`}
      >
        {inner}
      </button>
    )
  }
  return <span className="text-sm text-slate-600">{label}</span>
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Footer() {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome   = location.pathname === '/'

  const scrollToSection = (section) => {
    const go = () => {
      if (section === 'top') { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    if (!isHome) { navigate('/'); setTimeout(go, 50) }
    else go()
  }

  const linkSections = Object.entries(footerLinks).filter(([, links]) => links.length > 0)

  return (
    <footer className="relative bg-[#080a0e] border-t border-white/[0.07] overflow-hidden">

      {/* Glow orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[380px]"
        style={{ background: 'radial-gradient(ellipse at center, rgba(52,211,153,0.07) 0%, transparent 70%)' }}
      />

      <div className="relative max-w-[1200px] mx-auto px-6 sm:px-8 lg:px-10 pt-16 pb-10">

        {/* ── Newsletter strip ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl border border-emerald-500/[0.14] bg-gradient-to-br from-[#0f1a14] to-[#0d1219] px-8 sm:px-10 py-9 mb-14">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-emerald-400 mb-2">
              Stay in the loop
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-slate-100 leading-snug max-w-xs m-0">
              Product updates, delivered quietly.
            </h2>
          </div>

          <form className="flex flex-wrap gap-2.5" onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              placeholder="your@email.com"
              aria-label="Email address"
              className="
                w-56 rounded-xl border border-white/[0.12] bg-white/[0.04]
                px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600
                outline-none transition
                focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10
              "
            />
            <button
              type="submit"
              className="
                group inline-flex items-center gap-2 rounded-xl bg-emerald-400
                px-5 py-2.5 text-sm font-semibold text-emerald-950 whitespace-nowrap
                transition duration-150
                hover:bg-emerald-300 hover:-translate-y-px hover:shadow-[0_6px_24px_rgba(52,211,153,0.28)]
                active:translate-y-0
              "
            >
              Subscribe
              <svg
                className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden
              >
                <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>

        {/* ── Fading divider ────────────────────────────────────────── */}
        <div
          className="h-px mb-14"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10) 30%, rgba(255,255,255,0.10) 70%, transparent)' }}
        />

        {/* ── Main grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1fr] gap-10 mb-14">

          {/* Brand col */}
          <div className="sm:col-span-2 lg:col-span-1 max-w-xs">
            <Logo />
            <p className="mt-4 text-[13.5px] leading-relaxed text-slate-400">
              A growing suite of focused desktop apps that help teams plan smarter,
              ship faster, and stay in sync — on macOS, Windows, and Linux.
            </p>

            {/* Socials */}
            <div className="flex items-center gap-2.5 mt-7">
              {socialLinks.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="
                    flex items-center justify-center w-9 h-9 rounded-[9px]
                    border border-white/[0.08] text-slate-500
                    transition duration-200
                    hover:text-emerald-400 hover:border-emerald-500/40
                    hover:bg-emerald-500/[0.06] hover:-translate-y-0.5
                  "
                >
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Nav cols */}
          {linkSections.map(([sectionName, links]) => (
            <div key={sectionName} className="pt-1">
              {/* Heading with emerald underline accent via inline style (Tailwind arbitrary after: values) */}
              <div className="relative pb-3.5 mb-5">
                <h4 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-100 m-0">
                  {sectionName}
                </h4>
                <span className="absolute bottom-0 left-0 w-5 h-[1.5px] rounded-full bg-emerald-400" />
              </div>

              <ul className="flex flex-col gap-3 list-none p-0 m-0">
                {links.map(({ label, to, section }) => (
                  <li key={label}>
                    <NavLink label={label} to={to} section={section} onScroll={scrollToSection} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Bottom bar ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/[0.07] pt-7">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <p className="text-[12.5px] text-slate-600 m-0">
              © {new Date().getFullYear()} Deskhab, Inc. All rights reserved.
            </p>
            <p className="text-[12px] text-slate-600 m-0">
              Designed by{' '}
              <a
                href="https://www.blackie-networks.com"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 font-medium hover:text-emerald-300 transition-colors no-underline"
              >
                blackie-networks
              </a>
            </p>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[12.5px] text-slate-500">
            <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
              <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <span className="relative w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
            </span>
            All systems operational
          </div>
        </div>

      </div>
    </footer>
  )
}