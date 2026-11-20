import { POLA } from '../data/slownik';
import type { Review } from '../lib/ocena';

const fmt = (n: number | null | undefined): string => (n == null ? '–' : String(n).replace('.', ','));

const stClass = (pkt: number | null, max: number): { color: string } => {
  if (pkt == null) return { color: 'var(--muted)' };
  if (pkt >= max) return { color: 'var(--ok)' };
  if (pkt > 0) return { color: 'var(--zle)' };
  return { color: 'var(--brak)' };
};

export interface ScoreTableProps {
  R: Review;
  wniosekPkt: number | null;
}

export function ScoreTable({ R, wniosekPkt }: ScoreTableProps) {
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: 14, margin: '4px 0 10px' }}>
      <tbody>
        {Object.entries(POLA).map(([k, def]) => {
          const p = R.pola[k] || { pkt: null, max: def.max, st: null };
          const pkt = k === 'wniosek' ? wniosekPkt : p.pkt;
          const st = pkt == null ? { color: 'var(--muted)' } : stClass(pkt, def.max);
          return (
            <tr key={k}>
              <td style={{ padding: '3px 10px 3px 0' }}>{def.t}</td>
              <td style={{ padding: '3px 10px 3px 0', fontFamily: 'var(--mono)', textAlign: 'right', ...st }}>
                {fmt(pkt)} / {def.max}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
