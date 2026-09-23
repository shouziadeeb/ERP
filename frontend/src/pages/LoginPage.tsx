import { useState, type FormEvent } from 'react'
import { Icon } from '../components/Icon'
import { AUTH_STORAGE_KEY, AUTH_TOKEN_KEY } from '../constants/auth'
import { login } from '../services/authService'

interface LoginPageProps {
  onSuccess: () => void
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const result = await login(username, password)
      sessionStorage.setItem(AUTH_TOKEN_KEY, result.token)
      sessionStorage.setItem(AUTH_STORAGE_KEY, '1')
      onSuccess()
    } catch {
      setError('Invalid username or password.')
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

          {error && (
            <div
              className="rounded-lg border border-error-container bg-error-container/40 text-on-error-container px-3 py-2 text-sm flex items-center gap-2"
              role="alert"
            >
              <Icon name="error" className="text-[18px]" />
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
            <input
              type="password"
              className="h-10 px-3 rounded-lg bg-surface-container-low border border-transparent focus:border-primary-container focus:outline-none focus:ring-2 focus:ring-primary-container/20 font-normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={submitting}
              required
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="h-10 mt-1 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
