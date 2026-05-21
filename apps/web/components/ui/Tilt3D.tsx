'use client';

import { useRef, type ReactNode, type CSSProperties } from 'react';

interface Props {
  children: ReactNode;
  max?: number; // degrees
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

/** Subtle mouse-tracking 3D tilt wrapper. */
export function Tilt3D({ children, max = 8, scale = 1.015, className = '', style }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height;
    const ry = (x - 0.5) * 2 * max;
    const rx = -(y - 0.5) * 2 * max;
    el.style.setProperty('--rx', `${rx}deg`);
    el.style.setProperty('--ry', `${ry}deg`);
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale(1)';
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`tilt-card ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
