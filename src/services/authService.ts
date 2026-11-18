import { ApiError, apiRequest, apiUrl } from './apiClient'

export type AuthSession = {
  user?: {
    id?: string
    name?: string | null
    email?: string | null
  } | null
  expires?: string
} | null

export type RegistrationInput = {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export async function register(input: RegistrationInput, signal?: AbortSignal) {
  return apiRequest('/api/register', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

async function getCsrfToken(signal?: AbortSignal) {
  const data = await apiRequest<{ csrfToken: string }>('/api/auth/csrf', { signal })
  return data.csrfToken
}

export async function getSession(signal?: AbortSignal): Promise<AuthSession> {
  return apiRequest<AuthSession>('/api/auth/session', { signal })
}

export async function login(email: string, password: string, signal?: AbortSignal) {
  const csrfToken = await getCsrfToken(signal)
  const callbackUrl = `${window.location.origin}/#dashboard`
  const body = new URLSearchParams({ csrfToken, callbackUrl, email, password })

  let response: Response
  try {
    response = await fetch(apiUrl('/api/auth/callback/credentials'), {
      method: 'POST',
      credentials: 'include',
      signal,
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Auth-Return-Redirect': '1',
      },
      body,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Unable to reach TaskFlow. Check your network connection.')
  }

  if (!response.ok) {
    const text = await response.text()
    let message = 'Login failed. Check your email and password.'
    try {
      const bodyJson = JSON.parse(text) as { error?: { message?: string } }
      message = bodyJson.error?.message ?? message
    } catch {
      // Auth.js can return a redirect or HTML page for authentication failures.
    }
    throw new ApiError(response.status, message)
  }

  const successText = await response.text()
  if (successText) {
    try {
      const result = JSON.parse(successText) as { url?: string }
      if (result.url?.includes('error=CredentialsSignin') || result.url?.includes('error=') ) {
        throw new ApiError(401, 'Login failed. Check your email and password.')
      }
    } catch (error) {
      if (error instanceof ApiError) throw error
    }
  }

  const session = await getSession(signal)
  if (!session?.user) {
    throw new ApiError(401, 'Login succeeded, but no authenticated session was restored.')
  }
  return session
}

export async function logout(signal?: AbortSignal) {
  const csrfToken = await getCsrfToken(signal)
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl: `${window.location.origin}/#login`,
  })
  return apiRequest('/api/auth/signout', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}
