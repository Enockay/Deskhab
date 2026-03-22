const sectionTitle = 'text-xl font-semibold text-white mt-8 mb-2'
const paragraph = 'text-gray-300 leading-relaxed'
const list = 'list-disc pl-5 text-gray-300 space-y-1'

function LegalWrapper({ title, effectiveDate, children }) {
  return (
    <main className="pt-10 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">{title}</h1>
        <p className="text-sm text-gray-400 mb-8">Effective date: {effectiveDate}</p>
        <div className="space-y-4">{children}</div>
      </div>
    </main>
  )
}

export function PrivacyPolicyPageContent() {
  return (
    <LegalWrapper title="Privacy Policy" effectiveDate="March 22, 2026">
      <p className={paragraph}>
        Deskhab ("we", "our", "us") values your privacy. This Privacy Policy explains what information we collect, how we use it,
        and the choices you have when using Deskhab products and services, including SmartCalender.
      </p>
      <h2 className={sectionTitle}>Information we collect</h2>
      <ul className={list}>
        <li>Account details such as name, email, and authentication identifiers.</li>
        <li>Subscription and billing metadata required to manage access and payments.</li>
        <li>Technical diagnostics such as device, OS, app version, and error logs.</li>
        <li>Usage events needed to improve reliability, security, and product experience.</li>
      </ul>
      <h2 className={sectionTitle}>How we use information</h2>
      <ul className={list}>
        <li>Provide core product features and account management.</li>
        <li>Process subscriptions, renewals, and payment verification.</li>
        <li>Prevent fraud, abuse, and unauthorized access.</li>
        <li>Improve performance, quality, and customer support.</li>
      </ul>
      <h2 className={sectionTitle}>Data sharing</h2>
      <p className={paragraph}>
        We do not sell personal information. We may share data with trusted processors (e.g., hosting, analytics, and payment partners)
        strictly to operate Deskhab services, and only under contractual safeguards.
      </p>
      <h2 className={sectionTitle}>Retention</h2>
      <p className={paragraph}>
        We retain data for as long as needed to provide services, comply with legal obligations, resolve disputes, and enforce agreements.
        When data is no longer required, we delete or anonymize it.
      </p>
      <h2 className={sectionTitle}>Your choices and rights</h2>
      <ul className={list}>
        <li>Request access, correction, or deletion of personal data where applicable.</li>
        <li>Opt out of non-essential communications.</li>
        <li>Contact us to ask questions about your privacy rights.</li>
      </ul>
      <h2 className={sectionTitle}>Contact</h2>
      <p className={paragraph}>
        For privacy requests, email <a className="text-emerald-300" href="mailto:support@deskhab.com">support@deskhab.com</a>.
      </p>
    </LegalWrapper>
  )
}

export function TermsOfServicePageContent() {
  return (
    <LegalWrapper title="Terms of Service" effectiveDate="March 22, 2026">
      <p className={paragraph}>
        By accessing or using Deskhab services, you agree to these Terms of Service. If you do not agree, do not use the services.
      </p>
      <h2 className={sectionTitle}>Account responsibilities</h2>
      <ul className={list}>
        <li>You are responsible for maintaining account confidentiality and access credentials.</li>
        <li>You agree to provide accurate information and keep it up to date.</li>
        <li>You are responsible for activity that occurs under your account.</li>
      </ul>
      <h2 className={sectionTitle}>Acceptable use</h2>
      <ul className={list}>
        <li>Do not misuse, disrupt, reverse engineer, or attempt unauthorized access.</li>
        <li>Do not use the service to violate laws or third-party rights.</li>
        <li>Do not upload malicious content, malware, or abusive material.</li>
      </ul>
      <h2 className={sectionTitle}>Subscriptions and billing</h2>
      <p className={paragraph}>
        Paid plans, trials, and renewal terms are shown during checkout. By purchasing, you authorize payment processing under the selected plan.
        Fees are generally non-refundable except where required by law.
      </p>
      <h2 className={sectionTitle}>Service availability</h2>
      <p className={paragraph}>
        We aim for reliable availability but do not guarantee uninterrupted operation. We may modify, suspend, or discontinue features at any time.
      </p>
      <h2 className={sectionTitle}>Limitation of liability</h2>
      <p className={paragraph}>
        To the maximum extent permitted by law, Deskhab is not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the services.
      </p>
      <h2 className={sectionTitle}>Termination</h2>
      <p className={paragraph}>
        We may suspend or terminate accounts that violate these terms or create security risk. You may stop using the services at any time.
      </p>
      <h2 className={sectionTitle}>Contact</h2>
      <p className={paragraph}>
        Questions about these terms can be sent to <a className="text-emerald-300" href="mailto:support@deskhab.com">support@deskhab.com</a>.
      </p>
    </LegalWrapper>
  )
}

export function CookiePolicyPageContent() {
  return (
    <LegalWrapper title="Cookie Policy" effectiveDate="March 22, 2026">
      <p className={paragraph}>
        This Cookie Policy explains how Deskhab uses cookies and similar technologies to operate, secure, and improve our services.
      </p>
      <h2 className={sectionTitle}>What are cookies</h2>
      <p className={paragraph}>
        Cookies are small text files stored in your browser or device. They help sites remember information such as preferences and session state.
      </p>
      <h2 className={sectionTitle}>Types of cookies we use</h2>
      <ul className={list}>
        <li>Essential cookies: required for login, security, and core functionality.</li>
        <li>Performance cookies: help us understand app performance and reliability.</li>
        <li>Preference cookies: remember display or user experience settings.</li>
      </ul>
      <h2 className={sectionTitle}>How to manage cookies</h2>
      <p className={paragraph}>
        You can adjust browser settings to block or delete cookies. Some features may not function correctly if essential cookies are disabled.
      </p>
      <h2 className={sectionTitle}>Third-party technologies</h2>
      <p className={paragraph}>
        Some third-party services may set cookies as part of payment processing, infrastructure, or analytics. Their use is governed by their own policies.
      </p>
      <h2 className={sectionTitle}>Contact</h2>
      <p className={paragraph}>
        For cookie-related questions, contact <a className="text-emerald-300" href="mailto:support@deskhab.com">support@deskhab.com</a>.
      </p>
    </LegalWrapper>
  )
}

export function SecurityPageContent() {
  return (
    <LegalWrapper title="Security" effectiveDate="March 22, 2026">
      <p className={paragraph}>
        Deskhab uses administrative, technical, and organizational measures designed to protect customer information and service integrity.
      </p>
      <h2 className={sectionTitle}>Security controls</h2>
      <ul className={list}>
        <li>Encryption in transit for network communication.</li>
        <li>Role-based access controls for administrative operations.</li>
        <li>Audit logging for critical management actions.</li>
        <li>Monitoring and alerting for abnormal service behavior.</li>
      </ul>
      <h2 className={sectionTitle}>Infrastructure and data protection</h2>
      <p className={paragraph}>
        We rely on trusted cloud infrastructure and apply security best practices around secrets management, access restrictions, and backup strategies.
      </p>
      <h2 className={sectionTitle}>Vulnerability disclosure</h2>
      <p className={paragraph}>
        If you discover a potential vulnerability, please report it responsibly to{' '}
        <a className="text-emerald-300" href="mailto:support@deskhab.com">support@deskhab.com</a>. Include reproduction steps and impact details where possible.
      </p>
      <h2 className={sectionTitle}>Your role</h2>
      <ul className={list}>
        <li>Use strong passwords and keep account credentials private.</li>
        <li>Keep your operating system and Deskhab app up to date.</li>
        <li>Report suspicious account activity promptly.</li>
      </ul>
    </LegalWrapper>
  )
}

