import { API_BASE_URL } from '@/services/api'
import type { ApiEnvelope, HealthPayload } from '@/types/api'

export interface HealthResult {
  httpStatus: number
  health: HealthPayload
}

/**
 * Reads the health payload as-is, including degraded (HTTP 503) responses,
 * so the UI can explain what is broken instead of only failing.
 */
export async function fetchHealth(): Promise<HealthResult> {
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/health`, {
      headers: { Accept: 'application/json' },
    })
  } catch {
    throw new Error('Tidak dapat menghubungi API.')
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<HealthPayload> | null

  if (!payload?.data) {
    throw new Error('Respons health tidak valid.')
  }

  return { httpStatus: response.status, health: payload.data }
}
