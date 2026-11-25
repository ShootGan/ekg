# Quiz EKG

Quiz z 12-odprowadzeniowego EKG dla ratowników medycznych i studentów. Aplikacja pokazuje zapis i listę zmian, w tym kilka pułapek. Zaznaczasz to, co naprawdę widzisz. Po sprawdzeniu możesz przejść omówienie krok po kroku: wydruk obrysowuje miejsca, w których widać każdą zmianę, a pułapki mają wyjaśnienie oparte na liczbach z tego zapisu.

Bez backendu i bez logowania. Wszystko działa w przeglądarce, a historia wyników zostaje w `localStorage`.

Zapisy liczy model wektorowy serca: każdy załamek to dipol w trzech wymiarach rzutowany na 12 odprowadzeń. Dzięki temu oś serca, morfologie bloków i zmiany przeciwstawne wynikają z modelu, a nie z ręcznie rysowanych krzywych.

## Uruchomienie

```bash
npm install
npm run dev       # serwer developerski (Vite)
npm run build     # tsc --noEmit && vite build → dist/
npm run preview   # podgląd zbudowanej wersji
npm test          # vitest run
```

Wymagania: Node 20+, npm.

## Jak działa

- **Menu** (`#/`) — wybór poziomu (podstawy, średnie, trudne) i działu, start serii 10 zapisów.
- **Quiz** (`#/quiz?seed=…&poziom=…&kat=…&id=…`) — zapis, lista zmian z pułapkami, ocena i omówienie. Ten sam `seed` zawsze daje ten sam zapis, więc każdy da się podlinkować.
- Zapisy oznaczone jako **trudne** to m.in. zapisy „jak z karetki”, z kilkoma zmianami naraz.
- Zapisy z błędami wracają do powtórki w kolejnej serii.

## Struktura

| Katalog | Co zawiera |
| --- | --- |
| `src/pages/` | Menu i strona quizu. |
| `src/trainer/` | Quiz i omówienie krok po kroku. |
| `src/lib/cechy.ts` | Katalog zmian, wykrywanie zmian w zapisie i dobór pułapek. |
| `src/lib/generate.ts` | Losowanie przypadku z seeda, klucz i znaczniki na wydruku. |
| `src/data/przypadki*.ts` | Bank przypadków (rozpoznanie, kryteria, kontekst). |
| `src/data/jak.ts` | Kryteria „jak rozpoznać” i wyjaśnienia pułapek. |
| `src/data/wyjasnienia.ts` | „Co się dzieje w sercu” dla każdego przypadku. |
| `src/model/` | Model wektorowy EKG (`ecg.mjs`). |
| `src/components/` | Wydruk EKG i drobne kontrolki. |
| `test/` | Testy (vitest): wykrywanie zmian, pułapki, wyjaśnienia, znaczniki. |

## Deploy na GitHub Pages

Workflow `.github/workflows/deploy.yml` buduje i publikuje `dist/` przy każdym pushu na `master` oraz ręcznie (`workflow_dispatch`).

1. Repozytorium → **Settings → Pages** → **Source: GitHub Actions**.
2. Push na `master` (albo **Actions → Deploy na GitHub Pages → Run workflow**).

Adres: `https://<user>.github.io/<repo>/`. `vite.config.ts` ma `base: './'`, a routing jest po `#`, więc aplikacja działa z dowolnego podkatalogu bez przepisań po stronie serwera.

## Ograniczenia

- **Dane tylko w przeglądarce.** Wyczyszczenie danych przeglądarki kasuje historię; nie ma synchronizacji między urządzeniami.
- **Materiał do nauki.** Nie zastępuje decyzji klinicznej.
