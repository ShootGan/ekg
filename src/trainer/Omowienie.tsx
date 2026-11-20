import { useLayoutEffect, useRef, useState } from 'react';
import type { Cecha } from '../lib/cechy';
import type { GenerateResult } from '../lib/generate';
import type { EcgPrintHandle } from '../components/EcgPrint';
import { marksFor } from '../lib/kryteria';
import { JAK, nieTu } from '../data/jak';

export type KrokSt = 'ok' | 'miss' | 'pul';

export interface KrokOmowienia {
  c: Cecha;
  st: KrokSt;
}

const ETYKIETA: Record<KrokSt, string> = { ok: 'Trafione', miss: 'Przeoczone', pul: 'Tego tu nie ma' };
const GAP = 12;
const EDGE = 8;

export function pokazNaWydruku(k: KrokOmowienia, gen: GenerateResult, print: EcgPrintHandle | null) {
  if (!print) return;
  if (k.st === 'pul') {
    print.reset();
    return;
  }
  const ms = marksFor(k.c.k, gen.key.zaznaczenia);
  const leads = new Set(ms.map((m) => m.n));
  if (ms.length && leads.size === 1) print.focusOn(ms[0].t0, ms[0].t1, ms[0].n, 2.5);
  else print.reset();
}

function kotwica(k: KrokOmowienia, gen: GenerateResult, print: EcgPrintHandle): DOMRect | null {
  if (k.st === 'pul') return null;
  const m = marksFor(k.c.k, gen.key.zaznaczenia)[0];
  if (m) return print.anchor(m.n || m.pole, m.t0, m.t1);
  return k.c.k.leads[0] ? print.anchor(k.c.k.leads[0]) : null;
}

interface Poz {
  top: number;
  left: number;
  arrow: number | null;
  below: boolean;
}

export interface OmowienieProps {
  kroki: KrokOmowienia[];
  i: number;
  gen: GenerateResult;
  onGo: (i: number | null) => void;
  print: EcgPrintHandle | null;
  host: HTMLElement | null;
  tick: number;
}

export function Omowienie({ kroki, i, gen, onGo, print, host, tick }: OmowienieProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [poz, setPoz] = useState<Poz | null>(null);
  const k = kroki[i];

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!k || !box || !host) return;
    const hr = host.getBoundingClientRect();
    const bw = box.offsetWidth;
    const bh = box.offsetHeight;
    const W = hr.width;
    const H = hr.height;
    const r = print ? kotwica(k, gen, print) : null;
    const strefy = (print && k.st !== 'pul' ? k.c.k.leads.map((l) => print.anchor(l)) : []).filter((x): x is DOMRect => !!x);
    if (r) strefy.push(r);
    const lokalne = strefy.map((z) => ({ l: z.left - hr.left, t: z.top - hr.top, r: z.right - hr.left, b: z.bottom - hr.top }));
    const zakryte = (x: number, y: number) =>
      lokalne.reduce((acc, z) => acc + Math.max(0, Math.min(x + bw, z.r) - Math.max(x, z.l)) * Math.max(0, Math.min(y + bh, z.b) - Math.max(y, z.t)), 0);
    const clampX = (x: number) => Math.min(Math.max(EDGE, x), Math.max(EDGE, W - bw - EDGE));
    const clampY = (y: number) => Math.min(Math.max(EDGE, y), Math.max(EDGE, H - bh - EDGE));
    const kand: { top: number; left: number; below: boolean | null }[] = [];
    if (r) {
      const cx = r.left - hr.left + r.width / 2;
      kand.push({ top: r.bottom - hr.top + GAP, left: clampX(cx - bw / 2), below: true });
      kand.push({ top: r.top - hr.top - bh - GAP, left: clampX(cx - bw / 2), below: false });
      kand.push({ top: clampY(r.top - hr.top), left: r.right - hr.left + GAP, below: null });
      kand.push({ top: clampY(r.top - hr.top), left: r.left - hr.left - bw - GAP, below: null });
    }
    kand.push(
      { top: EDGE * 2, left: EDGE, below: null },
      { top: EDGE * 2, left: W - bw - EDGE, below: null },
      { top: H - bh - EDGE, left: EDGE, below: null },
      { top: H - bh - EDGE, left: W - bw - EDGE, below: null },
    );
    const mieszczace = kand.filter((c) => c.top >= EDGE && c.left >= EDGE && c.top + bh <= H - EDGE + 1 && c.left + bw <= W - EDGE + 1);
    const lista = mieszczace.length ? mieszczace : kand.map((c) => ({ ...c, top: clampY(c.top), left: clampX(c.left) }));
    let best = lista[0];
    let bestScore = zakryte(best.left, best.top);
    for (const c of lista.slice(1)) {
      const sc = zakryte(c.left, c.top);
      if (sc < bestScore - 1) {
        best = c;
        bestScore = sc;
      }
    }
    const arrow = r && best.below != null ? Math.min(Math.max(16, r.left - hr.left + r.width / 2 - best.left), bw - 16) : null;
    setPoz({ top: best.top, left: best.left, arrow, below: !!best.below });
  }, [k, gen, print, host, tick]);

  if (!k) return null;
  return (
    <div
      ref={boxRef}
      className={'dymek' + (poz ? '' : ' hidden') + (poz && poz.arrow != null ? (poz.below ? ' pod' : ' nad') : '')}
      style={poz ? { top: poz.top, left: poz.left, ['--arrow' as string]: (poz.arrow ?? 0) + 'px' } : undefined}
      role="dialog"
      aria-label={'Omówienie: ' + k.c.t}
    >
      <div className="tour-top">
        <span className="tour-dots" aria-hidden>
          {kroki.map((x, j) => (
            <i key={x.c.id} className={(j === i ? 'on ' : '') + x.st} />
          ))}
        </span>
        <span className="tour-n">
          {i + 1} z {kroki.length}
        </span>
        <button type="button" className="mini" onClick={() => onGo(null)} aria-label="Zamknij omówienie">
          ✕
        </button>
      </div>
      <div key={k.c.id} className="tour-body">
        <div className={'tour-badge ' + k.st}>{ETYKIETA[k.st]}</div>
        <h3>{k.c.t}</h3>
        <p>{k.st === 'pul' ? nieTu(k.c.id, gen) : JAK[k.c.id]}</p>
        {k.st !== 'pul' && k.c.k.leads.length ? (
          <p className="tour-leads">
            Obrysowane: <b>{k.c.k.leads.join(', ')}</b>
          </p>
        ) : null}
      </div>
      <div className="tour-nav">
        <button type="button" onClick={() => onGo(i - 1)} disabled={i === 0}>
          ← Wstecz
        </button>
        <button type="button" className="accent" onClick={() => onGo(i + 1)}>
          {i === kroki.length - 1 ? 'Koniec' : 'Dalej →'}
        </button>
      </div>
    </div>
  );
}
