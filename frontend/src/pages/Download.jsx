import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StepHeader from '../components/StepHeader'
import { detectPlatform } from '../lib/os'
import { appsApi } from '../lib/api'

const recommendedAnimStyles = `
  @keyframes borderBreath {
    0%, 100% {
      box-shadow: 0 0 0 1px rgba(16,185,129,0.55),
                  0 0 14px 2px rgba(16,185,129,0.25);
    }
    50% {
      box-shadow: 0 0 0 1.5px rgba(16,185,129,0.95),
                  0 0 30px 6px rgba(16,185,129,0.45);
    }
  }
  @keyframes shimmerSweep {
    0%   { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
  }
  @keyframes floatUp {
    0%, 100% { transform: translateY(0px); }
    50%      { transform: translateY(-5px); }
  }
  @keyframes badgePing {
    0%, 100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.55); }
    60%      { box-shadow: 0 0 0 5px rgba(52,211,153,0); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.35; }
    50%      { opacity: 0.65; }
  }
  .rec-card {
    animation: borderBreath 2.6s ease-in-out infinite, floatUp 3.4s ease-in-out infinite;
  }
  .rec-shimmer {
    animation: shimmerSweep 3s ease-in-out infinite;
    animation-delay: 0.8s;
  }
  .rec-glow {
    animation: glowPulse 2.6s ease-in-out infinite;
  }
  .rec-badge {
    animation: badgePing 2.6s ease-in-out infinite;
  }
`

function isSignedS3Url(url) {
  if (typeof url !== 'string' || !url.trim()) return false
  try {
    const parsed = new URL(url)
    const params = parsed.searchParams

    // SigV4 query auth
    const hasSigV4 = params.has('X-Amz-Signature')

    // SigV2 query auth (older style)
    const hasSigV2 =
      params.has('AWSAccessKeyId') &&
      params.has('Signature') &&
      params.has('Expires')

    return hasSigV4 || hasSigV2
  } catch {
    return false
  }
}

export default function Download() {
  const [autoPlatform, setAutoPlatform] = useState('other')
  const [releaseLinks, setReleaseLinks] = useState({}) // { macos: { url, version }, ... }
  const [releasesLoading, setReleasesLoading] = useState(true)
  const [releasesError, setReleasesError] = useState('')

  useEffect(() => {
    setAutoPlatform(detectPlatform())
  }, [])

  useEffect(() => {
    const run = async () => {
      setReleasesLoading(true)
      setReleasesError('')
      try {
        const platformKeys = ['macos', 'windows', 'linux']
        const results = await Promise.all(
          platformKeys.map((platform) =>
            appsApi.getLatestReleaseArtifact({ appSlug: 'smartcalender', platform, channel: 'stable' }),
          ),
        )

        const next = {}
        for (const r of results) {
          const url = r?.artifact?.url
          // The backend should return a presigned URL (signed). If it doesn't,
          // prevent broken redirects and show a clear error.
          const isSigned = isSignedS3Url(url)
          if (!isSigned) {
            setReleasesError('Download URLs are not signed yet. Please refresh after backend update.')
            next[r.platform] = { url: null, version: r.version }
          } else {
            next[r.platform] = { url, version: r.version }
          }
        }
        setReleaseLinks(next)
      } catch (err) {
        setReleasesError(err?.message || String(err || 'Failed to load releases'))
      } finally {
        setReleasesLoading(false)
      }
    }
    run()
  }, [])

  const platforms = [
    { key: 'macos', label: 'macOS', tag: 'DMG', badge: 'Recommended' },
    { key: 'windows', label: 'Windows', tag: 'EXE', badge: 'Most popular' },
    { key: 'linux', label: 'Linux', tag: 'AppImage', badge: 'For power users' },
  ]
  const recommendedPlatform = ['macos', 'windows', 'linux'].includes(autoPlatform) ? autoPlatform : 'macos'

  return (
    <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-4 py-16">
      <style>{recommendedAnimStyles}</style>
      <div className="relative w-full max-w-3xl">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-x-0 -top-10 h-64 bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="mb-10">
          <StepHeader current={4} className="max-w-xs" />
        </div>

        <div className="rounded-3xl border border-white/8 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] px-6 py-10 sm:px-10 sm:py-12 shadow-[0_18px_45px_rgba(0,0,0,0.7)]">
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-cyan-200 to-sky-300 drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                You&apos;re all set.
              </span>
            </h1>
            <p className="text-sm sm:text-base max-w-3xl mx-auto leading-relaxed">
              <span className="text-gray-300">
                Your subscription is active.
              </span>{' '}
              <span className="text-cyan-200/90">
                If you already have the app installed, go back and sign in.
              </span>{' '}
              <span className="text-emerald-200/90">
                If you don&apos;t have it yet, download it below.
              </span>
            </p>
          </div>

          {/* Platform cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {platforms.map(({ key, label, href, tag, badge }) => {
              const isRec = key === recommendedPlatform
              const link = releaseLinks[key]?.url
              const disabled = releasesLoading || !link
              return (
                <a
                  key={key}
                  href={link || '#'}
                  onClick={(e) => {
                    if (disabled) e.preventDefault()
                  }}
                  className={`group relative overflow-hidden rounded-2xl border bg-white/[0.02]
                             px-5 py-5 flex flex-col items-center justify-between gap-2 transition-all duration-200
                             ${isRec
                               ? 'rec-card border-emerald-400/80 bg-emerald-500/5'
                               : 'border-white/10 hover:border-emerald-400/80 hover:bg-emerald-500/5'} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {/* Always-on radial glow for recommended */}
                  {isRec && (
                    <div className="rec-glow absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.22)_0%,transparent_70%)]" />
                  )}

                  {/* Hover glow for non-recommended */}
                  {!isRec && (
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-radial-at-t from-emerald-500/20 via-transparent to-transparent transition-opacity" />
                  )}

                  {/* Shimmer sweep — recommended only */}
                  {isRec && (
                    <div className="rec-shimmer absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />
                  )}

                  <div className="relative flex flex-col items-center gap-2">
                    <span className="inline-flex items-center gap-2 text-white font-semibold text-base">
                      {label}
                    </span>
                    <span className="text-[11px] text-gray-400 uppercase tracking-[0.16em]">{tag}</span>
                    {releasesLoading && isRec && (
                      <span className="h-3 w-3 border border-emerald-400/70 border-t-transparent rounded-full animate-spin" />
                    )}
                    {!releasesLoading && link && (
                      <span className="text-[10px] text-emerald-200/80 font-semibold">
                        v{releaseLinks[key]?.version}
                      </span>
                    )}
                    <span className={`mt-2 inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200 ${isRec ? 'rec-badge' : ''}`}>
                      {badge}
                    </span>
                  </div>
                </a>
              )
            })}
          </div>

          {releasesError && (
            <div className="text-center text-xs text-red-300 mb-6">
              {releasesError}
            </div>
          )}

          {/* Trial + next steps */}
          <div className="flex flex-col items-center gap-3 text-center text-xs text-gray-400 mb-6">
            <p>
              You&apos;re good to go. First month is $1, then renewals are $2/month.
            </p>
            <p className="text-[11px] text-gray-500">
              Next step: open DesktopHab and sign in with the email you used to create your account.
              If the app is not installed yet, download your platform build above.
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

