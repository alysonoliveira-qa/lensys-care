type PerformanceTimer = {
  id: string
  label: string
  startedAt: number
}

// Logs de performance são dev-only por padrão para não gerar ruído/overhead em
// produção. Para medir em produção (ex.: separar cold start de query lenta nos
// Vercel logs), habilite explicitamente com a env `PERF_LOGS=1`.
function perfLoggingEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.PERF_LOGS === '1'
}

export function startPerformanceTimer(label: string): PerformanceTimer {
  return {
    id: crypto.randomUUID().slice(0, 8),
    label,
    startedAt: performance.now(),
  }
}

export function startPerformanceStep() {
  return performance.now()
}

export function logPerformanceStep(timer: PerformanceTimer, step: string, startedAt: number) {
  if (!perfLoggingEnabled()) return
  const durationMs = performance.now() - startedAt
  console.info(`[perf][${timer.id}] ${timer.label}.${step}: ${durationMs.toFixed(1)}ms`)
}

export function endPerformanceTimer(timer: PerformanceTimer, outcome = 'complete') {
  if (!perfLoggingEnabled()) return
  const durationMs = performance.now() - timer.startedAt
  console.info(`[perf][${timer.id}] ${timer.label}.total (${outcome}): ${durationMs.toFixed(1)}ms`)
}
