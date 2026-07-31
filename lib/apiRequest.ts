type ApiErrorBody = {
  error?: string
}

const API_REQUEST_TIMEOUT_MS = 20000

function isTransientNetworkError(err: unknown) {
  if (!(err instanceof Error)) return false
  const message = err.message.toLowerCase()
  return (
    err.name === 'AbortError' ||
    message.includes('failed to fetch') ||
    message.includes('fetch failed') ||
    message.includes('networkerror') ||
    message.includes('load failed')
  )
}

function withTimeout(init?: RequestInit) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS)
  const externalSignal = init?.signal

  const forwardAbort = () => controller.abort()

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', forwardAbort, { once: true })
    }
  }

  return {
    requestInit: { ...init, signal: controller.signal },
    cleanup: () => {
      clearTimeout(timeoutId)
      externalSignal?.removeEventListener('abort', forwardAbort)
    },
    didTimeout: () => controller.signal.aborted && !externalSignal?.aborted,
  }
}

export async function apiRequest(path: string, init?: RequestInit) {
  async function executeFetch() {
    const { requestInit, cleanup, didTimeout } = withTimeout(init)

    try {
      return await fetch(path, requestInit)
    } catch (err) {
      if (didTimeout()) {
        throw new Error('Request timed out. Check your connection and try again.')
      }
      throw err
    } finally {
      cleanup()
    }
  }

  let res: Response

  try {
    res = await executeFetch()
  } catch (err) {
    if (isTransientNetworkError(err)) {
      // Retry once for mobile webview connection blips.
      try {
        res = await executeFetch()
      } catch {
        throw new Error('Network request failed. Check internet access, disable VPN/Private Relay, and try again.')
      }
    } else {
      throw err
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as ApiErrorBody))
    throw new Error(body.error ?? 'Request failed')
  }

  return res
}
