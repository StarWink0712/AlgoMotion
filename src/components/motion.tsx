import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return reduced;
}

export function useStageWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(560);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(Math.max(280, Math.floor(element.clientWidth)));
    update();
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

export function MovingGroup({ x, y, step, duration, reduced, arc = false, className, children, identity }: {
  x: number; y: number; step: number; duration: number; reduced: boolean; arc?: boolean;
  className?: string; children: ReactNode; identity?: string;
}) {
  const ref = useRef<SVGGElement>(null);
  const previous = useRef({ x, y, step });
  useLayoutEffect(() => {
    const before = previous.current; previous.current = { x, y, step };
    if (reduced || Math.abs(step - before.step) !== 1 || (x === before.x && y === before.y)) return;
    const start = `translate(${before.x}px, ${before.y}px)`, end = `translate(${x}px, ${y}px)`;
    const frames = arc && x !== before.x
      ? [{ transform: start }, { transform: `translate(${(x + before.x) / 2}px, ${(y + before.y) / 2 + (x > before.x ? 36 : -36)}px)` }, { transform: end }]
      : [{ transform: start }, { transform: end }];
    const animation = ref.current?.animate(frames, { duration, easing: 'cubic-bezier(.22,.7,.22,1)' });
    return () => animation?.cancel();
  }, [x, y, step, duration, reduced, arc]);
  return <g ref={ref} className={className} data-element-id={identity} style={{ transform: `translate(${x}px, ${y}px)` }}>{children}</g>;
}

export function FlowArrow({ path, label, x, y, blocked = false, animated, motionKey, duration = 600 }: {
  path: string; label?: string; x?: number; y?: number; blocked?: boolean; animated: boolean; motionKey: string;
  duration?: number;
}) {
  const marker = useId();
  return <g className={`flow-arrow ${blocked ? 'is-blocked' : ''}`} data-testid="dependency-arrow" data-allowed={!blocked}>
    <defs><marker id={marker} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 0 1 L 9 5 L 0 9 z" fill="currentColor" /></marker></defs>
    <path key={motionKey} d={path} pathLength="1" markerEnd={`url(#${marker})`} className={`flow-line ${animated && !blocked ? 'draw-flow' : ''}`} fill="none" />
    {label && x !== undefined && y !== undefined && <g transform={`translate(${x}, ${y})`}><rect x="-28" y="-12" width="56" height="24" rx="12" /><text textAnchor="middle" dy="4">{label}</text></g>}
    {animated && !blocked && <circle r="5" className="flow-particle" key={`particle-${motionKey}`}><animateMotion dur={`${duration / 1000}s`} repeatCount="1" path={path} fill="freeze" /></circle>}
  </g>;
}
