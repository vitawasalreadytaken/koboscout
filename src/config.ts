// API request timeouts
export const TIMEOUT_STATUS = 10000
export const TIMEOUT_CGM_DATA = 30000

// Data loading
export const RECORDS_TO_FETCH = 18

// Display
export const HEADER_HEIGHT = 70
export const EXTENDED_WIDTH = HEADER_HEIGHT * 0.95
export const CHART_HEIGHT = 465
export const CHART_UNDRAWABLE_VERTICAL_PADDING = 25 // leave room for labels
export const POINT_WIDTH = 30
export const MAX_CHART_RANGE_MGDL: [number, number] = [55, 270]

// CGM assumptions
export const STANDARD_CGM_UPDATE_INTERVAL = 300
export const DATA_MISSING_TOO_LONG = 3 * STANDARD_CGM_UPDATE_INTERVAL
