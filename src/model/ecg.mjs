// Generator EKG dla symulatora corpuls3.
// Model wektorowy: każdy załamek to dipol w 3D (x = w lewo, y = w dół, z = do przodu) rzutowany na 12 odprowadzeń,
// więc prawa Einthovena/Goldbergera, oś i zmiany przeciwstawne wynikają same. Przedsionki i komory mają osobny
// harmonogram (bloki AV, ektopia, stymulacja), a pomiary i opis automatu liczone są z tego samego modelu.
  'use strict';
  var D2R = Math.PI / 180, SQ3 = Math.sqrt(3) / 2;
  function norm(v) { var l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
  function fr(deg, z) { return norm([Math.cos(deg * D2R), Math.sin(deg * D2R), z || 0]); }
  function sc(v, k) { return [v[0] * k, v[1] * k, v[2] * k]; }
  function add(a, b, k) { return [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sig(x) { return 1 / (1 + Math.exp(-x)); }
  function hsh(i, s) { var x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); } // deterministyczny „szum”: ten sam czas i odprowadzenie dają zawsze tę samą wartość
  function vn(x, s) { var i = Math.floor(x), f = x - i; return (hsh(i, s) * (1 - f) + hsh(i + 1, s) * f) * 2 - 1; }
  var TAU = 2 * Math.PI;

  var NAMES = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  // Kończynowe: wektory jednostkowe (I, II, III), wzmocnione ×√3/2 – wtedy III = II − I i aVF = (II+III)/2 dokładnie.
  // Przedsionkowe: kierunek w płaszczyźnie poziomej z lekką składową dolną, wzmocnienie = bliskość serca.
  var LEADS = {
    I: [1, 0, 0], II: fr(60), III: fr(120),
    aVR: sc(fr(-150), SQ3), aVL: sc(fr(-30), SQ3), aVF: sc(fr(90), SQ3),
    V1: sc(norm([-0.42, 0.05, 0.91]), 1.5), V2: sc(norm([-0.05, 0.1, 1]), 2.6), V3: sc(norm([0.35, 0.45, 0.82]), 2.4),
    V4: sc(norm([0.68, 0.42, 0.56]), 2.2), V5: sc(norm([0.92, 0.28, 0.27]), 1.5), V6: sc(norm([1, 0.22, -0.05]), 1.15)
  };
  var INJ = { // kierunki wektora uszkodzenia (uniesienie ST tam, gdzie wskazuje; obniżenie naprzeciwko)
    inferior: [-0.15, 1, -0.3], inferior_rv: [-0.7, 0.78, 0.12], inferoposterior: [0, 0.85, -0.55], posterior: [0.15, 0.1, -1],
    anterior: [0.1, 0.05, 1], anteroseptal: [-0.25, 0.05, 1], anterolateral: [0.65, -0.25, 0.75], lateral: [0.9, -0.4, 0.05],
    high_lateral: [0.75, -0.65, 0.1], subendocardial: [-0.85, -0.5, -0.15], pericarditis: [0.45, 0.8, 0.4]
  };
  var QLEADS = { inferior: 'II, III, aVF', anterior: 'V1–V4', anteroseptal: 'V1–V3', anterolateral: 'V1–V6, I, aVL', lateral: 'I, aVL, V5–V6', high_lateral: 'I, aVL' };
  var DEF = { rhythm: 'sinus', hr: 75, pr: 160, qrs: 90, qtc: 420, axis: 60, pAmp: 1, tAmp: 1, tAnt: 0.5, voltage: 1, stAmp: 0.2, fAmp: 1, vfAmp: 1, avRatio: null };

  function create() {
    var E = null, cache = {}, mainDir = null;
    function cfg(e) {
      var o = {}, k; for (k in DEF) o[k] = DEF[k]; e = e || {};
      for (k in e) if (e[k] !== undefined && e[k] !== null) o[k] = e[k];
      if (e.qrs == null && e.qrsW != null) o.qrs = 90 * e.qrsW; // zgodność wstecz
      if (o.bbb === 'L' || o.bbb === 'R') o.qrs = Math.max(o.qrs, o.bbb === 'L' ? 140 : 130);
      if (o.wpw && e.pr == null) o.pr = 110;
      o.av = o.av == null ? 0 : o.av;
      if (o.av === '2:1') o.avN = 2; else o.avN = o.avRatio || (o.av === 'wenckebach' ? 4 : 3);
      return o;
    }
    function config(e) { E = cfg(e); cache = {}; mainDir = fr(E.axis, E.rvh ? 0.55 : -0.42); }
    config({});

    // ---------- morfologia ----------
    function G(t, s, a, d) { return { t: t, s: s, a: a, d: norm(d) }; }
    function PL(t0, t1, r, f, a, d) { return { pl: 1, t0: t0, t1: t1, r: r, f: f, a: a, d: norm(d) }; }
    function qtFor(rr) { if (E.qt) return E.qt / 1000; return clamp(E.qtc / 1000 * Math.sqrt(clamp(rr, 0.3, 3)), 0.24, 0.7); }
    function pComps(kind) {
      var a = 0.1 * E.pAmp;
      if (kind === 'pac') return [G(0.045, 0.022, a, [0.35, -0.8, 0.25])];
      var c;
      if (E.pType === 'pulmonale') c = [G(0.04, 0.019, a * 3.3, [0.1, 0.95, 0.45]), G(0.07, 0.02, a * 0.6, [0.75, 0.45, -0.5])]; // wysoki, szpiczasty P (PP)
      else if (E.pType === 'mitrale') c = [G(0.035, 0.018, a * 0.95, [0.2, 0.85, 0.5]), G(0.092, 0.022, a * 1.25, [0.7, 0.4, -0.75])]; // szeroki, dwugarbny P, ujemna końcówka w V1 (LP)
      else c = [G(0.035, 0.018, a, [0.2, 0.85, 0.5]), G(0.068, 0.02, a * 0.9, [0.75, 0.45, -0.5])];
      if (E.pericarditis || E.stemi === 'pericarditis') c.push(PL(0.1, 0.5, 0.01, 0.01, 0.05, [-0.45, -0.8, -0.4]));
      return c;
    }
    function qrsComps(kind) { // komponenty QRS względem początku QRS, czas trwania D [s], kierunek głównego wektora
      var V = E.voltage, D, c = [], main;
      if (kind === 'p') { D = 0.16; main = norm([0.4, -0.75, -0.55]); c.push(G(0.38 * D, 0.15 * D, 1.35 * V, main), G(0.72 * D, 0.13 * D, 0.7 * V, [0.65, -0.35, -0.7])); }
      else if (kind === 'v') { D = 0.15; main = norm([0.2, 0.85, -0.5]); c.push(G(0.4 * D, 0.16 * D, 1.55 * V, main), G(0.72 * D, 0.13 * D, 0.55 * V, [0.6, 0.6, -0.5])); }
      else if (kind === 'vt' || kind === 'tdp') { D = Math.max(0.14, E.qrs / 1000); main = norm(E.vtDir || [0.55, -0.6, 0.55]); c.push(G(0.38 * D, 0.17 * D, 1.7 * V, main), G(0.74 * D, 0.13 * D, 0.6 * V, [0.4, -0.2, 0.9])); }
      else if (E.bbb === 'L') {
        D = E.qrs / 1000; main = norm([0.85, 0.32 * Math.sin(E.axis * D2R), -0.5]);
        c.push(G(0.12 * D, 0.07 * D, 0.25 * V, [0.6, 0.1, -0.6]), G(0.4 * D, 0.13 * D, 1.05 * V, main), G(0.7 * D, 0.13 * D, 1.15 * V, main));
      } else {
        var Dn = (E.bbb ? Math.min(E.qrs, 110) : E.qrs) / 1000, lvh = E.lvh ? 1.9 : 1, off = E.wpw ? 0.035 : 0;
        D = Math.max(E.qrs / 1000, Dn) + off; main = mainDir;
        if (E.wpw) c.push(G(0.03, 0.022, 0.3 * V, main), G(0.05, 0.02, 0.25 * V, main)); // delta: wolno narastająca preekscytacja bez wektora przegrody
        c.push(G(off + 0.17 * Dn, 0.1 * Dn, (E.wpw ? 0 : 0.22) * V, [-0.55, 0.25, 0.8]), G(off + 0.46 * Dn, 0.155 * Dn, 1.25 * V * lvh, main), G(off + 0.7 * Dn, 0.14 * Dn, 0.3 * V, [-0.35, -0.55, -0.75]));
        if (E.s1q3t3) { var sk = E.s1q3t3 === true ? 1 : E.s1q3t3; // s1q3t3: true albo 0–1 (subtelny); wczesny wektor w górę-lewo = q w III, późny w prawo = S w I
          c.push(G(off + 0.13 * Dn, 0.08 * Dn, 0.5 * V * sk, [0.6, -0.65, 0.45]), G(off + 0.88 * Dn, 0.1 * Dn, 0.4 * V * sk, [-0.85, -0.25, 0.25])); } // ostre przeciążenie PK: wczesny wektor w górę-lewo = r w I, q w III
        if (E.rvh) c.push(G(off + 0.22 * Dn, 0.1 * Dn, 0.3 * V, [0.8, 0.3, 0.1])); // wczesne r w V5–V6 (rS zamiast QS)
        if (E.qWave && INJ[E.qWave]) c.push(G(off + 0.3 * Dn, 0.13 * Dn, (Math.abs(norm(INJ[E.qWave])[2]) > 0.8 ? 0.5 : 0.9) * V, sc(norm(INJ[E.qWave]), -1))); // martwica: początkowy wektor od blizny = Q
        if (E.bbb === 'R') c.push(G(off + Dn + 0.03, 0.022, 0.6 * V, [-0.75, 0.05, 0.65]));
        if (E.bbb === 'iR') c.push(G(off + Dn - 0.005, 0.014, 0.4 * V, [-0.75, 0.05, 0.65])); // niepełny RBBB: małe r' w V1, QRS <120 ms
        if (E.jAmp) c.push(G(D * 0.96, 0.016, E.jAmp, main));
      }
      return { c: c, D: D, main: main };
    }
    function tDir(kind, q) {
      var normal = fr(E.tAxis != null ? E.tAxis : clamp(E.axis, -10, 75) * 0.8 + 8, E.tAnt);
      if (kind === 'p' || kind === 'v' || kind === 'vt' || kind === 'tdp' || E.bbb === 'L') return sc(q.main, -1);
      if (E.bbb === 'R') return norm(add(normal, [-0.75, 0.05, 0.65], -1.1));
      if (E.lvh && E.lvhStrain !== false) return norm(add(normal, mainDir, -1.4));
      if (E.rvh && E.rvhStrain !== false) return norm(add(normal, mainDir, -2.2));
      return normal;
    }
    function morph(kind, rr) {
      var key = kind + '|' + Math.round(rr * 25); if (cache[key]) return cache[key];
      var q = qrsComps(kind), D = q.D; q.c.forEach(function (o) { o.q = 1; });
      var c = q.c.slice(), qt = Math.max(qtFor(rr), D + 0.16), tp = qt - 0.075, td = tDir(kind, q);
      var sec = (kind !== 'n' && kind !== 'e') || E.bbb === 'L', ta = (sec ? 0.5 : 0.33) * E.tAmp, sd = 0.046 * Math.sqrt(qt / 0.4);
      if (E.tAmp >= 1.5 && !sec) { c.push(G(tp, sd * 0.62, ta, td)); }
      else { c.push(G(tp, sd, ta, td), G(tp - 0.045, 0.042, ta * 0.3, td)); }
      if (E.uAmp) c.push(G(tp + 0.165, 0.035, E.uAmp, td));
      if (E.helmet && (kind === 'n' || kind === 'e')) { // objaw hełmu: QRS jak kolec, wysoki punkt J i jeden długi zjazd ST zlany z T (kopuła hełmu), lekkie uniesienie tuż przed QRS
        var hd = E.helmet === 'anterior' ? [0.1, 0.1, 1] : [0, 1, -0.15], ha = 0.6, span = qt + 0.02 - D;
        c.push(G(0, 0.03, 0.08, hd));
        for (var hk = 1; hk <= 5; hk++) c.push(PL(D * 0.7, D + span * hk / 5, 0.012, 0.045, ha / 5, hd)); // schodki z łagodnym zboczem = gładki zjazd
      }
      if (E.brugada && (kind === 'n' || kind === 'e')) { // typ 1: wysoki punkt J i łukowate (coved) opadające ST przechodzące w ujemny T w V1–V2
        var bd = [-0.35, 0, 0.88], ba = 0.3 * (E.brugada === 2 ? 0.6 : 1);
        c.push(G(D + 0.015, 0.03, ba, bd), PL(D, tp - 0.03, 0.006, 0.05, ba * 0.55, bd), G(tp, sd, -ba * 1.7, bd));
      }
      if (kind === 'n' || kind === 'e') {
        var inj = E.stemi && INJ[E.stemi];
        if (inj) { c.push(PL(D, tp + 0.01, 0.006, 0.03, E.stAmp, inj)); if (E.hyperacute) c.push(G(tp, sd, E.stAmp * 1.6, inj)); }
        else if (E.pericarditis) c.push(PL(D, tp + 0.01, 0.006, 0.03, 0.15, INJ.pericarditis));
      }
      var m = { c: c, D: D, main: q.main, qt: qt, tp: tp, rOff: 0, P: {}, L: {} };
      // czas szczytu R w odprowadzeniu II (do synchronizacji i znaczników R)
      var best = 0; for (var t = 0; t < D; t += 0.002) { var v = Math.abs(evalComps(m.c, t, 'II')); if (v > best) { best = v; m.rOff = t; } }
      cache[key] = m; return m;
    }
    function pMorph(kind) { var key = 'P|' + kind; if (!cache[key]) cache[key] = { c: pComps(kind), P: {}, L: {} }; return cache[key]; }
    function proj(comp, lead) { var k = '_' + lead; if (comp[k] === undefined) comp[k] = comp.a * dot(comp.d, LEADS[lead] || LEADS.II); return comp[k]; }
    function evalComps(c, d, lead, qk) {
      var v = 0;
      for (var i = 0; i < c.length; i++) {
        var o = c[i], a = proj(o, lead);
        if (qk !== undefined && o.q) a *= qk;
        if (o.pl) { if (d > o.t0 - 0.05 && d < o.t1 + 0.2) v += a * sig((d - o.t0) / o.r) * (1 - sig((d - o.t1) / o.f)); }
        else { var x = d - o.t; if (x > -4 * o.s && x < 4 * o.s) v += a * Math.exp(-x * x / (2 * o.s * o.s)); }
      }
      return v;
    }

    // ---------- harmonogram ----------
    function scheduler() { return { nA: null, nV: null, nS: null, ev: [], atr: [], sp: [], wk: 0, sa: 0, lastV: null }; }
    function aRate() {
      if (E.atrialRate) return E.atrialRate;
      if (E.av === 3 || E.rhythm === 'asystole') return 80;
      if (E.av === 'wenckebach' || E.av === 'mobitz2' || E.av === '2:1') return E.hr * E.avN / (E.avN - 1);
      return E.hr;
    }
    function sinusLike() { return E.rhythm === 'sinus' || E.rhythm === 'pea' || (E.rhythm === 'asystole' && !!E.atrialRate); }
    function ventRate() { // własna częstość komór (do hamowania stymulatora DEMAND)
      var r = E.rhythm; if (r === 'vf' || r === 'asystole' || r === 'off') return 0;
      if (sinusLike() && E.av !== 3) { if (E.av === 'wenckebach' || E.av === 'mobitz2' || E.av === '2:1') return aRate() * (E.avN - 1) / E.avN; return E.hr; }
      return E.hr;
    }
    function pushV(S, t, k, R) {
      var rr = S.lastV != null ? clamp(t - S.lastV, 0.25, 4) : 60 / Math.max(20, E.hr || 60);
      if (E.pvc && k === 'n' && S.lastV != null && R() < E.pvc && rr > 0.5) { // PVC w miejsce pobudzenia, pauza wyrównawcza
        var tv = S.lastV + 0.55 * rr; S.ev.push({ t: tv, k: 'v', rr: 0.55 * rr }); S.lastV = tv; return;
      }
      S.ev.push({ t: t, k: k, rr: rr, ph: S.ev.length }); S.lastV = t;
    }
    function schedule(S, ctx, tEnd) {
      var R = (ctx && ctx.rand) || Math.random, pac = ctx && ctx.pacer, cap = pac && pac.captured, act = pac && pac.active, r = E.rhythm;
      if (r === 'off') return;
      var t0 = ctx && ctx.t0 != null ? ctx.t0 : tEnd - 1;
      if (act) { if (S.nS == null || S.nS < t0 - 1) S.nS = t0; while (S.nS <= tEnd) { S.sp.push(S.nS); if (cap) pushV(S, S.nS + 0.012, 'p', R); S.nS += 60 / Math.max(30, pac.rate); } }
      else S.nS = null;
      if (sinusLike()) {
        var ar = aRate();
        if (S.nA == null || S.nA < t0 - 2) S.nA = t0;
        while (S.nA <= tEnd) {
          var iv = 60 / Math.max(20, ar), ta = S.nA, kind = 'a';
          iv *= 1 + (E.sinArr || 0.025) * Math.sin(ta * 2 * Math.PI * 0.25) + (R() - 0.5) * 0.015; // niemiarowość oddechowa (sinArr = amplituda)
          if (E.pac && R() < E.pac && S.atr.length) { kind = 'pac'; ta = S.nA - iv * 0.32; }
          if (E.sa && kind === 'a') { // bloki zatokowo-przedsionkowe: węzeł zatokowy bije równo, wypada albo opóźnia się wyjście pobudzenia
            var san = E.saN || (E.sa === 'arrest' ? 6 : E.sa === 'wenckebach' ? 4 : 4), sj = S.sa++ % san;
            if (E.sa === 2 && sj === san - 1) { S.nA = ta + iv; continue; } // typ II: brak P i QRS, pauza = dokładnie 2× PP
            if (E.sa === 'wenckebach') { if (sj === san - 1) { S.nA = ta + iv; continue; } ta += 0.26 * (1 - Math.pow(0.5, sj)); } // typ I: PP się skraca, potem pauza < 2× PP
            if (E.sa === 'arrest' && sj === san - 1) { S.atr.push({ t: ta, k: kind }); S.nA = ta + iv * (E.saMult || 2.7); if (!cap) pushV(S, ta + E.pr / 1000, 'n', R); continue; } // zahamowanie: pauza nie jest wielokrotnością PP
          }
          S.atr.push({ t: ta, k: kind }); S.nA = (E.sa === 'wenckebach' && kind === 'a' ? S.nA : ta) + iv;
          if (cap) continue;
          var conducted = true, pr = E.pr / 1000;
          if (E.av === 3) conducted = false;
          else if (E.av === 'wenckebach') { var i = S.wk % E.avN; if (i === E.avN - 1) conducted = false; else pr += 0.2 * (1 - Math.pow(0.5, i)); S.wk++; }
          else if (E.av === 'mobitz2' || E.av === '2:1') { if (S.wk % E.avN === E.avN - 1) conducted = false; S.wk++; }
          if (conducted) pushV(S, ta + pr, 'n', R);
        }
        if (E.av === 3 && !cap && E.hr > 0) indep(S, t0, tEnd, 'e', R);
      } else if (!cap) {
        if (r === 'af' || r === 'flutter' || r === 'junctional' || r === 'svt') indep(S, t0, tEnd, 'n', R);
        else if (r === 'vt') indep(S, t0, tEnd, 'vt', R);
        else if (r === 'tdp') indep(S, t0, tEnd, 'tdp', R);
      }
    }
    function indep(S, t0, tEnd, k, R) {
      if (S.nV == null || S.nV < t0 - 2) S.nV = t0 + 0.05;
      while (S.nV <= tEnd) {
        var iv = 60 / Math.max(15, E.hr || 60);
        if (E.rhythm === 'af') iv *= 0.55 + R() * 0.9; else if (E.rhythm === 'tdp') iv *= 0.85 + R() * 0.3; else iv *= 1 + (R() - 0.5) * 0.02;
        pushV(S, S.nV, k, R); S.nV += iv;
      }
    }
    function trim(S, tMin) {
      while (S.ev.length && S.ev[0].t < tMin - 1.2) S.ev.shift();
      while (S.atr.length && S.atr[0].t < tMin - 1.2) S.atr.shift();
      while (S.sp.length && S.sp[0] < tMin - 1.2) S.sp.shift();
    }

    // ---------- wartość odprowadzenia w chwili t [mV] ----------
    // Same zaplanowane pobudzenia, bez tła: przy zmianie rytmu na wydruku dogasa nimi T z poprzedniego odcinka.
    function beatK(e, li) { // skala amplitudy QRS pojedynczego pobudzenia: naprzemienność elektryczna i oddechowa zmienność amplitudy
      var k = 1;
      if (E.beatVar) k *= 1 + E.beatVar * Math.sin(TAU * 0.27 * e.t + li * 0.35);
      if (E.alternans && e.ph != null && e.ph % 2 === 1) k *= E.alternans;
      return k;
    }
    function leadEvents(name, t, S) {
      var v = 0, i, d, L = LEADS[name] || LEADS.II, li = NAMES.indexOf(name), vary = !!(E.beatVar || E.alternans);
      for (i = S.atr.length - 1; i >= 0; i--) { d = t - S.atr[i].t; if (d < -0.05) continue; if (d > 0.6) break; v += evalComps(pMorph(S.atr[i].k).c, d, name); }
      for (i = S.ev.length - 1; i >= 0; i--) {
        var e = S.ev[i]; d = t - e.t; if (d < -0.12) continue; if (d > 1.1) break;
        var m = morph(e.k, e.rr || 0.8);
        if (e.k === 'tdp') { var rot = Math.cos(e.ph * 0.55); v += evalComps(m.c, d, name) * (0.35 + 0.65 * Math.abs(rot)) * (rot < 0 ? -1 : 1); }
        else v += evalComps(m.c, d, name, vary && e.k !== 'vt' ? beatK(e, li) : undefined);
      }
      for (i = S.sp.length - 1; i >= 0; i--) { d = t - S.sp[i]; if (d < 0) continue; if (d > 0.02) break; if (d < 0.006) v += 2.2 * dot(norm([0.3, 0.9, 0.3]), L) * (1 - d / 0.006); }
      return v;
    }
    function isBad(name) { var b = E.badLead; return !!b && (Array.isArray(b) ? b.indexOf(name) >= 0 : b === name); }
    function noise(name, t, v) { // realistyczne zakłócenia (domyślnie wyłączone): pływanie izolinii, drżenie mięśni, 50 Hz, słaby kontakt elektrody
      var li = Math.max(0, NAMES.indexOf(name)), limb = li < 6, s = li + 1;
      if (E.wander) v += E.wander * ((0.55 * Math.sin(TAU * 0.23 * t + li * 1.3) + 0.35 * Math.sin(TAU * 0.37 * t + li * 0.7 + 1) + 0.25 * Math.sin(TAU * 0.11 * t + li * 2.1)) * (0.7 + 0.3 * Math.cos(li * 1.9)) + 0.25 * vn(t * 1.4, s));
      if (E.emg) v += E.emg * (limb ? 1 : 0.4) * (0.7 + 0.3 * Math.sin(TAU * 0.31 * t + li * 2)) * (0.6 * vn(t * 70, s) + 0.5 * vn(t * 37 + 11, s + 20) + 0.15 * Math.sin(TAU * (23 + li * 1.7) * t + li));
      if (E.tremor) v += E.tremor * (limb ? 1 : 0.45) * (0.6 + 0.4 * Math.sin(TAU * 0.4 * t + li)) * (0.6 * Math.sin(TAU * 4.9 * t + li * 1.1) + 0.5 * Math.sin(TAU * 5.8 * t + li * 2 + 1) + 0.25 * Math.sin(TAU * 4.1 * t + li * 0.4));
      if (E.hum) v += E.hum * (limb ? 1 : 0.8) * Math.sin(TAU * 50 * t + li * 0.7);
      if (isBad(name)) v = 0.08 * v + 0.05 * vn(t * 95, s + 40) + 0.025 * vn(t * 33, s + 50) + 0.18 * Math.sin(TAU * 0.13 * t + li) * (hsh(Math.floor(t * 0.7), s) > 0.45 ? 1 : 0.3) + (hsh(Math.floor(t * 3), s + 9) > 0.86 ? 0.35 * vn(t * 40, s + 60) : 0);
      return v;
    }
    function lead(name, t, S, ctx) {
      var r = E.rhythm, L = LEADS[name] || LEADS.II;
      if (r === 'off') return 0;
      var v = leadEvents(name, t, S);
      if (r === 'af' && !(ctx && ctx.pacer && ctx.pacer.captured)) { var f = 0.07 * E.fAmp; v += f * dot(norm([0.2, 0.5, 0.85]), L) * (Math.sin(t * 2 * Math.PI * 6.1) * 0.6 + Math.sin(t * 2 * Math.PI * 7.7 + 1) * 0.4 + Math.sin(t * 2 * Math.PI * 4.9 + 2) * 0.3); }
      if (r === 'flutter') { var ph = (t * (E.atrialRate || 300) / 60) % 1, saw = ph < 0.75 ? 1 - ph / 0.75 * 1.4 : -0.4 + (ph - 0.75) / 0.25 * 1.4; v += 0.3 * saw * dot(norm([0.15, -0.9, 0.4]), L); }
      if (r === 'vf') { var A = 0.5 * E.vfAmp * (0.6 + 0.4 * Math.sin(t * 1.3)); v += A * dot([Math.sin(t * 2 * Math.PI * 4.7), Math.sin(t * 2 * Math.PI * 5.9 + 1.3), Math.sin(t * 2 * Math.PI * 6.6 + 2.1)], L); }
      if (r === 'asystole') v += 0.02 * Math.sin(t * 1.7);
      v += 0.025 * Math.sin(t * 2 * Math.PI * 0.27) * dot([0.3, 0.6, 0.5], L);
      if (!(ctx && ctx.clean)) v = noise(name, t, v);
      var art = (E.artifact || 0) + (ctx && ctx.artifact || 0);
      if (art) { var sd = name.charCodeAt(0) + name.length * 7; v += art * (0.12 * (Math.sin(t * 157 + sd) + Math.sin(t * 211 + sd * 2) + Math.sin(t * 263 + sd * 3)) * (0.6 + 0.4 * Math.sin(t * 3.1 + sd)) + 0.3 * Math.sin(t * 2.1 + sd)); }
      if (ctx && ctx.cpr) { var cp = (t * (ctx.cprRate || 110) / 60) % 1; v += 1.3 * (cp < 0.45 ? Math.sin(Math.PI * cp / 0.45) : 0) * dot(norm([0.1, 1, 0.45]), L); }
      return v;
    }
    function rTime(e) { return e.t + morph(e.k, e.rr || 0.8).rOff; }

    // ---------- pomiary i opis automatu ----------
    function axisOf(c, t0, t1) { var a = 0, b = 0; for (var t = t0; t < t1; t += 0.001) { a += evalComps(c, t, 'I'); b += evalComps(c, t, 'aVF') / SQ3; } return Math.round(Math.atan2(b, a) / D2R); }
    function measure(S, win, pacer) {
      var ev = S.ev.filter(function (e) { return e.t >= win[0] && e.t <= win[1]; }), hr = null, r = E.rhythm;
      if (ev.length > 1) hr = Math.round((ev.length - 1) * 60 / (ev[ev.length - 1].t - ev[0].t));
      else if (r !== 'vf' && r !== 'asystole') hr = Math.round(60 / Math.max(0.3, ev[0] ? ev[0].rr : 1));
      var cap = pacer && pacer.captured, kind = cap ? 'p' : r === 'vt' ? 'vt' : r === 'tdp' ? 'tdp' : 'n', rr = hr ? 60 / hr : 1, m = morph(kind, rr);
      var oneToOne = sinusLike() && !cap && (E.av === 0 || E.av === 1 || E.av === 'mobitz2' || E.av === '2:1');
      var o = { hr: r === 'vf' ? null : hr, pr: oneToOne ? Math.round(E.pr) : null, qrs: Math.round(m.D * 1000), qt: Math.round(m.qt * 1000) };
      o.qtc = Math.round(o.qt / Math.sqrt(rr));
      o.pAx = sinusLike() ? axisOf(pMorph('a').c, 0, 0.12) : null;
      o.qrsAx = axisOf(m.c.filter(function (c) { return !c.pl && c.t <= m.D; }), 0, m.D);
      o.tAx = axisOf(m.c.filter(function (c) { return !c.pl && c.t > m.D; }), m.D, m.qt + 0.1);
      var pl = m.c.filter(function (c) { return c.pl; }); // automat mierzy ST w J+60 ms; liczymy tylko składową uszkodzenia, bez ramienia T
      o.st = {}; NAMES.forEach(function (n) { o.st[n] = Math.round(evalComps(pl, m.D + 0.06, n) * 100) / 100; });
      if (r === 'vf' || r === 'asystole') { o.qrs = o.qt = o.qtc = o.qrsAx = o.tAx = null; o.st = {}; }
      return o;
    }
    function measureStr(o) {
      function f(v) { return v == null ? '---' : v; }
      return 'HR ' + f(o.hr) + '  PR ' + f(o.pr) + '  QRS ' + f(o.qrs) + '  QT/QTc ' + f(o.qt) + '/' + f(o.qtc) + '  P/QRS/T ' + f(o.pAx) + '/' + f(o.qrsAx) + '/' + f(o.tAx);
    }
    function interpret(o, pacer) {
      var L = [], r = E.rhythm, hr = o.hr, cap = pacer && pacer.captured, ab = false;
      function A(s) { L.push(s); ab = true; }
      if (cap) A('Rytm ze stymulatora – stymulacja komorowa');
      else if (r === 'vf') A('Migotanie komór');
      else if (r === 'asystole') A(E.atrialRate ? 'Zatrzymanie komór – obecne tylko załamki P' : 'Asystolia');
      else if (r === 'vt') A('Częstoskurcz z szerokimi zespołami QRS – VT?');
      else if (r === 'tdp') A('Polimorficzny częstoskurcz komorowy (torsade de pointes?)');
      else if (r === 'af') A('Migotanie przedsionków' + (hr > 110 ? ' z szybką czynnością komór' : hr < 60 ? ' z wolną czynnością komór' : ''));
      else if (r === 'flutter') A('Trzepotanie przedsionków');
      else if (r === 'svt') A('Częstoskurcz nadkomorowy z wąskimi QRS');
      else if (r === 'junctional') A('Rytm węzłowy' + (hr < 60 ? ', bradykardia' : ''));
      else if (E.av === 3) { A('Całkowity blok przedsionkowo-komorowy (blok AV III°)'); A('Rytm zastępczy ' + (o.qrs >= 120 ? 'z szerokimi' : 'z wąskimi') + ' zespołami QRS'); }
      else { var ha = Math.round(aRate()); if (ha < 60) A('Bradykardia zatokowa'); else if (ha > 100) A('Tachykardia zatokowa'); else L.push('Rytm zatokowy'); }
      if (!cap && sinusLike() && E.av === 1) A('Blok przedsionkowo-komorowy I stopnia');
      if (!cap && sinusLike() && E.av === 'wenckebach') A('Blok AV II stopnia typu Mobitz I (Wenckebach)');
      if (!cap && sinusLike() && E.av === 'mobitz2') A('Blok AV II stopnia typu Mobitz II');
      if (!cap && sinusLike() && E.av === '2:1') A('Blok AV II stopnia z przewodzeniem 2:1');
      if (!cap && sinusLike() && E.sa === 2) A('Blok zatokowo-przedsionkowy II stopnia typu II (pauza = 2× PP)');
      if (!cap && sinusLike() && E.sa === 'wenckebach') A('Pauzy poprzedzone skracaniem PP – blok zatokowo-przedsionkowy II stopnia typu I?');
      if (!cap && sinusLike() && E.sa === 'arrest') A('Pauza zatokowa – zahamowanie zatokowe');
      if (!cap && sinusLike() && (E.sinArr || 0) >= 0.08) L.push('Niemiarowość zatokowa');
      if (r === 'vf' || r === 'asystole') { L.push('** Nieprawidłowe EKG **'); L.push('Niepotwierdzone. Wymaga weryfikacji lekarskiej.'); return L; }
      if (!cap && r !== 'vt' && r !== 'tdp') {
        if (E.pac) A('Przedwczesne pobudzenia nadkomorowe'); if (E.pvc) A('Przedwczesne pobudzenia komorowe');
        if (E.wpw) A('Krótki PR, fala delta – preekscytacja (WPW?)');
        if (E.av === 3) { } else if (E.bbb === 'L') A('Blok lewej odnogi pęczka Hisa'); else if (E.bbb === 'R') A('Blok prawej odnogi pęczka Hisa'); else if (E.bbb === 'iR') A('Niepełny blok prawej odnogi pęczka Hisa'); else if (o.qrs >= 120 && E.av !== 3) A('Poszerzone zespoły QRS – nieswoiste zaburzenia przewodzenia');
        if (o.qrsAx != null && E.bbb !== 'L') { if (o.qrsAx < -30) A('Odchylenie osi w lewo'); else if (o.qrsAx > 100) A('Odchylenie osi w prawo'); }
        if (E.lvh) A('Cechy przerostu lewej komory' + (E.lvhStrain !== false ? ' z wtórnymi zmianami ST-T' : ''));
        if (E.rvh) A('Cechy przerostu prawej komory' + (E.rvhStrain !== false ? ' z wtórnymi zmianami ST-T' : ''));
        if (E.pType === 'pulmonale' && sinusLike()) A('Wysokie załamki P – powiększenie prawego przedsionka (P pulmonale)');
        if (E.pType === 'mitrale' && sinusLike()) A('Szerokie, dwugarbne załamki P – powiększenie lewego przedsionka (P mitrale)');
        if (E.qWave && QLEADS[E.qWave]) A('Patologiczne załamki Q: ' + QLEADS[E.qWave] + ' – przebyty zawał?');
        if (E.voltage < 0.5) A('Niski woltaż zespołów QRS');
        if (E.tAmp >= 1.5) A('Wysokie, szpiczaste załamki T');
        if (E.uAmp) A('Widoczne fale U'); if (E.jAmp) A('Fale J (Osborna)'); if (E.s1q3t3) A('Obraz S1Q3T3 – rozważ ostre przeciążenie prawej komory'); if (E.helmet) A('Wysoki punkt J i kopulaste, opadające ST zlane z T – objaw hełmu (spiked helmet)?'); if (E.brugada) A('Uniesienie J/ST typu coved w V1–V2 z ujemnym T – wzorzec Brugadów?');
        if (E.pericarditis || E.stemi === 'pericarditis') A('Rozlane uniesienie ST z obniżeniem PR – rozważ zapalenie osierdzia');
        else if (E.bbb !== 'L') {
          var up = [], dn = [];
          NAMES.forEach(function (n) { var s = o.st[n], th = (n === 'V2' || n === 'V3') ? 0.2 : 0.1; if (s >= th) up.push(n); else if (s <= -0.1) dn.push(n); });
          if (up.length >= 2) { A('Uniesienie ST: ' + up.join(', ')); if (dn.length) A('Obniżenie ST: ' + dn.join(', ')); L.push('*** OSTRY ZAWAŁ SERCA? ***'); }
          else if (dn.length >= 2) A('Obniżenie ST: ' + dn.join(', ') + (o.st.aVR >= 0.1 ? '; uniesienie ST w aVR' : ''));
        }
      }
      if (o.qtc >= 480 && o.qrs < 120 && !cap) A('Wydłużony odstęp QT');
      L.push(ab ? '** Nieprawidłowe EKG **' : 'Prawidłowe EKG');
      L.push('Niepotwierdzone. Wymaga weryfikacji lekarskiej.');
      return L;
    }
    return {
      config: config, scheduler: scheduler, schedule: schedule, trim: trim, lead: lead, leadEvents: leadEvents, rTime: rTime, ventRate: ventRate,
      measure: measure, measureStr: measureStr, interpret: interpret, isLead: function (n) { return !!LEADS[n]; }, cfg: function () { return E; }, morph: morph
    };
  }
const api = { create, NAMES, LEADS };
export { create, NAMES, LEADS };
export default api;
