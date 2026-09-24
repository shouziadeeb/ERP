/**
 * Sign-in screen: password visibility toggle, cold-start hint, retries via authService.login.
 */
import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { AUTH_STORAGE_KEY, AUTH_TOKEN_KEY } from '../constants/auth'
import { LoginError, login } from '../services/authService'

interface LoginPageProps {
  onSuccess: () => void
}

const SERVER_WAKING_MESSAGE =
  'The server is waking up. This may take a few seconds on the first request. Please wait or refresh the page if needed.'

const UNAVAILABLE_MESSAGE =
  'We could not sign you in right now. Please wait a moment and try again, or refresh the page.'

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [serverWaking, setServerWaking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setServerWaking(false)
    setSubmitting(true)

    try {
      const result = await login(username, password, {
        onSlowRequest: () => setServerWaking(true),
      })
      sessionStorage.setItem(AUTH_TOKEN_KEY, result.token)
      sessionStorage.setItem(AUTH_STORAGE_KEY, '1')
      onSuccess()
    } catch (err) {
      if (err instanceof LoginError) {
        if (err.reason === 'invalid_credentials') {
          setError('Invalid username or password.')
          setServerWaking(false)
        } else {
          setError(UNAVAILABLE_MESSAGE)
        }
      } else {
        setError(UNAVAILABLE_MESSAGE)
      }
    }

    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-surface-container-lowest shadow-[0_20px_40px_rgba(15,23,42,0.12)] border border-surface-container overflow-hidden">
        <div className="px-6 py-5 bg-surface-container-low border-b border-surface-container">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-on-primary">
              <Icon name="corporate_fare" className="text-[20px]" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-on-surface tracking-tight">
                ApexERP
              </h1>
              <p className="text-xs text-secondary uppercase tracking-wider font-semibold">
                Enterprise Sign In
              </p>
            </div>
          </div>
        </div>

        <form className="p-6 flex flex-col gap-4" onSubmit={handleSubmit}>
          <p className="text-sm text-secondary m-0">
            Sign in to access ApexERP operations, inventory, and workforce modules.
          </p>

          {serverWaking && !error && (
            <div
              className="rounded-lg border border-primary-container/40 bg-primary-container/15 text-on-surface px-3 py-2.5 text-sm flex items-start gap-2"
              role="status"
              aria-live="polite"
            >
              <Icon name="schedule" className="text-[18px] shrink-0 mt-0.5 text-primary" />
              <span>{SERVER_WAKING_MESSAGE}</span>
            </div>
          )}

          {error && (
            <div
              className="rounded-lg border border-error-container bg-error-container/40 text-on-error-container px-3 py-2 text-sm flex items-center gap-2"
              role="alert"
            >
              <Icon name="error" className="text-[18px] shrink-0" />
              {error}
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface">
            Username
            <input
              className="h-10 px-3 rounded-lg bg-surface-container-low border border-transparent focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-container/20 font-normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ADMIN"
              autoComplete="username"
              disabled={submitting}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-semibold text-on-surface">
            Password
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="h-10 w-full pl-3 pr-10 rounded-lg bg-surface-container-low border border-transparent focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-container/20 font-normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={submitting}
                required
              />
              <button
                type="button"
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-md flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container disabled:opacity-50"
                onClick={() => setShowPassword((v) => !v)}
                disabled={submitting}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="h-10 mt-1 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {submitting ? (serverWaking ? 'Connecting…' : 'Signing in…') : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
