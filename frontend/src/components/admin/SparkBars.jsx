export default function SparkBars({ series = [], maxBars = 30 }) {
  const data = series.slice(-maxBars)
  const max = Math.max(1, ...data.map((d) => Number(d.active || 0) + Number(d.expired || 0)))
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((d) => {
        const active = Number(d.active || 0)
        const expired = Number(d.expired || 0)
        const total = active + expired
        const h = Math.max(2, Math.round((total / max) * 64))
        const activePct = total ? active / total : 0
        return (
          <div key={d.day} className="w-2 rounded-sm bg-white/5 overflow-hidden" style={{ height: `${h}px` }}>
            <div className="w-full bg-emerald-500/70" style={{ height: `${Math.max(2, Math.round(h * activePct))}px` }} />
          </div>
        )
      })}
    </div>
  )
}

