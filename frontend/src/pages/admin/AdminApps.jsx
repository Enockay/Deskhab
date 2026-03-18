import React, { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'
import { appsApi } from '../../lib/api'

export default function AdminApps() {
  const [appsState, setAppsState] = useState([])
  const [appsLoading, setAppsLoading] = useState(false)
  const [appsError, setAppsError] = useState('')
  const [latestLoading, setLatestLoading] = useState(false)
  const [latestError, setLatestError] = useState('')
  const [latestByAppId, setLatestByAppId] = useState({})

  const [nameDrafts, setNameDrafts] = useState({})

  const platforms = ['macos', 'windows', 'linux']

  async function loadApps() {
    setAppsLoading(true)
    setAppsError('')
    try {
      const res = await adminApi.listApps()
      setAppsState(res)
    } catch (e) {
      setAppsError(e?.message ? String(e.message) : 'Failed to load apps')
    } finally {
      setAppsLoading(false)
    }
  }

  useEffect(() => {
    loadApps()
  }, [])

  useEffect(() => {
    const run = async () => {
      if (!appsState.length) return

      setLatestLoading(true)
      setLatestError('')
      try {
        const latestEntries = await Promise.all(
          appsState.map(async (app) => {
            const entry = {}
            await Promise.all(
              platforms.map(async (platform) => {
                try {
                  const latest = await appsApi.getLatestReleaseArtifact({
                    appSlug: app.slug,
                    platform,
                    channel: 'stable',
                  })
                  entry[platform] = latest?.artifact || null
                } catch {
                  entry[platform] = null
                }
              })
            )
            return [app.id, entry]
          })
        )

        const map = {}
        for (const [appId, entry] of latestEntries) {
          map[appId] = entry
        }
        setLatestByAppId(map)
      } catch (e) {
        setLatestError(e?.message ? String(e.message) : 'Failed to load latest releases')
      } finally {
        setLatestLoading(false)
      }
    }
    run()
  }, [appsState])

  return (
    <>
      <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <h2 className="text-lg font-extrabold">Apps / Products</h2>
        <p className="text-xs text-gray-400">
          Manage catalogue entries, pricing, and trial days. App binaries/assets can be hosted in AWS S3; reference their URLs from here.
        </p>
      </div>

      <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
        {appsError && <div className="text-xs text-red-300 mb-2">{appsError}</div>}
        {latestError && <div className="text-xs text-red-300 mb-2">{latestError}</div>}
        {appsLoading ? (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
            Loading apps…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {appsState.map((app) => (
              <div key={app.id} className="rounded-md border border-white/10 bg-black/20 p-3 space-y-2">
                <div className="text-sm font-semibold text-emerald-200">{app.name}</div>
                <div className="text-[11px] text-gray-400 font-mono break-all">{app.slug}</div>
                <div className="text-[11px] text-gray-300">
                  Price:{' '}
                  <span className="text-emerald-200 font-semibold">
                    ${Number(app.monthly_price_usd).toFixed(2)} / mo
                  </span>
                </div>
                <div className="text-[11px] text-gray-300">
                  Trial:{' '}
                  <span className="text-emerald-200 font-semibold">
                    {app.trial_days} days
                  </span>
                </div>
                <div className="text-[11px] text-gray-300">
                  Status:{' '}
                  <span className={app.is_active ? 'text-emerald-300' : 'text-red-300'}>
                    {app.is_active ? 'active' : 'inactive'}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 mt-1 space-y-2">
                  <div className="text-[11px] text-gray-300 font-semibold">Edit name</div>
                  <input
                    value={nameDrafts[app.id] ?? app.name}
                    onChange={(e) => setNameDrafts((p) => ({ ...p, [app.id]: e.target.value }))}
                    disabled={appsLoading || latestLoading}
                    className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-1.5 text-[11px] text-white outline-none focus:border-emerald-400/60"
                  />
                  <button
                    onClick={async () => {
                      const nextName = (nameDrafts[app.id] ?? app.name).trim()
                      if (!nextName) return
                      await adminApi.updateApp(app.id, { name: nextName })
                      setNameDrafts((p) => ({ ...p, [app.id]: nextName }))
                      await loadApps()
                    }}
                    className="w-full rounded-md border border-white/10 hover:bg-white/5 text-white text-[11px] font-semibold py-1.5 transition-colors"
                  >
                    Save name
                  </button>
                </div>

                <div className="pt-2 border-t border-white/10 mt-1 space-y-1">
                  <div className="text-[11px] text-gray-300 font-semibold">
                    Download links (stable)
                    {latestLoading && <span className="text-gray-400 font-normal">…</span>}
                  </div>
                  {platforms.map((platform) => {
                    const url = latestByAppId?.[app.id]?.[platform]?.url
                    return (
                      <div key={platform} className="text-[11px] text-gray-400 flex items-center justify-between gap-2">
                        <span className="capitalize">{platform}:</span>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-300 hover:underline truncate"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="pt-2 border-t border-white/10 mt-1 space-y-1">
                  <button
                    onClick={async () => {
                      await adminApi.updateApp(app.id, { is_active: !app.is_active })
                      await loadApps()
                    }}
                    className="w-full rounded-md border border-white/10 hover:bg-white/5 text-white text-[11px] font-semibold py-1.5 transition-colors"
                  >
                    {app.is_active ? 'Deactivate app' : 'Activate app'}
                  </button>
                  <button
                    onClick={async () => {
                      const nextTrial = app.trial_days + 1
                      await adminApi.updateApp(app.id, { trial_days: nextTrial })
                      await loadApps()
                    }}
                    className="w-full rounded-md border border-white/10 hover:bg-white/5 text-white text-[11px] font-semibold py-1.5 transition-colors"
                  >
                    +1 trial day
                  </button>
                </div>
              </div>
            ))}
            {!appsState.length && !appsLoading && (
              <div className="text-[11px] text-gray-500">No apps configured yet.</div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

