# VEROX — MOBILNÍ ŠABLONA (handoff pro Cursor)

> Tento dokument je **závazná specifikace** pro nasazení mobilní verze webu VEROX v kódu.
> Cíl: napodobit grafické podklady **1:1** a fungovat na **jakémkoli mobilním zařízení**.
> Vše níže je odvozeno přímo z grafických návrhů (Photoshop, 150 ppi, šířka návrhu 3323 px).

---

## 0. ZÁKLADNÍ PRAVIDLA (platí všude)

| Parametr | Hodnota |
|---|---|
| Breakpoint mobil | `max-width: 480px` (mobilní UI); od `481px` desktop (neřešíme zde) |
| Referenční šířka návrhu | 3323 px = 100 % šířky viewportu |
| Layout (šířky, pozice, odsazení) | výhradně v `%` šířky viewportu (dle guides v §2) |
| Fonty | `rem` přes `clamp(min, <vw>, max)` — `<vw>` = poměr fontu k šířce návrhu |
| Vertikální rytmus | `rem` / `clamp()`; výšky needfixovat v px (mobil scrolluje) |
| Letter-spacing | `tracking ÷ 1000 → em` (tracking 50 = `0.05em`, 25 = `0.025em`) |
| Jediné fixní px | stroke `6px` u dvojitých proužků a tloušťky rámečků (1–3 px) |
| Pozadí stránky | `#FFFFFF` |

**Zlaté pravidlo:** žádný fixní px layout jen pro jeden telefon. Vše `%` + `clamp()` + `min()/max()`.

### 0.1 Barevné tokeny
```css
:root {
  --vx-orange:      #F37021;  /* brand / akcent */
  --vx-gray-dark:   #303030;  /* hlavní text, nadpisy */
  --vx-gray-light:  #717171;  /* sekundární text, neaktivní tečky */
  --vx-white:       #FFFFFF;  /* pozadí */
  --vx-black:       #000000;  /* kruhová loga kanálů, podklady odznaků, tagline */
}
```

### 0.2 Fonty (žádné jiné se nepoužívají)
```css
/* Myriad Pro Bold | Myriad Pro Regular | Impact Regular */
--vx-font-myriad: "Myriad Pro", system-ui, sans-serif;
--vx-font-impact: "Impact", "Haettenschweiler", sans-serif; /* jen názvy pořadů na ŽIVĚ */
```

### 0.3 Přepočtový vzorec (kdyby bylo potřeba dopočítat další prvek)
```
% šířky (vw složka) = (pt / 72 × 150) / 3323 × 100
clamp(min_rem, <vw>vw, max_rem)
  – <vw>     = věrný poměr k návrhu
  – min_rem  = čitelnostní pojistka pro malé displeje
  – max_rem  = strop pro velké telefony / tablety na hraně breakpointu
```

---

## 1. GLOBÁLNÍ HORIZONTÁLNÍ MŘÍŽKA (guides)

Všechny sloupce a hrany prvků MUSÍ sedět na těchto liniích.

| Guide | % šířky | Použití |
|---|---|---|
| L0 | 0 % | Levý okraj (logo, sloupec data) |
| L1 | 3,55 % | Levý okraj obsahu / padding hlavičky |
| L2 | 21,3–21,4 % | Konec sloupce data / pravá hrana KOMUNITA bloku |
| L3 | 23,1 % | Začátek textu zprávy (V KOSTCE) |
| L4 | 26,8 % | Začátek názvu pořadu (ŽIVĚ) |
| L5 | 32,9 % | Pravá hrana labelů formuláře (MŮJ VEROX) |
| L6 | 33,8 % | Levý okraj inputů (MŮJ VEROX) |
| L7 | 71,1 % | Konec textové zóny (veřejná V KOSTCE) |
| L8 | 74,6 % | Začátek sloupce akčních tlačítek (přihlášená V KOSTCE) |
| L9 | 75,0 % | Konec dvojitých proužků / začátek pravé zóny ŽIVĚ |
| R0 | 94,2 % | Pravý okraj inputů |
| R1 | 96,4 % | Pravý okraj obsahu (čas, kruh ŽIVÉ) |
| R2 | 99,5 % | Pravý okraj akčních tlačítek |
| C | 50 % | Osa centrovaných nadpisů sekcí |

```css
:root {
  --L0: 0%;     --L1: 3.55%;  --L2: 21.35%; --L3: 23.1%;  --L4: 26.8%;
  --L5: 32.9%;  --L6: 33.8%;  --L7: 71.1%;  --L8: 74.6%;  --L9: 75%;
  --R0: 94.2%;  --R1: 96.4%;  --R2: 99.5%;  --C: 50%;
}
```

---

## 2. SPOLEČNÉ KOMPONENTY

### 2.1 Dvojitý oranžový proužek (oddělovač sekcí)
| Parametr | Hodnota |
|---|---|
| Barva | `--vx-orange` |
| Počet linek | 2 nad sebou |
| Stroke každé linky | `6px` (fixní) |
| Mezera mezi linkami | ~6px |
| Šířka | **plná** nebo **75 %** (uvedeno u každé sekce) |

### 2.2 Šipka CTA („Spustit video", „Zjistit více")
- Oranžová vodorovná čára `--vx-orange` + **trojúhelníkový hrot** vpravo.
- Text: `Myriad Bold`, `clamp(0.85rem, 1.5vw, 0.95rem)`, `--vx-gray-dark`, `letter-spacing 0.05em`.

### 2.3 Stavy tlačítek / rámečků (vzor pro celý web)
- **Aktivní / zvýrazněné:** výplň `--vx-orange`, text `--vx-white`.
- **Neaktivní / výchozí:** výplň `--vx-white`, rámeček `--vx-orange` ~2 px, text `--vx-gray-dark`.
- **Neutrální (např. „Reagovat"):** rámeček `--vx-gray-light` ~1–2 px.

---

## 3. ŠABLONA A — UKOTVENÁ HORNÍ LIŠTA (všechny stránky, obě verze)

**Chování:** `position: sticky; top: 0;` bílé pozadí, **nesbaluje se**, žádný hamburger. Obsah stránek odsazen o výšku lišty.

### 3.1 Struktura (3 řádky)
```
┌──────────────────────────────────────────────┐
│ [LOGO]                         DATUM          │
│ tagline                        ČASOMÍRA       │
│                                PŘIHLÁSIT/JMÉNO │
├──────────────────────────────────────────────┤
│  ŽIVĚ  │  VIDEA  │  V KOSTCE  │  MŮJ VEROX     │
└──────────────────────────────────────────────┘
```

### 3.2 Logo
| Parametr | Hodnota |
|---|---|
| Asset | `/brand/verox-logo.svg` (+ PNG @2x), **průhledné pozadí**, jen wordmark + oranžová tečka |
| Umístění | L1 (3,55 %), tagline pod ním |
| Výška loga | `clamp(26px, 7.2vw, 36px)` |
| Max. šířka | `min(52vw, 200px)` |
| Tagline „MAINSTREAMOVÝ DETOX" | `Myriad Regular`, `clamp(0.55rem, 1.4vw, 0.7rem)`, `--vx-black`, verzálky, `letter-spacing 0.05em` |

### 3.3 Pravý sloupec hlavičky
| Prvek | Font | clamp | Barva | Tracking |
|---|---|---|---|---|
| Datum (`PÁTEK 29.KVĚTNA 2026`, dyn.) | Myriad Bold | `(0.75rem, 1.7vw, 0.95rem)` | `--vx-gray-dark` | 0 |
| Čas (`23:58`, dyn.) | Myriad Bold | `(1.5rem, 6.9vw, 2.3rem)` | `--vx-orange` | 0.025em |
| PŘIHLÁSIT ZDARMA | Myriad Bold | `(0.9rem, 1.88vw, 1.1rem)` | `--vx-orange` | 0.05em |

> **Přihlášený stav:** místo „PŘIHLÁSIT ZDARMA" se zobrazí **jméno uživatele** + odkaz **ODHLÁSIT**.
> **Časomíra je vždy v liště**, nikdy v obsahu stránky.

### 3.4 Navigace (řádek 2)
| Parametr | Hodnota |
|---|---|
| Položky | ŽIVĚ · VIDEA · V KOSTCE · MŮJ VEROX |
| Font | `Myriad Pro Regular` |
| Velikost | `clamp(0.9rem, 1.88vw, 1.1rem)` |
| Tracking | 0.05em |
| Aktivní | `--vx-orange` + spodní podtržení 2 px `--vx-orange` |
| Neaktivní | `--vx-gray-dark` |
| Rozložení | rovnoměrně mezi L1 a pravým okrajem |

### 3.5 Výška lišty (offset obsahu)
```css
:root { --vx-mobile-header-height: clamp(108px, 29vw, 132px); }
/* obsah stránek: padding-top: var(--vx-mobile-header-height); */
```

---

## 4. ŠABLONA B — ŽIVĚ (`/`, `/live`)

**Pořadí sekcí shora:** Hero video → meta řádek → proužek → PRÁVĚ HRAJE (karusel) → PRÁVĚ BĚŽÍ → proužek → KANÁLY.

### 4.1 Hero video
| Parametr | Hodnota |
|---|---|
| Šířka | 0–100 % viewportu |
| Poměr | `21:9`, `object-fit: cover`, centrované (krajinný banner; zdroj 16:9 ořezán na výšku) |
| Odznak streamu | neřešit |

### 4.2 Meta řádek (grid pod videem)
| Sloupec | % | Obsah |
|---|---|---|
| 1 | 0–21,4 % (L0→L2) | **KOMUNITA** blok (výplň `--vx-orange`) |
| mezera | 21,4–26,8 % | — |
| 2 | 26,8–75 % (L4→L9) | **Název pořadu** (Impact) + **autor** |
| 3 | 75–96,4 % (L9→R1) | **Kruh ŽIVÉ VYSÍLÁNÍ** + **odpočet** |

**KOMUNITA blok:**
- „KOMUNITA": `Myriad Bold`, `clamp(0.95rem, 2.26vw, 1.5rem)`, `--vx-gray-dark`, verzálky, leading 30 pt, `letter-spacing 0.05em`, vycentrováno.
- „ZDE NAPIŠTE ZPRÁVU": `Myriad Regular`, `clamp(0.7rem, 1.18vw, 0.95rem)`, `--vx-gray-dark`, verzálky, `letter-spacing 0.05em`.
- Bílý `--vx-white` input pod textem (šířka ~85 % bloku).

**Název pořadu:** `Impact Regular`, `clamp(1.1rem, 3.01vw, 1.6rem)`, `--vx-gray-dark`, line-height ~1,05, **tracking 0**.
**Autor** (např. „Tucker Carlson"): `Myriad Regular`, `clamp(0.85rem, 1.5vw, 1rem)`, `--vx-gray-dark`.

**Kruh ŽIVÉ VYSÍLÁNÍ:** průměr `clamp(36px, 9.8vw, 46px)`, výplň `--vx-orange`, text „ŽIVÉ VYSÍLÁNÍ" `--vx-white`, `Myriad Bold`, verzálky, 2 řádky, vycentrováno.
**Odpočet** „DO KONCE ZBÝVÁ : HH:MM": `Myriad Regular`, `clamp(0.85rem, 1.9vw, 1rem)`, `--vx-gray-dark`, `letter-spacing 0.05em`.

**Proužek** za meta řádkem: dvojitý, šířka do 75 % (L9).

### 4.3 PRÁVĚ HRAJE (karusel)
- Nadpis „PRÁVĚ HRAJE": centrovaný (C), `--vx-orange`, `Myriad Regular`, `clamp(1rem, 3vw, 1.3rem)`, verzálky, `letter-spacing 0.05em`.
- Karusel dlaždic `16:9`, oranžové chevron šipky `--vx-orange` přesahující přes okraj viewportu.
- Tečky pozice: aktivní `--vx-orange`, neaktivní `--vx-gray-light`.

### 4.4 PRÁVĚ BĚŽÍ
- Štítek „● PRÁVĚ BĚŽÍ": oranžová tečka + `Myriad Bold`, `clamp(0.85rem, 1.5vw, 1rem)`, `--vx-orange`, verzálky, `letter-spacing 0.05em`.
- Nadpis článku: `Myriad Bold`, `clamp(0.95rem, 2.5vw, 1.25rem)`, line-height 1, `--vx-gray-dark`, `letter-spacing 0.025em`.
- Zdroj (např. „SMER - Sociálna Demokracia"): `Myriad Regular`, `clamp(0.7rem, 1.5vw, 0.85rem)`, `--vx-gray-light`, `letter-spacing 0.025em`.
- **Proužek** dole: dvojitý, plná šířka.

### 4.5 KANÁLY
- Nadpis „KANÁLY": centrovaný (C), `--vx-orange`, `Myriad Regular`, `clamp(1rem, 3vw, 1.3rem)`, verzálky, `letter-spacing 0.05em`.
- Karusel dlaždic kanálů: obdélník, okraj `--vx-gray-light` ~1 px, vlevo kruhové logo (`--vx-black` podklad u monochromatických), vpravo název `Myriad Bold` verzálky.
- **Aktivní dlaždice:** oranžový rámeček `--vx-orange` ~3 px.
- Oranžové chevron šipky na krajích.
- Pod karuselem „KLIKNĚTE NA VYBRANÝ KANÁL PRO ZOBRAZENÍ DETAILU.": `Myriad Regular`, `clamp(0.7rem, 1.5vw, 0.85rem)`, `--vx-gray-dark`, `letter-spacing 0.05em`, centrované.

---

## 5. ŠABLONA C — VIDEA (`/videa`)

Svislý seznam videokaret (nejnovější nahoře), oddělené dvojitým proužkem (plná šířka).

**Grid karty:** sloupec data `14,2 %` | náhled `36,4 %` | text (zbytek).

| Prvek | Font / barva / clamp |
|---|---|
| Měsíc („KVĚTEN") | `Myriad Bold`, `--vx-gray-light`, `clamp(0.95rem, 3.01vw, 1.3rem)`, verzálky, `0.05em` |
| Den („22") | `Myriad Bold`, `--vx-orange`, `clamp(2.5rem, 12.54vw, 4rem)`, `0.05em`, line-height 1 |
| Náhled | landscape `16:9`; portrét `9:16` centrovaný v černém `--vx-black` poli (letterbox) |
| Titul | `Myriad Bold`, `--vx-gray-dark`, `clamp(1rem, 2.26vw, 1.15rem)`, line-height auto, `0.05em` |
| Autor / kanál | `Myriad Bold`, `--vx-gray-light`, `clamp(0.85rem, 1.5vw, 1rem)`, `0.05em` |
| Perex | `Myriad Regular`, `--vx-gray-light`, `clamp(0.85rem, 1.5vw, 0.95rem)`, line-height ~1,35, `0.05em` |
| „Zjistit více →" | viz §2.2 |

---

## 6. ŠABLONA D — V KOSTCE (`/v-kostce`)

Svislý seznam zpráv, oddělené dvojitým proužkem (stroke 6 px, plná šířka).

**Grid karty:** datum `0–21,3 %` (L0→L2) | text `23,1–71,1 %` (L3→L7) | tlačítka `74,6–99,5 %` (L8→R2, **jen přihlášená verze**).

| Prvek | Font / barva / clamp |
|---|---|
| Měsíc + Den | stejné jako VIDEA (§5) |
| Nadpis zprávy | `Myriad Bold`, `--vx-gray-dark`, `clamp(1rem, 2.26vw, 1.3rem)`, line-height ~1,1, `0.05em` |
| Zdroj + datum (např. „Ereport 30. 05. 12:01") | `Myriad Bold`, `--vx-gray-light`, `clamp(0.85rem, 1.5vw, 1rem)`, `0.05em` |
| Perex (lead + odstavec, mezi nimi prázdný řádek) | `Myriad Regular`, `--vx-gray-light`, `clamp(0.85rem, 1.5vw, 0.95rem)`, line-height ~1,4, `0.05em` |
| „Spustit video →" | viz §2.2 |

**Pravý sloupec akčních tlačítek (jen přihlášená verze)** — 4 pod sebou, text `Myriad Bold` `clamp(0.85rem, 1.5vw, 1rem)`, `0.05em`, zarovnání vlevo:
1. **Reagovat** — rámeček `--vx-gray-light` ~1–2 px (neutrální).
2. **Komentáře** — rámeček `--vx-orange` ~1–2 px.
3. **Přihlásit pro sdílení** — rámeček `--vx-orange`.
4. **Do komunity** — rámeček `--vx-orange`.

> Veřejná verze: pravý sloupec chybí, text může jít až po L7 (71,1 %).

---

## 7. ŠABLONA E — MŮJ VEROX (`/muj-verox`, nepřihlášený)

**Pořadí:** intro (centrované) → CTA → proužek → formulář → PŘIDAT VZKAZ → proužek → PŘIPNUTÉ VZKAZY.

### 7.1 Intro (vše centrované, osa C)
| Prvek | Font / clamp / barva |
|---|---|
| „MŮJ VEROX" | `Myriad Regular`, `clamp(1.5rem, 4.51vw, 2.2rem)`, `--vx-orange`, verzálky, `0.05em` |
| „DISKUZE DIVÁKŮ, REAKCE A DOPORUČENÍ" | `Myriad Bold`, `clamp(0.9rem, 1.88vw, 1.1rem)`, `--vx-gray-dark`, verzálky, leading 36 pt |
| „Kritika je vítaná…" | `Myriad Regular`, `clamp(0.85rem, 1.5vw, 0.95rem)`, `--vx-gray-light` |
| „INTERAKCE V KOMUNITĚ(…) JSOU DOSTOPNÉ POUZE PO PŘIHLÁŠENÍ." | `Myriad Regular`, `clamp(0.85rem, 1.5vw, 0.95rem)`, `--vx-gray-dark`, verzálky |

### 7.2 CTA „PŘIHLÁSIT ZDARMA"
Obdélník, výplň `--vx-orange`, text `--vx-white`, `Myriad Regular`, `clamp(0.9rem, 1.88vw, 1.1rem)`, verzálky, centrováno, šířka ~40–45 %, vycentrováno.

### 7.3 Proužek #1 — šířka 75 % (L9).

### 7.4 Formulář (labely vpravo do L5, inputy od L6)
| Řádek | Label (vpravo k 32,9 %) | Input (od 33,8 % do 94,2 %) |
|---|---|---|
| Přezdívka | „PŘEZDÍVKA" | placeholder „Vaše přezdívka" |
| E-mail | „E-MAIL" + „( volitelné, nezveřejňujeme )" | placeholder „vas@email.cz" |
| Vzkaz | „VZKAZ" | velký textarea, placeholder „Co chcete vzkázat redakci, nebo ostatním divákům ?" |

- Labely: `Myriad Bold`, `clamp(0.85rem, 1.5vw, 1rem)`, `--vx-gray-dark`, verzálky, zarovnání vpravo.
- Inputy: výplň `--vx-white`, rámeček `--vx-orange` ~2 px, placeholder `Myriad Regular`, `clamp(0.85rem, 1.5vw, 0.95rem)`, `--vx-gray-light`.

### 7.5 PŘIDAT VZKAZ + počítadlo
- Tlačítko: výplň `--vx-orange`, text `--vx-white`, `Myriad Regular`, `clamp(0.9rem, 1.88vw, 1.1rem)`, verzálky, centrováno; leží v zóně inputů (od L6).
- „0/1500" vpravo: `Myriad Regular`, `clamp(0.85rem, 1.5vw, 0.95rem)`, `--vx-gray-light`.

### 7.6 Proužek #2 (jako #1).

### 7.7 PŘIPNUTÉ VZKAZY
- Filtry vlevo, dvě tlačítka pod sebou:
  - **NEJNOVĚJŠÍ** — neaktivní: výplň `--vx-white`, oranžový rámeček ~2 px, text `--vx-gray-dark`.
  - **POPULÁRNÍ** — aktivní: výplň `--vx-orange`, text `--vx-white`.
  - Font obou: `Myriad Regular`, `clamp(0.85rem, 1.5vw, 1rem)`, verzálky, centrováno.
- Nadpis „PŘIPNUTÉ VZKAZY" vpravo: `Myriad Regular`, `clamp(1.1rem, 3.01vw, 1.4rem)`, `--vx-orange`, verzálky, `0.05em`.
- Empty state v oranžovém rámečku ~2 px: „Zatím tu žádné příspěvky nejsou. Buďte první, kdo něco přidá do Komunity." — `Myriad Regular`, `clamp(0.85rem, 1.5vw, 0.95rem)`, `--vx-gray-light`.

---

## 8. HANDOFF BALÍČEK (co dodat, ať jde nasadit bez chyb)

| # | Položka | Formát | Poznámka |
|---|---|---|---|
| 1 | Figma | odkaz + export @ 380px | Všechny stránky + stavy (aktivní nav, filtry, přihlášený/nepřihlášený) |
| 2 | Logo | SVG + PNG @2x | Průhledné pozadí, jen wordmark + oranžová tečka |
| 3 | Guide layer | viditelné linky | Všechna % z §1 |
| 4 | Token sheet | 1 stránka | Barvy, fonty, všechny clamp hodnoty |
| 5 | Výška headeru | px @ 380px | Pro `--vx-mobile-header-height` |
| 6 | Ikony šipek | SVG | Oranžové chevrony (volitelné) |

**Pojmenování:**
```
/brand/verox-logo.svg
/brand/verox-logo.png
/brand/verox-logo@2x.png
/icons/chevron-left.svg
/icons/chevron-right.svg
```

---

## 9. KONTROLNÍ CHECKLIST PŘED NASAZENÍM

- [ ] Všechny šířky sloupců sedí na guides z §1
- [ ] Logo má průhledné pozadí
- [ ] Žádný fixní px layout jen pro jeden telefon — vše `%` + `clamp()`
- [ ] Proužky mají stroke `6px`, mezera ~6px
- [ ] Časomíra je v liště (§3.3), ne v obsahu stránky
- [ ] U každého textu: font, váha, clamp, barva, tracking
- [ ] Aktivní stav navigace: oranžová + podtržení 2 px
- [ ] Stavy tlačítek dle §2.3 (aktivní/neaktivní/neutrální)
- [ ] Hero video poměr 21:9, `object-fit: cover`
- [ ] Tracking všude přepočten `tracking/1000 = em`
- [ ] Lišta `sticky`, nesbaluje se, obsah odsazen o výšku lišty

---

## 10. DESKTOP (mimo rozsah této mobilní šablony)

| Oblast | Požadavek |
|---|---|
| Desktop ≥ 481px | Řeší se samostatně (responzivní rem + %, hero video ukotvené vpravo, vertikální menu sloupec) |
| Mobil ≤ 480px | Pouze tato šablona |

*Konec specifikace.*
