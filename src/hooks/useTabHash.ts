import { useCallback, useEffect, useState } from 'react'

/**
 * Keeps the active tab in sync with the URL hash so tabs are bookmarkable and
 * the back/forward buttons navigate between visited tabs. The hash is the
 * single source of truth: changing tabs updates `location.hash` (which pushes a
 * history entry), and `hashchange` drives the active tab. An unknown or missing
 * hash — e.g. a stale bookmark — falls back to the default tab.
 */
export function useTabHash(tabs: readonly string[], defaultTab: string) {
  const readHash = useCallback(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''))
    return tabs.includes(hash) ? hash : defaultTab
  }, [tabs, defaultTab])

  const [activeTab, setActiveTab] = useState<string>(readHash)

  useEffect(() => {
    const onHashChange = () => setActiveTab(readHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [readHash])

  const navigateToTab = useCallback(
    (tab: string) => {
      // Setting the hash pushes a history entry and fires `hashchange`, which
      // updates state — so we don't set state here. No-op if already on the tab.
      if (readHash() !== tab) window.location.hash = tab
    },
    [readHash]
  )

  return [activeTab, navigateToTab] as const
}
