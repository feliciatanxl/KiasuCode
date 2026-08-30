interface ApiResponse<T> {
  data: T
  status: number
}

export interface ServerErrorInfo {
  status: 500 | 502 | 503
  message: string
  code?: string
}

const configuredApiBaseUrl =
  (import.meta.env.VITE_API_URL || import.meta.env.VITE_AUTH_API_URL)?.trim().replace(/\/$/, '') ?? ''
const localApiBaseUrl = 'http://localhost:3000'
let unauthorizedHandler: (() => void) | null = null
let serverErrorHandler: ((error: ServerErrorInfo) => void) | null = null
let lastServerErrorNotificationAt = 0

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getErrorDetails(
  body: unknown,
  status: number,
): { message: string; code?: string } {
  if (isRecord(body)) {
    const message = typeof body.message === 'string'
      ? body.message
      : typeof body.error === 'string'
        ? body.error
        : null
    const code = typeof body.code === 'string' ? body.code : undefined

    if (message) return { message, ...(code ? { code } : {}) }
  }

  return { message: `API request failed (${status}).` }
}

function getFriendlyServerMessage(status: 500 | 502 | 503): string {
  if (status === 502) {
    return 'The server gateway is not responding. Please try again shortly.'
  }

  if (status === 503) {
    return 'KiasuCode is temporarily unavailable. Please try again shortly.'
  }

  return 'Something went wrong on our server. Your changes may not have been saved.'
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined

  constructor(status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function getApiBaseUrl(): string {
  if (configuredApiBaseUrl) return configuredApiBaseUrl
  if (import.meta.env.DEV) return localApiBaseUrl

  throw new Error('VITE_API_URL or VITE_AUTH_API_URL must be configured in production.')
}

export function setUnauthorizedHandler(handler: () => void): () => void {
  unauthorizedHandler = handler

  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null
  }
}

export function setServerErrorHandler(
  handler: (error: ServerErrorInfo) => void,
): () => void {
  serverErrorHandler = handler

  return () => {
    if (serverErrorHandler === handler) serverErrorHandler = null
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const body: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const details = getErrorDetails(body, response.status)

    if (response.status === 401) unauthorizedHandler?.()

    if (
      response.status === 500
      || response.status === 502
      || response.status === 503
    ) {
      const now = Date.now()

      if (now - lastServerErrorNotificationAt > 1_500) {
        lastServerErrorNotificationAt = now
        serverErrorHandler?.({
          status: response.status,
          message: getFriendlyServerMessage(response.status),
          ...(details.code ? { code: details.code } : {}),
        })
      }
    }

    throw new ApiError(response.status, details.message, details.code)
  }

  if (body === null) throw new Error('The API returned an empty response.')

  return { data: body as T, status: response.status }
}

export function formatApiError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load application data.'
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
