import { useState } from 'react'
import { Link } from 'react-router-dom'

import dashboardImg from '../assets/dashboard.png'
import remindersImg from '../assets/reminders.png'
import todoListImg from '../assets/todolist.png'
import taskboardImg from '../assets/taskboard.png'
import yearTodoImg from '../assets/yeartodo.png'

const StatCard = ({ value, label }) => (
  <div className="flex flex-col items-center gap-1">
    <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{value}</span>
    <span className="text-sm text-emerald-200">{label}</span>
  </div>
)

const FeaturePill = ({ icon, text }) => (
  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/10 text-sm text-gray-300">
    <span>{icon}</span>
    <span>{text}</span>
  </div>
)

const previewTabs = [
  { id: 'dashboard', label: 'Dashboard', img: dashboardImg },
  { id: 'reminders', label: 'Reminders', img: remindersImg },
  { id: 'todolist', label: 'Todo List', img: todoListImg },
  { id: 'taskboard', label: 'Tasks Board', img: taskboardImg },
  { id: 'year', label: 'Year view', img: yearTodoImg },
]

export default function HeroSection() {
  const [activeTab, setActiveTab] = useState('dashboard')

  const active = previewTabs.find((tab) => tab.id === activeTab) ?? previewTabs[0]

  return (
    <section className="relative bg-[#0d0f14] overflow-hidden">
      {/* Gradient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-120px] left-1/2 -translate-x-1/2 w-[700px] h-[400px]
                        rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-1/3 right-[-100px] w-[400px] h-[400px]
                        rounded-full bg-indigo-500/8 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full border border-emerald-500/30
                        bg-emerald-500/10 text-emerald-300 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          SmartCalender v1.0 — now available
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-5xl lg:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
          Desktop apps that
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            {' '}respect your time
          </span>
        </h1>

        {/* Subline */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-400 leading-relaxed mb-10">
          DesktopHab delivers native productivity software for macOS, Windows & Linux.
          Start with SmartCalender — first month is $1, then renewals are $2/month.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            to="/create-account"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400
                       text-white font-semibold text-base shadow-lg shadow-emerald-500/25
                       transition-all hover:shadow-emerald-400/40 hover:-translate-y-0.5"
          >
            Get started
          </Link>
          <a
            href="#pricing"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/20
                       text-white font-semibold text-base hover:border-white/40 hover:bg-white/8
                       transition-all flex items-center justify-center gap-2"
          >
            See pricing
          </a>
        </div>

        {/* Platform pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-16">
          <FeaturePill icon="⊕" text="macOS" />
          <FeaturePill icon="▢" text="Windows" />
          <FeaturePill icon="👤" text="Linux" />
        </div>

        {/* SmartCalender stats strip */}
        <div className="inline-flex flex-wrap justify-center items-center gap-10 px-12 py-6
                        rounded-xl bg-emerald-500/8 border border-emerald-400/40 mb-10 shadow-[0_18px_60px_rgba(16,185,129,0.25)]">
          <StatCard value="$1" label="first month" />
          <div className="hidden sm:block w-px h-10 bg-emerald-400/40" />
          <StatCard value="$2" label="then $2/month" />
          <div className="hidden sm:block w-px h-10 bg-emerald-400/40" />
          <StatCard value="3 OS" label="platforms" />
          <div className="hidden sm:block w-px h-10 bg-emerald-400/40" />
          <StatCard value="1-click" label="install" />
        </div>

        {/* SmartCalender preview carousel using real screenshots */}
        <div className="mt-16 relative mx-auto max-w-5xl">
          <div className="absolute inset-0 rounded-[40px] bg-gradient-to-b from-emerald-500/12 via-transparent to-sky-500/10 pointer-events-none" />

          {/* Tabs */}
          <div className="relative z-10 mb-4 flex flex-wrap gap-2 justify-center">
            {previewTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all border
                  ${
                    activeTab === tab.id
                      ? 'bg-white text-black border-white shadow-lg shadow-black/40'
                      : 'bg-black/40 text-gray-300 border-white/20 hover:border-white/50 hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Image frame with stronger glass / glow */}
          <div className="relative rounded-[40px] border border-white/12 bg-gradient-to-b from-white/8 via-white/5 to-white/3 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,0.85)] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/14 via-transparent to-sky-500/16 pointer-events-none" />

            <div className="relative group">
              <div className="mx-auto max-w-5xl px-6 pt-6 pb-8 md:px-10 md:pt-8 md:pb-10">
                <img
                  key={active.id}
                  src={active.img}
                  alt={active.label}
                  className="w-full h-auto max-h-[520px] object-contain rounded-[32px] shadow-[0_22px_60px_rgba(15,23,42,0.85)] transform transition-all duration-700 ease-out group-hover:scale-[1.02] group-hover:-translate-y-1"
                />
              </div>

              {/* Base glow under the window */}
              <div className="pointer-events-none absolute -bottom-28 left-1/2 -translate-x-1/2 w-[72%] h-40 bg-emerald-500/30 blur-3xl opacity-70" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
