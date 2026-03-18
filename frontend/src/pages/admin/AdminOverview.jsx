import React from 'react'
import StatCard from '../../components/admin/StatCard'
import SparkBars from '../../components/admin/SparkBars'

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

export default function AdminOverview({ overview }) {
  return (
    <>
      <div className="relative overflow-hidden rounded-md border border-emerald-400/20 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-10 h-64 w-64 rounded-full bg-emerald-500/18 blur-3xl" />
          <div className="absolute -top-24 -right-10 h-64 w-64 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/45 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-yellow-400/25 to-transparent" />
        </div>
        <h2 className="text-lg font-extrabold">Overview</h2>
        <p className="text-xs text-gray-400">
          Live health and key metrics across users, subscriptions, payments, devices, and realtime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Users"
          value={overview ? overview.kpis.users_total : '—'}
          sub={overview ? `New today: ${overview.kpis.users_new_today} • Verified: ${overview.kpis.users_verified_pct}%` : ''}
          accent="emerald"
        />
        <StatCard
          label="Subscriptions"
          value={overview ? overview.kpis.subs_active : '—'}
          sub={overview ? `Trial: ${overview.kpis.subs_trial} • Expired: ${overview.kpis.subs_expired}` : ''}
          accent="mix"
        />
        <StatCard
          label="Revenue (USD)"
          value={overview ? `$${Number(overview.kpis.revenue_today_usd).toFixed(2)}` : '—'}
          sub={overview ? `7d: $${Number(overview.kpis.revenue_7d_usd).toFixed(2)} • 30d: $${Number(overview.kpis.revenue_30d_usd).toFixed(2)}` : ''}
          accent="yellow"
        />
        <StatCard
          label="Failures (24h)"
          value={overview ? (Number(overview.kpis.failures_paystack_24h) + Number(overview.kpis.failures_email_24h)) : '—'}
          sub={overview ? `Paystack: ${overview.kpis.failures_paystack_24h} • Email: ${overview.kpis.failures_email_24h}` : ''}
          accent="mix"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-bold">Subscription health (30d)</div>
              <div className="text-[11px] text-gray-400">Emerald = active/trial, dark = expired.</div>
            </div>
            <div className="text-[11px] text-gray-400">
              Renewals (30d): <span className="text-gray-200 font-semibold">{overview ? overview.subscription_health.renewals_30d : '—'}</span>
            </div>
          </div>
          <SparkBars series={overview ? overview.subscription_health.series_30d : []} />
        </div>

        <div className="relative overflow-hidden rounded-md border border-emerald-400/15 bg-[#16181f] p-4">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />
            <div className="absolute -top-24 -right-20 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
          </div>
          <div className="text-sm font-bold mb-2">Upcoming expiries</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['1', '3', '7'].map((d) => (
              <div key={d} className="rounded-md border border-white/10 bg-black/20 p-3">
                <div className="text-xs font-semibold mb-2">Next {d} day{d === '1' ? '' : 's'}</div>
                <div className="space-y-2">
                  {(overview?.subscription_health?.upcoming_expiries?.[d] || []).slice(0, 5).map((x) => (
                    <div key={`${d}-${x.email}-${x.expires_at}`} className="text-[11px] text-gray-300">
                      <div className="truncate">{x.email}</div>
                      <div className="text-gray-500 truncate">{x.expires_at}</div>
                    </div>
                  ))}
                  {(!overview?.subscription_health?.upcoming_expiries?.[d] || overview.subscription_health.upcoming_expiries[d].length === 0) && (
                    <div className="text-[11px] text-gray-500">No expiries.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm font-bold">Recent payments</div>
            <div className="text-[11px] text-gray-400">
              Verify (24h): {overview ? overview.payments.verify_calls_24h : '—'} • Idempotent hits (24h): {overview ? overview.payments.idempotent_hits_24h : '—'}
            </div>
          </div>
          <div className="max-h-[520px] overflow-auto overscroll-contain">
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
                {(overview?.payments?.recent || []).map((p) => (
                  <tr key={`${p.created_at}-${p.paystack_reference}`} className="border-b border-white/5">
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-400">{p.created_at}</td>
                    <td className="py-2 pr-3 max-w-[220px] truncate">{p.user_email || '—'}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">${Number(p.amount_usd).toFixed(2)} {String(p.currency || '').toUpperCase()}</td>
                    <td className="py-2 pr-3">
                      <span className={statusPill(p.status).className}>{statusPill(p.status).label}</span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-gray-300">{p.paystack_reference || '—'}</td>
                  </tr>
                ))}
                {(!overview?.payments?.recent || overview.payments.recent.length === 0) && (
                  <tr><td className="py-3 text-gray-500" colSpan={5}>No payments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Realtime / devices / email / system block could also be extracted here if desired */}
      </div>
    </>
  )
}

