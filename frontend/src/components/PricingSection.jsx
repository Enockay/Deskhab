import { Link } from 'react-router-dom'

const features = [
  'All calendar views (day / week / month / year)',
  'Unlimited meetings & recurring events',
  'Kanban tasks board with subtasks',
  'Smart reminders per meeting',
  'macOS, Windows & Linux',
  'Renew or cancel from account dashboard',
]

const CheckIcon = () => (
  <svg
    className="w-4 h-4 text-emerald-400 shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

export default function PricingSection() {
  return (
    <section id="pricing" className="py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold tracking-[0.25em] text-emerald-400 uppercase mb-4">
            Pricing
          </p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">
            5-day free trial, then $2/month.
          </h2>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
            Start free for 5 days. After trial, billing is $2/month.
          </p>
        </div>

        {/* Card */}
        <div className="relative rounded-3xl border border-white/10 bg-[#101826] shadow-[0_24px_80px_rgba(15,23,42,0.9)] overflow-hidden">
          {/* subtle top highlight */}
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

          <div className="relative flex flex-col md:flex-row gap-8 p-8 sm:p-10">
            {/* Left: price + description */}
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-400 tracking-[0.2em] uppercase mb-4">
                SmartCalender
              </p>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-5xl font-extrabold text-white">$2</span>
                <span className="text-sm text-gray-400 mt-3">/month</span>
              </div>
              <div className="text-[12px] text-emerald-200/90 mb-4">
                Includes a 5-day free trial.
              </div>

              <p className="text-sm text-gray-300 max-w-md">
                Full access to every feature. Cancel anytime. Renew monthly from your dashboard.
              </p>
            </div>

            {/* Right: features + actions */}
            <div className="flex-1 flex flex-col gap-5">
              <ul className="space-y-3 text-sm text-gray-200">
                {features.map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-2 space-y-3">
                <div className="w-full rounded-xl border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-center text-xs sm:text-sm text-amber-100 font-medium">
                  Start with a 5-day free trial, then $2/month.
                </div>
                <Link
                  to="/create-account?plan=pro"
                  className="block w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm sm:text-base font-semibold py-3.5 text-center transition-colors"
                >
                  Start subscription
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

