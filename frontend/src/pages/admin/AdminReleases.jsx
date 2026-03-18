import React, { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export default function AdminReleases() {
  const [apps, setApps] = useState([])
  const [selectedAppId, setSelectedAppId] = useState('')
  const [version, setVersion] = useState('')
  const [channel, setChannel] = useState('stable')
  const [minSupportedVersion, setMinSupportedVersion] = useState('')
  const [notes, setNotes] = useState('')
  const [makeLatest, setMakeLatest] = useState(true)
  const [forceUpdate, setForceUpdate] = useState(false)

  const [files, setFiles] = useState({ macos: null, windows: null, linux: null })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  const [releasesLoading, setReleasesLoading] = useState(false)
  const [releasesError, setReleasesError] = useState('')
  const [releases, setReleases] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.listApps()
        setApps(res)

        // Default to smartcalender if present.
        if (!selectedAppId) {
          const smart = res.find((a) => a.slug === 'smartcalender')
          setSelectedAppId(String(smart?.id || res?.[0]?.id || ''))
        }
      } catch {
        setApps([])
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadReleases = async () => {
      if (!selectedAppId) return
      setReleasesLoading(true)
      setReleasesError('')
      try {
        const res = await adminApi.listReleases({ appId: selectedAppId, channel })
        setReleases(res || [])
      } catch (e) {
        setReleasesError(e?.message ? String(e.message) : 'Failed to load releases')
        setReleases([])
      } finally {
        setReleasesLoading(false)
      }
    }
    loadReleases()
  }, [selectedAppId, channel])

  const currentFilesOk = Boolean(files.macos || files.windows || files.linux)

  return (
    <>
      <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <h2 className="text-lg font-extrabold">Releases / Downloads</h2>
        <p className="text-xs text-gray-400">
          Define versioned releases per app and point to binaries hosted in AWS S3 or another CDN.
        </p>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="rounded-md border border-white/10 bg-[#16181f] p-4 space-y-3">
          <div className="text-sm font-bold">Create release</div>
          <p className="text-[11px] text-gray-500">
            Upload binaries for each platform, save the release, and make it available to the <span className="text-emerald-300">Download</span> page.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-300 mb-1">App</label>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                disabled={submitting}
                className="w-full rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              >
                {apps.map((app) => (
                  <option key={app.id} value={app.id}>{app.name} ({app.slug})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Version (SemVer)</label>
              <input
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.4.2"
                className="w-full rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                disabled={submitting}
                className="w-full rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              >
                <option value="stable">stable</option>
                <option value="beta">beta</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Minimum supported version (optional)</label>
              <input
                value={minSupportedVersion}
                onChange={(e) => setMinSupportedVersion(e.target.value)}
                placeholder="1.2.0"
                className="w-full rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-300 mb-1">Release notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="- Added calendar colours\n- Fixed device binding edge cases"
              className="w-full rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-xs text-white outline-none focus:border-emerald-400/60"
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['macos', 'windows', 'linux'].map((platform) => (
              <div key={platform} className="rounded-md border border-white/10 bg-black/20 p-3 space-y-2">
                <div className="text-[11px] font-semibold text-emerald-200 uppercase">{platform}</div>
                <div>
                  <label className="block text-[11px] text-gray-300 mb-1">Upload file</label>
                  <input
                    type="file"
                    disabled={submitting}
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      setFiles((prev) => ({ ...prev, [platform]: file }))
                    }}
                    className="w-full rounded-sm bg-black/40 border border-white/10 px-2 py-1.5 text-[11px] text-white outline-none focus:border-emerald-400/60"
                  />
                  {files[platform] && (
                    <div className="text-[11px] text-gray-400 mt-1 truncate">
                      Selected: {files[platform]?.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 text-[11px] text-gray-300">
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={makeLatest}
                  disabled={submitting}
                  onChange={(e) => setMakeLatest(e.target.checked)}
                  className="h-3 w-3 rounded border-white/20 bg-black/40"
                />
                <span>Mark as latest for channel</span>
              </label>
              <label className="inline-flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={forceUpdate}
                  disabled={submitting}
                  onChange={(e) => setForceUpdate(e.target.checked)}
                  className="h-3 w-3 rounded border-white/20 bg-black/40"
                />
                <span>Force update (minimum version)</span>
              </label>
            </div>
            <button
              disabled={
                submitting ||
                !selectedAppId ||
                !version.trim() ||
                (!files.macos && !files.windows && !files.linux)
              }
              onClick={async () => {
                setSubmitting(true)
                setError('')
                setSuccess('')
                setUploadProgress(0)
                try {
                  const formData = new FormData()
                  formData.append('app_id', selectedAppId)
                  formData.append('version', version.trim())
                  formData.append('channel', channel)
                  if (notes.trim()) formData.append('notes', notes.trim())
                  if (minSupportedVersion.trim()) formData.append('min_supported_version', minSupportedVersion.trim())

                  formData.append('is_published', makeLatest ? 'true' : 'false')
                  formData.append('make_latest', makeLatest ? 'true' : 'false')
                  formData.append('is_force_update', forceUpdate ? 'true' : 'false')

                  if (files.macos) formData.append('macos_file', files.macos)
                  if (files.windows) formData.append('windows_file', files.windows)
                  if (files.linux) formData.append('linux_file', files.linux)

                  await adminApi.createReleaseWithProgress(formData, (p) => {
                    setUploadProgress(p)
                  })

                  setSuccess('Release uploaded successfully. Download page will update automatically.')
                  setVersion('')
                  setNotes('')
                  setMinSupportedVersion('')
                  setMakeLatest(true)
                  setForceUpdate(false)
                  setUploadProgress(100)

                  // Refresh the list so "Existing releases" updates immediately.
                  const refreshed = await adminApi.listReleases({ appId: selectedAppId, channel })
                  setReleases(refreshed || [])
                } catch (err) {
                  setError(err?.message || String(err || 'Failed to upload release'))
                } finally {
                  setSubmitting(false)
                }
              }}
              className="px-4 py-2 rounded-md border border-white/15 bg-white/5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 disabled:hover:bg-white/5"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  Uploading… {uploadProgress}%
                </span>
              ) : (
                'Upload release'
              )}
            </button>
          </div>
          {submitting && (
            <div className="mt-3">
              <div className="h-2.5 w-full bg-black/30 border border-white/10 rounded-md overflow-hidden">
                <div
                  className="h-full bg-emerald-500/80"
                  style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%`, transition: 'width 120ms linear' }}
                />
              </div>
              <div className="mt-1 text-[11px] text-gray-400">
                Upload progress based on browser upload bytes.
              </div>
            </div>
          )}
        </div>

        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="text-sm font-bold mb-2">Existing releases</div>
          {releasesError && (
            <div className="mb-2 text-[11px] text-red-300">
              {releasesError}
            </div>
          )}
          <div className="text-[11px] text-gray-400 mb-2">
            Showing releases for this app + channel. Uploading a new release will refresh this list.
          </div>
          <div className="rounded-md border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-gray-500">
            For now, deployments can keep using the static download links on the marketing site. When ready we can
            switch the desktop app to `GET /v1/apps/smartcalender/releases/latest?platform=macos&channel=stable`.
          </div>

          <div className="mt-3">
            {releasesLoading ? (
              <div className="text-[11px] text-gray-400">Loading releases…</div>
            ) : releases.length === 0 ? (
              <div className="text-[11px] text-gray-400">No releases found yet.</div>
            ) : (
              <div className="space-y-2">
                {releases.map((r) => {
                  const platforms = (r.artifacts || []).map((a) => a.platform).join(', ')
                  return (
                    <div key={r.release_id} className="rounded-md border border-white/10 bg-black/20 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[11px] text-white font-semibold">
                          {r.version} <span className="text-gray-400">({r.channel})</span>
                        </div>
                        <div className={`text-[11px] font-semibold ${r.is_published ? 'text-emerald-300' : 'text-gray-400'}`}>
                          {r.is_published ? 'Published' : 'Unpublished'}
                        </div>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        Platforms: {platforms || '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

