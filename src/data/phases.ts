export type PhaseKey = 'P' | 'PR' | 'QRS' | 'ST' | 'T' | 'TP' | 'F' | 'blok';

export const FAZA_DOM: Record<'P' | 'PR' | 'QRS' | 'ST' | 'T' | 'TP', string> = {
  P: 'Węzeł zatokowy (SA) wyzwala impuls; fala depolaryzacji rozchodzi się przez prawy, a potem (pęczkiem Bachmanna) lewy przedsionek → załamek P.',
  PR: 'Odcinek PR: impuls przechodzi przez węzeł AV (fizjologiczne opóźnienie), pęczek Hisa i odnogi. Masa tych struktur jest za mała, by dać wychylenie – linia izoelektryczna.',
  QRS: 'Depolaryzacja komór: najpierw przegroda (od lewej do prawej – mały q w I, aVL, V5–V6 i r w V1), potem koniuszek i ściany wolne od wsierdzia do nasierdzia, na końcu podstawa. Lewa komora dominuje masą → wektor w lewo, w dół i do tyłu.',
  ST: 'Odcinek ST = faza plateau potencjału czynnościowego: wszystkie komórki komór są pobudzone, nie ma różnic potencjałów → linia izoelektryczna.',
  T: 'Załamek T: repolaryzacja komór. Biegnie od nasierdzia do wsierdzia (odwrotnie niż depolaryzacja), więc T ma ten sam kierunek co QRS.',
  TP: 'Odcinek TP – spoczynek elektryczny (rozkurcz). Komórki spolaryzowane, linia izoelektryczna = punkt odniesienia do oceny ST.'
};

export const PH_NAME: Record<PhaseKey, string> = {
  P: 'Załamek P',
  PR: 'Odcinek PR',
  QRS: 'Zespół QRS',
  ST: 'Odcinek ST',
  T: 'Załamek T',
  TP: 'Odcinek TP (rozkurcz)',
  F: 'Aktywność przedsionków',
  blok: 'P zablokowany'
};

export const PH_COL: Record<PhaseKey, string> = {
  P: 'var(--P)',
  PR: 'var(--PR)',
  QRS: 'var(--QRS)',
  ST: 'var(--ST)',
  T: 'var(--T)',
  TP: '160,160,160',
  F: 'var(--F)',
  blok: '214,40,40'
};

export const COL = {
  rest: '#efe4da',
  front: '#ffe066',
  dep: '#f25c3b',
  injRest: '#e6cfe0',
  inj: '#9d2a8a',
  weak: '#f6b89c'
};

export const REP = ['#6aaed6', '#86b9d7', '#a3c5d8', '#bfd0d9', '#d8dbd9', '#efe4da'];

export const FAZY: Record<string, string> = {
  P: 'Węzeł zatokowy (SA) wyzwala impuls; fala depolaryzacji rozchodzi się przez prawy, a potem (pęczkiem Bachmanna) lewy przedsionek → załamek P.',
  PR: 'Odcinek PR: impuls przechodzi przez węzeł AV (fizjologiczne opóźnienie), pęczek Hisa i odnogi. Masa tych struktur jest za mała, by dać wychylenie – linia izoelektryczna.',
  QRS: 'Depolaryzacja komór: najpierw przegroda (od lewej do prawej – mały q w I, aVL, V5–V6 i r w V1), potem koniuszek i ściany wolne od wsierdzia do nasierdzia, na końcu podstawa. Lewa komora dominuje masą → wektor w lewo, w dół i do tyłu.',
  ST: 'Odcinek ST = faza plateau potencjału czynnościowego: wszystkie komórki komór są pobudzone, nie ma różnic potencjałów → linia izoelektryczna.',
  T: 'Załamek T: repolaryzacja komór. Biegnie od nasierdzia do wsierdzia (odwrotnie niż depolaryzacja), więc T ma ten sam kierunek co QRS.',
  TP: 'Odcinek TP – spoczynek elektryczny (rozkurcz). Komórki spolaryzowane, linia izoelektryczna = punkt odniesienia do oceny ST.',
  F: 'Fale F: pobudzenie krąży wokół pierścienia zastawki trójdzielnej – przedsionki są pobudzane bez przerwy, więc linia izoelektryczna znika („piła”).',
  blok: 'Ten P nie został przewiedziony do komór.'
};
