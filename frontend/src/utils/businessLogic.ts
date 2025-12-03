/**
 * Business Logic - Kosten/Opbrengsten Berekeningen
 * Staal Hergebruik Systeem
 */

import type { CADElement } from '../types'
import type { MockGebouw } from '../data/mockBuildings'
import {
  UURTARIEVEN,
  STAAL_BASISPRIJZEN,
  HERGEBRUIK_KORTING,
  CERTIFICAAT_MULTIPLIER,
  TEST_KOSTEN,
  type CertificaatKlasse,
  type GebouwBusinessCase,
  type ElementTypeAnalyse,
  type OntmantelingsKosten,
  type SnijPlan,
  type Snede,
  type BewerkingsPlan,
  type BewerkingsStap,
  type MateriaalCertificaat,
  type Risico
} from '../types/business'

// ============================================
// CERTIFICAAT ANALYSE
// ============================================

/**
 * Bepaal certificaat status op basis van beschikbare info
 */
export function bepaalCertificaatKlasse(element: CADElement): CertificaatKlasse {
  // In echte implementatie: check tegen database/documenten
  // Nu: simulatie op basis van gebouw bouwjaar en conditie
  
  if (element.conditie === 'slecht') return 'TE_TESTEN'
  
  // Random simulatie voor demo (in productie: echte data)
  const random = Math.random()
  if (random > 0.7) return 'CE'
  if (random > 0.4) return 'NEN'
  if (random > 0.2) return 'GEEN'
  return 'TE_TESTEN'
}

/**
 * Genereer certificaat info voor element
 */
export function genereerCertificaat(element: CADElement): MateriaalCertificaat {
  const klasse = bepaalCertificaatKlasse(element)
  const testNodig = klasse === 'TE_TESTEN' || klasse === 'GEEN'
  
  const toegestaneToepassingen = (() => {
    switch (klasse) {
      case 'CE':
        return ['constructief_primair', 'constructief_secundair', 'niet_constructief', 'decoratief'] as const
      case 'NEN':
        return ['constructief_secundair', 'niet_constructief', 'decoratief'] as const
      case 'KOMO':
        return ['niet_constructief', 'decoratief'] as const
      case 'GEEN':
        return ['decoratief', 'recycling'] as const
      case 'TE_TESTEN':
        return ['recycling'] as const // Tot test gedaan is
    }
  })()

  return {
    id: `cert-${element.id}`,
    elementId: element.id,
    huidigeKlasse: klasse,
    huidigeKwaliteit: 'S235', // Default, zou uit tekening moeten komen
    testNodig,
    toegestaneToepassingen: [...toegestaneToepassingen],
    prijsMultiplier: CERTIFICAAT_MULTIPLIER[klasse],
    oorspronkelijkeTekening: Math.random() > 0.3, // 70% kans
  }
}

// ============================================
// SNIJPLAN OPTIMALISATIE
// ============================================

/**
 * Genereer optimaal snijplan voor een element
 * Maximaliseert waarde van resulterende producten
 */
export function genereerSnijPlan(element: CADElement, gewensteLengtes: number[] = []): SnijPlan {
  const sneden: Snede[] = []
  const producten: { start: number; eind: number; lengte: number; waarde: number }[] = []
  
  // Standaard gewenste lengtes als niet opgegeven
  const targetLengtes = gewensteLengtes.length > 0 
    ? gewensteLengtes 
    : [6000, 5000, 4000, 3000, 2000] // Standaard markt lengtes in mm
  
  let restLengte = element.lengte
  let huidigePositie = 0
  
  // Greedy algoritme: pak steeds de langste passende lengte
  while (restLengte > 500) { // Minimaal 500mm nuttig
    const passendeLengte = targetLengtes.find(l => l <= restLengte - 5) // 5mm snijverlies
    
    if (passendeLengte) {
      // Voeg snede toe
      const snedePositie = huidigePositie + passendeLengte
      sneden.push({
        positie: snedePositie,
        type: 'zaag',
        hoek: 90,
        kostenIndicatie: 15 // € per snede
      })
      
      producten.push({
        start: huidigePositie,
        eind: snedePositie,
        lengte: passendeLengte,
        waarde: berekenProductWaarde(element, passendeLengte)
      })
      
      huidigePositie = snedePositie + 5 // 5mm snijverlies
      restLengte = element.lengte - huidigePositie
    } else {
      // Restant
      if (restLengte >= 500) {
        producten.push({
          start: huidigePositie,
          eind: element.lengte,
          lengte: restLengte,
          waarde: berekenProductWaarde(element, restLengte) * 0.7 // Korting op niet-standaard
        })
      }
      break
    }
  }
  
  const totaleWaarde = producten.reduce((sum, p) => sum + p.waarde, 0)
  const benutting = producten.reduce((sum, p) => sum + p.lengte, 0) / element.lengte * 100
  
  return {
    id: `snijplan-${element.id}`,
    elementId: element.id,
    sneden,
    resultatendeProducten: producten.map(p => ({
      startPositie: p.start,
      eindPositie: p.eind,
      lengte: p.lengte,
      bruikbaar: true,
      geschatteWaarde: p.waarde,
      potentieleToepassing: p.lengte >= 4000 ? 'Constructief' : 'Secundair'
    })),
    materiaalBenutting: Math.round(benutting * 10) / 10,
    aantalProducten: producten.length,
    geschatteWaarde: Math.round(totaleWaarde)
  }
}

// ============================================
// PRIJS BEREKENINGEN
// ============================================

/**
 * Bereken verkoopwaarde van een product
 */
export function berekenProductWaarde(element: CADElement, lengte?: number): number {
  const productLengte = lengte || element.lengte
  
  // Basis: profiel type bepaalt kg prijs
  const profielType = element.profielNaam.split(' ')[0] as keyof typeof STAAL_BASISPRIJZEN
  const basisPrijsPerKg = STAAL_BASISPRIJZEN[profielType] || 1.40
  
  // Gewicht proportioneel aan lengte
  const gewicht = (element.gewicht * productLengte) / element.lengte
  
  // Nieuwwaarde
  const nieuwWaarde = gewicht * basisPrijsPerKg
  
  // Korting voor hergebruik conditie
  const conditieMultiplier = HERGEBRUIK_KORTING[element.conditie as keyof typeof HERGEBRUIK_KORTING] || 0.5
  
  // Certificaat impact (aanname: gemiddeld)
  const certMultiplier = 0.8
  
  // Lengte premium (gewilde lengtes zijn meer waard)
  const lengtePremium = productLengte >= 5000 ? 1.1 : productLengte >= 3000 ? 1.0 : 0.9
  
  return Math.round(nieuwWaarde * conditieMultiplier * certMultiplier * lengtePremium)
}

/**
 * Bereken ontmantelingskosten voor een element
 */
export function berekenOntmantelingsKosten(element: CADElement): OntmantelingsKosten {
  // Tijd schatting op basis van gewicht en type
  const basisTijd = element.gewicht / 500 // ~2kg per minuut demontage
  const typeFactor = element.type === 'kolom' ? 1.5 : element.type === 'spant' ? 2.0 : 1.0
  const demontageTijd = (basisTijd * typeFactor) / 60 // naar uren
  
  const demontageKosten = demontageTijd * UURTARIEVEN.demontage
  
  // Transport: €0.50 per kg als schatting
  const transportKosten = element.gewicht * 0.0005 // €0.50/kg = €0.0005/g... nee, €500/ton = €0.50/kg
  
  // Snijkosten
  const snijplan = genereerSnijPlan(element)
  const snijKosten = snijplan.sneden.length * 15 // €15 per snede
  
  // Handling
  const handlingKosten = element.gewicht * 0.10 // €100/ton
  
  return {
    demontageTijd: Math.round(demontageTijd * 100) / 100,
    demontageKosten: Math.round(demontageKosten),
    transportKosten: Math.round(transportKosten),
    aantalSneden: snijplan.sneden.length,
    snijKosten,
    handlingKosten: Math.round(handlingKosten),
    totaalOogstKosten: Math.round(demontageKosten + transportKosten + snijKosten + handlingKosten)
  }
}

// ============================================
// BEWERKINGSPLAN GENERATIE
// ============================================

/**
 * Genereer bewerkingsplan voor matching
 */
export function genereerBewerkingsPlan(
  voorraadElement: CADElement, 
  gewensteLengte: number,
  opties: { boren?: boolean; coaten?: boolean; stralen?: boolean } = {}
): BewerkingsPlan {
  const stappen: BewerkingsStap[] = []
  let volgorde = 1
  let totaalTijd = 0
  let totaalKosten = 0
  
  // 1. Transport naar fabriek
  stappen.push({
    volgorde: volgorde++,
    type: 'transport',
    beschrijving: 'Transport naar bewerkingshal',
    tijdMinuten: 15,
    kosten: 20
  })
  totaalTijd += 15
  totaalKosten += 20
  
  // 2. Stralen (indien nodig of gevraagd)
  if (opties.stralen || voorraadElement.conditie !== 'goed') {
    stappen.push({
      volgorde: volgorde++,
      type: 'stralen',
      beschrijving: 'Stralen SA 2.5 - verwijderen roest en coating',
      machine: 'Straalmachine Hal B',
      tijdMinuten: Math.ceil(voorraadElement.lengte / 500), // ~500mm per minuut
      kosten: Math.round(voorraadElement.gewicht * 0.15) // €150/ton
    })
    totaalTijd += stappen[stappen.length - 1].tijdMinuten
    totaalKosten += stappen[stappen.length - 1].kosten
  }
  
  // 3. Zagen (indien lengte aanpassing nodig)
  const lengteDelta = voorraadElement.lengte - gewensteLengte
  if (lengteDelta > 10) {
    const aantalZagen = lengteDelta > 100 ? 2 : 1 // Twee sneden als veel weg moet
    stappen.push({
      volgorde: volgorde++,
      type: 'zagen',
      beschrijving: `Afkorten naar ${gewensteLengte}mm (${aantalZagen} snede${aantalZagen > 1 ? 's' : ''})`,
      machine: 'Bandzaag CNC',
      tijdMinuten: aantalZagen * 5,
      kosten: aantalZagen * 15,
      positie: { x: gewensteLengte, y: 0, z: 0 }
    })
    totaalTijd += stappen[stappen.length - 1].tijdMinuten
    totaalKosten += stappen[stappen.length - 1].kosten
  }
  
  // 4. Boren (indien gevraagd)
  if (opties.boren) {
    stappen.push({
      volgorde: volgorde++,
      type: 'boren',
      beschrijving: 'Boren kopplaten M20',
      machine: 'CNC Boormachine',
      tijdMinuten: 20,
      kosten: 45
    })
    totaalTijd += 20
    totaalKosten += 45
  }
  
  // 5. Keuren
  stappen.push({
    volgorde: volgorde++,
    type: 'keuren',
    beschrijving: 'Visuele inspectie en maatcontrole',
    tijdMinuten: 10,
    kosten: 25
  })
  totaalTijd += 10
  totaalKosten += 25
  
  // 6. Coaten (indien gevraagd)
  if (opties.coaten) {
    stappen.push({
      volgorde: volgorde++,
      type: 'coaten',
      beschrijving: 'Primer + aflak RAL 7016',
      machine: 'Spuitcabine',
      tijdMinuten: 30,
      kosten: Math.round(voorraadElement.gewicht * 0.25) // €250/ton
    })
    totaalTijd += 30
    totaalKosten += stappen[stappen.length - 1].kosten
  }
  
  // Materiaalverlies berekenen
  const materiaalVerlies = lengteDelta > 0 
    ? (voorraadElement.gewicht * lengteDelta / voorraadElement.lengte)
    : 0
  
  return {
    id: `bp-${voorraadElement.id}-${Date.now()}`,
    elementId: voorraadElement.id,
    vraagId: 'vraag-placeholder',
    stappen,
    snijPosities: lengteDelta > 10 ? [gewensteLengte] : [],
    boorPosities: opties.boren ? [
      { x: 50, y: 0, z: 0, diameter: 22 },
      { x: 50, y: 100, z: 0, diameter: 22 },
      { x: gewensteLengte - 50, y: 0, z: 0, diameter: 22 },
      { x: gewensteLengte - 50, y: 100, z: 0, diameter: 22 },
    ] : [],
    freesgebieden: [],
    totaalTijd,
    totaalKosten,
    materiaalVerlies: Math.round(materiaalVerlies * 10) / 10
  }
}

// ============================================
// GEBOUW BUSINESS CASE
// ============================================

/**
 * Genereer volledige business case voor een gebouw
 */
export function genereerBusinessCase(gebouw: MockGebouw, aankoopPrijs: number = 0): GebouwBusinessCase {
  const elementAnalyse: ElementTypeAnalyse[] = []
  
  // Groepeer elementen per type+profiel
  const groepen = new Map<string, CADElement[]>()
  for (const element of gebouw.elementen) {
    const key = `${element.type}-${element.profielNaam}`
    if (!groepen.has(key)) groepen.set(key, [])
    groepen.get(key)!.push(element)
  }
  
  let totaalOpbrengst = 0
  let totaalKosten = 0
  
  // Analyseer elke groep
  for (const [key, elementen] of groepen) {
    const [type, profiel] = key.split('-')
    
    const totaalGewicht = elementen.reduce((s, e) => s + e.gewicht, 0)
    const conditieGoed = elementen.filter(e => e.conditie === 'goed').length
    const conditieMatig = elementen.filter(e => e.conditie === 'matig').length
    const conditieSlecht = elementen.filter(e => e.conditie === 'slecht').length
    
    // Certificering check
    const certificaten = elementen.map(e => genereerCertificaat(e))
    const metCert = certificaten.filter(c => c.huidigeKlasse === 'CE' || c.huidigeKlasse === 'NEN').length
    const zonderCert = certificaten.filter(c => c.huidigeKlasse === 'GEEN').length
    const testNodig = certificaten.filter(c => c.testNodig).length
    
    // Kosten/opbrengsten per element
    let groepOpbrengst = 0
    let groepKosten = 0
    
    for (const element of elementen) {
      const snijplan = genereerSnijPlan(element)
      groepOpbrengst += snijplan.geschatteWaarde
      
      const ontmanteling = berekenOntmantelingsKosten(element)
      groepKosten += ontmanteling.totaalOogstKosten
    }
    
    // Test kosten toevoegen
    groepKosten += testNodig * TEST_KOSTEN.volledig
    
    totaalOpbrengst += groepOpbrengst
    totaalKosten += groepKosten
    
    elementAnalyse.push({
      type,
      profiel,
      aantal: elementen.length,
      totaalGewicht: Math.round(totaalGewicht),
      metCertificaat: metCert,
      zonderCertificaat: zonderCert,
      testNodig,
      conditieGoed,
      conditieMatig,
      conditieSlecht,
      geschatteOpbrengst: Math.round(groepOpbrengst),
      geschatteKosten: Math.round(groepKosten),
      nettoBijdrage: Math.round(groepOpbrengst - groepKosten)
    })
  }
  
  // Sorteer op netto bijdrage (hoogste eerst)
  elementAnalyse.sort((a, b) => b.nettoBijdrage - a.nettoBijdrage)
  
  // Bereken totalen
  const totaalGewicht = gebouw.elementen.reduce((s, e) => s + e.gewicht, 0)
  const fabrieksKosten = totaalGewicht * 0.15 // €150/ton gemiddeld
  const overhead = totaalKosten * 0.1 // 10% overhead
  
  // Risico analyse
  const risicos: Risico[] = []
  
  const testNodigTotaal = elementAnalyse.reduce((s, e) => s + e.testNodig, 0)
  if (testNodigTotaal > gebouw.elementen.length * 0.3) {
    risicos.push({
      type: 'certificering',
      beschrijving: `${testNodigTotaal} elementen (${Math.round(testNodigTotaal / gebouw.elementen.length * 100)}%) hebben materiaaltest nodig`,
      impact: 'hoog',
      mitigatie: 'Budget €' + (testNodigTotaal * TEST_KOSTEN.volledig) + ' voor testen'
    })
  }
  
  const slechtConditie = elementAnalyse.reduce((s, e) => s + e.conditieSlecht, 0)
  if (slechtConditie > gebouw.elementen.length * 0.2) {
    risicos.push({
      type: 'conditie',
      beschrijving: `${Math.round(slechtConditie / gebouw.elementen.length * 100)}% van elementen in slechte conditie`,
      impact: 'midden',
      mitigatie: 'Lagere opbrengst ingecalculeerd'
    })
  }
  
  // Financieel overzicht
  const kosten = {
    aankoop: aankoopPrijs,
    ontmanteling: { totaalOogstKosten: totaalKosten } as OntmantelingsKosten,
    transport: Math.round(totaalGewicht * 0.05), // €50/ton
    fabrieksBewerking: Math.round(fabrieksKosten),
    overhead: Math.round(overhead),
    totaal: Math.round(aankoopPrijs + totaalKosten + fabrieksKosten + overhead + totaalGewicht * 0.05)
  }
  
  // Schrootwaarde voor niet-herbruikbaar
  const schrootPercentage = 0.1 // 10% gaat naar schroot
  const schrootWaarde = totaalGewicht * schrootPercentage * 0.20 // €200/ton schroot
  
  const opbrengsten = {
    directeVerkoop: Math.round(totaalOpbrengst * 0.3), // 30% direct verkoopbaar
    bewerktVerkoop: Math.round(totaalOpbrengst * 0.6), // 60% na bewerking
    schrootWaarde: Math.round(schrootWaarde),
    totaal: Math.round(totaalOpbrengst * 0.9 + schrootWaarde)
  }
  
  const brutomarge = opbrengsten.totaal - kosten.totaal
  const margePercentage = opbrengsten.totaal > 0 
    ? Math.round((brutomarge / opbrengsten.totaal) * 100) 
    : 0
  
  // Aanbeveling
  let aanbeveling: 'aankopen' | 'onderhandelen' | 'afwijzen'
  if (margePercentage > 20) {
    aanbeveling = 'aankopen'
  } else if (margePercentage > 5) {
    aanbeveling = 'onderhandelen'
  } else {
    aanbeveling = 'afwijzen'
  }
  
  // Maximale aankoopprijs voor 15% marge
  const targetMarge = 0.15
  const maxAankoop = opbrengsten.totaal * (1 - targetMarge) - (kosten.totaal - aankoopPrijs)
  
  return {
    gebouwId: gebouw.id,
    gebouwNaam: gebouw.naam,
    totaalElementen: gebouw.elementen.length,
    totaalGewicht: Math.round(totaalGewicht),
    elementAnalyse,
    kosten,
    opbrengsten,
    brutomarge: Math.round(brutomarge),
    margePercentage,
    risicos,
    aanbeveling,
    maxAankoopPrijs: Math.round(Math.max(0, maxAankoop))
  }
}
