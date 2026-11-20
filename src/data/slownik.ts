export interface Group {
  t: string;
  one?: boolean;
  o: [string, string][];
}

export interface Answer {
  rytm?: string;
  miar?: string;
  dod?: string[];
  hr?: number | string | null;
  ha?: number | string | null;
  os?: string;
  osDeg?: number | null;
  P?: string[];
  sa?: string;
  av?: string;
  iv?: string[];
  pr?: number | null;
  qrs?: number | null;
  qt?: number | null;
  qtc?: number | null;
  qtK?: string;
  morf?: string[];
  stF?: string[];
  T?: string[];
  leads?: { stUp?: string[]; stDn?: string[]; tNeg?: string[]; q?: string[] };
  wniosek?: string;
}

export interface Pole {
  t: string;
  max: number;
}

export const GR: Record<string, Group> = {
  rytm: { t: 'Rytm', one: true, o: [['zatokowy', 'zatokowy'], ['af', 'migotanie przedsionków'], ['flutter', 'trzepotanie przedsionków'], ['wezlowy', 'węzłowy'], ['svt', 'częstoskurcz nadkomorowy'], ['vt', 'częstoskurcz komorowy'], ['tdp', 'polimorficzny VT / TdP'], ['vf', 'migotanie komór'], ['asystolia', 'asystolia'], ['zatrzymanie', 'zatrzymanie komór (same P)']] },
  miar: { t: 'Miarowość', one: true, o: [['miarowy', 'miarowy'], ['niemiarowy', 'niemiarowy (pauzy, pobudzenia)'], ['zupelnie', 'niemiarowość zupełna']] },
  dod: { t: 'Dodatkowo', o: [['pvc', 'pobudzenia przedwczesne komorowe'], ['pac', 'pobudzenia przedwczesne nadkomorowe'], ['niemiar', 'niemiarowość zatokowa (oddechowa)'], ['pauzy', 'pauzy']] },
  os: { t: 'Oś', one: true, o: [['N', 'prawidłowa'], ['L', 'odchylona w lewo'], ['P', 'odchylona w prawo'], ['X', 'nieokreślona']] },
  P: { t: 'Załamki P', o: [['norm', 'prawidłowe'], ['pulm', 'P pulmonale'], ['mitr', 'P mitrale'], ['plaskie', 'spłaszczone'], ['brak', 'brak P'], ['f', 'fale f'], ['F', 'fale F (piła)'], ['dysoc', 'P niezależne od QRS']] },
  sa: { t: 'Przewodzenie zatokowo-przedsionkowe', one: true, o: [['brak', 'bez zaburzeń'], ['sa1', 'blok SA II° typu I'], ['sa2', 'blok SA II° typu II'], ['zahamowanie', 'zahamowanie zatokowe']] },
  av: { t: 'Przewodzenie przedsionkowo-komorowe', one: true, o: [['brak', 'bez zaburzeń'], ['av1', 'blok AV I°'], ['wenck', 'blok AV II° Mobitz I'], ['mob2', 'blok AV II° Mobitz II'], ['21', 'blok AV II° 2:1'], ['av3', 'blok AV III°']] },
  iv: { t: 'Przewodzenie śródkomorowe', o: [['LBBB', 'LBBB'], ['RBBB', 'RBBB'], ['iRBBB', 'niepełny RBBB'], ['LAFB', 'LAFB'], ['LPFB', 'LPFB'], ['IVCD', 'nieswoisty blok śródkomorowy'], ['WPW', 'preekscytacja (WPW)']] },
  morf: { t: 'QRS – morfologia', o: [['lvh', 'przerost LK'], ['rvh', 'przerost PK'], ['niski', 'niski woltaż'], ['slabaR', 'słaba progresja R'], ['fJ', 'fale J (Osborna)'], ['s1q3t3', 'S1Q3T3'], ['brugada', 'wzorzec Brugadów'], ['helmet', 'objaw hełmu'], ['prObn', 'obniżenie PR']] },
  stF: { t: 'ST – charakter', o: [['rozlane', 'rozlane wklęsłe uniesienia'], ['wtorne', 'zmiany wtórne (blok / przerost)']] },
  T: { t: 'Załamki T', o: [['norm', 'zgodne z QRS'], ['szpicz', 'wysokie, szpiczaste'], ['hiper', 'hiperostre'], ['plaskie', 'spłaszczone'], ['U', 'fale U'], ['wtorne', 'wtórnie odwrócone']] },
  qtK: { t: 'QT', one: true, o: [['N', 'prawidłowy'], ['dl', 'wydłużony'], ['kr', 'skrócony']] }
};

export const LEADMODES: [string, string][] = [['stUp', 'ST ↑'], ['stDn', 'ST ↓'], ['tNeg', 'T ujemny'], ['q', 'Q patologiczne']];

export const NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'] as const;

export const POLA: Record<string, Pole> = {
  rytm: { t: 'Rytm', max: 2 }, czest: { t: 'Częstość', max: 1 }, os: { t: 'Oś', max: 1 },
  odst: { t: 'Odstępy i przewodzenie', max: 2 }, stt: { t: 'ST-T i morfologia', max: 2 }, wniosek: { t: 'Wniosek', max: 2 }
};

export function lab(g: string, v: string): string {
  const o = GR[g].o;
  for (let i = 0; i < o.length; i++) if (o[i][0] === v) return o[i][1];
  return v;
}

export function arr(x: string | string[] | null | undefined): string[] {
  return x == null ? [] : Array.isArray(x) ? x : [x];
}

export function leadList(a: string | string[] | null | undefined): string {
  const s = NAMES.filter((n) => arr(a).indexOf(n) >= 0), out: string[] = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    if (s[i][0] === 'V') while (j + 1 < s.length && s[j + 1][0] === 'V' && +s[j + 1].slice(1) === +s[j].slice(1) + 1) j++;
    out.push(j - i >= 2 ? s[i] + '–' + s[j] : s.slice(i, j + 1).join(', '));
    i = j + 1;
  }
  return out.join(', ');
}

function num(v: unknown): boolean {
  return v != null && v !== '' && !isNaN(+v);
}

export function opis(a: Answer): string {
  a = a || {};
  const z: string[] = [], L = a.leads || {};
  let x = '';
  x = a.rytm ? 'Rytm ' + lab('rytm', a.rytm) : '';
  if (a.miar) x += (x ? ', ' : 'Rytm ') + lab('miar', a.miar).replace(' (pauzy, pobudzenia)', '');
  if (arr(a.dod).length) x += ' (' + arr(a.dod).map((v) => lab('dod', v)).join(', ') + ')';
  if (num(a.hr)) x += (x ? ', ' : 'Częstość ') + a.hr + '/min' + (num(a.ha) ? ' (przedsionki ' + a.ha + '/min)' : '');
  if (x) z.push(x + '.');
  if (a.os) z.push('Oś ' + lab('os', a.os) + (num(a.osDeg) ? ' (' + (Number(a.osDeg) > 0 ? '+' : '') + a.osDeg + '°)' : '') + '.');
  if (arr(a.P).length) z.push('Załamki P: ' + arr(a.P).map((v) => lab('P', v)).join(', ') + '.');
  const prz: string[] = [];
  if (a.sa && a.sa !== 'brak') prz.push(lab('sa', a.sa));
  if (a.av && a.av !== 'brak') prz.push(lab('av', a.av));
  arr(a.iv).forEach((v) => prz.push(lab('iv', v)));
  const od: string[] = [];
  if (num(a.pr)) od.push('PR ' + a.pr + ' ms');
  if (num(a.qrs)) od.push('QRS ' + a.qrs + ' ms');
  if (od.length || prz.length) z.push(od.join(', ') + (od.length && prz.length ? '; ' : '') + prz.join(', ') + '.');
  else if (a.sa === 'brak' && a.av === 'brak') z.push('Przewodzenie bez zaburzeń.');
  const m = arr(a.morf).map((v) => lab('morf', v));
  if (arr(L.q).length) m.push('patologiczne Q w ' + leadList(L.q));
  if (m.length) z.push('QRS: ' + m.join(', ') + '.');
  const st: string[] = [];
  if (arr(L.stUp).length) st.push('uniesienie ' + leadList(L.stUp));
  if (arr(L.stDn).length) st.push('obniżenie ' + leadList(L.stDn));
  arr(a.stF).forEach((v) => st.push(lab('stF', v)));
  z.push('ST: ' + (st.length ? st.join('; ') : 'izoelektryczny') + '.');
  const t = arr(a.T).map((v) => lab('T', v));
  if (arr(L.tNeg).length) t.push('ujemne w ' + leadList(L.tNeg));
  if (t.length) z.push('T: ' + t.join(', ') + '.');
  const q: string[] = [];
  if (num(a.qt)) q.push('QT ' + a.qt + ' ms');
  if (num(a.qtc)) q.push('QTc ' + a.qtc + ' ms');
  if (q.length || a.qtK) z.push(q.join(', ') + (a.qtK ? (q.length ? ' – ' : 'QT ') + lab('qtK', a.qtK) : '') + '.');
  if (a.wniosek) z.push('Wniosek: ' + String(a.wniosek).trim().replace(/\.?$/, '.'));
  return z.join(' ');
}
