import type { GenerateResult } from '../lib/generate';

export const JAK: Record<string, string> = {
  norma: 'Rytm zatokowy 60–100/min, PR 120–200 ms, QRS poniżej 120 ms, bez zmian ST-T.',
  zatokowy: 'Dodatni załamek P przed każdym QRS w II, ujemny w aVR, PR stały.',
  niemiarSin: 'Rytm zatokowy, ale odstępy RR różnią się o ponad 120 ms, zwykle w rytm oddechu.',
  af: 'Brak załamków P, linia izoelektryczna falista, odstępy RR całkowicie nieregularne.',
  flutter: 'Fale F jak zęby piły w II, III i aVF, około 300/min; przy przewodzeniu 2:1 komory biją około 150/min.',
  wezlowy: 'Brak P albo P ujemne tuż przed lub tuż po QRS w II, QRS wąskie, częstość zwykle 40–60/min.',
  svt: 'Miarowy częstoskurcz z wąskimi QRS, zwykle 150–250/min, załamki P niewidoczne albo ukryte w ST.',
  vt: 'Miarowy częstoskurcz z szerokimi QRS (120 ms i więcej), często z dysocjacją przedsionkowo-komorową.',
  tdp: 'Szerokie QRS, których amplituda i kierunek falują wokół linii, na tle wydłużonego QT.',
  vf: 'Chaotyczne fale bez rozpoznawalnych zespołów QRS.',
  asystolia: 'Brak zespołów QRS, linia prawie płaska. Sprawdź w dwóch odprowadzeniach i przy większym wzmocnieniu.',
  bradykardia: 'Częstość komór poniżej 60/min.',
  tachykardia: 'Częstość komór powyżej 100/min.',
  pvc: 'Przedwczesny, szeroki QRS bez załamka P przed nim, zwykle z pełną przerwą wyrównawczą.',
  pac: 'Przedwczesny załamek P o innym kształcie, zwykle z wąskim QRS.',
  sa: 'Nagła pauza bez P i bez QRS. Przy bloku SA pauza trwa wielokrotność odstępu PP.',
  av1: 'PR powyżej 200 ms, stały w każdym cyklu, każde P przewiedzione do komór.',
  wenck: 'PR wydłuża się z cyklu na cykl, aż jedno P zostaje bez QRS, potem cykl rusza od nowa.',
  mob2: 'PR stały, a potem nagle P bez QRS.',
  '21': 'Co drugie P zostaje bez QRS.',
  av3: 'P i QRS biją niezależnie: PP stałe, RR stałe, PR za każdym razem inny.',
  WPW: 'PR krótszy niż 120 ms, fala delta na początku QRS, QRS poszerzony.',
  szerQRS: 'QRS trwa 120 ms albo dłużej.',
  LBBB: 'QRS co najmniej 120 ms, szerokie R z zazębieniem w I, aVL, V5–V6 i głęboki S w V1.',
  RBBB: "QRS co najmniej 120 ms, rSR' w V1–V2 i szeroki S w I oraz V6.",
  iRBBB: "rSR' w V1, ale QRS krótszy niż 120 ms.",
  LAFB: 'Oś poniżej −45°, qR w aVL, rS w II, III i aVF.',
  LPFB: 'Oś powyżej +90°, rS w I i aVL, qR w III, po wykluczeniu przerostu prawej komory.',
  osL: 'QRS dodatni w I i ujemny w II oraz aVF, oś poniżej −30°.',
  osP: 'QRS ujemny w I i dodatni w aVF, oś powyżej +90°.',
  pulm: 'Wysokie, szpiczaste P, co najmniej 2,5 mm w II, III i aVF.',
  mitr: 'Szerokie P (120 ms i więcej) z dwoma garbami w II, w V1 dwufazowe z dużą częścią ujemną.',
  pPlaskie: 'Załamki P ledwo widoczne, mimo że rytm jest nadkomorowy.',
  lvh: 'Wysokie R w lewych odprowadzeniach i głębokie S w prawych: S w V1 + R w V5 lub V6 powyżej 35 mm.',
  rvh: 'Dominujące R w V1, prawogram, głębokie S w V5–V6.',
  niski: 'Amplituda QRS poniżej 5 mm we wszystkich odprowadzeniach kończynowych albo poniżej 10 mm w przedsercowych.',
  alternans: 'Wysokość QRS zmienia się co drugi zespół.',
  q: 'Q szerokie na 40 ms albo głębokie na co najmniej 25% R, w co najmniej dwóch sąsiednich odprowadzeniach.',
  s1q3t3: 'Głęboki S w I, załamek Q i ujemne T w III.',
  fJ: 'Garb na przejściu QRS w ST (w punkcie J), najlepiej widoczny w V3–V6.',
  brugada: 'Łukowate uniesienie ST o co najmniej 2 mm w V1–V2, przechodzące w ujemne T.',
  helmet: 'Uniesienie ST zaczyna się jeszcze przed QRS i układa w kształt hełmu.',
  stUp: 'Punkt J co najmniej 1 mm nad linią izoelektryczną w dwóch sąsiednich odprowadzeniach. W V2–V3 próg to 2 mm u mężczyzn i 1,5 mm u kobiet.',
  stDn: 'ST co najmniej 0,5 mm poniżej linii izoelektrycznej w dwóch sąsiednich odprowadzeniach.',
  perikard: 'Rozlane, wklęsłe uniesienie ST w wielu ścianach naraz i obniżenie PR, bez zmian przeciwstawnych poza aVR.',
  tNeg: 'Ujemne T tam, gdzie QRS jest dodatni. W aVR to norma, w III i V1 bywa normą.',
  szpicz: 'Wąskie, wysokie, symetryczne T z ostrym szczytem, jak namiot.',
  hiper: 'Wysokie T szerokie u podstawy nad ścianą, w której zaczyna się zawał, często zanim uniesie się ST.',
  plaskie: 'Załamki T niskie, ledwo odróżnialne od linii izoelektrycznej.',
  U: 'Mały garb po załamku T, najlepiej widoczny w V2–V3.',
  qtDl: 'QTc powyżej 450 ms u mężczyzn i 460 ms u kobiet. T kończy się dalej niż w połowie odstępu RR.',
};

export function nieTu(id: string, g: GenerateResult): string {
  const K = g.key.klucz;
  const qrs = g.M.qrs;
  const pr = K.pr;
  const hr = K.hr;
  if (['szerQRS', 'LBBB', 'RBBB', 'vt'].includes(id) && qrs != null) return `QRS trwa tu ${qrs} ms, a do tego potrzeba co najmniej 120 ms.`;
  if (id === 'iRBBB' && qrs != null) return `Nie widać rSR' w V1. QRS trwa ${qrs} ms.`;
  if (id === 'av1' && pr != null) return `PR ma tu ${pr} ms, a blok I stopnia zaczyna się powyżej 200 ms.`;
  if (id === 'WPW' && pr != null) return `PR ma tu ${pr} ms i nie ma fali delta na początku QRS.`;
  if (id === 'bradykardia' && hr != null) return `Komory biją ${hr}/min, a bradykardia to mniej niż 60/min.`;
  if (id === 'tachykardia' && hr != null) return `Komory biją ${hr}/min, a tachykardia to więcej niż 100/min.`;
  if (['af', 'flutter', 'wezlowy', 'svt'].includes(id) && K.rytm[0] === 'zatokowy') return 'Przed każdym QRS jest prawidłowy załamek P, a odstępy RR są równe. To rytm zatokowy.';
  if (['wenck', 'mob2', '21', 'av3'].includes(id) && pr != null) return `Każde P przechodzi do komór, a PR jest stały (${pr} ms).`;
  return 'W tym zapisie tego obrazu nie ma. Kryterium: ' + (JAK[id] ?? '');
}
