/**
 * Profiel Koppeling Module
 * 
 * Koppelt profiel-informatie uit PDF tekeningen aan specifieke constructie-elementen.
 * Dit is de cruciale stap die ontbrak: de PDF analyser vindt profielen en element IDs,
 * maar deze werden niet gekoppeld bij de 3D model generatie.
 * 
 * STRATEGIE:
 * 1. Parse PDF tekst met posities
 * 2. Vind element-profiel patronen (K14: HEB 300, of nabije tekst)
 * 3. Bouw profiel-map per element type
 * 4. Gebruik deze map bij 3D generatie
 */

import * as pdfjsLib from 'pdfjs-dist'

// Configureer PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// === TYPES ===

export interface TekstMetPositie {
  tekst: string
  x: number
  y: number
  breedte: number
  hoogte: number
  pagina: number
}

export interface ElementProfielKoppeling {
  elementId: string                    // K1, K14, L1, SP1, etc.
  elementType: 'kolom' | 'ligger' | 'spant' | 'gording' | 'windverband' | 'onbekend'
  profiel: string                      // HEB 300, IPE 400, UNP 140, L 60.60.6
  bronTekening: string                 // Bestandsnaam waar gevonden
  betrouwbaarheid: number              // 0-1, hoe zeker zijn we?
  positieInTekening?: { x: number, y: number }
  context?: string                     // Extra info uit tekening
}

export interface ProfielDatabase {
  // Per element type, een map van element ID naar profiel
  kolommen: Map<string, ElementProfielKoppeling>
  liggers: Map<string, ElementProfielKoppeling>
  spanten: Map<string, ElementProfielKoppeling>
  gordingen: Map<string, ElementProfielKoppeling>
  windverbanden: Map<string, ElementProfielKoppeling>
  
  // Dak-specifieke informatie (uit dakconstructie tekening)
  dak?: DakconstructieInfo
  
  // Standaard profielen per type (fallback)
  defaults: {
    kolom: string
    ligger: string
    spant: string
    gording: string
    windverband: string
  }
  
  // Alle unieke profielen gevonden
  gevondenProfielen: Set<string>
  
  // Bron tekeningen
  bronnen: string[]
}

export interface DakconstructieInfo {
  spantType: 'vakwerk' | 'portaal' | 'onbekend'
  spantProfiel?: {
    bovenrand: string
    onderrand: string
    diagonaal: string
    staander?: string
  }
  // Profiel aliassen voor makkelijkere toegang
  bovenrandProfiel?: string
  onderrandProfiel?: string
  diagonaalProfiel?: string
  
  gordingProfiel: string
  randGordingProfiel?: string  // Zwaardere profielen voor randgordingen
  gordingAfstand: number    // mm hart-op-hart
  windverbandProfiel: string
  nokHoogte?: number
  gootHoogte?: number
  helling?: number          // graden
}

// === REGEX PATRONEN ===

// Element ID patronen (voor toekomstig gebruik bij geavanceerde element detectie)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _ELEMENT_PATRONEN = {
  kolom: /\b[KH](\d{1,3})\b/gi,                    // K1, K14, H1 (hoofdkolom)
  ligger: /\bL(\d{1,3})\b/gi,                       // L1, L23
  spant: /\b(?:SP|S)(\d{1,3})\b/gi,                // SP1, S3
  gording: /\b(?:G|GD)(\d{1,3})\b/gi,              // G1, GD15
  windverband: /\b(?:WV|W)(\d{1,3})\b/gi,          // WV1, W3
}

// Profiel patronen met match groups
const PROFIEL_PATRONEN = [
  // HE profielen (HEA 200, HEB 300, HE 200 A, HE300B)
  { regex: /\b(HE)\s*(\d{2,3})\s*([AB])\b/gi, format: (m: RegExpExecArray) => `HE${m[3].toUpperCase()} ${m[2]}` },
  { regex: /\b(HE[AB])\s*(\d{2,3})\b/gi, format: (m: RegExpExecArray) => `${m[1].toUpperCase()} ${m[2]}` },
  
  // IPE profielen
  { regex: /\b(IPE)\s*(\d{2,3})\b/gi, format: (m: RegExpExecArray) => `IPE ${m[2]}` },
  
  // UNP/UPN profielen  
  { regex: /\b(UNP|UPN)\s*(\d{2,3})\b/gi, format: (m: RegExpExecArray) => `UNP ${m[2]}` },
  
  // INP profielen
  { regex: /\b(INP)\s*(\d{2,3})\b/gi, format: (m: RegExpExecArray) => `INP ${m[2]}` },
  
  // L-profielen (hoekstaal): L 60.60.6, L60x60x6, L 60/60/6
  { regex: /\b[L]\s*(\d{2,3})[.xX\/](\d{2,3})[.xX\/](\d{1,2})\b/gi, format: (m: RegExpExecArray) => `L ${m[1]}.${m[2]}.${m[3]}` },
  
  // RHS/SHS kokerprofielen
  { regex: /\b(RHS|SHS)\s*(\d{2,3})[xX](\d{2,3})(?:[xX](\d{1,2}))?\b/gi, format: (m: RegExpExecArray) => `${m[1].toUpperCase()} ${m[2]}x${m[3]}${m[4] ? 'x' + m[4] : ''}` },
  
  // C-profielen (koudgevormd)
  { regex: /\b[C]\s*(\d{2,3})\b/gi, format: (m: RegExpExecArray) => `C ${m[1]}` },
]

// Element-profiel koppeling patronen
const KOPPELING_PATRONEN = [
  // "K14: HEB 300" of "K14 HEB 300"
  /([KHL])\s*(\d{1,3})\s*[:=]?\s*(HE[AB]|IPE|UNP|INP|L|C)\s*(\d{2,3})/gi,
  
  // "HEB 300 (K14)" of "HEB300-K14"
  /(HE[AB]|IPE|UNP)\s*(\d{2,3})\s*[-\(]\s*([KHL])\s*(\d{1,3})/gi,
  
  // Spanten: "SP1: HE 200 A" 
  /(SP|S)\s*(\d{1,3})\s*[:=]?\s*(HE[AB]|IPE|UNP)\s*(\d{2,3})/gi,
]

// === HOOFDFUNCTIE ===

/**
 * Analyseer PDF bestanden en bouw een profiel database op
 */
export async function bouwProfielDatabase(files: File[]): Promise<ProfielDatabase> {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`🔗 PROFIEL KOPPELING ANALYSE`)
  console.log(`${'═'.repeat(70)}\n`)
  
  const database: ProfielDatabase = {
    kolommen: new Map(),
    liggers: new Map(),
    spanten: new Map(),
    gordingen: new Map(),
    windverbanden: new Map(),
    defaults: {
      kolom: 'HEB 200',
      ligger: 'IPE 300',
      spant: 'HEA 200',
      gording: 'IPE 160',
      windverband: 'L 60.60.6'
    },
    gevondenProfielen: new Set(),
    bronnen: []
  }
  
  // Analyseer elk bestand
  for (const file of files) {
    try {
      console.log(`\n📄 Analyseren: ${file.name}`)
      database.bronnen.push(file.name)
      
      const tekstItems = await extraheerTekstMetPosities(file)
      const koppelingen = vindProfielKoppelingen(tekstItems, file.name)
      
      // Voeg koppelingen toe aan database
      for (const koppeling of koppelingen) {
        database.gevondenProfielen.add(koppeling.profiel)
        
        switch (koppeling.elementType) {
          case 'kolom':
            if (!database.kolommen.has(koppeling.elementId) || 
                koppeling.betrouwbaarheid > (database.kolommen.get(koppeling.elementId)?.betrouwbaarheid || 0)) {
              database.kolommen.set(koppeling.elementId, koppeling)
            }
            break
          case 'ligger':
            if (!database.liggers.has(koppeling.elementId) ||
                koppeling.betrouwbaarheid > (database.liggers.get(koppeling.elementId)?.betrouwbaarheid || 0)) {
              database.liggers.set(koppeling.elementId, koppeling)
            }
            break
          case 'spant':
            if (!database.spanten.has(koppeling.elementId) ||
                koppeling.betrouwbaarheid > (database.spanten.get(koppeling.elementId)?.betrouwbaarheid || 0)) {
              database.spanten.set(koppeling.elementId, koppeling)
            }
            break
          case 'gording':
            if (!database.gordingen.has(koppeling.elementId) ||
                koppeling.betrouwbaarheid > (database.gordingen.get(koppeling.elementId)?.betrouwbaarheid || 0)) {
              database.gordingen.set(koppeling.elementId, koppeling)
            }
            break
          case 'windverband':
            if (!database.windverbanden.has(koppeling.elementId) ||
                koppeling.betrouwbaarheid > (database.windverbanden.get(koppeling.elementId)?.betrouwbaarheid || 0)) {
              database.windverbanden.set(koppeling.elementId, koppeling)
            }
            break
        }
      }
      
      // Update defaults gebaseerd op meest voorkomende profielen
      updateDefaults(database, koppelingen)
      
    } catch (error) {
      console.error(`   ❌ Fout bij ${file.name}:`, error)
    }
  }
  
  // Log resultaten
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`📊 RESULTAAT PROFIEL DATABASE:`)
  console.log(`   Kolommen:      ${database.kolommen.size} gekoppeld`)
  console.log(`   Liggers:       ${database.liggers.size} gekoppeld`)
  console.log(`   Spanten:       ${database.spanten.size} gekoppeld`)
  console.log(`   Gordingen:     ${database.gordingen.size} gekoppeld`)
  console.log(`   Windverbanden: ${database.windverbanden.size} gekoppeld`)
  console.log(`   Unieke profielen: ${[...database.gevondenProfielen].join(', ')}`)
  console.log(`   Defaults: kolom=${database.defaults.kolom}, ligger=${database.defaults.ligger}`)
  console.log(`${'─'.repeat(70)}\n`)
  
  return database
}

// === PDF TEKST EXTRACTIE MET POSITIES ===

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

// === PROFIEL KOPPELING LOGICA ===

function vindProfielKoppelingen(tekstItems: TekstMetPositie[], bestandsnaam: string): ElementProfielKoppeling[] {
  const koppelingen: ElementProfielKoppeling[] = []
  
  // 1. Directe koppelingen uit tekst (K14: HEB 300)
  const volledgeTekst = tekstItems.map(t => t.tekst).join(' ')
  
  for (const patroon of KOPPELING_PATRONEN) {
    patroon.lastIndex = 0
    let match: RegExpExecArray | null
    
    while ((match = patroon.exec(volledgeTekst)) !== null) {
      const koppeling = parseKoppelingMatch(match, bestandsnaam)
      if (koppeling) {
        koppeling.betrouwbaarheid = 0.95  // Directe koppeling = hoge betrouwbaarheid
        koppelingen.push(koppeling)
        console.log(`   ✓ Directe koppeling: ${koppeling.elementId} → ${koppeling.profiel}`)
      }
    }
  }
  
  // 2. Proximity-based koppelingen (profiel dicht bij element ID)
  const elementItems = tekstItems.filter(t => isElementId(t.tekst))
  const profielItems = tekstItems.filter(t => isProfiel(t.tekst))
  
  for (const element of elementItems) {
    const elementId = normalizeElementId(element.tekst)
    const elementType = bepaalElementType(elementId)
    
    // Zoek dichtstbijzijnde profiel
    let dichtsteProfiel: TekstMetPositie | null = null
    let minAfstand = Infinity
    
    for (const profiel of profielItems) {
      // Alleen profielen op dezelfde pagina
      if (profiel.pagina !== element.pagina) continue
      
      const afstand = Math.sqrt(
        Math.pow(profiel.x - element.x, 2) + 
        Math.pow(profiel.y - element.y, 2)
      )
      
      // Max afstand: 150 punten (typisch ~50mm op papier)
      if (afstand < minAfstand && afstand < 150) {
        minAfstand = afstand
        dichtsteProfiel = profiel
      }
    }
    
    if (dichtsteProfiel) {
      const profielNaam = normalizeProfiel(dichtsteProfiel.tekst)
      
      // Check of we dit element al hebben met hogere betrouwbaarheid
      const bestaande = koppelingen.find(k => k.elementId === elementId)
      const betrouwbaarheid = Math.max(0.5, 0.9 - (minAfstand / 150) * 0.4)
      
      if (!bestaande || bestaande.betrouwbaarheid < betrouwbaarheid) {
        koppelingen.push({
          elementId,
          elementType,
          profiel: profielNaam,
          bronTekening: bestandsnaam,
          betrouwbaarheid,
          positieInTekening: { x: element.x, y: element.y },
          context: `Nabij profiel op ${minAfstand.toFixed(0)} punten afstand`
        })
        console.log(`   ◐ Proximity koppeling: ${elementId} → ${profielNaam} (${(betrouwbaarheid * 100).toFixed(0)}%)`)
      }
    }
  }
  
  // 3. Tabel-gebaseerde koppelingen (stuklijsten)
  const tabelKoppelingen = vindTabelKoppelingen(tekstItems, bestandsnaam)
  koppelingen.push(...tabelKoppelingen)
  
  return koppelingen
}

function parseKoppelingMatch(match: RegExpExecArray, bestandsnaam: string): ElementProfielKoppeling | null {
  // Parse de match afhankelijk van het patroon
  // Patroon 1: K14: HEB 300 → groups: K, 14, HEB, 300
  // Patroon 2: HEB 300 (K14) → groups: HEB, 300, K, 14
  
  let elementId: string
  let profiel: string
  
  if (match[1].match(/^[KHLS]/i)) {
    // Patroon 1: Element eerst
    elementId = `${match[1].toUpperCase()}${match[2]}`
    profiel = `${match[3].toUpperCase()} ${match[4]}`
  } else {
    // Patroon 2: Profiel eerst  
    profiel = `${match[1].toUpperCase()} ${match[2]}`
    elementId = `${match[3].toUpperCase()}${match[4]}`
  }
  
  const elementType = bepaalElementType(elementId)
  
  return {
    elementId,
    elementType,
    profiel,
    bronTekening: bestandsnaam,
    betrouwbaarheid: 0.9
  }
}

function vindTabelKoppelingen(tekstItems: TekstMetPositie[], bestandsnaam: string): ElementProfielKoppeling[] {
  const koppelingen: ElementProfielKoppeling[] = []
  
  // Sorteer items op Y (rijen) en dan X (kolommen)
  const gesorteerd = [...tekstItems].sort((a, b) => {
    // Groepeer op rijen (binnen 5 punten Y-verschil)
    const rijVerschil = Math.abs(a.y - b.y)
    if (rijVerschil < 5) {
      return a.x - b.x  // Zelfde rij: sorteer op X
    }
    return b.y - a.y  // Verschillende rij: hogere Y eerst (PDF coordinaten)
  })
  
  // Groepeer in rijen
  const rijen: TekstMetPositie[][] = []
  let huidigeRij: TekstMetPositie[] = []
  let huidigeY = -1
  
  for (const item of gesorteerd) {
    if (huidigeY === -1 || Math.abs(item.y - huidigeY) < 8) {
      huidigeRij.push(item)
      huidigeY = item.y
    } else {
      if (huidigeRij.length > 0) rijen.push(huidigeRij)
      huidigeRij = [item]
      huidigeY = item.y
    }
  }
  if (huidigeRij.length > 0) rijen.push(huidigeRij)
  
  // Zoek rijen met zowel element ID als profiel
  for (const rij of rijen) {
    const rijTekst = rij.map(t => t.tekst)
    
    // Vind element IDs in deze rij
    const elementen = rijTekst.filter(t => isElementId(t))
    const profielen = rijTekst.filter(t => isProfiel(t))
    
    if (elementen.length === 1 && profielen.length === 1) {
      const elementId = normalizeElementId(elementen[0])
      const profiel = normalizeProfiel(profielen[0])
      
      koppelingen.push({
        elementId,
        elementType: bepaalElementType(elementId),
        profiel,
        bronTekening: bestandsnaam,
        betrouwbaarheid: 0.85,
        context: 'Gevonden in tabel/stuklijst'
      })
      console.log(`   📋 Tabel koppeling: ${elementId} → ${profiel}`)
    }
  }
  
  return koppelingen
}

// === HELPER FUNCTIES ===

function isElementId(tekst: string): boolean {
  return /^[KHLSG]\d{1,3}$/i.test(tekst.trim()) ||
         /^SP\d{1,3}$/i.test(tekst.trim()) ||
         /^WV\d{1,3}$/i.test(tekst.trim())
}

function isProfiel(tekst: string): boolean {
  for (const patroon of PROFIEL_PATRONEN) {
    patroon.regex.lastIndex = 0
    if (patroon.regex.test(tekst)) return true
  }
  return false
}

function normalizeElementId(tekst: string): string {
  const clean = tekst.trim().toUpperCase()
  
  // SP1 → SP1
  if (clean.startsWith('SP')) return clean
  
  // K14 → K14
  return clean
}

function normalizeProfiel(tekst: string): string {
  for (const patroon of PROFIEL_PATRONEN) {
    patroon.regex.lastIndex = 0
    const match = patroon.regex.exec(tekst)
    if (match) {
      return patroon.format(match)
    }
  }
  return tekst.toUpperCase()
}

function bepaalElementType(elementId: string): ElementProfielKoppeling['elementType'] {
  const prefix = elementId.charAt(0).toUpperCase()
  
  switch (prefix) {
    case 'K':
    case 'H':
      return 'kolom'
    case 'L':
      return 'ligger'
    case 'S':
      return elementId.toUpperCase().startsWith('SP') ? 'spant' : 'spant'
    case 'G':
      return 'gording'
    case 'W':
      return 'windverband'
    default:
      return 'onbekend'
  }
}

function updateDefaults(database: ProfielDatabase, koppelingen: ElementProfielKoppeling[]): void {
  // Tel profiel frequenties per type
  const frequenties: Record<string, Map<string, number>> = {
    kolom: new Map(),
    ligger: new Map(),
    spant: new Map(),
    gording: new Map(),
    windverband: new Map()
  }
  
  for (const koppeling of koppelingen) {
    const typeFreq = frequenties[koppeling.elementType]
    if (typeFreq) {
      typeFreq.set(koppeling.profiel, (typeFreq.get(koppeling.profiel) || 0) + 1)
    }
  }
  
  // Update defaults naar meest voorkomende
  for (const [type, freq] of Object.entries(frequenties)) {
    if (freq.size > 0) {
      const meestVoorkomend = [...freq.entries()].sort((a, b) => b[1] - a[1])[0]
      if (meestVoorkomend && meestVoorkomend[1] >= 2) {
        (database.defaults as Record<string, string>)[type] = meestVoorkomend[0]
      }
    }
  }
}

// === DAKCONSTRUCTIE ANALYSE ===

/**
 * Analyseer dakconstructie uit tekeningen
 * Zoekt naar spant details, gordingen, windverbanden
 */
export async function analyseerDakconstructie(files: File[]): Promise<DakconstructieInfo> {
  console.log(`\n🏗️ DAKCONSTRUCTIE ANALYSE...`)
  
  const info: DakconstructieInfo = {
    spantType: 'onbekend',
    gordingProfiel: 'UNP 120',
    gordingAfstand: 2250,
    windverbandProfiel: 'L 60.60.6'
  }
  
  // Verzamel alle tekst
  let alleTekst = ''
  
  for (const file of files) {
    try {
      const tekstItems = await extraheerTekstMetPosities(file)
      alleTekst += ' ' + tekstItems.map(t => t.tekst).join(' ')
    } catch {
      // Skip files that can't be parsed
    }
  }
  
  // Zoek gordingafstand
  const gordingAfstandMatch = alleTekst.match(/(\d{3,4})\s*(?:mm)?\s*(?:h\.o\.h\.|hart\s*op\s*hart|c\.t\.c\.|ctc)/i)
  if (gordingAfstandMatch) {
    info.gordingAfstand = parseInt(gordingAfstandMatch[1])
    console.log(`   📏 Gordingafstand: ${info.gordingAfstand}mm`)
  }
  
  // Zoek gording profielen (UNP, IPE, C)
  const gordingMatch = alleTekst.match(/(UNP|IPE|C)\s*(\d{2,3})(?=.*gording)/i)
  if (gordingMatch) {
    info.gordingProfiel = `${gordingMatch[1].toUpperCase()} ${gordingMatch[2]}`
    console.log(`   📏 Gording profiel: ${info.gordingProfiel}`)
  }
  
  // Zoek windverband profielen (L-profielen)
  const windMatch = alleTekst.match(/L\s*(\d{2,3})[.xX\/](\d{2,3})[.xX\/](\d{1,2})(?=.*wind)/i)
  if (windMatch) {
    info.windverbandProfiel = `L ${windMatch[1]}.${windMatch[2]}.${windMatch[3]}`
    console.log(`   💨 Windverband profiel: ${info.windverbandProfiel}`)
  }
  
  // Zoek hoogtes
  const gootMatch = alleTekst.match(/goot(?:hoogte)?\s*[=:]?\s*[+]?\s*(\d{4,5})/i)
  if (gootMatch) {
    info.gootHoogte = parseInt(gootMatch[1])
    console.log(`   📐 Goothoogte: ${info.gootHoogte}mm`)
  }
  
  const nokMatch = alleTekst.match(/nok(?:hoogte)?\s*[=:]?\s*[+]?\s*(\d{4,5})/i)
  if (nokMatch) {
    info.nokHoogte = parseInt(nokMatch[1])
    console.log(`   📐 Nokhoogte: ${info.nokHoogte}mm`)
  }
  
  // Bepaal spanttype
  if (alleTekst.toLowerCase().includes('vakwerk')) {
    info.spantType = 'vakwerk'
  } else if (alleTekst.toLowerCase().includes('portaal')) {
    info.spantType = 'portaal'
  }
  
  // Zoek spant profiel info
  const bovenrandMatch = alleTekst.match(/(HE[AB]|IPE)\s*(\d{2,3}).*(?:bovenrand|bovenflens)/i)
  const onderrandMatch = alleTekst.match(/(HE[AB]|IPE)\s*(\d{2,3}).*(?:onderrand|onderflens)/i)
  const diagonaalMatch = alleTekst.match(/(L)\s*(\d{2,3})[.xX](\d{2,3})[.xX](\d{1,2}).*(?:diagonaal|schoor)/i)
  
  if (bovenrandMatch || onderrandMatch) {
    info.spantProfiel = {
      bovenrand: bovenrandMatch ? `${bovenrandMatch[1].toUpperCase()} ${bovenrandMatch[2]}` : 'HE 200 A',
      onderrand: onderrandMatch ? `${onderrandMatch[1].toUpperCase()} ${onderrandMatch[2]}` : 'HE 120 A',
      diagonaal: diagonaalMatch ? `L ${diagonaalMatch[2]}.${diagonaalMatch[3]}.${diagonaalMatch[4]}` : 'L 40.40.4'
    }
    console.log(`   🔺 Spant profielen: boven=${info.spantProfiel.bovenrand}, onder=${info.spantProfiel.onderrand}`)
  }
  
  return info
}

// === EXPORT: PROFIEL OPZOEKEN ===

/**
 * Zoek het profiel op voor een specifiek element
 */
export function zoekProfiel(
  database: ProfielDatabase, 
  elementType: 'kolom' | 'ligger' | 'spant' | 'gording' | 'windverband',
  elementId?: string
): string {
  // Probeer specifiek element op te zoeken
  if (elementId) {
    switch (elementType) {
      case 'kolom':
        if (database.kolommen.has(elementId)) {
          return database.kolommen.get(elementId)!.profiel
        }
        break
      case 'ligger':
        if (database.liggers.has(elementId)) {
          return database.liggers.get(elementId)!.profiel
        }
        break
      case 'spant':
        if (database.spanten.has(elementId)) {
          return database.spanten.get(elementId)!.profiel
        }
        break
      case 'gording':
        if (database.gordingen.has(elementId)) {
          return database.gordingen.get(elementId)!.profiel
        }
        break
      case 'windverband':
        if (database.windverbanden.has(elementId)) {
          return database.windverbanden.get(elementId)!.profiel
        }
        break
    }
  }
  
  // Fallback naar default
  return database.defaults[elementType]
}
