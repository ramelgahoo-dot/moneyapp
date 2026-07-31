export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: April 16, 2026</p>

        <div className="space-y-6 text-gray-300 leading-7">
          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Overview</h2>
            <p>
              MoneyApp Finance Ledger helps users track car flipping activity, income, expenses, and related reporting.
              This policy explains what information is handled and how it is used.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Information We Handle</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Account information required to sign in.</li>
              <li>Financial records you enter, including vehicle, income, expense, and investment data.</li>
              <li>Technical data needed for reliability and security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">How Information Is Used</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide core app functionality and reporting.</li>
              <li>To secure accounts and prevent misuse.</li>
              <li>To maintain and improve app performance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Data Sharing</h2>
            <p>
              We do not sell personal information. Data is shared only with service providers required to operate the app,
              such as hosting and database infrastructure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Data Retention</h2>
            <p>
              Data is retained while your account is active, or as needed to provide services and satisfy legal obligations.
              You can request account deletion by following instructions on the Delete Account page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-2">Contact</h2>
            <p>
              For privacy questions or requests, contact: rgprocesses@gmail.com
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
