import Link from 'next/link'

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold mb-4">MoneyApp Support</h1>
        <p className="text-gray-300 mb-8">
          Need help with your account, transactions, or app access? Contact support and we will respond as quickly as possible.
        </p>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-gray-300 mb-2">Email: rgprocesses@gmail.com</p>
          <p className="text-gray-400 text-sm">Typical response time: 1 to 2 business days.</p>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-3">Before You Email</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-300">
            <li>Include your app version and iOS version.</li>
            <li>Describe what you were doing when the issue happened.</li>
            <li>Share screenshots when possible.</li>
          </ul>
        </section>

        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-6">
          <h2 className="text-xl font-semibold mb-3">Legal and Account</h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link href="/privacy-policy" className="text-indigo-300 hover:text-indigo-200">Privacy Policy</Link>
            <Link href="/terms" className="text-indigo-300 hover:text-indigo-200">Terms of Service</Link>
            <Link href="/account-deletion" className="text-indigo-300 hover:text-indigo-200">Delete Account</Link>
          </div>
        </section>
      </div>
    </main>
  )
}
