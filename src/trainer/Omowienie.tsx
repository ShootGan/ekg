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

export interface OmowienieProps {
  kroki: KrokOmowienia[];
  i: number;
  gen: GenerateResult;
  onGo: (i: number | null) => void;
}

export function Omowienie({ kroki, i, gen, onGo }: OmowienieProps) {
  const k = kroki[i];
  if (!k) return null;
  return (
    <div className="card tour">
      <div className="tour-top">
        <span className="tour-dots" aria-hidden>
          {kroki.map((x, j) => (
            <i key={x.c.id} className={(j === i ? 'on ' : '') + x.st} />
          ))}
        </span>
        <span className="tour-n">
          {i + 1} z {kroki.length}
        </span>
        <button type="button" className="mini" onClick={() => onGo(null)}>
          Zamknij
        </button>
      </div>
      <div key={k.c.id} className="tour-body">
        <div className={'tour-badge ' + k.st}>{ETYKIETA[k.st]}</div>
        <h3>{k.c.t}</h3>
        <p>{k.st === 'pul' ? nieTu(k.c.id, gen) : JAK[k.c.id]}</p>
        {k.st !== 'pul' && k.c.k.leads.length ? (
          <p className="tour-leads">
            Na wydruku: <b>{k.c.k.leads.join(', ')}</b>
          </p>
        ) : null}
      </div>
      <div className="opis-nav">
        <button type="button" onClick={() => onGo(i - 1)} disabled={i === 0}>
          ← Wstecz
        </button>
        <button type="button" className="accent" onClick={() => onGo(i + 1)}>
          {i === kroki.length - 1 ? 'Podsumowanie' : 'Dalej →'}
        </button>
      </div>
    </div>
  );
}
