import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EcgPrint, type EcgPrintHandle } from '../components/EcgPrint';
import { generateCase, randomSeed, type GenerateResult } from '../lib/generate';
import { quizCech, type CechaQ } from '../lib/cechy';
import { saveEntry } from '../lib/historia';
import { diagnosticMarks, kryterium, marksFor, type Kryterium } from '../lib/kryteria';
import { PRZYPADKI } from '../data/przypadki';
import { useReal } from '../lib/real';
import { RealToggle } from '../components/RealToggle';
import { WYJASNIENIA } from '../data/wyjasnienia';
import { Omowienie, pokazNaWydruku, type KrokOmowienia } from './Omowienie';

export interface QuizProps {
  seed: number;
  poziom?: 1 | 2 | 3;
  kat?: string;
  id?: string;
}

interface Round {
  seed: number;
  gen: GenerateResult;
  items: CechaQ[];
}

interface Retry {
  id: string;
  due: number;
}

const SERIA = 10;
const RETRY_AFTER = 3;
const FOCUS = 'var(--focus)';

function printFooter(pomiary: string): string {
  const g = (re: RegExp) => pomiary.match(re)?.[1] ?? '---';
  const hr = g(/HR\s+(\S+)/);
  const pr = g(/PR\s+(\S+)/);
  const qrs = g(/QRS\s+(\d+|---)/);
  const qt = g(/QT\/QTc\s+(\S+)/);
  const ax = g(/P\/QRS\/T\s+(\S+)/);
  return `25 mm/s  10 mm/mV    HR ${hr}/min   PR ${pr} ms   QRS ${qrs} ms   QT/QTc ${qt} ms   P/QRS/T ${ax}°`;
}

function makeRound(seed: number, poziom?: 1 | 2 | 3, kat?: string, exclude: string[] = [], id?: string, real = false): Round {
  let gen: GenerateResult;
  try {
    gen = generateCase({ seed, poziom, kat, excludeIds: exclude, id, real });
  } catch {
    gen = generateCase({ seed, excludeIds: exclude, real });
  }
  return { seed, gen, items: quizCech(gen, seed) };
}

function syncUrl(seed: number, poziom?: 1 | 2 | 3, kat?: string) {
  const q = new URLSearchParams({ seed: String(seed) });
  if (poziom) q.set('poziom', String(poziom));
  if (kat) q.set('kat', kat);
  try {
    window.history.replaceState(null, '', '#/?' + q.toString());
  } catch {
    /* adres zostaje bez zmian */
  }
}

const touch = typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(hover: none)').matches;

type Focus = { kind: 'k'; i: number } | { kind: 'c'; id: string };
const same = (a: Focus | null, b: Focus | null) =>
  !!a && !!b && a.kind === b.kind && (a.kind === 'k' ? a.i === (b as { i: number }).i : a.id === (b as { id: string }).id);

export function Quiz({ seed, poziom, kat, id }: QuizProps) {
  const [round, setRound] = useState<Round | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(0);
  const [right, setRight] = useState(0);
  const [pktSum, setPktSum] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [total, setTotal] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [retry, setRetry] = useState<Retry[]>([]);
  const [hover, setHover] = useState<Focus | null>(null);
  const [pinned, setPinned] = useState<Focus | null>(null);
  const [tour, setTour] = useState<number | null>(null);
  const ref = useRef<EcgPrintHandle | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);
  const [real] = useReal();
  const realRef = useRef(real);

  const reset = () => {
    setSel([]);
    setChecked(false);
    setHover(null);
    setPinned(null);
    setTour(null);
  };

  useEffect(() => {
    if (realRef.current === real) return;
    realRef.current = real;
    if (!round || checked) return;
    setRound(makeRound(round.seed, poziom, kat, [], undefined, real));
    reset();
  }, [real, round, checked, poziom, kat]);

  useEffect(() => {
    const r = makeRound(seed, poziom, kat, [], id, realRef.current);
    setRound(r);
    setSeen([r.gen.key.id]);
    reset();
  }, [seed, poziom, kat, id]);

  const next = useCallback(() => {
    if (done >= SERIA) {
      setDone(0);
      setRight(0);
      setPktSum(0);
      setStreak(0);
    }
    const due = retry.find((r) => r.due <= total);
    const s = randomSeed();
    const r = due ? makeRound(s, undefined, undefined, [], due.id, real) : makeRound(s, poziom, kat, seen, undefined, real);
    if (due) setRetry((q) => q.filter((x) => x !== due));
    setRound(r);
    setSeen((v) => [...v, r.gen.key.id].slice(-24));
    reset();
    syncUrl(s, poziom, kat);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [done, retry, total, poziom, kat, seen, real]);

  const toggle = useCallback(
    (cid: string) => {
      if (checked) return;
      setSel((v) => (v.includes(cid) ? v.filter((x) => x !== cid) : [...v, cid]));
    },
    [checked]
  );

  const check = useCallback(() => {
    if (!round || checked) return;
    const items = round.items;
    const good = items.filter((c) => c.jest === sel.includes(c.id)).length;
    const pkt = Math.round((good / items.length) * 100);
    const perfect = good === items.length;
    const caseId = round.gen.key.id;
    setChecked(true);
    setDone((d) => d + 1);
    setTotal((t) => t + 1);
    setPktSum((p) => p + pkt);
    if (perfect) {
      setRight((r) => r + 1);
      setStreak((s) => {
        const v = s + 1;
        setBest((b) => Math.max(b, v));
        return v;
      });
    } else {
      setStreak(0);
      setRetry((q) => (q.some((x) => x.id === caseId) ? q : [...q, { id: caseId, due: total + 1 + RETRY_AFTER }]));
    }
    const missed = items.filter((c) => c.jest && !sel.includes(c.id)).map((c) => c.t);
    const extra = items.filter((c) => !c.jest && sel.includes(c.id)).map((c) => c.t);
    saveEntry({
      seed: round.seed,
      id: caseId,
      poziom: PRZYPADKI.find((p) => p.id === caseId)?.poziom ?? 1,
      wynik: pkt,
      uwaga: perfect
        ? 'quiz: wszystko trafione'
        : 'quiz: ' + [missed.length ? 'przeoczone ' + missed.join(', ') : '', extra.length ? 'nadmiarowe ' + extra.join(', ') : ''].filter(Boolean).join('; '),
      tryb: 'quiz',
    });
    window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 60);
  }, [round, checked, sel, total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName ?? '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      const onControl = !!el?.closest?.('button, a, summary, [role="button"]');
      if (checked && tourRef.current != null) {
        if (e.code === 'ArrowRight' || (!onControl && (e.code === 'Enter' || e.code === 'Space'))) {
          e.preventDefault();
          goTourRef.current(tourRef.current + 1);
        } else if (e.code === 'ArrowLeft') {
          e.preventDefault();
          goTourRef.current(tourRef.current - 1);
        } else if (e.code === 'Escape') goTourRef.current(null);
        return;
      }
      if (checked) {
        if (onControl) return;
        if (e.code === 'Space' || e.code === 'ArrowRight' || e.code === 'Enter') {
          e.preventDefault();
          next();
        }
        return;
      }
      if (e.code === 'Enter' && !onControl) {
        e.preventDefault();
        check();
        return;
      }
      const n = Number(e.key);
      if (n >= 1 && round && n <= round.items.length) {
        e.preventDefault();
        toggle(round.items[n - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [checked, next, check, toggle, round]);

  const solved = useMemo(() => (done ? Math.round(pktSum / done) : 0), [done, pktSum]);

  const kroki = useMemo(() => {
    if (!checked || !round) return [];
    const jest: KrokOmowienia[] = round.items.filter((c) => c.jest).map((c) => ({ c, st: sel.includes(c.id) ? 'ok' : 'miss' }));
    const pul: KrokOmowienia[] = round.items.filter((c) => !c.jest && sel.includes(c.id)).map((c) => ({ c, st: 'pul' }));
    return [...jest, ...pul];
  }, [checked, round, sel]);

  const tourRef = useRef<number | null>(null);
  tourRef.current = tour;
  const goTour = (i: number | null) => {
    if (i == null || i < 0 || i >= kroki.length) {
      setTour(null);
      setPinned(null);
      setHover(null);
      ref.current?.reset();
      return;
    }
    setTour(i);
    setHover(null);
    const k = kroki[i];
    if (!round) return;
    setPinned(k.st === 'pul' ? null : { kind: 'c', id: k.c.id });
    pokazNaWydruku(k, round.gen, ref.current);
    printRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };
  const goTourRef = useRef(goTour);
  goTourRef.current = goTour;

  const [tick, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  const kryteria = useMemo(() => (round ? round.gen.key.elementy.map((t) => ({ t, ...kryterium(t) })) : []), [round]);

  const activeF = pinned ?? hover;
  let active: Kryterium | null = null;
  if (activeF?.kind === 'k' && kryteria[activeF.i]?.wizualne) active = kryteria[activeF.i];
  if (activeF?.kind === 'c') active = round?.items.find((c) => c.id === activeF.id && c.jest)?.k ?? null;
  const focus = active && active.leads.length ? active.leads : null;

  const review = useMemo(() => {
    if (!checked || !round) return undefined;
    const all = round.gen.key.zaznaczenia;
    const marks = active ? marksFor(active, all) : diagnosticMarks(all, round.gen.key.id);
    return { zaznaczenia: marks, focus: focus ?? undefined, dim: tour != null };
  }, [checked, round, active, focus, tour]);

  if (!round) return <div className="card">Ładowanie…</div>;

  const { EX, key } = round.gen;
  const endOfSeries = done >= SERIA;
  const good = round.items.filter((c) => c.jest === sel.includes(c.id)).length;
  const perfect = good === round.items.length;

  const onHover = (f: Focus | null) => {
    if (pinned) return;
    setHover(f);
  };
  const pin = (f: Focus, leads: string[]) => {
    if (same(pinned, f)) {
      setPinned(null);
      return;
    }
    setPinned(f);
    if (leads.length) printRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <>
      <div className="quiz-head">
        <h2>Quiz: co jest na tym EKG?</h2>
        <span className="stat-row">
          <span className="stat">
            <b>{Math.min(done, SERIA)}</b>/{SERIA}
          </span>
          <span className="stat">
            bezbłędnych <b>{right}</b>
          </span>
          <span className="stat">
            seria <b>{streak}</b>
          </span>
          <span className="stat">
            rekord <b>{best}</b>
          </span>
          {done ? (
            <span className="stat">
              średnio <b>{solved}%</b>
            </span>
          ) : null}
          {retry.length ? (
            <span className="stat">
              do powtórki <b>{retry.length}</b>
            </span>
          ) : null}
        </span>
        <div className="actions">
          <RealToggle compact />
          {checked ? (
            <button type="button" className="accent mini" onClick={next}>
              {endOfSeries ? 'Nowa seria →' : 'Następne EKG →'}
            </button>
          ) : null}
        </div>
      </div>
      {EX.kontekst ? <div className="quiz-context">{EX.kontekst}</div> : null}

      <div className="quiz-split">
        <div className="quiz-print" ref={printRef}>
          <EcgPrint
            ref={ref}
            ecg={EX.ecg}
            seed={EX.seed}
            review={review}
            footer={printFooter(key.pomiary)}
            onDraw={tour != null ? bump : undefined}
          />
          {checked && tour != null ? (
            <Omowienie kroki={kroki} i={tour} gen={round.gen} onGo={goTour} print={ref.current} host={printRef.current} tick={tick} />
          ) : null}
        </div>

        <div className="quiz-side">
          <div className="card">
            <div className="stat" style={{ marginBottom: 8 }}>
              {EX.plec}, {EX.wiek} l. · seed {round.seed}
              {touch ? '' : ` · 1–${round.items.length} zaznacza, Enter sprawdza`}
            </div>
            <h3 style={{ marginTop: 0, marginBottom: 4 }}>Co widzisz na tym zapisie?</h3>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 0 12px', lineHeight: 1.5 }}>
              Na liście są wszystkie zmiany z tego zapisu i kilka pułapek. Zaznacz te, które naprawdę widzisz.
            </p>
            <div className="quiz-list">
              {round.items.map((c, i) => {
                const on = sel.includes(c.id);
                let cls = on ? 'quiz-opt sel' : 'quiz-opt';
                let werdykt = '';
                if (checked) {
                  if (c.jest && on) [cls, werdykt] = ['quiz-opt ok', 'jest'];
                  else if (c.jest) [cls, werdykt] = ['quiz-opt miss', 'przeoczone'];
                  else if (on) [cls, werdykt] = ['quiz-opt zle', 'nie ma'];
                  else [cls, werdykt] = ['quiz-opt neutral', ''];
                }
                const f: Focus = { kind: 'c', id: c.id };
                const canFocus = checked && c.jest;
                const isPinned = canFocus && same(pinned, f);
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={cls}
                    role={checked ? undefined : 'checkbox'}
                    aria-checked={checked ? undefined : on}
                    aria-pressed={checked && canFocus ? isPinned : undefined}
                    onClick={() => (checked ? canFocus && pin(f, c.k.leads) : toggle(c.id))}
                    onMouseEnter={() => canFocus && onHover(f)}
                    onMouseLeave={() => canFocus && onHover(null)}
                    style={isPinned ? { boxShadow: 'inset 3px 0 0 ' + FOCUS } : undefined}
                  >
                    <span className="quiz-key">{i + 1}</span>
                    <span className={'quiz-box' + (on ? ' on' : '')} aria-hidden>
                      {on ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1 }}>{c.t}</span>
                    {werdykt ? <span className="quiz-verdict">{werdykt}</span> : null}
                  </button>
                );
              })}
            </div>
            {!checked ? (
              <button type="button" className="accent" style={{ marginTop: 12, width: '100%' }} onClick={check}>
                Sprawdź{sel.length ? ` (${sel.length})` : ''}
              </button>
            ) : null}
          </div>

          <div ref={resultRef} aria-live="polite">
            {checked ? (
              <div className="card">
                {kroki.length ? (
                  <button type="button" className="accent tour-start" onClick={() => goTour(0)}>
                    Omów zapis krok po kroku →
                  </button>
                ) : null}
                <div style={{ fontSize: 14, marginBottom: 6, lineHeight: 1.5 }}>
                  {perfect ? (
                    <b style={{ color: 'var(--ok)' }}>Wszystko trafione.</b>
                  ) : (
                    <b style={{ color: 'var(--brak)' }}>
                      {good} / {round.items.length} poprawnie.
                    </b>
                  )}{' '}
                  <span className="muted">Rozpoznanie:</span> <b>{key.rozpoznanie}</b>
                </div>
                <p className="muted" style={{ fontSize: 12.5, margin: '0 0 8px', lineHeight: 1.5 }}>
                  {touch ? 'Dotknij' : 'Najedź na'} cechę, która jest na zapisie – na wydruku pokażą się jej znaczniki.
                </p>
                <div className="meas" style={{ marginBottom: 12 }}>
                  {key.pomiary}
                </div>

                {WYJASNIENIA[key.id] ? (
                  <div className="note">
                    <div className="sub" style={{ marginTop: 0 }}>
                      Co się dzieje w sercu
                    </div>
                    <p style={{ margin: '4px 0 0', lineHeight: 1.55 }}>{WYJASNIENIA[key.id]}</p>
                  </div>
                ) : null}

                <div className="sub">Kryteria rozpoznania – gdzie je widać na wydruku</div>
                <p className="muted" style={{ fontSize: 12.5, margin: '2px 0 8px', lineHeight: 1.5 }}>
                  {touch ? 'Dotknij' : 'Najedź na'} kryterium – na wydruku obrysują się odprowadzenia, w których je widać.
                  Kliknięcie przypina wybór.
                </p>
                <ul className="kryt-list">
                  {kryteria.map((k, i) => {
                    const f: Focus = { kind: 'k', i };
                    const isActive = same(pinned, f);
                    if (!k.wizualne)
                      return (
                        <li key={k.t}>
                          <div className="kryt-note">
                            <span aria-hidden className="kryt-mark">
                              i
                            </span>
                            <span style={{ flex: '1 1 200px' }}>{k.t}</span>
                            <span style={{ fontSize: 11.5 }}>{k.nieobecne ? 'nieobecne' : 'kliniczne'}</span>
                          </div>
                        </li>
                      );
                    return (
                      <li key={k.t}>
                        <button
                          type="button"
                          className="kryt-hit"
                          onMouseEnter={() => onHover(f)}
                          onMouseLeave={() => onHover(null)}
                          onFocus={() => onHover(f)}
                          onBlur={() => onHover(null)}
                          onClick={() => pin(f, k.leads)}
                          aria-pressed={isActive}
                          style={{
                            borderColor: isActive ? FOCUS : undefined,
                            boxShadow: isActive ? 'inset 3px 0 0 ' + FOCUS : undefined,
                          }}
                        >
                          <span style={{ color: FOCUS, fontWeight: 600 }}>✓</span>
                          <span style={{ flex: '1 1 200px' }}>{k.t}</span>
                          {k.leads.length ? (
                            <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {k.leads.map((l) => (
                                <span key={l} className="badge" style={{ border: '1px solid ' + FOCUS, color: FOCUS }}>
                                  {l}
                                </span>
                              ))}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {pinned ? (
                  <button
                    type="button"
                    className="mini"
                    style={{ marginBottom: 12 }}
                    onClick={() => {
                      setPinned(null);
                      setHover(null);
                    }}
                  >
                    Pokaż wszystkie znaczniki
                  </button>
                ) : null}

                {endOfSeries ? (
                  <div className="note" style={{ marginBottom: 12 }}>
                    <b>Koniec serii:</b> {right} / {SERIA} bezbłędnych, średnio {solved}% poprawnych odpowiedzi, najdłuższa
                    seria {best}.{retry.length ? ' Zapisy z błędami wrócą w następnej serii.' : ''}
                  </div>
                ) : null}

                <button type="button" className="accent" onClick={next}>
                  {endOfSeries ? 'Nowa seria →' : 'Następne EKG →'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
