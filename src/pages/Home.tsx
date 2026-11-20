import { useMemo } from 'react';
import { generateCase } from '../lib/generate';
import { EcgPrint } from '../components/EcgPrint';
import { PRZYPADKI } from '../data/przypadki';
import { randomSeed } from '../lib/generate';

const CELLS: { href: string; title: string; text: string }[] = [
  {
    href: '#/trening',
    title: 'Trening',
    text: 'Jeden zapis, lista zmian i pułapek. Zaznaczasz to, co naprawdę widzisz, a wydruk od razu pokazuje, gdzie tego szukać.',
  },
  {
    href: '#/trener',
    title: 'Pełny opis',
    text: 'Dziewięć kroków od rytmu do wniosku, z punktacją i porównaniem z kluczem przypadku.',
  },
  {
    href: '#/atlas',
    title: 'Atlas',
    text: 'Piętnaście wzorców z bijącym sercem: co dzieje się w mięśniu i dlaczego tak wygląda krzywa.',
  },
  {
    href: '#/postepy',
    title: 'Postępy',
    text: 'Które działy wchodzą w nawyk, a które wciąż wypadają z opisu.',
  },
];

const HERO_ID = 'stemi-dolny';

export function Home() {
  const hero = useMemo(() => generateCase({ seed: 20260412, id: HERO_ID }), []);
  const caseCount = PRZYPADKI.length;

  return (
    <>
      <div className="home-lead">
        <h2>Opis 12-odprowadzeniowego EKG, ćwiczony do nawyku</h2>
        <p>
          Każdy załamek na wydruku liczy model wektorowy serca, nie gotowa krzywa. Dlatego prawa Einthovena i
          Goldbergera, oś serca i zmiany przeciwstawne wychodzą z modelu — także w zapisach, gdzie nakłada się kilka
          patologii naraz. Ten sam model rysuje wydruk, animację w atlasie i przypadki w quizie.
        </p>
        <div className="home-actions">
          <a className="btn-primary" href="#/trening/quiz">
            Zacznij od quizu
          </a>
          <a href="#/atlas">Przejrzyj atlas</a>
        </div>
      </div>

      <figure className="home-hero">
        <EcgPrint ecg={hero.EX.ecg} seed={hero.EX.seed} heightMm={112} />
        <figcaption>
          <span className="stat">
            STEMI ściany dolnej · uniesienie ST w II, III, aVF · zmiany przeciwstawne w aVL
          </span>
          <a href={'#/trener/' + randomSeed() + '?id=' + HERO_ID}>Otwórz w trenerze →</a>
        </figcaption>
      </figure>

      <div className="home-grid">
        {CELLS.map((c) => (
          <a className="home-cell" key={c.href} href={c.href}>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </a>
        ))}
      </div>

      <div className="home-foot">
        <span className="stat">
          <b>{caseCount}</b> przypadków w banku
        </span>
        <span className="stat">
          <b>15</b> wzorców w atlasie
        </span>
        <span className="stat">
          <b>9</b> kroków opisu
        </span>
        <span className="stat">
          <b>10</b> punktów za pełny opis
        </span>
      </div>
    </>
  );
}
