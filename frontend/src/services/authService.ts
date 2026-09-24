import { apiUrl } from '../config/api'
import { ApiError } from '../lib/http'

export class LoginError extends Error {
  readonly reason: 'invalid_credentials' | 'unavailable'

  constructor(reason: 'invalid_credentials' | 'unavailable') {
    super(reason)
    this.name = 'LoginError'
    this.reason = reason
  }
}

export interface LoginCallbacks {
  /** Fired when the sign-in request is taking longer than usual (e.g. cold start). */
  onSlowRequest?: () => void
}

const LOGIN_PATH = '/api/auth/login'
const MAX_ATTEMPTS = 3
const SLOW_REQUEST_MS = 2000
const RETRY_DELAY_MS = [900, 1800]

type LoginResult = { token: string; displayName: string; role: string }

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function shouldRetryLogin(error: unknown, attemptIndex: number): boolean {
  if (attemptIndex >= MAX_ATTEMPTS - 1) return false
  if (error instanceof ApiError) {
    if (error.status === 401) return false
    return error.status === 408 || error.status === 429 || error.status >= 500
  }
  return true
}

async function fetchLoginOnce(body: string, onSlowRequest?: () => void): Promise<LoginResult> {
  let slowTimer: ReturnType<typeof setTimeout> | undefined
  if (onSlowRequest) {
    slowTimer = setTimeout(onSlowRequest, SLOW_REQUEST_MS)
  }

  try {
    const response = await fetch(apiUrl(LOGIN_PATH), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    })

    if (response.status === 401) {
      throw new ApiError('Unauthorized', 401)
    }

    if (!response.ok) {
      throw new ApiError('Request failed', response.status)
    }

    return (await response.json()) as LoginResult
  } finally {
    if (slowTimer) clearTimeout(slowTimer)
  }
}

export async function login(
  username: string,
  password: string,
  callbacks?: LoginCallbacks,
): Promise<LoginResult> {
  const body = JSON.stringify({ username, password })
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS[attempt - 1] ?? 1500)
    }

    try {
      return await fetchLoginOnce(body, callbacks?.onSlowRequest)
    } catch (error) {
      lastError = error
      if (!shouldRetryLogin(error, attempt)) break
    }
  }

  if (lastError instanceof ApiError && lastError.status === 401) {
    throw new LoginError('invalid_credentials')
  }

  throw new LoginError('unavailable')
}
