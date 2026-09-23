import { fetchJson } from '../lib/http'

export async function login(username: string, password: string) {
  return fetchJson<{ token: string; displayName: string; role: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
