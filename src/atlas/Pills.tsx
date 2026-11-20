import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { PhaseKey } from '../data/phases';

const ITEMS: PhaseKey[] = ['P', 'PR', 'QRS', 'ST', 'T', 'TP'];

export interface PillsHandle {
  set(active: PhaseKey): void;
}

export const Pills = forwardRef<PillsHandle>(function Pills(_props, ref) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const cur = useRef<string>('');

  const paint = (active: PhaseKey) => {
    if (cur.current === active) return;
    cur.current = active;
    const box = boxRef.current;
    if (!box) return;
    box.querySelectorAll<HTMLSpanElement>('span[data-phase]').forEach((s) => {
      const on = s.dataset.phase === active || (active === 'F' && s.dataset.phase === 'P');
      s.classList.toggle('on', on);
    });
  };

  useImperativeHandle(ref, () => ({ set: paint }), []);

  return (
    <div className="atlas-pills" ref={boxRef} aria-label="Fazy cyklu">
      {ITEMS.map((k) => (
        <span key={k} data-phase={k}>
          {k}
        </span>
      ))}
    </div>
  );
});
