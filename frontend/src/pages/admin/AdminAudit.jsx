import React from 'react'

export default function AdminAudit({ overview }) {
  const feed = overview?.admin_activity?.audit_feed || []

  return (
    <>
      <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <h2 className="text-lg font-extrabold">Audit logs</h2>
        <p className="text-xs text-gray-400">
          Every admin action is written to the audit log for security and support.
        </p>
      </div>

      <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm font-bold">Recent activity</div>
          <div className="text-[11px] text-gray-400">
            Source: <span className="text-emerald-300">audit_logs</span> table via admin overview metrics.
          </div>
        </div>
        <div className="max-h-[560px] overflow-auto overscroll-contain space-y-2 pr-1">
          {feed.map((a) => (
            <div
              key={`${a.created_at}-${a.action}-${a.target_id}`}
              className="rounded-md border border-white/10 bg-black/20 px-3 py-2"
            >
              <div className="text-[11px] text-gray-300">
                <span className="text-gray-500">{a.created_at}</span>{' '}
                • <span className="font-semibold text-emerald-200">{a.action}</span>{' '}
                • {a.target_type}:{a.target_id}
              </div>
              <div className="text-[11px] text-gray-500">
                ip: {a.ip || '—'}
              </div>
            </div>
          ))}
          {(!feed || feed.length === 0) && (
            <div className="text-[11px] text-gray-500">No audit events yet.</div>
          )}
        </div>
      </div>
    </>
  )
}

