import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Header from './components/Header'
import HeroSection from './components/HeroSection'
import FeaturesSection from './components/FeaturesSection'
import HowItWorksSection from './components/HowItWorksSection'
import PricingSection from './components/PricingSection'
import Footer from './components/Footer'
import CreateAccount from './pages/CreateAccount'
import PaymentProcessing from './pages/PaymentProcessing'
import Download from './pages/Download'
import VerifyEmail from './pages/VerifyEmail'
import PaymentCallback from './pages/PaymentCallback'
import RenewSmartCalender from './pages/RenewSmartCalender'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'

/* ── layout pages ─────────────────────────────────────────── */

/** Home page: hero + pricing */
function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
    </main>
  )
}

/** Standalone pricing page */
function PricingPage() {
  return (
    <main className="pt-8">
      <PricingSection />
    </main>
  )
}

/* ── root layout (header + footer wrapping) ─────────────────── */
function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0d0f14]">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  )
}

/* ── app ─────────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main site with header + footer */}
        <Route path="/" element={<Layout><HomePage /></Layout>} />
        <Route path="/pricing" element={<Layout><PricingPage /></Layout>} />

        {/* Full-screen auth / checkout pages (no header/footer) */}
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/payment" element={<PaymentProcessing />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        <Route path="/renew-smartcalender/:slug" element={<RenewSmartCalender />} />
        <Route path="/download" element={<Download />} />

        {/* Admin (SPA) */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminDashboard />} />

        {/* Fallback */}
        <Route path="*" element={
          <Layout>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
              <h1 className="text-6xl font-extrabold text-white mb-4">404</h1>
              <p className="text-gray-400 text-lg mb-8">This page doesn't exist.</p>
              <a href="/" className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold transition-colors">
                Go home
              </a>
            </div>
          </Layout>
        } />
      </Routes>
    </BrowserRouter>
  )
}
