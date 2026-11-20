import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { PRZYPADKI } from '../src/data/przypadki';
import { generateCase } from '../src/lib/generate';
import { ocen } from '../src/lib/ocena';
import type { Answer } from '../src/lib/ocena';

const req = createRequire(import.meta.url);
const SRC = 'C:/Projects/medsim/ekg-cwiczenia/';
const hasOriginal = (() => {
  try {
    req(SRC + 'ocena.js');
    return true;
  } catch {
    return false;
  }
})();

function perfectAnswer(K: any): Answer {
  const first = (a: any) => (Array.isArray(a) && a.length ? a[0] : null);
  return {
    rytm: first(K.rytm),
    miar: first(K.miar),
    dod: [...(K.dod?.req || [])],
    hr: K.hr,
    ha: K.ha,
    os: first(K.os),
    P: [...(K.P?.req || [])],
    sa: first(K.sa),
    av: first(K.av),
    iv: [...(K.iv?.req || [])],
    pr: K.pr,
    qrs: K.qrs,
    qt: K.qt,
    qtc: K.qtc,
    qtK: first(K.qtK),
    morf: [...(K.morf?.req || [])],
    stF: [...(K.stF?.req || [])],
    T: [...(K.T?.req || [])],
    leads: {
      stUp: [...(K.leads?.stUp?.req || [])],
      stDn: [...(K.leads?.stDn?.req || [])],
      tNeg: [...(K.leads?.tNeg?.req || [])],
      q: [...(K.leads?.q?.req || [])],
    },
    wniosek: '',
    dx: undefined,
  } as unknown as Answer;
}

function brokenAnswer(K: any, mode: number): Answer {
  const a = perfectAnswer(K) as any;
  if (mode === 0) {
    a.rytm = a.rytm === 'af' ? 'sinus' : 'af';
    a.hr = (a.hr ?? 70) + 60;
    a.os = a.os === 'N' ? 'L' : 'N';
    a.leads.stUp = ['III', 'aVF'];
    a.leads.stDn = ['I', 'aVL'];
    a.T = ['szpicz'];
    a.morf = ['lvh'];
  } else if (mode === 1) {
    a.hr = null;
    a.pr = null;
    a.qrs = null;
    a.qt = null;
    a.qtc = null;
    a.leads = { stUp: [], stDn: [], tNeg: [], q: [] };
    a.P = [];
    a.T = [];
    a.morf = [];
    a.iv = [];
    a.sa = null;
    a.av = null;
    a.dod = [];
  } else {
    a.leads.stUp = [];
    a.leads.stDn = [];
    a.leads.tNeg = [];
    a.leads.q = [];
    a.dod = ['pvc', 'pac', 'niemiar', 'pauzy'];
    a.iv = ['LBBB', 'RBBB', 'iRBBB', 'LAFB', 'LPFB', 'IVCD', 'WPW'];
    a.morf = ['lvh', 'rvh', 'niski', 'slabaR', 'fJ', 's1q3t3', 'brugada', 'helmet', 'prObn'];
  }
  return a as Answer;
}

describe('ocena: wzorcowa odpowiedź daje maksimum', () => {
  for (const c of PRZYPADKI) {
    it(c.id, () => {
      const { key } = generateCase({ seed: 4242, id: c.id });
      const R = ocen(key.klucz as any, perfectAnswer(key.klucz));
      expect(R.auto).toBe(8);
      expect(R.pola.rytm.pkt).toBe(2);
      expect(R.pola.stt.pkt).toBe(2);
    });
  }
});

describe.skipIf(!hasOriginal)('ocena: parité z oryginalnym ocena.js', () => {
  const oc = req(SRC + 'ocena.js');

  const cases = PRZYPADKI.filter((_, i) => i % 3 === 0);

  for (const c of cases) {
    for (const mode of [0, 1, 2]) {
      it(`${c.id} / wariant ${mode}`, () => {
        const { key } = generateCase({ seed: 9001, id: c.id });
        const A = mode === -1 ? perfectAnswer(key.klucz) : brokenAnswer(key.klucz, mode);
        const mine = ocen(key.klucz as any, A);
        const orig = oc.ocen(key.klucz as any, A);
        expect(mine.auto).toBe(orig.auto);
        expect(mine.pola).toEqual(orig.pola);
        expect(mine.grupy).toEqual(orig.grupy);
        expect(mine.liczby).toEqual(orig.liczby);
        expect(mine.leads).toEqual(orig.leads);
        expect(mine.el).toEqual(orig.el);
      });
    }
  }
});
