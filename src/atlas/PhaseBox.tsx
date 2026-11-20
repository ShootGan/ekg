import { forwardRef, useImperativeHandle, useRef } from 'react';
import type { AtlasCase } from '../data/atlas';
import type { Phase } from './clock';
import type { PhaseKey } from '../data/phases';
import { FAZA_DOM, PH_NAME } from '../data/phases';

export interface PhaseView {
  key: PhaseKey;
  name: string;
  txt: string;
  extra: string;
}

export function phaseView(z: AtlasCase, ph: Phase): PhaseView {
  const fz = z.fazy || {};
  let key = ph.key;
  let txt: string | undefined;
  const blocked = !!(ph.a && ph.a.ph === 'blok' && !(ph.v && ph.v.ph));

  if (blocked) {
    key = 'blok';
    txt = fz.blok || 'Ten P nie został przewiedziony do komór.';
  } else if (key === 'F') txt = fz.F || FAZA_DOM.P;
  else txt = fz[key] || (key === 'P' && z.heart.atria ? fz.F : undefined) || FAZA_DOM[key as keyof typeof FAZA_DOM];

  if (key === 'PR' && z.cfg.av === 3) txt = fz.PR;
  if (key === 'TP' && z.heart.atria) {
    key = 'F';
    txt = fz.F;
  }

  let extra = '';
  if (ph.a && ph.a.ph === 'P' && ph.v && ph.v.ph && !z.heart.atria)
    extra = ` (jednocześnie załamek P następnego pobudzenia przedsionków – nakłada się na ${ph.v.ph})`;
  if (key === 'TP' && z.cfg.av === 3) txt = 'Komory w spoczynku. Przedsionki pracują dalej swoim rytmem – kolejny P nie zależy od QRS.';

  const name =
    key === 'blok'
      ? 'P bez QRS – blok'
      : key === 'F'
        ? z.heart.atria === 'af'
          ? 'Fale f (migotanie)'
          : 'Fale F (trzepotanie)'
        : PH_NAME[key];

  return { key, name, txt: txt || '', extra };
}

export interface PhaseBoxHandle {
  set(ph: Phase): void;
}

export interface PhaseBoxProps {
  z: AtlasCase;
  initial: Phase;
}

export const PhaseBox = forwardRef<PhaseBoxHandle, PhaseBoxProps>(function PhaseBox({ z, initial }, ref) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLSpanElement | null>(null);
  const sig = useRef('');

  const paint = (ph: Phase) => {
    const v = phaseView(z, ph);
    const body = v.txt + v.extra;
    const key = v.key + '|' + v.name + '|' + body;
    if (sig.current === key) return;
    sig.current = key;
    const box = boxRef.current;
    if (!box) return;
    box.dataset.phase = v.key;
    const b = box.firstElementChild;
    if (b && b.textContent !== v.name) b.textContent = v.name;
    if (bodyRef.current && bodyRef.current.textContent !== body) bodyRef.current.textContent = body;
  };

  useImperativeHandle(ref, () => ({ set: paint }), [z]);

  const first = phaseView(z, initial);
  return (
    <div className="atlas-phasebox" ref={boxRef} data-phase={first.key}>
      <b>{first.name}</b>
      <br />
      <span ref={bodyRef}>{first.txt + first.extra}</span>
    </div>
  );
});
