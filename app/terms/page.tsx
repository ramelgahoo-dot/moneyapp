export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: May 11, 2026</p>

        <div className="space-y-6 text-gray-300 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Acceptance of Terms</h2>
            <p>By using MoneyApp, you agree to these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Service Description</h2>
            <p>MoneyApp provides tools to track car transactions, expenses, income, investments, and financial reporting.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">User Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Keep your account credentials secure.</li>
              <li>Provide accurate information when using app features.</li>
              <li>Use the app in compliance with applicable laws.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Billing</h2>
            <p>Paid features, if enabled, are billed according to the pricing shown at checkout and may renew unless canceled.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Termination</h2>
            <p>We may suspend or terminate accounts for misuse, fraud, or violations of these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
            <p>For legal or support requests, contact rgprocesses@gmail.com.</p>
          </section>
        </div>
      </div>
    </main>
  )
}
