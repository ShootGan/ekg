import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EcgPrint, type EcgPrintHandle, type Mark } from '../components/EcgPrint';
import { generateCase, type GenerateResult } from '../lib/generate';
import { useReal } from '../lib/real';
import { ocen, raport, type Review as ReviewData } from '../lib/ocena';
import { ocenWniosek, type TrainerAnswer } from '../lib/wniosek';
import { saveEntry } from '../lib/historia';
import { useAnswer, clearSeed } from './useAnswer';
import { Wizard } from './Wizard';
import { Review, statusOf } from './Review';

export interface TrainerCaseProps {
  seed: number;
  poziom?: 1 | 2 | 3;
  kat?: string;
  id?: string;
  navigate: (to: string) => void;
  onNextSeed: () => void;
}

const BADGE: React.CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 13,
  color: 'var(--muted)',
};

export function TrainerCase({ seed, poziom, kat, id, navigate, onNextSeed }: TrainerCaseProps) {
  const [gen, setGen] = useState<GenerateResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [real] = useReal();
  const [flash, setFlash] = useState('');
  const [R, setR] = useState<ReviewData | null>(null);
  const [wniosekPkt, setWniosekPkt] = useState<number | null>(null);
  const [uwagi, setUwagi] = useState<string[]>([]);
  const ref = useRef<EcgPrintHandle | null>(null);
  const a = useAnswer(seed);
  const flashTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    try {
      const g = generateCase({ seed, poziom, kat, id, real });
      setGen(g);
      setErr(null);
    } catch (e) {
      setGen(null);
      setErr(e instanceof Error ? e.message : String(e));
    }
    setR(null);
    setUwagi([]);
    setWniosekPkt(null);
  }, [seed, poziom, kat, id, real]);

  useEffect(() => {
    if (!gen) return;
    if (a.oddane && !R) oddaj();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen]);

  const show = useCallback((t: string) => {
    setFlash(t);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(''), 3500);
  }, []);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const oddaj = useCallback(() => {
    if (!gen) return;
    const rev = ocen(gen.key.klucz, a.A);
    const w = ocenWniosek(gen.key.id, a.A);
    rev.pola.wniosek.pkt = w.pkt;
    rev.pola.wniosek.st = w.pkt == null ? null : w.pkt >= 2 ? 'ok' : w.pkt > 0 ? 'czesc' : 'zle';
    const uw = raport(gen.key.klucz, a.A, rev);
    if (w.pkt === 0 && !a.A.dx) uw.unshift('Wniosek: nie wybrano rozpoznania i nie napisano tekstu – 0 pkt.');
    else if (w.pkt === 1) uw.unshift('Wniosek: ten sam dział, ale inne rozpoznanie – 1 pkt.');
    else if (w.pkt === 0 && a.A.dx) uw.unshift('Wniosek: inne rozpoznanie – 0 pkt.');
    setR(rev);
    setWniosekPkt(w.pkt);
    setUwagi(uw);
    a.setOddane(true);
    const total = rev.auto + (w.pkt ?? 0);
    const max = w.pkt != null ? 10 : 8;
    saveEntry({
      seed,
      id: gen.key.id,
      poziom: poziom ?? 0,
      wynik: Math.round((total / max) * 100),
      uwaga: uw.slice(0, 4).join(' · '),
    });
  }, [gen, a, seed, poziom]);

  const getLastDt = useCallback(() => ref.current?.getLastDt() ?? null, []);

  const onFocus = useCallback(
    (z: Mark) => {
      ref.current?.focusOn(z.t0, z.t1, z.n);
      const cv = document.querySelector('#ekg-print');
      cv?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    []
  );

  const reviewStatus = useCallback((m: Mark) => (R ? statusOf(m, R) : 'ok'), [R]);

  const marks = useMemo(() => (R ? gen?.key.zaznaczenia ?? [] : []), [R, gen]);

  const retry = () => {
    clearSeed(seed);
    a.reset();
    setR(null);
    setUwagi([]);
    setWniosekPkt(null);
    a.setOddane(false);
    a.setKrok(0);
  };

  if (err) {
    return (
      <div className="card">
        <h2>Trener</h2>
        <p style={{ color: 'var(--brak)' }}>{err}</p>
        <button type="button" onClick={() => navigate('/trening?format=opis')}>
          ← Trening
        </button>
      </div>
    );
  }
  if (!gen) return <div className="card">Ładowanie przypadku…</div>;

  const { EX, key } = gen;

  return (
    <>
      <div className="card" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'baseline' }}>
          <h2 style={{ margin: 0, textTransform: 'none', fontSize: 18, color: 'var(--ink)' }}>Ćwiczenie EKG</h2>
          <span style={BADGE}>
            {EX.plec}, {EX.wiek} l. · {EX.data} · {EX.godz}
          </span>
          <span className="badge">seed {seed}</span>
          {poziom ? <span className="badge">poziom {poziom}</span> : null}
          {kat ? <span className="badge">{kat}</span> : null}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="mini" onClick={() => navigate('/trening?format=opis')}>
              ← Trening
            </button>
            <button type="button" className="mini" onClick={onNextSeed}>
              Losuj następny
            </button>
          </div>
        </div>
        {EX.kontekst ? (
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '10px 12px',
              marginTop: 10,
              fontSize: 15,
              lineHeight: 1.45,
            }}
          >
            {EX.kontekst}
          </div>
        ) : null}
        {flash ? (
          <div className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            {flash}
          </div>
        ) : null}
      </div>

      <div id="ekg-print">
        <EcgPrint ref={ref} ecg={EX.ecg} seed={EX.seed} marks={marks} review={R ? { zaznaczenia: key.zaznaczenia } : undefined} reviewStatus={reviewStatus} />
      </div>

      {R ? (
        <Review
          koperta={key}
          R={R}
          A={a.A as TrainerAnswer}
          uwagi={uwagi}
          wniosekPkt={wniosekPkt}
          onFocus={onFocus}
          onRetry={retry}
          onNext={onNextSeed}
        />
      ) : null}

      <Wizard a={a} rozp={EX.rozp} R={R} getLastDt={getLastDt} onOddaj={oddaj} onFlash={show} />
    </>
  );
}
