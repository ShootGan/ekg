import type { St } from '../lib/ocena';

export interface NumberFieldProps {
  key: string;
  label: string;
  unit: string;
  value: number | string | null | undefined;
  onChange?: (v: number | null) => void;
  cal?: boolean;
  getLastDt?: () => number | null;
  onCalMiss?: () => void;
  status?: St;
  keyValue?: number | null;
  disabled?: boolean;
  note?: string;
}

const statusStyle = (st?: St): React.CSSProperties => {
  if (st === 'ok') return { borderColor: 'var(--ok)', background: 'var(--okBg)' };
  if (st === 'zle' || st === 'brak') return { borderColor: 'var(--zle)', background: 'var(--zleBg)' };
  return {};
};

export function NumberField(props: NumberFieldProps) {
  const { label, unit, value, onChange, cal, getLastDt, onCalMiss, status, keyValue, disabled, note } = props;
  const shown = value == null || value === '' ? '' : String(value);
  const keyText =
    keyValue == null ? (value != null && value !== '' ? 'nie oceniane' : '') : (status === 'ok' ? '✓ ' : 'klucz: ') + keyValue + (unit === '/min' ? '/min' : ' ms');
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 110px auto', gap: '4px 8px', alignItems: 'center' }}>
        <label style={{ minWidth: 84, fontSize: 14 }}>{label}</label>
        <input
          type="number"
          inputMode="numeric"
          placeholder={unit}
          value={shown}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value === '' ? null : Number(e.target.value))}
          style={{ fontFamily: 'var(--mono)', padding: '5px 7px', ...statusStyle(status) }}
        />
        {cal ? (
          <button
            type="button"
            className="mini"
            title="Wpisz ostatni pomiar cyrklem"
            style={{ fontSize: 12, padding: '3px 7px' }}
            disabled={disabled}
            onClick={() => {
              const dt = getLastDt?.() ?? null;
              if (dt == null) {
                onCalMiss?.();
                return;
              }
              onChange?.(dt);
            }}
          >
            ◂ z cyrkla
          </button>
        ) : (
          <span />
        )}
      </div>
      {(keyText || note) && (
        <div
          style={{
            fontSize: 12,
            fontFamily: 'var(--mono)',
            gridColumn: '2 / 4',
            color: !disabled ? 'var(--muted)' : status === 'ok' ? 'var(--ok)' : 'var(--zle)',
            marginTop: -2,
          }}
        >
          {note || keyText}
        </div>
      )}
    </div>
  );
}
