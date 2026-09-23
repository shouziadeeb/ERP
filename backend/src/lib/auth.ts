import type { NextFunction, Request, Response } from 'express'

const LOGIN_USER = process.env.APEX_LOGIN_USER ?? 'ADMIN'
const LOGIN_PASS = process.env.APEX_LOGIN_PASSWORD ?? 'admin1234'
const API_TOKEN = process.env.APEX_API_TOKEN ?? 'apexerp-local-dev-token'

export function loginHandler(req: Request, res: Response) {
  const username = String(req.body.username ?? '').trim().toUpperCase()
  const password = String(req.body.password ?? '')

  if (username !== LOGIN_USER || password !== LOGIN_PASS) {
    res.status(401).json({ error: 'Invalid username or password' })
    return
  }

  res.json({
    token: API_TOKEN,
    displayName: 'Alex Mercer',
    role: 'Lead Controller',
  })
}

export function requireApiAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization ?? ''
  if (auth === `Bearer ${API_TOKEN}`) {
    next()
    return
  }
  res.status(401).json({ error: 'Unauthorized' })
}
