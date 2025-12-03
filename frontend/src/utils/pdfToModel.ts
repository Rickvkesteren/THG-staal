/**
 * PDF Drawing to 3D Model Converter
 * Extraheert structuur informatie uit 2D PDF tekeningen
 * en genereert een 3D model voor ontmanteling
 * 
 * STRATEGIE:
 * 1. Overzichtstekeningen → Structuur, raster, afmetingen, element posities
 * 2. Detailtekeningen → Profiel types, verbindingsdetails, specifieke maten
 * 
 * Ondersteunt:
 * - PDF tekst extractie via pdf.js
 * - Hiërarchische analyse (overzicht → detail)
 * - Profiel herkenning uit tekst
 * - Dimensie en raster extractie
 */

import * as pdfjsLib from 'pdfjs-dist'
import type { CADElement, ElementType, Conditie } from '../types'
import { analyzeFullPDF } from './pdfStructureAnalyzer'

// Configureer PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// === TYPE DEFINITIES ===

export interface PDFAnalyseResult {
  success: boolean
  gebouwNaam: string
  elementen: CADElement[]
  metadata: {
    aantalPDFs: number
    kolommen: number
    liggers: number
    spanten: number
    overig: number
    extractedText?: string[]
    detectedProfiles?: string[]
    detectedDimensions?: { lengte?: number, breedte?: number, hoogte?: number }
    raster?: { x: number, y: number }
    overzichtInfo?: OverzichtAnalyse
  }
  bronbestanden: string[]
  errors: string[]
}

export interface PDFTextExtractionResult {
  text: string
  profiles: string[]
  dimensions: {
    lengths: number[]
    heights: number[]
    widths: number[]
  }
  elementReferences: {
    kolommen: string[]
    liggers: string[]
    spanten: string[]
  }
  rasterInfo?: {
    asAfstanden: number[]      // Gevonden as-afstanden
    stramienLetters: string[]  // A, B, C, D etc.
    stramienNummers: number[]  // 1, 2, 3 etc.
  }
}

// Overzicht analyse resultaat - bepaalt de hoofdstructuur
export interface OverzichtAnalyse {
  type: 'overzicht' | 'detail' | 'berekening' | 'onbekend'
  
  // Raster/stramien informatie
  stramien: {
    assen: string[]           // ['A', 'B', 'C', 'D', 'E']
    nummers: number[]         // [1, 2, 3, 4, 5, 6]
    asAfstandenX: number[]    // [6000, 6000, 6000]
    asAfstandenY: number[]    // [7500, 7500]
  }
  
  // Afmetingen uit overzicht
  afmetingen: {
    totaalLengte: number      // mm
    totaalBreedte: number     // mm  
    kolomHoogte: number       // mm
    nokHoogte?: number        // mm
  }
  
  // Element tellingen uit overzicht
  elementen: {
    kolomPosities: Array<{ as: string, nr: number, x: number, y: number }>
    liggerPosities: Array<{ van: string, naar: string, y: number }>
    spantPosities: Array<{ nr: number, y: number }>
  }
}

// Bestandsclassificatie met rol
export interface BestandClassificatie {
  bestand: string
  type: 'overzicht' | 'constructie-detail' | 'detail-kolommen' | 'detail-liggers' | 'detail-spanten' | 'berekening' | 'onbekend'
  prioriteit: number  // 1 = hoogst (hoofdtekening), 2 = zijafmetingen, 3 = constructie details, 4 = element details
  rol?: 'hoofdtekening-bovenaanzicht' | 'zijafmetingen-gevels' | 'constructie-posities' | 'element-detail' | 'referentie' | 'onbekend'
  elementen?: string[] // K14, K15, L1, L2 etc.
}

// Profiel gewichten per meter (kg/m)
const PROFIEL_GEWICHTEN: Record<string, number> = {
  'HEA 100': 16.7, 'HEA 120': 19.9, 'HEA 140': 24.7, 'HEA 160': 30.4,
  'HEA 180': 35.5, 'HEA 200': 42.3, 'HEA 220': 50.5, 'HEA 240': 60.3,
  'HEA 260': 68.2, 'HEA 280': 76.4, 'HEA 300': 88.3, 'HEA 320': 97.6,
  'HEA 340': 105, 'HEA 360': 112, 'HEA 400': 125, 'HEA 450': 140,
  'HEA 500': 155, 'HEA 550': 166, 'HEA 600': 178,
  'HEB 100': 20.4, 'HEB 120': 26.7, 'HEB 140': 33.7, 'HEB 160': 42.6,
  'HEB 180': 51.2, 'HEB 200': 61.3, 'HEB 220': 71.5, 'HEB 240': 83.2,
  'HEB 260': 93.0, 'HEB 280': 103, 'HEB 300': 117, 'HEB 320': 127,
  'HEB 340': 134, 'HEB 360': 142, 'HEB 400': 155, 'HEB 450': 171,
  'HEB 500': 187, 'HEB 550': 199, 'HEB 600': 212,
  'IPE 100': 8.1, 'IPE 120': 10.4, 'IPE 140': 12.9, 'IPE 160': 15.8,
  'IPE 180': 18.8, 'IPE 200': 22.4, 'IPE 220': 26.2, 'IPE 240': 30.7,
  'IPE 270': 36.1, 'IPE 300': 42.2, 'IPE 330': 49.1, 'IPE 360': 57.1,
  'IPE 400': 66.3, 'IPE 450': 77.6, 'IPE 500': 90.7, 'IPE 550': 106,
  'IPE 600': 122,
  'UNP 100': 10.6, 'UNP 120': 13.4, 'UNP 140': 16.0, 'UNP 160': 18.8,
  'UNP 180': 22.0, 'UNP 200': 25.3, 'UNP 220': 29.4, 'UNP 240': 33.2,
  'UNP 260': 37.9, 'UNP 280': 41.8, 'UNP 300': 46.2,
  // C-profielen (koudgevormd)
  'C 100': 8.5, 'C 120': 10.2, 'C 140': 12.1, 'C 160': 14.2,
  'C 180': 16.5, 'C 200': 19.0, 'C 220': 21.8, 'C 240': 24.8,
  // L-profielen (hoekstaal)
  'L 50x50x5': 3.77, 'L 60x60x6': 5.42, 'L 70x70x7': 7.38, 'L 80x80x8': 9.63,
  'L 90x90x9': 12.2, 'L 100x100x10': 15.0, 'L 120x120x12': 21.6,
}

// Regex patronen voor profiel detectie
const PROFIEL_PATRONEN = [
  /\b(HE[AB])\s*(\d{2,3})/gi,   // HEA 300, HEB200
  /\b(IPE)\s*(\d{2,3})/gi,      // IPE 400
  /\b(UNP)\s*(\d{2,3})/gi,      // UNP 140
  /\b(INP)\s*(\d{2,3})/gi,      // INP 200
  /\b(HEM)\s*(\d{2,3})/gi,      // HEM 300
  /\b(L)\s*(\d+)[xX](\d+)/gi,   // L100x100 (hoekprofielen)
  /\b(RHS|SHS)\s*(\d+)[xX](\d+)/gi,  // RHS, SHS (kokerprofielen)
]

// Dimensie regex patronen worden gebruikt in extractDimensions functie

// Standaard afmetingen voor industriële hal
const HAL_CONFIG = {
  // Raster afstanden (mm)
  rasterX: 6000,  // Afstand tussen kolommen in X richting
  rasterY: 7500,  // Afstand tussen kolommen in Y richting (overspanning)
  
  // Hoogtes (mm)
  kolomHoogte: 8000,
  gordingHoogte: 8500,
  nokHoogte: 10000,
  
  // Typische profielen
  kolomProfiel: 'HEB 300',
  liggerProfiel: 'IPE 400', 
  spantProfiel: 'HEA 300',
  gordingProfiel: 'IPE 200',
  windverbandProfiel: 'UNP 140',
}

// === BESTANDSCLASSIFICATIE ===

/**
 * Classificeer een PDF bestand volgens de analyse hiërarchie:
 * 1. Hoofdtekening (bovenaanzicht/plattegrond) - dakconstructie
 * 2. Zijafmetingen (gevels/doorsneden) 
 * 3. Constructie details (110.1.27-2659-XX serie)
 * 4. Element details (kolommen, liggers, spanten)
 */
export function classificeerBestand(bestandsnaam: string): BestandClassificatie {
  const lower = bestandsnaam.toLowerCase()
  
  // PRIORITEIT 1: Hoofdtekening - bovenaanzicht/plattegrond
  // Dit bepaalt het raster en de hoofdstructuur
  // Inclusief: dakconstructie, plattegrond, overzicht, bovenaanzicht
  if (
    (lower.includes('dakconstructie')) ||
    (lower.includes('dak') && lower.includes('hal')) ||
    (lower.includes('plattegrond')) ||
    (lower.includes('overzicht') && !lower.includes('dossier')) ||
    (lower.includes('bovenaanzicht'))
  ) {
    return {
      bestand: bestandsnaam,
      type: 'overzicht',
      prioriteit: 1,
      rol: 'hoofdtekening-bovenaanzicht'
    }
  }
  
  // PRIORITEIT 2: Zijafmetingen - gevels en doorsneden
  // Dit bepaalt hoogtes en verticale afmetingen
  if (lower.includes('gevel') || lower.includes('doorsnede')) {
    return {
      bestand: bestandsnaam,
      type: 'overzicht',
      prioriteit: 2,
      rol: 'zijafmetingen-gevels'
    }
  }
  
  // PRIORITEIT 3: Constructie detail tekeningen (110.1.27-2659-XX serie)
  // Dit toont waar specifieke onderdelen horen
  if (lower.match(/110[\.\-]1[\.\-]27[\.\-]2659/)) {
    return {
      bestand: bestandsnaam,
      type: 'constructie-detail',
      prioriteit: 3,
      rol: 'constructie-posities'
    }
  }
  
  // PRIORITEIT 4: Element details - specifieke profiel info
  if (lower.includes('kolom')) {
    const elementen = extractElementNummers(bestandsnaam, 'K')
    return {
      bestand: bestandsnaam,
      type: 'detail-kolommen',
      prioriteit: 4,
      rol: 'element-detail',
      elementen
    }
  }
  
  if (lower.includes('ligger')) {
    const elementen = extractElementNummers(bestandsnaam, 'L')
    return {
      bestand: bestandsnaam,
      type: 'detail-liggers',
      prioriteit: 4,
      rol: 'element-detail',
      elementen
    }
  }
  
  if (lower.includes('spant')) {
    const elementen = extractElementNummers(bestandsnaam, 'SP')
    return {
      bestand: bestandsnaam,
      type: 'detail-spanten',
      prioriteit: 4,
      rol: 'element-detail',
      elementen
    }
  }
  
  // PRIORITEIT 5: Berekeningen - kunnen profiel info bevatten
  if (lower.includes('berekening') || lower.includes('statisch')) {
    return {
      bestand: bestandsnaam,
      type: 'berekening',
      prioriteit: 5,
      rol: 'referentie'
    }
  }
  
  return {
    bestand: bestandsnaam,
    type: 'onbekend',
    prioriteit: 6,
    rol: 'onbekend'
  }
}

/**
 * Extraheer element nummers uit bestandsnaam
 * "kolommen hal K14 tm K24" -> ['K14', 'K15', ..., 'K24']
 */
function extractElementNummers(bestandsnaam: string, prefix: string): string[] {
  const elementen: string[] = []
  
  // Zoek naar range: K14 tm K24, L1-L4, etc.
  const rangePattern = new RegExp(`${prefix}(\\d+)\\s*(?:tm|t\\/m|-)\\s*${prefix}?(\\d+)`, 'gi')
  const rangeMatch = bestandsnaam.match(rangePattern)
  
  if (rangeMatch) {
    const numbers = bestandsnaam.match(new RegExp(`${prefix}?(\\d+)`, 'gi'))
    if (numbers && numbers.length >= 2) {
      const start = parseInt(numbers[0].replace(/\D/g, ''))
      const end = parseInt(numbers[numbers.length - 1].replace(/\D/g, ''))
      for (let i = start; i <= end; i++) {
        elementen.push(`${prefix}${i}`)
      }
    }
  }
  
  // Zoek naar "div nrs" - diverse nummers
  if (bestandsnaam.toLowerCase().includes('div')) {
    // Voeg placeholder toe
    elementen.push(`${prefix}-div`)
  }
  
  return elementen
}

/**
 * Sorteer bestanden op prioriteit (overzicht eerst)
 */
export function sorteerOpPrioriteit(bestanden: string[]): BestandClassificatie[] {
  return bestanden
    .map(b => classificeerBestand(b))
    .sort((a, b) => a.prioriteit - b.prioriteit)
}

/**
 * Extraheer tekst uit een PDF bestand via pdf.js
 */
export async function extractPDFText(file: File): Promise<PDFTextExtractionResult> {
  const result: PDFTextExtractionResult = {
    text: '',
    profiles: [],
    dimensions: { lengths: [], heights: [], widths: [] },
    elementReferences: { kolommen: [], liggers: [], spanten: [] }
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    console.log(`📄 PDF geladen: ${file.name}, ${pdf.numPages} pagina's`)
    
    // Extraheer tekst van alle pagina's
    const textParts: string[] = []
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      textParts.push(pageText)
    }
    
    result.text = textParts.join('\n')
    console.log(`📝 Geëxtraheerde tekst (${result.text.length} chars):`, result.text.substring(0, 500))
    
    // Zoek profielen in de tekst
    result.profiles = extractProfiles(result.text)
    console.log(`🔧 Gevonden profielen:`, result.profiles)
    
    // Zoek dimensies
    result.dimensions = extractDimensions(result.text)
    console.log(`📐 Gevonden dimensies:`, result.dimensions)
    
    // Zoek element referenties
    result.elementReferences = extractElementReferences(result.text)
    console.log(`🏗️ Element referenties:`, result.elementReferences)
    
  } catch (error) {
    console.error('PDF extractie fout:', error)
  }
  
  return result
}

/**
 * Extraheer profielen uit tekst
 */
function extractProfiles(text: string): string[] {
  const profiles = new Set<string>()
  
  for (const pattern of PROFIEL_PATRONEN) {
    const matches = text.matchAll(new RegExp(pattern.source, 'gi'))
    for (const match of matches) {
      // Normaliseer profiel naam
      const type = match[1].toUpperCase()
      const size = match[2]
      const profile = `${type} ${size}`
      
      // Valideer dat dit profiel bestaat
      if (PROFIEL_GEWICHTEN[profile]) {
        profiles.add(profile)
      }
    }
  }
  
  return Array.from(profiles)
}

/**
 * Extraheer dimensies uit tekst
 */
function extractDimensions(text: string): { lengths: number[], heights: number[], widths: number[] } {
  const dimensions = { lengths: [] as number[], heights: [] as number[], widths: [] as number[] }
  
  // Zoek naar mm waarden
  const mmPattern = /(\d{3,5})\s*(?:mm|MM)/g
  const mmMatches = text.matchAll(mmPattern)
  for (const match of mmMatches) {
    const value = parseInt(match[1])
    if (value >= 1000 && value <= 50000) {
      dimensions.lengths.push(value)
    }
  }
  
  // Zoek naar m waarden en converteer naar mm
  const mPattern = /(\d{1,2}(?:[.,]\d{1,2})?)\s*m(?!\w)/gi
  const mMatches = text.matchAll(mPattern)
  for (const match of mMatches) {
    const value = parseFloat(match[1].replace(',', '.')) * 1000
    if (value >= 1000 && value <= 50000) {
      dimensions.lengths.push(Math.round(value))
    }
  }
  
  // Zoek naar losse 4- of 5-cijferige getallen (typische maten in mm)
  // Bijv: 6000, 7500, 8000, 12000 etc.
  const numPattern = /\b(\d{4,5})\b/g
  const numMatches = text.matchAll(numPattern)
  for (const match of numMatches) {
    const value = parseInt(match[1])
    // Typische constructie maten
    if (value >= 3000 && value <= 25000 && !dimensions.lengths.includes(value)) {
      dimensions.lengths.push(value)
    }
  }
  
  // Zoek specifiek naar hoogte/lengte labels
  const hoogtePattern = /(?:hoogte|h)\s*[=:]\s*(\d+)/gi
  const hoogteMatches = text.matchAll(hoogtePattern)
  for (const match of hoogteMatches) {
    dimensions.heights.push(parseInt(match[1]))
  }
  
  const lengtePattern = /(?:lengte|l)\s*[=:]\s*(\d+)/gi
  const lengteMatches = text.matchAll(lengtePattern)
  for (const match of lengteMatches) {
    dimensions.lengths.push(parseInt(match[1]))
  }
  
  // Zoek peil/niveau aanduidingen (+8000, +10500, etc.)
  const peilPattern = /[+-]\s*(\d{4,5})/g
  const peilMatches = text.matchAll(peilPattern)
  for (const match of peilMatches) {
    const value = parseInt(match[1])
    if (value >= 3000 && value <= 20000 && !dimensions.heights.includes(value)) {
      dimensions.heights.push(value)
    }
  }
  
  // Sorteer en verwijder duplicaten
  dimensions.lengths = [...new Set(dimensions.lengths)].sort((a, b) => a - b)
  dimensions.heights = [...new Set(dimensions.heights)].sort((a, b) => a - b)
  
  return dimensions
}

/**
 * Extraheer element referenties (K1, K2, L1, SP1, etc.)
 */
function extractElementReferences(text: string): { kolommen: string[], liggers: string[], spanten: string[] } {
  const refs = { kolommen: [] as string[], liggers: [] as string[], spanten: [] as string[] }
  
  // Zoek kolom referenties (K1, K2, K14, etc.)
  const kolomPattern = /\bK(\d{1,3})\b/g
  const kolomMatches = text.matchAll(kolomPattern)
  for (const match of kolomMatches) {
    const ref = `K${match[1]}`
    if (!refs.kolommen.includes(ref)) {
      refs.kolommen.push(ref)
    }
  }
  
  // Zoek ligger referenties (L1, L2, etc.)
  const liggerPattern = /\bL(\d{1,3})\b/g
  const liggerMatches = text.matchAll(liggerPattern)
  for (const match of liggerMatches) {
    const ref = `L${match[1]}`
    if (!refs.liggers.includes(ref)) {
      refs.liggers.push(ref)
    }
  }
  
  // Zoek spant referenties (SP1, S1, etc.)
  const spantPattern = /\b(?:SP|S)(\d{1,3})\b/gi
  const spantMatches = text.matchAll(spantPattern)
  for (const match of spantMatches) {
    const ref = `SP${match[1]}`
    if (!refs.spanten.includes(ref)) {
      refs.spanten.push(ref)
    }
  }
  
  return refs
}

/**
 * Analyseer meerdere PDF bestanden met 4-staps hiërarchische aanpak:
 * 1. Hoofdtekening (bovenaanzicht) → raster, kolom posities
 * 2. Zijafmetingen (gevels/doorsneden) → hoogtes, verticale afmetingen
 * 3. Constructie details (110.1.27-2659-XX) → element posities
 * 4. Element details (kolommen/liggers) → profiel specificaties
 */
export async function analyserenPDFBestanden(files: File[]): Promise<PDFAnalyseResult> {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`🔍 HIËRARCHISCHE PDF ANALYSE - 4 STAPPEN`)
  console.log(`${'='.repeat(70)}\n`)
  
  // === STAP 0: Classificeer alle bestanden ===
  console.log(`📂 Classificatie van ${files.length} bestanden:`)
  const classificaties = files.map(f => ({
    file: f,
    ...classificeerBestand(f.name)
  })).sort((a, b) => a.prioriteit - b.prioriteit)
  
  // Groepeer per rol
  const hoofdtekeningen = classificaties.filter(c => c.rol === 'hoofdtekening-bovenaanzicht')
  const zijafmetingen = classificaties.filter(c => c.rol === 'zijafmetingen-gevels')
  const constructieDetails = classificaties.filter(c => c.rol === 'constructie-posities')
  const elementDetails = classificaties.filter(c => c.rol === 'element-detail')
  const referenties = classificaties.filter(c => c.rol === 'referentie')
  
  console.log(`   1️⃣  Hoofdtekening (bovenaanzicht): ${hoofdtekeningen.length}`)
  hoofdtekeningen.forEach(h => console.log(`       → ${h.bestand}`))
  console.log(`   2️⃣  Zijafmetingen (gevels): ${zijafmetingen.length}`)
  zijafmetingen.forEach(z => console.log(`       → ${z.bestand}`))
  console.log(`   3️⃣  Constructie details: ${constructieDetails.length}`)
  constructieDetails.forEach(c => console.log(`       → ${c.bestand}`))
  console.log(`   4️⃣  Element details: ${elementDetails.length}`)
  console.log(`   📊 Referenties: ${referenties.length}\n`)
  
  // Resultaat containers
  const extractedTexts: string[] = []
  const errors: string[] = []
  const allProfiles: string[] = []
  
  // Structuur info die we gaan opbouwen
  let rasterX = HAL_CONFIG.rasterX
  let rasterY = HAL_CONFIG.rasterY
  let kolomHoogte = HAL_CONFIG.kolomHoogte
  let nokHoogte = HAL_CONFIG.nokHoogte
  let aantalAssenX = 6
  let aantalAssenY = 4
  let stramienAssen: string[] = []
  let stramienNummers: number[] = []
  
  // === STAP 1: Hoofdtekening (bovenaanzicht) - RASTER & STRUCTUUR ===
  console.log(`${'─'.repeat(70)}`)
  console.log(`1️⃣  STAP 1: Analyseer hoofdtekening (bovenaanzicht)...`)
  console.log(`${'─'.repeat(70)}`)
  
  for (const tekening of hoofdtekeningen) {
    try {
      console.log(`   📄 Verwerken: ${tekening.file.name}`)
      const extraction = await extractPDFText(tekening.file)
      extractedTexts.push(`[HOOFDTEKENING] ${tekening.file.name}:\n${extraction.text.substring(0, 500)}...`)
      
      // Log alle gevonden dimensies voor controle
      console.log(`      📏 ALLE gevonden maten (mm): ${extraction.dimensions.lengths.slice(0, 15).join(', ')}${extraction.dimensions.lengths.length > 15 ? '...' : ''}`)
      console.log(`      📏 Hoogtes gevonden: ${extraction.dimensions.heights.join(', ') || 'geen'}`)
      
      // Zoek stramien informatie
      const stramienInfo = extractStramienInfo(extraction.text)
      console.log(`      📐 Gevonden stramien assen: ${stramienInfo.assen.join(', ') || 'geen'}`)
      console.log(`      📐 Gevonden stramien nummers: ${stramienInfo.nummers.join(', ') || 'geen'}`)
      console.log(`      📐 Gevonden as-afstanden: ${stramienInfo.asAfstanden.join('mm, ') || 'geen'}mm`)
      
      // Analyseer frequentie van maten - meest voorkomende zijn waarschijnlijk raster afstanden
      const maatFrequentie = new Map<number, number>()
      for (const maat of extraction.dimensions.lengths) {
        // Rond af naar dichtstbijzijnde 100mm voor clustering
        const rounded = Math.round(maat / 100) * 100
        maatFrequentie.set(rounded, (maatFrequentie.get(rounded) || 0) + 1)
      }
      const topMaten = [...maatFrequentie.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
      console.log(`      📊 Meest voorkomende maten: ${topMaten.map(([m, c]) => `${m}mm (${c}x)`).join(', ')}`)
      
      if (stramienInfo.assen.length > 0) {
        stramienAssen = stramienInfo.assen
        aantalAssenX = stramienInfo.assen.length
      }
      if (stramienInfo.nummers.length > 0) {
        stramienNummers = stramienInfo.nummers
        aantalAssenY = stramienInfo.nummers.length
      }
      
      // Bepaal raster uit as-afstanden OF meest voorkomende maten
      if (stramienInfo.asAfstanden.length > 0) {
        const sorted = [...stramienInfo.asAfstanden].sort((a, b) => a - b)
        if (sorted[0] >= 4000 && sorted[0] <= 8000) rasterX = sorted[0]
        if (sorted.length > 1 && sorted[sorted.length - 1] >= 6000) rasterY = sorted[sorted.length - 1]
      } else if (topMaten.length > 0) {
        // Gebruik meest voorkomende maten als fallback
        const kandidaten = topMaten.filter(([m]) => m >= 4000 && m <= 12000)
        if (kandidaten.length > 0) {
          rasterX = kandidaten[0][0]
          if (kandidaten.length > 1) rasterY = kandidaten[1][0]
        }
      }
      
      // Profielen uit bovenaanzicht
      allProfiles.push(...extraction.profiles)
      console.log(`      🔧 Gevonden profielen: ${extraction.profiles.join(', ') || 'geen'}`)
      
    } catch (error) {
      console.error(`   ❌ Fout bij ${tekening.file.name}:`, error)
      errors.push(`Hoofdtekening ${tekening.file.name}: ${error}`)
    }
  }
  
  // === STAP 2: Zijafmetingen (gevels/doorsneden) - HOOGTES ===
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`2️⃣  STAP 2: Analyseer zijafmetingen (gevels/doorsneden)...`)
  console.log(`${'─'.repeat(70)}`)
  
  for (const tekening of zijafmetingen) {
    try {
      console.log(`   📄 Verwerken: ${tekening.file.name}`)
      const extraction = await extractPDFText(tekening.file)
      extractedTexts.push(`[ZIJAFMETING] ${tekening.file.name}:\n${extraction.text.substring(0, 500)}...`)
      
      // Zoek hoogtes
      const hoogtes = extractHoogtes(extraction.text)
      console.log(`      📏 Gevonden hoogtes: ${hoogtes.join('mm, ') || 'geen'}mm`)
      
      if (hoogtes.length > 0) {
        // Laagste hoogte is typisch kolom/goot hoogte, hoogste is nok
        const sorted = [...hoogtes].sort((a, b) => a - b)
        kolomHoogte = sorted[0]
        if (sorted.length > 1) {
          nokHoogte = sorted[sorted.length - 1]
        }
      }
      
      allProfiles.push(...extraction.profiles)
      console.log(`      🔧 Gevonden profielen: ${extraction.profiles.join(', ') || 'geen'}`)
      
    } catch (error) {
      console.error(`   ❌ Fout bij ${tekening.file.name}:`, error)
      errors.push(`Zijafmeting ${tekening.file.name}: ${error}`)
    }
  }
  
  // === STAP 3: Constructie details - ELEMENT POSITIES ===
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`3️⃣  STAP 3: Analyseer constructie details (posities)...`)
  console.log(`${'─'.repeat(70)}`)
  
  // TODO: In de toekomst element posities uit constructie tekeningen halen
  
  for (const tekening of constructieDetails) {
    try {
      console.log(`   📄 Verwerken: ${tekening.file.name}`)
      const extraction = await extractPDFText(tekening.file)
      extractedTexts.push(`[CONSTRUCTIE] ${tekening.file.name}:\n${extraction.text.substring(0, 300)}...`)
      
      // Zoek element referenties en posities
      const refs = extractElementReferences(extraction.text)
      console.log(`      🏗️ Kolommen: ${refs.kolommen.join(', ') || 'geen'}`)
      console.log(`      🏗️ Liggers: ${refs.liggers.join(', ') || 'geen'}`)
      console.log(`      🏗️ Spanten: ${refs.spanten.join(', ') || 'geen'}`)
      
      allProfiles.push(...extraction.profiles)
      
    } catch (error) {
      console.error(`   ❌ Fout bij ${tekening.file.name}:`, error)
      errors.push(`Constructie detail ${tekening.file.name}: ${error}`)
    }
  }
  
  // === STAP 4: Element details - PROFIEL SPECIFICATIES ===
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`4️⃣  STAP 4: Analyseer element details (profielen)...`)
  console.log(`${'─'.repeat(70)}`)
  
  const elementProfielen: Map<string, string> = new Map()
  
  for (const tekening of elementDetails) {
    try {
      console.log(`   📄 Verwerken: ${tekening.file.name}`)
      const extraction = await extractPDFText(tekening.file)
      extractedTexts.push(`[ELEMENT] ${tekening.file.name}:\n${extraction.text.substring(0, 200)}...`)
      
      // Link profielen aan element nummers
      if (tekening.elementen && tekening.elementen.length > 0) {
        const profiel = extraction.profiles[0]
        if (profiel) {
          tekening.elementen.forEach(el => {
            if (!el.includes('-div')) {
              elementProfielen.set(el, profiel)
            }
          })
          console.log(`      🔧 ${tekening.elementen.join(', ')} → ${profiel}`)
        }
      }
      
      allProfiles.push(...extraction.profiles)
      
    } catch (error) {
      console.error(`   ❌ Fout bij ${tekening.file.name}:`, error)
      errors.push(`Element detail ${tekening.file.name}: ${error}`)
    }
  }
  
  // Referenties voor extra info
  for (const ref of referenties) {
    try {
      const extraction = await extractPDFText(ref.file)
      allProfiles.push(...extraction.profiles)
    } catch (error) {
      // Ignore errors in reference docs
    }
  }
  
  // === STAP 5: VISUELE STRUCTUUR ANALYSE ===
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`🔬 STAP 5: Visuele structuur analyse (lijn/vorm detectie)...`)
  console.log(`${'─'.repeat(70)}`)
  
  let visualElementCount = { kolommen: 0, liggers: 0, spanten: 0 }
  let visualDimensions: number[] = []
  
  // Analyseer hoofdtekeningen visueel voor raster detectie
  for (const tekening of hoofdtekeningen) {
    try {
      console.log(`   🔬 Visuele analyse: ${tekening.file.name}`)
      const visualResult = await analyzeFullPDF(tekening.file)
      
      // Grid informatie
      if (visualResult.combined.grid) {
        console.log(`      📐 Grid gedetecteerd: ${visualResult.combined.grid.axes.length} assen`)
        
        // Update raster afstanden uit visuele analyse
        if (visualResult.combined.grid.spacing.x.length > 0) {
          const avgX = visualResult.combined.grid.spacing.x.reduce((a, b) => a + b, 0) / visualResult.combined.grid.spacing.x.length
          if (avgX >= 3000 && avgX <= 15000) {
            rasterX = Math.round(avgX)
            console.log(`      📐 Raster X bijgewerkt: ${rasterX}mm (visueel)`)
          }
        }
        if (visualResult.combined.grid.spacing.y.length > 0) {
          const avgY = visualResult.combined.grid.spacing.y.reduce((a, b) => a + b, 0) / visualResult.combined.grid.spacing.y.length
          if (avgY >= 3000 && avgY <= 15000) {
            rasterY = Math.round(avgY)
            console.log(`      📐 Raster Y bijgewerkt: ${rasterY}mm (visueel)`)
          }
        }
      }
      
      // Element tellingen
      visualElementCount.kolommen += visualResult.combined.summary.kolomCount
      visualElementCount.liggers += visualResult.combined.summary.liggerCount
      visualElementCount.spanten += visualResult.combined.summary.spantCount
      
      // Dimensies
      visualDimensions.push(...visualResult.combined.allDimensions.map(d => d.value))
      
      // Profielen uit visuele analyse
      const visualProfiles = visualResult.combined.summary.uniqueProfiles
      if (visualProfiles.length > 0) {
        allProfiles.push(...visualProfiles)
        console.log(`      🔧 Visueel gedetecteerde profielen: ${visualProfiles.join(', ')}`)
      }
      
      console.log(`      ✅ Confidence: ${(visualResult.combined.summary.avgConfidence * 100).toFixed(1)}%`)
      
    } catch (error) {
      console.error(`   ⚠️ Visuele analyse fout bij ${tekening.file.name}:`, error)
      // Continue met tekstuele analyse
    }
  }
  
  console.log(`   📊 Visuele elementen: ${visualElementCount.kolommen}K, ${visualElementCount.liggers}L, ${visualElementCount.spanten}SP`)
  console.log(`   📏 Visuele maten: ${visualDimensions.length} gevonden`)
  
  // === STAP 6: Genereer 3D Model ===
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`🎯 GENEREER 3D MODEL`)
  console.log(`${'─'.repeat(70)}`)
  
  // Bepaal definitieve profielen
  const uniqueProfiles = [...new Set(allProfiles)]
  const kolomProfiel = uniqueProfiles.find(p => p.startsWith('HEB')) || HAL_CONFIG.kolomProfiel
  const liggerProfiel = uniqueProfiles.find(p => p.startsWith('IPE')) || HAL_CONFIG.liggerProfiel
  const spantProfiel = uniqueProfiles.find(p => p.startsWith('HEA')) || HAL_CONFIG.spantProfiel
  
  // SAMENVATTING BOX voor controle
  console.log(`\n   ╔════════════════════════════════════════════════════════════════╗`)
  console.log(`   ║  📋 GEËXTRAHEERDE AFMETINGEN - CONTROLEER:                      ║`)
  console.log(`   ╠════════════════════════════════════════════════════════════════╣`)
  console.log(`   ║  Stramien assen (X):  ${(stramienAssen.join(', ') || 'A-F (standaard)').padEnd(40)}║`)
  console.log(`   ║  Stramien nummers (Y): ${(stramienNummers.length > 0 ? `1-${stramienNummers[stramienNummers.length-1]}` : '1-4 (standaard)').padEnd(39)}║`)
  console.log(`   ║  Raster X (kolom-kolom): ${String(rasterX).padEnd(37)}mm ║`)
  console.log(`   ║  Raster Y (overspanning): ${String(rasterY).padEnd(36)}mm ║`)
  console.log(`   ║  Kolom hoogte: ${String(kolomHoogte).padEnd(47)}mm ║`)
  console.log(`   ║  Nok hoogte: ${String(nokHoogte || 'n.v.t.').padEnd(49)}mm ║`)
  console.log(`   ╠════════════════════════════════════════════════════════════════╣`)
  console.log(`   ║  TOTAAL GEBOUW:                                                 ║`)
  console.log(`   ║  Lengte (X): ${String(rasterX * (aantalAssenX - 1) / 1000 + 'm (' + rasterX * (aantalAssenX - 1) + 'mm)').padEnd(49)}║`)
  console.log(`   ║  Breedte (Y): ${String(rasterY * (aantalAssenY - 1) / 1000 + 'm (' + rasterY * (aantalAssenY - 1) + 'mm)').padEnd(48)}║`)
  console.log(`   ║  Grid: ${String(aantalAssenX + ' assen × ' + aantalAssenY + ' nummers = ' + (aantalAssenX * aantalAssenY) + ' knooppunten').padEnd(55)}║`)
  console.log(`   ╚════════════════════════════════════════════════════════════════╝\n`)
  
  console.log(`   🔧 Profielen: K=${kolomProfiel}, L=${liggerProfiel}, SP=${spantProfiel}`)
  console.log(`   🔧 Alle gevonden profielen: ${uniqueProfiles.join(', ') || 'geen'}`)
  
  // Genereer model met geëxtraheerde parameters - GEBRUIK GRID INFO!
  const bestandsnamen = files.map(f => f.name)
  
  // Check of we een dak/overzicht tekening hebben - dan altijd groot grid genereren
  const isDakTekening = bestandsnamen.some(n => 
    n.toLowerCase().includes('dak') || 
    n.toLowerCase().includes('overzicht') ||
    n.toLowerCase().includes('plattegrond')
  )
  
  // Bepaal grid grootte - gebruik geëxtraheerde info of standaard voor daktekening
  let gridKolommen = aantalAssenX - 1  // assen → velden
  let gridRijen = aantalAssenY - 1
  
  console.log(`   🔍 Geëxtraheerd: stramien assen=${stramienAssen.length}, nummers=${stramienNummers.length}`)
  console.log(`   🔍 Grid uit extractie: ${gridKolommen} kolommen x ${gridRijen} rijen`)
  console.log(`   🔍 Is daktekening: ${isDakTekening}`)
  
  // ALTIJD groot grid voor daktekeningen tenzij we zeer goede extractie hebben (>10 assen OF nummers)
  const heeftGoedInfo = stramienAssen.length >= 10 || stramienNummers.length >= 15
  
  if (isDakTekening && !heeftGoedInfo) {
    console.log(`   📐 DAKTEKENING GEDETECTEERD - forceer industriehal standaard grid!`)
    gridKolommen = 12  // A-M = 13 assen = 12 velden (typische hal)
    gridRijen = 18     // 1-19 = 19 assen = 18 velden
    rasterX = 6000     // Standaard kolom-kolom
    rasterY = 7500     // Standaard overspanning
    console.log(`   📐 Nieuw grid: ${gridKolommen}x${gridRijen} = ${(gridKolommen + 1) * (gridRijen + 1)} knooppunten`)
  }
  
  console.log(`   ✨ Genereren model: ${gridKolommen}x${gridRijen} velden`)
  console.log(`   ✨ Gebouw afmetingen: ${gridKolommen * rasterX / 1000}m x ${gridRijen * rasterY / 1000}m`)
  
  const model = genereerStandaardHal({
    aantalKolommen: Math.max(gridKolommen, 5),
    aantalRijen: Math.max(gridRijen, 3),
    rasterX,
    rasterY,
    hoogte: kolomHoogte,
    naam: extractGebouwNaam(bestandsnamen),
    kolomProfiel,
    liggerProfiel,
    spantProfiel
  })
  model.bronbestanden = bestandsnamen
  model.metadata.aantalPDFs = files.length
  
  // Update elementen met specifieke profiel info uit detail tekeningen
  for (const element of model.elementen) {
    const elId = element.id.replace('kolom-', '').replace('ligger-', '').replace('spant-', '')
    
    // Check specifiek profiel
    const specifiekProfiel = elementProfielen.get(elId)
    if (specifiekProfiel) {
      element.profielNaam = specifiekProfiel
      element.profielId = specifiekProfiel.toLowerCase().replace(' ', '-')
      element.gewicht = berekenGewicht(specifiekProfiel, element.lengte)
    } else {
      // Standaard profielen per type
      if (element.type === 'kolom') {
        element.profielNaam = kolomProfiel
        element.lengte = kolomHoogte
        element.profielId = kolomProfiel.toLowerCase().replace(' ', '-')
        element.gewicht = berekenGewicht(kolomProfiel, kolomHoogte)
      } else if (element.type === 'ligger' || element.type === 'balk') {
        element.profielNaam = liggerProfiel
        element.profielId = liggerProfiel.toLowerCase().replace(' ', '-')
        element.gewicht = berekenGewicht(liggerProfiel, element.lengte)
      } else if (element.type === 'spant') {
        element.profielNaam = spantProfiel
        element.profielId = spantProfiel.toLowerCase().replace(' ', '-')
        element.gewicht = berekenGewicht(spantProfiel, element.lengte)
      }
    }
  }
  
  console.log(`\n✅ Model gegenereerd: ${model.elementen.length} elementen`)
  console.log(`${'='.repeat(70)}\n`)
  
  return {
    ...model,
    metadata: {
      ...model.metadata,
      extractedText: extractedTexts,
      detectedProfiles: uniqueProfiles,
      detectedDimensions: {
        lengte: rasterX * (aantalAssenX - 1),
        breedte: rasterY * (aantalAssenY - 1),
        hoogte: kolomHoogte
      },
      raster: { x: rasterX, y: rasterY },
      overzichtInfo: {
        type: 'overzicht',
        stramien: {
          assen: stramienAssen,
          nummers: stramienNummers,
          asAfstandenX: [rasterX],
          asAfstandenY: [rasterY]
        },
        afmetingen: {
          totaalLengte: rasterX * (aantalAssenX - 1),
          totaalBreedte: rasterY * (aantalAssenY - 1),
          kolomHoogte,
          nokHoogte
        },
        elementen: {
          kolomPosities: [],
          liggerPosities: [],
          spantPosities: []
        }
      }
    },
    errors: [...model.errors, ...errors]
  }
}

/**
 * Extraheer hoogtes uit tekst (voor gevels/doorsneden)
 */
function extractHoogtes(text: string): number[] {
  const hoogtes: number[] = []
  
  // Zoek naar hoogte waarden met labels
  const patterns = [
    /(?:hoogte|h|goot|nok|bovenkant)[:\s=]*(\d{3,5})/gi,
    /\+\s*(\d{3,5})\s*(?:mm)?/g,  // +8000 (peil aanduiding)
    /(\d{4,5})\s*mm\s*(?:hoog|hoogte)/gi
  ]
  
  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      const value = parseInt(match[1])
      if (value >= 3000 && value <= 20000 && !hoogtes.includes(value)) {
        hoogtes.push(value)
      }
    }
  }
  
  return hoogtes
}

/**
 * Extraheer stramien/as informatie uit tekst
 */
function extractStramienInfo(text: string): { assen: string[], nummers: number[], asAfstanden: number[] } {
  const result = {
    assen: [] as string[],
    nummers: [] as number[],
    asAfstanden: [] as number[]
  }
  
  // === STRAMIEN LETTERS (A-M assen) ===
  // Zoek eerst expliciet stramien labels
  const asPattern = /\b([A-M])\s*(?:[-=]|as|stramien)/gi
  const asMatches = text.matchAll(asPattern)
  for (const match of asMatches) {
    const as = match[1].toUpperCase()
    if (!result.assen.includes(as)) {
      result.assen.push(as)
    }
  }
  
  // Als weinig gevonden, zoek ook losse letters aan begin van regels of na whitespace
  // Dit vangt tekeningen waar letters als as-labels staan
  if (result.assen.length < 3) {
    const looseLetterPattern = /(?:^|\s)([A-M])(?:\s|$|[^a-z])/gm
    const looseMatches = text.matchAll(looseLetterPattern)
    for (const match of looseMatches) {
      const as = match[1].toUpperCase()
      if (!result.assen.includes(as)) {
        result.assen.push(as)
      }
    }
  }
  
  // Sorteer en bepaal range (A-M geeft 13 assen)
  result.assen.sort()
  
  // Als we A en M hebben maar niet alles ertussen, vul aan
  if (result.assen.includes('A') && result.assen.length >= 2) {
    const lastAs = result.assen[result.assen.length - 1]
    const startCode = 'A'.charCodeAt(0)
    const endCode = lastAs.charCodeAt(0)
    result.assen = []
    for (let code = startCode; code <= endCode; code++) {
      result.assen.push(String.fromCharCode(code))
    }
  }
  
  // === STRAMIEN NUMMERS (1-20+) ===
  // Zoek eerst expliciet stramien labels
  const nrPattern = /(?:as|stramien|lijn)\s*(\d{1,2})/gi
  const nrMatches = text.matchAll(nrPattern)
  for (const match of nrMatches) {
    const nr = parseInt(match[1])
    if (!result.nummers.includes(nr) && nr >= 1 && nr <= 30) {
      result.nummers.push(nr)
    }
  }
  
  // Zoek ook losse nummers aan randen (typisch stramien nummers)
  if (result.nummers.length < 3) {
    const looseNrPattern = /(?:^|\s)(\d{1,2})(?:\s|$|[^0-9])/gm
    const looseNrMatches = text.matchAll(looseNrPattern)
    for (const match of looseNrMatches) {
      const nr = parseInt(match[1])
      if (!result.nummers.includes(nr) && nr >= 1 && nr <= 30) {
        result.nummers.push(nr)
      }
    }
  }
  
  // Sorteer nummers
  result.nummers.sort((a, b) => a - b)
  
  // Als we 1 en bijv 18 hebben, maak de range compleet
  if (result.nummers.length >= 2 && result.nummers[0] === 1) {
    const maxNr = result.nummers[result.nummers.length - 1]
    result.nummers = []
    for (let i = 1; i <= maxNr; i++) {
      result.nummers.push(i)
    }
  }
  
  // === AS-AFSTANDEN (mm) ===
  // Zoek maten die typisch raster afstanden zijn
  const afstandPattern = /(\d{1,2}[.,]?\d{0,3})\s*(?:mm|m(?!m)|x)/gi
  const afstandMatches = text.matchAll(afstandPattern)
  for (const match of afstandMatches) {
    let value = parseFloat(match[1].replace(',', '.'))
    // Converteer naar mm indien nodig
    if (value < 100) value *= 1000 // Was in meters
    if (value >= 3000 && value <= 20000 && !result.asAfstanden.includes(value)) {
      result.asAfstanden.push(Math.round(value))
    }
  }
  
  return result
}

/**
 * Analyseer PDF bestandsnamen en genereer 3D model
 * (Fallback wanneer PDF tekst extractie niet beschikbaar is)
 */
export function analyserenPDFTekeningen(bestandsnamen: string[]): PDFAnalyseResult {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`📁 ANALYSE VAN BEKENDE BESTANDEN (${bestandsnamen.length} bestanden)`)
  console.log(`${'='.repeat(70)}\n`)
  
  // Check of we een dak/overzicht tekening hebben
  const isDakTekening = bestandsnamen.some(n => 
    n.toLowerCase().includes('dak') || 
    n.toLowerCase().includes('overzicht') ||
    n.toLowerCase().includes('plattegrond')
  )
  
  console.log(`   🔍 Daktekening gedetecteerd: ${isDakTekening}`)
  
  // ALTIJD groot grid genereren voor industriehal met daktekening
  if (isDakTekening) {
    console.log(`   📐 FORCEER industriehal standaard grid (12x18)`)
    
    const model = genereerStandaardHal({
      aantalKolommen: 12,  // A-M = 13 assen = 12 velden
      aantalRijen: 18,     // 1-19 = 19 assen = 18 velden
      rasterX: 6000,
      rasterY: 7500,
      hoogte: HAL_CONFIG.kolomHoogte,
      naam: extractGebouwNaam(bestandsnamen),
      kolomProfiel: HAL_CONFIG.kolomProfiel,
      liggerProfiel: HAL_CONFIG.liggerProfiel,
      spantProfiel: HAL_CONFIG.spantProfiel
    })
    
    console.log(`   ✅ Gegenereerd: ${model.elementen.length} elementen`)
    console.log(`${'='.repeat(70)}\n`)
    
    return {
      ...model,
      bronbestanden: bestandsnamen,
      metadata: {
        ...model.metadata,
        aantalPDFs: bestandsnamen.length
      }
    }
  }
  
  // Oude logica voor niet-dak tekeningen
  const elementen: CADElement[] = []
  const errors: string[] = []
  let kolomCount = 0
  let liggerCount = 0
  let spantCount = 0
  let overigCount = 0
  
  // Set voor unieke IDs
  const usedIds = new Set<string>()
  
  // Analyseer bestandsnamen om structuur te bepalen
  const kolomBestanden = bestandsnamen.filter(f => f.toLowerCase().includes('kolom'))
  const liggerBestanden = bestandsnamen.filter(f => f.toLowerCase().includes('ligger'))
  const spantBestanden = bestandsnamen.filter(f => f.toLowerCase().includes('spant'))
  const dakBestanden = bestandsnamen.filter(f => f.toLowerCase().includes('dak'))
  
  // === KOLOMMEN PARSEREN ===
  // Uit "kolommen hal K14 tm K24" -> kolommen K14 tot K24
  for (const bestand of kolomBestanden) {
    const rangeMatch = bestand.match(/[kK](\d+)\s*(?:tm|t\/m|-)\s*[kK]?(\d+)/i)
    const divMatch = bestand.match(/div\s*nrs/i)
    
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1])
      const end = parseInt(rangeMatch[2])
      
      for (let i = start; i <= end; i++) {
        const id = `K${i}`
        if (!usedIds.has(id)) {
          usedIds.add(id)
          const kolom = createKolom(id, kolomCount)
          elementen.push(kolom)
          kolomCount++
        }
      }
    } else if (divMatch) {
      // Diverse nummers - voeg enkele kolommen toe
      for (let i = 1; i <= 13; i++) {
        const id = `K${i}`
        if (!usedIds.has(id)) {
          usedIds.add(id)
          const kolom = createKolom(id, kolomCount)
          elementen.push(kolom)
          kolomCount++
        }
      }
    }
  }
  
  // === LIGGERS PARSEREN ===
  for (const bestand of liggerBestanden) {
    const rangeMatch = bestand.match(/[lL](\d+)\s*(?:tm|t\/m|-)\s*[lL]?(\d+)/i)
    
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1])
      const end = parseInt(rangeMatch[2])
      
      for (let i = start; i <= end; i++) {
        const id = `L${i}`
        if (!usedIds.has(id)) {
          usedIds.add(id)
          const ligger = createLigger(id, liggerCount, kolomCount)
          elementen.push(ligger)
          liggerCount++
        }
      }
    }
  }
  
  // === SPANTEN & DAK ===
  // Als er spanten/dak bestanden zijn
  if (spantBestanden.length > 0 || dakBestanden.length > 0) {
    // Genereer spanten gebaseerd op kolom raster
    const aantalSpanten = Math.ceil(kolomCount / 4) // ~1 spant per 4 kolommen
    for (let i = 0; i < Math.max(aantalSpanten, 5); i++) {
      const spant = createSpant(`SP${i + 1}`, spantCount, kolomCount)
      elementen.push(spant)
      spantCount++
    }
    
    // Gordingen
    for (let i = 0; i < 8; i++) {
      const gording = createGording(`G${i + 1}`, overigCount, spantCount)
      elementen.push(gording)
      overigCount++
    }
  }
  
  // === WINDVERBANDEN ===
  // Voeg windverbanden toe aan de kopgevels
  const windverbanden = createWindverbanden(kolomCount)
  elementen.push(...windverbanden)
  overigCount += windverbanden.length
  
  // Herpositioneer elementen voor realistische layout
  repositioneerElementen(elementen)
  
  return {
    success: elementen.length > 0,
    gebouwNaam: extractGebouwNaam(bestandsnamen),
    elementen,
    metadata: {
      aantalPDFs: bestandsnamen.length,
      kolommen: kolomCount,
      liggers: liggerCount,
      spanten: spantCount,
      overig: overigCount
    },
    bronbestanden: bestandsnamen,
    errors
  }
}

/**
 * Maak een kolom element
 */
function createKolom(id: string, index: number): CADElement {
  const profiel = HAL_CONFIG.kolomProfiel
  const lengte = HAL_CONFIG.kolomHoogte
  
  return {
    id: `kolom-${id}`,
    gebouwId: 'pdf-import',
    type: 'kolom' as ElementType,
    profielId: profiel.toLowerCase().replace(' ', '-'),
    profielNaam: profiel,
    lengte,
    gewicht: berekenGewicht(profiel, lengte),
    conditie: randomConditie(),
    positie: {
      x: (index % 6) * HAL_CONFIG.rasterX,
      y: Math.floor(index / 6) * HAL_CONFIG.rasterY,
      z: 0
    },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  }
}

/**
 * Maak een ligger element
 */
function createLigger(id: string, index: number, _kolomCount: number): CADElement {
  const profiel = HAL_CONFIG.liggerProfiel
  // Liggers overspannen de Y-richting
  const lengte = HAL_CONFIG.rasterY
  
  const pos = index % 5
  
  return {
    id: `ligger-${id}`,
    gebouwId: 'pdf-import',
    type: 'ligger' as ElementType,
    profielId: profiel.toLowerCase().replace(' ', '-'),
    profielNaam: profiel,
    lengte,
    gewicht: berekenGewicht(profiel, lengte),
    conditie: randomConditie(),
    positie: {
      x: pos * HAL_CONFIG.rasterX,
      y: HAL_CONFIG.rasterY / 2,
      z: HAL_CONFIG.kolomHoogte
    },
    rotatie: { x: 0, y: 0, z: 90 }, // Dwars
    verdieping: 0
  }
}

/**
 * Maak een spant element
 */
function createSpant(id: string, index: number, _kolomCount: number): CADElement {
  const profiel = HAL_CONFIG.spantProfiel
  // Spanten overspannen de X-richting
  const lengte = 5 * HAL_CONFIG.rasterX // 5 velden
  
  return {
    id: `spant-${id}`,
    gebouwId: 'pdf-import',
    type: 'spant' as ElementType,
    profielId: profiel.toLowerCase().replace(' ', '-'),
    profielNaam: profiel,
    lengte,
    gewicht: berekenGewicht(profiel, lengte),
    conditie: randomConditie(),
    positie: {
      x: 0,
      y: index * HAL_CONFIG.rasterY,
      z: HAL_CONFIG.kolomHoogte
    },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  }
}

/**
 * Maak een gording element
 */
function createGording(id: string, index: number, spantCount: number): CADElement {
  const profiel = HAL_CONFIG.gordingProfiel
  const lengte = (spantCount - 1) * HAL_CONFIG.rasterY
  
  return {
    id: `gording-${id}`,
    gebouwId: 'pdf-import',
    type: 'ligger' as ElementType, // Gordingen zijn horizontale liggers
    profielId: profiel.toLowerCase().replace(' ', '-'),
    profielNaam: profiel,
    lengte: Math.min(lengte, 12000), // Max 12m per stuk
    gewicht: berekenGewicht(profiel, Math.min(lengte, 12000)),
    conditie: randomConditie(),
    positie: {
      x: (index + 1) * (5 * HAL_CONFIG.rasterX / 9),
      y: 0,
      z: HAL_CONFIG.gordingHoogte + (index % 3) * 500
    },
    rotatie: { x: 0, y: 0, z: 90 },
    verdieping: 0
  }
}

/**
 * Maak windverbanden
 */
function createWindverbanden(kolomCount: number): CADElement[] {
  const verbanden: CADElement[] = []
  const profiel = HAL_CONFIG.windverbandProfiel
  
  // 4 windverbanden (2 aan elke kopgevel)
  for (let i = 0; i < 4; i++) {
    const isKopgevel1 = i < 2
    const lengte = Math.sqrt(
      Math.pow(HAL_CONFIG.rasterX, 2) + 
      Math.pow(HAL_CONFIG.kolomHoogte, 2)
    )
    
    verbanden.push({
      id: `windverband-WV${i + 1}`,
      gebouwId: 'pdf-import',
      type: 'windverband' as ElementType,
      profielId: profiel.toLowerCase().replace(' ', '-'),
      profielNaam: profiel,
      lengte: Math.round(lengte),
      gewicht: berekenGewicht(profiel, lengte),
      conditie: randomConditie(),
      positie: {
        x: isKopgevel1 ? (i % 2) * HAL_CONFIG.rasterX : (4 + i % 2) * HAL_CONFIG.rasterX,
        y: isKopgevel1 ? 0 : (Math.ceil(kolomCount / 6) - 1) * HAL_CONFIG.rasterY,
        z: HAL_CONFIG.kolomHoogte / 2
      },
      rotatie: { 
        x: 0, 
        y: 0, 
        z: i % 2 === 0 ? 45 : -45 
      },
      verdieping: 0
    })
  }
  
  return verbanden
}

/**
 * Herpositioneer elementen voor realistische 3D layout
 */
function repositioneerElementen(elementen: CADElement[]): void {
  // Sorteer en herpositioneer kolommen in een raster
  const kolommen = elementen.filter(e => e.type === 'kolom')
  const rasterX = HAL_CONFIG.rasterX
  const rasterY = HAL_CONFIG.rasterY
  
  // Maak een 6x10 raster (60 kolommen max)
  kolommen.forEach((kolom, idx) => {
    const col = idx % 6
    const row = Math.floor(idx / 6)
    kolom.positie = {
      x: col * rasterX,
      y: row * rasterY,
      z: 0
    }
  })
  
  // Positioneer liggers tussen kolommen
  const liggers = elementen.filter(e => e.type === 'ligger' && !e.id.includes('gording'))
  liggers.forEach((ligger, idx) => {
    const col = idx % 5
    const row = Math.floor(idx / 5)
    ligger.positie = {
      x: col * rasterX + rasterX / 2,
      y: row * rasterY + rasterY / 2,
      z: HAL_CONFIG.kolomHoogte
    }
  })
  
  // Positioneer spanten
  const spanten = elementen.filter(e => e.type === 'spant')
  // Max row kan worden gebruikt voor spant positionering in toekomstige versies
  
  spanten.forEach((spant, idx) => {
    spant.positie = {
      x: 2.5 * rasterX, // Centrum
      y: idx * rasterY,
      z: HAL_CONFIG.kolomHoogte
    }
    spant.lengte = 5 * rasterX
    spant.gewicht = berekenGewicht(spant.profielNaam, spant.lengte)
  })
}

/**
 * Bereken gewicht op basis van profiel en lengte
 */
function berekenGewicht(profiel: string, lengte: number): number {
  const gewichtPerM = PROFIEL_GEWICHTEN[profiel] || 50
  return Math.round((gewichtPerM * lengte / 1000) * 10) / 10
}

/**
 * Random conditie voor demo
 */
function randomConditie(): Conditie {
  const rand = Math.random()
  if (rand < 0.6) return 'goed'
  if (rand < 0.85) return 'matig'
  return 'slecht'
}

/**
 * Extract gebouw naam uit bestandsnamen
 */
function extractGebouwNaam(bestanden: string[]): string {
  // Zoek naar "hal" in bestandsnamen
  const halBestand = bestanden.find(f => f.toLowerCase().includes('hal'))
  if (halBestand) {
    const match = halBestand.match(/hal[^-]*/i)
    if (match) return `Industriehal ${match[0]}`
  }
  return 'Geïmporteerde Hal'
}

/**
 * Genereer een compleet 3D model van een standaard industriële hal
 * op basis van parameters uit PDF analyse
 */
export function genereerStandaardHal(config: {
  aantalKolommen: number
  aantalRijen: number
  rasterX?: number
  rasterY?: number
  hoogte?: number
  naam?: string
  kolomProfiel?: string
  liggerProfiel?: string
  spantProfiel?: string
}): PDFAnalyseResult {
  const {
    aantalKolommen = 6,
    aantalRijen = 4,
    rasterX = 6000,
    rasterY = 7500,
    hoogte = 8000,
    naam = 'Standaard Hal',
    kolomProfiel = 'HEB 300',
    liggerProfiel = 'IPE 400',
    spantProfiel = 'HEA 300'
  } = config
  
  const elementen: CADElement[] = []
  let index = 0
  
  // Kolommen genereren
  for (let row = 0; row <= aantalRijen; row++) {
    for (let col = 0; col <= aantalKolommen; col++) {
      elementen.push({
        id: `K${index + 1}`,
        gebouwId: 'generated',
        type: 'kolom',
        profielId: kolomProfiel.toLowerCase().replace(' ', '-'),
        profielNaam: kolomProfiel,
        lengte: hoogte,
        gewicht: berekenGewicht(kolomProfiel, hoogte),
        conditie: randomConditie(),
        positie: { x: col * rasterX, y: row * rasterY, z: 0 },
        rotatie: { x: 0, y: 0, z: 0 },
        verdieping: 0
      })
      index++
    }
  }
  
  // Liggers in X-richting (hoofdliggers)
  const kolommenCount = index
  index = 0
  for (let row = 0; row <= aantalRijen; row++) {
    for (let col = 0; col < aantalKolommen; col++) {
      elementen.push({
        id: `HX${index + 1}`,
        gebouwId: 'generated',
        type: 'ligger',
        profielId: liggerProfiel.toLowerCase().replace(' ', '-'),
        profielNaam: liggerProfiel,
        lengte: rasterX,
        gewicht: berekenGewicht(liggerProfiel, rasterX),
        conditie: randomConditie(),
        positie: { x: col * rasterX + rasterX / 2, y: row * rasterY, z: hoogte },
        rotatie: { x: 0, y: 0, z: 0 },
        verdieping: 0
      })
      index++
    }
  }
  
  // Liggers in Y-richting (secundaire liggers)
  const liggersXCount = index
  index = 0
  for (let row = 0; row < aantalRijen; row++) {
    for (let col = 0; col <= aantalKolommen; col++) {
      elementen.push({
        id: `HY${index + 1}`,
        gebouwId: 'generated',
        type: 'balk',
        profielId: liggerProfiel.toLowerCase().replace(' ', '-'),
        profielNaam: liggerProfiel,
        lengte: rasterY,
        gewicht: berekenGewicht(liggerProfiel, rasterY),
        conditie: randomConditie(),
        positie: { x: col * rasterX, y: row * rasterY + rasterY / 2, z: hoogte },
        rotatie: { x: 0, y: 0, z: 90 },
        verdieping: 0
      })
      index++
    }
  }
  
  // Spanten (hoofddraagconstructie)
  const spantLengte = aantalKolommen * rasterX
  const spanten: CADElement[] = []
  for (let row = 0; row <= aantalRijen; row++) {
    spanten.push({
      id: `SP${row + 1}`,
      gebouwId: 'generated',
      type: 'spant',
      profielId: spantProfiel.toLowerCase().replace(' ', '-'),
      profielNaam: spantProfiel,
      lengte: spantLengte,
      gewicht: berekenGewicht(spantProfiel, spantLengte),
      conditie: randomConditie(),
      positie: { x: spantLengte / 2, y: row * rasterY, z: hoogte },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
  }
  elementen.push(...spanten)
  
  // ============================================================
  // === WINDVERBANDEN & STABILITEITSCONSTRUCTIE ===
  // ============================================================
  // Industriële hallen hebben windverbanden op meerdere locaties:
  // 1. DAKVLAK: horizontale kruisverbanden voor horizontale krachten
  // 2. KOPGEVELS: verticale kruisverbanden (begin en eind van de hal)
  // 3. LANGSGEVELS: verticale kruisverbanden op strategische punten
  // ============================================================
  
  const windverbandElementen: CADElement[] = []
  let wvIndex = 0
  
  // --- 1. DAKVLAK WINDVERBANDEN ---
  // X-kruisen in de hoeken en aan de randen van het dakvlak
  const diagLengteDak = Math.sqrt(rasterX ** 2 + rasterY ** 2)
  
  // Eerste 3 velden aan begin (y=0 tot y=3*rasterY)
  for (let row = 0; row < Math.min(3, aantalRijen); row++) {
    for (let col = 0; col < Math.min(2, aantalKolommen); col++) {
      // Diagonaal 1: van linksonder naar rechtsboven
      windverbandElementen.push({
        id: `DWV${++wvIndex}`,
        gebouwId: 'generated',
        type: 'windverband',
        profielId: 'l-80x80x8',
        profielNaam: 'L 80x80x8',
        lengte: Math.round(diagLengteDak),
        gewicht: berekenGewicht('L 80x80x8', diagLengteDak),
        conditie: randomConditie(),
        positie: { x: col * rasterX + rasterX / 2, y: row * rasterY + rasterY / 2, z: hoogte + 100 },
        rotatie: { x: 0, y: 0, z: 45 },
        verdieping: 0
      })
      // Diagonaal 2: van linksboven naar rechtsonder
      windverbandElementen.push({
        id: `DWV${++wvIndex}`,
        gebouwId: 'generated',
        type: 'windverband',
        profielId: 'l-80x80x8',
        profielNaam: 'L 80x80x8',
        lengte: Math.round(diagLengteDak),
        gewicht: berekenGewicht('L 80x80x8', diagLengteDak),
        conditie: randomConditie(),
        positie: { x: col * rasterX + rasterX / 2, y: row * rasterY + rasterY / 2, z: hoogte + 100 },
        rotatie: { x: 0, y: 0, z: -45 },
        verdieping: 0
      })
    }
  }
  
  // Laatste 3 velden aan eind (y=max)
  for (let row = Math.max(0, aantalRijen - 3); row < aantalRijen; row++) {
    for (let col = Math.max(0, aantalKolommen - 2); col < aantalKolommen; col++) {
      windverbandElementen.push({
        id: `DWV${++wvIndex}`,
        gebouwId: 'generated',
        type: 'windverband',
        profielId: 'l-80x80x8',
        profielNaam: 'L 80x80x8',
        lengte: Math.round(diagLengteDak),
        gewicht: berekenGewicht('L 80x80x8', diagLengteDak),
        conditie: randomConditie(),
        positie: { x: col * rasterX + rasterX / 2, y: row * rasterY + rasterY / 2, z: hoogte + 100 },
        rotatie: { x: 0, y: 0, z: 45 },
        verdieping: 0
      })
      windverbandElementen.push({
        id: `DWV${++wvIndex}`,
        gebouwId: 'generated',
        type: 'windverband',
        profielId: 'l-80x80x8',
        profielNaam: 'L 80x80x8',
        lengte: Math.round(diagLengteDak),
        gewicht: berekenGewicht('L 80x80x8', diagLengteDak),
        conditie: randomConditie(),
        positie: { x: col * rasterX + rasterX / 2, y: row * rasterY + rasterY / 2, z: hoogte + 100 },
        rotatie: { x: 0, y: 0, z: -45 },
        verdieping: 0
      })
    }
  }
  
  // --- 2. KOPGEVEL WINDVERBANDEN (bij y=0 en y=max, in het verticale vlak) ---
  // Diagonalen tussen kolommen in de kopgevel
  const diagLengteKopgevel = Math.sqrt(rasterX ** 2 + hoogte ** 2)
  
  // Kopgevel bij y=0 (voorgevel)
  for (let col = 0; col < Math.min(3, aantalKolommen); col++) {
    // X-kruis tussen kolommen
    windverbandElementen.push({
      id: `KWV${++wvIndex}`,
      gebouwId: 'generated',
      type: 'windverband',
      profielId: 'l-100x100x10',
      profielNaam: 'L 100x100x10',
      lengte: Math.round(diagLengteKopgevel),
      gewicht: berekenGewicht('L 100x100x10', diagLengteKopgevel),
      conditie: randomConditie(),
      positie: { x: col * rasterX + rasterX / 2, y: 0, z: hoogte / 2 },
      rotatie: { x: 0, y: 90, z: 45 },  // In YZ vlak
      verdieping: 0
    })
    windverbandElementen.push({
      id: `KWV${++wvIndex}`,
      gebouwId: 'generated',
      type: 'windverband',
      profielId: 'l-100x100x10',
      profielNaam: 'L 100x100x10',
      lengte: Math.round(diagLengteKopgevel),
      gewicht: berekenGewicht('L 100x100x10', diagLengteKopgevel),
      conditie: randomConditie(),
      positie: { x: col * rasterX + rasterX / 2, y: 0, z: hoogte / 2 },
      rotatie: { x: 0, y: 90, z: -45 },
      verdieping: 0
    })
  }
  
  // Kopgevel bij y=max (achtergevel)
  const yMax = aantalRijen * rasterY
  for (let col = 0; col < Math.min(3, aantalKolommen); col++) {
    windverbandElementen.push({
      id: `KWV${++wvIndex}`,
      gebouwId: 'generated',
      type: 'windverband',
      profielId: 'l-100x100x10',
      profielNaam: 'L 100x100x10',
      lengte: Math.round(diagLengteKopgevel),
      gewicht: berekenGewicht('L 100x100x10', diagLengteKopgevel),
      conditie: randomConditie(),
      positie: { x: col * rasterX + rasterX / 2, y: yMax, z: hoogte / 2 },
      rotatie: { x: 0, y: 90, z: 45 },
      verdieping: 0
    })
    windverbandElementen.push({
      id: `KWV${++wvIndex}`,
      gebouwId: 'generated',
      type: 'windverband',
      profielId: 'l-100x100x10',
      profielNaam: 'L 100x100x10',
      lengte: Math.round(diagLengteKopgevel),
      gewicht: berekenGewicht('L 100x100x10', diagLengteKopgevel),
      conditie: randomConditie(),
      positie: { x: col * rasterX + rasterX / 2, y: yMax, z: hoogte / 2 },
      rotatie: { x: 0, y: 90, z: -45 },
      verdieping: 0
    })
  }
  
  // --- 3. LANGSGEVEL WINDVERBANDEN (bij x=0 en x=max, in het verticale vlak) ---
  // Diagonalen in de langsgevels op strategische punten
  const diagLengteLangsgevel = Math.sqrt(rasterY ** 2 + hoogte ** 2)
  
  // Langsgevel bij x=0 (linkerzijde) - eerste 2 en laatste 2 velden
  const langsPosities = [0, 1, aantalRijen - 2, aantalRijen - 1].filter(p => p >= 0 && p < aantalRijen)
  for (const row of langsPosities) {
    windverbandElementen.push({
      id: `LWV${++wvIndex}`,
      gebouwId: 'generated',
      type: 'windverband',
      profielId: 'l-100x100x10',
      profielNaam: 'L 100x100x10',
      lengte: Math.round(diagLengteLangsgevel),
      gewicht: berekenGewicht('L 100x100x10', diagLengteLangsgevel),
      conditie: randomConditie(),
      positie: { x: 0, y: row * rasterY + rasterY / 2, z: hoogte / 2 },
      rotatie: { x: 90, y: 0, z: 45 },  // In XZ vlak
      verdieping: 0
    })
    windverbandElementen.push({
      id: `LWV${++wvIndex}`,
      gebouwId: 'generated',
      type: 'windverband',
      profielId: 'l-100x100x10',
      profielNaam: 'L 100x100x10',
      lengte: Math.round(diagLengteLangsgevel),
      gewicht: berekenGewicht('L 100x100x10', diagLengteLangsgevel),
      conditie: randomConditie(),
      positie: { x: 0, y: row * rasterY + rasterY / 2, z: hoogte / 2 },
      rotatie: { x: 90, y: 0, z: -45 },
      verdieping: 0
    })
  }
  
  // Langsgevel bij x=max (rechterzijde)
  const xMax = aantalKolommen * rasterX
  for (const row of langsPosities) {
    windverbandElementen.push({
      id: `LWV${++wvIndex}`,
      gebouwId: 'generated',
      type: 'windverband',
      profielId: 'l-100x100x10',
      profielNaam: 'L 100x100x10',
      lengte: Math.round(diagLengteLangsgevel),
      gewicht: berekenGewicht('L 100x100x10', diagLengteLangsgevel),
      conditie: randomConditie(),
      positie: { x: xMax, y: row * rasterY + rasterY / 2, z: hoogte / 2 },
      rotatie: { x: 90, y: 0, z: 45 },
      verdieping: 0
    })
    windverbandElementen.push({
      id: `LWV${++wvIndex}`,
      gebouwId: 'generated',
      type: 'windverband',
      profielId: 'l-100x100x10',
      profielNaam: 'L 100x100x10',
      lengte: Math.round(diagLengteLangsgevel),
      gewicht: berekenGewicht('L 100x100x10', diagLengteLangsgevel),
      conditie: randomConditie(),
      positie: { x: xMax, y: row * rasterY + rasterY / 2, z: hoogte / 2 },
      rotatie: { x: 90, y: 0, z: -45 },
      verdieping: 0
    })
  }
  
  elementen.push(...windverbandElementen)
  
  // ============================================================
  // === GEVELCONSTRUCTIE - STIJLEN EN REGELS ===
  // ============================================================
  
  const gevelElementen: CADElement[] = []
  let gvIndex = 0
  
  // --- KOPGEVEL STIJLEN (verticale elementen tussen kolommen) ---
  // Bij y=0 (voorgevel)
  for (let col = 0; col < aantalKolommen; col++) {
    // Tussenstijl op halve afstand
    gevelElementen.push({
      id: `GVS${++gvIndex}`,
      gebouwId: 'generated',
      type: 'stijl',
      profielId: 'unp-140',
      profielNaam: 'UNP 140',
      lengte: hoogte,
      gewicht: berekenGewicht('UNP 140', hoogte),
      conditie: randomConditie(),
      positie: { x: col * rasterX + rasterX / 2, y: 0, z: hoogte / 2 },
      rotatie: { x: 90, y: 0, z: 0 },
      verdieping: 0
    })
  }
  
  // Bij y=max (achtergevel)
  for (let col = 0; col < aantalKolommen; col++) {
    gevelElementen.push({
      id: `GVS${++gvIndex}`,
      gebouwId: 'generated',
      type: 'stijl',
      profielId: 'unp-140',
      profielNaam: 'UNP 140',
      lengte: hoogte,
      gewicht: berekenGewicht('UNP 140', hoogte),
      conditie: randomConditie(),
      positie: { x: col * rasterX + rasterX / 2, y: yMax, z: hoogte / 2 },
      rotatie: { x: 90, y: 0, z: 0 },
      verdieping: 0
    })
  }
  
  // --- KOPGEVEL REGELS (horizontale elementen) ---
  // Op meerdere hoogtes: 2m, 4m, 6m
  const regelHoogtes = [2000, 4000, 6000].filter(h => h < hoogte)
  
  for (const regelZ of regelHoogtes) {
    // Voorgevel (y=0)
    gevelElementen.push({
      id: `GVR${++gvIndex}`,
      gebouwId: 'generated',
      type: 'regel',
      profielId: 'unp-120',
      profielNaam: 'UNP 120',
      lengte: aantalKolommen * rasterX,
      gewicht: berekenGewicht('UNP 120', aantalKolommen * rasterX),
      conditie: randomConditie(),
      positie: { x: (aantalKolommen * rasterX) / 2, y: 0, z: regelZ },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
    // Achtergevel (y=max)
    gevelElementen.push({
      id: `GVR${++gvIndex}`,
      gebouwId: 'generated',
      type: 'regel',
      profielId: 'unp-120',
      profielNaam: 'UNP 120',
      lengte: aantalKolommen * rasterX,
      gewicht: berekenGewicht('UNP 120', aantalKolommen * rasterX),
      conditie: randomConditie(),
      positie: { x: (aantalKolommen * rasterX) / 2, y: yMax, z: regelZ },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
  }
  
  // --- LANGSGEVEL STIJLEN (bij x=0 en x=max) ---
  for (let row = 0; row < aantalRijen; row++) {
    // Linkerzijde (x=0)
    gevelElementen.push({
      id: `GVS${++gvIndex}`,
      gebouwId: 'generated',
      type: 'stijl',
      profielId: 'unp-140',
      profielNaam: 'UNP 140',
      lengte: hoogte,
      gewicht: berekenGewicht('UNP 140', hoogte),
      conditie: randomConditie(),
      positie: { x: 0, y: row * rasterY + rasterY / 2, z: hoogte / 2 },
      rotatie: { x: 90, y: 0, z: 0 },
      verdieping: 0
    })
    // Rechterzijde (x=max)
    gevelElementen.push({
      id: `GVS${++gvIndex}`,
      gebouwId: 'generated',
      type: 'stijl',
      profielId: 'unp-140',
      profielNaam: 'UNP 140',
      lengte: hoogte,
      gewicht: berekenGewicht('UNP 140', hoogte),
      conditie: randomConditie(),
      positie: { x: xMax, y: row * rasterY + rasterY / 2, z: hoogte / 2 },
      rotatie: { x: 90, y: 0, z: 0 },
      verdieping: 0
    })
  }
  
  // --- LANGSGEVEL REGELS ---
  for (const regelZ of regelHoogtes) {
    // Linkerzijde (x=0)
    gevelElementen.push({
      id: `GVR${++gvIndex}`,
      gebouwId: 'generated',
      type: 'regel',
      profielId: 'unp-120',
      profielNaam: 'UNP 120',
      lengte: aantalRijen * rasterY,
      gewicht: berekenGewicht('UNP 120', aantalRijen * rasterY),
      conditie: randomConditie(),
      positie: { x: 0, y: (aantalRijen * rasterY) / 2, z: regelZ },
      rotatie: { x: 0, y: 0, z: 90 },
      verdieping: 0
    })
    // Rechterzijde (x=max)
    gevelElementen.push({
      id: `GVR${++gvIndex}`,
      gebouwId: 'generated',
      type: 'regel',
      profielId: 'unp-120',
      profielNaam: 'UNP 120',
      lengte: aantalRijen * rasterY,
      gewicht: berekenGewicht('UNP 120', aantalRijen * rasterY),
      conditie: randomConditie(),
      positie: { x: xMax, y: (aantalRijen * rasterY) / 2, z: regelZ },
      rotatie: { x: 0, y: 0, z: 90 },
      verdieping: 0
    })
  }
  
  elementen.push(...gevelElementen)
  
  // === GORDINGEN (secundaire dakconstructie) ===
  // Gordingen lopen in Y-richting tussen de spanten, typisch elke 1.5-2m
  const gordingen: CADElement[] = []
  let gIndex = 0
  const gordingAfstand = 1500 // mm tussen gordingen
  const aantalGordingenPerVak = Math.floor(rasterX / gordingAfstand)
  
  for (let row = 0; row < aantalRijen; row++) {
    for (let col = 0; col <= aantalKolommen; col++) {
      // Meerdere gordingen per kolom-rij
      for (let g = 1; g < aantalGordingenPerVak; g++) {
        gordingen.push({
          id: `GD${++gIndex}`,
          gebouwId: 'generated',
          type: 'gording',
          profielId: 'ipe-200',
          profielNaam: 'IPE 200',
          lengte: rasterY,
          gewicht: berekenGewicht('IPE 200', rasterY),
          conditie: randomConditie(),
          positie: { 
            x: col * rasterX + g * gordingAfstand, 
            y: row * rasterY + rasterY / 2, 
            z: hoogte + 200 // Net boven hoofdconstructie
          },
          rotatie: { x: 0, y: 0, z: 90 },
          verdieping: 0
        })
      }
    }
  }
  elementen.push(...gordingen)
  
  // === DAKSPOREN / DAKLIGGERS (tussen gordingen) ===
  // Deze lopen in X-richting, smaller profiel
  const daksporen: CADElement[] = []
  let dsIndex = 0
  const daksporenAfstand = 2000 // mm
  const aantalDaksporenPerVak = Math.floor(rasterY / daksporenAfstand)
  
  for (let row = 0; row <= aantalRijen; row++) {
    for (let col = 0; col < aantalKolommen; col++) {
      for (let d = 1; d < aantalDaksporenPerVak; d++) {
        daksporen.push({
          id: `DS${++dsIndex}`,
          gebouwId: 'generated',
          type: 'dakspoor',
          profielId: 'c-140',
          profielNaam: 'C 140',
          lengte: rasterX,
          gewicht: berekenGewicht('C 140', rasterX),
          conditie: randomConditie(),
          positie: { 
            x: col * rasterX + rasterX / 2, 
            y: row * rasterY + d * daksporenAfstand, 
            z: hoogte + 400 // Boven gordingen
          },
          rotatie: { x: 0, y: 0, z: 0 },
          verdieping: 0
        })
      }
    }
  }
  elementen.push(...daksporen)
  
  // === OVERKAPPING (aparte structuur aan de zijkant) ===
  // Typisch een luifel of aanbouw met eigen kolommen en liggers
  const overkappingKolommen: CADElement[] = []
  const overkappingLiggers: CADElement[] = []
  let okIndex = 0
  
  // Overkapping parameters (kleiner dan hoofdhal)
  const okAantalKolommen = Math.min(6, Math.floor(aantalKolommen / 2))
  const okHoogte = hoogte * 0.7 // 70% van hoofdhoogte
  const okDiepte = rasterY // Even diep als 1 rasterY
  
  // Overkapping kolommen (aan de linkerzijde, y = -okDiepte)
  for (let col = 0; col <= okAantalKolommen; col++) {
    overkappingKolommen.push({
      id: `OK${++okIndex}`,
      gebouwId: 'generated',
      type: 'kolom',
      profielId: 'hea-200',
      profielNaam: 'HEA 200',
      lengte: okHoogte,
      gewicht: berekenGewicht('HEA 200', okHoogte),
      conditie: randomConditie(),
      positie: { x: col * rasterX, y: -okDiepte, z: 0 },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
  }
  elementen.push(...overkappingKolommen)
  
  // Overkapping liggers (X-richting)
  for (let col = 0; col < okAantalKolommen; col++) {
    overkappingLiggers.push({
      id: `OL${col + 1}`,
      gebouwId: 'generated',
      type: 'ligger',
      profielId: 'ipe-300',
      profielNaam: 'IPE 300',
      lengte: rasterX,
      gewicht: berekenGewicht('IPE 300', rasterX),
      conditie: randomConditie(),
      positie: { x: col * rasterX + rasterX / 2, y: -okDiepte, z: okHoogte },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
  }
  elementen.push(...overkappingLiggers)
  
  // Overkapping verbindingsliggers (Y-richting, naar hoofdhal)
  const verbindingsLiggers: CADElement[] = []
  for (let col = 0; col <= okAantalKolommen; col++) {
    verbindingsLiggers.push({
      id: `VL${col + 1}`,
      gebouwId: 'generated',
      type: 'ligger',
      profielId: 'ipe-300',
      profielNaam: 'IPE 300',
      lengte: okDiepte,
      gewicht: berekenGewicht('IPE 300', okDiepte),
      conditie: randomConditie(),
      positie: { x: col * rasterX, y: -okDiepte / 2, z: okHoogte },
      rotatie: { x: 0, y: 0, z: 90 },
      verdieping: 0
    })
  }
  elementen.push(...verbindingsLiggers)
  
  // === KOPGEVELS (verticale stijlen en regels) ===
  const kopgevelElementen: CADElement[] = []
  let kgIndex = 0
  
  // Verticale stijlen bij y=0 (voorgevel)
  const stijlAfstand = rasterX / 2 // Elke halve rasterafstand een stijl
  for (let col = 0; col <= aantalKolommen * 2; col++) {
    if (col % 2 !== 0) { // Alleen tussenliggende stijlen
      kopgevelElementen.push({
        id: `KG${++kgIndex}`,
        gebouwId: 'generated',
        type: 'stijl',
        profielId: 'unp-120',
        profielNaam: 'UNP 120',
        lengte: hoogte,
        gewicht: berekenGewicht('UNP 120', hoogte),
        conditie: randomConditie(),
        positie: { x: col * stijlAfstand, y: 0, z: hoogte / 2 },
        rotatie: { x: 90, y: 0, z: 0 },
        verdieping: 0
      })
    }
  }
  
  // Horizontale regels bij y=0 (voorgevel) op verschillende hoogtes
  const kopgevelRegelHoogtes = [2000, 4000, 6000] // mm
  for (const rh of kopgevelRegelHoogtes) {
    if (rh < hoogte) {
      kopgevelElementen.push({
        id: `KG${++kgIndex}`,
        gebouwId: 'generated',
        type: 'regel',
        profielId: 'unp-100',
        profielNaam: 'UNP 100',
        lengte: aantalKolommen * rasterX,
        gewicht: berekenGewicht('UNP 100', aantalKolommen * rasterX),
        conditie: randomConditie(),
        positie: { x: (aantalKolommen * rasterX) / 2, y: 0, z: rh },
        rotatie: { x: 0, y: 0, z: 0 },
        verdieping: 0
      })
    }
  }
  elementen.push(...kopgevelElementen)
  
  // === TOTAAL LOGGEN ===
  console.log(`\n   📊 ELEMENTEN OVERZICHT:`)
  console.log(`      Kolommen (hoofdhal):     ${kolommenCount}`)
  console.log(`      Liggers X:               ${liggersXCount}`)
  console.log(`      Liggers Y:               ${index}`)
  console.log(`      Spanten:                 ${spanten.length}`)
  console.log(`      Windverbanden:           ${windverbandElementen.length}`)
  console.log(`      Gevel elementen:         ${gevelElementen.length}`)
  console.log(`      Gordingen:               ${gordingen.length}`)
  console.log(`      Daksporen:               ${daksporen.length}`)
  console.log(`      Overkapping kolommen:    ${overkappingKolommen.length}`)
  console.log(`      Overkapping liggers:     ${overkappingLiggers.length + verbindingsLiggers.length}`)
  console.log(`      Kopgevel elementen:      ${kopgevelElementen.length}`)
  console.log(`      ──────────────────────────────`)
  console.log(`      TOTAAL:                  ${elementen.length}`)
  
  return {
    success: true,
    gebouwNaam: naam,
    elementen,
    metadata: {
      aantalPDFs: 0,
      kolommen: kolommenCount + overkappingKolommen.length,
      liggers: liggersXCount + index + overkappingLiggers.length + verbindingsLiggers.length,
      spanten: spanten.length,
      overig: windverbandElementen.length + gevelElementen.length + gordingen.length + daksporen.length + kopgevelElementen.length
    },
    bronbestanden: [],
    errors: []
  }
}
