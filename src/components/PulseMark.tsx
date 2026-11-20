import { useEffect, useRef } from 'react';

const D =
  'M0 18 H16 L20 18 L23 8 L26 26 L29 14 L32 18 H44 L48 18 L51 11 L54 23 L57 16 L60 18 H72 L76 18 L79 7 L82 27 L85 13 L88 18 H100';

interface PulseMarkProps {
  height?: number;
  className?: string;
  animate?: boolean;
}

export function PulseMark({ height = 14, className, animate = true }: PulseMarkProps) {
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    if (!animate || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)) {
      p.style.strokeDasharray = 'none';
      return;
    }
    const len = p.getTotalLength();
    p.style.strokeDasharray = String(len);
    p.style.strokeDashoffset = String(len);
    p.style.transition = 'none';
    const raf = requestAnimationFrame(() => {
      p.style.transition = 'stroke-dashoffset 1400ms cubic-bezier(0.22,1,0.36,1)';
      p.style.strokeDashoffset = '0';
    });
    return () => cancelAnimationFrame(raf);
  }, [animate]);

  return (
    <svg
      className={className}
      viewBox="0 0 100 34"
      height={height}
      width={height * 2.94}
      aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path d={D} fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" ref={pathRef} />
    </svg>
  );
}
