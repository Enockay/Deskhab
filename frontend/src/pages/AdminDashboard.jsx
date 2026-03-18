import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminApi, clearAdminTokens } from '../lib/adminApi'
import AdminHeader from '../components/admin/AdminHeader'
import AdminSidebar from '../components/admin/AdminSidebar'
import AdminFooter from '../components/admin/AdminFooter'
import AdminAudit from './admin/AdminAudit'
import AdminApps from './admin/AdminApps'
import AdminReleases from './admin/AdminReleases'
import AdminDevices from './admin/AdminDevices'
import AdminPayments from './admin/AdminPayments'
import AdminSubscriptions from './admin/AdminSubscriptions'
import AdminUsers from './admin/AdminUsers'
import AdminRoles from './admin/AdminRoles'
import AdminOverview from './admin/AdminOverview'

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

export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [me, setMe] = useState(null)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)

  useEffect(() => {
    const run = async () => {
      setError('')
      try {
        const meRes = await adminApi.me()
        setMe(meRes)
        const ov = await adminApi.overview()
        setOverview(ov)
      } catch (err) {
        // Not authenticated -> go login
        const msg = (err && err.message) ? err.message : String(err || 'Failed to load admin data.')
        if (String(msg).toLowerCase().includes('not authenticated') || String(msg).includes('401')) {
          clearAdminTokens()
          navigate('/admin/login')
          return
        }
        setError(String(msg))
      }
    }
    run()
  }, [])

  const logout = () => {
    clearAdminTokens()
    navigate('/admin/login')
  }

  const sidebar = useMemo(
    () => [
      { label: 'Overview', icon: '🏠', path: '/admin', disabled: false },
      { label: 'Users', icon: '👤', path: '/admin/users', disabled: false },
      { label: 'Subscriptions', icon: '💳', path: '/admin/subscriptions', disabled: false },
      { label: 'Payments', icon: '🧾', path: '/admin/payments', disabled: false },
      { label: 'Devices', icon: '💻', path: '/admin/devices', disabled: false },
      { label: 'Apps', icon: '📦', path: '/admin/apps', disabled: false },
      { label: 'Releases', icon: '⬆️', path: '/admin/releases', disabled: false },
      { label: 'Audit logs', icon: '📜', path: '/admin/audit', disabled: false },
      { label: 'Auth & Roles', icon: '🛡️', path: '/admin/roles', disabled: false },
    ],
    [],
  )

  return (
    <div className="h-screen overflow-hidden bg-[#0d0f14] text-white flex flex-col">
      <AdminHeader me={me} error={error} logout={logout} />

      {/* Content (sidebar + main) */}
      <div className="flex-1 w-full overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-0">
          {/* Sidebar */}
          <AdminSidebar items={sidebar} currentPath={location.pathname} onNavigate={navigate} />

          {/* Main */}
          <main className="h-full min-h-full max-h-full overflow-hidden p-4 flex flex-col">
            <div className="space-y-4 flex-1 overflow-y-auto overscroll-contain">
            {location.pathname === '/admin' && <AdminOverview overview={overview} />}

            {location.pathname === '/admin/users' && <AdminUsers />}

            {location.pathname === '/admin/subscriptions' && <AdminSubscriptions />}
            {false && (
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
                                  <span className={s.status === 'active' ? statusPill('succeeded').className : s.status === 'trial' ? statusPill('pending').className : statusPill('failed').className}>
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
            )}

            {location.pathname === '/admin/payments' && <AdminPayments />}
            {false && (
              <>
                <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
                  <h2 className="text-lg font-extrabold">Payments & Billing</h2>
                  <p className="text-xs text-gray-400">
                    Inspect payments, check idempotency, and resend receipts.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-md border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-transparent p-3">
                    <div className="text-[11px] text-emerald-200 font-semibold uppercase tracking-wide">Total payments</div>
                    <div className="mt-1 text-lg font-bold text-emerald-100">{paymentsState?.total ?? '—'}</div>
                    <div className="text-[11px] text-gray-400 mt-1">All time recorded payments.</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-gradient-to-br from-white/10 via-white/3 to-transparent p-3">
                    <div className="text-[11px] text-gray-200 font-semibold uppercase tracking-wide">Succeeded (filter)</div>
                    <div className="mt-1 text-lg font-bold text-emerald-200">
                      {String(paymentsStatus || 'all').toUpperCase()}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">Use the status filter to inspect success rate.</div>
                  </div>
                  <div className="rounded-md border border-white/10 bg-gradient-to-br from-yellow-400/15 via-yellow-400/5 to-transparent p-3">
                    <div className="text-[11px] text-yellow-200 font-semibold uppercase tracking-wide">Idempotency</div>
                    <div className="mt-1 text-[11px] text-gray-300">
                      Use reference search to confirm duplicates are merged correctly.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
                  <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="text-sm font-bold">Payments</div>
                      <div className="text-[11px] text-gray-400">Total: {paymentsState?.total ?? '—'}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <input
                        value={paymentsQuery}
                        onChange={(e) => setPaymentsQuery(e.target.value)}
                        placeholder="Search by email or reference…"
                        className="flex-1 min-w-[180px] rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                      />
                      <select
                        value={paymentsStatus}
                        onChange={(e) => setPaymentsStatus(e.target.value)}
                        className="rounded-sm bg-black/30 border border-white/10 px-2 py-2 text-[11px] text-gray-200 outline-none focus:border-emerald-400/60"
                      >
                        <option value="">All statuses</option>
                        <option value="succeeded">succeeded</option>
                        <option value="pending">pending</option>
                        <option value="failed">failed</option>
                      </select>
                      <button
                        onClick={loadPayments}
                        className="px-3 py-2 rounded-sm border border-white/10 hover:bg-white/5 text-sm font-semibold"
                      >
                        Filter
                      </button>
                    </div>
                    {paymentsError && <div className="text-xs text-red-300 mb-2">{paymentsError}</div>}
                    {paymentsLoading ? (
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        Loading payments…
                      </div>
                    ) : (
                      <div className="max-h-[560px] overflow-auto overscroll-contain pr-1">
                        <table className="w-full text-[11px]">
                          <thead className="text-gray-400 sticky top-0 bg-[#16181f]">
                            <tr className="border-b border-white/10">
                              <th className="text-left font-semibold py-2 pr-3">Time</th>
                              <th className="text-left font-semibold py-2 pr-3">User</th>
                              <th className="text-left font-semibold py-2 pr-3">Amount</th>
                              <th className="text-left font-semibold py-2 pr-3">Status</th>
                              <th className="text-left font-semibold py-2 pr-3">Reference</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-200">
                            {(paymentsState?.items || []).map((p) => (
                              <tr
                                key={p.id}
                                className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                                onClick={() => setSelectedPayment(p)}
                              >
                                <td className="py-2 pr-3 whitespace-nowrap text-gray-400">{p.created_at}</td>
                                <td className="py-2 pr-3 max-w-[220px] truncate">{p.user_email || '—'}</td>
                                <td className="py-2 pr-3 whitespace-nowrap">
                                  ${Number(p.amount_usd).toFixed(2)} {String(p.currency || '').toUpperCase()}
                                </td>
                                <td className="py-2 pr-3">
                                  <span className={statusPill(p.status).className}>{statusPill(p.status).label}</span>
                                </td>
                                <td className="py-2 pr-3 font-mono text-gray-300 max-w-[220px] truncate">{p.reference || '—'}</td>
                              </tr>
                            ))}
                            {(!paymentsState?.items || paymentsState.items.length === 0) && (
                              <tr><td className="py-3 text-gray-500" colSpan={5}>No payments.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
                    <div className="text-sm font-bold mb-2">Payment details</div>
                    {!selectedPayment ? (
                      <div className="text-xs text-gray-400">Select a payment row to inspect and resend receipt.</div>
                    ) : (
                      <div className="space-y-3">
                        <div className="rounded-md border border-emerald-400/30 bg-black/30 p-3">
                          <div className="text-xs font-semibold text-emerald-300">User</div>
                          <div className="text-[11px] text-emerald-100 truncate">{selectedPayment.user_email || '—'}</div>
                          <div className="text-[11px] text-gray-300 mt-1">
                            Amount:{' '}
                            <span className="text-emerald-200 font-semibold">
                              ${Number(selectedPayment.amount_usd).toFixed(2)} {String(selectedPayment.currency || '').toUpperCase()}
                            </span>
                          </div>
                          <div className="text-[11px] text-gray-300">
                            Status:{' '}
                            <span className={statusPill(selectedPayment.status).className.replace('text-emerald-200', 'text-emerald-100')}>
                              {selectedPayment.status}
                            </span>
                            {' '}• Reference:{' '}
                            <span className="font-mono break-all text-emerald-200">{selectedPayment.reference || '—'}</span>
                          </div>
                          <div className="text-[11px] text-gray-400">
                            Created: <span className="text-emerald-200">{selectedPayment.created_at}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          <button
                            disabled={paymentActionLoading}
                            onClick={async () => {
                              setPaymentActionLoading(true)
                              try {
                                await adminApi.resendPaymentReceipt(selectedPayment.id)
                              } finally {
                                setPaymentActionLoading(false)
                              }
                            }}
                            className="w-full rounded-md border border-white/10 hover:bg-white/5 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors flex items-center justify-center gap-2"
                          >
                            {paymentActionLoading && (
                              <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            )}
                            <span>Re-send receipt email</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {location.pathname === '/admin/devices' && <AdminDevices />}
            {false && (
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
            )}

            {location.pathname === '/admin/apps' && <AdminApps />}

            {location.pathname === '/admin/releases' && <AdminReleases />}

            {location.pathname === '/admin/audit' && <AdminAudit overview={overview} />}

            {location.pathname === '/admin/roles' && <AdminRoles />}

            {/* Footer */}
            </div>
            <AdminFooter />
          </main>
        </div>
      </div>
    </div>
  )
}

