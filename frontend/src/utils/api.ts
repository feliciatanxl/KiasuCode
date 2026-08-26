interface ApiResponse<T> {
  data: T
  status: number
}

const apiBaseUrl = import.meta.env.VITE_AUTH_API_URL?.trim() ?? ''

export async function apiRequest<T>(
  path: string,
  sessionToken: string,
  init: RequestInit = {},
): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${sessionToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: string })
    | null

  if (!response.ok) {
    throw new Error(data?.error || `API request failed (${response.status}).`)
  }

  if (!data) {
    throw new Error('The API returned an empty response.')
  }

  return { data, status: response.status }
}

export function formatApiError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load academic data.'
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
