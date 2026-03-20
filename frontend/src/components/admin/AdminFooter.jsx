import React from 'react'

export default function AdminFooter() {
  return (
    <footer className="pt-2 pb-4">
      <div className="rounded-md border border-white/10 bg-gradient-to-r from-emerald-500/10 via-white/5 to-transparent px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-[11px] text-gray-400">
            <span className="text-gray-200 font-semibold">Deskhab Admin</span> • Secure management console
          </div>
          <div className="text-[11px] text-gray-500">
            © {new Date().getFullYear()} Deskhab • <span className="text-emerald-300/80">Status: Online</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

