import { useEffect, useState } from 'react'

/**
 * Suscribe a una media query. Sirve para decisiones que CSS no puede tomar
 * solo, como marcar el drawer como `inert` únicamente en mobile.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** `true` a partir del breakpoint `md` de Tailwind (768px), donde el sidebar es fijo. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)')
}
