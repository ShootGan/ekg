import { GR, lab } from '../data/slownik';
import type { KeyJson } from '../lib/generate';
import type { Review as ReviewData, Single } from '../lib/ocena';
import type { Mark } from '../components/EcgPrint';
import type { TrainerAnswer } from '../lib/wniosek';
import { ScoreTable } from '../components/ScoreTable';
import { LeadGrid } from '../components/LeadGrid';
import { ChipGroup } from '../components/ChipGroup';
import { ATLAS_LINK, WYJASNIENIA } from '../data/wyjasnienia';

const COL = { ok: 'var(--ok)', brak: 'var(--brak)', zle: 'var(--zle)' };
const ALL = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

export interface ReviewProps {
  koperta: KeyJson;
  R: ReviewData;
  A: TrainerAnswer;
  uwagi: string[];
  wniosekPkt: number | null;
  onFocus: (z: Mark) => void;
  onRetry: () => void;
  onNext: () => void;
}

export function statusOf(z: Mark, R: ReviewData): 'ok' | 'brak' | 'zle' {
  if (z.m && R.leads && R.leads[z.m]) {
    const o = R.leads[z.m].opcje[z.n];
    if (o) return o;
    return R.el[z.pole] === 'ok' ? 'ok' : 'brak';
  }
  return (R.el[z.pole] as 'ok' | 'brak' | 'zle') || 'ok';
}

function GroupRow({ gk, R, A }: { gk: string; R: ReviewData; A: TrainerAnswer }) {
  const g = GR[gk];
  const rg = R.grupy[gk];
  if (!g || !rg) return null;
  const one = !!g.one;
  const opts: Record<string, 'ok' | 'brak' | 'zle'> = 'opcje' in rg ? { ...(rg.opcje as Record<string, 'ok' | 'brak' | 'zle'>) } : {};
  const keys = 'key' in rg ? (rg.key as string[]) : [];
  const val: string | string[] | undefined = one
    ? ((A as Record<string, unknown>)[gk] as string | undefined)
    : ((A as Record<string, unknown>)[gk] as string[] | undefined);
  if (one && typeof val === 'string') {
    const st = (rg as Single).st;
    if (st && st !== 'czesc') opts[val] = st as 'ok' | 'brak' | 'zle';
  }
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ fontSize: 12 }} className="muted">
        {g.t}
        {one && keys.length ? ' · klucz: ' + keys.map((v) => lab(gk, v)).join(' / ') : ''}
      </div>
      <ChipGroup gk={gk} value={val} options={opts} keyValue={keys} disabled all />
    </div>
  );
}

function LeadRow({ m, R }: { m: 'stUp' | 'stDn' | 'tNeg' | 'q'; R: ReviewData }) {
  const o = R.leads[m]?.opcje || {};
  const on = ALL.filter((n) => o[n] === 'ok' || o[n] === 'zle');
  const leads = m === 'stUp' ? { stUp: on } : m === 'stDn' ? { stDn: on } : { [m]: on };
  return (
    <div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>
        {{ stUp: 'ST ↑', stDn: 'ST ↓', tNeg: 'T ujemny', q: 'Q patologiczne' }[m]}
      </div>
      <LeadGrid kind={m === 'stUp' || m === 'stDn' ? 'st' : m} leads={leads} onStatus={o} disabled />
    </div>
  );
}

export function Review({ koperta, R, A, uwagi, wniosekPkt, onFocus, onRetry, onNext }: ReviewProps) {
  const tot = R.auto + (wniosekPkt ?? 0);
  const max = wniosekPkt != null ? 10 : 8;

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3 style={{ marginBottom: 6 }}>Sprawdzenie</h3>
      <div style={{ fontSize: 22, fontWeight: 600 }}>
        {String(tot).replace('.', ',')} / {max}
        {wniosekPkt == null ? (
          <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}> (wniosek ocenia prowadzący)</span>
        ) : null}
      </div>
      <div style={{ fontSize: 15, margin: '6px 0' }}>
        <b>Rozpoznanie:</b> {koperta.rozpoznanie}
      </div>
      <ScoreTable R={R} wniosekPkt={wniosekPkt} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: 'var(--muted)', margin: '6px 0' }}>
        {(
          [
            ['ok', 'zaznaczone dobrze', { background: COL.ok }],
            ['brak', 'pominięte', { background: 'var(--panel)', border: '2px dashed var(--brak)' }],
            ['zle', 'zaznaczone błędnie', { background: COL.zle }],
            ['key', 'prawidłowa odpowiedź', { background: 'var(--panel)', border: '2px solid var(--ok)' }],
          ] as [string, string, React.CSSProperties][]
        ).map(([k, t, s]) => (
          <span key={k}>
            <b style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, marginRight: 5, ...s }} />
            {t}
          </span>
        ))}
      </div>

      {uwagi.length ? (
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 14,
            lineHeight: 1.45,
            background: 'var(--bg)',
            borderLeft: '3px solid var(--accent)',
            padding: '8px 10px',
            margin: '8px 0',
          }}
        >
          {uwagi.map((u) => '• ' + u).join('\n')}
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 14, margin: '8px 0' }}>
          Bez różnic w rubrykach ocenianych automatycznie.
        </div>
      )}

      <details style={{ marginTop: 10 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Rubryki – co zaznaczono</summary>
        <div style={{ marginTop: 8 }}>
          {['rytm', 'miar', 'dod', 'os', 'P', 'sa', 'av', 'iv', 'morf', 'stF', 'T', 'qtK'].map((gk) => (
            <GroupRow key={gk} gk={gk} R={R} A={A} />
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10, marginTop: 10 }}>
            {(['stUp', 'stDn', 'tNeg', 'q'] as const).map((m) => (
              <LeadRow key={m} m={m} R={R} />
            ))}
          </div>
        </div>
      </details>

      <div style={{ marginTop: 12 }}>
        <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>Zaznaczenia na wydruku – kliknij, żeby przybliżyć:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {(koperta.zaznaczenia || []).map((z, i) => {
            const st = statusOf(z, R);
            return (
              <button key={i} type="button" onClick={() => onFocus(z)} style={{ fontSize: 12, padding: '3px 8px', borderLeft: '4px solid ' + COL[st] }}>
                {(z.n === 'pasek' ? 'II (pasek)' : z.n) + ': ' + z.txt}
              </button>
            );
          })}
          {!koperta.zaznaczenia?.length ? <span className="muted">brak</span> : null}
        </div>
      </div>

      {WYJASNIENIA[koperta.id] ? (
        <details open style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Co się dzieje w sercu</summary>
          <p style={{ marginTop: 6, lineHeight: 1.5 }}>{WYJASNIENIA[koperta.id]}</p>
          {ATLAS_LINK[koperta.id] ? <a href={'#/atlas/' + ATLAS_LINK[koperta.id]}>Zobacz animację w atlasie →</a> : null}
        </details>
      ) : null}

      <details open style={{ marginTop: 12 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Co musi paść w opisie</summary>
        <ul style={{ marginTop: 6 }}>
          {koperta.elementy.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </details>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Pułapki</summary>
        <ul style={{ marginTop: 6 }}>
          {koperta.pulapki.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </details>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Postępowanie (ZRM)</summary>
        <p style={{ marginTop: 6 }}>{koperta.postepowanie}</p>
      </details>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Pomiary z wydruku</summary>
        <p className="mono" style={{ marginTop: 6 }}>
          {koperta.pomiary}
        </p>
      </details>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={onRetry}>
          Jeszcze raz ten sam przypadek
        </button>
        <button type="button" className="accent" onClick={onNext}>
          Następny losowy →
        </button>
      </div>
    </div>
  );
}
