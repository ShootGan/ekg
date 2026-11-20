# Audyt trybu „Trening” – quiz rozpoznań (2026-11-20)

Audyt tylko do odczytu, wykonany przez agenta. Testy: `npx vitest run` dał 191 passed (126 w ocena.test.ts i 65 w quiz.test.ts). `npx tsc --noEmit` przeszedł czysto.

## Błędy (od najpoważniejszych)
1. **Biały ekran po skrótach quizu**
   - Skróty `czest`, `st` i `pr` w „Skrót: quiz rozpoznań” powodują biały ekran (`TrainingPage.tsx:9-11`, `DRILLE`).
   - Tych kategorii nie ma w `KATY`, więc `generate.ts:162` rzuca błąd, a aplikacja nie ma ErrorBoundary.
2. **Postępy pokazują fałszywe 0%**
   - Quiz zapisuje do historii tylko pomyłki, każdą z wynikiem 0% (`Quiz.tsx:61-64`).
   - Dlatego Postępy pokazują średnią 0%, a „Trenuj słabe strony” wskazuje działy na ślepo.
   - Do tego: wpisy mają „poz. 0”, działy mają surowe nazwy zamiast etykiet, a „Do powtórki” otwiera trener, nie quiz.
3. **Klawiatura po odpowiedzi**
   - Spacja, Enter i → przechwytują fokus przycisków (`Quiz.tsx:70-89`).
   - Na przykład Enter na „← Trening” przechodzi do następnego EKG, zamiast wrócić.
4. **Brak resetu serii**
   - „Nowa seria →” nie zeruje licznika (pokazuje 11/10).
   - Nie ma podsumowania serii.
5. **Odwrócone wykluczanie przypadków**
   - Wykluczane są tylko błędnie rozpoznane przypadki, i to 12 najstarszych, zamiast ostatnio widzianych (`Quiz.tsx:42-46`, `generate.ts:156-159`).
   - Skutek: ok. 52% szans na powtórzony przypadek w serii 10 pytań.
6. **Niejednoznaczne zestawy odpowiedzi**
   - Pary i grupy, których z samego zapisu praktycznie nie da się odróżnić, wypadają jako dystraktory:
     - lvh / nadcisnienie-lvh-pm
     - p-pulmonale / rvh
     - trzy warianty STEMI dolnego
     - af-normo / af-rvr / af-wolne
     - av-2-1 / mobitz2 / wenckebach
7. **Klucz niezgodny z zapisem**
   - `dlugie-qt`: „bradykardia” w kluczu, a częstość ≥60/min w 96 na 300 seedów.
   - `brugada`: ST w V1 tylko 0,11 mV, a klucz mówi ≥2 mm.
   - `hiperostre-t`: ST spełnia kryteria napięciowe STEMI, a opis mówi, że może ich nie spełniać.
8. **Drobne**
   - Po odpowiedzi strona nie przewija do wyniku i nie ma `aria-live`.
   - Na telefonie odpowiedzi są ok. 1000 px niżej i jest podpowiedź „klawisze 1–4”.
   - QTc 549 jest liczony przy VT.
   - Seed w URL się nie zmienia.

## Kryteria rozpoznania na wydruku – stan obecny: częściowo
- **Jest:** po odpowiedzi wydruk dostaje pasy ze znacznikami (ST↑/↓ w mV, QRS, RR, PR, QT, fala delta, fale f). Lista `elementy` jest jednak schowana w zwiniętym `<details>`.
- **Brakuje:**
  - Kryteria nie są widoczne od razu.
  - Kryterium nie jest powiązane z odprowadzeniami na wydruku.
  - Znaczniki ogólne (RR, PR, oś) mają ten sam kolor co rozstrzygające.
  - Nie ma znaczników dysocjacji AV, osi w blokach wiązek ani progresji R.
- **Propozycja:**
  1. Dodać do `Case` pole `kryteria: { txt, odpr[], pole[] }[]`; dla rozpoznań z atlasu można użyć `ZAB[].kryt/gdzie`.
  2. Dodać do `EcgPrint` tryb `review.focus`, który podświetla odprowadzenia i przyciemnia pozostałe znaczniki.
  3. W `Quiz` pokazywać listę kryteriów od razu; najechanie lub kliknięcie kryterium podświetla je na wydruku, a ogólne pomiary są pod przełącznikiem.
  4. Uzupełnić `zaznaczenia()` o brakujące cechy.
  5. Dodać test spójności kryteriów.

## Uwaga
Agent omyłkowo odpowiedział na kilka pytań w karcie podglądu użytkownika (tab-1). Licznik i seria w tej karcie są przez to przekłamane i trzeba ją odświeżyć. Historię w localStorage agent wyczyścił do stanu sprzed audytu.
