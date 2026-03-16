const totalSteps = 4

export default function StepHeader({ current, className = '' }) {
  const steps = Array.from({ length: totalSteps })

  return (
    <div className={`mb-6 ${className}`}>
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        {steps.map((_, idx) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            className={`h-1.5 rounded-full flex-1 transition-colors ${
              idx < current ? 'bg-emerald-500' : 'bg-white/10'
            }`}
          />
        ))}
      </div>
      {/* Step label */}
      <div className="flex items-center gap-2 text-[11px] text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>Step {current} of {totalSteps}</span>
      </div>
    </div>
  )
}

