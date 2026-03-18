import { Link } from 'react-router-dom'

export default function AdminHeader({ me, error, logout }) {
  return (
    <div className="w-full pt-0 pb-0 sticky top-0 z-30">
      <div className="relative overflow-hidden rounded-none border-b border-white/10 bg-gradient-to-b from-[#171924] via-[#121421] to-[#0d0f14] px-4 py-3">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 left-8 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -top-32 right-6 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
        </div>

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.25)]">
              <span className="text-[#06130f] font-black">DH</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold leading-tight tracking-tight">
                Desk<span className="text-emerald-300">Hab</span> <span className="text-gray-500 font-bold">Admin</span>
              </h1>
              <p className="text-[11px] text-gray-400 truncate">
                {me ? `${me.email} • ${me.role}` : 'Loading…'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/" className="text-xs px-3 py-2 rounded-md border border-white/10 hover:bg-white/5">
              Back to site
            </Link>
            <button
              onClick={logout}
              className="text-xs px-3 py-2 rounded-md bg-emerald-500 hover:bg-emerald-400 font-semibold text-[#06130f]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  )
}

