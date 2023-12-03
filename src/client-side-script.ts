/*
Client-side script to be injected into the page. This needs to be just a string that's not interpreted
by TypeScript, only passed through to the output.
Kobo's browser seems to be pretty old, so we stick to ES5.

The script is responsible for:
- updating the data age
- reloading the page if the data is too old
- formatting all times in the page so they are in the viewer's time zone
- toggling the debug log

The script requires the following settings to be set on the `window.koboscoutConfig` object:
- STANDARD_CGM_UPDATE_INTERVAL: how often the CGM normally updates, in seconds
- DATA_MISSING_TOO_LONG: how long the data can be missing before we assume it's a longer-lasting outage, in seconds
*/
export default `
(function () {
  var loadTime = new Date()

  document.getElementById('log-toggler').onclick = function () {
    var element = document.getElementById('log')
    element.style.display = element.style.display === 'none' ? 'block' : 'none'
  }

  function log(text) {
    var element = document.getElementById('log')
    if (element) {
      element.innerHTML = text
    }
  }

  function reload() {
    log('reloading at ' + (new Date()))
    // Cache-busting argument - does not seem to be necessary.
    // When Kobo fails to reload it's because it's lost its WiFi connection.
    // window.location.href = window.location.href.split("?")[0] + "?" + (+ new Date())
    window.location.reload()
  }

  // Update data age client-side, to ensure it's truthful even when we cannot reach the server.
  // Adaptive refresh: do not refresh needlessly often when Dexcom data only comes once every 5 minutes
  function updateTrueDataAgeAndPotentiallyRefresh() {
    var element = document.getElementById('measurement-age')
    if (element === null) {
      // No data available. Just refresh once a minute, there is nothing else to do.
      if (new Date() - loadTime > 60000) {
        reload()
      }
      return
    }
    var time = new Date(Number(element.getAttribute('data-time')))
    var ageInSeconds = (new Date() - time) / 1000

    // How long have been missing the update?
    if (ageInSeconds > window.koboscoutConfig.STANDARD_CGM_UPDATE_INTERVAL) {
      // If the data has been missing for less than DATA_MISSING_TOO_LONG seconds,
      // assume a transient failure and refresh aggressively.
      // However, if it's been missing for longer than DATA_MISSING_TOO_LONG, assume a longer-lasting
      // outage (e.g. new sensor warmup) and refresh only once a minute to conserve device battery.
      var refreshInterval = ageInSeconds < window.koboscoutConfig.DATA_MISSING_TOO_LONG ? 20 : 60
      if (new Date() - loadTime > refreshInterval * 1000) {
        reload()
      }
    }

    // Apply styles in case we want to emphasise that the data is too old.
    document.body.className = (ageInSeconds >= window.koboscoutConfig.DATA_MISSING_TOO_LONG) ? 'stale-data' : ''

    var ageInMinutes = Math.round(ageInSeconds / 60)
    var text = 'current'
    if (ageInMinutes > 0) {
      text = [
        String(ageInMinutes),
        ageInMinutes === 1 ? 'min' : 'mins',
        'ago'
      ].join(' ')
    }
    element.innerText = text
  }
  updateTrueDataAgeAndPotentiallyRefresh()
  window.setInterval(updateTrueDataAgeAndPotentiallyRefresh, 20000)

  // Format all times client-side so they are rendered in the time zone of the user.
  function pad(x) {
    return (x < 10 ? '0' : '') + x.toString()
  }
  function formatTimes() {
    var element, time
    var times = document.getElementsByClassName('time')
    for (var i = 0; i < times.length; i++) {
      element = times.item(i)
      time = new Date(Number(element.getAttribute('data-time')))
      element.innerText = pad(time.getHours()) + ':' + pad(time.getMinutes())
    }
  }
  formatTimes()
})()
`
