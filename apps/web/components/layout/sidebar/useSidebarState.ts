'use client'

import { useEffect, useState } from 'react'

const SIDEBAR_STORAGE_KEY = 'lensys-care-sidebar-collapsed'
const MOBILE_SIDEBAR_EVENT = 'lensys:toggle-mobile-sidebar'

type ViewportMode = 'mobile' | 'tablet' | 'desktop'

export default function useSidebarState(pathname: string) {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)
  const [tabletCollapsed, setTabletCollapsed] = useState(true)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop')
  const [hasLoadedCollapsePreference, setHasLoadedCollapsePreference] = useState(false)

  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [pathname])

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
      if (storedValue === 'true') {
        setDesktopCollapsed(true)
      }
    } catch (error) {
      console.error('Error reading sidebar preference:', error)
    } finally {
      setHasLoadedCollapsePreference(true)
    }
  }, [])

  useEffect(() => {
    const updateViewportMode = () => {
      const width = window.innerWidth

      if (width < 768) {
        setViewportMode('mobile')
        return
      }

      if (width < 1024) {
        setViewportMode('tablet')
        setTabletCollapsed(true)
        return
      }

      setViewportMode('desktop')
    }

    updateViewportMode()
    window.addEventListener('resize', updateViewportMode)

    return () => {
      window.removeEventListener('resize', updateViewportMode)
    }
  }, [])

  useEffect(() => {
    if (viewportMode !== 'mobile') {
      setMobileDrawerOpen(false)
    }
  }, [viewportMode])

  useEffect(() => {
    const handleToggleMobileSidebar = () => {
      if (window.innerWidth < 768) {
        setMobileDrawerOpen((currentValue) => !currentValue)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileDrawerOpen(false)
      }
    }

    window.addEventListener(MOBILE_SIDEBAR_EVENT, handleToggleMobileSidebar)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener(MOBILE_SIDEBAR_EVENT, handleToggleMobileSidebar)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [])

  const handleToggleCollapse = () => {
    if (viewportMode === 'tablet') {
      setTabletCollapsed((currentValue) => !currentValue)
      return
    }

    setDesktopCollapsed((currentValue) => {
      const nextValue = !currentValue

      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextValue))
      } catch (error) {
        console.error('Error saving sidebar preference:', error)
      }

      return nextValue
    })
  }

  const isMobile = viewportMode === 'mobile'
  const isCollapsed = viewportMode === 'tablet'
    ? tabletCollapsed
    : viewportMode === 'desktop'
      ? hasLoadedCollapsePreference && desktopCollapsed
      : false
  const asideWidthClass = viewportMode === 'tablet'
    ? (isCollapsed ? 'md:w-[4.5rem] lg:w-[4.5rem]' : 'md:w-56 lg:w-56')
    : (isCollapsed ? 'md:w-[4.5rem] lg:w-[4.5rem]' : 'md:w-20 lg:w-64')

  return {
    asideWidthClass,
    handleToggleCollapse,
    isCollapsed,
    isMobile,
    mobileDrawerOpen,
    setMobileDrawerOpen,
  }
}
