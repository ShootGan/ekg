import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EcgPrint, type EcgPrintHandle } from '../components/EcgPrint';
import { DxPicker } from '../components/DxPicker';
import { generateCase, type GenerateResult } from '../lib/generate';
import { useReal } from '../lib/real';
import { saveEntry } from '../lib/historia';
import { diagnosticMarks, marksFor, type Kryterium } from '../lib/kryteria';
import { CECHY } from '../lib/cechy';
import { PRZYPADKI } from '../data/przypadki';
import { ATLAS_LINK, WYJASNIENIA } from '../data/wyjasnienia';
import { Omowienie, pokazNaWydruku, type KrokOmowienia } from './Omowienie';
import {
  CECHY_KROKU,
  KROKI,
  POMIARY,
  POSTEPOWANIE,
  ocenOpis,
  type OdpowiedzOpisu,
  type Pomiar,
  type Post,
  type WynikOpisu,
} from '../lib/opis';

export interface TrainerCaseProps {
  seed: number;
  poziom?: 1 | 2 | 3;
  kat?: string;
  id?: string;
  navigate: (to: string) => void;
  onNextSeed: () => void;
}

const PUSTA: OdpowiedzOpisu = { sel: [], pomiary: {}, dx: '', post: '' };
const NORMA = CECHY.find((c) => c.id === 'norma');
const WERDYKT = { ok: 'trafione', miss: 'przeoczone', zle: 'nie ma' } as const;
const KLASA = { ok: 'quiz-opt ok', miss: 'quiz-opt miss', zle: 'quiz-opt zle' } as const;

export function TrainerCase({ seed, poziom, kat, id, navigate, onNextSeed }: TrainerCaseProps) {
  const [gen, setGen] = useState<GenerateResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [real] = useReal();
  const [A, setA] = useState<OdpowiedzOpisu>(PUSTA);
  const [krok, setKrok] = useState(0);
  const [W, setW] = useState<WynikOpisu | null>(null);
  const [active, setActive] = useState<Kryterium | null>(null);
  const [calMsg, setCalMsg] = useState('');
  const [tour, setTour] = useState<number | null>(null);
  const ref = useRef<EcgPrintHandle | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      setGen(generateCase({ seed, poziom, kat, id, real }));
      setErr(null);
    } catch (e) {
      setGen(null);
      setErr(e instanceof Error ? e.message : String(e));
    }
    setA(PUSTA);
    setKrok(0);
    setW(null);
    setActive(null);
    setTour(null);
  }, [seed, poziom, kat, id, real]);

  const kroki = useMemo<KrokOmowienia[]>(
    () => (W ? W.pozycje.map((p) => ({ c: p.c, st: p.w === 'zle' ? 'pul' : p.w })) : []),
    [W]
  );

  const goTour = (i: number | null) => {
    if (i == null || i < 0 || i >= kroki.length || !gen) {
      setTour(null);
      setActive(null);
      ref.current?.reset();
      return;
    }
    setTour(i);
    const k = kroki[i];
    setActive(k.st === 'pul' ? null : k.c.k);
    pokazNaWydruku(k, gen, ref.current);
  };
  const goRef = useRef(goTour);
  goRef.current = goTour;
  const tourRef = useRef(tour);
  tourRef.current = tour;

  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);
  const printRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = tourRef.current;
      if (t == null) return;
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.code === 'ArrowRight') goRef.current(t + 1);
      else if (e.code === 'ArrowLeft') goRef.current(t - 1);
      else if (e.code === 'Escape') goRef.current(null);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const review = useMemo(() => {
    if (!W || !gen) return undefined;
    const all = gen.key.zaznaczenia;
    const marks = active ? marksFor(active, all) : diagnosticMarks(all, gen.key.id);
    return { zaznaczenia: marks, focus: active?.leads.length ? active.leads : undefined, dim: tour != null };
  }, [W, gen, active, tour]);

  if (err) {
    return (
      <div className="card">
        <h2>Pełny opis</h2>
        <p style={{ color: 'var(--brak)' }}>{err}</p>
        <button type="button" onClick={() => navigate('/trening?format=opis')}>
          ← Trening
        </button>
      </div>
    );
  }
  if (!gen) return <div className="card">Ładowanie przypadku…</div>;

  const { EX, key } = gen;
  const done = !!W;

  const toggle = (cid: string) => {
    if (done) return;
    setA((a) => ({ ...a, sel: a.sel.includes(cid) ? a.sel.filter((x) => x !== cid) : [...a.sel, cid] }));
  };

  const setPomiar = (m: Pomiar, v: number | null) => setA((a) => ({ ...a, pomiary: { ...a.pomiary, [m]: v } }));

  const zCyrkla = (m: Pomiar) => {
    const dt = ref.current?.getLastDt() ?? null;
    if (dt == null || dt <= 0) {
      setCalMsg('Najpierw zmierz cyrklem na wydruku: C albo Shift i przeciągnij między punktami.');
      window.setTimeout(() => setCalMsg(''), 3500);
      return;
    }
    setPomiar(m, m === 'hr' ? Math.round(60000 / dt) : Math.round(dt));
  };

  const oddaj = () => {
    const w = ocenOpis(gen, A);
    setW(w);
    setActive(null);
    const miss = w.pozycje.filter((p) => p.w === 'miss').map((p) => p.c.t);
    const extra = w.pozycje.filter((p) => p.w === 'zle').map((p) => p.c.t);
    saveEntry({
      seed,
      id: key.id,
      poziom: PRZYPADKI.find((p) => p.id === key.id)?.poziom ?? poziom ?? 0,
      wynik: w.wynik,
      uwaga: [
        w.przeoczoneKrytyczne.length ? 'krytyczne: ' + w.przeoczoneKrytyczne.map((c) => c.t).join(', ') : '',
        miss.length ? 'przeoczone ' + miss.join(', ') : '',
        extra.length ? 'nadmiarowe ' + extra.join(', ') : '',
      ]
        .filter(Boolean)
        .join('; '),
      tryb: 'opis',
    });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const retry = () => {
    setA(PUSTA);
    setKrok(0);
    setW(null);
    setActive(null);
    setTour(null);
  };

  const K = KROKI[krok];
  const ostatni = krok === KROKI.length - 1;
  const ileWKroku = (i: number) => (i === 4 ? (A.dx ? 1 : 0) + (A.post ? 1 : 0) : CECHY_KROKU[i].filter((c) => A.sel.includes(c.id)).length);

  return (
    <>
      <div className="quiz-head" ref={topRef}>
        <h2>Pełny opis</h2>
        <span className="stat-row">
          <span className="stat">
            {EX.plec}, {EX.wiek} l.
          </span>
        </span>
        <div className="actions">
          <button type="button" className="mini" onClick={() => navigate('/trening?format=opis')}>
            ← Trening
          </button>
          <button type="button" className="mini" onClick={onNextSeed}>
            Inny zapis
          </button>
        </div>
      </div>
      {EX.kontekst ? <div className="quiz-context">{EX.kontekst}</div> : null}

      <div className="quiz-split">
        <div className="quiz-print" ref={printRef}>
          <EcgPrint ref={ref} ecg={EX.ecg} seed={EX.seed} review={review} onDraw={tour != null ? bump : undefined} />
          {done && tour != null ? (
            <Omowienie kroki={kroki} i={tour} gen={gen} onGo={goTour} print={ref.current} host={printRef.current} tick={tick} />
          ) : null}
          {calMsg ? <p className="muted opis-cal">{calMsg}</p> : null}
        </div>

        <div className="quiz-side">
          {!done ? (
            <div className="card">
              <ol className="opis-steps">
                {KROKI.map((k, i) => (
                  <li key={k.t}>
                    <button type="button" className={i === krok ? 'on' : undefined} onClick={() => setKrok(i)} aria-current={i === krok ? 'step' : undefined}>
                      <span>{i + 1}</span>
                      {k.t}
                      {ileWKroku(i) ? <small>{ileWKroku(i)}</small> : null}
                    </button>
                  </li>
                ))}
              </ol>

              <h3 className="opis-title">{K.t}</h3>
              <p className="muted opis-q">{K.q}</p>

              {krok < 4 ? (
                <>
                  <div className="quiz-list">
                    {CECHY_KROKU[krok].map((c) => {
                      const on = A.sel.includes(c.id);
                      return (
                        <button key={c.id} type="button" className={on ? 'quiz-opt sel' : 'quiz-opt'} role="checkbox" aria-checked={on} onClick={() => toggle(c.id)}>
                          <span className={'quiz-box' + (on ? ' on' : '')} aria-hidden>
                            {on ? '✓' : ''}
                          </span>
                          <span style={{ flex: 1 }}>{c.t}</span>
                        </button>
                      );
                    })}
                  </div>
                  {K.pomiar ? (
                    <div className="opis-pomiar">
                      <label>
                        {POMIARY[K.pomiar].t} <span className="muted">(opcjonalnie)</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={POMIARY[K.pomiar].unit}
                        value={A.pomiary[K.pomiar] ?? ''}
                        onChange={(e) => setPomiar(K.pomiar as Pomiar, e.target.value === '' ? null : Number(e.target.value))}
                      />
                      <button type="button" className="mini" onClick={() => zCyrkla(K.pomiar as Pomiar)}>
                        z cyrkla
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {NORMA ? (
                    <div className="quiz-list" style={{ marginBottom: 16 }}>
                      <button
                        type="button"
                        className={A.sel.includes('norma') ? 'quiz-opt sel' : 'quiz-opt'}
                        role="checkbox"
                        aria-checked={A.sel.includes('norma')}
                        onClick={() => toggle('norma')}
                      >
                        <span className={'quiz-box' + (A.sel.includes('norma') ? ' on' : '')} aria-hidden>
                          {A.sel.includes('norma') ? '✓' : ''}
                        </span>
                        <span style={{ flex: 1 }}>{NORMA.t}</span>
                      </button>
                    </div>
                  ) : null}
                  <div className="sub">Rozpoznanie</div>
                  <DxPicker rozp={EX.rozp} pick={A.dx} onPick={(dx) => setA((a) => ({ ...a, dx }))} />
                  <div className="sub">Postępowanie</div>
                  <div className="quiz-list">
                    {POSTEPOWANIE.map(([p, t]) => {
                      const on = A.post === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          className={on ? 'quiz-opt sel' : 'quiz-opt'}
                          role="radio"
                          aria-checked={on}
                          onClick={() => setA((a) => ({ ...a, post: on ? '' : (p as Post) }))}
                        >
                          <span className={'quiz-box' + (on ? ' on' : '')} aria-hidden>
                            {on ? '●' : ''}
                          </span>
                          <span style={{ flex: 1 }}>{t}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="opis-nav">
                <button type="button" onClick={() => setKrok(krok - 1)} disabled={krok === 0}>
                  Wstecz
                </button>
                {ostatni ? (
                  <button type="button" className="accent" onClick={oddaj}>
                    Oddaj opis
                  </button>
                ) : (
                  <button type="button" className="accent" onClick={() => setKrok(krok + 1)}>
                    Dalej
                  </button>
                )}
              </div>
            </div>
          ) : (
            <Wynik
              W={W}
              gen={gen}
              A={A}
              active={active}
              setActive={setActive}
              onRetry={retry}
              onNext={onNextSeed}
              onTour={kroki.length ? () => goTour(0) : undefined}
            />
          )}
        </div>
      </div>
    </>
  );
}

interface WynikProps {
  W: WynikOpisu;
  gen: GenerateResult;
  A: OdpowiedzOpisu;
  active: Kryterium | null;
  setActive: (k: Kryterium | null) => void;
  onRetry: () => void;
  onNext: () => void;
  onTour?: () => void;
}

function Wynik({ W, gen, A, active, setActive, onRetry, onNext, onTour }: WynikProps) {
  const { key, EX } = gen;
  const dxT = (id: string) => EX.rozp.find((r) => r.id === id)?.t ?? id;
  const postT = (p: string) => POSTEPOWANIE.find(([x]) => x === p)?.[1] ?? '';
  return (
    <div className="card">
      {onTour ? (
        <button type="button" className="accent tour-start" onClick={onTour}>
          Omów zapis krok po kroku →
        </button>
      ) : null}
      <div className="opis-score">
        <b>{W.wynik}%</b>
        <span className="muted">zmiany {W.zmiany}% · rozpoznanie {W.dx.pkt}/2 · postępowanie {W.post.ok ? '1/1' : '0/1'}</span>
      </div>

      {W.przeoczoneKrytyczne.length ? (
        <div className="opis-alarm" role="alert">
          <b>Przeoczone krytyczne:</b> {W.przeoczoneKrytyczne.map((c) => c.t).join(', ')}
        </div>
      ) : null}

      {KROKI.slice(0, 4).map((k, i) => {
        const poz = W.pozycje.filter((p) => CECHY_KROKU[i].some((c) => c.id === p.c.id));
        const pm = W.pomiary.find((x) => x.m === k.pomiar);
        if (!poz.length && !(pm && (pm.podano != null || pm.klucz != null))) return null;
        return (
          <div key={k.t} className="opis-group">
            <div className="sub">{k.t}</div>
            <div className="quiz-list">
              {poz.map((p) => {
                const isActive = active === p.c.k;
                return (
                  <button
                    key={p.c.id}
                    type="button"
                    className={KLASA[p.w]}
                    onMouseEnter={() => p.w !== 'zle' && setActive(p.c.k)}
                    onMouseLeave={() => setActive(null)}
                    onClick={() => p.w !== 'zle' && setActive(isActive ? null : p.c.k)}
                  >
                    <span style={{ flex: 1 }}>
                      {p.c.t}
                      {p.krytyczna ? <small className="opis-kryt"> krytyczne</small> : null}
                    </span>
                    <span className="quiz-verdict">{WERDYKT[p.w]}</span>
                  </button>
                );
              })}
            </div>
            {pm && pm.klucz != null ? (
              <p className="opis-meas">
                {POMIARY[pm.m].t}: {pm.podano != null ? pm.podano + ' ' + POMIARY[pm.m].unit + (pm.ok ? ' ✓' : ' ✗') + ', ' : ''}klucz {pm.klucz}{' '}
                {POMIARY[pm.m].unit}
              </p>
            ) : null}
          </div>
        );
      })}
      {A.sel.includes('norma') || W.pozycje.some((p) => p.c.id === 'norma') ? (
        <div className="opis-group">
          <div className="quiz-list">
            {W.pozycje
              .filter((p) => p.c.id === 'norma')
              .map((p) => (
                <div key="norma" className={KLASA[p.w]}>
                  <span style={{ flex: 1 }}>{p.c.t}</span>
                  <span className="quiz-verdict">{WERDYKT[p.w]}</span>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      <div className="opis-group">
        <div className="sub">Rozpoznanie</div>
        <p className="opis-line">
          {A.dx ? (
            <>
              Twoje: <b className={W.dx.pkt === 2 ? 'opis-ok' : 'opis-bad'}>{dxT(A.dx)}</b>
              {W.dx.pkt === 1 ? ' (ten sam dział)' : ''}
              <br />
            </>
          ) : (
            <>
              Nie wybrano rozpoznania.
              <br />
            </>
          )}
          Klucz: <b>{key.rozpoznanie}</b>
        </p>
        <div className="sub">Postępowanie</div>
        <p className="opis-line">
          {A.post ? (
            <>
              Twoje: <b className={W.post.ok ? 'opis-ok' : 'opis-bad'}>{postT(A.post)}</b>
              <br />
            </>
          ) : (
            <>
              Nie wybrano postępowania.
              <br />
            </>
          )}
          Pasuje: {W.post.oczekiwane.map(postT).join(' albo ')}
        </p>
        <p className="opis-line muted">{key.postepowanie}</p>
      </div>

      {WYJASNIENIA[key.id] ? (
        <div className="note">
          <div className="sub" style={{ marginTop: 0 }}>
            Co się dzieje w sercu
          </div>
          <p style={{ margin: '4px 0 0', lineHeight: 1.55 }}>{WYJASNIENIA[key.id]}</p>
          {ATLAS_LINK[key.id] ? (
            <a href={'#/atlas/' + ATLAS_LINK[key.id]} style={{ display: 'inline-block', marginTop: 8, fontSize: 13 }}>
              Zobacz animację w atlasie →
            </a>
          ) : null}
        </div>
      ) : null}

      <p className="muted opis-hint">Najedź na trafioną albo przeoczoną zmianę, a na wydruku obrysują się odprowadzenia, w których ją widać.</p>

      <div className="opis-nav">
        <button type="button" onClick={onRetry}>
          Spróbuj jeszcze raz
        </button>
        <button type="button" className="accent" onClick={onNext}>
          Następny zapis →
        </button>
      </div>
    </div>
  );
}
