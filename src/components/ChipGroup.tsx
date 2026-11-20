import type { CSSProperties } from 'react';
import { useState } from 'react';
import type { St } from '../lib/ocena';
import { groupOf, isMain } from '../trainer/steps';

const STATUS: Record<string, CSSProperties> = {
  ok: { background: 'var(--ok)', borderColor: 'var(--ok)', color: '#fff' },
  zle: { background: 'var(--zle)', borderColor: 'var(--zle)', color: '#fff', textDecoration: 'line-through' },
  brak: { background: 'var(--panel)', borderColor: 'var(--brak)', color: 'var(--brak)', borderStyle: 'dashed', borderWidth: 2 },
};

export interface ChipProps {
  label: string;
  selected?: boolean;
  status?: St;
  onClick?: () => void;
  disabled?: boolean;
  keyMark?: boolean;
}

export function Chip({ label, selected, status, onClick, disabled, keyMark }: ChipProps) {
  let style: CSSProperties = {
    fontSize: 13,
    padding: '4px 10px',
    borderRadius: 14,
    background: 'var(--panel)',
    border: '1px solid var(--line)',
    color: 'var(--ink)',
    cursor: disabled ? 'default' : 'pointer',
  };
  if (selected) style = { ...style, background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' };
  if (status && STATUS[status]) style = { ...style, ...STATUS[status] };
  else if (keyMark) style = { ...style, border: '2px solid var(--ok)', color: 'var(--ok)', background: 'var(--panel)' };
  return (
    <button type="button" className="chip" style={style} onClick={onClick} disabled={disabled} aria-pressed={!!selected}>
      {label}
    </button>
  );
}

export interface ChipGroupProps {
  gk: string;
  label?: string;
  value: string | string[] | null | undefined;
  options?: Record<string, St>;
  keyValue?: string[];
  onPick?: (v: string) => void;
  disabled?: boolean;
  all?: boolean;
}

export function ChipGroup(props: ChipGroupProps) {
  const { gk, label, value, options, keyValue, onPick, disabled, all } = props;
  const g = groupOf(gk);
  const [open, setOpen] = useState(false);
  if (!g) return null;
  const usable = g.o.filter((o) => !(g.one && o[0] === 'brak'));
  const main = usable.filter((o) => isMain(gk, o[0]));
  const rest = usable.filter((o) => !isMain(gk, o[0]));
  const visible = all || open || !rest.length ? usable : main;
  const sel = (v: string) => (g.one ? value === v : Array.isArray(value) && value.indexOf(v) >= 0);
  const render = ([v, t]: [string, string]) => {
    const isSel = sel(v);
    const st = options ? options[v] : undefined;
    const showKey = !isSel && !!keyValue && keyValue.length > 0 && keyValue[0] === v && st !== 'ok';
    return (
      <Chip
        key={v}
        label={t}
        selected={isSel}
        status={disabled && isSel ? (st ?? null) : null}
        keyMark={disabled && showKey}
        disabled={disabled}
        onClick={() => onPick?.(v)}
      />
    );
  };
  return (
    <div style={{ marginBottom: 10 }}>
      {label ? <div className="muted" style={{ fontSize: 12, marginBottom: 4 }}>{label}</div> : null}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{visible.map(render)}</div>
      {!all && rest.length ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', padding: '4px 0', fontSize: 13, cursor: 'pointer' }}
        >
          {open ? 'mniej ▴' : 'więcej opcji ▾'}
        </button>
      ) : null}
    </div>
  );
}
