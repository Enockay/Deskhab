import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, clearAdminTokens } from '../../lib/adminApi'

export default function AdminDevices() {
  const navigate = useNavigate()
  const [devicesState, setDevicesState] = useState({ items: [], total: 0 })
  const [devicesQuery, setDevicesQuery] = useState('')
  const [devicesLoading, setDevicesLoading] = useState(false)
  const [devicesError, setDevicesError] = useState('')
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [deviceActionLoading, setDeviceActionLoading] = useState(false)

  async function loadDevices() {
    setDevicesLoading(true)
    setDevicesError('')
    try {
      const res = await adminApi.listDevices({ q: devicesQuery, limit: 100 })
      setDevicesState(res)
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'Failed to load devices'
      const lower = msg.toLowerCase()
      if (lower.includes('not authenticated') || lower.includes('invalid or expired token') || lower.includes('401')) {
        clearAdminTokens()
        navigate('/admin/login')
        return
      }
      setDevicesError(msg)
    } finally {
      setDevicesLoading(false)
    }
  }

  useEffect(() => {
    loadDevices()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <h2 className="text-lg font-extrabold">Devices</h2>
        <p className="text-xs text-gray-400">
          View bound devices and help users recover access.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm font-bold">Bound devices</div>
            <div className="text-[11px] text-gray-400">Total: {devicesState?.total ?? '—'}</div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              value={devicesQuery}
              onChange={(e) => setDevicesQuery(e.target.value)}
              placeholder="Search by email or device id…"
              className="flex-1 rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
            />
            <button
              onClick={loadDevices}
              className="px-3 py-2 rounded-sm border border-white/10 hover:bg-white/5 text-sm font-semibold"
            >
              Search
            </button>
          </div>

          {devicesError && <div className="text-xs text-red-300 mb-2">{devicesError}</div>}
          {devicesLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
              Loading devices…
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto overscroll-contain pr-1">
              <table className="w-full text-[11px]">
                <thead className="text-gray-400 sticky top-0 bg-[#16181f]">
                  <tr className="border-b border-white/10">
                    <th className="text-left font-semibold py-2 pr-3">User</th>
                    <th className="text-left font-semibold py-2 pr-3">Device</th>
                    <th className="text-left font-semibold py-2 pr-3">Platform</th>
                    <th className="text-left font-semibold py-2 pr-3">Last seen</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {(devicesState?.items || []).map((d) => (
                    <tr
                      key={d.id}
                      className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                      onClick={() => setSelectedDevice(d)}
                    >
                      <td className="py-2 pr-3 max-w-[220px] truncate">{d.email || d.user_id}</td>
                      <td className="py-2 pr-3 max-w-[260px] truncate">{d.device_name || d.device_id}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-300">{d.platform || '—'}</td>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-400">{d.last_seen_at || '—'}</td>
                    </tr>
                  ))}
                  {(!devicesState?.items || devicesState.items.length === 0) && (
                    <tr><td className="py-3 text-gray-500" colSpan={4}>No bound devices.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="text-sm font-bold mb-2">Device details</div>
          {!selectedDevice ? (
            <div className="text-xs text-gray-400">Select a device row to view and unbind.</div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-400/30 bg-black/30 p-3">
                <div className="text-xs font-semibold text-emerald-300">User</div>
                <div className="text-[11px] text-emerald-100 truncate">{selectedDevice.email || selectedDevice.user_id}</div>
                <div className="text-[11px] text-gray-300 mt-1">
                  Device id:{' '}
                  <span className="font-mono break-all text-emerald-200">{selectedDevice.device_id}</span>
                </div>
                <div className="text-[11px] text-gray-300">
                  Name: <span className="text-emerald-200">{selectedDevice.device_name || '—'}</span> • Platform:{' '}
                  <span className="text-emerald-200">{selectedDevice.platform || '—'}</span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Last seen:{' '}
                  <span className="text-emerald-200">{selectedDevice.last_seen_at || '—'}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  disabled={deviceActionLoading}
                  onClick={async () => {
                    setDeviceActionLoading(true)
                    try {
                      await adminApi.unbindDevice(selectedDevice.id)
                      await loadDevices()
                      setSelectedDevice(null)
                    } finally {
                      setDeviceActionLoading(false)
                    }
                  }}
                  className="w-full rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  {deviceActionLoading && (
                    <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Unbind device (recovery)</span>
                </button>
              </div>

              <div className="text-[11px] text-gray-500">
                Transfer flow: unbind here, then have the user sign in again on their new machine so it can bind a fresh device id.
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

