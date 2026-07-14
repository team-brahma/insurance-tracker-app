import { useEffect, useState } from 'react';

/**
 * Reactively match a CSS media query.
 *
 * @param query - A CSS media query string, e.g. '(min-width: 768px)'.
 * @returns `true` if the media query matches, `false` otherwise.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 767px)');
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Use the modern addEventListener API
    mediaQueryList.addEventListener('change', handleChange);

    // Sync on mount in case state is stale
    setMatches(mediaQueryList.matches);

    return () => {
      mediaQueryList.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
