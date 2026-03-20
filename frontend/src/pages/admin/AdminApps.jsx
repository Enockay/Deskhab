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
  const [imagesByAppId, setImagesByAppId] = useState({})
  const [uploadingBySlot, setUploadingBySlot] = useState({})
  const [selectedAppId, setSelectedAppId] = useState('')
  const [nameDraft, setNameDraft] = useState('')
  const [createForm, setCreateForm] = useState({
    name: '',
    slug: '',
    monthly_price_usd: '2.00',
    trial_days: '5',
  })
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState('')
  const [savingName, setSavingName] = useState(false)

  const platforms = ['macos', 'windows', 'linux']
  const imageTabs = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'reminders', label: 'Reminders' },
    { key: 'todolist', label: 'Todo List' },
    { key: 'taskboard', label: 'Tasks Board' },
    { key: 'year', label: 'Year view' },
  ]

  async function loadApps() {
    setAppsLoading(true)
    setAppsError('')
    try {
      const res = await adminApi.listApps()
      setAppsState(res)
      if (res.length && !selectedAppId) {
        setSelectedAppId(res[0].id)
      }
    } catch (e) {
      setAppsError(e?.message ? String(e.message) : 'Failed to load apps')
    } finally {
      setAppsLoading(false)
    }
  }

  useEffect(() => {
    loadApps()
  }, [])

  const selectedApp = appsState.find((a) => a.id === selectedAppId) || null

  useEffect(() => {
    if (!selectedApp) return
    setNameDraft(selectedApp.name)
  }, [selectedAppId, appsState])

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

  useEffect(() => {
    const run = async () => {
      if (!appsState.length) return
      try {
        const rows = await Promise.all(
          appsState.map(async (app) => {
            try {
              const res = await adminApi.listAppImages(app.id)
              return [app.id, res?.images || {}]
            } catch {
              return [app.id, {}]
            }
          })
        )
        const next = {}
        for (const [id, images] of rows) next[id] = images
        setImagesByAppId(next)
      } catch {
        // best effort
      }
    }
    run()
  }, [appsState])

  return (
    <>
      <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <h2 className="text-lg font-extrabold">Apps / Products</h2>
        <p className="text-xs text-gray-400">
          Create apps, choose one app to manage, then upload/preview/update/delete its screenshots served via S3 presigned URLs.
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
          <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
            <div className="rounded-md border border-white/10 bg-black/20 p-3 space-y-3">
              <div className="text-xs font-semibold text-gray-300">Create new app</div>
              {createError && (
                <div className="text-[11px] text-red-300 border border-red-400/30 bg-red-500/10 rounded-md px-2 py-1.5">
                  {createError}
                </div>
              )}
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="App name"
                className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60"
              />
              <input
                value={createForm.slug}
                onChange={(e) => setCreateForm((p) => ({ ...p, slug: e.target.value }))}
                placeholder="slug (e.g. smartcalender)"
                className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={createForm.monthly_price_usd}
                  onChange={(e) => setCreateForm((p) => ({ ...p, monthly_price_usd: e.target.value }))}
                  placeholder="Price"
                  className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60"
                />
                <input
                  value={createForm.trial_days}
                  onChange={(e) => setCreateForm((p) => ({ ...p, trial_days: e.target.value }))}
                  placeholder="Trial days"
                  className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60"
                />
              </div>
              <button
                disabled={createLoading}
                onClick={async () => {
                  setCreateError('')
                  if (!createForm.name.trim() || !createForm.slug.trim()) {
                    setCreateError('Name and slug are required.')
                    return
                  }
                  const priceParsed = Number.parseFloat(createForm.monthly_price_usd)
                  const trialParsed = Number.parseInt(createForm.trial_days, 10)
                  const payload = {
                    name: createForm.name.trim(),
                    slug: createForm.slug.trim().toLowerCase().replace(/\s+/g, ''),
                    monthly_price_usd: Number.isFinite(priceParsed) && priceParsed > 0 ? priceParsed : 2,
                    trial_days: Number.isInteger(trialParsed) && trialParsed > 0 ? trialParsed : 5,
                  }
                  setCreateLoading(true)
                  try {
                    const created = await adminApi.createApp(payload)
                    setCreateForm({ name: '', slug: '', monthly_price_usd: '2.00', trial_days: '5' })
                    await loadApps()
                    setSelectedAppId(created.id)
                  } catch (e) {
                    setCreateError(e?.message ? String(e.message) : 'Could not create app.')
                  } finally {
                    setCreateLoading(false)
                  }
                }}
                className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-[12px] font-semibold py-2 transition-colors"
              >
                {createLoading ? 'Creating…' : 'Create app'}
              </button>

              <div className="border-t border-white/10 pt-3">
                <div className="text-xs font-semibold text-gray-300 mb-2">Apps</div>
                <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
                  {appsState.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedAppId(app.id)}
                      className={`w-full text-left rounded-md border px-3 py-2 transition-colors ${
                        selectedAppId === app.id
                          ? 'border-emerald-400/60 bg-emerald-500/10'
                          : 'border-white/10 bg-black/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="text-[12px] font-semibold text-white">{app.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{app.slug}</div>
                    </button>
                  ))}
                  {!appsState.length && <div className="text-[11px] text-gray-500">No apps yet.</div>}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-white/10 bg-black/20 p-3 space-y-3">
              {!selectedApp ? (
                <div className="text-[12px] text-gray-500">Select an app to manage screenshots.</div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-bold text-emerald-200">{selectedApp.name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{selectedApp.slug}</div>
                      <div className="text-[11px] text-gray-300 mt-1">
                        Price: <span className="text-emerald-200">${Number(selectedApp.monthly_price_usd).toFixed(2)}</span> / mo
                        {' · '}
                        Trial: <span className="text-emerald-200">{selectedApp.trial_days} days</span>
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await adminApi.updateApp(selectedApp.id, { is_active: !selectedApp.is_active })
                        await loadApps()
                      }}
                      className="rounded-md border border-white/10 hover:bg-white/5 text-white text-[11px] font-semibold px-3 py-1.5 transition-colors"
                    >
                      {selectedApp.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-center">
                    <input
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      className="w-full rounded-md bg-black/30 border border-white/10 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60"
                    />
                    <button
                      disabled={savingName}
                      onClick={async () => {
                        const next = nameDraft.trim()
                        if (!next) return
                        setSavingName(true)
                        try {
                          await adminApi.updateApp(selectedApp.id, { name: next })
                          await loadApps()
                        } finally {
                          setSavingName(false)
                        }
                      }}
                      className="rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-60 text-white text-[11px] font-semibold px-3 py-2 transition-colors"
                    >
                      Save name
                    </button>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] text-gray-300 font-semibold mb-2">
                      Download links (stable) {latestLoading && <span className="text-gray-500">loading…</span>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {platforms.map((platform) => {
                        const url = latestByAppId?.[selectedApp.id]?.[platform]?.url
                        return (
                          <div key={platform} className="rounded-md border border-white/10 bg-black/20 p-2 text-[11px]">
                            <div className="capitalize text-gray-300 mb-1">{platform}</div>
                            {url ? <a href={url} target="_blank" rel="noreferrer" className="text-emerald-300 hover:underline">Download</a> : <span className="text-gray-500">—</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10">
                    <div className="text-[11px] text-gray-300 font-semibold mb-2">
                      Product screenshots (preview / update / delete)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {imageTabs.map((tab) => {
                        const preview = imagesByAppId?.[selectedApp.id]?.[tab.key]
                        const slot = `${selectedApp.id}:${tab.key}`
                        const uploading = !!uploadingBySlot[slot]
                        return (
                          <div key={tab.key} className="rounded-md border border-white/10 p-2 bg-black/20">
                            <div className="text-[11px] text-gray-300 mb-1">{tab.label}</div>
                            {preview ? (
                              <a href={preview} target="_blank" rel="noreferrer">
                                <img src={preview} alt={tab.label} className="w-full h-28 object-cover rounded border border-white/10 mb-2" />
                              </a>
                            ) : (
                              <div className="w-full h-28 rounded border border-dashed border-white/10 mb-2 flex items-center justify-center text-[10px] text-gray-500">
                                No image yet
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <input
                                type="file"
                                accept="image/*"
                                disabled={uploading}
                                className="flex-1 text-[10px] text-gray-300 file:mr-2 file:rounded file:border file:border-white/20 file:bg-white/5 file:px-2 file:py-1 file:text-[10px] file:text-white"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (!file) return
                                  setUploadingBySlot((p) => ({ ...p, [slot]: true }))
                                  try {
                                    const res = await adminApi.uploadAppImage(selectedApp.id, { tab: tab.key, file })
                                    setImagesByAppId((prev) => ({
                                      ...prev,
                                      [selectedApp.id]: {
                                        ...(prev[selectedApp.id] || {}),
                                        [tab.key]: res?.url || (prev?.[selectedApp.id]?.[tab.key] || ''),
                                      },
                                    }))
                                  } finally {
                                    setUploadingBySlot((p) => ({ ...p, [slot]: false }))
                                    e.target.value = ''
                                  }
                                }}
                              />
                              <button
                                disabled={!preview || uploading}
                                onClick={async () => {
                                  await adminApi.deleteAppImage(selectedApp.id, tab.key)
                                  setImagesByAppId((prev) => ({
                                    ...prev,
                                    [selectedApp.id]: {
                                      ...(prev[selectedApp.id] || {}),
                                      [tab.key]: '',
                                    },
                                  }))
                                }}
                                className="rounded-md border border-red-400/40 text-red-300 hover:bg-red-500/10 disabled:opacity-50 text-[10px] font-semibold px-2 py-1"
                              >
                                Delete
                              </button>
                            </div>
                            {uploading && <div className="text-[10px] text-emerald-300 mt-1">Uploading…</div>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

