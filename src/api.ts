import { type GlucoseRecord, type Settings, MMOL_TO_MGDL } from "./data"
import { TIMEOUT_STATUS, TIMEOUT_CGM_DATA } from "./config"

export async function getGlucoseData(nightscoutUrl: string, token: string, count: number): Promise<GlucoseRecord[]> {
  console.log(`Fetching ${count} glucose records...`)
  const response = await fetch(`${nightscoutUrl}/api/v1/entries/sgv.json?count=${count}&token=${token}`, {
    signal: AbortSignal.timeout(TIMEOUT_CGM_DATA),
  })
  return await response.json()
}

export async function getSettings(nightscoutUrl: string, token: string): Promise<Settings> {
  // Download NS settings and status and cherry-pick the bits we need.
  console.log(`Fetching settings...`)
  const response = await fetch(`${nightscoutUrl}/api/v1/status.json?token=${token}`, {
    signal: AbortSignal.timeout(TIMEOUT_STATUS),
  })
  const status: any = await response.json()
  // Convert mmol/l to mg/dl if necessary. It's not clear when Nightscout returns the target range in mmol/l and when in mg/dl.
  // See the discussion in https://github.com/vitawasalreadytaken/glucoscape/pull/3
  // We guess the units from the target range values: CGMs typically can't measure values over 30 mmol/l,
  // and at the same time it makes no sense to set the target range top below 30 mg/dl (1.6 mmol/l).
  const targetRangeConversionToMgdl = status.settings.thresholds.bgTargetTop >= 30 ? 1 : MMOL_TO_MGDL
  return {
    nightscoutTitle: status.settings.customTitle,
    nightscoutUrl,
    displayUnits: status.settings.units,
    targetRangeMgdl: [status.settings.thresholds.bgTargetBottom, status.settings.thresholds.bgTargetTop].map(
      (x: number) => x * targetRangeConversionToMgdl,
    ) as [number, number],
  }
}
