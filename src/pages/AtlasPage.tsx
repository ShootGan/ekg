import { Fragment, useCallback, useEffect, useMemo } from 'react';
import { useHashRoute } from '../lib/hash';
import { ZAB } from '../data/atlas';
import { AtlasCase } from '../atlas/AtlasCase';
import '../atlas/atlas.css';

export const LAST_KEY = 'atlasEkg';

export function readLast(): string | null {
  try {
    return localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}

export function AtlasPage() {
  const { path, navigate } = useHashRoute();
  const sub = path.startsWith('/atlas/') ? path.slice('/atlas/'.length) : '';
  const current = useMemo(() => ZAB.find((z) => z.id === sub) || null, [sub]);

  const go = useCallback(
    (id: string) => {
      const hit = ZAB.find((x) => x.id === id);
      navigate('/atlas/' + (hit ? hit.id : ZAB[0].id));
    },
    [navigate]
  );

  const onPick = useCallback(
    (id: string, dir: number) => {
      if (dir === 0) {
        go(id);
        return;
      }
      const i = ZAB.findIndex((z) => z.id === id);
      go(ZAB[(i + dir + ZAB.length) % ZAB.length].id);
    },
    [go]
  );

  useEffect(() => {
    if (current) {
      try {
        localStorage.setItem(LAST_KEY, current.id);
      } catch {
        /* brak dostępu */
      }
    }
  }, [current]);

  if (current) {
    return (
      <>
        <AtlasCase z={current} onPick={onPick} />
        <p className="hint">
          <a href="#/atlas">← wróć do spisu przypadków</a>
        </p>
      </>
    );
  }

  const groups: { grp: string; items: typeof ZAB }[] = [];
  for (const z of ZAB) {
    const last = groups[groups.length - 1];
    if (last && last.grp === z.grp) last.items.push(z);
    else groups.push({ grp: z.grp, items: [z] });
  }

  const last = readLast();
  const start = ZAB.find((z) => z.id === last) || ZAB[0];

  return (
    <div className="atlas-index">
      <div className="page-head">
        <h2>Atlas EKG</h2>
      </div>
      <p className="page-lead">
        Piętnaście wzorców: co widać na krzywej, dlaczego tak wygląda według modelu wektorowego i co to znaczy dla
        pacjenta.
      </p>
      <div className="continue-bar">
        <span className="muted">{last ? 'Ostatnio oglądane' : 'Zacznij od'}</span>
        <a href={'#/atlas/' + start.id}>{start.name} →</a>
      </div>
      {groups.map((g) => (
        <Fragment key={g.grp}>
          <div className="grp-title">{g.grp}</div>
          <div className="grid">
            {g.items.map((z) => (
              <a className="entry" key={z.id} href={'#/atlas/' + z.id}>
                <b>{z.name}</b>
                <p>{z.sub}</p>
              </a>
            ))}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
