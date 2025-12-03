/**
 * Business Types - Kosten/Opbrengsten Model
 * Staal Hergebruik Systeem
 */

// ============================================
// CERTIFICERING & MATERIAALKWALITEIT
// ============================================

export type CertificaatKlasse = 'CE' | 'NEN' | 'KOMO' | 'GEEN' | 'TE_TESTEN'

export type StaalKwaliteit = 'S235' | 'S275' | 'S355' | 'S420' | 'S460' | 'ONBEKEND'

export type ToepassingsCategorie = 
  | 'constructief_primair'    // Hoofddraagconstructie
  | 'constructief_secundair'  // Secundaire constructie
  | 'niet_constructief'       // Niet-dragende toepassingen
  | 'decoratief'              // Alleen esthetisch
  | 'recycling'               // Alleen smelten

export interface MateriaalCertificaat {
  id: string
  elementId: string
  
  // Oorspronkelijke documentatie
  origineleCertificaat?: string       // CE/NEN nummer indien beschikbaar
  origineleKwaliteit?: StaalKwaliteit
  oorspronkelijkeTekening?: boolean   // Hebben we de originele tekening?
  
  // Huidige status
  huidigeKlasse: CertificaatKlasse
  huidigeKwaliteit: StaalKwaliteit
  testNodig: boolean
  
  // Test resultaten (indien uitgevoerd)
  testUitgevoerd?: boolean
  testDatum?: string
  treksterkte?: number        // N/mm²
  vloeigrens?: number         // N/mm²
  chemischeAnalyse?: {
    koolstof: number          // %
    mangaan: number           // %
    silicium: number          // %
  }
  
  // Toegestane toepassingen
  toegestaneToepassingen: ToepassingsCategorie[]
  
  // Impact op prijs
  prijsMultiplier: number     // 1.0 = basis, 0.5 = 50% korting, etc.
}

// ============================================
// ONTMANTELINGSANALYSE
// ============================================

export interface SnijPlan {
  id: string
  elementId: string
  
  // Snij locaties
  sneden: Snede[]
  
  // Resulterende producten
  resultatendeProducten: ProductUitSnijplan[]
  
  // Optimalisatie score
  materiaalBenutting: number  // % van totale lengte
  aantalProducten: number
  geschatteWaarde: number
}

export interface Snede {
  positie: number             // mm vanaf start
  type: 'zaag' | 'plasma' | 'autogeen'
  hoek: number                // graden (90 = recht)
  kostenIndicatie: number     // €
}

export interface ProductUitSnijplan {
  startPositie: number
  eindPositie: number
  lengte: number
  bruikbaar: boolean
  reden?: string              // Waarom niet bruikbaar
  geschatteWaarde: number
  potentieleToepassing?: string
}

// ============================================
// KOSTEN MODEL
// ============================================

export interface OntmantelingsKosten {
  // Oogst kosten
  demontageTijd: number       // uren
  demontageKosten: number     // €
  transportKosten: number     // €
  
  // Snijkosten
  aantalSneden: number
  snijKosten: number          // €
  
  // Handling
  handlingKosten: number      // €
  
  // Subtotaal
  totaalOogstKosten: number
}

export interface FabrieksBewerkingen {
  // Per bewerking
  bewerkingen: Bewerking[]
  
  // Totalen
  totaalBewerkingsTijd: number  // uren
  totaalBewerkingsKosten: number
}

export interface Bewerking {
  type: 'stralen' | 'zagen' | 'boren' | 'frezen' | 'lassen' | 'coaten' | 'testen'
  beschrijving: string
  tijdMinuten: number
  kostenPerUur: number
  materiaalKosten: number
  totaalKosten: number
}

export interface VerkrijgbareOpbrengst {
  // Per product
  producten: ProductOpbrengst[]
  
  // Totalen
  totaalVerkoopWaarde: number
  geschatteVerkoopTijd: number  // dagen
}

export interface ProductOpbrengst {
  productId: string
  profielNaam: string
  lengte: number
  conditie: string
  certificaat: CertificaatKlasse
  
  // Prijs bepaling
  basisPrijs: number          // € per kg nieuw
  conditieMultiplier: number  // 0.0 - 1.0
  certificaatMultiplier: number
  lengtePremie: number        // Extra voor gewilde lengtes
  
  // Eindprijs
  gewicht: number
  verkoopPrijs: number
}

// ============================================
// GEBOUW BUSINESS CASE
// ============================================

export interface GebouwBusinessCase {
  gebouwId: string
  gebouwNaam: string
  
  // Analyse
  totaalElementen: number
  totaalGewicht: number
  
  // Breakdown per element type
  elementAnalyse: ElementTypeAnalyse[]
  
  // Financieel overzicht
  kosten: {
    aankoop: number           // Wat betalen we voor het gebouw/staal?
    ontmanteling: OntmantelingsKosten
    transport: number
    fabrieksBewerking: number
    overhead: number
    totaal: number
  }
  
  opbrengsten: {
    directeVerkoop: number    // Verkoop zonder bewerking
    bewerktVerkoop: number    // Verkoop na bewerking
    schrootWaarde: number     // Niet herbruikbaar materiaal
    totaal: number
  }
  
  // Resultaat
  brutomarge: number
  margePercentage: number
  
  // Risico's
  risicos: Risico[]
  
  // Beslissing
  aanbeveling: 'aankopen' | 'onderhandelen' | 'afwijzen'
  maxAankoopPrijs: number
}

export interface ElementTypeAnalyse {
  type: string                // kolom, balk, ligger, etc.
  profiel: string             // HEA 300, IPE 400, etc.
  aantal: number
  totaalGewicht: number
  
  // Certificering status
  metCertificaat: number
  zonderCertificaat: number
  testNodig: number
  
  // Conditie verdeling
  conditieGoed: number
  conditieMatig: number
  conditieSlecht: number
  
  // Waarde schatting
  geschatteOpbrengst: number
  geschatteKosten: number
  nettoBijdrage: number
}

export interface Risico {
  type: 'certificering' | 'conditie' | 'markt' | 'logistiek' | 'technisch'
  beschrijving: string
  impact: 'laag' | 'midden' | 'hoog'
  mitigatie?: string
}

// ============================================
// MATCHING & BEWERKINGSPLAN
// ============================================

export interface MatchResultaat {
  voorraadElementId: string
  vraagId: string
  
  // Match kwaliteit
  matchScore: number          // 0-100
  
  // Benodigde bewerkingen
  bewerkingsplan: BewerkingsPlan
  
  // Financieel
  verkoopPrijs: number
  bewerkingsKosten: number
  nettoOpbrengst: number
  
  // Tijdlijn
  leverTijd: number           // werkdagen
}

export interface BewerkingsPlan {
  id: string
  elementId: string
  vraagId: string
  
  // Volgorde van bewerkingen
  stappen: BewerkingsStap[]
  
  // 3D Visualisatie data
  snijPosities: number[]      // mm posities voor zagen
  boorPosities: { x: number; y: number; z: number; diameter: number }[]
  freesgebieden: { start: number; eind: number; diepte: number }[]
  
  // Totalen
  totaalTijd: number          // minuten
  totaalKosten: number
  materiaalVerlies: number    // kg
}

export interface BewerkingsStap {
  volgorde: number
  type: 'transport' | 'stralen' | 'zagen' | 'boren' | 'frezen' | 'lassen' | 'coaten' | 'keuren'
  beschrijving: string
  machine?: string
  tijdMinuten: number
  kosten: number
  
  // 3D positie voor visualisatie
  positie?: { x: number; y: number; z: number }
}

// ============================================
// PRIJZEN & TARIEVEN
// ============================================

export const UURTARIEVEN = {
  demontage: 85,              // € per uur
  transport: 75,              // € per uur
  stralen: 65,
  zagen: 70,
  boren: 60,
  frezen: 80,
  lassen: 90,
  coaten: 55,
  keuren: 100,
}

export const STAAL_BASISPRIJZEN: Record<string, number> = {
  // € per kg nieuw staal
  'HEA': 1.45,
  'HEB': 1.50,
  'IPE': 1.40,
  'UNP': 1.35,
}

export const HERGEBRUIK_KORTING = {
  // Multiplier op nieuwprijs
  goed: 0.65,         // 35% korting
  matig: 0.45,        // 55% korting
  slecht: 0.25,       // 75% korting
}

export const CERTIFICAAT_MULTIPLIER: Record<CertificaatKlasse, number> = {
  'CE': 1.0,          // Volledige waarde
  'NEN': 0.95,
  'KOMO': 0.90,
  'GEEN': 0.60,       // Alleen niet-constructief
  'TE_TESTEN': 0.50,  // Onzeker
}

export const TEST_KOSTEN = {
  visueel: 25,        // € per element
  hardheid: 75,
  trekproef: 250,
  chemisch: 350,
  volledig: 500,
}
