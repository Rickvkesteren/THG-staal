// Types voor het bewerkingsplan en verwerkingsprocessen

export type BewerkingsType = 
  | 'ZAGEN'           // Inkorten van balken
  | 'SNIJDEN'         // Plasma/laser snijden
  | 'FREZEN'          // CNC frezen voor verbindingen
  | 'BOREN'           // Gaten boren
  | 'STRALEN'         // Zandstralen voor reiniging
  | 'SLIJPEN'         // Oppervlakte slijpen
  | 'SCHOONMAKEN'     // Industriële reiniging
  | 'VERVEN'          // Coating/verven
  | 'INSPECTEREN'     // Visuele/NDT inspectie
  | 'TESTEN'          // Materiaalsterkte testen

export interface Bewerking {
  id: string
  type: BewerkingsType
  beschrijving: string
  parameters?: BewerkingsParameters
  geschatteTijd: number       // minuten
  kostenPerUur: number
  volgorde: number
  status: 'GEPLAND' | 'BEZIG' | 'VOLTOOID' | 'GEBLOKKEERD'
  machineId?: string
  opmerking?: string
}

export interface BewerkingsParameters {
  // Zagen
  zaagLengte?: number         // mm
  zaagHoek?: number           // graden
  
  // Snijden
  snijPatroon?: string        // referentie naar patroon
  snijDiepte?: number         // mm
  
  // Frezen
  freesType?: 'GORDING_AANSLUITING' | 'KOLOM_VOET' | 'KOPPELPLAAT' | 'CUSTOM'
  freesDiepte?: number        // mm
  
  // Boren
  boorDiameter?: number       // mm
  aantalGaten?: number
  
  // Stralen
  straalGraad?: 'SA1' | 'SA2' | 'SA2.5' | 'SA3'
  
  // Coating
  coatingType?: string
  coatingDikte?: number       // μm
}

export interface BewerkingsStap {
  id: string
  bewerkingen: Bewerking[]
  opmerkingen?: string
}

// Volledig bewerkingsplan voor één element
export interface ElementBewerkingsplan {
  elementId: string
  elementNaam: string
  bronProfiel: string         // Origineel profiel (bv. HEA300)
  bronLengte: number          // mm
  doelProfiel: string         // Gewenst profiel (kan gelijk zijn)
  doelLengte: number          // mm
  
  stappen: BewerkingsStap[]
  
  totaalTijd: number          // minuten
  totaalKosten: number        // €
  
  prioriteit: 'HOOG' | 'NORMAAL' | 'LAAG'
  deadline?: Date
  
  status: 'WACHTEND' | 'IN_PRODUCTIE' | 'GEREED' | 'GEBLOKKEERD'
}

// Matching resultaat van 3D model naar vraag
export interface MatchingResultaat {
  bronElementId: string
  bronElementNaam: string
  bronProfiel: string
  bronLengte: number
  
  doelProject: string
  doelElement: string
  doelProfiel: string
  doelLengte: number
  
  matchScore: number          // 0-100
  redenering: string
  
  benodigdeBewerkingen: BewerkingsType[]
  geschatteKosten: number
  geschatteTijd: number
}

// Productieplanning voor de fabriek
export interface ProductiePlanning {
  datum: Date
  shifts: ProductieShift[]
  capaciteit: number          // uren beschikbaar
  gepland: number            // uren gepland
  bezettingsgraad: number    // percentage
}

export interface ProductieShift {
  id: string
  naam: string
  startTijd: string          // HH:mm
  eindTijd: string           // HH:mm
  taken: ProductieTaak[]
}

export interface ProductieTaak {
  id: string
  elementBewerkingsplan: ElementBewerkingsplan
  machine: string
  operator?: string
  startTijd?: Date
  eindTijd?: Date
  status: 'INGEPLAND' | 'BEZIG' | 'GEREED' | 'UITGESTELD'
}

// Fabrieksmachine
export interface Machine {
  id: string
  naam: string
  type: BewerkingsType[]     // Welke bewerkingen kan deze machine
  locatie: string
  status: 'BESCHIKBAAR' | 'BEZET' | 'ONDERHOUD' | 'STORING'
  capaciteitPerDag: number   // uren
}

// Voorraad in de fabriek
export interface FabrieksVoorraad {
  elementId: string
  locatie: string            // Magazijn locatie
  status: 'ONTVANGEN' | 'IN_BEWERKING' | 'GEREED' | 'VERZONDEN'
  binnenkomstDatum: Date
  herkomstGebouw: string
}
