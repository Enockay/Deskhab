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

export default function AdminUsers() {
  const navigate = useNavigate()
  const [appUsers, setAppUsers] = useState({ total: 0, items: [] })
  const [usersQuery, setUsersQuery] = useState('')
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [actionMsg, setActionMsg] = useState('')

  async function loadUsers(q) {
    setUsersLoading(true)
    setUsersError('')
    setActionMsg('')
    try {
      const res = await adminApi.listAppUsers({ q: q || '', limit: 100, offset: 0 })
      setAppUsers(res)
    } catch (e) {
      const msg = e?.message ? String(e.message) : 'Failed to load users'
      const lower = msg.toLowerCase()
      if (lower.includes('not authenticated') || lower.includes('invalid or expired token') || lower.includes('401')) {
        clearAdminTokens()
        navigate('/admin/login')
        return
      }
      setUsersError(msg)
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(usersQuery)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openUser(userId) {
    setSelectedUser(null)
    setActionMsg('')
    try {
      const u = await adminApi.getAppUser(userId)
      setSelectedUser(u)
    } catch (e) {
      setActionMsg(e?.message ? String(e.message) : 'Failed to load user')
    }
  }

  async function toggleUserActive(u) {
    if (!u) return
    setActionMsg('')
    try {
      const next = u.is_active ? await adminApi.disableAppUser(u.id) : await adminApi.enableAppUser(u.id)
      setSelectedUser(next)
      await loadUsers(usersQuery)
      setActionMsg(u.is_active ? 'User disabled.' : 'User enabled.')
    } catch (e) {
      setActionMsg(e?.message ? String(e.message) : 'Action failed')
    }
  }

  async function forceLogout(u) {
    if (!u) return
    setActionMsg('')
    try {
      const res = await adminApi.forceLogoutAppUser(u.id)
      setActionMsg(`Forced logout. Revoked refresh tokens: ${res?.revoked_refresh_tokens ?? 0}`)
    } catch (e) {
      setActionMsg(e?.message ? String(e.message) : 'Force logout failed')
    }
  }

  return (
    <>
      <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <h2 className="text-lg font-extrabold">Users</h2>
        <p className="text-xs text-gray-400">
          Search, view, and manage DesktopHab users.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm font-bold">Search / list</div>
            <div className="text-[11px] text-gray-400">Total: {appUsers?.total ?? '—'}</div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <input
              value={usersQuery}
              onChange={(e) => setUsersQuery(e.target.value)}
              placeholder="Search by email or user id…"
              className="flex-1 rounded-sm bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
            />
            <button
              onClick={() => loadUsers(usersQuery)}
              className="px-3 py-2 rounded-sm border border-white/10 hover:bg-white/5 text-sm font-semibold"
            >
              Search
            </button>
          </div>

          {usersError && <div className="text-xs text-red-300 mb-2">{usersError}</div>}
          {usersLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span className="h-3 w-3 border border-emerald-400 border-t-transparent rounded-full animate-spin" />
              Loading users…
            </div>
          ) : (
            <div className="max-h-[560px] overflow-auto overscroll-contain pr-1">
              <table className="w-full text-[11px]">
                <thead className="text-gray-400 sticky top-0 bg-[#16181f]">
                  <tr className="border-b border-white/10">
                    <th className="text-left font-semibold py-2 pr-3">#</th>
                    <th className="text-left font-semibold py-2 pr-3">Email</th>
                    <th className="text-left font-semibold py-2 pr-3">ID</th>
                    <th className="text-left font-semibold py-2 pr-3">Status</th>
                    <th className="text-left font-semibold py-2 pr-3">Verified</th>
                  </tr>
                </thead>
                <tbody className="text-gray-200">
                  {(appUsers?.items || []).map((u, idx) => (
                    <tr
                      key={u.id}
                      className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                      onClick={() => openUser(u.id)}
                    >
                      <td className="py-2 pr-3 text-gray-500 w-[44px]">{idx + 1}</td>
                      <td className="py-2 pr-3 max-w-[340px] truncate">{u.email}</td>
                      <td className="py-2 pr-3 font-mono text-gray-400 max-w-[220px] truncate">{u.id}</td>
                      <td className="py-2 pr-3">
                        <span className={u.is_active ? statusPill('succeeded').className : statusPill('failed').className}>
                          {u.is_active ? 'active' : 'disabled'}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={u.is_email_verified ? statusPill('succeeded').className : statusPill('pending').className}>
                          {u.is_email_verified ? 'yes' : 'no'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {(!appUsers?.items || appUsers.items.length === 0) && (
                    <tr><td className="py-3 text-gray-500" colSpan={5}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <div className="text-sm font-bold mb-2">Profile</div>
          {!selectedUser ? (
            <div className="text-xs text-gray-400">
              Click a user from the table to view details.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-md border border-white/10 bg-black/20 p-3">
                <div className="text-xs font-semibold truncate">{selectedUser.email}</div>
                <div className="text-[11px] text-gray-400 mt-1 font-mono break-all">{selectedUser.id}</div>
                <div className="text-[11px] text-gray-500 mt-1">
                  Created: {selectedUser.created_at || '—'}
                </div>
                <div className="text-[11px] text-gray-500">
                  Last login: {selectedUser.last_login_at || '—'}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className={selectedUser.is_active ? statusPill('succeeded').className : statusPill('failed').className}>
                    {selectedUser.is_active ? 'active' : 'disabled'}
                  </span>
                  <span className={selectedUser.is_email_verified ? statusPill('succeeded').className : statusPill('pending').className}>
                    {selectedUser.is_email_verified ? 'email verified' : 'email unverified'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => toggleUserActive(selectedUser)}
                  className="w-full rounded-md border border-white/10 hover:bg-white/5 text-white text-sm font-semibold py-2.5 transition-colors"
                >
                  {selectedUser.is_active ? 'Disable user' : 'Enable user'}
                </button>
                <button
                  onClick={() => forceLogout(selectedUser)}
                  className="w-full rounded-md border border-white/10 hover:bg-white/5 text-white text-sm font-semibold py-2.5 transition-colors"
                >
                  Force logout (revoke refresh tokens)
                </button>
              </div>

              {actionMsg && (
                <div className="text-[11px] text-gray-300 rounded-md border border-white/10 bg-black/20 px-3 py-2">
                  {actionMsg}
                </div>
              )}

              <div className="text-[11px] text-gray-500">
                Password reset assist: use the normal “Forgot password” flow for now (optional admin action can be added next).
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

