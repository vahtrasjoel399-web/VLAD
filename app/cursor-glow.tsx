'use client';
import { useEffect, useRef } from 'react';

// Soft light that floats after the mouse. The native cursor stays.
export default function CursorGlow({ enabled }: { enabled: boolean }) {
  const halo = useRef<HTMLDivElement>(null);
  const core = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled || !matchMedia('(hover: hover) and (pointer: fine)').matches)
      return;
    const layers = [
      { el: halo.current!, ease: 0.07, x: innerWidth / 2, y: innerHeight / 2 },
      { el: core.current!, ease: 0.16, x: innerWidth / 2, y: innerHeight / 2 },
    ];
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    let frame = 0;
    const tick = () => {
      let moving = false;
      for (const layer of layers) {
        layer.x += (target.x - layer.x) * layer.ease;
        layer.y += (target.y - layer.y) * layer.ease;
        if (Math.abs(target.x - layer.x) + Math.abs(target.y - layer.y) > 0.3)
          moving = true;
        layer.el.style.transform = `translate3d(${layer.x}px, ${layer.y}px, 0)`;
      }
      frame = moving ? requestAnimationFrame(tick) : 0;
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      target.x = event.clientX;
      target.y = event.clientY;
      for (const layer of layers) layer.el.style.opacity = '1';
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const leave = () => {
      for (const layer of layers) layer.el.style.opacity = '0';
    };
    addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      leave();
    };
  }, [enabled]);
  return (
    <div className="cursor-glow" aria-hidden="true">
      <div ref={halo} className="cursor-glow-halo" />
      <div ref={core} className="cursor-glow-core" />
    </div>
  );
}
