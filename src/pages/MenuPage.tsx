import { useState } from 'react';
import { useHashRoute } from '../lib/hash';
import { randomSeed } from '../lib/generate';
import { readAll } from '../lib/historia';
import { PRZYPADKI } from '../data/przypadki';

type Poziom = 1 | 2 | 3 | null;

const POZIOMY: { p: Poziom; t: string; opis: string }[] = [
  { p: null, t: 'Wszystkie', opis: 'Losowo z całego banku, trudne trochę rzadziej.' },
  { p: 1, t: 'Podstawy', opis: 'Jedna wyraźna zmiana: rytm, blok, oś, przerost.' },
  { p: 2, t: 'Średnie', opis: 'Mniej oczywiste obrazy, łatwiej o pomyłkę.' },
  { p: 3, t: 'Trudne', opis: 'Zapisy jak z karetki: kilka zmian naraz.' },
];

const DZIALY: [string, string][] = [
  ['niedokrwienie', 'Niedokrwienie / zawał'],
  ['rytm', 'Zaburzenia rytmu'],
  ['przewodzenie', 'Przewodzenie'],
  ['elementy', 'P, Q, przerosty'],
  ['os', 'Oś'],
  ['elektrolity', 'Elektrolity'],
  ['inne', 'Inne'],
  ['nzk', 'NZK'],
].filter(([k]) => PRZYPADKI.some((p) => p.kat === k)) as [string, string][];

const KEY = 'ekg-quiz-menu';

function zapamietane(): { p: Poziom; kat: string | null } {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    const p = v.p === 1 || v.p === 2 || v.p === 3 ? v.p : null;
    const kat = typeof v.kat === 'string' && DZIALY.some(([k]) => k === v.kat) ? v.kat : null;
    return { p, kat };
  } catch {
    return { p: null, kat: null };
  }
}

export function MenuPage() {
  const { navigate } = useHashRoute();
  const [start] = useState(zapamietane);
  const [poziom, setPoziom] = useState<Poziom>(start.p);
  const [kat, setKat] = useState<string | null>(start.kat);

  const pula = PRZYPADKI.filter((x) => (!poziom || x.poziom === poziom) && (!kat || x.kat === kat)).length;
  const ile = (p: Poziom) => PRZYPADKI.filter((x) => (!p || x.poziom === p) && (!kat || x.kat === kat)).length;

  const historia = readAll().filter((e) => e.tryb === 'quiz');
  const ostatnie = historia.slice(-20);
  const srednia = ostatnie.length ? Math.round(ostatnie.reduce((a, e) => a + e.wynik, 0) / ostatnie.length) : null;

  const go = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ p: poziom, kat }));
    } catch {
      /* bez zapamiętania */
    }
    const q = new URLSearchParams({ seed: String(randomSeed()) });
    if (poziom) q.set('poziom', String(poziom));
    if (kat) q.set('kat', kat);
    navigate('/quiz?' + q.toString());
  };

  return (
    <div className="menu">
      <div className="menu-head">
        <h1>Quiz EKG</h1>
        <p>Zapis 12 odprowadzeń i lista zmian z pułapkami. Zaznaczasz to, co naprawdę widzisz, a po sprawdzeniu wydruk pokazuje, gdzie tego szukać.</p>
        {srednia != null ? (
          <p className="menu-stat">
            Ostatnie {ostatnie.length} zapisów: średnio <b>{srednia}%</b>
          </p>
        ) : null}
      </div>

      <div className="train-setup">
        <div className="train-row">
          <div className="train-label">Poziom</div>
          <div className="menu-poziomy">
            {POZIOMY.map((x) => (
              <button
                key={x.t}
                type="button"
                className={'train-format' + (poziom === x.p ? ' on' : '')}
                aria-pressed={poziom === x.p}
                onClick={() => setPoziom(x.p)}
              >
                <b>{x.t}</b>
                <span>{x.opis}</span>
                <small>{ile(x.p)} zapisów</small>
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

        <div className="train-go">
          <button type="button" className="btn-primary" onClick={go} disabled={!pula}>
            Start
          </button>
          <span className="muted">{pula ? 'Seria 10 zapisów z ' + pula + ' w puli' : 'Brak zapisów dla tych filtrów'}</span>
        </div>
      </div>
    </div>
  );
}
