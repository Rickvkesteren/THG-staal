/**
 * PDF Structure Analyzer
 * Analyseert visuele structuren in technische tekeningen:
 * - Lijn/vorm detectie voor staalprofielen
 * - Maatvoeringen herkennen en linken
 * - Profiel classificatie met AI-achtige patroonherkenning
 * - Geometrische relaties tussen elementen
 */

import * as pdfjsLib from 'pdfjs-dist'

// Configureer PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// === TYPE DEFINITIES ===

export interface Point {
  x: number
  y: number
}

export interface Line {
  start: Point
  end: Point
  length: number
  angle: number  // graden, 0 = horizontaal
  type: 'solid' | 'dashed' | 'dimension' | 'unknown'
}

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
  center: Point
}

export interface DetectedProfile {
  type: 'H' | 'I' | 'U' | 'L' | 'RHS' | 'CHS' | 'unknown'
  boundingBox: Rectangle
  dimensions: {
    height?: number      // H van profiel
    width?: number       // B van profiel  
    webThickness?: number
    flangeThickness?: number
  }
  confidence: number  // 0-1
  suggestedProfile?: string  // "HEB 300"
}

export interface DimensionAnnotation {
  value: number        // De waarde (bijv 6000)
  unit: 'mm' | 'm' | 'unknown'
  position: Point
  orientation: 'horizontal' | 'vertical' | 'diagonal'
  linkedElements: string[]  // IDs van gerelateerde elementen
  context: 'length' | 'height' | 'spacing' | 'offset' | 'unknown'
}

export interface TextBlock {
  text: string
  position: Point
  bounds: Rectangle
  fontSize: number
  isProfileRef: boolean      // Is dit een profiel referentie?
  isElementRef: boolean      // Is dit een element ID (K1, L2)?
  isDimension: boolean       // Is dit een maat?
}

export interface GridInfo {
  axes: {
    label: string        // A, B, C of 1, 2, 3
    position: number     // X of Y positie
    orientation: 'vertical' | 'horizontal'
  }[]
  spacing: {
    x: number[]          // Afstanden tussen verticale assen
    y: number[]          // Afstanden tussen horizontale assen
  }
}

export interface StructureAnalysisResult {
  // Ruwe extractie
  lines: Line[]
  rectangles: Rectangle[]
  textBlocks: TextBlock[]
  
  // Geïnterpreteerde data
  profiles: DetectedProfile[]
  dimensions: DimensionAnnotation[]
  grid: GridInfo | null
  
  // Gerelateerde elementen
  elements: {
    id: string
    type: 'kolom' | 'ligger' | 'spant' | 'gording' | 'unknown'
    profile: string | null
    length: number | null
    position: Point | null
    linkedDimensions: number[]  // Indices in dimensions array
  }[]
  
  // Metadata
  pageSize: { width: number, height: number }
  scale: number | null  // Schaal factor indien gedetecteerd (1:100, 1:50)
  confidence: number
}

// === PROFIEL PATRONEN VOOR HERKENNING ===

// Typische H/I profiel verhoudingen (voor toekomstige geometrische detectie)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _PROFILE_RATIOS = {
  HEB: { heightToWidth: [0.95, 1.15], webRatio: [0.08, 0.12] },
  HEA: { heightToWidth: [0.85, 1.05], webRatio: [0.06, 0.10] },
  IPE: { heightToWidth: [1.8, 2.5], webRatio: [0.04, 0.08] },
  UNP: { heightToWidth: [1.5, 2.2], webRatio: [0.06, 0.10] },
}

// Standaard profielen met afmetingen (mm)
const STANDARD_PROFILES: Record<string, { h: number, b: number, tw: number, tf: number }> = {
  'HEB 100': { h: 100, b: 100, tw: 6, tf: 10 },
  'HEB 120': { h: 120, b: 120, tw: 6.5, tf: 11 },
  'HEB 140': { h: 140, b: 140, tw: 7, tf: 12 },
  'HEB 160': { h: 160, b: 160, tw: 8, tf: 13 },
  'HEB 180': { h: 180, b: 180, tw: 8.5, tf: 14 },
  'HEB 200': { h: 200, b: 200, tw: 9, tf: 15 },
  'HEB 220': { h: 220, b: 220, tw: 9.5, tf: 16 },
  'HEB 240': { h: 240, b: 240, tw: 10, tf: 17 },
  'HEB 260': { h: 260, b: 260, tw: 10, tf: 17.5 },
  'HEB 280': { h: 280, b: 280, tw: 10.5, tf: 18 },
  'HEB 300': { h: 300, b: 300, tw: 11, tf: 19 },
  'HEB 320': { h: 320, b: 300, tw: 11.5, tf: 20.5 },
  'HEB 340': { h: 340, b: 300, tw: 12, tf: 21.5 },
  'HEB 360': { h: 360, b: 300, tw: 12.5, tf: 22.5 },
  'HEB 400': { h: 400, b: 300, tw: 13.5, tf: 24 },
  'HEA 100': { h: 96, b: 100, tw: 5, tf: 8 },
  'HEA 120': { h: 114, b: 120, tw: 5, tf: 8 },
  'HEA 140': { h: 133, b: 140, tw: 5.5, tf: 8.5 },
  'HEA 160': { h: 152, b: 160, tw: 6, tf: 9 },
  'HEA 180': { h: 171, b: 180, tw: 6, tf: 9.5 },
  'HEA 200': { h: 190, b: 200, tw: 6.5, tf: 10 },
  'HEA 220': { h: 210, b: 220, tw: 7, tf: 11 },
  'HEA 240': { h: 230, b: 240, tw: 7.5, tf: 12 },
  'HEA 260': { h: 250, b: 260, tw: 7.5, tf: 12.5 },
  'HEA 280': { h: 270, b: 280, tw: 8, tf: 13 },
  'HEA 300': { h: 290, b: 300, tw: 8.5, tf: 14 },
  'IPE 100': { h: 100, b: 55, tw: 4.1, tf: 5.7 },
  'IPE 120': { h: 120, b: 64, tw: 4.4, tf: 6.3 },
  'IPE 140': { h: 140, b: 73, tw: 4.7, tf: 6.9 },
  'IPE 160': { h: 160, b: 82, tw: 5, tf: 7.4 },
  'IPE 180': { h: 180, b: 91, tw: 5.3, tf: 8 },
  'IPE 200': { h: 200, b: 100, tw: 5.6, tf: 8.5 },
  'IPE 220': { h: 220, b: 110, tw: 5.9, tf: 9.2 },
  'IPE 240': { h: 240, b: 120, tw: 6.2, tf: 9.8 },
  'IPE 270': { h: 270, b: 135, tw: 6.6, tf: 10.2 },
  'IPE 300': { h: 300, b: 150, tw: 7.1, tf: 10.7 },
  'IPE 330': { h: 330, b: 160, tw: 7.5, tf: 11.5 },
  'IPE 360': { h: 360, b: 170, tw: 8, tf: 12.7 },
  'IPE 400': { h: 400, b: 180, tw: 8.6, tf: 13.5 },
  'IPE 450': { h: 450, b: 190, tw: 9.4, tf: 14.6 },
  'IPE 500': { h: 500, b: 200, tw: 10.2, tf: 16 },
  'IPE 550': { h: 550, b: 210, tw: 11.1, tf: 17.2 },
  'IPE 600': { h: 600, b: 220, tw: 12, tf: 19 },
}

// === HOOFDANALYSE FUNCTIE ===

/**
 * Analyseer een PDF pagina voor structuren, profielen en maatvoeringen
 */
export async function analyzePageStructure(file: File, pageNum: number = 1): Promise<StructureAnalysisResult> {
  console.log(`\n🔬 STRUCTUUR ANALYSE: ${file.name}, pagina ${pageNum}`)
  console.log('═'.repeat(60))
  
  const result: StructureAnalysisResult = {
    lines: [],
    rectangles: [],
    textBlocks: [],
    profiles: [],
    dimensions: [],
    grid: null,
    elements: [],
    pageSize: { width: 0, height: 0 },
    scale: null,
    confidence: 0
  }
  
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    const page = await pdf.getPage(pageNum)
    
    const viewport = page.getViewport({ scale: 1.0 })
    result.pageSize = { width: viewport.width, height: viewport.height }
    
    console.log(`📄 Pagina grootte: ${viewport.width.toFixed(0)} x ${viewport.height.toFixed(0)} pts`)
    
    // 1. Extraheer alle tekst met posities
    const textContent = await page.getTextContent()
    result.textBlocks = extractTextBlocks(textContent, viewport)
    console.log(`📝 ${result.textBlocks.length} tekstblokken gevonden`)
    
    // 2. Extraheer operatoren (lijnen, vormen) uit de PDF
    const operators = await page.getOperatorList()
    const graphicsResult = extractGraphics(operators, viewport)
    result.lines = graphicsResult.lines
    result.rectangles = graphicsResult.rectangles
    console.log(`📏 ${result.lines.length} lijnen, ${result.rectangles.length} rechthoeken`)
    
    // 3. Analyseer maatvoering
    result.dimensions = analyzeDimensions(result.textBlocks, result.lines)
    console.log(`📐 ${result.dimensions.length} maatvoeringen gedetecteerd`)
    
    // 4. Detecteer stramien/grid
    result.grid = detectGrid(result.textBlocks, result.lines)
    if (result.grid) {
      console.log(`🔲 Grid gedetecteerd: ${result.grid.axes.length} assen`)
    }
    
    // 5. Detecteer en classificeer profielen
    result.profiles = detectProfiles(result.textBlocks, result.lines, result.rectangles)
    console.log(`🔧 ${result.profiles.length} profielen gedetecteerd`)
    
    // 6. Link alles samen tot elementen
    result.elements = linkElements(result)
    console.log(`🏗️ ${result.elements.length} elementen geïdentificeerd`)
    
    // 7. Detecteer schaal
    result.scale = detectScale(result.textBlocks)
    if (result.scale) {
      console.log(`📏 Schaal gedetecteerd: 1:${result.scale}`)
    }
    
    // Bereken confidence score
    result.confidence = calculateConfidence(result)
    console.log(`✅ Analyse compleet, confidence: ${(result.confidence * 100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('❌ Analyse fout:', error)
  }
  
  return result
}

// === TEKST EXTRACTIE ===

function extractTextBlocks(textContent: any, viewport: any): TextBlock[] {
  const blocks: TextBlock[] = []
  
  for (const item of textContent.items) {
    if (!item.str || item.str.trim() === '') continue
    
    const text = item.str.trim()
    const transform = item.transform
    
    // Bereken positie
    const x = transform[4]
    const y = viewport.height - transform[5]  // PDF y is bottom-up
    
    // Schat font size
    const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]) || 12
    
    // Classificeer tekst
    const isProfileRef = /^(HE[AB]|IPE|UNP|INP|HEM|L|RHS|SHS)\s*\d+/i.test(text)
    const isElementRef = /^[KLG]?\d+$|^SP\d+$|^K\d+|^L\d+/i.test(text)
    const isDimension = /^\d{3,5}$/.test(text) || /^\d+[.,]\d+$/.test(text)
    
    blocks.push({
      text,
      position: { x, y },
      bounds: {
        x,
        y,
        width: item.width || text.length * fontSize * 0.6,
        height: fontSize,
        center: { x: x + (item.width || 0) / 2, y: y + fontSize / 2 }
      },
      fontSize,
      isProfileRef,
      isElementRef,
      isDimension
    })
  }
  
  return blocks
}

// === GRAPHICS EXTRACTIE ===

function extractGraphics(operators: any, viewport: any): { lines: Line[], rectangles: Rectangle[] } {
  const lines: Line[] = []
  const rectangles: Rectangle[] = []
  
  // PDF operator codes voor graphics
  const OPS = pdfjsLib.OPS
  
  let currentPath: Point[] = []
  let currentX = 0
  let currentY = 0
  
  for (let i = 0; i < operators.fnArray.length; i++) {
    const fn = operators.fnArray[i]
    const args = operators.argsArray[i]
    
    switch (fn) {
      case OPS.moveTo:
        currentX = args[0]
        currentY = viewport.height - args[1]
        currentPath = [{ x: currentX, y: currentY }]
        break
        
      case OPS.lineTo:
        const lineEndX = args[0]
        const lineEndY = viewport.height - args[1]
        
        if (currentPath.length > 0) {
          const start = currentPath[currentPath.length - 1]
          const end = { x: lineEndX, y: lineEndY }
          const length = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
          const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
          
          if (length > 5) {  // Filter zeer korte lijnen
            lines.push({
              start,
              end,
              length,
              angle,
              type: 'unknown'
            })
          }
        }
        
        currentPath.push({ x: lineEndX, y: lineEndY })
        currentX = lineEndX
        currentY = lineEndY
        break
        
      case OPS.rectangle:
        const rx = args[0]
        const ry = viewport.height - args[1] - args[3]
        const rw = args[2]
        const rh = args[3]
        
        if (rw > 5 && rh > 5) {  // Filter kleine rechthoeken
          rectangles.push({
            x: rx,
            y: ry,
            width: Math.abs(rw),
            height: Math.abs(rh),
            center: { x: rx + rw / 2, y: ry + rh / 2 }
          })
        }
        break
        
      case OPS.closePath:
        currentPath = []
        break
    }
  }
  
  // Classificeer lijnen
  classifyLines(lines)
  
  return { lines, rectangles }
}

function classifyLines(lines: Line[]): void {
  for (const line of lines) {
    // Horizontale of verticale lijnen zijn vaak maatlijnen of structuurlijnen
    const isHorizontal = Math.abs(line.angle) < 5 || Math.abs(line.angle - 180) < 5
    const isVertical = Math.abs(Math.abs(line.angle) - 90) < 5
    
    // Korte lijnen aan het einde van maatlijnen
    if (line.length < 20 && (isHorizontal || isVertical)) {
      line.type = 'dimension'
    }
    // Lange horizontale/verticale lijnen zijn structuur
    else if (line.length > 50 && (isHorizontal || isVertical)) {
      line.type = 'solid'
    }
  }
}

// === MAATVOERING ANALYSE ===

function analyzeDimensions(textBlocks: TextBlock[], lines: Line[]): DimensionAnnotation[] {
  const dimensions: DimensionAnnotation[] = []
  
  // Zoek alle numerieke waarden die maten kunnen zijn
  for (const block of textBlocks) {
    if (!block.isDimension) continue
    
    const value = parseFloat(block.text.replace(',', '.'))
    if (isNaN(value)) continue
    
    // Bepaal eenheid en context
    let unit: 'mm' | 'm' | 'unknown' = 'unknown'
    let context: DimensionAnnotation['context'] = 'unknown'
    
    // Waarden > 1000 zijn waarschijnlijk mm
    if (value >= 1000 && value <= 50000) {
      unit = 'mm'
      // Typische waarden
      if (value >= 5000 && value <= 8000) context = 'spacing'  // Raster afstanden
      else if (value >= 3000 && value <= 12000) context = 'height'  // Hoogtes
      else context = 'length'
    }
    // Waarden < 100 kunnen meters zijn
    else if (value >= 1 && value <= 50) {
      unit = 'm'
      context = 'length'
    }
    
    // Zoek nabije lijnen om oriëntatie te bepalen
    const nearbyLines = lines.filter(l => {
      const dist = distanceToLine(block.position, l)
      return dist < 50
    })
    
    let orientation: DimensionAnnotation['orientation'] = 'horizontal'
    if (nearbyLines.length > 0) {
      const avgAngle = nearbyLines.reduce((sum, l) => sum + Math.abs(l.angle), 0) / nearbyLines.length
      if (avgAngle > 45 && avgAngle < 135) orientation = 'vertical'
    }
    
    dimensions.push({
      value: unit === 'm' ? value * 1000 : value,  // Altijd in mm
      unit,
      position: block.position,
      orientation,
      linkedElements: [],
      context
    })
  }
  
  // Sorteer op waarde voor logging
  dimensions.sort((a, b) => b.value - a.value)
  
  if (dimensions.length > 0) {
    console.log('   📐 Gevonden maten:', dimensions.slice(0, 10).map(d => `${d.value}mm (${d.context})`).join(', '))
  }
  
  return dimensions
}

function distanceToLine(point: Point, line: Line): number {
  const A = point.x - line.start.x
  const B = point.y - line.start.y
  const C = line.end.x - line.start.x
  const D = line.end.y - line.start.y
  
  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1
  
  if (lenSq !== 0) param = dot / lenSq
  
  let xx, yy
  if (param < 0) {
    xx = line.start.x
    yy = line.start.y
  } else if (param > 1) {
    xx = line.end.x
    yy = line.end.y
  } else {
    xx = line.start.x + param * C
    yy = line.start.y + param * D
  }
  
  return Math.sqrt(Math.pow(point.x - xx, 2) + Math.pow(point.y - yy, 2))
}

// === GRID/STRAMIEN DETECTIE ===

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function detectGrid(textBlocks: TextBlock[], _lines: Line[]): GridInfo | null {
  const grid: GridInfo = {
    axes: [],
    spacing: { x: [], y: [] }
  }
  
  // Zoek stramien labels (A, B, C... of 1, 2, 3...)
  const letterAxes = textBlocks.filter(b => /^[A-M]$/i.test(b.text))
  const numberAxes = textBlocks.filter(b => /^\d{1,2}$/.test(b.text) && parseInt(b.text) <= 20)
  
  // Letters zijn meestal verticale assen (X-richting)
  for (const block of letterAxes) {
    grid.axes.push({
      label: block.text.toUpperCase(),
      position: block.position.x,
      orientation: 'vertical'
    })
  }
  
  // Nummers zijn meestal horizontale assen (Y-richting)  
  for (const block of numberAxes) {
    grid.axes.push({
      label: block.text,
      position: block.position.y,
      orientation: 'horizontal'
    })
  }
  
  // Bereken afstanden
  const verticalAxes = grid.axes.filter(a => a.orientation === 'vertical').sort((a, b) => a.position - b.position)
  const horizontalAxes = grid.axes.filter(a => a.orientation === 'horizontal').sort((a, b) => a.position - b.position)
  
  for (let i = 1; i < verticalAxes.length; i++) {
    grid.spacing.x.push(Math.abs(verticalAxes[i].position - verticalAxes[i-1].position))
  }
  
  for (let i = 1; i < horizontalAxes.length; i++) {
    grid.spacing.y.push(Math.abs(horizontalAxes[i].position - horizontalAxes[i-1].position))
  }
  
  if (grid.axes.length < 2) return null
  
  console.log(`   🔲 Assen: ${grid.axes.map(a => a.label).join(', ')}`)
  
  return grid
}

// === PROFIEL DETECTIE ===

function detectProfiles(textBlocks: TextBlock[], lines: Line[], rectangles: Rectangle[]): DetectedProfile[] {
  const profiles: DetectedProfile[] = []
  
  // 1. Directe tekstherkenning van profiel namen
  const profileTexts = textBlocks.filter(b => b.isProfileRef)
  
  for (const block of profileTexts) {
    const profileName = normalizeProfileName(block.text)
    const stdProfile = STANDARD_PROFILES[profileName]
    
    if (stdProfile) {
      profiles.push({
        type: profileName.startsWith('HEB') || profileName.startsWith('HEA') ? 'H' :
              profileName.startsWith('IPE') ? 'I' :
              profileName.startsWith('UNP') ? 'U' : 'unknown',
        boundingBox: block.bounds,
        dimensions: {
          height: stdProfile.h,
          width: stdProfile.b,
          webThickness: stdProfile.tw,
          flangeThickness: stdProfile.tf
        },
        confidence: 0.95,
        suggestedProfile: profileName
      })
    }
  }
  
  // 2. Geometrische detectie van H/I profielen in doorsneden
  // Zoek naar typische H-profiel patronen in lijnen
  const hProfiles = detectHProfileShapes(lines, rectangles)
  profiles.push(...hProfiles)
  
  // Log gevonden profielen
  if (profiles.length > 0) {
    console.log('   🔧 Profielen:', profiles.map(p => p.suggestedProfile || p.type).join(', '))
  }
  
  return profiles
}

function normalizeProfileName(text: string): string {
  // "HEB300" -> "HEB 300"
  // "HE B 300" -> "HEB 300"
  const match = text.match(/(HE[AB]|IPE|UNP|INP|HEM)\s*(\d+)/i)
  if (match) {
    return `${match[1].toUpperCase()} ${match[2]}`
  }
  return text.toUpperCase()
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function detectHProfileShapes(lines: Line[], _rectangles: Rectangle[]): DetectedProfile[] {
  const profiles: DetectedProfile[] = []
  
  // Zoek naar groepen van lijnen die een H-vorm vormen
  // H-profiel heeft 2 horizontale flenzen + 1 verticale lijf
  
  // Voor toekomstige geometrische profiel detectie
  const _horizontalLines = lines.filter(l => Math.abs(l.angle) < 10 || Math.abs(l.angle - 180) < 10)
  const _verticalLines = lines.filter(l => Math.abs(Math.abs(l.angle) - 90) < 10)
  
  // Groepeer lijnen per locatie
  const lineGroups: Line[][] = []
  const used = new Set<number>()
  
  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue
    
    const group: Line[] = [lines[i]]
    used.add(i)
    
    for (let j = i + 1; j < lines.length; j++) {
      if (used.has(j)) continue
      
      // Check of lijnen dichtbij elkaar zijn
      const dist = Math.min(
        distanceBetweenPoints(lines[i].start, lines[j].start),
        distanceBetweenPoints(lines[i].end, lines[j].end),
        distanceBetweenPoints(lines[i].start, lines[j].end),
        distanceBetweenPoints(lines[i].end, lines[j].start)
      )
      
      if (dist < 100) {
        group.push(lines[j])
        used.add(j)
      }
    }
    
    if (group.length >= 5) {  // Minimaal 5 lijnen voor een H-profiel
      lineGroups.push(group)
    }
  }
  
  // Analyseer elke groep
  for (const group of lineGroups) {
    const hor = group.filter(l => Math.abs(l.angle) < 10 || Math.abs(l.angle - 180) < 10)
    const ver = group.filter(l => Math.abs(Math.abs(l.angle) - 90) < 10)
    
    // H-profiel: 2-4 horizontale + 1-2 verticale
    if (hor.length >= 2 && ver.length >= 1) {
      const bounds = getBoundingBox(group)
      const ratio = bounds.height / bounds.width
      
      // Probeer profiel te matchen
      let suggestedProfile: string | undefined
      let type: DetectedProfile['type'] = 'H'
      
      if (ratio > 1.5 && ratio < 3) {
        type = 'I'
        suggestedProfile = matchProfileByRatio(ratio, 'IPE')
      } else if (ratio > 0.8 && ratio < 1.3) {
        type = 'H'
        suggestedProfile = matchProfileByRatio(ratio, 'HEB')
      }
      
      if (suggestedProfile) {
        profiles.push({
          type,
          boundingBox: bounds,
          dimensions: {
            height: bounds.height,
            width: bounds.width
          },
          confidence: 0.6,
          suggestedProfile
        })
      }
    }
  }
  
  return profiles
}

function distanceBetweenPoints(a: Point, b: Point): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2))
}

function getBoundingBox(lines: Line[]): Rectangle {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  
  for (const line of lines) {
    minX = Math.min(minX, line.start.x, line.end.x)
    minY = Math.min(minY, line.start.y, line.end.y)
    maxX = Math.max(maxX, line.start.x, line.end.x)
    maxY = Math.max(maxY, line.start.y, line.end.y)
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 }
  }
}

function matchProfileByRatio(ratio: number, family: 'HEB' | 'HEA' | 'IPE'): string | undefined {
  const profiles = Object.entries(STANDARD_PROFILES)
    .filter(([name]) => name.startsWith(family))
  
  let bestMatch: string | undefined
  let bestDiff = Infinity
  
  for (const [name, dims] of profiles) {
    const profileRatio = dims.h / dims.b
    const diff = Math.abs(profileRatio - ratio)
    
    if (diff < bestDiff) {
      bestDiff = diff
      bestMatch = name
    }
  }
  
  return bestDiff < 0.3 ? bestMatch : undefined
}

// === ELEMENT LINKING ===

function linkElements(result: StructureAnalysisResult): StructureAnalysisResult['elements'] {
  const elements: StructureAnalysisResult['elements'] = []
  
  // Zoek element IDs in tekst
  const elementRefs = result.textBlocks.filter(b => b.isElementRef)
  
  for (const ref of elementRefs) {
    const id = ref.text.toUpperCase()
    let type: 'kolom' | 'ligger' | 'spant' | 'gording' | 'unknown' = 'unknown'
    
    if (id.startsWith('K')) type = 'kolom'
    else if (id.startsWith('L')) type = 'ligger'
    else if (id.startsWith('SP')) type = 'spant'
    else if (id.startsWith('G')) type = 'gording'
    
    // Zoek nabije profielen
    let profile: string | null = null
    for (const p of result.profiles) {
      const dist = distanceBetweenPoints(ref.position, p.boundingBox.center)
      if (dist < 200 && p.suggestedProfile) {
        profile = p.suggestedProfile
        break
      }
    }
    
    // Zoek nabije maten
    const linkedDimensions: number[] = []
    result.dimensions.forEach((dim, idx) => {
      const dist = distanceBetweenPoints(ref.position, dim.position)
      if (dist < 300) {
        linkedDimensions.push(idx)
      }
    })
    
    // Bepaal lengte uit gekoppelde maten
    let length: number | null = null
    if (linkedDimensions.length > 0) {
      const lengthDims = linkedDimensions
        .map(i => result.dimensions[i])
        .filter(d => d.context === 'length' || d.context === 'height')
      
      if (lengthDims.length > 0) {
        length = lengthDims[0].value
      }
    }
    
    elements.push({
      id,
      type,
      profile,
      length,
      position: ref.position,
      linkedDimensions
    })
  }
  
  return elements
}

// === SCHAAL DETECTIE ===

function detectScale(textBlocks: TextBlock[]): number | null {
  for (const block of textBlocks) {
    // Zoek naar schaal notaties: "1:100", "schaal 1:50", etc.
    const match = block.text.match(/1\s*:\s*(\d+)/i)
    if (match) {
      return parseInt(match[1])
    }
  }
  return null
}

// === CONFIDENCE BEREKENING ===

function calculateConfidence(result: StructureAnalysisResult): number {
  let score = 0
  let maxScore = 0
  
  // Heeft profielen gevonden?
  maxScore += 30
  if (result.profiles.length > 0) {
    score += Math.min(30, result.profiles.length * 10)
  }
  
  // Heeft maten gevonden?
  maxScore += 25
  if (result.dimensions.length > 0) {
    score += Math.min(25, result.dimensions.length * 5)
  }
  
  // Heeft grid gevonden?
  maxScore += 20
  if (result.grid && result.grid.axes.length >= 2) {
    score += 20
  }
  
  // Heeft elementen gevonden?
  maxScore += 15
  if (result.elements.length > 0) {
    score += Math.min(15, result.elements.length * 3)
  }
  
  // Heeft schaal gevonden?
  maxScore += 10
  if (result.scale) {
    score += 10
  }
  
  return score / maxScore
}

// === EXPORT: VOLLEDIG BESTAND ANALYSEREN ===

export async function analyzeFullPDF(file: File): Promise<{
  pages: StructureAnalysisResult[]
  combined: {
    allProfiles: DetectedProfile[]
    allDimensions: DimensionAnnotation[]
    allElements: StructureAnalysisResult['elements']
    grid: GridInfo | null
    summary: {
      uniqueProfiles: string[]
      kolomCount: number
      liggerCount: number
      spantCount: number
      avgConfidence: number
    }
  }
}> {
  console.log(`\n${'═'.repeat(70)}`)
  console.log(`🔬 VOLLEDIGE PDF STRUCTUUR ANALYSE: ${file.name}`)
  console.log(`${'═'.repeat(70)}\n`)
  
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  
  const pages: StructureAnalysisResult[] = []
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const pageResult = await analyzePageStructure(file, i)
    pages.push(pageResult)
  }
  
  // Combineer resultaten
  const allProfiles = pages.flatMap(p => p.profiles)
  const allDimensions = pages.flatMap(p => p.dimensions)
  const allElements = pages.flatMap(p => p.elements)
  
  // Vind beste grid (meeste assen)
  let bestGrid: GridInfo | null = null
  let maxAxes = 0
  for (const page of pages) {
    if (page.grid && page.grid.axes.length > maxAxes) {
      bestGrid = page.grid
      maxAxes = page.grid.axes.length
    }
  }
  
  // Bereken summary
  const uniqueProfiles = [...new Set(allProfiles.map(p => p.suggestedProfile).filter(Boolean))] as string[]
  const kolomCount = allElements.filter(e => e.type === 'kolom').length
  const liggerCount = allElements.filter(e => e.type === 'ligger').length
  const spantCount = allElements.filter(e => e.type === 'spant').length
  const avgConfidence = pages.reduce((sum, p) => sum + p.confidence, 0) / pages.length
  
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`📊 SAMENVATTING:`)
  console.log(`   Profielen: ${uniqueProfiles.join(', ') || 'geen'}`)
  console.log(`   Elementen: ${kolomCount} kolommen, ${liggerCount} liggers, ${spantCount} spanten`)
  console.log(`   Maten: ${allDimensions.length} gevonden`)
  console.log(`   Confidence: ${(avgConfidence * 100).toFixed(1)}%`)
  console.log(`${'═'.repeat(70)}\n`)
  
  return {
    pages,
    combined: {
      allProfiles,
      allDimensions,
      allElements,
      grid: bestGrid,
      summary: {
        uniqueProfiles,
        kolomCount,
        liggerCount,
        spantCount,
        avgConfidence
      }
    }
  }
}
