/**
 * Robuuste Profiel Koppeling Module v2.0
 * 
 * VERBETERINGEN t.o.v. v1.0:
 * 1. Standaard profielbibliotheek voor validatie
 * 2. Stuklijst-extractie met cross-validatie
 * 3. As/raster-gebaseerde element positionering
 * 4. Lengte-profiel koppeling
 * 5. Multi-source betrouwbaarheidsscoring
 * 6. Conflict detectie en resolutie
 */

import * as pdfjsLib from 'pdfjs-dist'

// Configureer PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// === STANDAARD PROFIELBIBLIOTHEEK ===
// Europese staalprofielen met gewichten (kg/m)

export const STAAL_PROFIELEN = {
  // HEB profielen
  HEB: {
    '100': { h: 100, b: 100, gewicht: 20.4 },
    '120': { h: 120, b: 120, gewicht: 26.7 },
    '140': { h: 140, b: 140, gewicht: 33.7 },
    '160': { h: 160, b: 160, gewicht: 42.6 },
    '180': { h: 180, b: 180, gewicht: 51.2 },
    '200': { h: 200, b: 200, gewicht: 61.3 },
    '220': { h: 220, b: 220, gewicht: 71.5 },
    '240': { h: 240, b: 240, gewicht: 83.2 },
    '260': { h: 260, b: 260, gewicht: 93.0 },
    '280': { h: 280, b: 280, gewicht: 103.0 },
    '300': { h: 300, b: 300, gewicht: 117.0 },
    '320': { h: 320, b: 300, gewicht: 127.0 },
    '340': { h: 340, b: 300, gewicht: 134.0 },
    '360': { h: 360, b: 300, gewicht: 142.0 },
    '400': { h: 400, b: 300, gewicht: 155.0 },
    '450': { h: 450, b: 300, gewicht: 171.0 },
    '500': { h: 500, b: 300, gewicht: 187.0 },
  },
  // HEA profielen
  HEA: {
    '100': { h: 96, b: 100, gewicht: 16.7 },
    '120': { h: 114, b: 120, gewicht: 19.9 },
    '140': { h: 133, b: 140, gewicht: 24.7 },
    '160': { h: 152, b: 160, gewicht: 30.4 },
    '180': { h: 171, b: 180, gewicht: 35.5 },
    '200': { h: 190, b: 200, gewicht: 42.3 },
    '220': { h: 210, b: 220, gewicht: 50.5 },
    '240': { h: 230, b: 240, gewicht: 60.3 },
    '260': { h: 250, b: 260, gewicht: 68.2 },
    '280': { h: 270, b: 280, gewicht: 76.4 },
    '300': { h: 290, b: 300, gewicht: 88.3 },
    '320': { h: 310, b: 300, gewicht: 97.6 },
    '340': { h: 330, b: 300, gewicht: 105.0 },
    '360': { h: 350, b: 300, gewicht: 112.0 },
    '400': { h: 390, b: 300, gewicht: 125.0 },
    '450': { h: 440, b: 300, gewicht: 140.0 },
    '500': { h: 490, b: 300, gewicht: 155.0 },
  },
  // IPE profielen
  IPE: {
    '80': { h: 80, b: 46, gewicht: 6.0 },
    '100': { h: 100, b: 55, gewicht: 8.1 },
    '120': { h: 120, b: 64, gewicht: 10.4 },
    '140': { h: 140, b: 73, gewicht: 12.9 },
    '160': { h: 160, b: 82, gewicht: 15.8 },
    '180': { h: 180, b: 91, gewicht: 18.8 },
    '200': { h: 200, b: 100, gewicht: 22.4 },
    '220': { h: 220, b: 110, gewicht: 26.2 },
    '240': { h: 240, b: 120, gewicht: 30.7 },
    '270': { h: 270, b: 135, gewicht: 36.1 },
    '300': { h: 300, b: 150, gewicht: 42.2 },
    '330': { h: 330, b: 160, gewicht: 49.1 },
    '360': { h: 360, b: 170, gewicht: 57.1 },
    '400': { h: 400, b: 180, gewicht: 66.3 },
    '450': { h: 450, b: 190, gewicht: 77.6 },
    '500': { h: 500, b: 200, gewicht: 90.7 },
    '550': { h: 550, b: 210, gewicht: 106.0 },
    '600': { h: 600, b: 220, gewicht: 122.0 },
  },
  // UNP profielen
  UNP: {
    '80': { h: 80, b: 45, gewicht: 8.6 },
    '100': { h: 100, b: 50, gewicht: 10.6 },
    '120': { h: 120, b: 55, gewicht: 13.4 },
    '140': { h: 140, b: 60, gewicht: 16.0 },
    '160': { h: 160, b: 65, gewicht: 18.8 },
    '180': { h: 180, b: 70, gewicht: 22.0 },
    '200': { h: 200, b: 75, gewicht: 25.3 },
    '220': { h: 220, b: 80, gewicht: 29.4 },
    '240': { h: 240, b: 85, gewicht: 33.2 },
    '260': { h: 260, b: 90, gewicht: 37.9 },
    '280': { h: 280, b: 95, gewicht: 41.8 },
    '300': { h: 300, b: 100, gewicht: 46.2 },
  },
  // L-profielen (hoekstaal) - gelijkzijdig
  L: {
    '30.30.3': { a: 30, b: 30, t: 3, gewicht: 1.36 },
    '40.40.4': { a: 40, b: 40, t: 4, gewicht: 2.42 },
    '50.50.5': { a: 50, b: 50, t: 5, gewicht: 3.77 },
    '60.60.6': { a: 60, b: 60, t: 6, gewicht: 5.42 },
    '65.65.6': { a: 65, b: 65, t: 6, gewicht: 5.91 },
    '70.70.7': { a: 70, b: 70, t: 7, gewicht: 7.38 },
    '75.75.7': { a: 75, b: 75, t: 7, gewicht: 7.96 },
    '80.80.8': { a: 80, b: 80, t: 8, gewicht: 9.63 },
    '90.90.9': { a: 90, b: 90, t: 9, gewicht: 12.20 },
    '100.100.10': { a: 100, b: 100, t: 10, gewicht: 15.00 },
    '120.120.12': { a: 120, b: 120, t: 12, gewicht: 21.60 },
  },
} as const

// === TYPES ===

export interface TekstMetPositie {
  tekst: string
  x: number
  y: number
  breedte: number
  hoogte: number
  pagina: number
}

export interface StuklijstItem {
  positie: string          // Pos. nr uit tekening
  elementId: string        // K1, L5, etc.
  profiel: string          // HEB 300
  lengte: number           // mm
  aantal: number           // stuks
  gewicht?: number         // kg/stuk
  totaalGewicht?: number   // kg totaal
  opmerking?: string
  bron: string             // bestandsnaam
  betrouwbaarheid: number  // 0-1
}

export interface AsPositie {
  as: string               // A, B, C of 1, 2, 3
  positie: number          // mm van oorsprong
}

export interface ElementPositie {
  elementId: string
  as1: string              // Bijv. 'A'
  as2: string              // Bijv. '1'
  x: number
  y: number
  z?: number
  profiel?: string
  lengte?: number
  bron: string
  betrouwbaarheid: number
}

export interface ValidatieResultaat {
  isGeldig: boolean
  profielBestaat: boolean
  gewichtKlopt: boolean
  lengteRedelijk: boolean
  waarschuwingen: string[]
  fouten: string[]
}

export interface RobuusteProfielDatabase {
  // Element koppelingen met volledige info
  elementen: Map<string, {
    profiel: string
    lengte?: number
    positie?: { as1: string, as2: string, x: number, y: number, z?: number }
    bronnen: Array<{ bron: string, betrouwbaarheid: number }>
    totaalBetrouwbaarheid: number
    gevalideerd: boolean
  }>
  
  // Stuklijst uit tekening
  stuklijst: StuklijstItem[]
  
  // As-posities (raster)
  assen: {
    x: AsPositie[]  // A, B, C, D...
    y: AsPositie[]  // 1, 2, 3, 4...
  }
  
  // Dakconstructie info - moet compatible zijn met DakconstructieInfo
  dak?: {
    spantType: 'vakwerk' | 'portaal' | 'onbekend'  // Dit veld was 'type', maar moet 'spantType' zijn
    gordingProfiel: string
    gordingAfstand: number
    windverbandProfiel: string
    bovenrandProfiel?: string
    onderrandProfiel?: string
    diagonaalProfiel?: string
    nokHoogte?: number
    gootHoogte?: number
  }
  
  // Validatie resultaten
  validatie: {
    totaalElementen: number
    gevalideerd: number
    metProfiel: number
    metPositie: number
    conflicten: Array<{ elementId: string, conflict: string }>
  }
  
  // Meta
  bronnen: string[]
  aangemaakt: Date
}

// === PROFIEL VALIDATIE ===

/**
 * Valideer of een profiel bestaat in de standaard bibliotheek
 */
export function valideerProfiel(profielNaam: string): { 
  geldig: boolean
  genormaliseerd?: string
  eigenschappen?: { h?: number, b?: number, gewicht: number }
} {
  // Normaliseer profielnaam
  const normalized = normaliseerProfiel(profielNaam)
  if (!normalized) {
    return { geldig: false }
  }
  
  const [type, maat] = normalized.split(' ')
  
  const typeData = STAAL_PROFIELEN[type as keyof typeof STAAL_PROFIELEN]
  if (!typeData) {
    return { geldig: false }
  }
  
  // Voor L-profielen, zoek de volledige key
  if (type === 'L') {
    const lKey = maat.replace(/\s/g, '')
    const lData = (typeData as typeof STAAL_PROFIELEN.L)[lKey as keyof typeof STAAL_PROFIELEN.L]
    if (lData) {
      return { 
        geldig: true, 
        genormaliseerd: `L ${lKey}`,
        eigenschappen: lData
      }
    }
  }
  
  // Zoek exact of dichtsbijzijnd maat
  const eigenschappen = (typeData as Record<string, { h?: number, b?: number, gewicht: number }>)[maat]
  if (eigenschappen) {
    return { 
      geldig: true, 
      genormaliseerd: `${type} ${maat}`,
      eigenschappen 
    }
  }
  
  // Probeer numeriek te matchen (bijv. "HEB300" -> "300")
  const numMaat = maat.replace(/\D/g, '')
  const numEigenschappen = (typeData as Record<string, { h?: number, b?: number, gewicht: number }>)[numMaat]
  if (numEigenschappen) {
    return { 
      geldig: true, 
      genormaliseerd: `${type} ${numMaat}`,
      eigenschappen: numEigenschappen 
    }
  }
  
  return { geldig: false }
}

/**
 * Normaliseer profiel string naar standaard formaat
 */
function normaliseerProfiel(input: string): string | null {
  const clean = input.trim().toUpperCase()
  
  // HE profielen: "HEB300", "HEB 300", "HE 300 B", "HE300B"
  let match = clean.match(/^HE\s*([AB]?)\s*(\d{2,3})\s*([AB]?)$/i)
  if (match) {
    const type = match[1] || match[3] || 'B'
    return `HE${type} ${match[2]}`
  }
  
  match = clean.match(/^(HE[AB])\s*(\d{2,3})$/i)
  if (match) {
    return `${match[1]} ${match[2]}`
  }
  
  // IPE: "IPE300", "IPE 300"
  match = clean.match(/^IPE\s*(\d{2,3})$/i)
  if (match) {
    return `IPE ${match[1]}`
  }
  
  // UNP: "UNP120", "UPN 120", "UNP 120"
  match = clean.match(/^UN[PN]\s*(\d{2,3})$/i)
  if (match) {
    return `UNP ${match[1]}`
  }
  
  // L-profiel: "L60.60.6", "L 60x60x6", "L60/60/6"
  match = clean.match(/^L\s*(\d{2,3})[.xX\/](\d{2,3})[.xX\/](\d{1,2})$/i)
  if (match) {
    return `L ${match[1]}.${match[2]}.${match[3]}`
  }
  
  return null
}

// === PDF ANALYSE ===

/**
 * Extraheer tekst met posities uit PDF
 */
async function extraheerTekstMetPosities(file: File): Promise<TekstMetPositie[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const tekstItems: TekstMetPositie[] = []
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    
    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const transform = item.transform as number[]
        tekstItems.push({
          tekst: item.str,
          x: transform[4],
          y: transform[5],
          breedte: item.width || 0,
          hoogte: item.height || 0,
          pagina: pageNum
        })
      }
    }
  }
  
  return tekstItems
}

// === STUKLIJST EXTRACTIE ===

/**
 * Zoek en parseer stuklijsten uit PDF tekst
 * 
 * Typische stuklijst formaten:
 * - Pos. | Omschrijving | Profiel | Lengte | Aantal | Gewicht
 * - Of verticale layout
 */
export function extraheerStuklijst(tekstItems: TekstMetPositie[], bestandsnaam: string): StuklijstItem[] {
  const items: StuklijstItem[] = []
  
  // Sorteer op Y (rijen) en dan X (kolommen)
  const gesorteerd = [...tekstItems].sort((a, b) => {
    const rijVerschil = Math.abs(a.y - b.y)
    if (rijVerschil < 8) {
      return a.x - b.x
    }
    return b.y - a.y  // PDF Y is omgekeerd
  })
  
  // Groepeer in rijen
  const rijen: TekstMetPositie[][] = []
  let huidigeRij: TekstMetPositie[] = []
  let huidigeY = -1
  
  for (const item of gesorteerd) {
    if (huidigeY === -1 || Math.abs(item.y - huidigeY) < 10) {
      huidigeRij.push(item)
      if (huidigeY === -1) huidigeY = item.y
    } else {
      if (huidigeRij.length > 0) rijen.push(huidigeRij)
      huidigeRij = [item]
      huidigeY = item.y
    }
  }
  if (huidigeRij.length > 0) rijen.push(huidigeRij)
  
  // Detecteer tabel headers
  const headerPatronen = ['pos', 'profiel', 'lengte', 'aantal', 'gewicht', 'omschrijving', 'stuk']
  
  // Zoek naar rijen die eruitzien als stuklijst entries
  for (const rij of rijen) {
    const rijTekst = rij.map(t => t.tekst.toLowerCase()).join(' ')
    
    // Skip header rijen
    if (headerPatronen.some(p => rijTekst.includes(p))) continue
    
    // Zoek element ID, profiel, lengte, aantal in deze rij
    const elementMatch = rij.find(t => /^[KHLSGW]\d{1,3}$/i.test(t.tekst.trim()))
    const profielMatch = rij.find(t => {
      const v = valideerProfiel(t.tekst)
      return v.geldig
    })
    const lengteMatch = rij.find(t => /^\d{3,5}$/.test(t.tekst.trim()) && parseInt(t.tekst) > 100 && parseInt(t.tekst) < 30000)
    const aantalMatch = rij.find(t => /^\d{1,2}$/.test(t.tekst.trim()))
    
    if (elementMatch && profielMatch) {
      const validated = valideerProfiel(profielMatch.tekst)
      
      items.push({
        positie: elementMatch.tekst.trim(),
        elementId: elementMatch.tekst.trim().toUpperCase(),
        profiel: validated.genormaliseerd || profielMatch.tekst.trim().toUpperCase(),
        lengte: lengteMatch ? parseInt(lengteMatch.tekst) : 0,
        aantal: aantalMatch ? parseInt(aantalMatch.tekst) : 1,
        gewicht: validated.eigenschappen?.gewicht,
        bron: bestandsnaam,
        betrouwbaarheid: 0.9
      })
    }
  }
  
  return items
}

// === AS-RASTER EXTRACTIE ===

/**
 * Extraheer as-informatie (stramien) uit tekeningen
 */
export function extraheerAsRaster(tekstItems: TekstMetPositie[]): { x: AsPositie[], y: AsPositie[] } {
  const assenX: AsPositie[] = []
  const assenY: AsPositie[] = []
  
  // Zoek naar as-labels (A, B, C... of 1, 2, 3...)
  // En as-afstanden (6000, 7500, etc.)
  
  const letterAssen = tekstItems.filter(t => /^[A-N]$/i.test(t.tekst.trim()))
  const nummerAssen = tekstItems.filter(t => /^[1-9]\d?$/.test(t.tekst.trim()) && parseInt(t.tekst) < 30)
  const afstanden = tekstItems.filter(t => /^\d{4,5}$/.test(t.tekst.trim()))
  
  // Sorteer letters op X positie (horizontale assen)
  const gesorteerdeLetters = letterAssen.sort((a, b) => a.x - b.x)
  let cumulatief = 0
  for (let i = 0; i < gesorteerdeLetters.length; i++) {
    // Zoek afstand tot volgende as
    const afstand = i < gesorteerdeLetters.length - 1 
      ? vindDichtstbijzijndeAfstand(gesorteerdeLetters[i], gesorteerdeLetters[i + 1], afstanden)
      : 0
    
    assenX.push({
      as: gesorteerdeLetters[i].tekst.toUpperCase(),
      positie: cumulatief
    })
    cumulatief += afstand || 6000  // Default 6m
  }
  
  // Sorteer nummers op Y positie (verticale assen)
  const gesorteerdeNummers = nummerAssen.sort((a, b) => b.y - a.y)  // PDF Y is omgekeerd
  cumulatief = 0
  for (let i = 0; i < gesorteerdeNummers.length; i++) {
    const afstand = i < gesorteerdeNummers.length - 1 
      ? vindDichtstbijzijndeAfstand(gesorteerdeNummers[i], gesorteerdeNummers[i + 1], afstanden)
      : 0
    
    assenY.push({
      as: gesorteerdeNummers[i].tekst,
      positie: cumulatief
    })
    cumulatief += afstand || 6000
  }
  
  return { x: assenX, y: assenY }
}

function vindDichtstbijzijndeAfstand(
  as1: TekstMetPositie, 
  as2: TekstMetPositie, 
  afstanden: TekstMetPositie[]
): number {
  const midX = (as1.x + as2.x) / 2
  const midY = (as1.y + as2.y) / 2
  
  let dichtstbij: TekstMetPositie | null = null
  let minAfstand = Infinity
  
  for (const afstand of afstanden) {
    const dist = Math.sqrt(Math.pow(afstand.x - midX, 2) + Math.pow(afstand.y - midY, 2))
    if (dist < minAfstand && dist < 100) {  // Max 100 punten afstand
      minAfstand = dist
      dichtstbij = afstand
    }
  }
  
  return dichtstbij ? parseInt(dichtstbij.tekst) : 0
}

// === ELEMENT-POSITIE KOPPELING ===

/**
 * Koppel element IDs aan raster posities
 */
export function koppelElementenAanRaster(
  tekstItems: TekstMetPositie[],
  assen: { x: AsPositie[], y: AsPositie[] },
  bestandsnaam: string
): ElementPositie[] {
  const posities: ElementPositie[] = []
  
  // Vind alle element IDs
  const elementItems = tekstItems.filter(t => /^[KHLSGW]\d{1,3}$/i.test(t.tekst.trim()))
  
  for (const element of elementItems) {
    // Zoek dichtstbijzijnde as-kruispunt
    let dichtstbijX: AsPositie | null = null
    let dichtstbijY: AsPositie | null = null
    let minAfstandX = Infinity
    let minAfstandY = Infinity
    
    // Letter-assen (horizontaal, vergelijk X positie)
    for (const as of assen.x) {
      // Vind de tekst item voor deze as
      const asItem = tekstItems.find(t => t.tekst.toUpperCase() === as.as)
      if (asItem) {
        const dist = Math.abs(asItem.x - element.x)
        if (dist < minAfstandX) {
          minAfstandX = dist
          dichtstbijX = as
        }
      }
    }
    
    // Nummer-assen (verticaal, vergelijk Y positie)
    for (const as of assen.y) {
      const asItem = tekstItems.find(t => t.tekst === as.as)
      if (asItem) {
        const dist = Math.abs(asItem.y - element.y)
        if (dist < minAfstandY) {
          minAfstandY = dist
          dichtstbijY = as
        }
      }
    }
    
    if (dichtstbijX && dichtstbijY) {
      // Betrouwbaarheid gebaseerd op afstand tot assen
      const betrouwbaarheid = Math.max(0.5, 1 - (minAfstandX + minAfstandY) / 200)
      
      posities.push({
        elementId: element.tekst.toUpperCase(),
        as1: dichtstbijX.as,
        as2: dichtstbijY.as,
        x: dichtstbijX.positie,
        y: dichtstbijY.positie,
        bron: bestandsnaam,
        betrouwbaarheid
      })
    }
  }
  
  return posities
}

// === PROFIEL-ELEMENT KOPPELING (verbeterd) ===

interface ProfielKoppeling {
  elementId: string
  profiel: string
  betrouwbaarheid: number
  bron: string
  methode: 'direct' | 'proximity' | 'stuklijst' | 'context'
}

/**
 * Vind profiel koppelingen met meerdere methodes
 */
export function vindProfielKoppelingen(
  tekstItems: TekstMetPositie[],
  bestandsnaam: string
): ProfielKoppeling[] {
  const koppelingen: ProfielKoppeling[] = []
  const volledgeTekst = tekstItems.map(t => t.tekst).join(' ')
  
  // 1. DIRECTE KOPPELINGEN (hoogste betrouwbaarheid)
  // Patronen: "K14: HEB 300", "K14 = HEB300", "K14-HEB300"
  const directePatronen = [
    /([KHLSGW]\d{1,3})\s*[:=\-]\s*(HE[AB]|IPE|UNP|L)\s*(\d{2,3}(?:\.\d{2,3}\.\d{1,2})?)/gi,
    /(HE[AB]|IPE|UNP)\s*(\d{2,3})\s*[-\(]\s*([KHLSGW]\d{1,3})/gi,
  ]
  
  for (const patroon of directePatronen) {
    patroon.lastIndex = 0
    let match: RegExpExecArray | null
    
    while ((match = patroon.exec(volledgeTekst)) !== null) {
      let elementId: string
      let profiel: string
      
      if (match[1].match(/^[KHLSGW]/i)) {
        elementId = match[1].toUpperCase()
        profiel = `${match[2].toUpperCase()} ${match[3]}`
      } else {
        profiel = `${match[1].toUpperCase()} ${match[2]}`
        elementId = match[3].toUpperCase()
      }
      
      const validated = valideerProfiel(profiel)
      if (validated.geldig) {
        koppelingen.push({
          elementId,
          profiel: validated.genormaliseerd!,
          betrouwbaarheid: 0.95,
          bron: bestandsnaam,
          methode: 'direct'
        })
      }
    }
  }
  
  // 2. PROXIMITY KOPPELINGEN (met verbeterde logica)
  const elementItems = tekstItems.filter(t => /^[KHLSGW]\d{1,3}$/i.test(t.tekst.trim()))
  const profielItems = tekstItems.filter(t => valideerProfiel(t.tekst).geldig)
  
  for (const element of elementItems) {
    const elementId = element.tekst.toUpperCase()
    
    // Check of we al een directe koppeling hebben
    if (koppelingen.some(k => k.elementId === elementId && k.betrouwbaarheid > 0.9)) {
      continue
    }
    
    // Zoek profielen in de buurt, maar met slimmere logica
    // - Horizontaal nabij = waarschijnlijk gerelateerd (zelfde regel)
    // - Verticaal nabij = ook mogelijk (tabel kolom)
    
    let besteMatch: { profiel: TekstMetPositie, afstand: number, richting: 'h' | 'v' } | null = null
    
    for (const profiel of profielItems) {
      if (profiel.pagina !== element.pagina) continue
      
      const dx = Math.abs(profiel.x - element.x)
      const dy = Math.abs(profiel.y - element.y)
      
      // Horizontale nabijheid (zelfde regel)
      if (dy < 15 && dx < 200) {
        const afstand = dx
        if (!besteMatch || afstand < besteMatch.afstand) {
          besteMatch = { profiel, afstand, richting: 'h' }
        }
      }
      
      // Verticale nabijheid (tabel kolom)
      if (dx < 30 && dy < 100) {
        const afstand = dy
        if (!besteMatch || afstand < besteMatch.afstand) {
          besteMatch = { profiel, afstand, richting: 'v' }
        }
      }
    }
    
    if (besteMatch) {
      const validated = valideerProfiel(besteMatch.profiel.tekst)
      if (validated.geldig) {
        // Horizontale matches zijn betrouwbaarder
        const baseBetrouwbaarheid = besteMatch.richting === 'h' ? 0.8 : 0.7
        const afstandPenalty = besteMatch.afstand / 200 * 0.2
        
        koppelingen.push({
          elementId,
          profiel: validated.genormaliseerd!,
          betrouwbaarheid: Math.max(0.5, baseBetrouwbaarheid - afstandPenalty),
          bron: bestandsnaam,
          methode: 'proximity'
        })
      }
    }
  }
  
  // 3. CONTEXT KOPPELINGEN
  // "Alle kolommen HEB 300" of "Hoofdkolommen: HEB 300"
  const contextPatronen = [
    { regex: /(?:alle\s+)?kolommen?\s*[:=]?\s*(HE[AB]|IPE)\s*(\d{2,3})/gi, type: 'K' },
    { regex: /(?:alle\s+)?liggers?\s*[:=]?\s*(HE[AB]|IPE)\s*(\d{2,3})/gi, type: 'L' },
    { regex: /(?:alle\s+)?spanten?\s*[:=]?\s*(HE[AB]|IPE)\s*(\d{2,3})/gi, type: 'SP' },
    { regex: /hoofdkolommen?\s*[:=]?\s*(HE[AB]|IPE)\s*(\d{2,3})/gi, type: 'K' },
    { regex: /gevelkolommen?\s*[:=]?\s*(HE[AB]|IPE)\s*(\d{2,3})/gi, type: 'K' },
  ]
  
  for (const { regex, type } of contextPatronen) {
    regex.lastIndex = 0
    const match = regex.exec(volledgeTekst)
    if (match) {
      const profiel = `${match[1].toUpperCase()} ${match[2]}`
      const validated = valideerProfiel(profiel)
      if (validated.geldig) {
        koppelingen.push({
          elementId: `${type}*`,  // Wildcard voor alle elementen van dit type
          profiel: validated.genormaliseerd!,
          betrouwbaarheid: 0.6,
          bron: bestandsnaam,
          methode: 'context'
        })
      }
    }
  }
  
  return koppelingen
}

// === HOOFD FUNCTIE: ROBUUSTE DATABASE BUILDER ===

/**
 * Bouw een gevalideerde profiel database uit PDF bestanden
 */
export async function bouwRobuusteProfielDatabase(files: File[]): Promise<RobuusteProfielDatabase> {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`🔧 ROBUUSTE PROFIEL KOPPELING ANALYSE v2.0`)
  console.log(`${'═'.repeat(70)}\n`)
  
  const database: RobuusteProfielDatabase = {
    elementen: new Map(),
    stuklijst: [],
    assen: { x: [], y: [] },
    validatie: {
      totaalElementen: 0,
      gevalideerd: 0,
      metProfiel: 0,
      metPositie: 0,
      conflicten: []
    },
    bronnen: [],
    aangemaakt: new Date()
  }
  
  // Verzamel alle data uit alle bestanden
  const alleKoppelingen: ProfielKoppeling[] = []
  const allePosities: ElementPositie[] = []
  const alleStuklijstItems: StuklijstItem[] = []
  
  for (const file of files) {
    try {
      console.log(`\n📄 Analyseren: ${file.name}`)
      database.bronnen.push(file.name)
      
      const tekstItems = await extraheerTekstMetPosities(file)
      
      // 1. Extract stuklijst
      const stuklijst = extraheerStuklijst(tekstItems, file.name)
      alleStuklijstItems.push(...stuklijst)
      console.log(`   📋 Stuklijst: ${stuklijst.length} items`)
      
      // 2. Extract as-raster
      const assen = extraheerAsRaster(tekstItems)
      if (assen.x.length > database.assen.x.length) {
        database.assen = assen
      }
      console.log(`   📐 Assen: ${assen.x.length} x ${assen.y.length}`)
      
      // 3. Extract element posities
      const posities = koppelElementenAanRaster(tekstItems, assen, file.name)
      allePosities.push(...posities)
      console.log(`   📍 Posities: ${posities.length} elementen`)
      
      // 4. Extract profiel koppelingen
      const koppelingen = vindProfielKoppelingen(tekstItems, file.name)
      alleKoppelingen.push(...koppelingen)
      console.log(`   🔗 Koppelingen: ${koppelingen.length} gevonden`)
      
    } catch (error) {
      console.error(`   ❌ Fout bij ${file.name}:`, error)
    }
  }
  
  // Combineer en valideer alle data
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`🔄 COMBINEREN EN VALIDEREN...`)
  
  // Verzamel alle unieke element IDs
  const alleElementIds = new Set<string>()
  alleKoppelingen.forEach(k => {
    if (!k.elementId.includes('*')) {
      alleElementIds.add(k.elementId)
    }
  })
  allePosities.forEach(p => alleElementIds.add(p.elementId))
  alleStuklijstItems.forEach(s => alleElementIds.add(s.elementId))
  
  database.validatie.totaalElementen = alleElementIds.size
  
  // Bouw element database met conflict resolutie
  for (const elementId of alleElementIds) {
    const koppelingen = alleKoppelingen.filter(k => k.elementId === elementId)
    const posities = allePosities.filter(p => p.elementId === elementId)
    const stuklijst = alleStuklijstItems.find(s => s.elementId === elementId)
    
    // Bepaal beste profiel (hoogste betrouwbaarheid)
    let besteProfiel: string | undefined
    let besteBetrouwbaarheid = 0
    const bronnen: Array<{ bron: string, betrouwbaarheid: number }> = []
    
    for (const koppeling of koppelingen) {
      bronnen.push({ bron: koppeling.bron, betrouwbaarheid: koppeling.betrouwbaarheid })
      if (koppeling.betrouwbaarheid > besteBetrouwbaarheid) {
        besteBetrouwbaarheid = koppeling.betrouwbaarheid
        besteProfiel = koppeling.profiel
      }
    }
    
    // Stuklijst heeft hoge betrouwbaarheid
    if (stuklijst && stuklijst.betrouwbaarheid > besteBetrouwbaarheid) {
      besteProfiel = stuklijst.profiel
      besteBetrouwbaarheid = stuklijst.betrouwbaarheid
      bronnen.push({ bron: stuklijst.bron, betrouwbaarheid: stuklijst.betrouwbaarheid })
    }
    
    // Bepaal beste positie
    let bestePositie: ElementPositie | undefined
    for (const positie of posities) {
      if (!bestePositie || positie.betrouwbaarheid > bestePositie.betrouwbaarheid) {
        bestePositie = positie
      }
    }
    
    // Check voor conflicten
    const profielSet = new Set(koppelingen.map(k => k.profiel))
    if (profielSet.size > 1) {
      database.validatie.conflicten.push({
        elementId,
        conflict: `Meerdere profielen gevonden: ${[...profielSet].join(', ')}`
      })
    }
    
    // Valideer het profiel
    const validatie = besteProfiel ? valideerProfiel(besteProfiel) : { geldig: false }
    
    database.elementen.set(elementId, {
      profiel: validatie.geldig ? validatie.genormaliseerd! : besteProfiel || 'ONBEKEND',
      lengte: stuklijst?.lengte,
      positie: bestePositie ? {
        as1: bestePositie.as1,
        as2: bestePositie.as2,
        x: bestePositie.x,
        y: bestePositie.y
      } : undefined,
      bronnen,
      totaalBetrouwbaarheid: besteBetrouwbaarheid,
      gevalideerd: validatie.geldig
    })
    
    if (besteProfiel) database.validatie.metProfiel++
    if (bestePositie) database.validatie.metPositie++
    if (validatie.geldig) database.validatie.gevalideerd++
  }
  
  // Voeg wildcard koppelingen toe als default voor elementen zonder specifieke koppeling
  const wildcardKoppelingen = alleKoppelingen.filter(k => k.elementId.includes('*'))
  for (const wildcard of wildcardKoppelingen) {
    const type = wildcard.elementId.charAt(0)
    console.log(`   📌 Context default gevonden: ${type}* → ${wildcard.profiel}`)
  }
  
  database.stuklijst = alleStuklijstItems
  
  // Log resultaten
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`📊 RESULTAAT:`)
  console.log(`   Totaal elementen:    ${database.validatie.totaalElementen}`)
  console.log(`   Met profiel:         ${database.validatie.metProfiel}`)
  console.log(`   Met positie:         ${database.validatie.metPositie}`)
  console.log(`   Gevalideerd:         ${database.validatie.gevalideerd}`)
  console.log(`   Conflicten:          ${database.validatie.conflicten.length}`)
  console.log(`   Stuklijst items:     ${database.stuklijst.length}`)
  console.log(`   Assen:               ${database.assen.x.length} x ${database.assen.y.length}`)
  console.log(`${'─'.repeat(70)}\n`)
  
  // Log conflicten
  if (database.validatie.conflicten.length > 0) {
    console.log(`⚠️ CONFLICTEN:`)
    for (const conflict of database.validatie.conflicten.slice(0, 5)) {
      console.log(`   ${conflict.elementId}: ${conflict.conflict}`)
    }
    if (database.validatie.conflicten.length > 5) {
      console.log(`   ... en ${database.validatie.conflicten.length - 5} meer`)
    }
  }
  
  return database
}

// === EXPORT: COMPATIBLE MET BESTAANDE CODE ===

import type { ProfielDatabase } from './profielKoppeling'

/**
 * Converteer robuuste database naar bestaand formaat voor backwards compatibility
 */
export function converteerNaarLegacyFormaat(robuust: RobuusteProfielDatabase): ProfielDatabase {
  const legacy: ProfielDatabase = {
    kolommen: new Map(),
    liggers: new Map(),
    spanten: new Map(),
    gordingen: new Map(),
    windverbanden: new Map(),
    defaults: {
      kolom: 'HEB 200',
      ligger: 'IPE 300',
      spant: 'HEA 200',
      gording: 'UNP 120',
      windverband: 'L 60.60.6'
    },
    gevondenProfielen: new Set(),
    bronnen: robuust.bronnen
  }
  
  // Converteer elementen
  for (const [id, data] of robuust.elementen) {
    const type = id.charAt(0).toUpperCase()
    const koppeling = {
      elementId: id,
      elementType: type === 'K' ? 'kolom' as const : 
                   type === 'L' ? 'ligger' as const :
                   type === 'S' ? 'spant' as const :
                   type === 'G' ? 'gording' as const :
                   type === 'W' ? 'windverband' as const : 'onbekend' as const,
      profiel: data.profiel,
      bronTekening: data.bronnen[0]?.bron || '',
      betrouwbaarheid: data.totaalBetrouwbaarheid
    }
    
    legacy.gevondenProfielen.add(data.profiel)
    
    switch (type) {
      case 'K':
      case 'H':
        legacy.kolommen.set(id, koppeling)
        break
      case 'L':
        legacy.liggers.set(id, koppeling)
        break
      case 'S':
        legacy.spanten.set(id, koppeling)
        break
      case 'G':
        legacy.gordingen.set(id, koppeling)
        break
      case 'W':
        legacy.windverbanden.set(id, koppeling)
        break
    }
  }
  
  // Update defaults gebaseerd op meest voorkomende profielen
  const typeCount: Record<string, Map<string, number>> = {
    K: new Map(), L: new Map(), S: new Map(), G: new Map(), W: new Map()
  }
  
  for (const [id, data] of robuust.elementen) {
    const type = id.charAt(0).toUpperCase()
    if (typeCount[type]) {
      typeCount[type].set(data.profiel, (typeCount[type].get(data.profiel) || 0) + 1)
    }
  }
  
  for (const [type, counts] of Object.entries(typeCount)) {
    if (counts.size > 0) {
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
      const mostCommon = sorted[0][0]
      switch (type) {
        case 'K': legacy.defaults.kolom = mostCommon; break
        case 'L': legacy.defaults.ligger = mostCommon; break
        case 'S': legacy.defaults.spant = mostCommon; break
        case 'G': legacy.defaults.gording = mostCommon; break
        case 'W': legacy.defaults.windverband = mostCommon; break
      }
    }
  }
  
  // Voeg dak info toe als beschikbaar
  if (robuust.dak) {
    legacy.dak = robuust.dak
  }
  
  return legacy
}
