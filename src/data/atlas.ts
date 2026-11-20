import type { ECGConfig, LeadName } from '../model/ecg';

export interface HeartFlags {
  avSlow?: boolean;
  block?: 'avn' | 'odnogi';
  escape?: boolean;
  type?: 'lbbb' | 'rbbb' | 'wpw' | 'vt';
  atria?: 'af' | 'flutter';
  stemi?: 'anterior' | 'inferior';
  lvh?: boolean;
  hyperK?: boolean;
  dissoc?: number;
  svt?: 'at' | 'avnrt' | 'avrt';
}

export interface AtlasCase {
  id: string;
  grp: string;
  name: string;
  cfg: ECGConfig;
  heart: HeartFlags;
  strips: LeadName[];
  gain?: number;
  sub: string;
  co: string;
  kryt: string[];
  gdzie: string[];
  gdzieTxt: string;
  fazy?: Partial<Record<'P' | 'PR' | 'QRS' | 'ST' | 'T' | 'TP' | 'F' | 'blok', string>>;
}

export const ZAB: AtlasCase[] = [
  { id: 'sinus', grp: 'Rytm prawidłowy', name: 'Rytm zatokowy prawidłowy',
    cfg: { rhythm: 'sinus', hr: 72 }, heart: {}, strips: ['II', 'V1', 'V6'],
    sub: 'Punkt odniesienia – prawidłowe przewodzenie przez cały układ bodźcoprzewodzący.',
    co: 'Węzeł zatokowy narzuca rytm 60–100/min. Pobudzenie przechodzi kolejno przez przedsionki, węzeł AV (opóźnienie ~0,1 s pozwala przedsionkom dopełnić komory), pęczek Hisa, obie odnogi i włókna Purkinjego, które niemal jednocześnie pobudzają obie komory – stąd wąski QRS.',
    kryt: ['P dodatni w I, II, aVF, ujemny w aVR; P przed każdym QRS, QRS po każdym P', 'PR 120–200 ms, stały', 'QRS < 120 ms (zwykle 80–100 ms)', 'Częstość 60–100/min, odstępy RR równe (niewielka niemiarowość oddechowa jest fizjologiczna)', 'ST izoelektryczny, T zgodny z QRS, QTc < 450 ms (M) / 460 ms (K)'],
    gdzie: ['II', 'V1', 'V6', 'aVR'], gdzieTxt: 'II – najlepiej widoczny P i rytm; V1 – P dwufazowy, zespół rS; V6 – qR (mały q przegrodowy); aVR – wszystko ujemne.' },

  { id: 'av1', grp: 'Bloki przedsionkowo-komorowe', name: 'Blok AV I stopnia',
    cfg: { rhythm: 'sinus', hr: 66, av: 1, pr: 300 }, heart: { avSlow: true }, strips: ['II', 'V1', 'V6'],
    sub: 'Każde pobudzenie przechodzi, ale wolniej – zwykle opóźnienie w węźle AV.',
    co: 'Impuls z przedsionków dociera do komór zawsze, lecz przewodzenie przez węzeł AV jest wydłużone (wagotonia, β-blokery, werapamil, digoksyna, zmiany zwyrodnieniowe, zawał ściany dolnej). Na schemacie fala długo „pełznie” przez węzeł AV.',
    kryt: ['PR > 200 ms, stały w każdym cyklu', 'Każdy P przewiedziony (stosunek P:QRS = 1:1)', 'QRS zwykle wąski (blok na poziomie węzła)', 'Przy bardzo długim PR załamek P może wchodzić w T poprzedniego cyklu'],
    gdzie: ['II', 'V1'], gdzieTxt: 'II i V1 – tu P jest najlepiej widoczny; zmierz PR od początku P do początku QRS.',
    fazy: { PR: 'Odcinek PR wydłużony: impuls długo przechodzi przez węzeł AV (żółta fala w węźle przesuwa się wolno). Pęczek Hisa i odnogi przewodzą już prawidłowo.' } },

  { id: 'wenckebach', grp: 'Bloki przedsionkowo-komorowe', name: 'Blok AV II° Mobitz I (Wenckebach)',
    cfg: { rhythm: 'sinus', av: 'wenckebach', atrialRate: 84, pr: 200 }, heart: { block: 'avn' }, strips: ['II', 'V1', 'V6'],
    sub: 'Węzeł AV „męczy się” z każdym pobudzeniem, aż jedno nie przechodzi (tu 4:3).',
    co: 'Każde kolejne pobudzenie trafia na węzeł AV coraz mniej zregenerowany, więc przewodzi się coraz wolniej (PR rośnie), aż jeden P zostaje zablokowany w węźle. Po przerwie węzeł odpoczywa i cykl zaczyna się od najkrótszego PR. Zwykle poziom węzła AV – rokowanie dobre (wagotonia, sportowcy, leki, zawał dolny).',
    kryt: ['PR stopniowo się wydłuża, aż P nie zostaje przewiedziony (brak QRS po P)', 'Największy przyrost PR w drugim cyklu – dlatego RR się skracają przed pauzą', 'Pauza krótsza niż 2× PP; pierwszy PR po pauzie najkrótszy', 'Odstępy PP stałe; QRS zwykle wąski', 'Grupowanie pobudzeń (np. 4:3, 3:2)'],
    gdzie: ['II', 'V1'], gdzieTxt: 'II, V1 – porównuj kolejne PR; szukaj P bez QRS.',
    fazy: { PR: 'Przewodzenie przez węzeł AV – z każdym cyklem wolniejsze (PR rośnie: 200 → 300 → 350 ms). Zwróć uwagę, jak żółta fala coraz dłużej stoi w węźle.', blok: 'Ten P nie przeszedł: impuls utknął w węźle AV (czerwony krzyżyk). Brak QRS – pauza. Węzeł odpoczywa, następny PR będzie najkrótszy.' } },

  { id: 'mobitz2', grp: 'Bloki przedsionkowo-komorowe', name: 'Blok AV II° Mobitz II',
    cfg: { rhythm: 'sinus', av: 'mobitz2', avRatio: 4, atrialRate: 80, pr: 180, bbb: 'R' }, heart: { type: 'rbbb', block: 'odnogi' }, strips: ['II', 'V1', 'V6'],
    sub: 'Stały PR i nagle wypada QRS – blok poniżej węzła AV (pęczek Hisa / odnogi).',
    co: 'Uszkodzenie leży w układzie Hisa–Purkinjego, nie w węźle AV. Węzeł przewodzi normalnie (PR stały), ale chora dystalna część przewodzi „wszystko albo nic”. Tu prawa odnoga jest trwale zablokowana (RBBB), a lewa przewodzi przerywanie – gdy i ona zawiedzie, P nie daje QRS. Wysokie ryzyko nagłej progresji do bloku III° i asystolii – wskazanie do stymulacji.',
    kryt: ['PR stały (prawidłowy lub wydłużony) w przewiedzionych pobudzeniach', 'Nagle P bez QRS – bez wcześniejszego wydłużania PR', 'PR po pauzie taki sam jak przed nią; PP stałe', 'Często szeroki QRS (współistniejący blok odnogi – tu RBBB)', 'Uwaga: blok 2:1 nie pozwala odróżnić Mobitz I od II'],
    gdzie: ['II', 'V1', 'V6'], gdzieTxt: "II – stały PR i wypadnięcia; V1 – rSR' (RBBB) świadczy o chorobie odnóg; V6 – szerokie S.",
    fazy: { PR: 'Węzeł AV i pęczek Hisa przewodzą prawidłowo – PR jest stały (180 ms). Prawa odnoga zablokowana na stałe.', QRS: 'Pobudzenie schodzi tylko lewą odnogą (prawa zablokowana) – prawa komora pobudzana z opóźnieniem przez mięsień → morfologia RBBB.', blok: 'P przeszedł przez węzeł AV i pęczek Hisa, ale lewa odnoga tym razem nie przewiodła (prawa jest zablokowana na stałe) → brak QRS, bez wcześniejszego ostrzeżenia w PR.' } },

  { id: 'av3', grp: 'Bloki przedsionkowo-komorowe', name: 'Blok AV III stopnia (całkowity)',
    cfg: { rhythm: 'sinus', av: 3, atrialRate: 80, hr: 42, qrs: 100 }, heart: { block: 'avn', escape: true }, strips: ['II', 'V1', 'V6'],
    sub: 'Przedsionki i komory pracują niezależnie – rozkojarzenie przedsionkowo-komorowe.',
    co: 'Żadne pobudzenie z przedsionków nie dociera do komór. Przedsionki bije węzeł zatokowy (~80/min), komory – ośrodek zastępczy. Tu jest to łącze AV / pęczek Hisa (rytm zastępczy węzłowy ~40–60/min, wąski QRS). Przy bloku niżej rytm zastępczy jest komorowy: 20–40/min i szeroki QRS – znacznie gorsze rokowanie.',
    kryt: ['Brak związku P–QRS: PR losowo zmienne, P „wędrują” przez QRS i T', 'PP stałe i RR stałe, częstość przedsionków > częstość komór', 'QRS wąski (rytm z łącza, 40–60/min) lub szeroki (komorowy, 20–40/min)', 'Objawy: bradykardia, hipotonia, zasłabnięcia (MAS) – atropina często nieskuteczna przy bloku poniżej węzła, przygotuj stymulację'],
    gdzie: ['II', 'V1'], gdzieTxt: 'II i V1 – zaznacz wszystkie P cyrklem: idą równo, niezależnie od QRS.',
    fazy: { QRS: 'Pobudzenie komór pochodzi z ośrodka zastępczego w łączu AV / pęczku Hisa (zielony pierścień) – dalej odnogami jak zwykle, więc QRS jest wąski. Z przedsionkami nie ma to żadnego związku.', blok: 'P nie przechodzi przez węzeł AV – całkowity blok (czerwony krzyżyk). Przedsionki i komory pracują każde w swoim rytmie.', PR: 'To nie jest prawdziwy odstęp PR – po P nic nie przechodzi, zbieżność P i QRS jest przypadkowa.' } },

  { id: 'lbbb', grp: 'Bloki odnóg i preekscytacja', name: 'Blok lewej odnogi (LBBB)',
    cfg: { rhythm: 'sinus', hr: 70, bbb: 'L', qrs: 150, axis: -10 }, heart: { type: 'lbbb' }, strips: ['V1', 'V6', 'I'],
    sub: 'Lewa komora pobudzana okrężną drogą – przez prawą odnogę i mięsień przegrody.',
    co: 'Lewa odnoga nie przewodzi. Pobudzenie schodzi prawą odnogą do prawej komory, przegroda depolaryzuje się od prawej do lewej (odwrotnie niż zwykle – dlatego znika q w I, V5–V6), a lewa komora pobudzana jest wolno, od komórki do komórki przez mięsień roboczy, bez pomocy włókien Purkinjego. Pobudzenie trwa dłużej (QRS ≥ 120 ms), a repolaryzacja idzie w tej samej, nieprawidłowej kolejności → wtórne zmiany ST-T. Nowy LBBB z bólem w klatce – traktuj jak równoważnik STEMI (kryteria Sgarbossy).',
    kryt: ['QRS ≥ 120 ms', 'I, aVL, V5–V6: szerokie, zazębione („M”/plateau) R, brak załamka q', 'V1(–V3): QS lub rS z głębokim, szerokim S', 'Czas do szczytu R w V5–V6 > 60 ms', 'ST-T niezgodne (przeciwne do głównego wychylenia QRS) – to zmiany wtórne, nie niedokrwienie', 'Często oś w lewo'],
    gdzie: ['V1', 'V6', 'I', 'aVL', 'V5'], gdzieTxt: 'V1 – głęboki S/QS; V6, I, aVL – szerokie zazębione R bez q; ST-T przeciwne do QRS.',
    fazy: { QRS: 'Lewa odnoga zablokowana (czerwona belka). Pobudzenie schodzi prawą odnogą, przegroda depolaryzuje się od PRAWEJ do LEWEJ, potem fala wolno – przez mięsień, bez Purkinjego – obchodzi lewą komorę. Dlatego QRS trwa ≥120 ms, a w V6 jest szerokie, zazębione R bez q.', T: 'Repolaryzacja biegnie w tej samej kolejności co wolna depolaryzacja (najpierw prawa komora, na końcu ściana boczna LK) → T przeciwne do QRS: ujemne w V5–V6, I, aVL; dodatnie w V1.', ST: 'ST odsunięty przeciwnie do QRS (obniżony w V5–V6, uniesiony w V1–V3) – zmiana wtórna do zaburzonej depolaryzacji.' } },

  { id: 'rbbb', grp: 'Bloki odnóg i preekscytacja', name: 'Blok prawej odnogi (RBBB)',
    cfg: { rhythm: 'sinus', hr: 72, bbb: 'R' }, heart: { type: 'rbbb' }, strips: ['V1', 'V6', 'I'],
    sub: 'Lewa komora pobudzona normalnie, prawa – na końcu, przez mięsień.',
    co: 'Prawa odnoga nie przewodzi. Przegroda (od lewej do prawej) i lewa komora depolaryzują się prawidłowo – początek QRS wygląda zwyczajnie. Prawa komora pobudzana jest z opóźnieniem przez mięsień przegrody, więc na końcu QRS pojawia się dodatkowy wektor skierowany w prawo i do przodu: R\' w V1 i szerokie S w I, V6. Może występować u zdrowych; nowy RBBB – pomyśl o zatorowości płucnej, zawale, przeciążeniu PK.',
    kryt: ['QRS ≥ 120 ms (niepełny RBBB: 110–119 ms)', 'V1–V2: rsR\' („M”, „uszy królika”), R\' późne i wyższe od r', 'I, aVL, V5–V6: szeroki, ociężały załamek S (> 40 ms)', 'Wtórne obniżenie ST i ujemny T w V1–V3', 'Oś zwykle prawidłowa (z blokiem przedniej wiązki – w lewo: blok dwuwiązkowy)'],
    gdzie: ['V1', 'V6', 'I', 'V2'], gdzieTxt: "V1–V2 – rsR'; V6 i I – szerokie S; ujemne T w V1–V3.",
    fazy: { QRS: 'Prawa odnoga zablokowana (czerwona belka). Lewa odnoga pobudza przegrodę i lewą komorę normalnie (początek QRS prawidłowy). Prawa komora pobudzana na końcu, wolno przez mięsień → późny wektor w prawo i do przodu = R\' w V1, szerokie S w I i V6.', T: 'Prawa komora repolaryzuje się później → T ujemny w V1–V3 (zmiana wtórna).' } },

  { id: 'wpw', grp: 'Bloki odnóg i preekscytacja', name: 'Zespół WPW (preekscytacja)',
    cfg: { rhythm: 'sinus', hr: 72, wpw: true }, heart: { type: 'wpw' }, strips: ['II', 'V1', 'V6'],
    sub: 'Dodatkowa droga (pęczek Kenta) omija węzeł AV i pobudza fragment komory za wcześnie.',
    co: 'Między przedsionkiem a komorą istnieje dodatkowa droga przewodzenia (tu po prawej stronie – typ B), która nie ma opóźnienia węzła AV. Pobudzenie dociera nią do komory wcześniej i zaczyna ją wolno depolaryzować przez mięsień (fala delta), zanim dotrze impuls drogą prawidłową. QRS jest zlaniem obu frontów. Ryzyko: częstoskurcz AVRT oraz AF z szybkim przewodzeniem drogą dodatkową → VF. W preekscytowanym AF NIE podawaj leków blokujących węzeł AV (adenozyna, werapamil, β-bloker, digoksyna).',
    kryt: ['PR < 120 ms', 'Fala delta – łagodnie narastający początek QRS', 'QRS poszerzony (≥ 110–120 ms) przez falę delta', 'Wtórne zmiany ST-T przeciwne do delty', 'Typ A: dodatnia delta/QRS w V1 (droga lewostronna); typ B: ujemna w V1 (droga prawostronna) – tu typ B'],
    gdzie: ['II', 'V1', 'V6', 'I'], gdzieTxt: 'II, I, V6 – krótki PR i fala delta; V1 – kierunek delty wskazuje stronę drogi dodatkowej.',
    fazy: { PR: 'Krótki PR: impuls biegnie pęczkiem Kenta (fioletowa droga po lewej stronie schematu) bez opóźnienia węzłowego. Równolegle idzie wolniej przez węzeł AV.', QRS: 'Najpierw fragment prawej komory przy pęczku Kenta pobudza się wolno przez mięsień (fala delta), potem dołącza droga prawidłowa (Hisa i odnogi) – QRS to zlanie obu frontów, dlatego jest szeroki z łagodnym początkiem.' } },

  { id: 'stach', grp: 'Tachyarytmie', name: 'Tachykardia zatokowa',
    cfg: { rhythm: 'sinus', hr: 135 }, heart: {}, strips: ['II', 'V1', 'aVR'],
    sub: 'Węzeł zatokowy przyspiesza – odpowiedź na gorączkę, ból, hipowolemię, hipoksję, lęk lub wysiłek.',
    co: 'Rytm nadal jest zatokowy: pobudzenie startuje w węźle SA, przechodzi przez przedsionki, węzeł AV i układ Hisa–Purkinjego jak w rytmie prawidłowym – zmienia się tylko częstość. Tachykardia zatokowa to zwykle objaw, nie choroba: szukaj przyczyny (hipowolemia, krwawienie, gorączka, ból, hipoksja, zatorowość płucna, tyreotoksykoza, leki, odstawienie alkoholu). Narasta i zwalnia stopniowo, nie urywa się nagle jak napad AVNRT. Przy dużej częstości P zbliża się do T poprzedniej ewolucji i może się z nim zlewać.',
    kryt: ['P zatokowy: dodatni w I, II, aVF, ujemny w aVR; P przed każdym QRS', 'Częstość > 100/min (zwykle do ~150/min w spoczynku, maks. ok. 220 − wiek)', 'PR prawidłowy i stały, QRS wąski', 'Stopniowy początek i koniec (brak nagłego „włączenia” i „wyłączenia”)', 'Przy dużej częstości P może nachodzić na T poprzedniej ewolucji'],
    gdzie: ['II', 'aVR', 'V1'], gdzieTxt: 'II – dodatni P przed każdym QRS; aVR – P ujemny (zatokowy); szukaj P na ramieniu zstępującym T.',
    fazy: { P: 'Węzeł zatokowy wyładowuje się szybciej (np. pod wpływem katecholamin) – kolejność pobudzenia przedsionków jest prawidłowa, P ma zwykły kształt.', TP: 'Rozkurcz skraca się najbardziej – przy dużej częstości odcinek TP prawie znika.' } },

  { id: 'at', grp: 'Tachyarytmie', name: 'Częstoskurcz przedsionkowy (ogniskowy)',
    cfg: { rhythm: 'sinus', hr: 165, pr: 150, pAmp: 1.8 }, heart: { svt: 'at' }, strips: ['II', 'aVF', 'V1'],
    sub: 'Ognisko poza węzłem zatokowym (tu: dolno-boczna część prawego przedsionka) narzuca szybki rytm.',
    co: 'Ektopowe ognisko w przedsionku wyładowuje się szybciej niż węzeł zatokowy (zwiększony automatyzm, aktywność wyzwalana lub mikro-reentry). Pobudzenie rozchodzi się od ogniska, więc P ma inny kształt niż zatokowy – przy ognisku nisko w przedsionku przedsionki pobudzane są od dołu do góry i P jest ujemny w II, III, aVF. Węzeł AV jest tylko przekaźnikiem, nie częścią mechanizmu: adenozyna zwykle nie przerywa częstoskurczu, ale może przejściowo zablokować AV i odsłonić P. Typowy w zatruciu digoksyną (wtedy często z blokiem AV).',
    kryt: ['Miarowy częstoskurcz 100–250/min z wąskim QRS', 'P przed każdym QRS, ale o innej morfologii niż zatokowy (tu ujemny w II, III, aVF)', 'Odstęp RP długi (RP > PR) – P bliżej następnego QRS', 'Linia izoelektryczna między załamkami P (odróżnia od trzepotania)', 'Blok AV 2:1 nie przerywa częstoskurczu (P bez QRS)'],
    gdzie: ['II', 'aVF', 'III', 'V1'], gdzieTxt: 'II, III, aVF – ujemne P przed QRS; V1 – kształt P; między P widoczna linia izoelektryczna.',
    fazy: { P: 'Pobudzenie startuje z ogniska w dolnej części prawego przedsionka (zielony pierścień), nie z węzła zatokowego – przedsionki pobudzane są od dołu do góry, stąd P ujemny w II, III, aVF.', PR: 'Węzeł AV przewodzi normalnie – PR prawidłowy, QRS wąski.' } },

  { id: 'avnrt', grp: 'Tachyarytmie', name: 'Częstoskurcz z nawrotem w węźle AV (AVNRT)',
    cfg: { rhythm: 'svt', hr: 180, pAmp: 1.8 }, heart: { svt: 'avnrt' }, strips: ['V1', 'II', 'aVR'],
    sub: 'Pętla nawrotna w obrębie węzła AV (droga wolna i szybka) – najczęstszy napadowy częstoskurcz nadkomorowy.',
    co: 'Węzeł AV ma dwie drogi: wolną (krótki okres refrakcji) i szybką (długi okres refrakcji). Przedwczesne pobudzenie trafia na niepobudliwą jeszcze drogę szybką, schodzi drogą wolną i wraca drogą szybką – powstaje pętla krążąca w węźle 150–250/min. Z każdym obiegiem pobudzenie biegnie jednocześnie w dół do komór (wąski QRS) i wstecznie do przedsionków, więc P wsteczny wypada prawie równocześnie z QRS: jest niewidoczny albo tworzy pseudo-r′ w V1 i pseudo-S w II, III, aVF. Napad zaczyna się i kończy nagle; często przerywa go manewr Valsalvy lub adenozyna.',
    kryt: ['Miarowy częstoskurcz z wąskim QRS, zwykle 150–250/min', 'Brak widocznych P przed QRS – P wsteczny ukryty w QRS lub tuż za nim', 'Pseudo-r′ w V1, pseudo-S w II, III, aVF (RP < 70 ms)', 'Nagły początek i koniec napadu', 'Obniżenie ST w czasie napadu nie musi oznaczać niedokrwienia'],
    gdzie: ['V1', 'II', 'III', 'aVF'], gdzieTxt: 'V1 – pseudo-r′ na końcu QRS; II, III, aVF – pseudo-S; porównaj z zapisem po umiarowieniu.',
    fazy: { QRS: 'Pobudzenie z pętli w węźle AV (pomarańczowy pierścień) schodzi do komór przez pęczek Hisa i odnogi – QRS wąski. Równocześnie biegnie wstecznie do przedsionków.', ST: 'P wsteczny kończy się tuż za QRS (pseudo-r′ w V1) – przedsionki pobudzane od węzła AV w górę, prawie razem z komorami.' } },

  { id: 'avrt', grp: 'Tachyarytmie', name: 'Częstoskurcz przedsionkowo-komorowy ortodromowy (AVRT)',
    cfg: { rhythm: 'svt', hr: 195, pAmp: 2.2 }, heart: { svt: 'avrt' }, strips: ['II', 'aVF', 'V1'],
    sub: 'Duża pętla z udziałem drogi dodatkowej: w dół przez węzeł AV, wstecznie przez pęczek Kenta.',
    co: 'Pętla nawrotna obejmuje przedsionki, węzeł AV, układ Hisa–Purkinjego, komory i drogę dodatkową (pęczek Kenta), którą pobudzenie wraca do przedsionków. W typie ortodromowym (ok. 90% AVRT) komory pobudzane są prawidłową drogą – QRS wąski, bez fali delta w czasie napadu. Pobudzenie musi przejść przez komory, zanim wróci do przedsionków, dlatego P wsteczny leży wyraźnie za QRS (RP ≥ 70 ms), zwykle w odcinku ST. Droga dodatkowa może być ukryta (przewodzi tylko wstecznie) – wtedy w rytmie zatokowym EKG jest prawidłowe. Rzadszy typ antydromowy (w dół przez Kenta) daje szeroki QRS i łatwo pomylić go z VT.',
    kryt: ['Miarowy częstoskurcz z wąskim QRS, często > 180/min', 'P wsteczny wyraźnie po QRS, w odcinku ST (RP ≥ 70 ms, RP < PR)', 'P ujemny w II, III, aVF (wsteczna aktywacja przedsionków)', 'Możliwa naprzemienność elektryczna QRS i obniżenie ST', 'Po umiarowieniu może być widoczna preekscytacja (WPW) albo nie (droga ukryta)'],
    gdzie: ['II', 'aVF', 'III', 'V1'], gdzieTxt: 'II, III, aVF – ujemny P w odcinku ST, oddzielony od QRS; V1 – P wsteczny po QRS.',
    fazy: { QRS: 'Komory pobudzone prawidłową drogą (węzeł AV → His → odnogi) – QRS wąski, bez fali delta.', ST: 'Pobudzenie wraca z komór do przedsionków pęczkiem Kenta (fiolet) – przedsionki pobudzane wstecznie, P ujemny w II, III, aVF leży w odcinku ST.' } },

  { id: 'af', grp: 'Tachyarytmie', name: 'Migotanie przedsionków (AF)',
    cfg: { rhythm: 'af', hr: 105 }, heart: { atria: 'af' }, strips: ['II', 'V1', 'V6'],
    sub: 'Chaotyczna aktywność przedsionków, węzeł AV przepuszcza losowo część pobudzeń.',
    co: 'W przedsionkach krąży wiele chaotycznych fal (350–600/min, często z ognisk w żyłach płucnych). Przedsionki nie kurczą się skutecznie (ryzyko skrzepliny w uszku LP i udaru). Węzeł AV jest „bombardowany” i przewodzi tylko część pobudzeń, nieregularnie – stąd niemiarowość zupełna. QRS wąski, bo przewodzenie poniżej węzła jest prawidłowe.',
    kryt: ['Brak załamków P – drobne, nieregularne fale f (najlepiej w V1, II)', 'Odstępy RR zupełnie niemiarowe („nieregularnie nieregularne”)', 'QRS zwykle wąski', 'Częstość komór zależy od węzła AV: >110/min – szybka odpowiedź komór', 'Linia izoelektryczna nieobecna lub falista'],
    gdzie: ['V1', 'II'], gdzieTxt: 'V1 – fale f najwyraźniejsze; II – brak P, niemiarowe RR.',
    fazy: { F: 'Fale f: w przedsionkach krąży wiele chaotycznych frontów – żaden nie obejmuje całych przedsionków, więc zamiast P są drobne, nieregularne fale f.', PR: 'Jedno z wielu pobudzeń przedsionkowych przeszło przez węzeł AV – nieprzewidywalnie, stąd nieregularne RR.' } },

  { id: 'afl', grp: 'Tachyarytmie', name: 'Trzepotanie przedsionków (AFL 2:1)',
    cfg: { rhythm: 'flutter', atrialRate: 300, hr: 150 }, heart: { atria: 'flutter' }, strips: ['II', 'V1', 'aVF'],
    sub: 'Jedna duża fala krąży w prawym przedsionku ~300/min (makro-reentry).',
    co: 'Typowe trzepotanie: fala pobudzenia krąży wokół zastawki trójdzielnej w prawym przedsionku (w górę przegrody, w dół ściany bocznej, przez cieśnię trójdzielno-żylną) ok. 300 razy na minutę. Lewy przedsionek pobudza się biernie. Węzeł AV zwykle przepuszcza co drugie pobudzenie (blok czynnościowy 2:1) → komory ~150/min. Miarowy częstoskurcz z wąskim QRS ~150/min – zawsze pomyśl o trzepotaniu.',
    kryt: ['Brak P – fale F „zęby piły” ~250–350/min, bez linii izoelektrycznej', 'Typowe: F ujemne w II, III, aVF; dodatnie w V1', 'Przewodzenie zwykle 2:1 (komory ~150/min), też 3:1, 4:1 lub zmienne', 'QRS wąski; co druga fala F często ukryta w QRS lub T'],
    gdzie: ['II', 'aVF', 'III', 'V1'], gdzieTxt: 'II, III, aVF – zęby piły; V1 – dodatnie F; szukaj drugiej fali F ukrytej w ST/T.',
    fazy: { F: 'Fala F: pobudzenie krąży wokół pierścienia zastawki trójdzielnej (strzałka) – przedsionki są pobudzane bez przerwy, więc linia izoelektryczna znika („piła”).', PR: 'Co druga fala F przechodzi przez węzeł AV (blok czynnościowy 2:1) – chroni komory przed częstością 300/min.' } },

  { id: 'vt', grp: 'Tachyarytmie', name: 'Częstoskurcz komorowy (VT)',
    cfg: { rhythm: 'vt', hr: 170, qrs: 170 }, heart: { type: 'vt', dissoc: 76 }, strips: ['II', 'V1', 'V6'],
    sub: 'Ognisko w mięśniu komory – pobudzenie omija układ Hisa–Purkinjego.',
    co: 'Pobudzenia powstają w mięśniu komory (najczęściej reentry wokół blizny pozawałowej – tu dolna ściana lewej komory). Fala szerzy się wolno od komórki do komórki, nie korzystając z szybkich włókien Purkinjego – QRS jest bardzo szeroki i dziwaczny. Przedsionki zwykle dalej bije węzeł zatokowy, niezależnie (rozkojarzenie AV) – P „wędrują” przez zespoły. Szeroki miarowy częstoskurcz traktuj jak VT, dopóki nie udowodnisz inaczej: niestabilny → kardiowersja, bez tętna → algorytm NZK.',
    kryt: ['Miarowy, szeroki QRS (≥ 120 ms, często > 140 ms), 100–250/min', 'Rozkojarzenie AV: niezależne P (gdy widoczne – rozstrzyga o VT)', 'Pobudzenia przewiedzione (capture) i zsumowane (fusion)', 'Oś skrajna (−90° do ±180°), zgodność QRS w V1–V6', 'Morfologia niepasująca do typowego LBBB/RBBB; ST-T przeciwne do QRS'],
    gdzie: ['II', 'V1', 'V6', 'aVR'], gdzieTxt: 'II i V1 – szukaj P rozkojarzonych z QRS; V1/V6 – morfologia; aVR – dominujący R przemawia za VT.',
    fazy: { QRS: 'Pobudzenie startuje z ogniska w ścianie dolnej lewej komory (pierścień) i rozchodzi się wolno przez mięsień, bez układu bodźcoprzewodzącego – stąd QRS ~170 ms i dziwaczny kształt (tu oś w lewo-w górę, w V1 dominujący R = pochodzenie z LK).', P: 'Węzeł zatokowy dalej pobudza przedsionki (~76/min), niezależnie od komór – to rozkojarzenie AV. P chowa się w szerokich QRS i T.', T: 'Repolaryzacja w kolejności nieprawidłowej depolaryzacji → T przeciwny do QRS.' } },

  { id: 'stemi-ant', grp: 'Niedokrwienie', name: 'STEMI ściany przedniej',
    cfg: { rhythm: 'sinus', hr: 88, stemi: 'anterior', stAmp: 0.3 }, heart: { stemi: 'anterior' }, strips: ['V2', 'V3', 'II'],
    sub: 'Zamknięcie LAD – transmuralne niedokrwienie przegrody, ściany przedniej i koniuszka.',
    co: 'Niedokrwione komórki mają obniżony potencjał spoczynkowy i krótszy, słabszy potencjał czynnościowy. W fazie plateau (ST) między strefą uszkodzenia a zdrowym mięśniem płynie prąd uszkodzenia – wektor ST skierowany ku strefie uszkodzenia, czyli do przodu. Odprowadzenia nad ścianą przednią (V1–V4) widzą uniesienie ST, przeciwległe (II, III, aVF) – obniżenie (zmiany przeciwstawne). Wczesno: hiperostre T; później załamki Q.',
    kryt: ['Nowe uniesienie ST w punkcie J w ≥ 2 sąsiednich odprowadzeniach', 'V2–V3: ≥ 2 mm u mężczyzn ≥ 40 r.ż., ≥ 2,5 mm < 40 r.ż., ≥ 1,5 mm u kobiet; pozostałe ≥ 1 mm', 'Tu: V1–V4 (zajęcie V5–V6, I, aVL = rozległy przednio-boczny)', 'Zmiany przeciwstawne: obniżenie ST w II, III, aVF', 'Hiperostre T, potem Q i ujemne T'],
    gdzie: ['V2', 'V3', 'V4', 'V1', 'III', 'aVF'], gdzieTxt: 'V1–V4 – uniesienie ST (wypukłe/proste); III, aVF – obniżenie przeciwstawne.',
    fazy: { ST: 'Plateau: zdrowe komórki są w pełni pobudzone, a strefa niedokrwienia (fiolet) ma inny potencjał – płynie prąd uszkodzenia skierowany ku ścianie przedniej (strzałka) → uniesienie ST w V1–V4, obniżenie w II, III, aVF.', QRS: 'Depolaryzacja przebiega prawie normalnie – w ostrej fazie QRS jeszcze bez Q.', T: 'T zlewa się z uniesionym ST (kopuła); repolaryzacja strefy uszkodzenia jest zaburzona.' } },

  { id: 'stemi-inf', grp: 'Niedokrwienie', name: 'STEMI ściany dolnej',
    cfg: { rhythm: 'sinus', hr: 64, stemi: 'inferior', stAmp: 0.25 }, heart: { stemi: 'inferior' }, strips: ['III', 'aVL', 'II'],
    sub: 'Zwykle zamknięcie RCA – niedokrwienie przeponowej ściany komór.',
    co: 'Wektor prądu uszkodzenia kieruje się w dół, ku ścianie przeponowej → uniesienie ST w II, III, aVF i obniżenie w aVL (a często I) – zmiany przeciwstawne są bardzo czułe. RCA zaopatruje też węzeł AV i zatokowy oraz prawą komorę: szukaj bradykardii, bloków AV, uniesienia ST w V4R (zawał PK – ostrożnie z nitratami) i obniżenia ST w V1–V3 (zajęcie ściany tylnej → V7–V9).',
    kryt: ['Uniesienie ST ≥ 1 mm w II, III, aVF', 'ST w III > II sugeruje RCA (wektor w prawo)', 'Obniżenie ST w aVL (zmiana przeciwstawna)', 'Dodatkowo: V4R (PK), V7–V9 (ściana tylna)', 'Częste: bradykardia zatokowa, blok AV I–III°'],
    gdzie: ['III', 'aVF', 'II', 'aVL', 'I'], gdzieTxt: 'II, III, aVF – uniesienie ST; aVL – obniżenie (lustrzane).',
    fazy: { ST: 'Plateau: prąd uszkodzenia płynie ku ścianie dolnej (strzałka w dół) → uniesienie ST w II, III, aVF, obniżenie w aVL i I.' } },

  { id: 'lvh', grp: 'Inne', name: 'Przerost lewej komory (LVH)',
    cfg: { rhythm: 'sinus', hr: 68, lvh: true }, heart: { lvh: true }, strips: ['V1', 'V5', 'aVL'], gain: 5,
    sub: 'Większa masa lewej komory = większy wektor i dłuższa, zaburzona repolaryzacja.',
    co: 'Pogrubiała ściana lewej komory (nadciśnienie, stenoza aortalna, kardiomiopatia) generuje większe napięcia – wysokie R w odprowadzeniach lewokomorowych i głębokie S w prawokomorowych. Aktywacja grubej ściany trwa dłużej, a niedokrwienie podwsierdziowe przerośniętego mięśnia odwraca kolejność repolaryzacji → obniżenie ST i asymetryczne ujemne T w V5–V6 („strain”). Wysoki woltaż u szczupłych młodych osób może być prawidłowy.',
    kryt: ['Sokolow-Lyon: S w V1 + R w V5 lub V6 ≥ 35 mm', 'Cornell: R aVL + S V3 > 28 mm (M) / > 20 mm (K); R w aVL ≥ 11 mm', 'Wzorzec „strain”: obniżenie ST i asymetrycznie ujemny T w V5–V6, I, aVL', 'Często: oś w lewo, P mitrale, QRS na granicy normy', 'Uwaga na cechę – przy wysokim woltażu użyj 5 mm/mV i to zaznacz'],
    gdzie: ['V1', 'V5', 'V6', 'aVL', 'V2'], gdzieTxt: 'V1–V2 – głęboki S; V5–V6 – wysokie R z „strain”; aVL – wysokie R (Cornell). Tu cecha 5 mm/mV!',
    fazy: { QRS: 'Gruba ściana lewej komory: więcej komórek pobudza się naraz → duży wektor w lewo i do tyłu (wysokie R w V5–V6, głębokie S w V1). Aktywacja przez grubą ścianę trwa nieco dłużej.', T: 'Przerośnięty mięsień jest niedokrwiony podwsierdziowo, repolaryzacja zachodzi w kolejności depolaryzacji → ST obniżony i T ujemny, asymetryczny w V5–V6 („strain”).' } },

  { id: 'hiperk', grp: 'Inne', name: 'Hiperkaliemia (ciężka)',
    cfg: { rhythm: 'sinus', hr: 58, pAmp: 0.35, tAmp: 2, qrs: 130, pr: 220 }, heart: { hyperK: true }, strips: ['V3', 'II', 'V1'],
    sub: 'Nadmiar K⁺ spłaszcza potencjał spoczynkowy: wolne przewodzenie i szybka repolaryzacja.',
    co: 'Wysokie stężenie potasu częściowo depolaryzuje komórki w spoczynku, przez co część kanałów sodowych jest nieaktywna – pobudzenie przewodzi się wolniej (dłuższy PR, szerszy QRS), a mięśniówka przedsionków, najwrażliwsza, prawie przestaje dawać P. Jednocześnie zwiększa się prąd potasowy repolaryzacji – repolaryzacja jest szybka i zsynchronizowana → wysokie, wąskie, „namiotowe” T. Kolejne stadia: sinusoida → VF/asystolia. Leczenie: sole wapnia (stabilizacja błony), insulina z glukozą, salbutamol, ew. wodorowęglan i dializa.',
    kryt: ['K⁺ > 5,5: wysokie, szpiczaste, wąskie u podstawy T (V2–V4, II, III)', 'K⁺ > 6,5: wydłużony PR, spłaszczony/zanikający P', 'K⁺ > 7: poszerzony QRS, bradykardia, bloki', 'K⁺ > 8–9: sinusoida (QRS zlewa się z T) → VF/asystolia', 'Brak korelacji EKG–stężenie u części chorych – nie czekaj na zmiany'],
    gdzie: ['V3', 'V2', 'II', 'V1'], gdzieTxt: 'V2–V4 – „namiotowe” T; II – płaski P, długi PR; szeroki QRS we wszystkich.',
    fazy: { P: 'Przedsionki są najbardziej wrażliwe na K⁺ – depolaryzują się słabo i wolno (blady kolor) → niski, szeroki P, aż do zaniku.', QRS: 'Kanały Na⁺ częściowo nieaktywne – fala w komorach i w układzie przewodzącym idzie wolniej → poszerzony QRS (130 ms).', T: 'Przyspieszony prąd potasowy: wszystkie komórki repolaryzują się szybko i prawie naraz → wysoki, wąski, symetryczny T („namiot”).' } }
];
