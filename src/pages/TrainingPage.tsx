import { useHashRoute } from '../lib/hash';
import { randomSeed } from '../lib/generate';
import { Quiz } from '../trainer/Quiz';
import { KATY } from '../trainer/steps';
import { PRZYPADKI } from '../data/przypadki';
import { RealToggle } from '../components/RealToggle';

const DRILLE = KATY.filter(([k]) => PRZYPADKI.some((p) => p.kat === k));
const REAL_COUNT = PRZYPADKI.filter((p) => p.id.startsWith('real-')).length;

export function TrainingPage() {
  const { path, params, navigate } = useHashRoute();

  if (path === '/trening/quiz') {
    const seedRaw = Number(params.get('seed'));
    const seed = isFinite(seedRaw) && seedRaw > 0 ? Math.floor(seedRaw) : randomSeed();
    const poziomRaw = params.get('poziom');
    const poziom = poziomRaw === '1' ? 1 : poziomRaw === '2' ? 2 : poziomRaw === '3' ? 3 : undefined;
    const katRaw = params.get('kat');
    const kat = katRaw && DRILLE.some(([k]) => k === katRaw) ? katRaw : undefined;
    const idRaw = params.get('id');
    const id = idRaw && PRZYPADKI.some((p) => p.id === idRaw) ? idRaw : undefined;
    return <Quiz seed={seed} poziom={poziom} kat={kat} id={id} navigate={navigate} />;
  }

  return (
    <>
      <div className="page-head">
        <h2>Trening</h2>
        <RealToggle />
      </div>
      <p className="page-lead">
        Zapisy z modelu wektorowego serca. <b>Real</b> dokłada przypadki, w których nakłada się kilka zmian naraz — jak
        na karetce, nie jak w podręczniku. {REAL_COUNT ? `Takich zapisów jest ${REAL_COUNT}.` : ''}
      </p>

      <div className="pick-grid">
        <a className="pick-card primary" href={'#/trening/quiz?seed=' + randomSeed()}>
          <h3>Quiz na zapisie</h3>
          <p>
            Wydruk i lista zmian — zaznaczasz te, które naprawdę widzisz, plus pułapki, których w zapisie nie ma. Po
            sprawdzeniu wydruk pokazuje, gdzie każdą z nich widać.
          </p>
          <span className="pick-go">Zacznij quiz →</span>
        </a>
        <a className="pick-card" href={'#/trener/' + randomSeed()}>
          <h3>Pełny opis</h3>
          <p>Dziewięć kroków od rytmu do wniosku, z punktacją i porównaniem z kluczem przypadku.</p>
          <span className="pick-go">Uruchom opis →</span>
        </a>
        <a className="pick-card" href="#/postepy">
          <h3>Postępy i powtórka</h3>
          <p>Wyniki według działów, osobno dla quizu i pełnego opisu, plus lista przypadków do powtórzenia.</p>
          <span className="pick-go">Zobacz wyniki →</span>
        </a>
      </div>

      <div className="kat-bar">
        <span className="sub" style={{ margin: '0 4px 0 0' }}>
          Quiz w jednym dziale
        </span>
        {DRILLE.map(([k, t]) => (
          <button key={k} type="button" onClick={() => navigate('/trening/quiz?seed=' + randomSeed() + '&kat=' + k)}>
            {t}
          </button>
        ))}
      </div>
    </>
  );
}
