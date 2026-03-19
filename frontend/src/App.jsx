import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Header from './components/Header'
import HeroSection from './components/HeroSection'
import FeaturesSection from './components/FeaturesSection'
import HowItWorksSection from './components/HowItWorksSection'
import PricingSection from './components/PricingSection'
import Footer from './components/Footer'
import Seo from './components/Seo'
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
import AdminAuthProvider from './context/AdminAuthContext'

/* ── layout pages ─────────────────────────────────────────── */

/** Home page: hero + pricing */
function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SmartCalender',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'macOS, Windows, Linux',
    offers: {
      '@type': 'Offer',
      price: '1',
      priceCurrency: 'USD',
      description: 'First month $1, renewals $2/month',
    },
    url: 'https://www.deskhab.com/',
  }

  return (
    <main>
      <Seo
        title="DesktopHab | SmartCalender for Teams"
        description="SmartCalender from DesktopHab helps you plan meetings, tasks, and reminders on macOS, Windows, and Linux. First month is $1, renewals are $2/month."
        canonicalPath="/"
        jsonLd={jsonLd}
      />
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
      <Seo
        title="Pricing | DesktopHab SmartCalender"
        description="DesktopHab SmartCalender pricing: first month is $1 USD, then renewals are $2/month across macOS, Windows, and Linux."
        canonicalPath="/pricing"
      />
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
        <Route path="/create-account" element={<><Seo title="Create Account" description="Create your DesktopHab account to access SmartCalender for desktop." canonicalPath="/create-account" noindex /><CreateAccount /></>} />
        <Route path="/forgot-password" element={<><Seo title="Forgot Password" description="Reset your DesktopHab account password." canonicalPath="/forgot-password" noindex /><ForgotPassword /></>} />
        <Route path="/reset-password" element={<><Seo title="Reset Password" description="Set a new password for your DesktopHab account." canonicalPath="/reset-password" noindex /><ResetPassword /></>} />
        <Route path="/verify-email" element={<><Seo title="Verify Email" description="Verify your email to continue with DesktopHab account setup." canonicalPath="/verify-email" noindex /><VerifyEmail /></>} />
        <Route path="/payment" element={<><Seo title="Checkout" description="Complete your SmartCalender payment with DesktopHab." canonicalPath="/payment" noindex /><PaymentProcessing /></>} />
        <Route path="/payment/callback" element={<><Seo title="Payment Confirmation" description="Verifying your DesktopHab payment." canonicalPath="/payment/callback" noindex /><PaymentCallback /></>} />
        <Route path="/renew-smartcalender/:slug" element={<><Seo title="Renew Subscription" description="Renew your SmartCalender subscription." canonicalPath="/renew-smartcalender" noindex /><RenewSmartCalender /></>} />
        <Route path="/download" element={<><Seo title="Download SmartCalender" description="Download SmartCalender for macOS, Windows, or Linux from DesktopHab." canonicalPath="/download" noindex /><Download /></>} />

        {/* Admin (SPA) */}
        <Route path="/admin/login" element={<><Seo title="Admin Login" description="DesktopHab admin login." canonicalPath="/admin/login" noindex /><AdminLogin /></>} />
        <Route path="/admin/*" element={<><Seo title="Admin Dashboard" description="DesktopHab admin panel." canonicalPath="/admin" noindex /><AdminAuthProvider><AdminDashboard /></AdminAuthProvider></>} />

        {/* Fallback */}
        <Route path="*" element={
          <Layout>
            <Seo title="404 | DesktopHab" description="Page not found on DesktopHab." canonicalPath="/404" noindex />
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
