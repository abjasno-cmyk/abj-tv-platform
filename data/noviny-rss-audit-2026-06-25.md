# Noviny RSS audit (2026-06-25)

Audit proběhl aktivním HTTP testem kandidátních endpointů a kontrolou, zda
odpověď obsahuje validní RSS/Atom feed markup.

## Souhrn

- Testováno zdrojů: **63**
- Funkčních: **37**
- Nefunkčních: **26**
- MVP priorita: **35**
- Funkčních v MVP: **26**

## MVP zdroje, které prošly (whitelist)

1. Parlamentní listy — `https://www.parlamentnilisty.cz/export/rss.aspx`
2. Protiproud — `https://protiproud.info/nejnovejsi/rss/`
3. Rádio Universum — `https://www.radiouniversum.cz/feed/`
4. Vidlákovy kydy — `https://www.vidlakovykydy.cz/rss.xml`
5. Litterate — `https://web.litterate.cz/feed/`
6. Nová republika — `https://www.novarepublika.cz/feed`
7. Pravý prostor — `https://pravyprostor.net/feed/`
8. Konzervativní noviny — `https://www.konzervativninoviny.cz/feed/`
9. AC24 — `https://www.ac24.cz/feed/`
10. Krajské listy — `http://www.krajskelisty.cz/export/rss.xml`
11. Svědomí národa — `https://www.svedomi-naroda.cz/feed/`
12. STAČILO! — `https://stacilo.cz/feed/`
13. SPD — `https://new.spd.cz/feed/`
14. PRO — `https://www.stranapro.cz/feed/`
15. Trikolora — `https://volimtrikoloru.cz/feed/`
16. Motoristé sobě — `https://motoristesobe.cz/feed`
17. SOSP — `https://www.sosp.cz/feed/`
18. Štandard — `https://standard.sk/feed`
19. Hlavné správy — `https://www.hlavnespravy.sk/feed`
20. Blog Hlavné správy — `https://blog.hlavnespravy.sk/feed/`
21. eReport — `https://ereport.sk/feed`
22. Postoj — `https://www.postoj.sk/rss`
23. Fox News — `https://moxie.foxnews.com/google-publisher/latest.xml`
24. ZeroHedge — `https://cms.zerohedge.com/fullrss2.xml`

## MVP zdroje, které neprošly (blacklist pro seed)

- Časopis !Argument — HTTP 401
- Svobodný svět — HTTP 403
- První zprávy — endpoint vrací obsah bez validního RSS/Atom feedu
- ANO — HTTP 403
- Institut Václava Klause — HTTP 404
- CEP — connection reset
- Infovojna — endpoint vrací obsah bez validního RSS/Atom feedu
- Hlavný denník — HTTP 404
- Tucker Carlson — HTTP 403

## Seed soubor

Pro vložení pouze ověřených MVP zdrojů použij:

- `supabase/019_noviny_seed_sources_verified_mvp.sql`

Tento seed záměrně neobsahuje nefunkční endpointy.
