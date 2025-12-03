/**
 * NTA 8713 - Hergebruik van Staalconstructies
 * Nederlandse Technische Afspraak gebaseerd op Europese normen
 * 
 * Deze standaard beschrijft de eisen voor hergebruik van stalen
 * constructie-elementen conform EN 1090 en Eurocode.
 */

// ============================================
// MATERIAAL CLASSIFICATIE (EN 10025)
// ============================================

/**
 * Staalsoorten volgens EN 10025
 * S = Constructiestaal, getal = minimale vloeigrens in N/mm²
 */
export type StaalSoort = 
  | 'S235'   // Minimale vloeigrens 235 N/mm²
  | 'S275'   // Minimale vloeigrens 275 N/mm²
  | 'S355'   // Minimale vloeigrens 355 N/mm²
  | 'S420'   // Minimale vloeigrens 420 N/mm²
  | 'S460'   // Minimale vloeigrens 460 N/mm²
  | 'ONBEKEND'

/**
 * Kerfslagwaarde toevoegingen (taaiheid)
 * JR = 27J bij 20°C, J0 = 27J bij 0°C, J2 = 27J bij -20°C
 */
export type KerfslagKlasse = 'JR' | 'J0' | 'J2' | 'K2' | 'ONBEKEND'

/**
 * Materiaal leveringsconditie
 */
export type LeveringsConditie = 
  | 'AR'   // As Rolled (warmgewalst)
  | 'N'    // Genormaliseerd
  | 'M'    // Thermomechanisch gewalst
  | 'Q'    // Verbeterd door warmtebehandeling

// ============================================
// UITVOERINGSKLASSE (EN 1090-2)
// ============================================

/**
 * Uitvoeringsklasse (EXC) volgens EN 1090-2
 * Bepaalt de eisen aan fabricage en montage
 */
export type UitvoeringsKlasse = 'EXC1' | 'EXC2' | 'EXC3' | 'EXC4'

export const UITVOERINGSKLASSE_INFO: Record<UitvoeringsKlasse, {
  naam: string
  beschrijving: string
  typischeToepassingen: string[]
  eisenNiveau: 'basis' | 'standaard' | 'hoog' | 'zeer hoog'
}> = {
  EXC1: {
    naam: 'Uitvoeringsklasse 1',
    beschrijving: 'Basisklasse voor niet-dragende of secundaire constructies',
    typischeToepassingen: [
      'Niet-dragende constructies',
      'Landbouwgebouwen',
      'Eenvoudige hallen tot 1 bouwlaag',
      'Tijdelijke constructies'
    ],
    eisenNiveau: 'basis'
  },
  EXC2: {
    naam: 'Uitvoeringsklasse 2',
    beschrijving: 'Standaardklasse voor de meeste gebouwen',
    typischeToepassingen: [
      'Standaard gebouwen',
      'Industriehallen',
      'Kantoorgebouwen',
      'Woningbouw tot 4 lagen',
      'Parkeergarages'
    ],
    eisenNiveau: 'standaard'
  },
  EXC3: {
    naam: 'Uitvoeringsklasse 3',
    beschrijving: 'Hogere eisen voor complexe of kritische constructies',
    typischeToepassingen: [
      'Hoge gebouwen (> 15 verdiepingen)',
      'Stadions en sportaccommodaties',
      'Grote overspanningen',
      'Bruggen (standaard)',
      'Constructies met vermoeiingsbelasting'
    ],
    eisenNiveau: 'hoog'
  },
  EXC4: {
    naam: 'Uitvoeringsklasse 4',
    beschrijving: 'Hoogste eisen voor uitzonderlijke constructies',
    typischeToepassingen: [
      'Nucleaire installaties',
      'Zware bruggen',
      'Platforms (offshore)',
      'Constructies met extreem hoge gevolgen bij falen'
    ],
    eisenNiveau: 'zeer hoog'
  }
}

// ============================================
// GEVOLGKLASSE (EN 1990)
// ============================================

/**
 * Gevolgklasse (CC) - Consequences Class
 * Bepaalt de gevolgen bij falen van de constructie
 */
export type GevolgKlasse = 'CC1' | 'CC2' | 'CC3'

export const GEVOLGKLASSE_INFO: Record<GevolgKlasse, {
  naam: string
  beschrijving: string
  voorbeelden: string[]
  mensenrisico: string
  economischRisico: string
}> = {
  CC1: {
    naam: 'Gevolgklasse 1',
    beschrijving: 'Lage gevolgen voor mensenlevens, kleine economische schade',
    voorbeelden: [
      'Landbouwgebouwen (geen regelmatige aanwezigheid mensen)',
      'Magazijnen',
      'Kassen'
    ],
    mensenrisico: 'Laag',
    economischRisico: 'Klein of verwaarloosbaar'
  },
  CC2: {
    naam: 'Gevolgklasse 2',
    beschrijving: 'Middelgrote gevolgen voor mensenlevens, aanzienlijke economische schade',
    voorbeelden: [
      'Woon- en kantoorgebouwen',
      'Industriegebouwen',
      'Parkeergarages',
      'Meeste gebouwen'
    ],
    mensenrisico: 'Middelgroot',
    economischRisico: 'Aanzienlijk'
  },
  CC3: {
    naam: 'Gevolgklasse 3',
    beschrijving: 'Grote gevolgen voor mensenlevens, zeer grote economische/sociale schade',
    voorbeelden: [
      'Stadions en concerthallen',
      'Hoge gebouwen',
      'Bruggen',
      'Ziekenhuizen',
      'Scholen'
    ],
    mensenrisico: 'Hoog',
    economischRisico: 'Zeer groot'
  }
}

// ============================================
// NTA 8713 HERGEBRUIK ROUTES
// ============================================

/**
 * Hergebruik routes volgens NTA 8713
 * Bepaalt welke route gevolgd moet worden voor hercertificering
 */
export type HergebruikRoute = 
  | 'ROUTE_A'   // Volledige traceerbaarheid, originele certificaten beschikbaar
  | 'ROUTE_B'   // Gedeeltelijke traceerbaarheid, aanvullende testen nodig
  | 'ROUTE_C'   // Geen traceerbaarheid, uitgebreide testprogramma

export interface HergebruikRouteInfo {
  route: HergebruikRoute
  naam: string
  beschrijving: string
  vereisten: string[]
  testenNodig: TestType[]
  kostenIndicatie: 'laag' | 'middel' | 'hoog'
  doorlooptijd: string
  toepasbaarUitvoeringsklassen: UitvoeringsKlasse[]
}

export const HERGEBRUIK_ROUTES: Record<HergebruikRoute, HergebruikRouteInfo> = {
  ROUTE_A: {
    route: 'ROUTE_A',
    naam: 'Route A - Volledige Traceerbaarheid',
    beschrijving: 'Originele materiaalcertificaten (3.1/3.2) en productiedocumentatie beschikbaar',
    vereisten: [
      'Origineel materiaalcertificaat (EN 10204 type 3.1 of 3.2)',
      'CE-markering van oorspronkelijke leverancier',
      'Traceerbaarheid naar smelt (chargennummer)',
      'Productietekeningen of -specificaties',
      'Documentatie van oorspronkelijke toepassing'
    ],
    testenNodig: ['VISUEEL'],
    kostenIndicatie: 'laag',
    doorlooptijd: '1-2 weken',
    toepasbaarUitvoeringsklassen: ['EXC1', 'EXC2', 'EXC3', 'EXC4']
  },
  ROUTE_B: {
    route: 'ROUTE_B',
    naam: 'Route B - Gedeeltelijke Traceerbaarheid',
    beschrijving: 'Gedeeltelijke documentatie beschikbaar, aanvullende testen voor ontbrekende gegevens',
    vereisten: [
      'Staalsoort bekend (bijv. uit tekeningen)',
      'Bouwjaar en oorsprong bekend',
      'Geen volledig materiaalcertificaat',
      'Visuele conditie acceptabel'
    ],
    testenNodig: ['VISUEEL', 'HARDHEID', 'CHEMISCH'],
    kostenIndicatie: 'middel',
    doorlooptijd: '2-4 weken',
    toepasbaarUitvoeringsklassen: ['EXC1', 'EXC2', 'EXC3']
  },
  ROUTE_C: {
    route: 'ROUTE_C',
    naam: 'Route C - Geen Traceerbaarheid',
    beschrijving: 'Geen documentatie beschikbaar, volledig testprogramma vereist',
    vereisten: [
      'Staalsoort onbekend',
      'Geen originele documentatie',
      'Herkomst onbekend of onzeker'
    ],
    testenNodig: ['VISUEEL', 'HARDHEID', 'CHEMISCH', 'TREKPROEF', 'KERFSLAG'],
    kostenIndicatie: 'hoog',
    doorlooptijd: '4-8 weken',
    toepasbaarUitvoeringsklassen: ['EXC1', 'EXC2']
  }
}

// ============================================
// TESTEN EN INSPECTIES
// ============================================

/**
 * Types testen conform NTA 8713
 */
export type TestType = 
  | 'VISUEEL'       // Visuele inspectie (altijd vereist)
  | 'MAATVOERING'   // Controle afmetingen
  | 'HARDHEID'      // Hardheidsmeting (Brinell/Vickers)
  | 'CHEMISCH'      // Chemische analyse (OES/XRF)
  | 'TREKPROEF'     // Trekproef (destructief)
  | 'KERFSLAG'      // Kerfslagproef (Charpy)
  | 'NDO_VT'        // Niet-destructief: Visual Testing
  | 'NDO_MT'        // Niet-destructief: Magnetic Testing
  | 'NDO_PT'        // Niet-destructief: Penetrant Testing
  | 'NDO_UT'        // Niet-destructief: Ultrasonic Testing

export interface TestSpecificatie {
  type: TestType
  naam: string
  beschrijving: string
  norm: string
  kostenIndicatie: number  // € per test
  tijdIndicatie: number    // minuten
  destructief: boolean
  vereistVoor: HergebruikRoute[]
  bepaalt: string[]
}

export const TEST_SPECIFICATIES: Record<TestType, TestSpecificatie> = {
  VISUEEL: {
    type: 'VISUEEL',
    naam: 'Visuele Inspectie',
    beschrijving: 'Visuele beoordeling van conditie, roest, vervormingen, schade',
    norm: 'EN 1090-2 Bijlage F',
    kostenIndicatie: 25,
    tijdIndicatie: 15,
    destructief: false,
    vereistVoor: ['ROUTE_A', 'ROUTE_B', 'ROUTE_C'],
    bepaalt: ['Oppervlakteconditie', 'Zichtbare schade', 'Corrosieklasse']
  },
  MAATVOERING: {
    type: 'MAATVOERING',
    naam: 'Maatvoeringscontrole',
    beschrijving: 'Controle van afmetingen en toleranties conform EN 1090-2',
    norm: 'EN 1090-2 Tabel B.1-B.4',
    kostenIndicatie: 35,
    tijdIndicatie: 20,
    destructief: false,
    vereistVoor: ['ROUTE_A', 'ROUTE_B', 'ROUTE_C'],
    bepaalt: ['Profielafmetingen', 'Rechtheid', 'Verdraaiing']
  },
  HARDHEID: {
    type: 'HARDHEID',
    naam: 'Hardheidsmeting',
    beschrijving: 'Bepaling hardheid ter indicatie van treksterkte (Brinell of Vickers)',
    norm: 'EN ISO 6506 / EN ISO 6507',
    kostenIndicatie: 75,
    tijdIndicatie: 30,
    destructief: false,
    vereistVoor: ['ROUTE_B', 'ROUTE_C'],
    bepaalt: ['Indicatie treksterkte', 'Materiaalconsistentie']
  },
  CHEMISCH: {
    type: 'CHEMISCH',
    naam: 'Chemische Analyse',
    beschrijving: 'Bepaling chemische samenstelling (OES of XRF)',
    norm: 'EN 10025-2',
    kostenIndicatie: 150,
    tijdIndicatie: 45,
    destructief: false,
    vereistVoor: ['ROUTE_B', 'ROUTE_C'],
    bepaalt: ['C-equivalent', 'Staalsoort indicatie', 'Lasbaarheid']
  },
  TREKPROEF: {
    type: 'TREKPROEF',
    naam: 'Trekproef',
    beschrijving: 'Destructieve bepaling mechanische eigenschappen',
    norm: 'EN ISO 6892-1',
    kostenIndicatie: 250,
    tijdIndicatie: 120,
    destructief: true,
    vereistVoor: ['ROUTE_C'],
    bepaalt: ['Vloeigrens Re', 'Treksterkte Rm', 'Rek A']
  },
  KERFSLAG: {
    type: 'KERFSLAG',
    naam: 'Kerfslagproef',
    beschrijving: 'Bepaling taaiheid bij lage temperatuur (Charpy)',
    norm: 'EN ISO 148-1',
    kostenIndicatie: 200,
    tijdIndicatie: 90,
    destructief: true,
    vereistVoor: ['ROUTE_C'],
    bepaalt: ['Kerfslagwaarde', 'Taaiheid bij -20°C']
  },
  NDO_VT: {
    type: 'NDO_VT',
    naam: 'Visual Testing',
    beschrijving: 'Niet-destructief onderzoek lassen - visueel',
    norm: 'EN ISO 17637',
    kostenIndicatie: 40,
    tijdIndicatie: 30,
    destructief: false,
    vereistVoor: ['ROUTE_B', 'ROUTE_C'],
    bepaalt: ['Laskwaliteit visueel', 'Lasgebreken']
  },
  NDO_MT: {
    type: 'NDO_MT',
    naam: 'Magnetic Testing',
    beschrijving: 'Magnetisch onderzoek op oppervlaktescheuren',
    norm: 'EN ISO 17638',
    kostenIndicatie: 80,
    tijdIndicatie: 45,
    destructief: false,
    vereistVoor: ['ROUTE_C'],
    bepaalt: ['Oppervlaktescheuren', 'Lasgebreken']
  },
  NDO_PT: {
    type: 'NDO_PT',
    naam: 'Penetrant Testing',
    beschrijving: 'Penetrant onderzoek op oppervlaktescheuren',
    norm: 'EN ISO 3452-1',
    kostenIndicatie: 70,
    tijdIndicatie: 60,
    destructief: false,
    vereistVoor: ['ROUTE_C'],
    bepaalt: ['Oppervlaktescheuren', 'Porositeit']
  },
  NDO_UT: {
    type: 'NDO_UT',
    naam: 'Ultrasonic Testing',
    beschrijving: 'Ultrasoon onderzoek op inwendige gebreken',
    norm: 'EN ISO 17640',
    kostenIndicatie: 120,
    tijdIndicatie: 60,
    destructief: false,
    vereistVoor: ['ROUTE_C'],
    bepaalt: ['Inwendige gebreken', 'Delaminaties', 'Lasfouten']
  }
}

// ============================================
// CONDITIEBEOORDELING
// ============================================

/**
 * Conditieklasse voor hergebruikelementen
 */
export type ConditieKlasse = 'A' | 'B' | 'C' | 'D'

export const CONDITIE_KLASSEN: Record<ConditieKlasse, {
  naam: string
  beschrijving: string
  roestgraad: string
  toelaatbaar: boolean
  bewerkingNodig: string[]
  prijsMultiplier: number
}> = {
  A: {
    naam: 'Uitstekend',
    beschrijving: 'Minimale verwering, geen significante roest of schade',
    roestgraad: 'A of B (EN ISO 8501-1)',
    toelaatbaar: true,
    bewerkingNodig: ['Licht reinigen'],
    prijsMultiplier: 1.0
  },
  B: {
    naam: 'Goed',
    beschrijving: 'Lichte oppervlakteroest, geen putcorrosie',
    roestgraad: 'B of C (EN ISO 8501-1)',
    toelaatbaar: true,
    bewerkingNodig: ['Stralen SA 2.5', 'Conservering'],
    prijsMultiplier: 0.85
  },
  C: {
    naam: 'Matig',
    beschrijving: 'Matige roest, lichte putcorrosie, nog bruikbaar',
    roestgraad: 'C of D (EN ISO 8501-1)',
    toelaatbaar: true,
    bewerkingNodig: ['Stralen SA 2.5', 'Plaatselijke reparatie', 'Conservering'],
    prijsMultiplier: 0.65
  },
  D: {
    naam: 'Slecht',
    beschrijving: 'Zware corrosie, significante materiaalaantasting',
    roestgraad: 'D (EN ISO 8501-1)',
    toelaatbaar: false,
    bewerkingNodig: ['Niet geschikt voor constructief hergebruik'],
    prijsMultiplier: 0.20 // Alleen schrootwaarde
  }
}

// ============================================
// NTA 8713 CERTIFICAAT
// ============================================

/**
 * NTA 8713 Hergebruikcertificaat
 */
export interface NTA8713Certificaat {
  // Identificatie
  certificaatNummer: string
  elementId: string
  afgifteDatum: string
  geldigTot: string
  certificerendeInstantie: string
  
  // Materiaal
  materiaal: {
    staalsoort: StaalSoort
    kerfslagKlasse: KerfslagKlasse
    leveringsConditie: LeveringsConditie
    dikte: number           // mm
    geverifieerd: boolean   // Door test of document
  }
  
  // Hergebruik classificatie
  hergebruik: {
    route: HergebruikRoute
    conditieKlasse: ConditieKlasse
    gevolgKlasse: GevolgKlasse
    uitvoeringsKlasse: UitvoeringsKlasse
    maximaalToelaatbaar: UitvoeringsKlasse  // Hoogste EXC waarvoor geschikt
  }
  
  // Oorsprong
  oorsprong: {
    gebouwNaam: string
    adres: string
    bouwjaar: number
    oorspronkelijkeToepassing: string
    demontageDatum: string
  }
  
  // Documentatie
  documentatie: {
    origineleCertificaten: boolean
    productietekeningen: boolean
    traceerbaarheid: 'volledig' | 'gedeeltelijk' | 'geen'
  }
  
  // Uitgevoerde testen
  testen: {
    uitgevoerd: TestType[]
    resultaten: TestResultaat[]
    voldoet: boolean
  }
  
  // Toegestane toepassing
  toepassing: {
    constructief: boolean
    maximaleGevolgKlasse: GevolgKlasse
    maximaleUitvoeringsKlasse: UitvoeringsKlasse
    beperkingen: string[]
  }
}

export interface TestResultaat {
  testType: TestType
  datum: string
  laboratorium: string
  resultaat: string
  voldoet: boolean
  normWaarde?: string
  gemeten?: string
}

// ============================================
// PRIJSBEREKENING NTA 8713
// ============================================

export interface NTA8713Kostenoverzicht {
  // Testen
  testenKosten: {
    items: { test: TestType; kosten: number }[]
    totaal: number
  }
  
  // Certificering
  certificeringKosten: {
    beoordeling: number
    documentatie: number
    certificaat: number
    totaal: number
  }
  
  // Impact op verkoopprijs
  prijsImpact: {
    basisPrijs: number          // Nieuwwaarde equivalent
    routeKorting: number        // % korting door route
    conditieKorting: number     // % korting door conditie
    excBonusMalus: number       // Bonus/malus door EXC klasse
    nettoPrijs: number
  }
  
  totaalKosten: number
  nettoWaarde: number           // Verkoopprijs - kosten
}

// ============================================
// HELPER FUNCTIES
// ============================================

/**
 * Bepaal de hergebruikroute op basis van beschikbare documentatie
 */
export function bepaalHergebruikRoute(
  heeftOrigineleCertificaten: boolean,
  heeftTekeningen: boolean,
  staalsoortBekend: boolean,
  bouwjaarBekend: boolean
): HergebruikRoute {
  if (heeftOrigineleCertificaten && heeftTekeningen) {
    return 'ROUTE_A'
  }
  if (staalsoortBekend && bouwjaarBekend) {
    return 'ROUTE_B'
  }
  return 'ROUTE_C'
}

/**
 * Bepaal maximaal toegestane uitvoeringsklasse op basis van route en conditie
 */
export function bepaalMaximaleEXC(
  route: HergebruikRoute,
  conditie: ConditieKlasse
): UitvoeringsKlasse {
  if (conditie === 'D') return 'EXC1' // Alleen niet-constructief
  
  switch (route) {
    case 'ROUTE_A':
      return conditie === 'A' ? 'EXC4' : 'EXC3'
    case 'ROUTE_B':
      return conditie === 'A' ? 'EXC3' : 'EXC2'
    case 'ROUTE_C':
      return 'EXC2' // Maximaal EXC2 voor Route C
    default:
      return 'EXC1'
  }
}

/**
 * Bereken certificeringskosten
 */
export function berekenCertificeringsKosten(
  route: HergebruikRoute,
  aantalElementen: number
): NTA8713Kostenoverzicht['certificeringKosten'] {
  const basisKosten = {
    ROUTE_A: { beoordeling: 150, documentatie: 50, certificaat: 100 },
    ROUTE_B: { beoordeling: 300, documentatie: 100, certificaat: 150 },
    ROUTE_C: { beoordeling: 500, documentatie: 150, certificaat: 200 }
  }
  
  const kosten = basisKosten[route]
  
  // Volume korting bij meer elementen
  const volumeKorting = aantalElementen > 10 ? 0.8 : aantalElementen > 5 ? 0.9 : 1.0
  
  return {
    beoordeling: Math.round(kosten.beoordeling * volumeKorting),
    documentatie: Math.round(kosten.documentatie * volumeKorting),
    certificaat: Math.round(kosten.certificaat * volumeKorting),
    totaal: Math.round((kosten.beoordeling + kosten.documentatie + kosten.certificaat) * volumeKorting)
  }
}

/**
 * Bereken testkosten voor een route
 */
export function berekenTestKosten(route: HergebruikRoute): NTA8713Kostenoverzicht['testenKosten'] {
  const routeInfo = HERGEBRUIK_ROUTES[route]
  const items = routeInfo.testenNodig.map(testType => ({
    test: testType,
    kosten: TEST_SPECIFICATIES[testType].kostenIndicatie
  }))
  
  return {
    items,
    totaal: items.reduce((sum, item) => sum + item.kosten, 0)
  }
}

/**
 * Bepaal staalsoort op basis van bouwjaar (indicatie)
 */
export function schatStaalsoortOpBouwjaar(bouwjaar: number): StaalSoort {
  // Voor 1970: Vaak St37 (≈ S235)
  // 1970-1990: Mix van S235/S275
  // 1990-2005: Voornamelijk S235/S275, soms S355
  // Na 2005: Meer S355, EN normen
  
  if (bouwjaar < 1970) return 'S235'
  if (bouwjaar < 1990) return 'S235' // Conservatief
  if (bouwjaar < 2005) return 'S275'
  return 'S355'
}

/**
 * Bepaal prijsmultiplier op basis van NTA 8713 classificatie
 */
export function berekenPrijsMultiplier(
  route: HergebruikRoute,
  conditie: ConditieKlasse,
  maximaleEXC: UitvoeringsKlasse
): number {
  // Basis: conditie
  let multiplier = CONDITIE_KLASSEN[conditie].prijsMultiplier
  
  // Route impact
  const routeMultiplier = {
    ROUTE_A: 1.0,   // Volledige waarde
    ROUTE_B: 0.90,  // 10% korting
    ROUTE_C: 0.75   // 25% korting
  }
  multiplier *= routeMultiplier[route]
  
  // EXC bonus (hogere klasse = meer waarde)
  const excBonus = {
    EXC1: 0.70,
    EXC2: 0.85,
    EXC3: 1.0,
    EXC4: 1.10
  }
  multiplier *= excBonus[maximaleEXC]
  
  return Math.round(multiplier * 100) / 100
}
