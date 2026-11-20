import type { AtlasCase } from '../data/atlas';
import type { Measure, LeadName } from '../model/ecg';

export interface InfoPanelProps {
  z: AtlasCase;
  meas: Measure;
  onLead(lead: LeadName): void;
}

function f(v: number | null | undefined): string {
  return v == null ? '—' : String(v);
}

export function InfoPanel({ z, meas, onLead }: InfoPanelProps) {
  const c = z.cfg;
  const ax = meas.qrsAx == null ? '—' : meas.qrsAx + '°';
  const atr = c.atrialRate ? `  przedsionki ${c.atrialRate}/min` : '';
  const pr =
    z.id === 'wenckebach' ? '200→350' : c.av === 3 ? 'zmienny' : ['af', 'flutter', 'vt'].includes(c.rhythm as string) ? '—' : f(meas.pr);

  return (
    <div className="card atlas-info">
      <h3 className="atlas-name">{z.name}</h3>
      <div className="sub">{z.sub}</div>
      <div className="atlas-meas">
        HR {f(meas.hr)}/min{atr} · PR {pr} ms · QRS {f(meas.qrs)} ms · QT/QTc {f(meas.qt)}/{f(meas.qtc)} ms · oś QRS {ax}
      </div>
      <h4 className="atlas-h">Co się dzieje</h4>
      <p>{z.co}</p>
      <h4 className="atlas-h">Kryteria EKG</h4>
      <ul>
        {z.kryt.map((k) => (
          <li key={k}>{k}</li>
        ))}
      </ul>
      <h4 className="atlas-h">Gdzie to widać</h4>
      <p>{z.gdzieTxt}</p>
      <div className="atlas-leads">
        {z.gdzie.map((l) => (
          <button key={l} type="button" data-lead={l} title={`Pokaż ${l} w pierwszym pasku`} onClick={() => onLead(l as LeadName)}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
