# Staal Hergebruik & Ontmantelingsplan Systeem

## Projectoverzicht

Dit systeem is ontworpen voor het hergebruiken van stalen balken uit gesloopte gebouwen. Het omvat de volledige workflow van oogsten tot verkoop van gecertificeerd hergebruikt staal.

## Modules

### Module 1: Staal Profiel Bibliotheek (`/modules/01_profiel_bibliotheek`)
- Database van standaard staalprofielen (HEA, HEB, IPE, UNP, etc.)
- Eigenschappen: afmetingen, gewicht, sterkteklassen
- Basis voor matching en identificatie

### Module 2: Gebouw Structuur & BIM (`/modules/02_gebouw_structuur`)
- Opbouwen van staalstructuren met profielen
- BIM integratie voor gebouwinformatie
- Visualisatie van gebouwstructuren

### Module 3: Oogst Planning (`/modules/03_oogst_planning`)
- Algoritme voor optimale demontage volgorde
- Planning van welke balken te oogsten
- Prioritering op basis van herbruikbaarheid

### Module 4: Originele Balken Database (`/modules/04_originele_balken_db`)
- Inventaris van nieuw/origineel staal
- Referentie database voor matching
- Specificaties en beschikbaarheid

### Module 5: Matching Algoritme (`/modules/05_matching_algoritme`)
- Fit geoogste balken op vraag
- Optimalisatie voor minimaal afval
- Cutting stock problem solver

### Module 6: Schoonmaak Analyse (`/modules/06_schoonmaak_analyse`)
- Detectie van aangelaste items (schotten, platen, etc.)
- Markering van te verwijderen onderdelen (rood)
- Berekening van bewerkingstijd en kosten

### Module 7: Robot Bewerkingen (`/modules/07_robot_bewerkingen`)
- Instructies voor snijbranders
- Frees operaties
- Spuitwerk planning
- G-code / robot instructie generatie

### Module 8: Voorraad & Shop (`/modules/08_voorraad_shop`)
- Inventaris management
- Webshop integratie
- CAD/BIM export voor klanten

### Module 9: Certificering & Traceerbaarheid (`/modules/09_certificering`)
- Herkomst registratie
- Materiaal certificaten
- Sterkteklasse bepaling
- Rapportage generatie

## Technologie Stack

- **Backend**: Python
- **Database**: SQLite (ontwikkeling) / PostgreSQL (productie)
- **API**: FastAPI
- **Frontend**: (later) React/Vue
- **3D/CAD**: IFC/STEP support

## Installatie

```bash
pip install -r requirements.txt
```

## Gebruik

Zie documentatie per module.
