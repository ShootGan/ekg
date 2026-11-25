import { useHashRoute } from '../lib/hash';
import { randomSeed } from '../lib/generate';
import { Quiz } from '../trainer/Quiz';
import { PRZYPADKI } from '../data/przypadki';

export function QuizPage() {
  const { params } = useHashRoute();
  const seedRaw = Number(params.get('seed'));
  const seed = isFinite(seedRaw) && seedRaw > 0 ? Math.floor(seedRaw) : randomSeed();
  const poziomRaw = params.get('poziom');
  const poziom = poziomRaw === '1' ? 1 : poziomRaw === '2' ? 2 : poziomRaw === '3' ? 3 : undefined;
  const katRaw = params.get('kat');
  const kat = katRaw && PRZYPADKI.some((p) => p.kat === katRaw) ? katRaw : undefined;
  const idRaw = params.get('id');
  const id = idRaw && PRZYPADKI.some((p) => p.id === idRaw) ? idRaw : undefined;
  return <Quiz seed={seed} poziom={poziom} kat={kat} id={id} />;
}
