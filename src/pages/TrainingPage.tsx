import { useState } from 'react';
import { useHashRoute } from '../lib/hash';
import { randomSeed } from '../lib/generate';
import { lastIds } from '../lib/historia';
import { useReal } from '../lib/real';
import { Quiz } from '../trainer/Quiz';
import { KATY } from '../trainer/steps';
import { PRZYPADKI } from '../data/przypadki';
import { RealToggle } from '../components/RealToggle';

type Format = 'quiz' | 'opis';

const DZIALY = KATY.filter(([k]) => PRZYPADKI.some((p) => p.kat === k));

const POZIOMY: { p: 1 | 2 | 3; t: string }[] = [
  { p: 1, t: 'podstawy' },
  { p: 2, t: 'średni' },
  { p: 3, t: 'trudny' },
];

const FORMATY: { f: Format; t: string; opis: string }[] = [
  { f: 'quiz', t: 'Quiz', opis: 'Lista zmian i pułapek. Zaznaczasz to, co naprawdę widzisz.' },
  { f: 'opis', t: 'Pełny opis', opis: 'Pięć kroków od rytmu do rozpoznania i postępowania. Przeoczone zmiany krytyczne są wyróżnione.' },
];

function Setup({ navigate, start }: { navigate: (to: string) => void; start: Format }) {
  const [format, setFormat] = useState<Format>(start);
  const [kat, setKat] = useState<string | null>(null);
  const [poziom, setPoziom] = useState<1 | 2 | 3 | null>(null);
  const [konkret, setKonkret] = useState('');
  const [seed, setSeed] = useState('');
  const [real] = useReal();

  const baza = PRZYPADKI.filter((x) => (!kat || x.kat === kat) && (!poziom || x.poziom === poziom));
  const realne = baza.filter((x) => x.id.startsWith('real-'));
  const pula = real && realne.length ? realne.length : baza.length - realne.length;

  const go = (s: number, extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (poziom) p.set('poziom', String(poziom));
    if (kat) p.set('kat', kat);
    for (const [k, v] of Object.entries(extra || {})) p.set(k, v);
    const q = p.toString();
    if (format === 'quiz') navigate('/trening/quiz?seed=' + s + (q ? '&' + q : ''));
    else navigate('/trener/' + s + (q ? '?' + q : ''));
  };

  const recent = lastIds(5);

  return (
    <>
      <div className="page-head">
        <h2>Trening</h2>
        <RealToggle />
      </div>

      <div className="train-setup">
        <div className="train-row">
          <div className="train-label">Format</div>
          <div className="train-formats">
            {FORMATY.map((x) => (
              <button
                key={x.f}
                type="button"
                className={'train-format' + (format === x.f ? ' on' : '')}
                aria-pressed={format === x.f}
                onClick={() => setFormat(x.f)}
              >
                <b>{x.t}</b>
                <span>{x.opis}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="train-row">
          <div className="train-label">Dział</div>
          <div className="train-chips">
            <button type="button" className={kat === null ? 'on' : undefined} onClick={() => setKat(null)}>
              Wszystkie
            </button>
            {DZIALY.map(([k, t]) => (
              <button key={k} type="button" className={kat === k ? 'on' : undefined} onClick={() => setKat(kat === k ? null : k)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="train-row">
          <div className="train-label">Poziom</div>
          <div className="train-chips">
            <button type="button" className={poziom === null ? 'on' : undefined} onClick={() => setPoziom(null)}>
              Każdy
            </button>
            {POZIOMY.map(({ p, t }) => (
              <button key={p} type="button" className={poziom === p ? 'on' : undefined} onClick={() => setPoziom(poziom === p ? null : p)}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="train-go">
          <button type="button" className="btn-primary" onClick={() => go(randomSeed())} disabled={!pula}>
            Losuj zapis
          </button>
          <span className="muted">{pula ? pula + ' zapisów w puli' : 'Brak zapisów dla tych filtrów'}</span>
        </div>

        <details className="train-more">
          <summary>Konkretny przypadek albo seed</summary>
          <div className="train-row-inline">
            <select value={konkret} onChange={(e) => setKonkret(e.target.value)}>
              <option value="">Wybierz przypadek z banku</option>
              {PRZYPADKI.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} · poziom {p.poziom} · {p.kat}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => konkret && go(randomSeed(), { id: konkret })} disabled={!konkret}>
              Otwórz
            </button>
          </div>
          <div className="train-row-inline">
            <input type="number" placeholder="seed, np. 123456" value={seed} onChange={(e) => setSeed(e.target.value)} />
            <button
              type="button"
              onClick={() => {
                const n = Number(seed);
                if (n > 0 && isFinite(n)) go(Math.floor(n));
              }}
              disabled={!seed}
            >
              Otwórz seed
            </button>
          </div>
          {recent.length ? <p className="muted">Ostatnio: {recent.join(', ')}</p> : null}
        </details>
      </div>
    </>
  );
}

export function TrainingPage() {
  const { path, params, navigate } = useHashRoute();

  if (path === '/trening/quiz') {
    const seedRaw = Number(params.get('seed'));
    const seed = isFinite(seedRaw) && seedRaw > 0 ? Math.floor(seedRaw) : randomSeed();
    const poziomRaw = params.get('poziom');
    const poziom = poziomRaw === '1' ? 1 : poziomRaw === '2' ? 2 : poziomRaw === '3' ? 3 : undefined;
    const katRaw = params.get('kat');
    const kat = katRaw && DZIALY.some(([k]) => k === katRaw) ? katRaw : undefined;
    const idRaw = params.get('id');
    const id = idRaw && PRZYPADKI.some((p) => p.id === idRaw) ? idRaw : undefined;
    return <Quiz seed={seed} poziom={poziom} kat={kat} id={id} navigate={navigate} />;
  }

  return <Setup key={params.get('format') || 'quiz'} navigate={navigate} start={params.get('format') === 'opis' ? 'opis' : 'quiz'} />;
}
