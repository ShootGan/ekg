export type StyleId = 'klinika' | 'monitor' | 'atlas' | 'swiss';

export interface StyleDef {
  id: StyleId;
  name: string;
  note: string;
  swatch: string[];
}

export const STYLES: StyleDef[] = [
  {
    id: 'klinika',
    name: 'Klinika',
    note: 'Chłodna mięta, teal, miękkie zaokrąglenia',
    swatch: ['#eef2f1', '#ffffff', '#0f766e', '#12201d'],
  },
  {
    id: 'monitor',
    name: 'Monitor',
    note: 'Czarna sala, zielony ślad, mono, ostre rogi',
    swatch: ['#07090c', '#0e1318', '#54e6a8', '#f2a33c'],
  },
  {
    id: 'atlas',
    name: 'Atlas',
    note: 'Kremowy papier, serif, bordowy akcent',
    swatch: ['#fbf8f1', '#fffdf8', '#8c1d18', '#231e18'],
  },
  {
    id: 'swiss',
    name: 'Swiss',
    note: 'Biel, czerń, Helvetica, zero zaokrągleń',
    swatch: ['#ffffff', '#f1f1f1', '#1c47d6', '#111111'],
  },
];

const KEY = 'ekg-style';

export function readStyle(): StyleId {
  try {
    const v = localStorage.getItem(KEY);
    if (v && STYLES.some((s) => s.id === v)) return v as StyleId;
  } catch {
    /* brak dostępu */
  }
  return 'klinika';
}

export function applyStyle(id: StyleId): void {
  const root = document.documentElement;
  root.setAttribute('data-style', id);
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* brak dostępu */
  }
  window.dispatchEvent(new Event('ekg-style'));
}

export function initStyle(): StyleId {
  const id = readStyle();
  document.documentElement.setAttribute('data-style', id);
  return id;
}
