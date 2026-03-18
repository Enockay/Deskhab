export default function StatCard({ label, value, sub, accent = 'emerald' }) {
  const accentStyles =
    accent === 'yellow'
      ? 'border-yellow-400/20 bg-gradient-to-b from-yellow-500/10 via-[#16181f] to-[#16181f]'
      : accent === 'mix'
        ? 'border-emerald-400/20 bg-gradient-to-b from-emerald-500/10 via-[#16181f] to-[#16181f]'
        : 'border-emerald-400/15 bg-[#16181f]'
  return (
    <div className={`rounded-md border ${accentStyles} p-4`}>
      <div className="text-[11px] uppercase tracking-wider text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-white">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-gray-400">{sub}</div>}
    </div>
  )
}

