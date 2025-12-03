/**
 * Geavanceerde Visuele Analyzer v1.0
 * 
 * Detecteert geometrische vormen, lijnen, en tekening structuren
 * uit PDF graphics operators.
 * 
 * CAPABILITIES:
 * 1. Maatlijn detectie met pijlen
 * 2. Element contour herkenning (H/I profielen)
 * 3. Verbindingsdetectie (bout/laspatronen)
 * 4. Raster lijn detectie
 * 5. Annotatie ballonnen
 * 6. Doorsnede markers
 */

import * as pdfjsLib from 'pdfjs-dist'

// Configureer PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// === TYPES ===

export interface Punt {
  x: number
  y: number
}

export interface Lijn {
  start: Punt
  end: Punt
  lengte: number
  hoek: number  // 0-360 graden
  type: LijnType
  dikte: number
  stijl: 'solid' | 'dashed' | 'dotted' | 'centerline'
}

export type LijnType = 
  | 'contour'        // Object omtrek
  | 'maatlijn'       // Dimensie lijn
  | 'hulplijn'       // Extension line
  | 'hartlijn'       // Centerline
  | 'rasterlijn'     // Grid
  | 'verwijslijn'    // Leader
  | 'verborgen'      // Hidden line (streep)
  | 'onbekend'

export interface Rechthoek {
  x: number
  y: number
  width: number
  height: number
  rotatie: number
  type: RechthoekType
}

export type RechthoekType =
  | 'profiel-contour'  // H/I balk doorsnede
  | 'plaat'            // Flat plate
  | 'titelblok'        // Title block
  | 'detail-kader'     // Detail viewport
  | 'onbekend'

export interface Cirkel {
  center: Punt
  radius: number
  type: 'bout' | 'gat' | 'as-symbool' | 'ballon' | 'onbekend'
}

export interface Maatlijn {
  waarde: number
  eenheid: 'mm' | 'm'
  positie: Punt
  richting: 'horizontaal' | 'verticaal' | 'diagonaal'
  lijnStart: Punt
  lijnEnd: Punt
  // Extension lines
  extensieLinks?: Lijn
  extensieRechts?: Lijn
  // Pijlen/ticks
  eindType: 'pijl' | 'tick' | 'dot' | 'geen'
  // Gekoppelde elementen
  gekoppeldAan: string[]
}

export interface ProfielContour {
  type: 'H-profiel' | 'I-profiel' | 'L-profiel' | 'C-profiel' | 'buis' | 'onbekend'
  positie: Punt
  breedte: number
  hoogte: number
  flensDikte?: number
  lijfDikte?: number
  // Mogelijke profiel match
  mogelijkProfiel?: string
  confidence: number
}

export interface Annotatie {
  type: 'ballon' | 'tekstveld' | 'marker'
  positie: Punt
  tekst: string
  verbindingsLijn?: Lijn
}

export interface DoorsnedeMarker {
  label: string  // A-A, B-B, etc
  positie: Punt
  richting: 'horizontaal' | 'verticaal'
  // De doorsnedelijn
  lijnStart: Punt
  lijnEnd: Punt
}

export interface VisueleAnalyseResultaat {
  // Raw geometrie
  lijnen: Lijn[]
  rechthoeken: Rechthoek[]
  cirkels: Cirkel[]
  
  // Gedetecteerde elementen
  maatlijnen: Maatlijn[]
  profielContouren: ProfielContour[]
  annotaties: Annotatie[]
  doorsnedeMarkers: DoorsnedeMarker[]
  
  // Raster
  rasterLijnenX: number[]  // X posities van verticale lijnen
  rasterLijnenY: number[]  // Y posities van horizontale lijnen
  
  // Kwaliteit
  aantalOperators: number
  verwerkingsTijd: number
  detectieKwaliteit: number
}

// === CONSTANTEN ===

// Toleranties
const HOEK_TOLERANTIE = 5  // graden
const LIJN_TOLERANTIE = 2  // pixels
const PUNT_TOLERANTIE = 10 // pixels

// Maatlijn en profiel herkenning constanten - voor toekomstige implementatie
// MAATLIJN_PIJL_LENGTE = 8px, MAATLIJN_MIN_LENGTE = 20px, PROFIEL_MIN_GROOTTE = 15px

// === HOOFDFUNCTIE ===

export async function analyseerVisueel(file: File): Promise<VisueleAnalyseResultaat> {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`🎨 VISUELE ANALYSE: ${file.name}`)
  console.log(`${'═'.repeat(70)}`)
  
  const startTijd = Date.now()
  
  const resultaat: VisueleAnalyseResultaat = {
    lijnen: [],
    rechthoeken: [],
    cirkels: [],
    maatlijnen: [],
    profielContouren: [],
    annotaties: [],
    doorsnedeMarkers: [],
    rasterLijnenX: [],
    rasterLijnenY: [],
    aantalOperators: 0,
    verwerkingsTijd: 0,
    detectieKwaliteit: 0
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    console.log(`📄 ${pdf.numPages} pagina's`)
    
    // Process elke pagina
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.0 })
      const ops = await page.getOperatorList()
      
      console.log(`\n📃 Pagina ${pageNum}: ${ops.fnArray.length} operators`)
      resultaat.aantalOperators += ops.fnArray.length
      
      // Extraheer geometrie
      const paginaGeometrie = extraheerGeometrie(ops, viewport)
      
      resultaat.lijnen.push(...paginaGeometrie.lijnen)
      resultaat.rechthoeken.push(...paginaGeometrie.rechthoeken)
      resultaat.cirkels.push(...paginaGeometrie.cirkels)
    }
    
    console.log(`\n📊 Raw extractie:`)
    console.log(`   ${resultaat.lijnen.length} lijnen`)
    console.log(`   ${resultaat.rechthoeken.length} rechthoeken`)
    console.log(`   ${resultaat.cirkels.length} cirkels`)
    
    // === ANALYSE STAPPEN ===
    
    // 1. Classificeer lijnen
    console.log(`\n1️⃣  Lijn classificatie...`)
    classificeerLijnen(resultaat.lijnen)
    
    // 2. Detecteer raster
    console.log(`\n2️⃣  Raster detectie...`)
    detecteerRaster(resultaat)
    console.log(`   X-lijnen: ${resultaat.rasterLijnenX.length}`)
    console.log(`   Y-lijnen: ${resultaat.rasterLijnenY.length}`)
    
    // 3. Detecteer maatlijnen
    console.log(`\n3️⃣  Maatlijn detectie...`)
    // (Placeholder - vereist tekst data voor volledige implementatie)
    
    // 4. Detecteer profiel contouren
    console.log(`\n4️⃣  Profiel contour detectie...`)
    resultaat.profielContouren = detecteerProfielContouren(resultaat.rechthoeken, resultaat.lijnen)
    console.log(`   ${resultaat.profielContouren.length} profiel contouren`)
    
    // 5. Classificeer rechthoeken
    console.log(`\n5️⃣  Rechthoek classificatie...`)
    classificeerRechthoeken(resultaat.rechthoeken)
    
    // 6. Detecteer annotaties
    console.log(`\n6️⃣  Annotatie detectie...`)
    resultaat.annotaties = detecteerAnnotaties(resultaat.cirkels, resultaat.lijnen)
    console.log(`   ${resultaat.annotaties.length} annotaties`)
    
    // Bereken kwaliteit
    resultaat.detectieKwaliteit = berekenKwaliteit(resultaat)
    resultaat.verwerkingsTijd = Date.now() - startTijd
    
    console.log(`\n✅ Analyse voltooid in ${resultaat.verwerkingsTijd}ms`)
    console.log(`   Kwaliteit: ${resultaat.detectieKwaliteit}%`)
    
  } catch (error) {
    console.error('❌ Fout bij visuele analyse:', error)
  }
  
  console.log(`${'═'.repeat(70)}\n`)
  
  return resultaat
}

// === GEOMETRIE EXTRACTIE ===

interface PaginaGeometrie {
  lijnen: Lijn[]
  rechthoeken: Rechthoek[]
  cirkels: Cirkel[]
}

function extraheerGeometrie(ops: { fnArray: number[], argsArray: any[] }, viewport: any): PaginaGeometrie {
  const lijnen: Lijn[] = []
  const rechthoeken: Rechthoek[] = []
  const cirkels: Cirkel[] = []
  
  // Huidige grafische staat
  let currentPath: Punt[] = []
  let currentPos: Punt = { x: 0, y: 0 }
  let currentMatrix = [1, 0, 0, 1, 0, 0]  // Identity
  let lineWidth = 1
  
  const OPS = pdfjsLib.OPS
  
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]
    const args = ops.argsArray[i]
    
    switch (fn) {
      // Transform matrix
      case OPS.transform:
        if (args && args.length >= 6) {
          currentMatrix = args as number[]
        }
        break
        
      // Line width
      case OPS.setLineWidth:
        if (args && args.length >= 1) {
          lineWidth = args[0] as number
        }
        break
        
      // Move to
      case OPS.moveTo:
        if (args && args.length >= 2) {
          currentPos = transformPunt({ x: args[0], y: args[1] }, currentMatrix, viewport)
          currentPath = [currentPos]
        }
        break
        
      // Line to
      case OPS.lineTo:
        if (args && args.length >= 2) {
          const newPos = transformPunt({ x: args[0], y: args[1] }, currentMatrix, viewport)
          
          // Maak lijn
          const lijn = maakLijn(currentPos, newPos, lineWidth)
          if (lijn.lengte > LIJN_TOLERANTIE) {
            lijnen.push(lijn)
          }
          
          currentPath.push(newPos)
          currentPos = newPos
        }
        break
        
      // Rectangle
      case OPS.rectangle:
        if (args && args.length >= 4) {
          const x = args[0] as number
          const y = args[1] as number
          const w = args[2] as number
          const h = args[3] as number
          
          const p1 = transformPunt({ x, y }, currentMatrix, viewport)
          const p2 = transformPunt({ x: x + w, y: y + h }, currentMatrix, viewport)
          
          rechthoeken.push({
            x: Math.min(p1.x, p2.x),
            y: Math.min(p1.y, p2.y),
            width: Math.abs(p2.x - p1.x),
            height: Math.abs(p2.y - p1.y),
            rotatie: 0,
            type: 'onbekend'
          })
        }
        break
        
      // Curve to (cubic bezier) - approximeer als cirkel indien mogelijk
      case OPS.curveTo:
        if (args && args.length >= 6) {
          const cp1 = transformPunt({ x: args[0], y: args[1] }, currentMatrix, viewport)
          const cp2 = transformPunt({ x: args[2], y: args[3] }, currentMatrix, viewport)
          const end = transformPunt({ x: args[4], y: args[5] }, currentMatrix, viewport)
          
          // Check of dit deel van een cirkel is
          const mogelijkeCirkel = detecteerCirkelVanCurve(currentPos, cp1, cp2, end)
          if (mogelijkeCirkel) {
            // Voeg toe als we al een bijna complete cirkel hebben
            const bestaandeCirkel = cirkels.find(c =>
              afstand(c.center, mogelijkeCirkel.center) < PUNT_TOLERANTIE &&
              Math.abs(c.radius - mogelijkeCirkel.radius) < PUNT_TOLERANTIE
            )
            
            if (!bestaandeCirkel && mogelijkeCirkel.radius > 2) {
              cirkels.push({
                center: mogelijkeCirkel.center,
                radius: mogelijkeCirkel.radius,
                type: 'onbekend'
              })
            }
          }
          
          currentPos = end
        }
        break
        
      // Close path
      case OPS.closePath:
        if (currentPath.length > 2) {
          // Voeg sluitende lijn toe
          const lijn = maakLijn(currentPos, currentPath[0], lineWidth)
          if (lijn.lengte > LIJN_TOLERANTIE) {
            lijnen.push(lijn)
          }
        }
        break
        
      // End path (nieuwe path begint)
      case OPS.endPath:
        currentPath = []
        break
        
      // Stroke
      case OPS.stroke:
        // Path is al verwerkt
        break
        
      // Fill
      case OPS.fill:
      case OPS.eoFill:
        // Gevulde vormen kunnen we ook als rechthoeken behandelen
        if (currentPath.length === 4) {
          // Mogelijk een rechthoek
          const bounds = berekenBounds(currentPath)
          if (bounds.width > 0 && bounds.height > 0) {
            rechthoeken.push({
              ...bounds,
              rotatie: 0,
              type: 'onbekend'
            })
          }
        }
        break
        
      // Save/restore grafische staat
      case OPS.save:
        // TODO: stack voor staat
        break
        
      case OPS.restore:
        // TODO: stack restore
        break
    }
  }
  
  // Deduplicate
  const uniqueLijnen = dedupliceerLijnen(lijnen)
  const uniqueRechthoeken = dedupliceerRechthoeken(rechthoeken)
  const uniqueCirkels = dedupliceerCirkels(cirkels)
  
  return {
    lijnen: uniqueLijnen,
    rechthoeken: uniqueRechthoeken,
    cirkels: uniqueCirkels
  }
}

function transformPunt(p: Punt, matrix: number[], viewport: any): Punt {
  // Apply transformation matrix
  const x = p.x * matrix[0] + p.y * matrix[2] + matrix[4]
  const y = p.x * matrix[1] + p.y * matrix[3] + matrix[5]
  
  // Transform to viewport coordinates
  return {
    x: x,
    y: viewport.height - y  // Flip Y
  }
}

function maakLijn(start: Punt, end: Punt, dikte: number): Lijn {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengte = Math.sqrt(dx * dx + dy * dy)
  
  // Bereken hoek in graden (0 = rechts, 90 = boven)
  let hoek = Math.atan2(dy, dx) * 180 / Math.PI
  if (hoek < 0) hoek += 360
  
  return {
    start,
    end,
    lengte,
    hoek,
    type: 'onbekend',
    dikte,
    stijl: 'solid'
  }
}

function afstand(p1: Punt, p2: Punt): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

function detecteerCirkelVanCurve(
  start: Punt, 
  cp1: Punt, 
  cp2: Punt, 
  end: Punt
): { center: Punt, radius: number } | null {
  // Simpele benadering: check of de control points op een cirkel liggen
  const midX = (start.x + end.x) / 2
  const midY = (start.y + end.y) / 2
  
  // Control point afstanden
  const d1 = afstand(cp1, { x: midX, y: midY })
  const d2 = afstand(cp2, { x: midX, y: midY })
  
  // Als control points ongeveer even ver zijn, kan het een cirkel zijn
  if (Math.abs(d1 - d2) < 5) {
    const radius = (d1 + d2) / 2
    return { center: { x: midX, y: midY }, radius }
  }
  
  return null
}

function berekenBounds(punten: Punt[]): { x: number, y: number, width: number, height: number } {
  const xs = punten.map(p => p.x)
  const ys = punten.map(p => p.y)
  
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

// === DEDUPLICATIE ===

function dedupliceerLijnen(lijnen: Lijn[]): Lijn[] {
  const unique: Lijn[] = []
  
  for (const lijn of lijnen) {
    const isDuplicate = unique.some(u =>
      (afstand(u.start, lijn.start) < PUNT_TOLERANTIE && afstand(u.end, lijn.end) < PUNT_TOLERANTIE) ||
      (afstand(u.start, lijn.end) < PUNT_TOLERANTIE && afstand(u.end, lijn.start) < PUNT_TOLERANTIE)
    )
    
    if (!isDuplicate) {
      unique.push(lijn)
    }
  }
  
  return unique
}

function dedupliceerRechthoeken(rechthoeken: Rechthoek[]): Rechthoek[] {
  const unique: Rechthoek[] = []
  
  for (const rect of rechthoeken) {
    const isDuplicate = unique.some(u =>
      Math.abs(u.x - rect.x) < PUNT_TOLERANTIE &&
      Math.abs(u.y - rect.y) < PUNT_TOLERANTIE &&
      Math.abs(u.width - rect.width) < PUNT_TOLERANTIE &&
      Math.abs(u.height - rect.height) < PUNT_TOLERANTIE
    )
    
    if (!isDuplicate && rect.width > 1 && rect.height > 1) {
      unique.push(rect)
    }
  }
  
  return unique
}

function dedupliceerCirkels(cirkels: Cirkel[]): Cirkel[] {
  const unique: Cirkel[] = []
  
  for (const cirkel of cirkels) {
    const isDuplicate = unique.some(u =>
      afstand(u.center, cirkel.center) < PUNT_TOLERANTIE &&
      Math.abs(u.radius - cirkel.radius) < 3
    )
    
    if (!isDuplicate) {
      unique.push(cirkel)
    }
  }
  
  return unique
}

// === CLASSIFICATIE ===

function classificeerLijnen(lijnen: Lijn[]): void {
  for (const lijn of lijnen) {
    // Horizontaal of verticaal?
    const isHorizontaal = Math.abs(lijn.hoek) < HOEK_TOLERANTIE || 
                          Math.abs(lijn.hoek - 180) < HOEK_TOLERANTIE ||
                          Math.abs(lijn.hoek - 360) < HOEK_TOLERANTIE
    const isVerticaal = Math.abs(lijn.hoek - 90) < HOEK_TOLERANTIE ||
                        Math.abs(lijn.hoek - 270) < HOEK_TOLERANTIE
    
    // Dunne lijnen zijn vaak hulplijnen of maatlijnen
    if (lijn.dikte < 0.5) {
      if (isHorizontaal || isVerticaal) {
        lijn.type = 'hulplijn'
      } else {
        lijn.type = 'verwijslijn'
      }
    }
    // Middeldikke lijnen zijn meestal contourlijnen
    else if (lijn.dikte >= 0.5 && lijn.dikte < 2) {
      lijn.type = 'contour'
    }
    // Dikke lijnen kunnen rasterlijnen zijn
    else if (lijn.dikte >= 2) {
      if (lijn.lengte > 200) {
        lijn.type = 'rasterlijn'
      } else {
        lijn.type = 'contour'
      }
    }
  }
}

function classificeerRechthoeken(rechthoeken: Rechthoek[]): void {
  // Sorteer op grootte (groot naar klein) - beschikbaar voor toekomstige prioriteitsverwerking
  // gesorteerd = [...rechthoeken].sort((a, b) => (b.width * b.height) - (a.width * a.height))
  
  for (const rect of rechthoeken) {
    const aspectRatio = rect.width / rect.height
    const area = rect.width * rect.height
    
    // Groot en breed = titelblok (meestal rechtsonder)
    if (rect.width > 300 && rect.height > 100 && rect.height < 200) {
      rect.type = 'titelblok'
    }
    // Vierkant-achtig met randje = detail kader
    else if (aspectRatio > 0.8 && aspectRatio < 1.2 && area > 10000) {
      rect.type = 'detail-kader'
    }
    // Lang en dun = mogelijk profiel
    else if ((aspectRatio > 3 || aspectRatio < 0.33) && area > 100) {
      rect.type = 'plaat'
    }
  }
}

// === RASTER DETECTIE ===

function detecteerRaster(resultaat: VisueleAnalyseResultaat): void {
  const verticaleLijnen: number[] = []
  const horizontaleLijnen: number[] = []
  
  for (const lijn of resultaat.lijnen) {
    // Lange verticale lijnen
    if (lijn.type === 'rasterlijn' || lijn.lengte > 300) {
      const isVerticaal = Math.abs(lijn.hoek - 90) < HOEK_TOLERANTIE ||
                          Math.abs(lijn.hoek - 270) < HOEK_TOLERANTIE
      const isHorizontaal = Math.abs(lijn.hoek) < HOEK_TOLERANTIE || 
                            Math.abs(lijn.hoek - 180) < HOEK_TOLERANTIE
      
      if (isVerticaal) {
        const x = (lijn.start.x + lijn.end.x) / 2
        // Check of we al een lijn op deze X hebben
        if (!verticaleLijnen.some(vx => Math.abs(vx - x) < 10)) {
          verticaleLijnen.push(x)
        }
      }
      
      if (isHorizontaal) {
        const y = (lijn.start.y + lijn.end.y) / 2
        if (!horizontaleLijnen.some(hy => Math.abs(hy - y) < 10)) {
          horizontaleLijnen.push(y)
        }
      }
    }
  }
  
  // Sorteer
  resultaat.rasterLijnenX = verticaleLijnen.sort((a, b) => a - b)
  resultaat.rasterLijnenY = horizontaleLijnen.sort((a, b) => a - b)
}

// === PROFIEL CONTOUR DETECTIE ===

function detecteerProfielContouren(
  _rechthoeken: Rechthoek[],  // Reserved for future use with combined detection
  lijnen: Lijn[]
): ProfielContour[] {
  const contouren: ProfielContour[] = []
  
  // Zoek naar H/I profiel patronen
  // Een H-profiel bestaat uit 2 horizontale flenzen en 1 verticale lijf
  
  // Groepeer lijnen per orientatie
  const horizontaal = lijnen.filter(l => 
    Math.abs(l.hoek) < HOEK_TOLERANTIE || 
    Math.abs(l.hoek - 180) < HOEK_TOLERANTIE
  )
  const verticaal = lijnen.filter(l =>
    Math.abs(l.hoek - 90) < HOEK_TOLERANTIE ||
    Math.abs(l.hoek - 270) < HOEK_TOLERANTIE
  )
  
  // Zoek naar paren van horizontale lijnen met verticale connectie
  for (const h1 of horizontaal) {
    for (const h2 of horizontaal) {
      if (h1 === h2) continue
      
      // Check of ze boven elkaar liggen
      const yVerschil = Math.abs(h1.start.y - h2.start.y)
      if (yVerschil < 10 || yVerschil > 300) continue
      
      // Check of ze ongeveer even lang zijn
      const lengteVerschil = Math.abs(h1.lengte - h2.lengte)
      if (lengteVerschil > h1.lengte * 0.2) continue
      
      // Check of er een verticale lijn tussen zit
      const centerX = (h1.start.x + h1.end.x + h2.start.x + h2.end.x) / 4
      const minY = Math.min(h1.start.y, h2.start.y)
      const maxY = Math.max(h1.start.y, h2.start.y)
      
      const verbindingsLijf = verticaal.find(v => {
        const vCenterX = (v.start.x + v.end.x) / 2
        const vMinY = Math.min(v.start.y, v.end.y)
        const vMaxY = Math.max(v.start.y, v.end.y)
        
        return Math.abs(vCenterX - centerX) < 20 &&
               vMinY <= minY + 5 &&
               vMaxY >= maxY - 5
      })
      
      if (verbindingsLijf) {
        const hoogte = yVerschil
        const breedte = (h1.lengte + h2.lengte) / 2
        
        // Schat profiel
        const mogelijkProfiel = schatProfiel('H', breedte, hoogte)
        
        contouren.push({
          type: 'H-profiel',
          positie: { x: centerX - breedte / 2, y: minY },
          breedte,
          hoogte,
          mogelijkProfiel,
          confidence: 0.7
        })
      }
    }
  }
  
  // Zoek ook naar I-profielen (smaller)
  // en L-profielen (hoeken)
  
  // Deduplicate
  return contouren.filter((c, idx, arr) =>
    arr.findIndex(c2 =>
      Math.abs(c2.positie.x - c.positie.x) < 20 &&
      Math.abs(c2.positie.y - c.positie.y) < 20
    ) === idx
  )
}

function schatProfiel(_type: string, breedte: number, hoogte: number): string | undefined {
  // type parameter reserved for future profile type specific estimation
  // Gebaseerd op schaal 1:100, schaal 1:50, of pixels
  // Probeer de meest waarschijnlijke schaal
  
  // Typische H-profiel afmetingen (mm):
  // HEB 200: h=200, b=200
  // HEB 300: h=300, b=300
  // IPE 300: h=300, b=150
  
  // Schaal 1:100: 300mm = 3px
  // Schaal 1:50: 300mm = 6px
  // Schaal 1:20: 300mm = 15px
  
  const schalen = [100, 50, 20, 10]
  
  for (const schaal of schalen) {
    const h = hoogte * schaal
    const b = breedte * schaal
    
    // Check bekende profielen
    if (Math.abs(h - b) < 50) {
      // HEB (h ≈ b)
      const sizes = [100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 400]
      const closest = sizes.reduce((prev, curr) =>
        Math.abs(curr - h) < Math.abs(prev - h) ? curr : prev
      )
      if (Math.abs(closest - h) < 30) {
        return `HEB ${closest}`
      }
    } else if (h > b * 1.5) {
      // IPE (h > b)
      const sizes = [200, 220, 240, 270, 300, 330, 360, 400, 450, 500]
      const closest = sizes.reduce((prev, curr) =>
        Math.abs(curr - h) < Math.abs(prev - h) ? curr : prev
      )
      if (Math.abs(closest - h) < 30) {
        return `IPE ${closest}`
      }
    }
  }
  
  return undefined
}

// === ANNOTATIE DETECTIE ===

function detecteerAnnotaties(
  cirkels: Cirkel[],
  lijnen: Lijn[]
): Annotatie[] {
  const annotaties: Annotatie[] = []
  
  // Classificeer cirkels
  for (const cirkel of cirkels) {
    // Kleine cirkels (r < 5) zijn waarschijnlijk bouten/gaten
    if (cirkel.radius < 5) {
      cirkel.type = 'bout'
    }
    // Middel cirkels (r 8-15) kunnen ballonnen zijn
    else if (cirkel.radius >= 8 && cirkel.radius <= 20) {
      // Check of er een lijn naar wijst
      const verwijsLijn = lijnen.find(l =>
        afstand(l.start, cirkel.center) < 5 ||
        afstand(l.end, cirkel.center) < 5
      )
      
      if (verwijsLijn) {
        cirkel.type = 'ballon'
        annotaties.push({
          type: 'ballon',
          positie: cirkel.center,
          tekst: '',  // Moet uit tekst data komen
          verbindingsLijn: verwijsLijn
        })
      } else {
        cirkel.type = 'as-symbool'
      }
    }
    // Grote cirkels zijn as-symbolen
    else if (cirkel.radius > 20) {
      cirkel.type = 'as-symbool'
    }
  }
  
  return annotaties
}

// === KWALITEIT ===

function berekenKwaliteit(resultaat: VisueleAnalyseResultaat): number {
  let score = 0
  
  // Lijnen (max 25)
  score += Math.min(25, resultaat.lijnen.length / 10)
  
  // Rechthoeken (max 15)
  score += Math.min(15, resultaat.rechthoeken.length)
  
  // Profielcontouren (max 25)
  score += Math.min(25, resultaat.profielContouren.length * 5)
  
  // Raster (max 20)
  if (resultaat.rasterLijnenX.length > 0) score += 10
  if (resultaat.rasterLijnenY.length > 0) score += 10
  
  // Annotaties (max 15)
  score += Math.min(15, resultaat.annotaties.length * 3)
  
  return Math.min(100, Math.round(score))
}

// === GECOMBINEERDE ANALYSE ===

export interface GecombineerdeAnalyseResultaat {
  visueel: VisueleAnalyseResultaat
  // Combinatie met tekst data (toekomstig)
  maatlijnen: Maatlijn[]
  gekoppeldeProfielen: Array<{
    contour: ProfielContour
    tekst: string | null
    confidence: number
  }>
}

export async function analyseerVolledig(file: File): Promise<GecombineerdeAnalyseResultaat> {
  const visueel = await analyseerVisueel(file)
  
  // Placeholder voor combinatie met tekst
  return {
    visueel,
    maatlijnen: [],
    gekoppeldeProfielen: visueel.profielContouren.map(c => ({
      contour: c,
      tekst: c.mogelijkProfiel || null,
      confidence: c.confidence
    }))
  }
}
