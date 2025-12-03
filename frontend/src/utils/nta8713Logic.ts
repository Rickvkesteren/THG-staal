/**
 * NTA 8713 Certificeringslogica
 * Volledige implementatie van het certificeringsproces
 */

import type {
  StaalSoort,
  KerfslagKlasse,
  UitvoeringsKlasse,
  GevolgKlasse,
  HergebruikRoute,
  ConditieKlasse,
  TestType,
  NTA8713Certificaat,
  TestResultaat,
  NTA8713Kostenoverzicht
} from '../types/nta8713'

import {
  HERGEBRUIK_ROUTES,
  TEST_SPECIFICATIES,
  CONDITIE_KLASSEN,
  bepaalHergebruikRoute,
  bepaalMaximaleEXC,
  berekenCertificeringsKosten,
  berekenTestKosten,
  schatStaalsoortOpBouwjaar,
  berekenPrijsMultiplier
} from '../types/nta8713'

// ============================================
// ELEMENT BEOORDELING
// ============================================

export interface ElementInspectieData {
  // Identificatie
  elementId: string
  profielType: string
  lengte: number
  gewicht: number
  
  // Oorsprong
  gebouwNaam: string
  adres: string
  bouwjaar: number
  demontageDatum: string
  oorspronkelijkeToepassing: 'kolom' | 'ligger' | 'gordel' | 'spant' | 'ligger_dak' | 'overig'
  
  // Beschikbare documentatie
  documentatie: {
    heeftMateriaalCertificaat: boolean
    certificaatType?: '2.1' | '2.2' | '3.1' | '3.2'
    heeftProductietekeningen: boolean
    staalsoortVermeld?: StaalSoort
    chargeNummerBekend: boolean
    ceMarkeringAanwezig: boolean
  }
  
  // Visuele inspectie
  visueleInspectie: {
    roestgraad: 'A' | 'B' | 'C' | 'D'
    putcorrosie: boolean
    putcorrosieDiepte?: number  // mm
    vervormingen: boolean
    vervormingsType?: string
    schade: 'geen' | 'licht' | 'matig' | 'zwaar'
    lassenAanwezig: boolean
    lassenConditie?: 'goed' | 'matig' | 'slecht'
    coatingAanwezig: boolean
    coatingConditie?: 'intact' | 'beschadigd' | 'afwezig'
  }
  
  // Afmetingen (gemeten)
  afmetingen: {
    hoogte: number
    breedte: number
    flensDikte: number
    lijfDikte: number
    tolerantieOK: boolean
  }
}

export interface NTA8713BeoordelingResultaat {
  // Route bepaling
  route: HergebruikRoute
  routeToelichting: string
  
  // Conditie
  conditieKlasse: ConditieKlasse
  conditieToelichting: string
  
  // Maximale toepassing
  maximaleGevolgKlasse: GevolgKlasse
  maximaleUitvoeringsKlasse: UitvoeringsKlasse
  
  // Vereiste testen
  vereisteTests: TestType[]
  geschatteTestKosten: number
  geschatteTestTijd: number  // minuten
  
  // Materiaal schatting
  geschatteStaalsoort: StaalSoort
  staalsoortBetrouwbaarheid: 'hoog' | 'middel' | 'laag'
  
  // Certificeerbaarheid
  certificeerbaar: boolean
  certificeerbaarToelichting: string
  beperkingen: string[]
  
  // Kosten/opbrengsten
  certificeringsKosten: number
  prijsMultiplier: number
  geschatteVerkoopwaarde: number
}

/**
 * Voer NTA 8713 beoordeling uit op een element
 */
export function voerNTA8713BeoordelingUit(
  data: ElementInspectieData,
  nieuwprijsPerKg: number = 2.50
): NTA8713BeoordelingResultaat {
  
  // 1. Bepaal hergebruik route
  const heeftOrigineleCertificaten = 
    data.documentatie.heeftMateriaalCertificaat && 
    (data.documentatie.certificaatType === '3.1' || data.documentatie.certificaatType === '3.2')
  
  const route = bepaalHergebruikRoute(
    heeftOrigineleCertificaten,
    data.documentatie.heeftProductietekeningen,
    data.documentatie.staalsoortVermeld !== undefined,
    data.bouwjaar !== undefined
  )
  
  const routeToelichting = genereerRouteToelichting(data, route)
  
  // 2. Bepaal conditieklasse
  const conditieKlasse = bepaalConditieKlasse(data.visueleInspectie)
  const conditieToelichting = genereerConditieToelichting(data.visueleInspectie, conditieKlasse)
  
  // 3. Bepaal maximale uitvoeringsklasse
  const maximaleUitvoeringsKlasse = bepaalMaximaleEXC(route, conditieKlasse)
  
  // 4. Bepaal maximale gevolgklasse
  const maximaleGevolgKlasse = bepaalMaximaleGevolgKlasse(route, conditieKlasse)
  
  // 5. Bepaal vereiste testen
  const vereisteTests = bepaalVereisteTests(route, data.visueleInspectie, data.documentatie)
  const testKosten = vereisteTests.reduce(
    (sum, test) => sum + TEST_SPECIFICATIES[test].kostenIndicatie, 
    0
  )
  const testTijd = vereisteTests.reduce(
    (sum, test) => sum + TEST_SPECIFICATIES[test].tijdIndicatie, 
    0
  )
  
  // 6. Schat staalsoort
  const { geschatteStaalsoort, betrouwbaarheid } = schatStaalsoort(data)
  
  // 7. Bepaal certificeerbaarheid
  const { certificeerbaar, toelichting, beperkingen } = 
    bepaalCertificeerbaarheid(conditieKlasse, route, data)
  
  // 8. Bereken kosten en waarde
  const certificeringsKosten = berekenCertificeringsKosten(route, 1).totaal + testKosten
  const prijsMultiplier = berekenPrijsMultiplier(route, conditieKlasse, maximaleUitvoeringsKlasse)
  const nieuwwaarde = data.gewicht * nieuwprijsPerKg
  const geschatteVerkoopwaarde = Math.round(nieuwwaarde * prijsMultiplier)
  
  return {
    route,
    routeToelichting,
    conditieKlasse,
    conditieToelichting,
    maximaleGevolgKlasse,
    maximaleUitvoeringsKlasse,
    vereisteTests,
    geschatteTestKosten: testKosten,
    geschatteTestTijd: testTijd,
    geschatteStaalsoort,
    staalsoortBetrouwbaarheid: betrouwbaarheid,
    certificeerbaar,
    certificeerbaarToelichting: toelichting,
    beperkingen,
    certificeringsKosten,
    prijsMultiplier,
    geschatteVerkoopwaarde
  }
}

/**
 * Bepaal conditieklasse op basis van visuele inspectie
 */
function bepaalConditieKlasse(
  inspectie: ElementInspectieData['visueleInspectie']
): ConditieKlasse {
  // Automatisch klasse D bij zware schade
  if (inspectie.schade === 'zwaar') return 'D'
  if (inspectie.putcorrosie && (inspectie.putcorrosieDiepte ?? 0) > 2) return 'D'
  if (inspectie.roestgraad === 'D') return 'D'
  
  // Klasse C bij matige problemen
  if (inspectie.schade === 'matig') return 'C'
  if (inspectie.putcorrosie) return 'C'
  if (inspectie.roestgraad === 'C') return 'C'
  if (inspectie.vervormingen) return 'C'
  if (inspectie.lassenConditie === 'slecht') return 'C'
  
  // Klasse B bij lichte problemen
  if (inspectie.schade === 'licht') return 'B'
  if (inspectie.roestgraad === 'B') return 'B'
  if (inspectie.lassenConditie === 'matig') return 'B'
  if (inspectie.coatingConditie === 'beschadigd') return 'B'
  
  // Klasse A alleen bij uitstekende conditie
  return 'A'
}

/**
 * Bepaal maximale gevolgklasse
 */
function bepaalMaximaleGevolgKlasse(
  route: HergebruikRoute,
  conditie: ConditieKlasse
): GevolgKlasse {
  if (conditie === 'D') return 'CC1'
  
  switch (route) {
    case 'ROUTE_A':
      return conditie === 'A' ? 'CC3' : 'CC2'
    case 'ROUTE_B':
      return 'CC2'
    case 'ROUTE_C':
      return conditie === 'A' ? 'CC2' : 'CC1'
    default:
      return 'CC1'
  }
}

/**
 * Bepaal vereiste tests
 */
function bepaalVereisteTests(
  route: HergebruikRoute,
  inspectie: ElementInspectieData['visueleInspectie'],
  documentatie: ElementInspectieData['documentatie']
): TestType[] {
  const tests: TestType[] = ['VISUEEL', 'MAATVOERING']
  
  // Route-specifieke tests
  const routeTests = HERGEBRUIK_ROUTES[route].testenNodig
  routeTests.forEach(test => {
    if (!tests.includes(test)) tests.push(test)
  })
  
  // Extra tests bij lassen
  if (inspectie.lassenAanwezig) {
    if (!tests.includes('NDO_VT')) tests.push('NDO_VT')
    if (inspectie.lassenConditie !== 'goed') {
      tests.push('NDO_MT')
    }
  }
  
  // Extra tests bij onbekende staalsoort
  if (!documentatie.staalsoortVermeld && !tests.includes('CHEMISCH')) {
    tests.push('CHEMISCH')
  }
  
  return tests
}

/**
 * Schat staalsoort
 */
function schatStaalsoort(data: ElementInspectieData): {
  geschatteStaalsoort: StaalSoort
  betrouwbaarheid: 'hoog' | 'middel' | 'laag'
} {
  // Als staalsoort gedocumenteerd is
  if (data.documentatie.staalsoortVermeld) {
    return {
      geschatteStaalsoort: data.documentatie.staalsoortVermeld,
      betrouwbaarheid: data.documentatie.heeftMateriaalCertificaat ? 'hoog' : 'middel'
    }
  }
  
  // Schat op basis van bouwjaar
  const geschat = schatStaalsoortOpBouwjaar(data.bouwjaar)
  return {
    geschatteStaalsoort: geschat,
    betrouwbaarheid: 'laag'
  }
}

/**
 * Bepaal certificeerbaarheid
 */
function bepaalCertificeerbaarheid(
  conditie: ConditieKlasse,
  route: HergebruikRoute,
  data: ElementInspectieData
): { certificeerbaar: boolean; toelichting: string; beperkingen: string[] } {
  const beperkingen: string[] = []
  
  // Niet certificeerbaar bij conditie D
  if (conditie === 'D') {
    return {
      certificeerbaar: false,
      toelichting: 'Element niet geschikt voor constructief hergebruik door zware corrosie of schade',
      beperkingen: ['Alleen geschikt voor recycling als schroot']
    }
  }
  
  // Beperkingen bepalen
  if (route === 'ROUTE_C') {
    beperkingen.push('Maximaal EXC2 toepassingen')
    beperkingen.push('Uitgebreide testprogramma vereist')
  }
  
  if (conditie === 'C') {
    beperkingen.push('Plaatselijke reparatie nodig')
    beperkingen.push('Stralen en conservering verplicht')
  }
  
  if (!data.afmetingen.tolerantieOK) {
    beperkingen.push('Afwijkende toleranties - check toepassingseisen')
  }
  
  if (data.visueleInspectie.vervormingen) {
    beperkingen.push('Vervormingen aanwezig - richten of aanpassen lengte')
  }
  
  return {
    certificeerbaar: true,
    toelichting: `Element geschikt voor hergebruik via ${HERGEBRUIK_ROUTES[route].naam}`,
    beperkingen
  }
}

/**
 * Genereer route toelichting
 */
function genereerRouteToelichting(
  data: ElementInspectieData,
  route: HergebruikRoute
): string {
  switch (route) {
    case 'ROUTE_A':
      return 'Volledige documentatie beschikbaar. Originele materiaalcertificaten en traceerbaarheid aanwezig. Minimale aanvullende testen nodig.'
    case 'ROUTE_B':
      return `Staalsoort ${data.documentatie.staalsoortVermeld || 'indicatief'} bekend. Aanvullende chemische analyse en hardheidstest vereist ter verificatie.`
    case 'ROUTE_C':
      return 'Geen betrouwbare documentatie beschikbaar. Volledig testprogramma vereist inclusief trekproef en kerfslagproef.'
    default:
      return ''
  }
}

/**
 * Genereer conditie toelichting
 */
function genereerConditieToelichting(
  inspectie: ElementInspectieData['visueleInspectie'],
  conditie: ConditieKlasse
): string {
  const bevindingen: string[] = []
  
  bevindingen.push(`Roestgraad: ${inspectie.roestgraad}`)
  
  if (inspectie.putcorrosie) {
    bevindingen.push(`Putcorrosie aanwezig (diepte: ${inspectie.putcorrosieDiepte || '?'} mm)`)
  }
  
  if (inspectie.vervormingen) {
    bevindingen.push(`Vervormingen: ${inspectie.vervormingsType || 'ja'}`)
  }
  
  if (inspectie.schade !== 'geen') {
    bevindingen.push(`Schade: ${inspectie.schade}`)
  }
  
  if (inspectie.lassenAanwezig) {
    bevindingen.push(`Lassen: ${inspectie.lassenConditie}`)
  }
  
  const conditieInfo = CONDITIE_KLASSEN[conditie]
  return `${conditieInfo.naam}: ${bevindingen.join('. ')}. Bewerking nodig: ${conditieInfo.bewerkingNodig.join(', ')}.`
}

// ============================================
// CERTIFICAAT GENERATIE
// ============================================

/**
 * Genereer NTA 8713 certificaat
 */
export function genereerNTA8713Certificaat(
  data: ElementInspectieData,
  beoordeling: NTA8713BeoordelingResultaat,
  testResultaten: TestResultaat[],
  certificerendeInstantie: string = 'SteelCert Nederland B.V.'
): NTA8713Certificaat {
  
  const now = new Date()
  const geldigTot = new Date(now)
  geldigTot.setFullYear(geldigTot.getFullYear() + 5) // 5 jaar geldig
  
  // Genereer certificaatnummer
  const certificaatNummer = genereerCertificaatNummer(data.elementId)
  
  // Check of alle testen voldoen
  const alleTestenOK = testResultaten.every(r => r.voldoet)
  
  return {
    certificaatNummer,
    elementId: data.elementId,
    afgifteDatum: now.toISOString().split('T')[0],
    geldigTot: geldigTot.toISOString().split('T')[0],
    certificerendeInstantie,
    
    materiaal: {
      staalsoort: beoordeling.geschatteStaalsoort,
      kerfslagKlasse: bepaalKerfslagKlasse(data.bouwjaar),
      leveringsConditie: 'AR',
      dikte: data.afmetingen.flensDikte,
      geverifieerd: beoordeling.route === 'ROUTE_A' || testResultaten.some(t => t.testType === 'CHEMISCH')
    },
    
    hergebruik: {
      route: beoordeling.route,
      conditieKlasse: beoordeling.conditieKlasse,
      gevolgKlasse: beoordeling.maximaleGevolgKlasse,
      uitvoeringsKlasse: beoordeling.maximaleUitvoeringsKlasse,
      maximaalToelaatbaar: beoordeling.maximaleUitvoeringsKlasse
    },
    
    oorsprong: {
      gebouwNaam: data.gebouwNaam,
      adres: data.adres,
      bouwjaar: data.bouwjaar,
      oorspronkelijkeToepassing: data.oorspronkelijkeToepassing,
      demontageDatum: data.demontageDatum
    },
    
    documentatie: {
      origineleCertificaten: data.documentatie.heeftMateriaalCertificaat && 
        (data.documentatie.certificaatType === '3.1' || data.documentatie.certificaatType === '3.2'),
      productietekeningen: data.documentatie.heeftProductietekeningen,
      traceerbaarheid: beoordeling.route === 'ROUTE_A' ? 'volledig' : 
        beoordeling.route === 'ROUTE_B' ? 'gedeeltelijk' : 'geen'
    },
    
    testen: {
      uitgevoerd: testResultaten.map(r => r.testType),
      resultaten: testResultaten,
      voldoet: alleTestenOK
    },
    
    toepassing: {
      constructief: beoordeling.certificeerbaar && alleTestenOK,
      maximaleGevolgKlasse: beoordeling.maximaleGevolgKlasse,
      maximaleUitvoeringsKlasse: beoordeling.maximaleUitvoeringsKlasse,
      beperkingen: beoordeling.beperkingen
    }
  }
}

/**
 * Genereer certificaatnummer
 */
function genereerCertificaatNummer(elementId: string): string {
  const now = new Date()
  const jaar = now.getFullYear()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `NTA8713-${jaar}-${random}-${elementId.slice(-4)}`
}

/**
 * Bepaal kerfslagklasse op basis van bouwjaar
 */
function bepaalKerfslagKlasse(bouwjaar: number): KerfslagKlasse {
  // Oudere constructies: conservatief JR aannemen
  if (bouwjaar < 1980) return 'JR'
  if (bouwjaar < 2000) return 'J0'
  return 'J2'
}

// ============================================
// BATCH CERTIFICERING
// ============================================

/**
 * Groepeer elementen voor batch certificering
 * Elementen met dezelfde kenmerken kunnen samen gecertificeerd worden
 */
export function groepeerVoorBatchCertificering(
  elementen: ElementInspectieData[]
): Map<string, ElementInspectieData[]> {
  const groepen = new Map<string, ElementInspectieData[]>()
  
  for (const element of elementen) {
    // Creëer groepssleutel op basis van gemeenschappelijke kenmerken
    const sleutel = [
      element.profielType,
      element.bouwjaar,
      element.documentatie.staalsoortVermeld || 'ONBEKEND',
      element.visueleInspectie.roestgraad,
      element.gebouwNaam
    ].join('|')
    
    if (!groepen.has(sleutel)) {
      groepen.set(sleutel, [])
    }
    groepen.get(sleutel)!.push(element)
  }
  
  return groepen
}

/**
 * Bereken batch certificeringskosten (met volumekorting)
 */
export function berekenBatchKosten(
  elementen: ElementInspectieData[],
  route: HergebruikRoute
): {
  individueleKosten: number
  batchKosten: number
  besparing: number
  kostenPerElement: number
} {
  const aantalElementen = elementen.length
  
  // Individuele kosten (zonder korting)
  const testKostenPerElement = berekenTestKosten(route).totaal
  const certKosten = berekenCertificeringsKosten(route, 1).totaal
  const individueleKosten = (testKostenPerElement + certKosten) * aantalElementen
  
  // Batch kosten (met volume korting)
  // Testen: eerste element vol tarief, daarna 50% voor vergelijkbare elementen
  const batchTestKosten = testKostenPerElement + (testKostenPerElement * 0.5 * (aantalElementen - 1))
  
  // Certificering: volume korting
  const batchCertKosten = berekenCertificeringsKosten(route, aantalElementen).totaal * aantalElementen
  
  const batchKosten = batchTestKosten + batchCertKosten
  
  return {
    individueleKosten: Math.round(individueleKosten),
    batchKosten: Math.round(batchKosten),
    besparing: Math.round(individueleKosten - batchKosten),
    kostenPerElement: Math.round(batchKosten / aantalElementen)
  }
}

// ============================================
// VOLLEDIG KOSTEN OVERZICHT
// ============================================

/**
 * Genereer volledig kostenoverzicht voor NTA 8713 certificering
 */
export function genereerNTA8713Kostenoverzicht(
  data: ElementInspectieData,
  beoordeling: NTA8713BeoordelingResultaat,
  nieuwprijsPerKg: number = 2.50
): NTA8713Kostenoverzicht {
  
  const testenKosten = berekenTestKosten(beoordeling.route)
  const certificeringKosten = berekenCertificeringsKosten(beoordeling.route, 1)
  
  // Prijsberekening
  const basisPrijs = data.gewicht * nieuwprijsPerKg
  
  const routeKortingPercentages = { ROUTE_A: 0, ROUTE_B: 10, ROUTE_C: 25 }
  const routeKorting = routeKortingPercentages[beoordeling.route]
  
  const conditieKorting = (1 - CONDITIE_KLASSEN[beoordeling.conditieKlasse].prijsMultiplier) * 100
  
  const excBonusMalusPercentages: Record<UitvoeringsKlasse, number> = {
    EXC1: -15,
    EXC2: -5,
    EXC3: 0,
    EXC4: 10
  }
  const excBonusMalus = excBonusMalusPercentages[beoordeling.maximaleUitvoeringsKlasse]
  
  const totaalKorting = routeKorting + conditieKorting - excBonusMalus
  const nettoPrijs = Math.round(basisPrijs * (1 - totaalKorting / 100))
  
  const totaalKosten = testenKosten.totaal + certificeringKosten.totaal
  
  return {
    testenKosten,
    certificeringKosten,
    prijsImpact: {
      basisPrijs: Math.round(basisPrijs),
      routeKorting,
      conditieKorting: Math.round(conditieKorting),
      excBonusMalus,
      nettoPrijs
    },
    totaalKosten,
    nettoWaarde: nettoPrijs - totaalKosten
  }
}

// ============================================
// RAPPORT GENERATIE
// ============================================

export interface NTA8713Rapport {
  titel: string
  datum: string
  samenvatting: string
  elementen: {
    data: ElementInspectieData
    beoordeling: NTA8713BeoordelingResultaat
    kosten: NTA8713Kostenoverzicht
  }[]
  totalen: {
    aantalElementen: number
    totaalGewicht: number
    totaalTestKosten: number
    totaalCertificeringsKosten: number
    totaalKosten: number
    geschatteOpbrengst: number
    nettoResultaat: number
  }
  aanbevelingen: string[]
}

/**
 * Genereer NTA 8713 inspectierapport
 */
export function genereerNTA8713Rapport(
  gebouwNaam: string,
  elementen: { data: ElementInspectieData; beoordeling: NTA8713BeoordelingResultaat }[]
): NTA8713Rapport {
  
  const elementenMetKosten = elementen.map(e => ({
    ...e,
    kosten: genereerNTA8713Kostenoverzicht(e.data, e.beoordeling)
  }))
  
  const totalen = {
    aantalElementen: elementen.length,
    totaalGewicht: elementen.reduce((sum, e) => sum + e.data.gewicht, 0),
    totaalTestKosten: elementenMetKosten.reduce((sum, e) => sum + e.kosten.testenKosten.totaal, 0),
    totaalCertificeringsKosten: elementenMetKosten.reduce((sum, e) => sum + e.kosten.certificeringKosten.totaal, 0),
    totaalKosten: elementenMetKosten.reduce((sum, e) => sum + e.kosten.totaalKosten, 0),
    geschatteOpbrengst: elementenMetKosten.reduce((sum, e) => sum + e.kosten.prijsImpact.nettoPrijs, 0),
    nettoResultaat: 0
  }
  totalen.nettoResultaat = totalen.geschatteOpbrengst - totalen.totaalKosten
  
  // Genereer aanbevelingen
  const aanbevelingen: string[] = []
  
  const routeVerdeling = new Map<HergebruikRoute, number>()
  elementen.forEach(e => {
    const count = routeVerdeling.get(e.beoordeling.route) || 0
    routeVerdeling.set(e.beoordeling.route, count + 1)
  })
  
  if ((routeVerdeling.get('ROUTE_C') || 0) > elementen.length * 0.3) {
    aanbevelingen.push('Meer dan 30% van de elementen vereist Route C (volledig testprogramma). Overweeg of originele documentatie nog te achterhalen is om kosten te besparen.')
  }
  
  const conditieD = elementen.filter(e => e.beoordeling.conditieKlasse === 'D').length
  if (conditieD > 0) {
    aanbevelingen.push(`${conditieD} element(en) niet geschikt voor constructief hergebruik (conditie D). Deze kunnen als schroot worden verwerkt.`)
  }
  
  const goedkeurbaar = elementen.filter(e => e.beoordeling.certificeerbaar).length
  if (goedkeurbaar === elementen.length) {
    aanbevelingen.push('Alle elementen zijn geschikt voor NTA 8713 certificering.')
  }
  
  // Batch certificering advies
  if (elementen.length > 5) {
    aanbevelingen.push('Overweeg batch certificering voor vergelijkbare elementen om kosten te besparen.')
  }
  
  return {
    titel: `NTA 8713 Inspectie & Beoordelingsrapport - ${gebouwNaam}`,
    datum: new Date().toISOString().split('T')[0],
    samenvatting: `Beoordeling van ${elementen.length} stalen constructie-elementen conform NTA 8713. Totaal gewicht: ${Math.round(totalen.totaalGewicht)} kg. Geschatte netto opbrengst: €${totalen.nettoResultaat.toLocaleString('nl-NL')}.`,
    elementen: elementenMetKosten,
    totalen,
    aanbevelingen
  }
}
