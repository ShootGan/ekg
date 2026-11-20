# EKG — atlas i trener

Nauka **opisu 12-odprowadzeniowego EKG** na modelu wektorowym serca. Aplikacja ma dwie części: **atlas** wzorców zapisu (co widać, dlaczego tak wygląda, co to znaczy dla pacjenta) i **trener**, który losuje przypadek, prowadzi przez opis krok po kroku i ocenia go lokalnie. Bez backendu i bez logowania — cała logika działa w przeglądarce.

Model jest wektorowy: każdy załamek to dipol w trzech wymiarach rzutowany na 12 odprowadzeń, więc prawa Einthovena i Goldbergera, oś serca, morfologie bloków i zmiany przeciwstawne wynikają z modelu, a nie z ręcznie wpisanych krzywych. Ten sam generator napędza atlas, wydruk EKG w trenerze i pomiary (HR, PR, QRS, QT/QTc, oś).

## Skąd materiał

- `C:\Projects\medsim\ekg-cwiczenia` — bank przypadków, klucz oceny, słownik pojęć (źródło danych i reguł oceny).
- `C:\Projects\medsim\corpuls-mcp\ecg.js` — generator EKG simulatora corpuls3 (źródło modelu wektorowego).

Oba źródła są zewnętrzne wobec tego repo: aplikacja jest samodzielna, ale rozwija się razem z nimi (`scripts/fixtures.mjs` porównuje wyniki z oryginałem).

## Uruchomienie

```bash
npm install
npm run dev       # serwer developerski (Vite)
npm run build     # tsc --noEmit && vite build → dist/
npm run preview   # podgląd zbudowanej wersji
npm test          # vitest run — 126 testów oceny
```

Wymagania: Node 20+, npm.

## Struktura katalogów

| Katalog | Co zawiera |
| --- | --- |
| `src/pages/` | Strony tras: Start, Atlas, Trener, Trening, Postępy, 404. |
| `src/routes.tsx` | Definicja nawigacji i dopasowanie ścieżki do strony. |
| `src/lib/` | Logika bez UI: routing po hashu, generator przypadku, ocena, historia w localStorage, RNG. |
| `src/data/` | Treść: bank przypadków, wzorce atlasu, słownik pojęć, nazwy faz cyklu. |
| `src/model/` | Model wektorowy EKG (`ecg.mjs`) i jego typy (`ecg.d.ts`). |
| `src/atlas/` | Atlas: schemat serca 2D (SVG), paski EKG (canvas), zegar faz, panel opisu. |
| `src/trainer/` | Trener: kreator kroków, edycja odpowiedzi, sprawdzenie i wynik. |
| `src/components/` | Wspólne kontrolki: wydruk EKG, siatka odprowadzeń, chipy, pola liczbowe. |
| `src/styles/` | Tokeny motywu, style bazowe, reguły wydruku. |
| `test/` | Testy oceny (vitest) — parytet z oryginalnym `ocena.js`. |
| `scripts/` | Skrypty pomocnicze (fixtury z `medsim`). |
| `public/` | Pliki kopiowane 1:1 do `dist/` (`.nojekyll` dla GitHub Pages). |

## Architektura

**Routing po hashu.** Trasy siedzą po `#` (`#/atlas/af`, `#/trener/123456?poziom=2`), więc nie potrzebują przepisań po stronie serwera i działają z dowolnego podkatalogu oraz z pliku. `src/lib/hash.ts` czyta `location.hash`, rozcina `?query` i subskrybuje `hashchange`; `src/routes.tsx` dopasowuje najdłuższy pasujący prefiks.

**Imperatywne canvasy i SVG, nie stan Reacta.** Klatki animacji nie przechodzą przez `useState`: `useClock` trzyma czas w `ref` i emituje ramki `requestAnimationFrame` do subskrybentów (`clock.onFrame`), a `Heart2D`, `StripCanvas` i `Pills`/`PhaseBox` rysują bezpośrednio na swoich elementach DOM. React renderuje strukturę raz; 60 fps obsługuje imperatywny kod. Dzięki temu przewijanie i zoom paska EKG nie wywołują re-renderów.

**Przypadek z seeda.** `generateCase({ seed, poziom?, kat?, id? })` w `src/lib/generate.ts` jest deterministyczny: ten sam seed zawsze daje ten sam przypadek, te same pomiary i ten sam klucz. Seed siedzi w trasie (`#/trener/<seed>`), więc każdy przypadek da się odtworzyć i podlinkować. Odpowiedzi uczącego się też są kluczowane seedem w `localStorage`.

**Ocena lokalna.** `src/lib/ocena.ts` porównuje odpowiedź z kluczem wygenerowanym przez model: 8 punktów z rubryk opisu (rytm, częstość, oś, odstępy i przewodzenie, ST-T, morfologia) plus 0–2 za wniosek (`src/lib/wniosek.ts`). Wynik trafia do historii w `localStorage` i zasila stronę Postępy.

## Jak dodać przypadek do banku

Dopisz obiekt do `PRZYPADKI` w `src/data/przypadki.ts`:

```ts
{
  id: 'moj-przypadek',            // unikalny, stabilny — trafia do seedów i historii
  poziom: 2,                      // 1 | 2 | 3
  kat: 'rytm',                    // elementy | os | rytm | przewodzenie | niedokrwienie | elektrolity | inne | nzk
  wiek: [55, 85],
  plec: 'M',                      // 'K' | 'M' | null (losowo)
  ecg: { rhythm: 'af', hr: 96 },  // parametry modelu, jak w CFG monitora
  kontekst: '…',                  // zdanie z wezwania
  rozpoznanie: '…',               // wniosek, który ma paść
  elementy: ['…'],                // co musi paść w opisie
  pulapki: ['…'],
  postepowanie: '…'               // realia ZRM
}
```

Opcjonalne `kroki` nadpisują automatyczny wzorzec opisu (klucze: `rytm`, `czestosc`, `os`, `P`, `PR`, `QRS`, `ST`, `T`, `QT`), a `klucz` nadpisuje pojedyncze rubryki klucza oceny. Generator lekko losuje HR, oś i `stAmp`, więc liczby w `ecg` to punkt wyjścia — do opisu bierz pomiary z wydruku. Po dodaniu przypadku uruchom `npm test`: testy sprawdzają, że wzorcowa odpowiedź daje maksimum punktów.

## Jak dodać wzorzec do atlasu

Dopisz obiekt do `ZAB` w `src/data/atlas.ts` — to niezależny zbiór od banku trenera (atlas pokazuje wzorce, trener ćwiczy opisy):

```ts
{
  id: 'moj-wzorzec',
  grp: 'Tachyarytmy',            // kolejność grup = kolejność w spisie
  name: 'Nazwa wzorca',
  cfg: { rhythm: 'af', hr: 105 }, // konfiguracja modelu
  heart: { atria: 'af' },         // flagi schematu serca (blok, WPW, STEMI, przerost…)
  strips: ['II', 'V1', 'V6'],     // domyślne odprowadzenia pasków
  gain: 10,                       // opcjonalnie: 5 przy wysokim woltażu
  sub: 'Jedno zdanie streszczenia.',
  co: 'Dlaczego tak wygląda — mechanizm według modelu wektorowego.',
  kryt: ['Kryterium 1', 'Kryterium 2'],
  gdzie: ['II', 'V1'],            // odprowadzenia, w których to widać
  gdzieTxt: 'Gdzie patrzeć i na co.',
  fazy: { QRS: 'Co dzieje się w tej fazie cyklu.' } // opcjonalne opisy faz
}
```

`heart` steruje schematem 2D (`src/atlas/heart2d/`) — dostępne flagi: `avSlow`, `block`, `escape`, `type` (`lbbb`/`rbbb`/`wpw`/`vt`), `atria` (`af`/`flutter`), `stemi`, `lvh`, `hyperK`, `dissoc`. Atlas nie ma testów jednostkowych, ale strony `#/atlas/<id>` muszą się renderować — sprawdź wizualnie po dodaniu.

## Synchronizacja modelu EKG

`src/model/ecg.mjs` to kopia generatora z `C:\Projects\medsim\corpuls-mcp\ecg.js`. **Zmieniaj tylko ogon eksportu**, nie logikę modelu:

```js
// koniec pliku — jedyne miejsce różniące się od oryginału
const api = { create, NAMES, LEADS };
export { create, NAMES, LEADS };
export default api;
```

Oryginał jest skryptem IIFE (`(function (root) { … })(this)`) z `module.exports`/`root.ECG`. Lokalnie ten sam kod działa jako moduł ES: początek pliku dostaje `'use strict';` zamiast nagłówka funkcji, a ogon kończy się eksportami. Żeby zsynchronizować wersję:

1. Podmień ciało funkcji (wszystko między `'use strict';` a `const api = …`) na wersję z `corpuls-mcp/ecg.js`.
2. Zostaw lokalny początek (`'use strict';`, bez `(function (root) {`) i lokalny ogon eksportu.
3. Zaktualizuj `src/model/ecg.d.ts`, jeśli zmieniły się sygnatury.
4. `npm test` — testy oceny i parytet z `medsim` wykryją regresje.

## Deploy na GitHub Pages

Workflow `.github/workflows/deploy.yml` buduje i publikuje `dist/` przy każdym pushu na `main` oraz ręcznie (`workflow_dispatch`).

1. Repozytorium → **Settings → Pages**.
2. **Source: GitHub Actions** (nie „Deploy from a branch”).
3. Push na `main` (albo **Actions → Deploy na GitHub Pages → Run workflow**).

Adres: `https://<user>.github.io/<repo>/`. `vite.config.ts` ustawia `base: './'`, więc ścieżki assetów są względne i build działa z subkatalogu; routing po hashu nie wymaga żadnych przepisań. `public/.nojekyll` trafia do `dist/` i wyłącza przetwarzanie Jekylla (inaczej GitHub Pages pomija katalogi zaczynające się od `_`).

## Ograniczenia

- **Dane tylko w localStorage.** Historia ćwiczeń (`ekg-trener-historia`), odpowiedzi per seed (`ekg-trener-odp-<seed>`) i ostatni wzorzec atlasu (`atlasEkg`) nie są nigdzie wysyłane. Wyczyszczenie danych przeglądarki = utrata postępów; nie ma synchronizacji między urządzeniami.
- **Bez backendu.** Nie ma kont, rankingu ani zapisu po stronie serwera — aplikacja jest w pełni statyczna.
- **Wersja 3D wymaga WebGL.** Schemat serca w atlasie jest na razie 2D (SVG). Rozszerzenie 3D (`three.js`) potrzebuje sprawnego WebGL 2; na maszynach bez akceleracji lub z wyłączonym WebGL działa tylko widok 2D i paski EKG.
- **Materiał do nauki.** Opis EKG nigdy nie zastępuje decyzji klinicznej — każdy zapis wymaga weryfikacji lekarskiej.
