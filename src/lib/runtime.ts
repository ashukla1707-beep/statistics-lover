export function isStatisticsLoverAndroidApp() {
  if (typeof navigator === 'undefined') return false
  return /StatisticsLoverAndroid\//i.test(navigator.userAgent)
}
