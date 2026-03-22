import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { appsApi } from '../lib/api'
import { detectPlatform } from '../lib/os'

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1.5 group">
    <span className="text-2xl sm:text-3xl font-bold tabular-nums bg-gradient-to-b from-emerald-300 to-emerald-500 bg-clip-text text-transparent">
      {value}
    </span>
    <span className="text-xs font-medium tracking-widest uppercase text-emerald-600">
      {label}
    </span>
  </div>
)

// ─── Platform Pill ────────────────────────────────────────────────────────────
const PlatformPill = ({ icon, text, href, loading, isRecommended }) => {
  const disabled = loading || !href
  return (
    <a
      href={disabled ? '#' : href}
      onClick={e => { if (disabled) e.preventDefault() }}
      className={`
        group relative flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium
        border transition-all duration-300
        ${isRecommended
          ? 'border-emerald-400/60 bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-100 shadow-[0_0_28px_rgba(16,185,129,0.2)]'
          : 'border-white/10 bg-white/[0.04] text-slate-400 hover:border-emerald-400/40 hover:text-slate-200 hover:bg-white/[0.07]'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5'}
      `}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{text}</span>
      {isRecommended && (
        <span className="ml-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide
                         border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
          For you
        </span>
      )}
    </a>
  )
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
const TabButton = ({ tab, active, onClick }) => (
  <button
    type="button"
    onClick={() => onClick(tab.id)}
    className={`
      relative px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200
      ${active
        ? 'text-slate-900 bg-white shadow-md shadow-black/30'
        : 'text-slate-400 border border-white/[0.08] hover:border-white/25 hover:text-slate-200'}
    `}
  >
    {tab.label}
  </button>
)

// ─── OS Icons ────────────────────────────────────────────────────────────────
const MacIcon = () => (
  <svg className="w-[15px] h-[15px]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.2 1.3-2.18 3.88.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.35 2.6M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
)
const WinIcon = () => (
  <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
  </svg>
)
const LinuxIcon = () => (
  <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.504 0c-.155 0-.315.008-.48.021-4.226.333-3.105 4.807-3.17 6.298-.076 1.092-.3 1.953-1.05 3.02-.885 1.051-2.127 2.75-2.716 4.521-.278.832-.41 1.684-.287 2.489a.424.424 0 00-.11.135c-.26.268-.45.6-.663.839-.199.199-.485.267-.797.4-.313.136-.658.269-.864.68-.09.189-.136.394-.132.602 0 .199.027.4.055.697.028.346.066.743.019 1.202-.015.15.newer.29.157.382.203.228.62.221.911.026.386-.26.536-.554.565-.785.174.037.369.078.591.078.29 0 .6-.076.8-.338.8.208 1.6.208 2.4.208 1.6.208 2.4.208 3.2.408-.15.38-.15.75 0 .95 0 .35.2.6.5.65.3.05.65-.05.85-.35.2-.3.05-.75-.15-.95-.2-.2-.35-.45-.25-.75.1-.3.4-.5.75-.5.25 0 .5.1.65.3.15.2.2.45.15.7-.05.25-.2.5-.4.65l-.3.2c-.15.1-.25.25-.3.4-.05.2 0 .4.15.5.15.15.4.2.65.1.25-.1.45-.35.5-.65.05-.3-.05-.6-.25-.8l-.2-.15c.4-.35.65-.85.65-1.4 0-.35-.1-.7-.25-1-.25-.5-.65-.85-1.1-1.05-.6-.25-1.25-.3-1.85-.15-.6.15-1.1.5-1.45 1-.35.5-.45 1.1-.3 1.65.1.35.3.65.6.9-.05.1-.05.2-.05.3 0 .35.15.7.4.9.25.25.6.35.95.3.35-.05.65-.25.85-.55.2-.3.25-.65.15-1-.1-.35-.35-.65-.7-.8l-.3-.1c.25-.35.6-.6 1-.7.4-.1.85-.05 1.2.15.35.2.6.55.7.95.1.4.05.85-.15 1.2-.2.35-.55.6-.95.7-.2.05-.35.2-.35.4 0 .2.15.4.35.4.05 0 .1 0 .15-.05.6-.15 1.1-.55 1.4-1.1.3-.55.35-1.2.15-1.8-.2-.6-.65-1.1-1.2-1.4-.55-.3-1.2-.4-1.8-.25-.6.15-1.1.55-1.45 1.1l-.5.75c-.15-.3-.2-.65-.15-1 .05-.35.2-.65.45-.9l.05-.05c.1-.1.1-.25.05-.35-.05-.1-.2-.15-.3-.1-.5.2-.95.6-1.2 1.1-.25.5-.3 1.1-.1 1.65.1.35.3.65.55.9l-.2.3c-.35.5-.5 1.1-.4 1.7.1.6.45 1.15.95 1.5.3.2.65.35 1 .4.35.05.7 0 1-.1.65-.2 1.15-.7 1.4-1.35.15-.35.2-.7.2-1.05-.05-.7-.4-1.35-.95-1.75l.15-.25c.15.05.3.05.45.05.55 0 1.05-.2 1.45-.55.4-.35.65-.85.7-1.4.05-.55-.1-1.1-.45-1.5-.35-.4-.85-.65-1.4-.7-.55-.05-1.1.1-1.5.45l-.15.15c.2-.7.15-1.45-.15-2.1-.3-.65-.85-1.15-1.5-1.4-.65-.25-1.35-.2-1.95.1-.6.3-1.05.85-1.2 1.5-.15.65 0 1.35.4 1.85l.2.25c-.5.3-.9.75-1.1 1.3-.2.55-.2 1.15 0 1.7.15.4.4.75.7 1l-.5-.1c-.6-.15-1.2-.05-1.75.25-.55.3-.95.8-1.1 1.4-.15.6-.05 1.2.3 1.7.35.5.9.8 1.5.85h.15c-.15.25-.25.55-.25.85 0 .5.2.95.55 1.3.35.35.85.5 1.35.5.5 0 .95-.2 1.3-.55.35-.35.5-.85.5-1.35-.05-.5-.25-.95-.6-1.3z"/>
  </svg>
)

const previewTabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'todolist',  label: 'Todo List' },
  { id: 'taskboard', label: 'Tasks Board' },
  { id: 'year',      label: 'Year View' },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HeroSection() {
  const [activeTab,         setActiveTab]         = useState('dashboard')
  const [autoPlatform,      setAutoPlatform]      = useState('other')
  const [downloadLinks,     setDownloadLinks]     = useState({})
  const [downloadsLoading,  setDownloadsLoading]  = useState(true)
  const [latestVersion,     setLatestVersion]     = useState('1.0')
  const [remoteImages,      setRemoteImages]      = useState({})
  const [imagesLoading,     setImagesLoading]     = useState(true)
  const [loadedImageBySrc,  setLoadedImageBySrc]  = useState({})

  const resolvedTabs = previewTabs.map(tab => ({ ...tab, img: remoteImages[tab.id] || '' }))
  const active = resolvedTabs.find(t => t.id === activeTab) ?? resolvedTabs[0]
  const activeImageLoading = !!active?.img && !loadedImageBySrc[active.img]
  const recommendedPlatform = ['macos','windows','linux'].includes(autoPlatform) ? autoPlatform : 'macos'

  useEffect(() => { setAutoPlatform(detectPlatform()) }, [])

  useEffect(() => {
    const isSignedS3Url = url => {
      if (typeof url !== 'string' || !url.trim()) return false
      try {
        const p = new URL(url), q = p.searchParams
        return q.has('X-Amz-Signature') || (q.has('AWSAccessKeyId') && q.has('Signature') && q.has('Expires'))
      } catch { return false }
    }
    const run = async () => {
      setDownloadsLoading(true)
      try {
        const keys = ['macos','windows','linux']
        const results = await Promise.all(keys.map(platform =>
          appsApi.getLatestReleaseArtifact({ appSlug: 'smartcalender', platform, channel: 'stable' })
        ))
        const next = {}, vers = {}
        for (const r of results) {
          const url = r?.artifact?.url
          vers[r.platform] = r?.version || null
          next[r.platform] = isSignedS3Url(url) ? url : null
        }
        setDownloadLinks(next)
        const v = vers[recommendedPlatform] || vers.macos || vers.windows || vers.linux
        if (v) setLatestVersion(v)
      } catch { setDownloadLinks({}) }
      finally { setDownloadsLoading(false) }
    }
    run()
  }, [])

  useEffect(() => {
    const run = async () => {
      setImagesLoading(true)
      try {
        const res = await appsApi.getAppImages({ appSlug: 'smartcalender' })
        setRemoteImages(res?.images || {})
      } catch { setRemoteImages({}) }
      finally { setImagesLoading(false) }
    }
    run()
  }, [])

  return (
    <section className="relative bg-[#070910] overflow-hidden">

      {/* ── Layered atmospheric background ─────────────────────── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Main top glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px]
                        rounded-full bg-emerald-500/[0.08] blur-[100px]" />
        {/* Side accent */}
        <div className="absolute top-1/4 -right-20 w-[500px] h-[500px]
                        rounded-full bg-teal-400/[0.05] blur-[80px]" />
        <div className="absolute top-2/3 -left-20 w-[400px] h-[400px]
                        rounded-full bg-cyan-500/[0.04] blur-[80px]" />
        {/* Fine grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Radial vignette to fade grid at edges */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, transparent 40%, #070910 100%)' }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-28 pb-24 text-center">

        {/* ── Version badge ──────────────────────────────────────── */}
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 mb-10
                        rounded-full border border-emerald-500/25 bg-emerald-500/[0.08]
                        text-emerald-300 text-xs font-semibold tracking-wide uppercase">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          SmartCalender v{latestVersion} — now available
        </div>

        {/* ── Headline ───────────────────────────────────────────── */}
        <h1 className="mx-auto max-w-7xl text-[2.8rem] sm:text-5xl lg:text-[3.6rem]
                       font-extrabold leading-[1.1] tracking-tight text-white mb-5">
          Desktop apps that{' '}
          <span className="relative inline-block">
            <span className="relative z-10 bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-400
                             bg-clip-text text-transparent">
              respect your time
            </span>
            {/* Glow under text */}
            <span className="absolute -bottom-1 left-0 right-0 h-px
                             bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
          </span>
        </h1>

        {/* ── Sub-headline ───────────────────────────────────────── */}
        <p className="mx-auto max-w-xl text-base sm:text-lg text-slate-400 leading-relaxed mb-12">
          Native productivity software for macOS, Windows & Linux.{' '}
          Start with SmartCalender —&nbsp;
          <span className="text-slate-300 font-medium">5-day free trial</span>,
          then <span className="text-slate-300 font-medium">$2/month</span>.
        </p>

        {/* ── CTAs ───────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            to="/create-account"
            className="
              group relative w-full sm:w-auto inline-flex items-center justify-center gap-2
              px-8 py-3.5 rounded-xl font-semibold text-sm text-white
              bg-gradient-to-br from-emerald-500 to-teal-600
              shadow-[0_4px_32px_rgba(16,185,129,0.35)]
              transition-all duration-200
              hover:shadow-[0_6px_40px_rgba(16,185,129,0.5)] hover:-translate-y-0.5
              active:translate-y-0
            "
          >
            {/* Shimmer overlay */}
            <span className="absolute inset-0 rounded-xl overflow-hidden">
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                               transition-transform duration-700
                               bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </span>
            <span className="relative">Get started free</span>
            <svg className="relative w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                 viewBox="0 0 20 20" fill="none">
              <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <a
            href="#pricing"
            className="
              w-full sm:w-auto inline-flex items-center justify-center gap-2
              px-8 py-3.5 rounded-xl font-semibold text-sm text-slate-300
              border border-white/[0.12] bg-white/[0.04]
              transition-all duration-200
              hover:border-white/25 hover:text-white hover:bg-white/[0.07]
            "
          >
            See pricing
          </a>
        </div>

        {/* ── Platform download pills ────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2.5 mb-16">
          <PlatformPill
            icon={<MacIcon />}
            text="Download for macOS"
            href={downloadLinks.macos}
            loading={downloadsLoading}
            isRecommended={recommendedPlatform === 'macos'}
          />
          <PlatformPill
            icon={<WinIcon />}
            text="Download for Windows"
            href={downloadLinks.windows}
            loading={downloadsLoading}
            isRecommended={recommendedPlatform === 'windows'}
          />
          <PlatformPill
            icon={<LinuxIcon />}
            text="Download for Linux"
            href={downloadLinks.linux}
            loading={downloadsLoading}
            isRecommended={recommendedPlatform === 'linux'}
          />
        </div>

        {/* ── Stats strip ────────────────────────────────────────── */}
        <div className="inline-flex flex-wrap justify-center items-center gap-8 sm:gap-12
                        px-10 sm:px-14 py-5
                        rounded-2xl border border-emerald-400/[0.15]
                        bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-emerald-950/40
                        shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_60px_rgba(0,0,0,0.5)]
                        mb-20">
          <StatCard value="5 days" label="Free trial" />
          <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent" />
          <StatCard value="$2" label="Per month" />
          <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent" />
          <StatCard value="3 OS" label="Platforms" />
          <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-emerald-400/30 to-transparent" />
          <StatCard value="1-click" label="Install" />
        </div>

        {/* ── App preview carousel ───────────────────────────────── */}
        <div className="relative mx-auto max-w-5xl">

          {/* Tab row */}
          <div className="flex flex-wrap gap-2 justify-center mb-5 relative z-10">
            {resolvedTabs.map(tab => (
              <TabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={setActiveTab} />
            ))}
          </div>

          {/* Window chrome */}
          <div className="relative rounded-[28px] overflow-hidden
                          border border-white/[0.08]
                          bg-gradient-to-b from-white/[0.06] to-white/[0.02]
                          shadow-[0_48px_120px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]
                          backdrop-blur-xl">

            {/* Window top bar */}
            <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-white/[0.06]
                            bg-white/[0.025]">
              <span className="w-3 h-3 rounded-full bg-red-400/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-400/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/70" />
              <span className="ml-auto text-[11px] text-slate-500 tracking-wide">
                SmartCalender · {resolvedTabs.find(t => t.id === activeTab)?.label}
              </span>
            </div>

            {/* Content area */}
            <div className="relative group px-6 pt-5 pb-8 md:px-10 md:pb-10">
              {/* Inner ambient glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.05] via-transparent to-cyan-500/[0.05] pointer-events-none" />

              {/* Loading state */}
              {(imagesLoading || activeImageLoading) && (
                <div className="w-full h-[300px] md:h-[420px] rounded-2xl border border-white/[0.06]
                                bg-black/20 flex items-center justify-center">
                  <span className="w-8 h-8 rounded-full border-2 border-emerald-400/60 border-t-transparent animate-spin" />
                </div>
              )}

              {/* Image */}
              {active?.img ? (
                <img
                  key={active.id}
                  src={active.img}
                  alt={active.label}
                  onLoad={() => setLoadedImageBySrc(prev => ({ ...prev, [active.img]: true }))}
                  className={`
                    relative w-full h-auto max-h-[520px] object-contain rounded-2xl
                    shadow-[0_24px_64px_rgba(0,0,0,0.8)]
                    transition-all duration-500 ease-out
                    group-hover:scale-[1.015] group-hover:-translate-y-0.5
                    ${imagesLoading || activeImageLoading ? 'hidden' : 'block'}
                  `}
                />
              ) : (
                !imagesLoading && (
                  <div className="w-full h-[300px] md:h-[420px] rounded-2xl
                                  border border-dashed border-white/10 bg-black/15
                                  flex items-center justify-center text-sm text-slate-500">
                    No preview available
                  </div>
                )
              )}
            </div>

            {/* Bottom glow leak */}
            <div className="pointer-events-none absolute -bottom-24 left-1/2 -translate-x-1/2
                            w-3/4 h-32 bg-emerald-500/20 blur-3xl opacity-60 rounded-full" />
          </div>

          {/* Outer glow ring */}
          <div className="pointer-events-none absolute -inset-px rounded-[30px]"
               style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(52,211,153,0.08), transparent 70%)' }} />
        </div>

      </div>
    </section>
  )
}