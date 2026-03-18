import React from 'react'

function SidebarItem({ label, icon, active, disabled, onClick }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={[
        'flex items-center gap-2 rounded-xl px-3 py-2 text-xs border',
        active ? 'bg-emerald-500/10 border-emerald-400/30 text-white' : 'border-white/10 text-gray-300',
        disabled ? 'opacity-50' : 'hover:bg-white/5 cursor-pointer',
      ].join(' ')}
    >
      <span className="w-5 text-center text-[12px]">{icon}</span>
      <span className="font-semibold">{label}</span>
      {disabled && <span className="ml-auto text-[10px] text-gray-500">soon</span>}
    </div>
  )
}

export default function AdminSidebar({ items, currentPath, onNavigate }) {
  return (
    <aside className="rounded-none border-r border-white/10 bg-[#12141c] p-3 h-full overflow-hidden overscroll-none">
      <div className="mb-3 px-1">
        <div className="text-[11px] uppercase tracking-wider text-gray-500">Modules</div>
      </div>

      <div className="space-y-2 px-1">
        {items.map((item) => (
          <SidebarItem
            key={item.label}
            label={item.label}
            icon={item.icon}
            disabled={item.disabled}
            active={!item.disabled && (currentPath === item.path || (item.path === '/admin' && currentPath === '/admin'))}
            onClick={() => onNavigate(item.path)}
          />
        ))}
      </div>

      <div className="mt-3 rounded-md border border-white/10 bg-black/20 p-3 mx-1">
        <div className="text-xs font-bold">Current</div>
        <div className="text-[11px] text-gray-400">
          Auth & Roles → Admin users
        </div>
      </div>
    </aside>
  )
}

