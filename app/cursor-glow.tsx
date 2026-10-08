'use client';
import { useEffect, useRef } from 'react';

// Soft light pinned to the mouse. The native cursor stays.
export default function CursorGlow({ enabled }: { enabled: boolean }) {
  const glow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = glow.current;
    if (
      !el ||
      !enabled ||
      !matchMedia('(hover: hover) and (pointer: fine)').matches
    )
      return;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      el.style.opacity = '1';
    };
    const leave = () => (el.style.opacity = '0');
    addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      leave();
    };
  }, [enabled]);
  return (
    <div className="cursor-glow" aria-hidden="true">
      <div ref={glow} className="cursor-glow-light">
        <span className="cursor-glow-halo" />
        <span className="cursor-glow-core" />
      </div>
    </div>
  );
}
