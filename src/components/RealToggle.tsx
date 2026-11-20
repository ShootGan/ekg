import { useReal } from '../lib/real';

export function RealToggle({ compact = false }: { compact?: boolean }) {
  const [real, setReal] = useReal();
  return (
    <label
      className={'real-toggle' + (real ? ' on' : '')}
      title="Zapisy jak z karetki: w jednym EKG kilka współistniejących zmian (np. AF + LBBB, STEMI + blok AV, LVH + niedokrwienie)."
    >
      <input type="checkbox" role="switch" checked={real} onChange={(e) => setReal(e.target.checked)} />
      <span className="real-track" aria-hidden="true">
        <span className="real-knob" />
      </span>
      <span>{compact ? 'Real' : 'Real – zapisy jak z karetki'}</span>
    </label>
  );
}
