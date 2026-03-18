import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi, clearAdminTokens } from '../../lib/adminApi'

function statusPill(statusRaw) {
  const s = String(statusRaw || '').toLowerCase()
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wide'
  if (s === 'succeeded' || s === 'success' || s === 'successful' || s === 'paid') {
    return { label: statusRaw || 'succeeded', className: `${base} bg-emerald-500/10 border-emerald-400/30 text-emerald-200` }
  }
  if (s === 'pending' || s === 'processing' || s === 'initiated') {
    return { label: statusRaw || 'pending', className: `${base} bg-yellow-500/10 border-yellow-400/30 text-yellow-200` }
  }
  if (s === 'failed' || s === 'error' || s === 'cancelled' || s === 'canceled') {
    return { label: statusRaw || 'failed', className: `${base} bg-red-500/10 border-red-400/30 text-red-200` }
  }
  return { label: statusRaw || '—', className: `${base} bg-white/5 border-white/10 text-gray-200` }
}

export default function AdminSubscriptions() {
  const navigate = useNavigate()
  const [subsState, setSubsState] = useState({ items: [], total: 0 })
  const [subsQuery, setSubsQuery] = useState('')
  const [subsStatus, setSubsStatus] = useState('')
  const [subsLoading, setSubsLoading] = useState(false)
  const [subsError, setSubsError] = useState('')
  const [selectedSub, setSelectedSub] = useState(null)
  const [subsActionLoading, setSubsActionLoading] = useState(false)

  async function loadSubs() {
    setSubsLoading(true)
    setSubsError('')
    try {
      const res = await adminApi.listSubscriptions({ q: subsQuery, status: subsStatus, limit: 100 })
      setSubsState(res)
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'Failed to load subscriptions'
      const lower = msg.toLowerCase()
      if (lower.includes('not authenticated') || lower.includes('invalid or expired token') || lower.includes('401')) {
        clearAdminTokens()
        navigate('/admin/login')
        return
      }
      setSubsError(msg)
    } finally {
      setSubsLoading(false)
    }
  }

  useEffect(() => {
    loadSubs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSubsAction(action) {
    if (!selectedSub) return
    setSubsActionLoading(true)
    try {
      await action()
    } finally {
      setSubsActionLoading(false)
    }
  }

  return (
    <>
      <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <h2 className="text-lg font-extrabold">Subscriptions</h2>
        <p className="text-xs text-gray-400">
          View and manage SmartCalender subscriptions.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm font-bold">All subscriptions</div>
            <div className="text-[11px] text-gray-400">Total: {subsState?.total ?? '—'}</div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              value={subsQuery}
              onChange={(e) => setSubsQuery(e.target.value)}
              placeholder="Search by user email…"
              className="flex-1 min-w-[180px] rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
            />
            <select
              value={subsStatus}
              onChange={(e) => setSubsStatus(e.target.value)}
              className="rounded-sm bg-black/30 border border-white/10 px-2 py-2 text-[11px] text-gray-200 outline-none focus:border-emerald-400/60"
            >
              <option value="">All statuses</option>
              <option value="trial">trial</option>
              <option value="active">active</option>
              <option value="expired">expired</option>
              <option value="cancelled">cancelled</option>
            </select>
            <button
              onClick={loadSubs}
              className="px-3 py-2 rounded-sm border border-white/10 hover:bg-white/5 text-sm font-semibold"
            >
              Filter
            </button>
          </div>

          {subsError && <div className="text-xs text-red-300 mb-2">{subsError}</div>}
          {subsLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
              Loading subscriptions…
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto overscroll-contain pr-1">
              <table className="w-full text-[11px]">
                <thead className="text-gray-400 sticky top-0 bg-[#16181f]">
                  <tr className="border-b border-white/10">
                    <th className="text-left font-semibold py-2 pr-3">User</th>
                    <th className="text-left font-semibold py-2 pr-3">Tier</th>
                    <th className="text-left font-semibold py-2 pr-3">Status</th>
                    <th className="text-left font-semibold py-2 pr-3">Expires</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {(subsState?.items || []).map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                      onClick={() => setSelectedSub(s)}
                    >
                      <td className="py-2 pr-3 max-w-[260px] truncate">{s.user_id}</td>
                      <td className="py-2 pr-3">{s.tier}</td>
                      <td className="py-2 pr-3">
                        <span
                          className={
                            s.status === 'active'
                              ? statusPill('succeeded').className
                              : s.status === 'trial'
                                ? statusPill('pending').className
                                : statusPill('failed').className
                          }
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-400">{s.expires_at || '—'}</td>
                    </tr>
                  ))}
                  {(!subsState?.items || subsState.items.length === 0) && (
                    <tr><td className="py-3 text-gray-500" colSpan={4}>No subscriptions.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="text-sm font-bold mb-2">Details</div>
          {!selectedSub ? (
            <div className="text-xs text-gray-400">Select a subscription from the table.</div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-emerald-400/30 bg-black/30 p-3">
                <div className="text-xs font-semibold text-emerald-300">User id</div>
                <div className="text-[11px] text-emerald-100 font-mono break-all">{selectedSub.user_id}</div>
                <div className="text-[11px] text-gray-300 mt-1">
                  Tier:{' '}
                  <span className="text-emerald-300 font-semibold">{selectedSub.tier}</span>{' '}
                  • Status:{' '}
                  <span className={selectedSub.status === 'active' ? 'text-emerald-300 font-semibold' : 'text-yellow-300 font-semibold'}>
                    {selectedSub.status}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Expires:{' '}
                  <span className="text-emerald-200">
                    {selectedSub.expires_at || '—'}
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Trial ends:{' '}
                  <span className="text-emerald-200">
                    {selectedSub.trial_ends_at || '—'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  disabled={subsActionLoading}
                  onClick={() =>
                    runSubsAction(async () => {
                      await adminApi.updateSubscription(selectedSub.id, { extend_days: 30 })
                      await loadSubs()
                    })
                  }
                  className="w-full rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  {subsActionLoading && (
                    <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Extend by 30 days</span>
                </button>

                <button
                  disabled={subsActionLoading}
                  onClick={() =>
                    runSubsAction(async () => {
                      await adminApi.updateSubscription(selectedSub.id, { status: 'cancelled' })
                      await loadSubs()
                      setSelectedSub({ ...selectedSub, status: 'cancelled' })
                    })
                  }
                  className="w-full rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  {subsActionLoading && (
                    <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Cancel subscription</span>
                </button>

                <button
                  disabled={subsActionLoading}
                  onClick={() =>
                    runSubsAction(async () => {
                      await adminApi.triggerSubscriptionSync(selectedSub.id)
                    })
                  }
                  className="w-full rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  {subsActionLoading && (
                    <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Realtime “Sync now”</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

