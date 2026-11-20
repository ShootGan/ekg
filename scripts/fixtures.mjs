import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const req = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, '..', '..', 'medsim', 'ekg-cwiczenia');
const OUT = path.resolve(HERE, '..', 'test', 'fixtures');

if (!fs.existsSync(path.join(SRC, 'przypadki.js'))) {
  console.error('brak źródła: ' + SRC);
  process.exit(1);
}

const PRZYPADKI = req(path.join(SRC, 'przypadki.js'));
const oc = req(path.join(SRC, 'ocena.js'));
const SL = req(path.join(SRC, 'slownik.js'));

const ECG_SRC = fs.readFileSync(path.resolve(SRC, '..', 'corpuls-mcp', 'ecg.js'), 'utf8');
const vm = req('node:vm');
const ctx = { Math };
vm.runInNewContext(ECG_SRC, ctx);
const ECG = ctx.ECG;

function mulberry(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CASES = ['sinus-norma', 'af-normo', 'flutter-2-1', 'vt-mono', 'av1', 'wenckebach', 'av3-waskie', 'lbbb', 'wpw', 'stemi-dolny', 'stemi-tylny', 'wellens', 'hiperkaliemia', 'hipokaliemia', 'brugada', 'helmet', 'lafb', 'lpfb', 'lvh', 'zatorowosc', 'sa-blok-typ2', 'zahamowanie-zatokowe', 'ivcd', 'niepelny-rbbb', 'tdp', 'asystolia' ];

function makeGen(seed) {
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  return { rnd };
}

const out = [];
for (const id of CASES) {
  const P = PRZYPADKI.find((p) => p.id === id);
  if (!P) { console.error('brak przypadku ' + id); continue; }
  for (const seedBase of [1234, 777, 424242]) {
    const g = makeGen(seedBase);
    const e = JSON.parse(JSON.stringify(P.ecg));
    const jit = (v, f) => v * (1 + (g.rnd() * 2 - 1) * f);
    if (e.rhythm === 'flutter') { const ratio = e.atrialRate / e.hr; e.atrialRate = Math.round(jit(e.atrialRate, 0.06)); e.hr = Math.round(e.atrialRate / ratio); }
    else if (e.av === 3) { e.atrialRate = Math.round(jit(e.atrialRate, 0.08)); e.hr = Math.round(jit(e.hr, 0.08)); }
    else if (e.atrialRate) e.atrialRate = Math.round(jit(e.atrialRate, 0.07));
    else if (e.hr && !['vf', 'asystole'].includes(e.rhythm)) e.hr = Math.round(jit(e.hr, 0.07));
    if (e.bbb !== 'L' && !['vt', 'tdp', 'vf', 'asystole'].includes(e.rhythm)) e.axis = Math.round((e.axis ?? 60) + (g.rnd() * 2 - 1) * (P.kat === 'os' ? 4 : 8));
    if (e.stAmp) e.stAmp = Math.max(0.1, Math.round(jit(e.stAmp, 0.18) * 100) / 100);
    const pageSeed = Math.floor(g.rnd() * 2147483647);

    const G = ECG.create();
    G.config(e);
    const S = G.scheduler();
    G.schedule(S, { t0: -1.5, rand: mulberry(pageSeed) }, 11.5);
    const M = G.measure(S, [0, 10], null);

    out.push({ id, seedBase, ecg: e, pageSeed, meas: M, klucz: null });
  }
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'generated.json'), JSON.stringify(out, null, 1));
console.log('zapisano ' + out.length + ' przypadków → ' + path.join(OUT, 'generated.json'));
void oc;
void SL;
