import { useCallback, useEffect, useRef } from 'react';

/**
 * Restrained cursor-following 3D tilt for premium "floating card" surfaces.
 *
 * Returns a ref to attach to the element. On pointer move (fine pointers only)
 * it applies a small rotateX/rotateY that follows the cursor, plus a slight
 * lift. Everything is driven through CSS custom properties so the actual
 * transform/transition lives in the stylesheet and stays overridable by
 * media queries.
 *
 * Honours `prefers-reduced-motion` and touch/coarse pointers by staying inert.
 */
export function useTilt<T extends HTMLElement>(maxTilt = 5) {
  const ref = useRef<T>(null);
  const frame = useRef<number | null>(null);

  // Feature-gate: skip on reduced-motion or non-hover/coarse pointers (touch).
  const enabled = useRef(true);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
    enabled.current = !reduce && !!fine;
  }, []);

  const handleMove = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!enabled.current) return;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Cursor position normalised to -0.5..0.5 across the element.
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;

      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        // Invert Y so moving the cursor up tilts the top edge away.
        el.style.setProperty('--tilt-x', `${(-py * maxTilt).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(px * maxTilt).toFixed(2)}deg`);
        el.style.setProperty('--tilt-active', '1');
      });
    },
    [maxTilt]
  );

  const handleEnter = useCallback(() => {
    if (!enabled.current) return;
    ref.current?.style.setProperty('--tilt-active', '1');
  }, []);

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    // Ease back to rest.
    el.style.setProperty('--tilt-x', '0deg');
    el.style.setProperty('--tilt-y', '0deg');
    el.style.setProperty('--tilt-active', '0');
  }, []);

  useEffect(() => {
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return {
    ref,
    onPointerMove: handleMove,
    onPointerEnter: handleEnter,
    onPointerLeave: handleLeave,
  };
}
