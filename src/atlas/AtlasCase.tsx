import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LeadName } from '../model/ecg';
import { ZAB } from '../data/atlas';
import type { AtlasCase as Case } from '../data/atlas';
import { computeCase } from './compute';
import type { Computed } from './compute';
import { phaseAt, useClock } from './clock';
import { Heart2D } from './heart2d/Heart2D';
import type { Heart2DHandle } from './heart2d/Heart2D';
import { Heart3D } from './heart3d/Heart3D';
import { StripCanvas } from './strips/StripCanvas';
import { InfoPanel } from './InfoPanel';
import { PhaseBox } from './PhaseBox';
import type { PhaseBoxHandle } from './PhaseBox';
import { Pills } from './Pills';
import type { PillsHandle } from './Pills';
import './atlas.css';

const SPEEDS = [1, 0.5, 0.25, 0.1];
const GAINS = [10, 5];

export interface AtlasCaseProps {
  z: Case;
  onPick(id: string, dir: number): void;
}

export interface CaseGroup {
  grp: string;
  items: Case[];
}

export function groupCases(): CaseGroup[] {
  const out: CaseGroup[] = [];
  for (const item of ZAB) {
    const last = out[out.length - 1];
    if (last && last.grp === item.grp) last.items.push(item);
    else out.push({ grp: item.grp, items: [item] });
  }
  return out;
}

export function AtlasCase({ z, onPick }: AtlasCaseProps) {
  const c = useMemo<Computed>(() => computeCase(z), [z]);
  const { clock, ui } = useClock(c);
  const heartRef = useRef<Heart2DHandle | null>(null);
  const phaseRef = useRef<PhaseBoxHandle | null>(null);
  const pillsRef = useRef<PillsHandle | null>(null);
  const [leads, setLeads] = useState<LeadName[]>(() => [...z.strips]);
  const [view, setView] = useState<'3d' | '2d'>(() => {
    try {
      const saved = localStorage.getItem('atlasHeartView');
      if (saved === '2d' || saved === '3d') return saved;
    } catch {
      /* brak dostępu */
    }
    return typeof window !== 'undefined' && window.innerWidth >= 900 ? '3d' : '2d';
  });
  const initialPhase = useMemo(() => phaseAt(c, clock.tRef.current), [c]);

  useEffect(() => {
    try {
      localStorage.setItem('atlasHeartView', view);
    } catch {
      /* brak dostępu */
    }
  }, [view]);

  useEffect(() => {
    setLeads([...z.strips]);
  }, [z]);

  useEffect(() => {
    const off = clock.onFrame((t, ph) => {
      heartRef.current?.setTime(t);
      phaseRef.current?.set(ph);
      pillsRef.current?.set(ph.key);
    });
    clock.flush();
    return off;
  }, [clock]);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName ?? '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        clock.setPlaying(!clock.playingRef.current);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        clock.step(1);
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        clock.step(-1);
      }
    },
    [clock]
  );

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const setLead = (i: number, lead: LeadName) =>
    setLeads((prev) => {
      const next = [...prev];
      next[i] = lead;
      return next;
    });

  const groups = groupCases();
  const idx = ZAB.findIndex((x) => x.id === z.id);

  return (
    <>
      <div className="atlas-head">
        <h2>
          Atlas EKG <small>– {z.grp}</small>
        </h2>
        <div className="pick">
          <button type="button" title="Poprzednie zaburzenie" onClick={() => onPick(z.id, -1)}>
            ◀
          </button>
          <select aria-label="Zaburzenie" value={z.id} onChange={(e) => onPick(e.target.value, 0)}>
            {groups.map((g) => (
              <optgroup key={g.grp} label={g.grp}>
                {g.items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button type="button" title="Następne zaburzenie" onClick={() => onPick(z.id, 1)}>
            ▶
          </button>
        </div>
      </div>

      <div className="atlas-top">
        <div className="card atlas-heart-card">
          <div className="atlas-view">
            <button type="button" className={view === '3d' ? 'on' : undefined} aria-pressed={view === '3d'} onClick={() => setView('3d')}>
              Serce 3D
            </button>
            <button type="button" className={view === '2d' ? 'on' : undefined} aria-pressed={view === '2d'} onClick={() => setView('2d')}>
              Schemat 2D
            </button>
          </div>
          {view === '3d' ? <Heart3D caseData={c} clock={clock} /> : <Heart2D c={c} ref={heartRef} />}
          <PhaseBox z={z} initial={initialPhase} ref={phaseRef} />
          <div className="atlas-legend">
            <span>
              <i style={{ background: '#efe4da' }} />spoczynek (spolaryzowane)
            </span>
            <span>
              <i style={{ background: '#ffe066' }} />czoło fali depolaryzacji
            </span>
            <span>
              <i style={{ background: '#f25c3b' }} />pobudzone (plateau)
            </span>
            <span>
              <i style={{ background: '#6aaed6' }} />repolaryzacja
            </span>
            {z.heart.stemi ? (
              <span>
                <i style={{ background: '#9d2a8a' }} />strefa uszkodzenia (prąd uszkodzenia)
              </span>
            ) : null}
          </div>
        </div>
        <InfoPanel z={z} meas={c.meas} onLead={(l) => setLead(0, l)} />
      </div>

      <div className="card">
        <div className="atlas-ctrl">
          <button type="button" className="play" aria-pressed={!ui.playing} onClick={() => clock.setPlaying(!ui.playing)}>
            {ui.playing ? '❚❚ Pauza' : '▶ Odtwórz'}
          </button>
          <div className="grp">
            <span className="lab">Tempo</span>
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={ui.speed === s ? 'on' : undefined}
                aria-pressed={ui.speed === s}
                onClick={() => clock.setSpeed(s)}
              >
                {String(s).replace('.', ',')}×
              </button>
            ))}
          </div>
          <div className="grp">
            <span className="lab">Fazy</span>
            <button type="button" title="Poprzednia faza (←)" onClick={() => clock.step(-1)}>
              ⏮ wstecz
            </button>
            <button type="button" title="Następna faza (→)" onClick={() => clock.step(1)}>
              krok ⏭
            </button>
          </div>
          <div className="grp">
            <span className="lab">Cecha</span>
            {GAINS.map((g) => (
              <button
                key={g}
                type="button"
                className={ui.gain === g ? 'on' : undefined}
                aria-pressed={ui.gain === g}
                onClick={() => clock.setGain(g)}
              >
                {g} mm/mV
              </button>
            ))}
          </div>
          <Pills ref={pillsRef} />
        </div>

        {leads.map((l, i) => (
          <StripCanvas
            key={i}
            caseData={c}
            clock={clock}
            meas={c.meas}
            lead={l}
            onLeadChange={(nl) => setLead(i, nl)}
            index={i}
          />
        ))}

        <div className="atlas-foot">
          Przesuw 25 mm/s, siatka 1 mm / 5 mm (0,04 s / 0,2 s). Pionowa kreska = chwila pokazana na schemacie serca – złap ją myszką
          (lub palcem) i przeciągnij po pasku; kolorowe pasy = fazy bieżącego cyklu. Spacja – pauza, ←/→ – faza wstecz/naprzód.
          Krzywe z modelu wektorowego corpuls3. Przypadek {idx + 1} z {ZAB.length}.
        </div>
      </div>
    </>
  );
}
