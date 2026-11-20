import { useMemo } from 'react';
import { useHashRoute } from '../lib/hash';
import { randomSeed } from '../lib/generate';
import { TrainerCase } from '../trainer/TrainerCase';
import { TrainerSetup } from '../trainer/TrainerSetup';

export function TrainerPage() {
  const { path, params, navigate } = useHashRoute();
  const seedRaw = path.startsWith('/trener/') ? path.slice('/trener/'.length) : '';
  const seedNum = Number(seedRaw);
  const seed = seedRaw && isFinite(seedNum) && seedNum > 0 ? Math.floor(seedNum) : null;

  const poziomRaw = params.get('poziom');
  const poziom = poziomRaw === '1' ? 1 : poziomRaw === '2' ? 2 : poziomRaw === '3' ? 3 : undefined;
  const kat = params.get('kat') || undefined;
  const id = params.get('id') || undefined;
  const drill = params.get('drill') || undefined;

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (poziom) p.set('poziom', String(poziom));
    if (kat) p.set('kat', kat);
    if (drill) p.set('drill', drill);
    const s = p.toString();
    return s ? '?' + s : '';
  }, [poziom, kat, drill]);

  if (seed == null) return <TrainerSetup navigate={navigate} drill={drill} />;

  return (
    <TrainerCase
      seed={seed}
      poziom={poziom}
      kat={kat}
      id={id}
      drill={drill}
      navigate={navigate}
      onNextSeed={() => navigate('/trener/' + randomSeed() + query)}
    />
  );
}
