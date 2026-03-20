const features = [
  {
    icon: '📅',
    badge: 'Day, week, month & year',
    title: 'Day, week, month & year',
    body: 'Four calendar views. Switch instantly to see your schedule at the right zoom level.',
    accent: 'from-emerald-500/30 to-emerald-500/5',
  },
  {
    icon: '🗂️',
    badge: 'Kanban tasks board',
    title: 'Kanban tasks board',
    body: 'Drag tasks across Backlog → In Progress → Done. Track subtasks, tags, and deadlines.',
    accent: 'from-violet-500/30 to-violet-500/5',
  },
  {
    icon: '🔔',
    badge: 'Smart reminders',
    title: 'Smart reminders',
    body: 'Custom per-meeting notification timing. Never miss a meeting or deadline.',
    accent: 'from-amber-500/30 to-amber-500/5',
  },
  {
    icon: '🔁',
    badge: 'Recurring events',
    title: 'Recurring events',
    body: 'Daily, weekly or monthly recurrence, auto-expanded across your calendar.',
    accent: 'from-emerald-500/30 to-emerald-500/5',
  },
  {
    icon: '👤',
    badge: 'Account-based login',
    title: 'Account-based login',
    body: 'Create your account on Deskhab, log in on the app — your plan unlocks instantly.',
    accent: 'from-sky-500/30 to-sky-500/5',
  },
  {
    icon: '📨',
    badge: 'Mini calendar sidebar',
    title: 'Mini calendar sidebar',
    body: 'Jump to any date from the persistent sidebar. Full month context always visible.',
    accent: 'from-fuchsia-500/30 to-fuchsia-500/5',
  },
]

export default function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold tracking-[0.25em] text-emerald-400 uppercase mb-4">
            Features
          </p>
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-3">
            Everything in one place
          </h2>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
            SmartCalender packs scheduling, tasks, and reminders into a fast native desktop app.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="relative rounded-3xl bg-[#182333] border border-white/10 shadow-[0_22px_70px_rgba(15,23,42,0.8)] overflow-hidden group hover:border-emerald-400/50 hover:bg-[#1c293b] transition-colors"
            >
              {/* subtle inner gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-80 transition-opacity duration-500`}
              />
              <div className="relative p-6 sm:p-7 flex flex-col gap-4">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-400/40 text-emerald-200 text-lg shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                  <span aria-hidden="true">{feature.icon}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white mb-1 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {feature.body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

