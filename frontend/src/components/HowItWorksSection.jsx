const steps = [
  {
    number: 1,
    title: 'Create account',
    body: 'Register free on DesktopHab. No credit card needed to start.',
  },
  {
    number: 2,
    title: '5-day free trial',
    body: 'Full access to all features for 5 days at no cost.',
  },
  {
    number: 3,
    title: 'Add payment',
    body: 'After trial ends, $1/month keeps your access going.',
  },
  {
    number: 4,
    title: 'Download & go',
    body: 'Install for macOS, Windows, or Linux. Log in and start.',
  },
]

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Heading */}
        <p className="text-xs font-semibold tracking-[0.25em] text-emerald-400 uppercase mb-4">
          How it works
        </p>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
          Up and running in minutes
        </h2>
        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-16">
          From sign-up to your first meeting — under five minutes.
        </p>

        {/* Timeline */}
        <div className="relative mt-4">
          {/* horizontal line on desktop */}
          <div className="hidden md:block absolute left-1/2 top-10 h-px w-full -translate-x-1/2 bg-gradient-to-r from-emerald-500/0 via-emerald-500/25 to-emerald-500/0 pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-10">
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center text-center gap-4">
                {/* Number badge */}
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border border-emerald-400/70 bg-[#0c1720] flex items-center justify-center shadow-[0_0_0_1px_rgba(16,185,129,0.18)]">
                    <span className="text-2xl font-semibold text-emerald-400">
                      {step.number}
                    </span>
                  </div>
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl -z-10" />
                </div>

                {/* Copy */}
                <div className="space-y-2 max-w-xs">
                  <h3 className="text-base font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

