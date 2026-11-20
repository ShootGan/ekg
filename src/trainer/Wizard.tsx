import { useState } from 'react';
import type { Review, Single } from '../lib/ocena';
import type { TrainerAnswer } from '../lib/wniosek';
import type { Rozp } from '../lib/generate';
import { ChipGroup } from '../components/ChipGroup';
import { LeadGrid } from '../components/LeadGrid';
import { NumberField } from '../components/NumberField';
import { DxPicker } from '../components/DxPicker';
import { STEPS } from './steps';
import type { UseAnswer } from './useAnswer';

export interface WizardProps {
  a: UseAnswer;
  rozp: Rozp[];
  R: Review | null;
  getLastDt: () => number | null;
  onOddaj: () => void;
  onFlash: (t: string) => void;
}

const INP: React.CSSProperties = {
  width: '100%',
  padding: '8px',
  fontSize: 14,
  lineHeight: 1.45,
  borderRadius: 6,
  border: '1px solid var(--line)',
  background: 'var(--panel)',
  color: 'var(--ink)',
  resize: 'vertical',
};

const MORE: React.CSSProperties = { cursor: 'pointer', fontSize: 13, color: 'var(--accent)', padding: '3px 0' };

function copyText(t: string): void {
  try {
    void navigator.clipboard.writeText(t);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = t;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

export function Wizard({ a, rozp, R, getLastDt, onOddaj, onFlash }: WizardProps) {
  const { A, toggle, setOne, setNum, toggleLead, patch, opis, setOpis, reczny, odnow, qtc, reset } = a;
  const locked = !!R;
  const krok = Math.min(a.krok, STEPS.length - 1);
  const step = STEPS[krok];
  const [more, setMore] = useState<Record<string, boolean>>({});

  const go = (i: number) => a.setKrok(Math.max(0, Math.min(STEPS.length - 1, i)));

  const single = (gk: string): { options: Record<string, 'ok' | 'brak' | 'zle'>; keyValue: string[] } => {
    if (!R) return { options: {}, keyValue: [] };
    const g = R.grupy[gk] as Single | undefined;
    if (!g || !g.key) return { options: {}, keyValue: [] };
    const val = (A as Record<string, unknown>)[gk];
    const options: Record<string, 'ok' | 'brak' | 'zle'> = {};
    if (val && g.st && g.st !== 'czesc') options[val as string] = g.st as 'ok' | 'zle';
    return { options, keyValue: g.key };
  };

  const multi = (gk: string): { options: Record<string, 'ok' | 'brak' | 'zle'>; keyValue: string[] } => {
    if (!R) return { options: {}, keyValue: [] };
    const g = R.grupy[gk] as { opcje: Record<string, 'ok' | 'brak' | 'zle'> } | undefined;
    return { options: g?.opcje || {}, keyValue: [] };
  };

  const stepSt = (rev: string[]): 'ok' | 'brak' | 'zle' => {
    if (!R) return 'ok';
    const ss = rev.map((k) => {
      if (k === 'wniosek') {
        const p = R.pola.wniosek.pkt;
        return p == null ? 'ok' : p >= 2 ? 'ok' : p > 0 ? 'brak' : 'zle';
      }
      return (R.el as Record<string, 'ok' | 'brak' | 'zle'>)[k] || 'ok';
    });
    if (ss.indexOf('zle') >= 0) return 'zle';
    if (ss.indexOf('brak') >= 0) return 'brak';
    return 'ok';
  };

  const dotStyle = (i: number): React.CSSProperties => {
    const st = locked ? stepSt(STEPS[i].rev) : null;
    let style: React.CSSProperties = {
      width: 28,
      height: 28,
      padding: 0,
      borderRadius: '50%',
      fontSize: 12,
      fontFamily: 'var(--mono)',
      background: 'var(--panel)',
      border: '1px solid var(--line)',
      color: 'var(--ink)',
      cursor: 'pointer',
      lineHeight: 1,
    };
    if (st === 'ok') style = { ...style, background: 'var(--ok)', borderColor: 'var(--ok)', color: '#fff' };
    else if (st === 'brak') style = { ...style, border: '2px dashed var(--brak)', color: 'var(--brak)' };
    else if (st === 'zle') style = { ...style, background: 'var(--zle)', borderColor: 'var(--zle)', color: '#fff' };
    if (i === krok) style = { ...style, outline: '2px solid var(--accent)', outlineOffset: 1, fontWeight: 700 };
    return style;
  };

  const ns = (k: string): { status?: 'ok' | 'brak' | 'zle'; keyValue?: number | null } => {
    if (!R) return {};
    const l = R.liczby[k];
    if (!l) return {};
    const st = l.st === 'ok' ? 'ok' : l.st === 'zle' ? 'zle' : l.st === 'brak' ? 'brak' : undefined;
    return { status: st, keyValue: l.key };
  };

  const calMiss = () => onFlash('Najpierw zmierz cyrklem: klawisz C i przeciągnij po wydruku');

  const chip = (gk: string, label?: string, one?: boolean) => (
    <ChipGroup
      gk={gk}
      label={label}
      value={one ? ((A as Record<string, unknown>)[gk] as string) : ((A as Record<string, unknown>)[gk] as string[])}
      onPick={(v) => (one ? setOne(gk, v) : toggle(gk, v))}
      disabled={locked}
      {...(one ? single(gk) : multi(gk))}
    />
  );

  const num = (k: string, label: string, unit: string, cal: boolean) => (
    <NumberField
      key={k}
      label={label}
      unit={unit}
      cal={cal}
      value={(A as Record<string, number | null | undefined>)[k]}
      onChange={(v) => setNum(k, v)}
      getLastDt={getLastDt}
      onCalMiss={calMiss}
      disabled={locked}
      {...ns(k)}
    />
  );

  const isOpen = (k: string) => !!more[k];

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <button type="button" onClick={() => go(krok - 1)} disabled={krok === 0}>
          ← Wstecz
        </button>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {STEPS.map((s, i) => (
            <button key={s.t} type="button" style={dotStyle(i)} title={s.t} onClick={() => go(i)}>
              {i + 1}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="accent"
          onClick={() => go(krok + 1)}
          style={{ visibility: krok === STEPS.length - 1 ? 'hidden' : 'visible' }}
        >
          Dalej →
        </button>
        <span className="muted" style={{ fontSize: 13 }}>
          Krok {krok + 1} z {STEPS.length}: {step.t}
        </span>
      </div>

      <div style={{ maxWidth: 780 }}>
        <h3 style={{ fontSize: 16, marginBottom: 2 }}>
          {krok + 1}. {step.t}
        </h3>
        <p className="muted" style={{ fontSize: 14, marginBottom: 10 }}>
          {step.q}
        </p>

        {krok === 0 && (
          <>
            {chip('rytm', undefined, true)}
            {chip('miar', 'Miarowość', true)}
            {chip('dod', 'Dodatkowo')}
          </>
        )}

        {krok === 1 && (
          <>
            {num('hr', 'Komory', '/min', true)}
            <button type="button" style={{ ...MORE, background: 'none', border: 'none' }} onClick={() => setMore((m) => ({ ...m, ha: !m.ha }))}>
              {isOpen('ha') ? 'mniej ▴' : 'więcej opcji ▾'}
            </button>
            {isOpen('ha') ? num('ha', 'Przedsionki', '/min', true) : null}
          </>
        )}

        {krok === 2 && (
          <>
            {chip('os', undefined, true)}
            <button type="button" style={{ ...MORE, background: 'none', border: 'none' }} onClick={() => setMore((m) => ({ ...m, osd: !m.osd }))}>
              {isOpen('osd') ? 'mniej ▴' : 'więcej opcji ▾'}
            </button>
            {isOpen('osd') ? num('osDeg', 'Stopnie', '°', false) : null}
          </>
        )}

        {krok === 3 && (
          <>
            {chip('P')}
            {num('pr', 'PR', 'ms', true)}
          </>
        )}

        {krok === 4 && (
          <>
            {chip('av', 'Przedsionkowo-komorowe (AV)', true)}
            {chip('iv', 'Śródkomorowe')}
            {chip('sa', 'Zatokowo-przedsionkowe (pauzy bez P)', true)}
          </>
        )}

        {krok === 5 && (
          <>
            {num('qrs', 'QRS', 'ms', true)}
            {chip('morf', 'Cechy')}
            <LeadGrid
              kind="q"
              leads={A.leads || {}}
              onToggle={(n) => toggleLead('q', n)}
              disabled={locked}
              onStatus={R ? R.leads.q?.opcje : undefined}
              hint="Kliknij odprowadzenia z patologicznym Q."
            />
          </>
        )}

        {krok === 6 && (
          <>
            <LeadGrid
              kind="st"
              leads={A.leads || {}}
              onToggle={(n) => toggleLead('st', n)}
              disabled={locked}
              onStatus={stStatuses(R)}
            />
            <div style={{ marginTop: 10 }}>
              {chip('stF')}
            </div>
          </>
        )}

        {krok === 7 && (
          <>
            {chip('T')}
            <LeadGrid
              kind="tNeg"
              leads={A.leads || {}}
              onToggle={(n) => toggleLead('tNeg', n)}
              disabled={locked}
              onStatus={R ? R.leads.tNeg?.opcje : undefined}
              hint="Kliknij odprowadzenia z ujemnym T (aVR pomiń – tam jest prawidłowo ujemny)."
            />
            <div style={{ marginTop: 10 }}>
              {num('qt', 'QT', 'ms', true)}
              <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>
                {qtc ? 'QTc (Bazett, z częstości z kroku 2): ' + qtc + ' ms' : 'QTc policzy się sam z QT i częstości.'}
              </div>
              {chip('qtK', 'QT jest', true)}
            </div>
          </>
        )}

        {krok === 8 && (
          <>
            <DxPicker
              rozp={rozp}
              pick={A.dx}
              disabled={locked}
              onPick={(id, t) =>
                patch((id ? { dx: id, wniosek: t } : { dx: undefined, wniosek: '' }) as Partial<TrainerAnswer>)
              }
            />
            <div className="muted" style={{ fontSize: 12, margin: '8px 0 4px' }}>Wniosek (możesz dopisać, np. co dalej z pacjentem):</div>
            <textarea rows={2} value={A.wniosek || ''} onChange={(e) => patch({ wniosek: e.target.value })} style={INP} disabled={locked} />
            <div className="muted" style={{ fontSize: 12, margin: '8px 0 4px' }}>Twój opis (składa się sam; możesz poprawić):</div>
            <textarea rows={5} value={opis} onChange={(e) => setOpis(e.target.value)} style={{ ...INP, minHeight: 96 }} disabled={locked} />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {!locked ? (
                <button type="button" className="accent" onClick={onOddaj}>
                  Oddaj do sprawdzenia
                </button>
              ) : null}
              <button
                type="button"
                className="mini"
                onClick={() => {
                  copyText(opis);
                  onFlash('Skopiowano opis');
                }}
              >
                Kopiuj opis
              </button>
              {reczny && !locked ? (
                <button type="button" className="mini" onClick={odnow}>
                  Odtwórz opis z zaznaczeń
                </button>
              ) : null}
              {!locked ? (
                <button
                  type="button"
                  className="mini"
                  onClick={() => {
                    if (window.confirm('Wyczyścić wszystkie zaznaczenia?')) {
                      reset();
                      onFlash('Wyczyszczono');
                    }
                  }}
                >
                  Wyczyść wszystko
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function stStatuses(R: Review | null): Record<string, 'ok' | 'brak' | 'zle'> | undefined {
  if (!R) return undefined;
  const out: Record<string, 'ok' | 'brak' | 'zle'> = {};
  const u = R.leads.stUp?.opcje || {};
  const d = R.leads.stDn?.opcje || {};
  for (const n of Object.keys(u)) out[n] = u[n];
  for (const n of Object.keys(d)) if (!out[n]) out[n] = d[n];
  return out;
}
