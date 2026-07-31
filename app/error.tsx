'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-[#f6faff] px-4 py-10 text-[#17335f]">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white/90 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">App error</p>
        <h1 className="mt-2 text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-600">
          The app hit an unexpected error while rendering this page. Refreshing usually recovers it quickly.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-[#2f80ff] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#256fe1]"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Reload page
          </button>
        </div>
        {error?.message ? (
          <p className="mt-4 break-all text-xs text-slate-500">{error.message}</p>
        ) : null}
      </div>
    </div>
  )
}
