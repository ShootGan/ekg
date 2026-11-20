import { useState } from 'react';
import { PRZYPADKI } from '../data/przypadki';
import { randomSeed } from '../lib/generate';
import { lastIds } from '../lib/historia';
import { KATY } from './steps';
import { RealToggle } from '../components/RealToggle';
import { useReal } from '../lib/real';

export interface TrainerSetupProps {
  navigate: (to: string) => void;
  drill?: string;
}

const POZIOMY: (1 | 2 | 3)[] = [1, 2, 3];

export function TrainerSetup({ navigate, drill }: TrainerSetupProps) {
  const [poziom, setPoziom] = useState<1 | 2 | 3 | null>(null);
  const [kat, setKat] = useState<string | null>(null);
  const [konkret, setKonkret] = useState('');
  const [seed, setSeed] = useState('');
  const [real] = useReal();

  const query = (extra?: Record<string, string>): string => {
    const p = new URLSearchParams();
    if (poziom) p.set('poziom', String(poziom));
    if (kat) p.set('kat', kat);
    if (drill) p.set('drill', drill);
    for (const [k, v] of Object.entries(extra || {})) p.set(k, v);
    const s = p.toString();
    return s ? '?' + s : '';
  };

  const losuj = () => {
    const fresh = randomSeed();
    navigate('/trener/' + fresh + query());
  };

  const zKonkretu = () => {
    const id = konkret.trim();
    if (!id) return;
    navigate('/trener/' + randomSeed() + query({ id }));
  };

  const zSeedu = () => {
    const n = Number(seed);
    if (!n || !isFinite(n)) return;
    navigate('/trener/' + Math.floor(n) + query());
  };

  const pools = (k: string | null, p: 1 | 2 | 3 | null) =>
    PRZYPADKI.filter((x) => (real || !x.id.startsWith('real-')) && (!k || x.kat === k) && (!p || x.poziom === p)).length;

  const recent = lastIds(5);

  return (
    <div className="card">
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Trener</h2>
        <RealToggle />
      </div>
      <p className="muted">
        Trener losuje przypadek z banku ({PRZYPADKI.length} pozycji) i prowadzi przez opis krok po kroku — jedno pytanie naraz,
        z możliwością powrotu i poprawienia odpowiedzi przed oddaniem.
      </p>

      {drill ? (
        <div className="badge" style={{ marginBottom: 8 }}>
          Tryb drilla: {drill} — pełny drill jednej cechy powstanie osobno; teraz losuje zwykły przypadek.
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', marginTop: 12 }}>
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Poziom</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {POZIOMY.map((p) => (
              <button
                key={p}
                type="button"
                className={poziom === p ? 'on' : undefined}
                onClick={() => setPoziom(poziom === p ? null : p)}
              >
                {p}
              </button>
            ))}
            <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>
              {pools(kat, poziom)} przypadków
            </span>
          </div>
        </div>

        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Kategoria</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {KATY.filter(([k]) => PRZYPADKI.some((x) => x.kat === k)).map(([k, t]) => (
              <button key={k} type="button" className={kat === k ? 'on' : undefined} onClick={() => setKat(kat === k ? null : k)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16, alignItems: 'center' }}>
        <button type="button" className="accent" onClick={losuj}>
          Losuj przypadek →
        </button>
        <span className="muted" style={{ fontSize: 13 }}>
          {pools(kat, poziom)} przypadków w puli
        </span>
      </div>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--accent)' }}>Z konkretnego przypadku / seeda</summary>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <select value={konkret} onChange={(e) => setKonkret(e.target.value)} style={{ maxWidth: 380 }}>
            <option value="">— wybierz przypadek z banku —</option>
            {PRZYPADKI.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} · poz. {p.poziom} · {p.kat}
              </option>
            ))}
          </select>
          <button type="button" onClick={zKonkretu} disabled={!konkret}>
            Otwórz wybrany
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <input
            type="number"
            placeholder="seed, np. 123456"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            style={{ width: 200, fontFamily: 'var(--mono)' }}
          />
          <button type="button" onClick={zSeedu} disabled={!seed}>
            Otwórz seed
          </button>
        </div>
        {recent.length ? (
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Ostatnio przerabiane: {recent.join(', ')}
          </div>
        ) : null}
      </details>

      <div style={{ marginTop: 16 }}>
        <h3>Kroki opisu</h3>
        <ol>
          <li>rytm i miarowość,</li>
          <li>częstość komór i przedsionków,</li>
          <li>oś serca,</li>
          <li>załamek P i odstęp PR,</li>
          <li>przewodzenie AV, śródkomorowe i zatokowo-przedsionkowe,</li>
          <li>QRS: szerokość, woltaż, patologiczne Q,</li>
          <li>ST: uniesienia i obniżenia,</li>
          <li>T i QT,</li>
          <li>wniosek i postępowanie.</li>
        </ol>
        <p className="hint">Ocena: 8 punktów z rubryk opisu + 0–2 za wnioskowanie. Bez backendu — wszystko w przeglądarce.</p>
      </div>
    </div>
  );
}
