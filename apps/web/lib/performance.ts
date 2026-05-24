type PerformanceTimer = {
  id: string
  label: string
  startedAt: number
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
  const durationMs = performance.now() - startedAt
  console.info(`[perf][${timer.id}] ${timer.label}.${step}: ${durationMs.toFixed(1)}ms`)
}

export function endPerformanceTimer(timer: PerformanceTimer, outcome = 'complete') {
  const durationMs = performance.now() - timer.startedAt
  console.info(`[perf][${timer.id}] ${timer.label}.total (${outcome}): ${durationMs.toFixed(1)}ms`)
}
