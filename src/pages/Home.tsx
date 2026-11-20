import { useState } from 'react';
import { PaperStrip } from '../components/PaperStrip';
import { PRZYPADKI } from '../data/przypadki';
import { ZAB } from '../data/atlas';

const HERO_IDS = ['stemi-inf', 'af', 'av3', 'lbbb', 'afl', 'wenckebach', 'hiperk', 'vt', 'sinus'];
const HERO = HERO_IDS.map((id) => ZAB.find((z) => z.id === id)).filter((z): z is (typeof ZAB)[number] => !!z);
const HERO_CFGS = HERO.map((z) => z.cfg);

const PODGLAD: { txt: string; meta: string; v: 'ok' | 'miss' | 'zle'; werdykt: string }[] = [
  { txt: 'Uniesienie ST', meta: 'II, III, aVF', v: 'ok', werdykt: 'poprawne' },
  { txt: 'Obniżenie ST', meta: 'aVL', v: 'miss', werdykt: 'przeoczone' },
  { txt: 'Blok AV I stopnia', meta: 'PR 240 ms', v: 'ok', werdykt: 'poprawne' },
  { txt: 'Bradykardia', meta: '< 60/min', v: 'zle', werdykt: 'błędne' },
];

const WZORCE = ['sinus', 'av1', 'stemi-inf', 'af', 'lbbb'];
const MINI = WZORCE.map((id) => ZAB.find((z) => z.id === id)).filter((z): z is (typeof ZAB)[number] => !!z);

export function Home() {
  const [now, setNow] = useState(0);
  const cur = HERO[now];

  return (
    <div className="land">
      <section className="land-hero">
        <h1>Zobacz, skąd się bierze każdy załamek</h1>
        <p>
          Wydruki liczone z wektora pobudzenia serca, nie wklejone krzywe. Zaznaczasz, co widzisz, a zapis pokazuje, gdzie
          tego szukać.
        </p>
        <div className="land-cta">
          <a className="btn-primary" href="#/trening/quiz">
            Zacznij quiz
          </a>
          <a className="land-link" href="#/atlas">
            Przejrzyj atlas
          </a>
        </div>
      </section>

      <div className="land-strip">
        <PaperStrip cfg={HERO_CFGS} onCase={setNow} leads={['I', 'II', 'III']} live mmPx={6} rowMm={18} label="Zapis EKG rysowany na żywo w odprowadzeniach I, II i III" />
      </div>
      <div className="land-strip-cap">
        <span>
          Teraz na pasku:{' '}
          {cur ? (
            <a className="land-link" href={'#/atlas/' + cur.id}>
              {cur.name}
            </a>
          ) : null}
          . Każdy przebieg pióra to inny wzorzec z atlasu.
        </span>
        <span className="land-mono">25 mm/s · 10 mm/mV · I, II, III</span>
      </div>

      <section className="land-sec">
        <h2>Ćwiczysz na zapisie, nie na definicjach</h2>
        <p className="land-lead">
          W jednym EKG z karetki bywa kilka zmian naraz. Quiz pokazuje je wszystkie i dokłada pułapki, których w zapisie nie
          ma.
        </p>
        <div className="land-modes">
          <a className="land-quiz" href="#/trening/quiz">
            <h3>Quiz</h3>
            <p>Mężczyzna, 64 lata, ucisk w klatce od 40 minut. Co jest na zapisie?</p>
            <ul>
              {PODGLAD.map((r) => (
                <li key={r.txt} className={r.v}>
                  <span className="land-box" aria-hidden="true">
                    {r.v === 'miss' ? '' : '✓'}
                  </span>
                  <span>
                    {r.txt} <small>{r.meta}</small>
                  </span>
                  <span className="land-v">{r.werdykt}</span>
                </li>
              ))}
            </ul>
          </a>
          <div className="land-side">
            <a href="#/trening?format=opis">
              <h3>Pełny opis</h3>
              <p>Rytm, przewodzenie, oś, QRS, ST i T, na koniec wniosek i postępowanie.</p>
            </a>
            <a href="#/postepy">
              <h3>Postępy</h3>
              <p>Wyniki według działów. Dział, który wypada najsłabiej, wraca częściej.</p>
            </a>
          </div>
        </div>
      </section>

      <section className="land-sec">
        <h2>Atlas wzorców z bijącym sercem</h2>
        <p className="land-lead">Przy każdym wzorcu animacja tego, co dzieje się w mięśniu, i krzywa, która z tego wychodzi.</p>
        <div className="land-atlas">
          {MINI.map((z, i) => (
            <a key={z.id} className="land-pat" href={'#/atlas/' + z.id}>
              <PaperStrip cfg={z.cfg} leads={['II']} mmPx={4} rowMm={22} seed={11 + i} className="land-mini" label={z.name} />
              <h4>{z.name}</h4>
            </a>
          ))}
        </div>
      </section>

      <section className="land-end">
        <div>
          <h2>Pierwszy zapis czeka</h2>
          <div className="land-facts">
            <div>
              <b>{PRZYPADKI.length}</b>
              <span>przypadków w banku</span>
            </div>
            <div>
              <b>{ZAB.length}</b>
              <span>wzorców w atlasie</span>
            </div>
          </div>
          <p className="land-note">Bez konta i logowania, wszystko zostaje w przeglądarce.</p>
        </div>
        <a className="btn-primary" href="#/trening/quiz">
          Zacznij quiz
        </a>
      </section>
    </div>
  );
}
