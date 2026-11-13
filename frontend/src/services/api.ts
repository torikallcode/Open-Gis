export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

export interface ApiMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface FieldError {
  field: string
  message: string
}

interface ErrorPayload {
  error?: {
    code?: string
    message?: string
    request_id?: string
    details?: FieldError[]
  }
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string
  readonly details: FieldError[]

  constructor(
    message: string,
    status: number,
    code: string,
    requestId?: string,
    details: FieldError[] = [],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.details = details
  }
}

type QueryValue = string | number | boolean | undefined | null

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, QueryValue>
  body?: unknown
  signal?: AbortSignal
}

interface SuccessPayload<T> {
  data?: T
  meta?: ApiMeta
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options)

  if (response.status === 204) {
    return undefined as T
  }

  const payload = await readJson<T>(response)

  if (!response.ok || !payload || payload.data === undefined) {
    throw buildError(response, payload)
  }

  return payload.data
}

export async function requestWithMeta<T>(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: T; meta: ApiMeta }> {
  const response = await send(path, options)
  const payload = await readJson<T>(response)

  if (!response.ok || !payload || payload.data === undefined) {
    throw buildError(response, payload)
  }

  return {
    data: payload.data,
    meta: payload.meta ?? { page: 1, per_page: 0, total: 0, total_pages: 0 },
  }
}

export function fieldErrorMap(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) {
    return {}
  }

  const map: Record<string, string> = {}
  for (const detail of error.details) {
    map[detail.field] = detail.message
  }
  return map
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  try {
    return await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch {
    throw new ApiError('Tidak dapat menghubungi server.', 0, 'network_error')
  }
}

async function readJson<T>(response: Response): Promise<SuccessPayload<T> & ErrorPayload | null> {
  if (response.status === 204) {
    return null
  }
  return (await response.json().catch(() => null)) as
    | (SuccessPayload<T> & ErrorPayload)
    | null
}

function buildError(response: Response, payload: (SuccessPayload<unknown> & ErrorPayload) | null) {
  return new ApiError(
    payload?.error?.message ?? 'Permintaan gagal.',
    response.status,
    payload?.error?.code ?? 'unknown_error',
    payload?.error?.request_id,
    payload?.error?.details ?? [],
  )
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const url = `${API_BASE_URL}${path}`
  if (!query) {
    return url
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue
    }
    params.set(key, String(value))
  }

  const queryString = params.toString()
  return queryString ? `${url}?${queryString}` : url
}
