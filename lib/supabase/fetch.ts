const SUPABASE_REQUEST_TIMEOUT_MS = 15000

const SUPABASE_TIMEOUT_MESSAGE =
  `Supabase request timed out after ${SUPABASE_REQUEST_TIMEOUT_MS / 1000} seconds. Check your Supabase project status and network connection.`

export async function supabaseFetchWithTimeout(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS)
  const externalSignal = init?.signal

  const forwardAbort = () => controller.abort()

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', forwardAbort, { once: true })
    }
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (err) {
    if (controller.signal.aborted && !externalSignal?.aborted) {
      throw new Error(SUPABASE_TIMEOUT_MESSAGE)
    }

    throw err
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', forwardAbort)
  }
}