import { useCallback, useEffect, useState } from 'react';
import { useHashRoute } from '../lib/hash';
import { clearAll, readAll, statsByKat, weakEntries } from '../lib/historia';
import { randomSeed } from '../lib/generate';
import { KATY } from '../trainer/steps';
import type { KatStat } from '../lib/historia';

const katLabel = (k: string) => KATY.find(([id]) => id === k)?.[1] ?? k;

function StatTable({ stats, unit }: { stats: KatStat[]; unit: string }) {
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: 14 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: '3px 12px 3px 0' }}>Dział</th>
          <th style={{ textAlign: 'right', padding: '3px 12px 3px 0' }}>{unit}</th>
          <th style={{ textAlign: 'right', padding: '3px 0' }}>n</th>
        </tr>
      </thead>
      <tbody>
        {stats.map((s) => (
          <tr key={s.kat}>
            <td style={{ padding: '3px 12px 3px 0' }}>{katLabel(s.kat)}</td>
            <td
              style={{
                padding: '3px 12px 3px 0',
                textAlign: 'right',
                fontFamily: 'var(--mono)',
                color: s.avg >= 70 ? 'var(--ok)' : s.avg >= 40 ? 'var(--zle)' : 'var(--brak)',
              }}
            >
              {s.avg}%
            </td>
            <td style={{ padding: '3px 0', textAlign: 'right', fontFamily: 'var(--mono)' }}>{s.n}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ProgressPage() {
  const { navigate } = useHashRoute();
  const [all, setAll] = useState(readAll);
  const [stats, setStats] = useState(() => statsByKat('opis'));
  const [qstats, setQstats] = useState(() => statsByKat('quiz'));
  const [weak, setWeak] = useState(weakEntries);

  const refresh = useCallback(() => {
    setAll(readAll());
    setStats(statsByKat('opis'));
    setQstats(statsByKat('quiz'));
    setWeak(weakEntries());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const opis = all.filter((h) => h.wynik != null && (h.tryb ?? 'opis') === 'opis');
  const quiz = all.filter((h) => h.wynik != null && h.tryb === 'quiz');
  const worst = stats.length ? stats[0] : null;
  const qworst = qstats.length ? qstats[0] : null;
  const pct = (a: typeof all) => Math.round(a.reduce((x, h) => x + h.wynik, 0) / a.length);

  const trenujSlabe = () => {
    if (!worst) return;
    navigate('/trener/' + randomSeed() + '?kat=' + encodeURIComponent(worst.kat));
  };
  const quizSlabe = () => {
    if (!qworst) return;
    navigate('/trening/quiz?seed=' + randomSeed() + '&kat=' + encodeURIComponent(qworst.kat));
  };

  return (
    <>
      <h2>Postępy</h2>
      <div className="card">
        <p className="muted">
          Statystyka wg działu: średni wynik i liczba podejść. Dane siedzą wyłącznie w tej przeglądarce (localStorage).
        </p>
        <div className="muted" style={{ fontSize: 13, marginBottom: 10 }}>
          Zapisanych: {all.length}
          {opis.length ? ' · pełny opis: ' + opis.length + ', średnio ' + pct(opis) + '% punktów' : ''}
          {quiz.length ? ' · quiz: ' + quiz.length + ' pytań, ' + pct(quiz) + '% trafień' : ''}
        </div>
        <h3>Pełny opis (średni wynik)</h3>
        {stats.length ? <StatTable stats={stats} unit="Średnia" /> : <p className="muted">Brak ocenionych opisów. Zacznij od trenera.</p>}
        <h3 style={{ marginTop: 14 }}>Quiz rozpoznań (odsetek trafień)</h3>
        {qstats.length ? <StatTable stats={qstats} unit="Trafienia" /> : <p className="muted">Brak odpowiedzi w quizie.</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button type="button" className="accent" onClick={trenujSlabe} disabled={!worst}>
            Opis: słabe strony{worst ? ' (' + katLabel(worst.kat) + ', ' + worst.avg + '%)' : ''}
          </button>
          <button type="button" onClick={quizSlabe} disabled={!qworst}>
            Quiz: słabe strony{qworst ? ' (' + katLabel(qworst.kat) + ', ' + qworst.avg + '%)' : ''}
          </button>
          <button type="button" onClick={() => navigate('/trener')}>
            Losowy przypadek
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Wyczyścić całą historię ćwiczeń?')) {
                clearAll();
                refresh();
              }
            }}
          >
            Wyczyść historię
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Do powtórki (poniżej 70%)</h3>
        {weak.length ? (
          <ul>
            {weak
              .slice()
              .reverse()
              .map((h) => (
                <li key={h.seed}>
                  <a href={h.tryb === 'quiz' ? '#/trening/quiz?seed=' + h.seed + '&id=' + h.id : '#/trener/' + h.seed}>{h.id}</a>{' '}
                  — {h.tryb === 'quiz' ? 'quiz, nietrafione' : h.wynik + '%'}{' '}
                  <span className="muted">
                    ({katLabel(h.kat)}, poz. {h.poziom})
                  </span>
                  {h.uwaga ? <span className="muted"> · {h.uwaga}</span> : null}
                </li>
              ))}
          </ul>
        ) : (
          <p className="muted">Brak wyników poniżej 70%.</p>
        )}
      </div>
    </>
  );
}
