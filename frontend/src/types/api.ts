export interface ApiEnvelope<T> {
  data: T
}

export interface ApiErrorBody {
  code: string
  message: string
  details?: unknown
  request_id?: string
}

export type HealthStatus = 'ok' | 'degraded'

export interface HealthCheck {
  status: 'ok' | 'error'
  latency_ms: number
  message?: string
}

export interface HealthPayload {
  status: HealthStatus
  version: string
  uptime_seconds: number
  checks: {
    database: HealthCheck
  }
  timestamp: string
}
