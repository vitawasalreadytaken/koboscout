import { type GlucoseRecord, type Settings, MMOL_TO_MGDL } from "./data"

const TREND_TO_SYMBOL = {
  None: "",
  DoubleUp: "↑↑",
  SingleUp: "↑",
  FortyFiveUp: "↗",
  Flat: "→",
  FortyFiveDown: "↘",
  SingleDown: "↓",
  DoubleDown: "↓↓",
  NotComputable: "!",
  "NOT COMPUTABLE": "!", // Nightscout specialty?
  RateOutOfRange: "!!",
}

export function formatGlucoseValue(settings: Settings, value: number) {
  if (settings.displayUnits === "mmol") {
    return (value / MMOL_TO_MGDL).toFixed(1)
  }
  return value.toFixed(0)
}

export function formatGlucoseRecord(settings: Settings, record: GlucoseRecord, delta: number | null) {
  const currentValue = formatGlucoseValue(settings, record.sgv)
  const deltaString = delta === null ? "" : `${sign(delta)}${formatGlucoseValue(settings, Math.abs(delta))}`
  return `${currentValue}${TREND_TO_SYMBOL[record.direction]} ${deltaString}`
}

export function formatTime(time: Date): string {
  return `${pad(time.getHours())}:${pad(time.getMinutes())}`
}

export function sign(x: number) {
  return x >= 0 ? "+" : "−"
}

function pad(x: number): string {
  return (x < 10 ? "0" : "") + x.toString()
}
