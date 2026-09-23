import { apiUrl } from '../config/api'
import { AUTH_STORAGE_KEY, AUTH_TOKEN_KEY } from '../constants/auth'
import type { PaginatedResult } from '../types/pagination'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function authHeaders(): Record<string, string> {
  const token = sessionStorage.getItem(AUTH_TOKEN_KEY)
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init?.headers ?? {}) },
    ...init,
  })

  if (response.status === 401 && path !== '/api/auth/login') {
    sessionStorage.removeItem(AUTH_STORAGE_KEY)
    sessionStorage.removeItem(AUTH_TOKEN_KEY)
    window.location.href = '/'
    throw new ApiError('Session expired', 401)
  }

  if (!response.ok) {
    const body = await response.text()
    throw new ApiError(body || `HTTP ${response.status}`, response.status)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function toQuery(params: object): string {
  const entries = Object.entries(params as Record<string, string | number | undefined>)
  const search = new URLSearchParams()
  for (const [key, value] of entries) {
    if (value === undefined || value === '' || value === 'all') continue
    search.set(key, String(value))
  }
  const q = search.toString()
  return q ? `?${q}` : ''
}

export type { PaginatedResult }
