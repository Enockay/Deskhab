import React, { useEffect, useState } from 'react'
import { adminApi } from '../../lib/adminApi'

export default function AdminRoles() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'manager' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const list = await adminApi.listAdminUsers()
        setAdmins(list)
      } catch (err) {
        setError(err.message || 'Failed to load admin users.')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const createAdmin = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const created = await adminApi.createAdminUser(form)
      setAdmins((prev) => [...prev, created])
      setForm({ email: '', password: '', name: '', role: 'manager' })
    } catch (err) {
      setError(err.message || 'Failed to create admin.')
    } finally {
      setCreating(false)
    }
  }

  const toggleActive = async (a) => {
    setError('')
    try {
      const updated = a.is_active
        ? await adminApi.disableAdminUser(a.id)
        : await adminApi.enableAdminUser(a.id)
      setAdmins((prev) => prev.map((x) => (x.id === a.id ? updated : x)))
    } catch (err) {
      setError(err.message || 'Failed to update admin.')
    }
  }

  return (
    <>
      <div className="rounded-md border border-white/10 bg-gradient-to-b from-[#171924] via-[#13151f] to-[#0e1017] p-4">
        <h2 className="text-lg font-extrabold">Auth & Roles</h2>
        <p className="text-xs text-gray-400">
          Manage admin accounts and permissions.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-[11px] text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <h3 className="text-sm font-bold mb-3">Admin users</h3>
          {loading ? (
            <p className="text-xs text-gray-400">Loading…</p>
          ) : (
            <div className="space-y-2">
              {admins.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold truncate">{a.email}</div>
                    <div className="text-[11px] text-gray-400">
                      {a.role} • {a.is_active ? 'active' : 'disabled'}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(a)}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
                  >
                    {a.is_active ? 'Disable' : 'Enable'}
                  </button>
                </div>
              ))}
              {!admins.length && <p className="text-xs text-gray-400">No admin users.</p>}
            </div>
          )}
        </div>

        <div className="rounded-md border border-white/10 bg-[#16181f] p-4">
          <h3 className="text-sm font-bold mb-3">Create admin user</h3>
          <form onSubmit={createAdmin} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-300 mb-1">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                type="email"
                required
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Password</label>
              <input
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                type="password"
                required
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Name (optional)</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                type="text"
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-300 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              >
                <option value="support">support (read-only)</option>
                <option value="manager">manager</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <button
              disabled={creating}
              className="w-full rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-semibold py-2.5 transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <p className="text-[11px] text-gray-500">
              Only <span className="text-gray-300">admin</span> can create other admins.
            </p>
          </form>
        </div>
      </div>
    </>
  )
}

