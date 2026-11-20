export type LeadName = 'I' | 'II' | 'III' | 'aVR' | 'aVL' | 'aVF' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6';

export type Rhythm = 'sinus' | 'af' | 'flutter' | 'junctional' | 'svt' | 'vt' | 'tdp' | 'vf' | 'asystole' | 'pea' | 'off';

export type ComplexKind = 'n' | 'p' | 'v' | 'e' | 'vt' | 'tdp';

export type Vec3 = [number, number, number];

export type AVBlock = 0 | 1 | 2 | 3 | 'wenckebach' | 'mobitz2' | '2:1';

export type BundleBranch = 'L' | 'R' | 'iR';

export type Injury = 'inferior' | 'inferior_rv' | 'inferoposterior' | 'posterior' | 'anterior' | 'anteroseptal'
  | 'anterolateral' | 'lateral' | 'high_lateral' | 'subendocardial' | 'pericarditis';

export interface ECGConfig {
  rhythm?: Rhythm;
  hr?: number;
  pr?: number;
  qrs?: number;
  qtc?: number;
  qt?: number;
  axis?: number;
  pAmp?: number;
  tAmp?: number;
  tAnt?: number;
  voltage?: number;
  stAmp?: number;
  fAmp?: number;
  vfAmp?: number;
  avRatio?: number | null;
  av?: AVBlock;
  atrialRate?: number;
  pType?: 'pulmonale' | 'mitrale';
  bbb?: BundleBranch;
  qrsW?: number;
  wpw?: boolean;
  lvh?: boolean;
  lvhStrain?: boolean;
  rvh?: boolean;
  rvhStrain?: boolean;
  pvc?: number;
  pac?: number;
  sa?: 2 | 'wenckebach' | 'arrest';
  saN?: number;
  saMult?: number;
  sinArr?: number;
  stemi?: Injury;
  hyperacute?: boolean;
  pericarditis?: boolean;
  qWave?: Injury;
  tAxis?: number;
  uAmp?: number;
  jAmp?: number;
  s1q3t3?: boolean | number;
  brugada?: boolean | 1 | 2;
  helmet?: boolean | 'anterior';
  artifact?: number;
  wander?: number;
  emg?: number;
  tremor?: number;
  hum?: number;
  badLead?: LeadName | LeadName[];
  alternans?: number;
  beatVar?: number;
  vtDir?: Vec3;
}

export type ResolvedConfig = ECGConfig & {
  rhythm: Rhythm;
  hr: number;
  pr: number;
  qrs: number;
  qtc: number;
  axis: number;
  pAmp: number;
  tAmp: number;
  tAnt: number;
  voltage: number;
  stAmp: number;
  fAmp: number;
  vfAmp: number;
  av: AVBlock;
  avN: number;
};

export interface Pacer {
  active?: boolean;
  captured?: boolean;
  rate?: number;
}

export interface Ctx {
  t0?: number;
  rand?: () => number;
  pacer?: Pacer;
  artifact?: number;
  clean?: boolean;
  cpr?: boolean;
  cprRate?: number;
}

export interface Ev {
  t: number;
  k: ComplexKind;
  rr?: number;
  ph?: number;
}

export interface Atr {
  t: number;
  k: 'a' | 'pac';
}

export interface SchedulerState {
  nA: number | null;
  nV: number | null;
  nS: number | null;
  ev: Ev[];
  atr: Atr[];
  sp: number[];
  wk: number;
  sa: number;
  lastV: number | null;
}

export type Comp = GaussianComp | PlateauComp;

export interface GaussianComp {
  t: number;
  s: number;
  a: number;
  d: Vec3;
  pl?: undefined;
  [lead: string]: unknown;
}

export interface PlateauComp {
  pl: 1;
  t0: number;
  t1: number;
  r: number;
  f: number;
  a: number;
  d: Vec3;
  [lead: string]: unknown;
}

export interface Morph {
  c: Comp[];
  D: number;
  main: Vec3;
  qt: number;
  tp: number;
  rOff: number;
  P: Record<string, unknown>;
  L: Record<string, unknown>;
}

export interface Measure {
  hr: number | null;
  pr: number | null;
  qrs: number | null;
  qt: number | null;
  qtc: number | null;
  pAx: number | null;
  qrsAx: number | null;
  tAx: number | null;
  st: Record<string, number>;
}

export interface Generator {
  config(e?: ECGConfig | Record<string, unknown>): void;
  scheduler(): SchedulerState;
  schedule(S: SchedulerState, ctx?: Ctx, tEnd?: number): void;
  trim(S: SchedulerState, tMin: number): void;
  lead(name: string, t: number, S: SchedulerState, ctx?: Ctx): number;
  leadEvents(name: string, t: number, S: SchedulerState): number;
  rTime(e: Ev): number;
  ventRate(): number;
  measure(S: SchedulerState, win: [number, number], pacer?: Pacer | null): Measure;
  measureStr(m: Measure): string;
  interpret(m: Measure, pacer?: Pacer | null): string[];
  isLead(n: string): boolean;
  cfg(): ResolvedConfig;
  morph(kind: string, rr?: number): Morph;
}

export declare const NAMES: LeadName[];
export declare const LEADS: Record<LeadName, Vec3>;
export declare function create(): Generator;

declare const api: {
  create: typeof create;
  NAMES: typeof NAMES;
  LEADS: typeof LEADS;
};

export default api;
