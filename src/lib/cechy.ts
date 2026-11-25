import type { GenerateResult } from './generate';
import type { Kryterium } from './kryteria';
import { mulberry32 } from './rng';

export interface Cecha {
  id: string;
  t: string;
  grupa: string;
  k: Kryterium;
}

export interface CechaQ extends Cecha {
  jest: boolean;
}

const kr = (tags: string[], leads: string[] = []): Kryterium => ({ tags, leads, wizualne: true, nieobecne: false });

// Kolejność katalogu = kolejność systematycznego opisu EKG (tak też układają się pozycje w quizie).
const KATALOG: [string, string, string, string[]][] = [
  ['norma', 'norma', 'Zapis prawidłowy – bez patologii', []],
  ['zatokowy', 'rytm', 'Rytm zatokowy', ['P', 'rytm']],
  ['niemiarSin', 'rytm', 'Niemiarowość zatokowa (oddechowa)', ['rytm', 'pp']],
  ['af', 'rytm', 'Migotanie przedsionków', ['fF', 'rytm']],
  ['flutter', 'rytm', 'Trzepotanie przedsionków', ['fF', 'przew']],
  ['wezlowy', 'rytm', 'Rytm węzłowy (z łącza AV)', ['P', 'rytm']],
  ['svt', 'rytm', 'Częstoskurcz nadkomorowy z wąskimi QRS', ['rytm', 'czest']],
  ['vt', 'rytm', 'Częstoskurcz komorowy', ['QRS', 'mono']],
  ['tdp', 'rytm', 'Torsade de pointes', ['tdp', 'QRS']],
  ['vf', 'rytm', 'Migotanie komór', ['rytm']],
  ['asystolia', 'rytm', 'Brak zespołów QRS (asystolia / zatrzymanie komór)', ['pauza']],
  ['bradykardia', 'czest', 'Bradykardia (<60/min)', ['czest']],
  ['tachykardia', 'czest', 'Tachykardia (>100/min)', ['czest']],
  ['pvc', 'dod', 'Przedwczesne pobudzenia komorowe', ['pvc']],
  ['pac', 'dod', 'Przedwczesne pobudzenia nadkomorowe', ['pac']],
  ['sa', 'sa', 'Pauzy zatokowe (blok SA / zahamowanie zatokowe)', ['pauza', 'pp']],
  ['av1', 'av', 'Blok AV I° (PR >200 ms)', ['PR']],
  ['wenck', 'av', 'Blok AV II° Mobitz I (Wenckebach)', ['PR', 'pbez', 'pauza']],
  ['mob2', 'av', 'Blok AV II° Mobitz II', ['pbez', 'P']],
  ['21', 'av', 'Blok AV II° 2:1', ['pbez', 'P']],
  ['av3', 'av', 'Blok AV III° (całkowity)', ['dysoc', 'P']],
  ['WPW', 'av', 'Preekscytacja (WPW) – krótki PR, fala delta', ['delta', 'PR']],
  ['szerQRS', 'iv', 'Poszerzone QRS (≥120 ms)', ['QRS']],
  ['LBBB', 'iv', 'Blok lewej odnogi (LBBB)', ['bbb', 'QRS']],
  ['RBBB', 'iv', 'Blok prawej odnogi (RBBB)', ['bbb', 'rsr', 'szS']],
  ['iRBBB', 'iv', 'Niepełny blok prawej odnogi', ['rsr']],
  ['LAFB', 'iv', 'Blok przedniej wiązki lewej odnogi (LAFB)', ['os']],
  ['LPFB', 'iv', 'Blok tylnej wiązki lewej odnogi (LPFB)', ['os']],
  ['osL', 'os', 'Odchylenie osi w lewo (lewogram)', ['os']],
  ['osP', 'os', 'Odchylenie osi w prawo (prawogram)', ['os']],
  ['pulm', 'P', 'P pulmonale (powiększenie prawego przedsionka)', ['P']],
  ['mitr', 'P', 'P mitrale (powiększenie lewego przedsionka)', ['P']],
  ['pPlaskie', 'P', 'Spłaszczone, ledwo widoczne P', ['P']],
  ['lvh', 'morf', 'Przerost lewej komory', ['wysoki', 'Rwys', 'Sgl']],
  ['rvh', 'morf', 'Przerost prawej komory', ['Rwys', 'os']],
  ['niski', 'morf', 'Niski woltaż QRS', ['niski']],
  ['alternans', 'morf', 'Naprzemienność elektryczna', ['alternans']],
  ['q', 'morf', 'Patologiczne załamki Q / zespoły QS', ['Q']],
  ['s1q3t3', 'morf', 'Obraz S1Q3T3', ['s1q3t3']],
  ['fJ', 'st', 'Fale J (Osborna)', ['J']],
  ['brugada', 'st', 'Obraz Brugadów (V1–V2)', ['ST']],
  ['helmet', 'st', 'Objaw hełmu (spiked helmet)', ['helm']],
  ['stUp', 'st', 'Uniesienie odcinka ST', ['ST']],
  ['stDn', 'st', 'Obniżenie odcinka ST', ['ST']],
  ['perikard', 'st', 'Rozlane uniesienie ST z obniżeniem PR', ['ST', 'PRobn']],
  ['tNeg', 't', 'Ujemne załamki T', ['T']],
  ['szpicz', 't', 'Wysokie, szpiczaste T', ['T']],
  ['hiper', 't', 'Hiperostre T', ['T']],
  ['plaskie', 't', 'Spłaszczone T', ['T']],
  ['U', 't', 'Fale U', ['U']],
  ['qtDl', 'qt', 'Wydłużony QT', ['QT']],
];

export const CECHY: Cecha[] = KATALOG.map(([id, grupa, t, tags]) => ({ id, grupa, t, k: kr(tags) }));
const BY = new Map(CECHY.map((c) => [c.id, c]));
const ORDER = new Map(CECHY.map((c, i) => [c.id, i]));

// Z czym najczęściej myli się daną cechę – z tych bierzemy fałszywe odpowiedzi.
const MYLI: Record<string, string[]> = {
  norma: ['niemiarSin', 'osL', 'av1', 'iRBBB', 'tNeg', 'pac', 'bradykardia'],
  zatokowy: ['wezlowy', 'af', 'flutter'],
  niemiarSin: ['af', 'pac', 'sa', 'wenck'],
  af: ['zatokowy', 'flutter', 'pac', 'niemiarSin', 'wezlowy'],
  flutter: ['af', 'zatokowy', 'svt', '21'],
  wezlowy: ['zatokowy', 'av3', 'svt', 'pPlaskie'],
  svt: ['flutter', 'zatokowy', 'af', 'wezlowy', 'vt'],
  vt: ['svt', 'LBBB', 'szerQRS', 'tdp', 'af'],
  tdp: ['vt', 'vf', 'af', 'qtDl'],
  vf: ['tdp', 'vt', 'asystolia', 'af'],
  asystolia: ['av3', 'vf', 'bradykardia', 'sa'],
  bradykardia: ['sa', 'av1', '21', 'wezlowy'],
  tachykardia: ['svt', 'flutter', 'af', 'pac'],
  pvc: ['pac', 'LBBB', 'vt', 'niemiarSin'],
  pac: ['pvc', 'af', 'niemiarSin', 'sa'],
  sa: ['wenck', 'mob2', '21', 'pac', 'niemiarSin'],
  av1: ['wenck', 'WPW', 'mob2', 'av3'],
  wenck: ['mob2', '21', 'av1', 'sa', 'av3'],
  mob2: ['wenck', '21', 'av3', 'sa'],
  '21': ['wenck', 'mob2', 'av3', 'bradykardia'],
  av3: ['21', 'mob2', 'wezlowy', 'wenck'],
  WPW: ['LBBB', 'av1', 'szerQRS', 'q'],
  szerQRS: ['LBBB', 'RBBB', 'WPW', 'iRBBB'],
  LBBB: ['RBBB', 'WPW', 'stUp', 'lvh', 'iRBBB'],
  RBBB: ['LBBB', 'iRBBB', 'rvh', 'brugada'],
  iRBBB: ['RBBB', 'brugada', 'rvh', 'szerQRS'],
  LAFB: ['LPFB', 'osP', 'LBBB', 'q'],
  LPFB: ['LAFB', 'osL', 'rvh'],
  osL: ['osP', 'LPFB'],
  osP: ['osL', 'LAFB'],
  pulm: ['mitr', 'pPlaskie', 'rvh'],
  mitr: ['pulm', 'av1', 'lvh'],
  pPlaskie: ['pulm', 'mitr', 'wezlowy'],
  lvh: ['rvh', 'niski', 'LBBB', 'stDn'],
  rvh: ['lvh', 'RBBB', 'osL'],
  niski: ['lvh', 'alternans', 'q'],
  alternans: ['niski', 'pvc', 'lvh'],
  q: ['stUp', 'tNeg', 'LAFB', 'lvh'],
  s1q3t3: ['RBBB', 'q', 'osL'],
  fJ: ['stUp', 'brugada', 'perikard', 'U'],
  brugada: ['RBBB', 'stUp', 'iRBBB', 'perikard'],
  helmet: ['stUp', 'perikard', 'fJ'],
  stUp: ['stDn', 'perikard', 'hiper', 'q', 'brugada'],
  stDn: ['stUp', 'tNeg', 'lvh', 'U'],
  perikard: ['stUp', 'stDn', 'fJ', 'hiper'],
  tNeg: ['stDn', 'plaskie', 'hiper', 'q'],
  szpicz: ['hiper', 'stUp', 'U', 'plaskie'],
  hiper: ['szpicz', 'stUp', 'tNeg'],
  plaskie: ['tNeg', 'szpicz', 'U'],
  U: ['plaskie', 'qtDl', 'szpicz'],
  qtDl: ['U', 'plaskie', 'bradykardia'],
};

// Ciężkie arytmie jako fałszywa odpowiedź tylko przy szerokim / szybkim rytmie – inaczej to oczywista eliminacja.
const ZLOSLIWE = new Set(['vt', 'tdp', 'vf', 'asystolia']);

const RYTM_ID: Record<string, string> = {
  zatokowy: 'zatokowy', af: 'af', flutter: 'flutter', wezlowy: 'wezlowy', svt: 'svt', vt: 'vt', tdp: 'tdp', vf: 'vf',
  asystolia: 'asystolia', zatrzymanie: 'asystolia',
};

export interface CechyZapisu {
  jest: Cecha[];
  niepewne: Set<string>;
}

export function cechyZapisu(g: GenerateResult): CechyZapisu {
  const K = g.key.klucz;
  const e = g.EX.ecg as Record<string, unknown>;
  const jest = new Map<string, string[]>();
  const niepewne = new Set<string>();
  const add = (id: string, leads: string[] = []) => jest.set(id, leads);
  const sec = !!(e.bbb === 'L' || e.bbb === 'R' || e.lvh || e.rvh || e.wpw);
  const wide = ['vt', 'tdp', 'vf', 'asystole'].includes(String(e.rhythm));
  const qrs = g.M.qrs ?? 0;

  const ry = RYTM_ID[K.rytm[0]];
  if (ry) add(ry);
  K.rytm.slice(1).forEach((x) => RYTM_ID[x] && niepewne.add(RYTM_ID[x]));
  if (e.av === 3 || e.av === '3') niepewne.add('zatokowy');
  if (ry === 'tdp') niepewne.add('vt');
  if (ry === 'svt' || ry === 'wezlowy') niepewne.add(ry === 'svt' ? 'wezlowy' : 'svt');
  if (K.dod.req.includes('niemiar')) add('niemiarSin');
  else if (Number(e.sinArr) > 0) niepewne.add('niemiarSin');

  const hr = K.hr;
  if (hr != null && !['vf', 'asystolia'].includes(ry ?? '')) {
    if (hr < 60) add('bradykardia');
    else if (hr === 60) niepewne.add('bradykardia');
    if (hr > 100) add('tachykardia');
    else if (hr === 100) niepewne.add('tachykardia');
  } else niepewne.add('bradykardia').add('tachykardia');

  if (K.dod.req.includes('pvc')) add('pvc');
  if (K.dod.req.includes('pac')) add('pac');

  if (K.sa[0] && K.sa[0] !== 'brak') add('sa');
  const AV: Record<string, string> = { av1: 'av1', wenck: 'wenck', mob2: 'mob2', '21': '21', av3: 'av3' };
  if (K.av[0] && AV[K.av[0]]) add(AV[K.av[0]]);
  K.av.slice(1).forEach((x) => AV[x] && niepewne.add(AV[x]));

  for (const x of K.iv.req) if (BY.has(x)) add(x);
  for (const x of K.iv.ok) if (BY.has(x) && !jest.has(x)) niepewne.add(x);
  if (e.wpw) add('WPW');
  if (jest.has('RBBB')) niepewne.add('iRBBB');
  if (jest.has('iRBBB')) niepewne.add('RBBB');
  if (qrs >= 120 && ry !== 'asystolia' && ry !== 'vf') add('szerQRS');
  else if (qrs >= 110 || wide) niepewne.add('szerQRS');
  if (wide) ['LBBB', 'RBBB'].forEach((x) => niepewne.add(x));

  if (!K.os.length || wide) niepewne.add('osL').add('osP');
  else {
    if (K.os.length === 1 && K.os[0] === 'L') add('osL');
    else if (K.os.includes('L')) niepewne.add('osL');
    if (K.os.length === 1 && K.os[0] === 'P') add('osP');
    else if (K.os.includes('P') || K.os.includes('X')) niepewne.add('osP');
  }
  if (!wide && !e.bbb && K.osDeg != null && K.osDeg < -45 && K.iv.ok.includes('LAFB')) add('LAFB');

  if (K.P.req.includes('pulm')) add('pulm', ['II', 'III', 'aVF']);
  if (K.P.req.includes('mitr')) add('mitr', ['II', 'V1']);
  if (K.P.req.includes('plaskie')) add('pPlaskie');
  if (['af', 'flutter', 'wezlowy', 'svt', 'vt', 'tdp', 'vf'].includes(ry ?? '')) niepewne.add('pPlaskie').add('pulm').add('mitr');

  for (const x of ['lvh', 'rvh', 'fJ', 'brugada', 'helmet']) {
    if (K.morf.req.includes(x)) add(x);
    else if (K.morf.ok.includes(x)) niepewne.add(x);
  }
  if (Number(e.voltage ?? 1) <= 0.5) add('niski');
  else if (Number(e.voltage ?? 1) < 0.8) niepewne.add('niski');
  if (e.s1q3t3) add('s1q3t3');
  if (Number(e.alternans) > 0) add('alternans');

  if (K.stF.req.includes('rozlane')) {
    add('perikard');
    niepewne.add('stUp');
  }
  const leadSet = (id: string, req: string[], ok: string[]) => {
    if (req.length >= 2 && !(sec && !e.stemi)) add(id, req);
    else if (req.length || (sec && ok.length)) niepewne.add(id);
  };
  if (!wide) {
    leadSet('stUp', K.leads.stUp.req, K.leads.stUp.ok);
    leadSet('stDn', K.leads.stDn.req, K.leads.stDn.ok);
    leadSet('tNeg', K.leads.tNeg.req, K.leads.tNeg.ok);
  } else ['stUp', 'stDn', 'tNeg'].forEach((x) => niepewne.add(x));
  if (e.helmet) {
    ['stUp', 'stDn', 'tNeg', 'plaskie'].forEach((x) => {
      jest.delete(x);
      niepewne.add(x);
    });
  }
  if (e.brugada) {
    jest.delete('stUp');
    niepewne.add('stUp');
  }
  if (K.leads.q.req.length) add('q', K.leads.q.req);
  else if (e.bbb === 'L' || e.lvh || e.wpw || wide || e.s1q3t3) niepewne.add('q');

  for (const x of ['szpicz', 'hiper', 'U']) {
    if (K.T.req.includes(x)) add(x);
    else if (K.T.ok.includes(x)) niepewne.add(x);
  }
  if (Number(e.tAmp ?? 1) < 0.6 && !e.helmet) add('plaskie');
  if (jest.has('szpicz')) niepewne.add('hiper');
  if (jest.has('hiper')) niepewne.add('szpicz');

  if (K.qtK.length === 1 && K.qtK[0] === 'dl') add('qtDl');
  else if (!K.qtK.length || K.qtK.includes('dl')) niepewne.add('qtDl');

  if (e.s1q3t3 && K.leads.tNeg.req.length >= 2) add('tNeg', K.leads.tNeg.req);
  const dwuznaczne: [boolean, string[]][] = [
    [jest.has('pvc'), ['szerQRS', 'LBBB', 'RBBB']],
    [jest.has('stUp') || jest.has('stDn'), ['tNeg']],
    [jest.has('stUp'), ['hiper']],
    [jest.has('RBBB') && jest.has('stUp'), ['brugada']],
    [jest.has('wenck'), ['av1']],
    [jest.has('av3'), ['wezlowy']],
    [jest.has('flutter'), ['21']],
    [jest.has('LBBB'), ['lvh']],
    [jest.has('osP'), ['rvh', 'pulm']],
    [K.pr != null && K.pr >= 190 && K.pr <= 210, ['av1']],
    [Number(e.tAmp ?? 1) < 0.8 || jest.has('hiperk'), ['stDn']],
  ];
  for (const [warunek, ids] of dwuznaczne) if (warunek) ids.forEach((x) => !jest.has(x) && niepewne.add(x));

  const patol = [...jest.keys()].filter((x) => x !== 'zatokowy');
  if (!patol.length) add('norma');
  else if (patol.every((x) => x === 'niemiarSin')) {
    add('norma');
  }

  const out: Cecha[] = [];
  for (const [id, leads] of jest) {
    const c = BY.get(id);
    if (c) out.push({ ...c, k: { ...c.k, leads } });
    niepewne.delete(id);
  }
  out.sort((a, b) => (ORDER.get(a.id) ?? 0) - (ORDER.get(b.id) ?? 0));
  return { jest: out, niepewne };
}

function shuffle<T>(a: T[], rnd: () => number): T[] {
  const x = a.slice();
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
}

// Wszystkie patologie z zapisu + fałszywe odpowiedzi z cech, z którymi najłatwiej je pomylić.
// Rytm zatokowy nie jest patologią – pokazujemy go tylko wtedy, gdy zapis jest prawidłowy albo jako pułapkę przy innym rytmie.
export function quizCech(g: GenerateResult, seed: number, min = 5): CechaQ[] {
  const rnd = mulberry32((seed ^ 0x51ed270b) >>> 0);
  const { jest, niepewne } = cechyZapisu(g);
  const ids = new Set(jest.map((c) => c.id));
  const prawdziwe = jest.filter((c) => c.id !== 'zatokowy');
  const szybkiSzeroki = ids.has('tachykardia') || ids.has('szerQRS') || ids.has('vt') || ids.has('vf') || ids.has('asystolia');
  const przeciwne = (id: string) => (id === 'tachykardia' && ids.has('bradykardia')) || (id === 'bradykardia' && ids.has('tachykardia'));
  const ok = (id: string) => !ids.has(id) && !niepewne.has(id) && BY.has(id) && !przeciwne(id) && (szybkiSzeroki || !ZLOSLIWE.has(id));

  const ileFalsz = Math.max(2, min - prawdziwe.length);
  const wybrane: string[] = [];
  const bliskie = shuffle([...new Set(prawdziwe.flatMap((c) => MYLI[c.id] ?? []))].filter(ok), rnd);
  for (const id of bliskie) if (wybrane.length < ileFalsz) wybrane.push(id);
  if (wybrane.length < ileFalsz) {
    const reszta = shuffle(CECHY.map((c) => c.id).filter((id) => ok(id) && !wybrane.includes(id)), rnd);
    wybrane.push(...reszta.slice(0, ileFalsz - wybrane.length));
  }

  const items: CechaQ[] = [...prawdziwe.map((c) => ({ ...c, jest: true })), ...wybrane.map((id) => ({ ...BY.get(id)!, jest: false }))];
  return items.sort((a, b) => (ORDER.get(a.id) ?? 0) - (ORDER.get(b.id) ?? 0));
}
