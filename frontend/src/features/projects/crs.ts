export interface CRSPreset {
  value: number
  label: string
  hemisphere: 'S' | 'N'
}

const SOUTH_ZONES = [46, 47, 48, 49, 50, 51, 52, 53, 54]
const NORTH_ZONES = [46, 47, 48, 49, 50, 51, 52, 53, 54]

export const CRS_PRESETS: CRSPreset[] = [
  ...SOUTH_ZONES.map((zone) => ({
    value: 32700 + zone,
    label: `UTM ${zone}S — EPSG:${32700 + zone}`,
    hemisphere: 'S' as const,
  })),
  ...NORTH_ZONES.map((zone) => ({
    value: 32600 + zone,
    label: `UTM ${zone}N — EPSG:${32600 + zone}`,
    hemisphere: 'N' as const,
  })),
]

export const DEFAULT_CRS_EPSG = 32749

export function isCRSPreset(value: number): boolean {
  return CRS_PRESETS.some((preset) => preset.value === value)
}

export function crsLabel(value: number): string {
  return CRS_PRESETS.find((preset) => preset.value === value)?.label ?? `EPSG:${value}`
}
