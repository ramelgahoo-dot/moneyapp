import Link from 'next/link'

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">Delete Account</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: May 11, 2026</p>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">How to request deletion</h2>
          <ol className="list-decimal pl-5 space-y-2 text-gray-300">
            <li>Email rgprocesses@gmail.com from the email address tied to your MoneyApp account.</li>
            <li>Use subject line: Account Deletion Request.</li>
            <li>Include your account email and any optional context.</li>
          </ol>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">What is deleted</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-300">
            <li>Profile and authentication data associated with your account.</li>
            <li>User-created records such as cars, income, expenses, and investments.</li>
          </ul>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Timeline</h2>
          <p className="text-gray-300">Deletion requests are typically processed within 7 business days after identity verification.</p>
        </section>

        <div className="text-sm text-gray-300 flex flex-wrap gap-4">
          <Link href="/support" className="text-indigo-300 hover:text-indigo-200">Support</Link>
          <Link href="/privacy-policy" className="text-indigo-300 hover:text-indigo-200">Privacy Policy</Link>
          <Link href="/terms" className="text-indigo-300 hover:text-indigo-200">Terms of Service</Link>
        </div>
      </div>
    </main>
  )
}
