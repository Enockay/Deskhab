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

export default function AdminPayments() {
  const navigate = useNavigate()
  const [paymentsState, setPaymentsState] = useState({ items: [], total: 0 })
  const [paymentsQuery, setPaymentsQuery] = useState('')
  const [paymentsStatus, setPaymentsStatus] = useState('')
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [paymentActionLoading, setPaymentActionLoading] = useState(false)

  async function loadPayments() {
    setPaymentsLoading(true)
    setPaymentsError('')
    try {
      const res = await adminApi.listPayments({ q: paymentsQuery, status: paymentsStatus, limit: 100 })
      setPaymentsState(res)
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'Failed to load payments'
      const lower = msg.toLowerCase()
      if (lower.includes('not authenticated') || lower.includes('invalid or expired token') || lower.includes('401')) {
        clearAdminTokens()
        navigate('/admin/login')
        return
      }
      setPaymentsError(msg)
    } finally {
      setPaymentsLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
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
                  <span className="text-emerald-100">
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
  )
}

