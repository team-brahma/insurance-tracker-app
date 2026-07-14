import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Debounces a value for a given delay in milliseconds.
 *
 * @param value - The value to debounce.
 * @param delay - Delay in milliseconds (default: 300ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounces a callback function.
 *
 * @param callback - The function to debounce.
 * @param delay - Delay in milliseconds (default: 300ms).
 * @returns A debounced version of the callback.
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay],
  );
}
