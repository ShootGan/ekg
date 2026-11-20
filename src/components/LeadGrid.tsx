import type { CSSProperties } from 'react';
import type { St } from '../lib/ocena';

const LAY = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];

const STATUS: Record<string, CSSProperties> = {
  ok: { background: 'var(--ok)', borderStyle: 'solid', borderWidth: 1, borderColor: 'var(--ok)', color: '#fff' },
  zle: { background: 'var(--zle)', borderStyle: 'solid', borderWidth: 1, borderColor: 'var(--zle)', color: '#fff', textDecoration: 'line-through' },
  brak: { background: 'var(--panel)', borderColor: 'var(--brak)', color: 'var(--brak)', borderStyle: 'dashed', borderWidth: 2 },
};

export interface LeadGridProps {
  kind: 'st' | 'tNeg' | 'q';
  leads: { stUp?: string[]; stDn?: string[]; tNeg?: string[]; q?: string[] };
  onToggle?: (n: string) => void;
  statuses?: Record<string, St>;
  onStatus?: Record<string, St>;
  disabled?: boolean;
  hint?: string;
}

function leadClass(sel: 'up' | 'dn' | null, st: St | undefined, disabled: boolean): CSSProperties {
  let style: CSSProperties = {
    fontFamily: 'var(--mono)',
    fontSize: 13,
    padding: '7px 4px 15px',
    textAlign: 'center',
    background: 'var(--panel)',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: 'var(--line)',
    borderRadius: 6,
    color: 'var(--ink)',
    cursor: disabled ? 'default' : 'pointer',
    lineHeight: 1.2,
  };
  if (!disabled && sel)
    style = {
      ...style,
      background: sel === 'up' ? 'var(--accent)' : '#5b4bb0',
      borderColor: sel === 'up' ? 'var(--accent)' : '#5b4bb0',
      color: '#fff',
    };
  if (disabled && st && STATUS[st]) style = { ...style, ...STATUS[st] };
  return style;
}

export function LeadGrid({ kind, leads, onToggle, onStatus, disabled, hint }: LeadGridProps) {
  const tag = (n: string): { txt: string; sel: 'up' | 'dn' | null } => {
    if (kind === 'st') {
      if ((leads.stUp || []).indexOf(n) >= 0) return { txt: n + ' ↑', sel: 'up' };
      if ((leads.stDn || []).indexOf(n) >= 0) return { txt: n + ' ↓', sel: 'dn' };
      return { txt: n, sel: null };
    }
    const on = ((leads as Record<string, string[]>)[kind] || []).indexOf(n) >= 0;
    return { txt: on ? n + (kind === 'q' ? ' Q' : ' T−') : n, sel: on ? 'up' : null };
  };
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5, maxWidth: 440 }}>
        {LAY.flat().map((n) => {
          const { txt, sel } = tag(n);
          return (
            <button
              key={n}
              type="button"
              style={leadClass(sel, onStatus?.[n], !!disabled)}
              onClick={() => onToggle?.(n)}
              disabled={disabled}
            >
              {txt}
            </button>
          );
        })}
      </div>
      {hint ? <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{hint}</div> : null}
    </div>
  );
}
