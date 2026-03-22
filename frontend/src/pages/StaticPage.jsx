import Seo from '../components/Seo'

export default function StaticPage({ title, children }) {
  return (
    <main className="pt-10 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">{title}</h1>
        <p className="text-gray-400 mb-8">
          {children || 'This page is now live. Content will be expanded shortly.'}
        </p>
        <div className="prose prose-invert max-w-none">
          <h2>Need help?</h2>
          <p>
            Email us at{' '}
            <a className="text-emerald-300" href="mailto:support@deskhab.com">
              support@deskhab.com
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}

