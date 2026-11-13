/**
 * Formatting helpers for map measurements. Values are always computed in the
 * project metric CRS (EPSG:32749), never from degrees.
 */

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`
  }
  return `${(meters / 1000).toFixed(2)} km`
}

export function formatArea(squareMeters: number): string {
  if (squareMeters < 10_000) {
    return `${squareMeters.toFixed(0)} m²`
  }
  return `${(squareMeters / 10_000).toFixed(2)} ha`
}

export function formatCoordinate(value: number, digits = 5): string {
  return value.toFixed(digits)
}

export function formatMetric(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)
}
