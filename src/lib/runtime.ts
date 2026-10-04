export function isStatisticsLoverAndroidApp() {
  if (typeof navigator === 'undefined') return false
  return /StatisticsLoverAndroid\//i.test(navigator.userAgent)
}


export function isStatisticsLoverNativeShell() {
  if (typeof window === 'undefined') return false
  return 'StatisticsLoverNative' in window
}
