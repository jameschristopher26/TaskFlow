export type ApiErrorDetail = {
  path?: string
  message: string
}

export class ApiError extends Error {
  status: number
  code?: string
  details: ApiErrorDetail[]

  constructor(status: number, message: string, code?: string, details: ApiErrorDetail[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? ''

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response

  try {
    response = await fetch(apiUrl(path), {
      ...options,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Unable to reach TaskFlow. Check your network connection.')
  }

  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = null
    }
  }

  if (!response.ok) {
    if (body && typeof body === 'object' && 'error' in body) {
      const error = (body as {
        error: { code?: string; message?: string; details?: ApiErrorDetail[] }
      }).error
      throw new ApiError(
        response.status,
        error.message ?? 'The request could not be completed.',
        error.code,
        error.details ?? [],
      )
    }

    const fallbackMessages: Record<number, string> = {
      400: 'The request contains invalid information.',
      401: 'Your session is unauthenticated or has expired.',
      403: 'The request was rejected by the authentication security policy.',
      404: 'The requested resource was not found.',
      422: 'The task information could not be validated.',
      429: 'Too many requests. Please wait and try again.',
      500: 'TaskFlow encountered a server error.',
    }
    throw new ApiError(
      response.status,
      fallbackMessages[response.status] ?? `The request failed (HTTP ${response.status}).`,
    )
  }

  if (!contentType.includes('json')) {
    throw new ApiError(response.status, 'TaskFlow returned an unexpected response format.')
  }
  return body as T
}
