'use client'

import { useEffect } from 'react'

export const LOGIN_REDIRECT_PERFORMANCE_KEY = 'lensys.login.redirect.performance'

type LoginRedirectPerformanceMarker = {
  id: string
  source: string
  destination: string
  startedAt: number
}

export default function LoginDestinationPerformance() {
  useEffect(() => {
    const storedMarker = window.sessionStorage.getItem(LOGIN_REDIRECT_PERFORMANCE_KEY)

    if (!storedMarker) {
      return
    }

    try {
      const marker = JSON.parse(storedMarker) as LoginRedirectPerformanceMarker
      const durationMs = Date.now() - marker.startedAt

      console.info(
        `[perf][${marker.id}] client login.destination_rendered ${marker.source} -> ${marker.destination}: ${durationMs}ms`
      )
    } finally {
      window.sessionStorage.removeItem(LOGIN_REDIRECT_PERFORMANCE_KEY)
    }
  }, [])

  return null
}
