import { useState } from 'react';
import type { Rozp } from '../lib/generate';
import { KATY } from '../trainer/steps';

export function norm(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l');
}

export interface DxPickerProps {
  rozp: Rozp[];
  pick?: string;
  onPick?: (id: string, t: string) => void;
  disabled?: boolean;
  dxKey?: string;
  wniosekPkt?: number | null;
}

export function DxPicker({ rozp, pick, onPick, disabled, dxKey, wniosekPkt }: DxPickerProps) {
  const [kat, setKat] = useState<string | null>(() => rozp.find((r) => r.id === pick)?.kat ?? null);
  const [q, setQ] = useState('');

  const hit = (r: Rozp): boolean | null => {
    const s = norm(q).trim();
    if (!s) return null;
    const t = norm(r.t + ' ' + r.id.replace(/-/g, ' '));
    return s.split(/\s+/).every((w) => t.indexOf(w) >= 0);
  };

  const shown = (r: Rozp): boolean =>
    disabled ? pick === r.id || r.id === dxKey : hit(r) !== null ? !!hit(r) || pick === r.id : kat ? r.kat === kat : pick === r.id;

  return (
    <div>
      {!disabled ? (
        <input
          type="search"
          placeholder="🔍 szukaj rozpoznania, np. blok, hełm, stemi dolny"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ width: '100%', margin: '4px 0 6px', padding: '6px 8px', fontSize: 14 }}
        />
      ) : null}
      {!disabled ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
          {KATY.filter(([k]) => rozp.some((r) => r.kat === k)).map(([k, t]) => (
            <button
              key={k}
              type="button"
              className="chip"
              style={
                kat === k
                  ? { fontSize: 13, padding: '4px 10px', borderRadius: 14, background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' }
                  : { fontSize: 13, padding: '4px 10px', borderRadius: 14, background: 'var(--panel)' }
              }
              onClick={() => setKat(kat === k ? null : k)}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflow: 'auto' }}>
        {rozp.filter(shown).map((r) => {
          const sel = pick === r.id;
          let style: React.CSSProperties = {
            textAlign: 'left',
            borderRadius: 8,
            fontSize: 13,
            padding: '5px 10px',
            background: 'var(--panel)',
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            cursor: disabled ? 'default' : 'pointer',
          };
          if (disabled) {
            if (sel) style = { ...style, ...(r.id === dxKey || (wniosekPkt ?? 0) >= 2 ? { background: 'var(--ok)', borderColor: 'var(--ok)', color: '#fff' } : { background: 'var(--zle)', borderColor: 'var(--zle)', color: '#fff' }) };
            else if (r.id === dxKey) style = { ...style, border: '2px solid var(--ok)', color: 'var(--ok)' };
          } else if (sel) style = { ...style, background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' };
          return (
            <button key={r.id} type="button" style={style} disabled={disabled} onClick={() => onPick?.(sel ? '' : r.id, sel ? '' : r.t)}>
              {r.t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
