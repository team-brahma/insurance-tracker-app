import { useMemo } from 'react';

/**
 * Calculates the minimum grid column width needed so all cards in a list
 * are uniformly sized to fit the longest label without wrapping or truncating.
 *
 * Uses OffscreenCanvas for pixel-accurate text measurement (font-extrabold 16px Inter).
 * Falls back to a ~9px-per-character estimate when OffscreenCanvas is unavailable.
 *
 * @param names      - Display strings to measure (e.g. card titles / names)
 * @param extraWidth - Optional extra px to add on top of the computed width (default: 0)
 * @returns Minimum column width in pixels, ready for use in CSS `minmax()`
 */
export function useCardGridWidth(names: string[], extraWidth = 0): number {
  return useMemo(() => {
    if (!names.length) return 200;

    const longestName = names.reduce((a, b) => (b.length > a.length ? b : a), '');

    // Pixel-accurate measurement using OffscreenCanvas
    let textWidth = longestName.length * 9; // fallback: ~9px/char for font-extrabold 16px
    try {
      const canvas = new OffscreenCanvas(0, 0);
      const ctx = canvas.getContext('2d')!;
      ctx.font = '800 16px Inter, ui-sans-serif, system-ui, sans-serif';
      textWidth = ctx.measureText(longestName).width;
    } catch {
      // OffscreenCanvas unavailable — character-based estimate used above
    }

    // Fixed card chrome: avatar(44) + gap(12) + padding L+R(40) + buffer(16)
    return Math.ceil(textWidth + 44 + 12 + 40 + 16 + extraWidth);
  }, [names, extraWidth]);
}
