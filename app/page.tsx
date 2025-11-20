import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const configError = params?.error === 'config'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">Talk-To-My-Lawyer</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/auth/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Configuration Error Alert */}
      {configError && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          <Alert variant="destructive">
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Missing Supabase environment variables. Please add the following to your project:
              </p>
              <ul className="list-disc list-inside space-y-1 mb-2">
                <li><code className="text-sm">NEXT_PUBLIC_SUPABASE_URL</code></li>
                <li><code className="text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</code></li>
              </ul>
              <p className="text-sm">
                Find these values in your Supabase project settings at{' '}
                <a 
                  href="https://supabase.com/dashboard/project/_/settings/api" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline"
                >
                  https://supabase.com/dashboard/project/_/settings/api
                </a>
              </p>
              <p className="text-sm mt-2">
                Add them in the <strong>Vars</strong> section of the v0 sidebar.
              </p>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 font-mono text-foreground font-light">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-slate-900 mb-6 text-balance">
            Professional Legal Letters in Minutes
          </h1>
          <p className="text-xl text-slate-600 mb-8 text-pretty">
            Professional legal letter generation with attorney review. Get expertly drafted demand letters, cease and desist notices, and more.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="#pricing">
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Pricing
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">Professional Drafting</h3>
            <p className="text-slate-600">
              Our system generates professional legal letters based on your specific situation and requirements in seconds.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">Attorney Review</h3>
            <p className="text-slate-600">
              Every letter is reviewed and approved by qualified legal professionals before final delivery.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-slate-900">Fast Turnaround</h3>
            <p className="text-slate-600">
              Get your legal letters drafted and reviewed within 24-48 hours for urgent matters.
            </p>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12 text-slate-900">Simple, Transparent Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto font-serif">
            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h3 className="text-xl font-semibold mb-2">Single Letter</h3>
              <div className="text-4xl font-bold mb-4">$299</div>
              <p className="text-slate-600 mb-6">Perfect for one-time legal needs</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">1 Professional Letter</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">Attorney Review</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">PDF Download</span>
                </li>
              </ul>
              <Link href="/auth/signup">
                <Button className="w-full" variant="outline">Get Started</Button>
              </Link>
            </div>

            <div className="bg-blue-600 p-8 rounded-xl shadow-lg border-2 border-blue-700 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-semibold">
                Most Popular
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">Monthly Plan</h3>
              <div className="text-4xl font-bold mb-4 text-white">$299<span className="text-lg">/mo</span></div>
              <p className="text-blue-100 mb-6">4 letters per month, billed yearly</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-200 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-white">4 Letters Monthly</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-200 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-white">Attorney Review</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-200 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-white">Priority Support</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-200 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-white">Cancel Anytime</span>
                </li>
              </ul>
              <Link href="/auth/signup">
                <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">Getarted</Button>
              </Link>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm border">
              <h3 className="text-xl font-semibold mb-2">Annual Plan</h3>
              <div className="text-4xl font-bold mb-4">$599<span className="text-lg">/yr</span></div>
              <p className="text-slate-600 mb-6">8 letters per year, best value</p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">8 Letters Annually</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">Attorney Review</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm">Priority Support</span>
                </li>
              </ul>
              <Link href="/auth/signup">
                <Button className="w-full" variant="outline">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
