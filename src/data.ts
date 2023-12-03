export const MMOL_TO_MGDL = 18.018018018

export interface Settings {
  nightscoutTitle: string
  nightscoutUrl: string
  displayUnits: "mgdl" | "mmol"
  targetRangeMgdl: [number, number]
}

export interface GlucoseRecord {
  date: number
  sgv: number
  trend: number
  direction: string
}
