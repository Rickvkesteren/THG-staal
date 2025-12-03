/**
 * Slim PDF Reader v1.0
 * 
 * Geavanceerde PDF tekst extractie voor constructie tekeningen
 * met context-bewuste parsing en multi-pattern matching.
 * 
 * VERBETERINGEN:
 * 1. Tabel/stuklijst detectie
 * 2. Nabijheids-gebaseerde element-profiel koppeling
 * 3. Context-bewuste parsing (zoek rond element IDs)
 * 4. Maatlijn herkenning met pijlen/extensies
 * 5. Legenda/titelblok parsing
 * 6. Multi-line profiel referenties
 * 7. As-labels en raster detectie
 */

import * as pdfjsLib from 'pdfjs-dist'

// Configureer PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// === TYPE DEFINITIES ===

export interface SlimTextItem {
  text: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontName: string
  // Classificatie
  type: TextItemType
  confidence: number
  // Gerelateerde items
  nearbyItems: number[]  // indices
}

export type TextItemType = 
  | 'profiel'        // HEB 300, IPE 400
  | 'element-id'     // K1, L2, SP3
  | 'maat-mm'        // 6000, 7500
  | 'maat-m'         // 6.0, 7.5
  | 'as-letter'      // A, B, C
  | 'as-nummer'      // 1, 2, 3
  | 'schaal'         // 1:100
  | 'peil'           // +8000, -500
  | 'hoek'           // 45°, 12.5°
  | 'gewicht'        // 125 kg, 2.5 ton
  | 'tekst'          // Overige tekst
  | 'onbekend'

export interface TabelRij {
  cellen: string[]
  yPositie: number
  type: 'header' | 'data' | 'onbekend'
}

export interface GedeteerdeTabel {
  type: 'stuklijst' | 'legenda' | 'materiaalllijst' | 'onbekend'
  headers: string[]
  rijen: TabelRij[]
  positie: { x: number, y: number, width: number, height: number }
  confidence: number
}

export interface ElementProfielKoppeling {
  elementId: string
  elementType: 'kolom' | 'ligger' | 'spant' | 'gording' | 'windverband' | 'onbekend'
  profiel: string | null
  profielBetrouwbaarheid: number
  lengte: number | null
  gewicht: number | null
  positie: { x: number, y: number } | null
  asPositie: { as: string, nummer: number } | null
  bronnen: string[]  // Waar info vandaan komt
}

export interface MaatAnnotatie {
  waarde: number
  eenheid: 'mm' | 'm'
  type: 'lengte' | 'hoogte' | 'breedte' | 'hartafstand' | 'peil' | 'onbekend'
  positie: { x: number, y: number }
  richting: 'horizontaal' | 'verticaal' | 'diagonaal'
  // Gekoppelde elementen
  gekoppeldAan: string[]
}

export interface AsInfo {
  label: string
  type: 'letter' | 'nummer'
  positie: number  // X voor letter-assen, Y voor nummer-assen
  // Afgeleiden
  vorigAfstand?: number
  volgendeAfstand?: number
}

export interface SlimPDFResultaat {
  // Basis extractie
  tekstItems: SlimTextItem[]
  totaalTekst: string
  
  // Gedetecteerde structuren
  tabellen: GedeteerdeTabel[]
  maatAnnotaties: MaatAnnotatie[]
  
  // Element informatie
  elementKoppelingen: Map<string, ElementProfielKoppeling>
  
  // Raster/grid
  assenX: AsInfo[]  // Letters (A, B, C...)
  assenY: AsInfo[]  // Nummers (1, 2, 3...)
  
  // Metadata
  schaal: number | null
  tekeningNummer: string | null
  tekeningTitel: string | null
  
  // Alle gevonden profielen
  profielen: Set<string>  // Used externally
  
  // Kwaliteit
  extractieKwaliteit: number  // 0-100
  waarschuwingen: string[]
}

// === PROFIEL DATABASE ===

const BEKENDE_PROFIELEN = new Set([
  // HEB serie
  'HEB 100', 'HEB 120', 'HEB 140', 'HEB 160', 'HEB 180', 'HEB 200',
  'HEB 220', 'HEB 240', 'HEB 260', 'HEB 280', 'HEB 300', 'HEB 320',
  'HEB 340', 'HEB 360', 'HEB 400', 'HEB 450', 'HEB 500', 'HEB 550', 'HEB 600',
  // HEA serie
  'HEA 100', 'HEA 120', 'HEA 140', 'HEA 160', 'HEA 180', 'HEA 200',
  'HEA 220', 'HEA 240', 'HEA 260', 'HEA 280', 'HEA 300', 'HEA 320',
  'HEA 340', 'HEA 360', 'HEA 400', 'HEA 450', 'HEA 500', 'HEA 550', 'HEA 600',
  // IPE serie
  'IPE 100', 'IPE 120', 'IPE 140', 'IPE 160', 'IPE 180', 'IPE 200',
  'IPE 220', 'IPE 240', 'IPE 270', 'IPE 300', 'IPE 330', 'IPE 360',
  'IPE 400', 'IPE 450', 'IPE 500', 'IPE 550', 'IPE 600',
  // UNP serie
  'UNP 80', 'UNP 100', 'UNP 120', 'UNP 140', 'UNP 160', 'UNP 180',
  'UNP 200', 'UNP 220', 'UNP 240', 'UNP 260', 'UNP 280', 'UNP 300',
  // INP serie
  'INP 80', 'INP 100', 'INP 120', 'INP 140', 'INP 160', 'INP 180',
  'INP 200', 'INP 220', 'INP 240', 'INP 260', 'INP 280', 'INP 300',
  // HEM serie
  'HEM 100', 'HEM 120', 'HEM 140', 'HEM 160', 'HEM 180', 'HEM 200',
  'HEM 220', 'HEM 240', 'HEM 260', 'HEM 280', 'HEM 300',
  // Hoekstaal (L-profielen)
  'L 30x30x3', 'L 40x40x4', 'L 50x50x5', 'L 60x60x6', 'L 70x70x7',
  'L 80x80x8', 'L 90x90x9', 'L 100x100x10', 'L 120x120x12',
  // Kokerprofielen
  'RHS 100x50', 'RHS 120x60', 'RHS 150x100', 'RHS 200x100',
  'SHS 60x60', 'SHS 80x80', 'SHS 100x100', 'SHS 120x120', 'SHS 150x150',
  // C-profielen (koudgevormd)
  'C 100', 'C 120', 'C 140', 'C 160', 'C 180', 'C 200', 'C 220', 'C 240',
])

// Patronen voor profiel herkenning
const PROFIEL_PATRONEN = [
  // HEB/HEA/HEM met of zonder spatie
  /\b(HE[ABM])\s*(\d{2,3})\s*([AB])?\b/gi,
  // IPE
  /\b(IPE)\s*(\d{2,3})\b/gi,
  // UNP/INP
  /\b([UI]NP)\s*(\d{2,3})\b/gi,
  // Hoekstaal L 80x80x8 of L80.80.8
  /\b(L)\s*(\d{2,3})\s*[xX.×]\s*(\d{2,3})\s*[xX.×]\s*(\d{1,2})\b/gi,
  // Kokerprofielen RHS/SHS
  /\b(RHS|SHS)\s*(\d{2,3})\s*[xX×]\s*(\d{2,3})\b/gi,
  // C-profielen
  /\bC\s*(\d{2,3})\b/gi,
  // HE 200 A (spatie tussen HE en nummer)
  /\b(HE)\s+(\d{2,3})\s*([ABM])\b/gi,
]

// Element ID patronen
const ELEMENT_PATRONEN = [
  // Kolommen: K1, K-1, K01, K 1, kolom 1
  { pattern: /\b(K)[-\s]?(\d{1,3})\b/gi, type: 'kolom' as const },
  { pattern: /\bkolom\s*(\d{1,3})\b/gi, type: 'kolom' as const, prefix: 'K' },
  // Liggers: L1, L-1, HX1, HY1
  { pattern: /\b(L|HX|HY)[-\s]?(\d{1,3})\b/gi, type: 'ligger' as const },
  { pattern: /\bligger\s*(\d{1,3})\b/gi, type: 'ligger' as const, prefix: 'L' },
  // Spanten: SP1, SP-1, S1
  { pattern: /\b(SP|SPANT)[-\s]?(\d{1,3})\b/gi, type: 'spant' as const },
  { pattern: /\bspant\s*(\d{1,3})\b/gi, type: 'spant' as const, prefix: 'SP' },
  // Gordingen: G1, G-1
  { pattern: /\b(G|GORDING)[-\s]?(\d{1,3})\b/gi, type: 'gording' as const },
  // Windverbanden: WV1, W1
  { pattern: /\b(WV|W)[-\s]?(\d{1,3})\b/gi, type: 'windverband' as const },
]

// === HOOFDFUNCTIE ===

/**
 * Slim uitlezen van een PDF bestand
 */
export async function leesSlimPDF(file: File): Promise<SlimPDFResultaat> {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`📖 SLIM PDF READER: ${file.name}`)
  console.log(`${'═'.repeat(70)}`)
  
  const resultaat: SlimPDFResultaat = {
    tekstItems: [],
    totaalTekst: '',
    tabellen: [],
    maatAnnotaties: [],
    elementKoppelingen: new Map(),
    assenX: [],
    assenY: [],
    schaal: null,
    tekeningNummer: null,
    tekeningTitel: null,
    profielen: new Set(),
    extractieKwaliteit: 0,
    waarschuwingen: []
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    console.log(`📄 ${pdf.numPages} pagina's`)
    
    // === STAP 1: Extraheer alle tekst met posities ===
    console.log(`\n1️⃣  Tekst extractie...`)
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.0 })
      const textContent = await page.getTextContent()
      
      for (const item of textContent.items as any[]) {
        if (!item.str || item.str.trim() === '') continue
        
        const transform = item.transform
        const x = transform[4]
        const y = viewport.height - transform[5]
        const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]) || 12
        
        const slimItem: SlimTextItem = {
          text: item.str.trim(),
          x,
          y,
          width: item.width || item.str.length * fontSize * 0.6,
          height: fontSize,
          fontSize,
          fontName: item.fontName || '',
          type: 'onbekend',
          confidence: 0,
          nearbyItems: []
        }
        
        // Classificeer item
        classificeerTekstItem(slimItem)
        
        resultaat.tekstItems.push(slimItem)
      }
    }
    
    // Bouw totale tekst
    resultaat.totaalTekst = resultaat.tekstItems.map(t => t.text).join(' ')
    console.log(`   ${resultaat.tekstItems.length} tekst items geëxtraheerd`)
    
    // === STAP 2: Bereken nabijheid relaties ===
    console.log(`\n2️⃣  Nabijheid analyse...`)
    berekenNabijheid(resultaat.tekstItems)
    
    // === STAP 3: Detecteer tabellen/stuklijsten ===
    console.log(`\n3️⃣  Tabel detectie...`)
    resultaat.tabellen = detecteerTabellen(resultaat.tekstItems)
    console.log(`   ${resultaat.tabellen.length} tabellen gevonden`)
    
    // === STAP 4: Extraheer profielen ===
    console.log(`\n4️⃣  Profiel extractie...`)
    resultaat.profielen = extraheerProfielen(resultaat.totaalTekst, resultaat.tekstItems)
    console.log(`   ${resultaat.profielen.size} unieke profielen: ${[...resultaat.profielen].join(', ')}`)
    
    // === STAP 5: Extraheer element IDs en koppel profielen ===
    console.log(`\n5️⃣  Element-profiel koppeling...`)
    resultaat.elementKoppelingen = koppelElementenAanProfielen(resultaat.tekstItems, resultaat.tabellen, resultaat.profielen)
    console.log(`   ${resultaat.elementKoppelingen.size} elementen gekoppeld`)
    
    // === STAP 6: Extraheer maten ===
    console.log(`\n6️⃣  Maat extractie...`)
    resultaat.maatAnnotaties = extraheerMaten(resultaat.tekstItems)
    console.log(`   ${resultaat.maatAnnotaties.length} maten gevonden`)
    
    // === STAP 7: Detecteer raster/assen ===
    console.log(`\n7️⃣  Raster detectie...`)
    const { assenX, assenY } = detecteerRaster(resultaat.tekstItems)
    resultaat.assenX = assenX
    resultaat.assenY = assenY
    console.log(`   Assen X: ${assenX.map(a => a.label).join(', ') || 'geen'}`)
    console.log(`   Assen Y: ${assenY.map(a => a.label).join(', ') || 'geen'}`)
    
    // === STAP 8: Detecteer metadata ===
    console.log(`\n8️⃣  Metadata extractie...`)
    resultaat.schaal = detecteerSchaal(resultaat.totaalTekst)
    resultaat.tekeningNummer = detecteerTekeningNummer(resultaat.totaalTekst, file.name)
    resultaat.tekeningTitel = detecteerTitel(resultaat.tekstItems, file.name)
    console.log(`   Schaal: ${resultaat.schaal ? `1:${resultaat.schaal}` : 'niet gevonden'}`)
    console.log(`   Tekening: ${resultaat.tekeningNummer || 'onbekend'}`)
    
    // === STAP 9: Bereken kwaliteit ===
    resultaat.extractieKwaliteit = berekenKwaliteit(resultaat)
    console.log(`\n✅ Extractie kwaliteit: ${resultaat.extractieKwaliteit}%`)
    
  } catch (error) {
    console.error('❌ Fout bij PDF lezen:', error)
    resultaat.waarschuwingen.push(`Extractie fout: ${error}`)
  }
  
  console.log(`${'═'.repeat(70)}\n`)
  
  return resultaat
}

// === CLASSIFICATIE ===

function classificeerTekstItem(item: SlimTextItem): void {
  const text = item.text
  
  // Profiel check
  for (const pattern of PROFIEL_PATRONEN) {
    if (pattern.test(text)) {
      item.type = 'profiel'
      item.confidence = 0.9
      return
    }
    pattern.lastIndex = 0  // Reset regex
  }
  
  // Element ID check
  for (const { pattern } of ELEMENT_PATRONEN) {
    if (pattern.test(text)) {
      item.type = 'element-id'
      item.confidence = 0.9
      return
    }
    pattern.lastIndex = 0
  }
  
  // Maat in mm (4-5 cijfers)
  if (/^\d{4,5}$/.test(text)) {
    const val = parseInt(text)
    if (val >= 500 && val <= 50000) {
      item.type = 'maat-mm'
      item.confidence = 0.8
      return
    }
  }
  
  // Maat in m (decimaal)
  if (/^\d{1,2}[.,]\d{1,3}$/.test(text)) {
    item.type = 'maat-m'
    item.confidence = 0.7
    return
  }
  
  // As letter (enkele hoofdletter A-M, geen I)
  if (/^[A-HJ-M]$/.test(text)) {
    item.type = 'as-letter'
    item.confidence = 0.6
    return
  }
  
  // As nummer (1-20)
  if (/^\d{1,2}$/.test(text)) {
    const num = parseInt(text)
    if (num >= 1 && num <= 30) {
      item.type = 'as-nummer'
      item.confidence = 0.6
      return
    }
  }
  
  // Schaal
  if (/1\s*:\s*\d+/.test(text)) {
    item.type = 'schaal'
    item.confidence = 0.95
    return
  }
  
  // Peil (+8000, -500)
  if (/^[+-]\s*\d{3,5}$/.test(text)) {
    item.type = 'peil'
    item.confidence = 0.85
    return
  }
  
  // Hoek (45°, 12.5°)
  if (/\d+[.,]?\d*\s*°/.test(text)) {
    item.type = 'hoek'
    item.confidence = 0.8
    return
  }
  
  // Gewicht
  if (/\d+[.,]?\d*\s*(kg|ton)/i.test(text)) {
    item.type = 'gewicht'
    item.confidence = 0.85
    return
  }
  
  // Anders is het tekst
  if (text.length > 2) {
    item.type = 'tekst'
    item.confidence = 0.5
  }
}

// === NABIJHEID ===

function berekenNabijheid(items: SlimTextItem[]): void {
  const NABIJHEID_DREMPEL = 100  // pixels
  
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const afstand = Math.sqrt(
        Math.pow(items[i].x - items[j].x, 2) +
        Math.pow(items[i].y - items[j].y, 2)
      )
      
      if (afstand < NABIJHEID_DREMPEL) {
        items[i].nearbyItems.push(j)
        items[j].nearbyItems.push(i)
      }
    }
  }
}

// === TABEL DETECTIE ===

function detecteerTabellen(items: SlimTextItem[]): GedeteerdeTabel[] {
  const tabellen: GedeteerdeTabel[] = []
  
  // Groepeer items per Y-positie (rijen)
  const rijenMap = new Map<number, SlimTextItem[]>()
  
  for (const item of items) {
    // Rond Y af naar 5 pixels voor groepering
    const yRounded = Math.round(item.y / 5) * 5
    
    if (!rijenMap.has(yRounded)) {
      rijenMap.set(yRounded, [])
    }
    rijenMap.get(yRounded)!.push(item)
  }
  
  // Sorteer rijen op Y positie
  const gesorteerdeRijen = [...rijenMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([y, items]) => ({
      y,
      items: items.sort((a, b) => a.x - b.x)
    }))
  
  // Zoek naar rijen die een tabel vormen
  // Tabel criteria: 3+ opeenvolgende rijen met 2+ items elk
  let tabelStart = -1
  let opeenvolgend = 0
  
  for (let i = 0; i < gesorteerdeRijen.length; i++) {
    const rij = gesorteerdeRijen[i]
    
    if (rij.items.length >= 2) {
      if (tabelStart === -1) tabelStart = i
      opeenvolgend++
    } else {
      if (opeenvolgend >= 3) {
        // Maak tabel
        const tabelRijen = gesorteerdeRijen.slice(tabelStart, i)
        const tabel = bouwTabel(tabelRijen)
        if (tabel) tabellen.push(tabel)
      }
      tabelStart = -1
      opeenvolgend = 0
    }
  }
  
  // Check laatste reeks
  if (opeenvolgend >= 3) {
    const tabelRijen = gesorteerdeRijen.slice(tabelStart)
    const tabel = bouwTabel(tabelRijen)
    if (tabel) tabellen.push(tabel)
  }
  
  return tabellen
}

function bouwTabel(rijen: { y: number, items: SlimTextItem[] }[]): GedeteerdeTabel | null {
  if (rijen.length < 2) return null
  
  // Bepaal kolom posities uit eerste rij (header)
  const headerItems = rijen[0].items
  const kolomPosities = headerItems.map(item => item.x)
  
  // Bouw tabel rijen
  const tabelRijen: TabelRij[] = []
  
  for (let i = 0; i < rijen.length; i++) {
    const rijItems = rijen[i].items
    const cellen: string[] = []
    
    // Wijs items toe aan kolommen op basis van X positie
    for (const kolX of kolomPosities) {
      const item = rijItems.find(it => Math.abs(it.x - kolX) < 30)
      cellen.push(item?.text || '')
    }
    
    tabelRijen.push({
      cellen,
      yPositie: rijen[i].y,
      type: i === 0 ? 'header' : 'data'
    })
  }
  
  // Detecteer tabel type
  const headers = tabelRijen[0].cellen.map(c => c.toLowerCase())
  let type: GedeteerdeTabel['type'] = 'onbekend'
  
  if (headers.some(h => h.includes('pos') || h.includes('nr'))) {
    type = 'stuklijst'
  } else if (headers.some(h => h.includes('profiel') || h.includes('type'))) {
    type = 'materiaalllijst'
  } else if (headers.some(h => h.includes('symb') || h.includes('betekenis'))) {
    type = 'legenda'
  }
  
  // Bereken bounds
  const allItems = rijen.flatMap(r => r.items)
  const minX = Math.min(...allItems.map(i => i.x))
  const maxX = Math.max(...allItems.map(i => i.x + i.width))
  const minY = Math.min(...allItems.map(i => i.y))
  const maxY = Math.max(...allItems.map(i => i.y + i.height))
  
  return {
    type,
    headers: tabelRijen[0].cellen,
    rijen: tabelRijen,
    positie: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    },
    confidence: type !== 'onbekend' ? 0.8 : 0.5
  }
}

// === PROFIEL EXTRACTIE ===

function extraheerProfielen(tekst: string, items: SlimTextItem[]): Set<string> {
  const profielen = new Set<string>()
  
  // Methode 1: Direct uit tekst items
  for (const item of items) {
    if (item.type === 'profiel') {
      const genormaliseerd = normaliseerProfiel(item.text)
      if (genormaliseerd && BEKENDE_PROFIELEN.has(genormaliseerd)) {
        profielen.add(genormaliseerd)
      }
    }
  }
  
  // Methode 2: Regex op volledige tekst
  for (const pattern of PROFIEL_PATRONEN) {
    const matches = tekst.matchAll(pattern)
    for (const match of matches) {
      const genormaliseerd = normaliseerProfiel(match[0])
      if (genormaliseerd) {
        profielen.add(genormaliseerd)
      }
    }
  }
  
  // Methode 3: Zoek naar fragmenten die samen een profiel vormen
  // Bijv. "HE" op regel 1, "200" op regel 2, "A" op regel 3
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const text = item.text.toUpperCase()
    
    // Check of dit een profiel familie is (HE, IPE, UNP)
    if (/^HE[AB]?$/.test(text) || /^IPE$/.test(text) || /^[UI]NP$/.test(text)) {
      // Zoek een nummer in nabije items
      for (const nearbyIdx of item.nearbyItems) {
        const nearby = items[nearbyIdx]
        const numMatch = nearby.text.match(/^\d{2,3}$/)
        
        if (numMatch) {
          // Zoek ook een A/B suffix in nabijheid
          let suffix = ''
          for (const nearbyIdx2 of nearby.nearbyItems) {
            const suffix2 = items[nearbyIdx2]
            if (/^[AB]$/.test(suffix2.text.toUpperCase())) {
              suffix = suffix2.text.toUpperCase()
              break
            }
          }
          
          let profiel = text.startsWith('HE') && !text.endsWith('A') && !text.endsWith('B')
            ? `HE${suffix || 'B'} ${numMatch[0]}`
            : `${text} ${numMatch[0]}`
          
          // Fix formaat als nodig
          if (profiel.startsWith('HE ')) {
            profiel = profiel.replace('HE ', 'HEB ')
          }
          
          if (BEKENDE_PROFIELEN.has(profiel)) {
            profielen.add(profiel)
          }
        }
      }
    }
  }
  
  return profielen
}

function normaliseerProfiel(tekst: string): string | null {
  const upper = tekst.toUpperCase().trim()
  
  // HEB/HEA/HEM
  let match = upper.match(/(HE)\s*([ABM]?)\s*(\d{2,3})/)
  if (match) {
    const type = match[2] || 'B'  // Default naar B
    return `HE${type} ${match[3]}`
  }
  
  // HE 200 A formaat
  match = upper.match(/(HE)\s+(\d{2,3})\s*([ABM])/)
  if (match) {
    return `HE${match[3]} ${match[2]}`
  }
  
  // IPE
  match = upper.match(/(IPE)\s*(\d{2,3})/)
  if (match) {
    return `IPE ${match[2]}`
  }
  
  // UNP/INP
  match = upper.match(/([UI]NP)\s*(\d{2,3})/)
  if (match) {
    return `${match[1]} ${match[2]}`
  }
  
  // L-profiel
  match = upper.match(/L\s*(\d{2,3})\s*[X.×]\s*(\d{2,3})\s*[X.×]\s*(\d{1,2})/)
  if (match) {
    return `L ${match[1]}x${match[2]}x${match[3]}`
  }
  
  // RHS/SHS
  match = upper.match(/(RHS|SHS)\s*(\d{2,3})\s*[X×]\s*(\d{2,3})/)
  if (match) {
    return `${match[1]} ${match[2]}x${match[3]}`
  }
  
  // C-profiel
  match = upper.match(/C\s*(\d{2,3})/)
  if (match) {
    return `C ${match[1]}`
  }
  
  return null
}

// === ELEMENT-PROFIEL KOPPELING ===

function koppelElementenAanProfielen(
  items: SlimTextItem[],
  tabellen: GedeteerdeTabel[],
  bekendeProfielen: Set<string>
): Map<string, ElementProfielKoppeling> {
  const koppelingen = new Map<string, ElementProfielKoppeling>()
  
  // Helper: valideer profiel tegen bekende set
  const valideerTegenBekend = (profiel: string | null): boolean => {
    if (!profiel) return false
    return bekendeProfielen.has(profiel)
  }
  
  // Methode 1: Uit stuklijst tabellen
  for (const tabel of tabellen) {
    if (tabel.type !== 'stuklijst' && tabel.type !== 'materiaalllijst') continue
    
    // Vind kolom indices
    const posKolom = tabel.headers.findIndex(h => 
      /pos|nr|nummer|elem/i.test(h)
    )
    const profielKolom = tabel.headers.findIndex(h =>
      /profiel|type|sectie|doorsnede/i.test(h)
    )
    const lengteKolom = tabel.headers.findIndex(h =>
      /lengte|l|length/i.test(h)
    )
    const gewichtKolom = tabel.headers.findIndex(h =>
      /gewicht|kg|massa|weight/i.test(h)
    )
    
    for (const rij of tabel.rijen) {
      if (rij.type === 'header') continue
      
      // Haal element ID
      let elementId = posKolom >= 0 ? rij.cellen[posKolom] : ''
      if (!elementId) continue
      
      // Normaliseer element ID
      const { id, type } = normaliseerElementId(elementId)
      if (!id) continue
      
      // Haal profiel
      let profiel: string | null = null
      if (profielKolom >= 0) {
        profiel = normaliseerProfiel(rij.cellen[profielKolom])
      }
      
      // Haal lengte
      let lengte: number | null = null
      if (lengteKolom >= 0) {
        const lengteTekst = rij.cellen[lengteKolom]
        const lengteMatch = lengteTekst.match(/(\d+[.,]?\d*)/)
        if (lengteMatch) {
          lengte = parseFloat(lengteMatch[1].replace(',', '.'))
          // Converteer naar mm als nodig
          if (lengte < 100) lengte *= 1000
        }
      }
      
      // Haal gewicht
      let gewicht: number | null = null
      if (gewichtKolom >= 0) {
        const gewichtTekst = rij.cellen[gewichtKolom]
        const gewichtMatch = gewichtTekst.match(/(\d+[.,]?\d*)/)
        if (gewichtMatch) {
          gewicht = parseFloat(gewichtMatch[1].replace(',', '.'))
        }
      }
      
      // Valideer profiel tegen bekende set
      const isGevalideerd = valideerTegenBekend(profiel)
      
      koppelingen.set(id, {
        elementId: id,
        elementType: type,
        profiel,
        profielBetrouwbaarheid: profiel ? (isGevalideerd ? 0.95 : 0.7) : 0,
        lengte,
        gewicht,
        positie: null,
        asPositie: null,
        bronnen: ['stuklijst']
      })
    }
  }
  
  // Methode 2: Nabijheid-gebaseerde koppeling
  const elementItems = items.filter(i => i.type === 'element-id')
  const profielItems = items.filter(i => i.type === 'profiel')
  
  for (const elemItem of elementItems) {
    const { id, type } = normaliseerElementId(elemItem.text)
    if (!id) continue
    
    // Als al gekoppeld uit stuklijst, skip
    if (koppelingen.has(id) && koppelingen.get(id)!.profiel) continue
    
    // Zoek dichtstbijzijnde profiel
    let besteAfstand = Infinity
    let besteProfiel: string | null = null
    
    for (const profItem of profielItems) {
      const afstand = Math.sqrt(
        Math.pow(elemItem.x - profItem.x, 2) +
        Math.pow(elemItem.y - profItem.y, 2)
      )
      
      if (afstand < besteAfstand && afstand < 150) {
        besteAfstand = afstand
        besteProfiel = normaliseerProfiel(profItem.text)
      }
    }
    
    // Check ook in nabijheid (al berekend)
    if (!besteProfiel) {
      for (const nearbyIdx of elemItem.nearbyItems) {
        const nearby = items[nearbyIdx]
        if (nearby.type === 'profiel') {
          besteProfiel = normaliseerProfiel(nearby.text)
          if (besteProfiel) break
        }
      }
    }
    
    // Zoek lengte in nabijheid
    let lengte: number | null = null
    for (const nearbyIdx of elemItem.nearbyItems) {
      const nearby = items[nearbyIdx]
      if (nearby.type === 'maat-mm') {
        lengte = parseInt(nearby.text)
        break
      } else if (nearby.type === 'maat-m') {
        lengte = parseFloat(nearby.text.replace(',', '.')) * 1000
        break
      }
    }
    
    // Update of maak koppeling
    const existing = koppelingen.get(id)
    if (existing) {
      if (!existing.profiel && besteProfiel) {
        existing.profiel = besteProfiel
        existing.profielBetrouwbaarheid = 0.7
        existing.bronnen.push('nabijheid')
      }
      if (!existing.lengte && lengte) {
        existing.lengte = lengte
      }
    } else {
      koppelingen.set(id, {
        elementId: id,
        elementType: type,
        profiel: besteProfiel,
        profielBetrouwbaarheid: besteProfiel ? 0.7 : 0,
        lengte,
        gewicht: null,
        positie: { x: elemItem.x, y: elemItem.y },
        asPositie: null,
        bronnen: ['nabijheid']
      })
    }
  }
  
  // Methode 3: Context-gebaseerde detectie
  // Zoek patronen als "K1: HEB 300" of "kolom 1 - IPE 400"
  const contextPatronen = [
    /([KL]|SP|G|WV)[-\s]?(\d{1,3})\s*[:\-–]\s*(HE[ABM]|IPE|UNP)\s*(\d{2,3})/gi,
    /([KL]|SP|G|WV)[-\s]?(\d{1,3})\s+(HE[ABM]|IPE|UNP)\s*(\d{2,3})/gi,
  ]
  
  const totaalTekst = items.map(i => i.text).join(' ')
  
  for (const pattern of contextPatronen) {
    const matches = totaalTekst.matchAll(pattern)
    for (const match of matches) {
      const prefix = match[1].toUpperCase()
      const nummer = match[2]
      const profielType = match[3].toUpperCase()
      const profielNummer = match[4]
      
      const id = `${prefix}${nummer}`
      const profiel = `${profielType} ${profielNummer}`
      const type = bepaalElementType(prefix)
      
      if (!koppelingen.has(id) || !koppelingen.get(id)!.profiel) {
        const existing = koppelingen.get(id)
        if (existing) {
          existing.profiel = profiel
          existing.profielBetrouwbaarheid = 0.85
          existing.bronnen.push('context')
        } else {
          koppelingen.set(id, {
            elementId: id,
            elementType: type,
            profiel,
            profielBetrouwbaarheid: 0.85,
            lengte: null,
            gewicht: null,
            positie: null,
            asPositie: null,
            bronnen: ['context']
          })
        }
      }
    }
  }
  
  return koppelingen
}

function normaliseerElementId(tekst: string): { id: string | null, type: ElementProfielKoppeling['elementType'] } {
  const upper = tekst.toUpperCase().trim()
  
  // Kolommen
  let match = upper.match(/^K[-\s]?(\d{1,3})$/)
  if (match) return { id: `K${match[1]}`, type: 'kolom' }
  
  // Liggers
  match = upper.match(/^(L|HX|HY)[-\s]?(\d{1,3})$/)
  if (match) return { id: `L${match[2]}`, type: 'ligger' }
  
  // Spanten
  match = upper.match(/^(SP|SPANT|S)[-\s]?(\d{1,3})$/)
  if (match) return { id: `SP${match[2]}`, type: 'spant' }
  
  // Gordingen
  match = upper.match(/^G[-\s]?(\d{1,3})$/)
  if (match) return { id: `G${match[1]}`, type: 'gording' }
  
  // Windverbanden
  match = upper.match(/^(WV|W)[-\s]?(\d{1,3})$/)
  if (match) return { id: `WV${match[2]}`, type: 'windverband' }
  
  return { id: null, type: 'onbekend' }
}

function bepaalElementType(prefix: string): ElementProfielKoppeling['elementType'] {
  switch (prefix.toUpperCase()) {
    case 'K': return 'kolom'
    case 'L':
    case 'HX':
    case 'HY': return 'ligger'
    case 'SP':
    case 'S': return 'spant'
    case 'G': return 'gording'
    case 'WV':
    case 'W': return 'windverband'
    default: return 'onbekend'
  }
}

// === MAAT EXTRACTIE ===

function extraheerMaten(items: SlimTextItem[]): MaatAnnotatie[] {
  const maten: MaatAnnotatie[] = []
  
  for (const item of items) {
    if (item.type !== 'maat-mm' && item.type !== 'maat-m' && item.type !== 'peil') continue
    
    let waarde: number
    let eenheid: 'mm' | 'm'
    
    if (item.type === 'maat-mm') {
      waarde = parseInt(item.text)
      eenheid = 'mm'
    } else if (item.type === 'maat-m') {
      waarde = parseFloat(item.text.replace(',', '.')) * 1000
      eenheid = 'm'
    } else {
      // Peil
      waarde = parseInt(item.text.replace(/[+-\s]/g, ''))
      eenheid = 'mm'
    }
    
    // Bepaal type
    let type: MaatAnnotatie['type'] = 'onbekend'
    if (item.type === 'peil') {
      type = 'peil'
    } else if (waarde >= 4000 && waarde <= 12000) {
      type = 'hartafstand'  // Typische raster afstanden
    } else if (waarde >= 2000 && waarde <= 15000) {
      type = 'lengte'
    } else if (waarde >= 500 && waarde <= 3000) {
      type = 'breedte'
    }
    
    // Bepaal richting uit context
    let richting: MaatAnnotatie['richting'] = 'horizontaal'
    // Check nabije items voor hints
    for (const nearbyIdx of item.nearbyItems) {
      const nearby = items[nearbyIdx]
      // Verticale tekst of peil duidt op verticale maat
      if (nearby.type === 'peil' || Math.abs(nearby.y - item.y) > 50) {
        richting = 'verticaal'
        break
      }
    }
    
    // Zoek gekoppelde elementen
    const gekoppeld: string[] = []
    for (const nearbyIdx of item.nearbyItems) {
      const nearby = items[nearbyIdx]
      if (nearby.type === 'element-id') {
        const { id } = normaliseerElementId(nearby.text)
        if (id) gekoppeld.push(id)
      }
    }
    
    maten.push({
      waarde,
      eenheid,
      type,
      positie: { x: item.x, y: item.y },
      richting,
      gekoppeldAan: gekoppeld
    })
  }
  
  // Sorteer op waarde
  maten.sort((a, b) => b.waarde - a.waarde)
  
  return maten
}

// === RASTER DETECTIE ===

function detecteerRaster(items: SlimTextItem[]): { assenX: AsInfo[], assenY: AsInfo[] } {
  const assenX: AsInfo[] = []
  const assenY: AsInfo[] = []
  
  // Verzamel letter assen (A-M)
  const letterItems = items.filter(i => i.type === 'as-letter')
  const letters = [...new Set(letterItems.map(i => i.text.toUpperCase()))]
    .filter(l => /^[A-HJ-M]$/.test(l))  // Geen I
    .sort()
  
  for (const letter of letters) {
    const item = letterItems.find(i => i.text.toUpperCase() === letter)
    if (item) {
      assenX.push({
        label: letter,
        type: 'letter',
        positie: item.x
      })
    }
  }
  
  // Vul tussenliggende letters aan
  if (letters.length >= 2) {
    const eersteCode = letters[0].charCodeAt(0)
    const laatsteCode = letters[letters.length - 1].charCodeAt(0)
    
    for (let code = eersteCode; code <= laatsteCode; code++) {
      const letter = String.fromCharCode(code)
      if (letter === 'I') continue  // Skip I
      
      if (!assenX.find(a => a.label === letter)) {
        // Interpoleer positie
        const vorige = assenX.filter(a => a.label < letter).pop()
        const volgende = assenX.find(a => a.label > letter)
        
        if (vorige && volgende) {
          const pos = vorige.positie + (volgende.positie - vorige.positie) / 2
          assenX.push({
            label: letter,
            type: 'letter',
            positie: pos
          })
        }
      }
    }
    
    assenX.sort((a, b) => a.label.localeCompare(b.label))
  }
  
  // Verzamel nummer assen (1-20+)
  const nummerItems = items.filter(i => i.type === 'as-nummer')
  const nummers = [...new Set(nummerItems.map(i => parseInt(i.text)))]
    .filter(n => n >= 1 && n <= 30)
    .sort((a, b) => a - b)
  
  for (const nummer of nummers) {
    const item = nummerItems.find(i => parseInt(i.text) === nummer)
    if (item) {
      assenY.push({
        label: String(nummer),
        type: 'nummer',
        positie: item.y
      })
    }
  }
  
  // Bereken afstanden
  for (let i = 1; i < assenX.length; i++) {
    assenX[i].vorigAfstand = assenX[i].positie - assenX[i - 1].positie
  }
  for (let i = 1; i < assenY.length; i++) {
    assenY[i].vorigAfstand = assenY[i].positie - assenY[i - 1].positie
  }
  
  return { assenX, assenY }
}

// === METADATA DETECTIE ===

function detecteerSchaal(tekst: string): number | null {
  // Zoek schaal patronen
  const patronen = [
    /schaal\s*[:\s]*1\s*:\s*(\d+)/gi,
    /scale\s*[:\s]*1\s*:\s*(\d+)/gi,
    /\bM\s*1\s*:\s*(\d+)/gi,
    /\b1\s*:\s*(\d+)\b/g
  ]
  
  for (const pattern of patronen) {
    const match = tekst.match(pattern)
    if (match) {
      const numMatch = match[0].match(/1\s*:\s*(\d+)/)
      if (numMatch) {
        const schaal = parseInt(numMatch[1])
        if (schaal >= 10 && schaal <= 500) {
          return schaal
        }
      }
    }
  }
  
  return null
}

function detecteerTekeningNummer(tekst: string, filename: string): string | null {
  // Zoek in tekst
  const patronen = [
    /(?:tek|drawing|drg|nr)[.\s:-]*(\d{2,}[-.\d]*)/gi,
    /(\d{3,}[-.\d]{3,})/g  // Lange nummers met scheidingstekens
  ]
  
  for (const pattern of patronen) {
    const match = tekst.match(pattern)
    if (match) {
      return match[0]
    }
  }
  
  // Probeer uit bestandsnaam
  const fnMatch = filename.match(/(\d{3,}[-.\d]*)/)
  if (fnMatch) {
    return fnMatch[1]
  }
  
  return null
}

function detecteerTitel(items: SlimTextItem[], filename: string): string | null {
  // Zoek grote tekst items (titel is vaak groot)
  const groteTekst = items
    .filter(i => i.fontSize > 14 && i.text.length > 5)
    .sort((a, b) => b.fontSize - a.fontSize)
  
  if (groteTekst.length > 0) {
    return groteTekst[0].text
  }
  
  // Anders gebruik bestandsnaam
  return filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
}

// === KWALITEIT BEREKENING ===

function berekenKwaliteit(resultaat: SlimPDFResultaat): number {
  let score = 0
  const maxScore = 100
  
  // Profielen gevonden (max 25)
  score += Math.min(25, resultaat.profielen.size * 5)
  
  // Element koppelingen (max 25)
  const aantalGekoppeld = [...resultaat.elementKoppelingen.values()]
    .filter(k => k.profiel).length
  score += Math.min(25, aantalGekoppeld * 2)
  
  // Maten gevonden (max 15)
  score += Math.min(15, resultaat.maatAnnotaties.length)
  
  // Raster gedetecteerd (max 15)
  if (resultaat.assenX.length > 0) score += 7
  if (resultaat.assenY.length > 0) score += 8
  
  // Tabellen gevonden (max 10)
  score += Math.min(10, resultaat.tabellen.length * 5)
  
  // Schaal gevonden (max 10)
  if (resultaat.schaal) score += 10
  
  return Math.min(maxScore, Math.round(score))
}

// === EXPORT: ANALYSEER MEERDERE PDF's ===

export async function analyseerMeerderePDFs(files: File[]): Promise<{
  perBestand: Map<string, SlimPDFResultaat>
  gecombineerd: {
    alleProfielen: Set<string>
    alleKoppelingen: Map<string, ElementProfielKoppeling>
    alleMaten: MaatAnnotatie[]
    assenX: AsInfo[]
    assenY: AsInfo[]
    gemiddeldeKwaliteit: number
  }
}> {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`📚 MULTI-PDF ANALYSE: ${files.length} bestanden`)
  console.log(`${'═'.repeat(70)}\n`)
  
  const perBestand = new Map<string, SlimPDFResultaat>()
  
  // Analyseer elk bestand
  for (const file of files) {
    const resultaat = await leesSlimPDF(file)
    perBestand.set(file.name, resultaat)
  }
  
  // Combineer resultaten
  const alleProfielen = new Set<string>()
  const alleKoppelingen = new Map<string, ElementProfielKoppeling>()
  const alleMaten: MaatAnnotatie[] = []
  let assenX: AsInfo[] = []
  let assenY: AsInfo[] = []
  let totaalKwaliteit = 0
  
  for (const [_filename, resultaat] of perBestand) {
    // Profielen
    for (const profiel of resultaat.profielen) {
      alleProfielen.add(profiel)
    }
    
    // Koppelingen (merge met bestaande, prioriteit naar hogere betrouwbaarheid)
    for (const [id, koppeling] of resultaat.elementKoppelingen) {
      const existing = alleKoppelingen.get(id)
      
      if (!existing || koppeling.profielBetrouwbaarheid > existing.profielBetrouwbaarheid) {
        alleKoppelingen.set(id, {
          ...koppeling,
          bronnen: existing 
            ? [...new Set([...existing.bronnen, ...koppeling.bronnen])]
            : koppeling.bronnen
        })
      } else if (existing && !existing.profiel && koppeling.profiel) {
        existing.profiel = koppeling.profiel
        existing.profielBetrouwbaarheid = koppeling.profielBetrouwbaarheid
        existing.bronnen.push(...koppeling.bronnen)
      }
    }
    
    // Maten
    alleMaten.push(...resultaat.maatAnnotaties)
    
    // Assen (gebruik langste)
    if (resultaat.assenX.length > assenX.length) {
      assenX = resultaat.assenX
    }
    if (resultaat.assenY.length > assenY.length) {
      assenY = resultaat.assenY
    }
    
    totaalKwaliteit += resultaat.extractieKwaliteit
  }
  
  const gemiddeldeKwaliteit = perBestand.size > 0 
    ? Math.round(totaalKwaliteit / perBestand.size)
    : 0
  
  // Deduplicate maten
  const uniqueMaten = alleMaten.filter((maat, idx, arr) => 
    arr.findIndex(m => m.waarde === maat.waarde && m.type === maat.type) === idx
  ).sort((a, b) => b.waarde - a.waarde)
  
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`📊 GECOMBINEERDE RESULTATEN:`)
  console.log(`   Profielen: ${alleProfielen.size} - ${[...alleProfielen].join(', ')}`)
  console.log(`   Elementen: ${alleKoppelingen.size} gekoppeld`)
  console.log(`   Maten: ${uniqueMaten.length} uniek`)
  console.log(`   Raster: ${assenX.map(a => a.label).join('-')} × ${assenY.map(a => a.label).join('-')}`)
  console.log(`   Kwaliteit: ${gemiddeldeKwaliteit}%`)
  console.log(`${'═'.repeat(70)}\n`)
  
  return {
    perBestand,
    gecombineerd: {
      alleProfielen,
      alleKoppelingen,
      alleMaten: uniqueMaten,
      assenX,
      assenY,
      gemiddeldeKwaliteit
    }
  }
}
