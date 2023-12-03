import * as formatting from "./formatting"
import { type GlucoseRecord, type Settings } from "./data"
import {
  HEADER_HEIGHT,
  EXTENDED_WIDTH,
  CHART_HEIGHT,
  CHART_UNDRAWABLE_VERTICAL_PADDING,
  POINT_WIDTH,
  MAX_CHART_RANGE_MGDL,
  STANDARD_CGM_UPDATE_INTERVAL,
  DATA_MISSING_TOO_LONG,
} from "./config"
import CLIENT_SIDE_SCRIPT from "./client-side-script"

export function page(settings: Settings, glucoseData: Array<GlucoseRecord>): string {
  /*
  Render the page server-side, including the chart (which is composed of absolute-positioned divs).
  Include a stylesheet, and a client-side script to update the data age and refresh the page if necessary.
  */
  let currentReading: string
  let relativeChange = null

  if (glucoseData.length) {
    const latest = glucoseData[0]
    const delta = glucoseData.length >= 2 ? latest.sgv - glucoseData[1].sgv : null
    currentReading = formatting.formatGlucoseRecord(settings, latest, delta)
    if (glucoseData.length >= 4) {
      const older = glucoseData[3]
      const relative = (100 * (latest.sgv - older.sgv)) / older.sgv
      const timeWindowMinutes = (latest.date - older.date) / 60000
      relativeChange = {
        window: `${timeWindowMinutes.toFixed(0)}m`,
        change: `${formatting.sign(relative)}${Math.abs(relative).toFixed(0)}%`,
      }
    }
  } else {
    currentReading = "NO DATA"
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>
        ${currentReading}
        ${relativeChange ? `(${relativeChange.change} in ${relativeChange.window})` : ""}
      </title>
      <style type="text/css">${style()}</style>
    </head>
    <body>
      <div id="log">log</div>
      <header>
        <h1>${currentReading}</h1>
        ${
          relativeChange
            ? `<table>
              <tr><td>${relativeChange.window}</td></tr>
              <tr><td>${relativeChange.change}</td></tr>
            </table>`
            : ""
        }
        <h2 id="log-toggler">${timeInfo(glucoseData)}</h2>
      </header>
      <main>
        ${chart(settings, glucoseData)}
      </main>
      <script>
        window.koboscoutConfig = ${JSON.stringify({ STANDARD_CGM_UPDATE_INTERVAL, DATA_MISSING_TOO_LONG })};
        ${CLIENT_SIDE_SCRIPT}
      </script>
    </body>
    </html>
  `
}

function timeInfo(glucoseData: Array<GlucoseRecord>): string {
  if (!glucoseData.length) {
    return "--:--"
  }
  const time = new Date(glucoseData[0].date)
  return `
    <span class="time" data-time="${+time}">
      ${formatting.formatTime(time)}
    </span>
    <small id="measurement-age" data-time="${+time}">
      ?
    </small>
  `
}

function calculateBottomPosition(chartRange: [number, number], value: number): number {
  const chartHeight = CHART_HEIGHT - 2 * CHART_UNDRAWABLE_VERTICAL_PADDING
  const raw = (chartHeight * (value - chartRange[0])) / (chartRange[1] - chartRange[0])
  return CHART_UNDRAWABLE_VERTICAL_PADDING + Math.max(0, Math.min(chartHeight, raw)) // clip to [0, chartHeight]
}

function determineChartRange(settings: Settings, glucoseData: Array<GlucoseRecord>): [number, number] {
  // Adaptive range: don't waste a lot of room when the values are in a 'healthy' (mostly desired) range.
  // Only switch between two ranges to avoid confusion.
  const max = glucoseData.reduce((acc: number, record: GlucoseRecord) => Math.max(acc, record.sgv), 0)
  const healthyMax = settings.targetRangeMgdl[1] + 40
  if (max <= healthyMax) {
    return [MAX_CHART_RANGE_MGDL[0], healthyMax]
  }
  return MAX_CHART_RANGE_MGDL
}

function chart(settings: Settings, glucoseData: Array<GlucoseRecord>): string {
  const chartRange = determineChartRange(settings, glucoseData)
  // TODO: fill gaps!
  const points = glucoseData.reverse().map((record, i) => {
    const time = new Date(record.date)
    const classes = [
      "point",
      i % 2 ? "odd" : "even",
      // The following classes are not actually used to change the appearance of high/low values.
      record.sgv >= settings.targetRangeMgdl[1] ? "high" : "",
      record.sgv <= settings.targetRangeMgdl[0] ? "low" : "",
    ]
    return `
      <div class="${classes.join(" ")}" style="left: ${i * POINT_WIDTH}px">
        <span class="value" style="bottom: ${calculateBottomPosition(chartRange, record.sgv)}px">
          ${formatting.formatGlucoseValue(settings, record.sgv)}
          <span class="marker"></span>
        </span>
        <span class="time" data-time="${+time}">
          ${formatting.formatTime(time)}
        </span>
      </div>`
  })

  const targetCoordinates = settings.targetRangeMgdl.map((v) => calculateBottomPosition(chartRange, v))
  return `
    <div class="target-range" style="bottom: ${targetCoordinates[0]}px; height: ${
      targetCoordinates[1] - targetCoordinates[0]
    }px"></div>
    ${points.join("")}
  `
}

function style(): string {
  return `
    * {
      margin: 0;
      padding: 0;
    }

    body {
      background: #fff;
      color: #000;
      font-family: sans-serif;
    }

    #log {
      background: #000;
      color: #fff;
      display: none;
    }

    header {
      height: ${HEADER_HEIGHT + 10}px;
      border-bottom: 2px solid #aaa;
      position: relative;
    }

    h1, h2, header table {
      position: absolute;
      top: 0;
      height: ${HEADER_HEIGHT}px;
      padding: 5px 10px;
    }

    h1 {
      right: ${EXTENDED_WIDTH}px;
      line-height: ${HEADER_HEIGHT}px;
      font-size: ${HEADER_HEIGHT * 0.7}px;
      text-align: right;
    }

    header table {
      right: 0;
      width: ${EXTENDED_WIDTH}px;
      font-size: ${HEADER_HEIGHT * 0.35}px;
      line-height: ${HEADER_HEIGHT * 0.35}px;
      text-align: right;
      color: #444;
    }

    h2 {
      left: 0;
      font-size: ${HEADER_HEIGHT * 0.5}px;
      color: #444;
      text-align: center;
    }

    h2 small {
      font-size: 50%;
      font-weight: normal;
      display: block;
    }

    .stale-data header {
      background: #000;
    }

    .stale-data h1 {
      color: #666;
      font-weight: normal;
    }

    .stale-data h2 {
      color: #fff;
    }

    main {
      height: ${CHART_HEIGHT}px;
      position: relative;
    }

    .target-range {
      position: absolute;
      left: 0;
      background: #ddd;
      width: 100%;
    }

    .point {
      position: absolute;
      top: 0;
      width: ${POINT_WIDTH}px;
      height: ${CHART_HEIGHT}px;
      text-align: center;
    }

    .point .value,
    .point .time {
      position: absolute;
      left: 0;
      width: ${POINT_WIDTH}px;
    }

    .point .value .marker {
      position: absolute;
      background: #444;
      height: 4px;
      width: ${POINT_WIDTH * 0.8}px;
      bottom: -4px;
      left: ${POINT_WIDTH * 0.1}px;
      border-radius: 2px;
    }

    .point.high .value,
    .point.low .value {
    }

    .point .time {
      bottom: 0;
    }

    .point.odd {
      border-left: 1px solid #aaa;
    }

    .point.even .value {
      font-size: 70%;
    }
    .point.even .time {
      display: none;
    }

  `
}
