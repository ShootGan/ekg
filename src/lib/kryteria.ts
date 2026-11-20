import type { Mark } from '../components/EcgPrint';
import { PRZYPADKI } from '../data/przypadki';

export const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

export function leadsIn(txt: string): string[] {
  const out = new Set<string>();
  for (const m of txt.matchAll(/V([1-6])\s*[–-]\s*V?([1-6])(?![0-9R])/g)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    for (let k = Math.min(a, b); k <= Math.max(a, b); k++) out.add('V' + k);
  }
  for (const m of txt.matchAll(/\b(aV[RLF]|V[1-6])(?![0-9R])/g)) out.add(m[1]);
  for (const m of txt.matchAll(/(^|[\s,(/])(III|II|I)(?=[\s,)/]|$)/g)) {
    const i = (m.index ?? 0) + m[1].length;
    const before = txt.slice(Math.max(0, i - 16), i);
    const after = txt.slice(i + m[2].length, i + m[2].length + 10);
    const listy =
      /(\bw|,|\bi|±|\bodpr\.?|odprowadzeni\w*|\/)\s*$/.test(before) ||
      /^\s*(,|\/|i\s+(III|II|I\b|aV|V\d)|dodatn|ujemn|bliskie|izoelektr)/i.test(after);
    const notLead = /\bAV\s*$|stopni|typ\s*$/i.test(before) || /^\s*(stopnia|stopień|°)/i.test(after);
    if (listy && !notLead) out.add(m[2]);
  }
  return LEADS.filter((l) => out.has(l));
}

export interface Kryterium {
  leads: string[];
  tags: string[];
  wizualne: boolean;
  nieobecne: boolean;
}

const KLINICZNE: RegExp[] = [
  /^(wniosek|w kontekście|przyczyna|ryzyko|stan |możliwe przyczyny|rozpoznanie z wykluczenia|nie da się|nowy |nagły początek|wywiad|omdlenie \+|tachykardia wtórna|ewentualne|sprawdzić|tło|ważne rozpoznanie|rytm niedefibr|w okresie|nie jest to RBBB|w LBBB nie ocenia)/,
  /^(reszta zapisu|bez |brak ostrych|brak uniesień|brak uniesienia|brak patologicznych|brak zmian przeciwstawnych|najpewniej|oś pionowa – norma|EKG prawidłowe)/,
  /^wysokie ryzyko/,
];

const REGULY: [RegExp, string[]][] = [
  [/obniżen\w* (odcinka )?PR|uniesien\w* PR/, ['PRobn']],
  [/\bST\b|uniesien|zmiany przeciwstawne|kopulast|coved|łukowat/, ['ST']],
  [/S1Q3T3|Q3T3|\bS1\b/, ['s1q3t3']],
  [/(?<![SsQ])\bT\b|załamk\w* T\b|odwrócon\w* T|\bT przeciwne|hiperostr|\bT hiperostry/, ['T']],
  [/\bQ\b|\bQS\b|patologiczne Q/, ['Q']],
  [/progresj|\bQS\b/, ['prog']],
  [/rSR|rSr|rS\b.*V1/, ['rsr']],
  [/szerokie,? (zazębione )?S|małe szerokie s|zazębione S/, ['szS']],
  [/szerokie, zazębione R|szerokie,? zazębione R/, ['QRS']],
  [/fal\w* U\b|\bU\b/, ['U']],
  [/fal\w* J\b|punkt J|Osborna|\bJ\b/, ['J']],
  [/delta/, ['delta']],
  [/niski woltaż/, ['niski']],
  [/Sokolow|wysoki woltaż/, ['wysoki']],
  [/wysokie R|dominujące R|R\/S|R > S|jak kolec/, ['Rwys']],
  [/głębokie S/, ['Sgl']],
  [/naprzemienność/, ['alternans']],
  [/pauz|brak (P )?(i QRS|QRS)|brak zespołów QRS/, ['pauza']],
  [/grupowan|grupy/, ['grupy']],
  [/niepełna pauza/, ['pac']],
  [/(?<!nie)pełna pauza/, ['pvc']],
  [/\bPP\b/, ['pp']],
  [/\bPR\b/, ['PR']],
  [/\bP\b|załamk\w* P|\bP[-–]|nieprzewiedzion|dysocjacj|\bf\b|fale? F|trzepotania|piła/, ['P']],
  [/wypadnięci/, ['pbez']],
  [/\bQRS\b|szerokie|(?<!nie)poszerzon|zazębion/, ['QRS']],
  [/\bQT\b|QTc/, ['QT']],
  [/częstość|tachykardi|bradykardi|\/min/, ['czest']],
  [/rytm|miarow|niemiarow|nieregularn|PVC|przedwczesn/, ['rytm']],
  [/(^|[\s(])oś([\s,)]|$)|\bosi\b/, ['os']],
  [/odnogi|RBBB|LBBB|blok śródkomorowy/, ['bbb']],
  [/monomorficz|jednakow\w+ morfolog|pobudzenia monomorf/, ['mono']],
  [/skręcani|narasta i maleje/, ['tdp']],
  [/przewodzenie \d:1/, ['przew']],
  [/artefakt|drżeni|szum|zakłóc|pływa|izolini|50 Hz/, ['art']],
  [/zły kontakt|poszarpana|nie do oceny/, ['bad']],
  [/hełm|kopuł/, ['helm']],
];

const GRUPY_ODPR: [RegExp, string[]][] = [
  [/odprowadzeniach dolnych/, ['II', 'III', 'aVF']],
  [/przedsercow/, ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']],
  [/kończynow/, ['I', 'II', 'III', 'aVR', 'aVL', 'aVF']],
];

const NIEOBECNE = /(nieobecn|niewidoczn|niemierzaln|nieodtworzon)\w*$/;

export function kryterium(txt: string): Kryterium {
  if (NIEOBECNE.test(txt)) return { leads: [], tags: [], wizualne: false, nieobecne: true };
  if (KLINICZNE.some((r) => r.test(txt))) return { leads: [], tags: [], wizualne: false, nieobecne: false };
  const ls = new Set(leadsIn(txt));
  for (const [re, l] of GRUPY_ODPR) if (re.test(txt)) l.forEach((x) => ls.add(x));
  const leads = LEADS.filter((l) => ls.has(l));
  const tags = new Set<string>();
  for (const [re, t] of REGULY) if (re.test(txt)) t.forEach((x) => tags.add(x));
  if (['alternans', 'niski', 'wysoki', 'Rwys', 'Sgl', 'delta', 'rsr', 'szS', 'pbez', 'PR', 'grupy', 's1q3t3'].some((x) => tags.has(x))) tags.delete('QRS');
  if (tags.has('P') && !/wąski|szerok|poszerz|≥|<120/.test(txt)) tags.delete('QRS');
  if (/fale? (f|F)\b|piła|trzepotania/.test(txt)) tags.add('fF');
  return { leads, tags: [...tags], wizualne: tags.size > 0 || leads.length > 0, nieobecne: false };
}

export function marksFor(k: Kryterium, marks: Mark[]): Mark[] {
  if (!k.tags.length && !k.leads.length) return [];
  return marks.filter((m) => {
    const lead = m.n || m.pole;
    if (k.leads.length && lead !== 'pasek' && !k.leads.includes(lead)) return false;
    if (k.leads.length && lead === 'pasek' && !k.leads.includes('II')) return false;
    if (!k.tags.length) return true;
    return (m.c ?? []).some((c) => k.tags.includes(c));
  });
}

const num = (txt: string, re: RegExp) => Number(txt.match(re)?.[1] ?? NaN);

export function diagnosticMarks(marks: Mark[], caseId: string): Mark[] {
  const kat = PRZYPADKI.find((p) => p.id === caseId)?.kat;
  const axisCase = kat === 'os' || ['lafb', 'lpfb', 'dwuwiazkowy-av1', 'rvh', 'zatorowosc', 'zatorowosc-subtelna'].includes(caseId);
  return marks.filter((m) => {
    if (m.pole === 'czest') return false;
    if (m.pole === 'os') return axisCase;
    if (m.pole === 'PR') return false;
    if (m.pole === 'P') return m.txt !== 'P';
    if (m.pole === 'QRS') return num(m.txt, /QRS (\d+)/) >= 120;
    if (m.pole === 'QT') return num(m.txt, /QTc (\d+)/) > 470;
    if (m.pole === 'rytm') return !/^RR .* podobny$/.test(m.txt);
    return true;
  });
}
