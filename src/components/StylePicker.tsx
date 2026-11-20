import { useEffect, useState } from 'react';
import { STYLES, applyStyle, readStyle, type StyleId } from '../lib/style';

export function StylePicker({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState<StyleId>(readStyle);

  useEffect(() => {
    const sync = () => setCur(readStyle());
    window.addEventListener('ekg-style', sync);
    return () => window.removeEventListener('ekg-style', sync);
  }, []);

  const pick = (id: StyleId) => {
    applyStyle(id);
    setCur(id);
    setOpen(false);
  };

  return (
    <div className="style-pick">
      <button
        type="button"
        className="mini"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Zmień kierunek wizualny"
      >
        Styl: {STYLES.find((s) => s.id === cur)?.name}
        <span aria-hidden style={{ marginLeft: 6, opacity: 0.6 }}>
          ▾
        </span>
      </button>
      {open ? (
        <>
          <div className="style-backdrop" onClick={() => setOpen(false)} />
          <div className="style-menu" role="listbox" aria-label="Kierunek wizualny">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={s.id === cur}
                className={'style-opt' + (s.id === cur ? ' on' : '')}
                onClick={() => pick(s.id)}
              >
                <span className="style-swatch" aria-hidden>
                  {s.swatch.map((c) => (
                    <i key={c} style={{ background: c }} />
                  ))}
                </span>
                <span className="style-text">
                  <b>{s.name}</b>
                  {compact ? null : <em>{s.note}</em>}
                </span>
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
