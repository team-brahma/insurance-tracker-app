import { useState, useEffect } from 'react';

export function useMinWidth(breakpoint: number) {
  const [matches, setMatches] = useState(() => window.innerWidth >= breakpoint);
  useEffect(() => {
    const mql = window.matchMedia(`(min-width: ${String(breakpoint)}px)`);
    const handler = (e: MediaQueryListEvent) => {
      setMatches(e.matches);
    };
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => {
      mql.removeEventListener('change', handler);
    };
  }, [breakpoint]);
  return matches;
}
