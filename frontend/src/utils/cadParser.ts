/**
 * CAD File Parser
 * Ondersteunt IFC, STEP, DXF en JSON formaten
 */

import type { CADElement, Conditie, ElementType } from '../types'

export interface CADParseResult {
  success: boolean
  elementen: CADElement[]
  metadata: {
    bestandsnaam: string
    formaat: string
    aantalElementen: number
    bouwjaar?: number
    projectNaam?: string
  }
  errors: string[]
}

export interface IFCEntity {
  id: string
  type: string
  name?: string
  profile?: string
  length?: number
  position?: { x: number; y: number; z: number }
  rotation?: { x: number; y: number; z: number }
}

// Profiel type herkenning
const PROFIEL_PATRONEN: Record<string, RegExp> = {
  HEA: /HEA\s*(\d+)/i,
  HEB: /HEB\s*(\d+)/i,
  HEM: /HEM\s*(\d+)/i,
  IPE: /IPE\s*(\d+)/i,
  UNP: /UNP\s*(\d+)/i,
  UPE: /UPE\s*(\d+)/i,
}

// Profiel gewichten per meter (kg/m)
const PROFIEL_GEWICHTEN: Record<string, number> = {
  'HEA 100': 16.7, 'HEA 120': 19.9, 'HEA 140': 24.7, 'HEA 160': 30.4,
  'HEA 180': 35.5, 'HEA 200': 42.3, 'HEA 220': 50.5, 'HEA 240': 60.3,
  'HEA 260': 68.2, 'HEA 280': 76.4, 'HEA 300': 88.3, 'HEA 320': 97.6,
  'HEB 100': 20.4, 'HEB 120': 26.7, 'HEB 140': 33.7, 'HEB 160': 42.6,
  'HEB 180': 51.2, 'HEB 200': 61.3, 'HEB 220': 71.5, 'HEB 240': 83.2,
  'HEB 260': 93.0, 'HEB 280': 103, 'HEB 300': 117, 'HEB 320': 127,
  'IPE 100': 8.1, 'IPE 120': 10.4, 'IPE 140': 12.9, 'IPE 160': 15.8,
  'IPE 180': 18.8, 'IPE 200': 22.4, 'IPE 220': 26.2, 'IPE 240': 30.7,
  'IPE 270': 36.1, 'IPE 300': 42.2, 'IPE 330': 49.1, 'IPE 360': 57.1,
  'IPE 400': 66.3, 'IPE 450': 77.6, 'IPE 500': 90.7, 'IPE 550': 106,
  'IPE 600': 122,
}

/**
 * Parse een CAD bestand (IFC, STEP, DXF of JSON)
 */
export async function parseCADFile(file: File): Promise<CADParseResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()
  
  try {
    const content = await file.text()
    
    switch (extension) {
      case 'ifc':
        return parseIFCContent(content, file.name)
      case 'step':
      case 'stp':
        return parseSTEPContent(content, file.name)
      case 'dxf':
        return parseDXFContent(content, file.name)
      case 'json':
        return parseJSONContent(content, file.name)
      default:
        return {
          success: false,
          elementen: [],
          metadata: { bestandsnaam: file.name, formaat: extension || 'unknown', aantalElementen: 0 },
          errors: [`Niet ondersteund bestandsformaat: ${extension}`]
        }
    }
  } catch (error) {
    return {
      success: false,
      elementen: [],
      metadata: { bestandsnaam: file.name, formaat: extension || 'unknown', aantalElementen: 0 },
      errors: [`Fout bij het lezen van bestand: ${error}`]
    }
  }
}

/**
 * Parse IFC bestandsinhoud
 */
function parseIFCContent(content: string, filename: string): CADParseResult {
  const elementen: CADElement[] = []
  const errors: string[] = []
  
  // Zoek naar staal elementen in IFC
  const ifcBeamRegex = /IFCBEAM\s*\(\s*'([^']+)'/gi
  const ifcColumnRegex = /IFCCOLUMN\s*\(\s*'([^']+)'/gi
  const ifcMemberRegex = /IFCMEMBER\s*\(\s*'([^']+)'/gi
  
  let match
  let elementIndex = 0
  
  // Parse balken
  while ((match = ifcBeamRegex.exec(content)) !== null) {
    const element = createElementFromIFC(match[1], 'balk', elementIndex++, content)
    if (element) elementen.push(element)
  }
  
  // Parse kolommen
  while ((match = ifcColumnRegex.exec(content)) !== null) {
    const element = createElementFromIFC(match[1], 'kolom', elementIndex++, content)
    if (element) elementen.push(element)
  }
  
  // Parse andere stalen elementen
  while ((match = ifcMemberRegex.exec(content)) !== null) {
    const element = createElementFromIFC(match[1], 'ligger', elementIndex++, content)
    if (element) elementen.push(element)
  }
  
  // Als geen elementen gevonden, probeer generieke parsing
  if (elementen.length === 0) {
    // Zoek naar profielnamen in de content
    for (const [type, regex] of Object.entries(PROFIEL_PATRONEN)) {
      const matches = content.matchAll(new RegExp(regex, 'gi'))
      for (const m of matches) {
        const profielNaam = `${type} ${m[1]}`
        elementen.push(createDemoElement(profielNaam, elementIndex++))
      }
    }
  }
  
  return {
    success: elementen.length > 0,
    elementen,
    metadata: {
      bestandsnaam: filename,
      formaat: 'IFC',
      aantalElementen: elementen.length,
      projectNaam: extractIFCProjectName(content)
    },
    errors: elementen.length === 0 ? ['Geen stalen elementen gevonden in IFC bestand'] : errors
  }
}

/**
 * Parse STEP bestandsinhoud
 */
function parseSTEPContent(content: string, filename: string): CADParseResult {
  const elementen: CADElement[] = []
  
  // STEP formaat is complex, we zoeken naar herkenbare profielinformatie
  let elementIndex = 0
  
  for (const [type, regex] of Object.entries(PROFIEL_PATRONEN)) {
    const matches = content.matchAll(new RegExp(regex, 'gi'))
    for (const m of matches) {
      const profielNaam = `${type} ${m[1]}`
      elementen.push(createDemoElement(profielNaam, elementIndex++))
    }
  }
  
  // Zoek naar lengtes (in mm)
  const lengteMatches = content.matchAll(/(\d{3,5})\s*(?:mm|MM)/g)
  let lengteIndex = 0
  for (const match of lengteMatches) {
    if (lengteIndex < elementen.length) {
      elementen[lengteIndex].lengte = parseInt(match[1])
      lengteIndex++
    }
  }
  
  return {
    success: elementen.length > 0,
    elementen,
    metadata: {
      bestandsnaam: filename,
      formaat: 'STEP',
      aantalElementen: elementen.length
    },
    errors: elementen.length === 0 ? ['Geen stalen elementen gevonden in STEP bestand'] : []
  }
}

/**
 * Parse DXF bestandsinhoud
 */
function parseDXFContent(content: string, filename: string): CADParseResult {
  const elementen: CADElement[] = []
  let elementIndex = 0
  
  // DXF layers kunnen informatie over staalprofielen bevatten
  const layerRegex = /AcDbLayerTableRecord[\s\S]*?2\n([^\n]+)/g
  let match
  
  while ((match = layerRegex.exec(content)) !== null) {
    const layerName = match[1].trim()
    
    // Check of laagnaam een staalprofiel bevat
    for (const [type, regex] of Object.entries(PROFIEL_PATRONEN)) {
      if (regex.test(layerName)) {
        const profielMatch = layerName.match(regex)
        if (profielMatch) {
          const profielNaam = `${type} ${profielMatch[1]}`
          elementen.push(createDemoElement(profielNaam, elementIndex++))
        }
      }
    }
  }
  
  // Zoek ook in TEXT entities
  const textRegex = /TEXT[\s\S]*?1\n([^\n]+)/g
  while ((match = textRegex.exec(content)) !== null) {
    const textContent = match[1].trim()
    for (const [type, regex] of Object.entries(PROFIEL_PATRONEN)) {
      if (regex.test(textContent)) {
        const profielMatch = textContent.match(regex)
        if (profielMatch) {
          const profielNaam = `${type} ${profielMatch[1]}`
          // Voorkom duplicaten
          if (!elementen.some(e => e.profielNaam === profielNaam)) {
            elementen.push(createDemoElement(profielNaam, elementIndex++))
          }
        }
      }
    }
  }
  
  return {
    success: elementen.length > 0,
    elementen,
    metadata: {
      bestandsnaam: filename,
      formaat: 'DXF',
      aantalElementen: elementen.length
    },
    errors: elementen.length === 0 ? ['Geen stalen elementen gevonden in DXF bestand'] : []
  }
}

/**
 * Parse JSON bestandsinhoud (eigen formaat)
 */
function parseJSONContent(content: string, filename: string): CADParseResult {
  try {
    const data = JSON.parse(content)
    const elementen: CADElement[] = []
    
    // Ondersteun verschillende JSON structuren
    const elementenData = data.elementen || data.elements || data.beams || data.members || []
    
    for (let i = 0; i < elementenData.length; i++) {
      const el = elementenData[i]
      const element: CADElement = {
        id: el.id || `json-${i}`,
        gebouwId: el.gebouwId || el.buildingId || 'imported',
        type: mapElementType(el.type),
        profielId: el.profielId || el.profileId || '',
        profielNaam: el.profielNaam || el.profileName || el.profile || 'HEA 200',
        lengte: el.lengte || el.length || 6000,
        gewicht: el.gewicht || el.weight || calculateWeight(el.profielNaam || 'HEA 200', el.lengte || 6000),
        conditie: mapConditie(el.conditie || el.condition),
        positie: {
          x: el.positie?.x || el.position?.x || i * 2000,
          y: el.positie?.y || el.position?.y || 0,
          z: el.positie?.z || el.position?.z || 3000
        },
        rotatie: {
          x: el.rotatie?.x || el.rotation?.x || 0,
          y: el.rotatie?.y || el.rotation?.y || 0,
          z: el.rotatie?.z || el.rotation?.z || 0
        },
        verdieping: el.verdieping || el.floor || 0
      }
      elementen.push(element)
    }
    
    return {
      success: true,
      elementen,
      metadata: {
        bestandsnaam: filename,
        formaat: 'JSON',
        aantalElementen: elementen.length,
        projectNaam: data.projectNaam || data.projectName || data.name,
        bouwjaar: data.bouwjaar || data.yearBuilt
      },
      errors: []
    }
  } catch (error) {
    return {
      success: false,
      elementen: [],
      metadata: { bestandsnaam: filename, formaat: 'JSON', aantalElementen: 0 },
      errors: [`Ongeldige JSON: ${error}`]
    }
  }
}

// Helper functies

function createElementFromIFC(id: string, type: ElementType, index: number, content: string): CADElement | null {
  // Probeer profiel informatie te vinden nabij dit element
  const profielNaam = findNearbyProfile(content, id) || 'HEA 200'
  const lengte = findNearbyLength(content, id) || 6000
  
  return {
    id: `ifc-${id}-${index}`,
    gebouwId: 'imported',
    type,
    profielId: profielNaam.toLowerCase().replace(' ', '-'),
    profielNaam,
    lengte,
    gewicht: calculateWeight(profielNaam, lengte),
    conditie: 'goed',
    positie: { x: index * 2000, y: 0, z: type === 'kolom' ? 0 : 3000 },
    rotatie: { x: 0, y: 0, z: type === 'kolom' ? 90 : 0 },
    verdieping: 0
  }
}

function createDemoElement(profielNaam: string, index: number): CADElement {
  const lengte = 4000 + Math.random() * 4000
  return {
    id: `parsed-${index}`,
    gebouwId: 'imported',
    type: profielNaam.startsWith('HEB') ? 'kolom' : 'balk',
    profielId: profielNaam.toLowerCase().replace(' ', '-'),
    profielNaam,
    lengte: Math.round(lengte),
    gewicht: calculateWeight(profielNaam, lengte),
    conditie: 'goed',
    positie: { x: (index % 5) * 3000, y: Math.floor(index / 5) * 3000, z: 3000 },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  }
}

function findNearbyProfile(content: string, id: string): string | null {
  // Zoek in de buurt van het element ID naar profiel informatie
  const idIndex = content.indexOf(id)
  if (idIndex === -1) return null
  
  const searchArea = content.substring(Math.max(0, idIndex - 500), idIndex + 500)
  
  for (const [type, regex] of Object.entries(PROFIEL_PATRONEN)) {
    const match = searchArea.match(regex)
    if (match) {
      return `${type} ${match[1]}`
    }
  }
  
  return null
}

function findNearbyLength(content: string, id: string): number | null {
  const idIndex = content.indexOf(id)
  if (idIndex === -1) return null
  
  const searchArea = content.substring(Math.max(0, idIndex - 200), idIndex + 200)
  const match = searchArea.match(/(\d{3,5})(?:\s*(?:mm|MM|\.)?)/g)
  
  if (match) {
    const length = parseInt(match[0])
    if (length >= 500 && length <= 15000) {
      return length
    }
  }
  
  return null
}

function extractIFCProjectName(content: string): string | undefined {
  const match = content.match(/IFCPROJECT\s*\([^,]*,\s*'([^']+)'/i)
  return match ? match[1] : undefined
}

function calculateWeight(profielNaam: string, lengte: number): number {
  const gewichtPerM = PROFIEL_GEWICHTEN[profielNaam] || 50
  return Math.round((gewichtPerM * lengte / 1000) * 10) / 10
}

function mapElementType(type: string): ElementType {
  const lower = type?.toLowerCase() || ''
  if (lower.includes('kolom') || lower.includes('column')) return 'kolom'
  if (lower.includes('ligger') || lower.includes('girder')) return 'ligger'
  if (lower.includes('schoor') || lower.includes('brace')) return 'schoor'
  return 'balk'
}

function mapConditie(conditie: string): Conditie {
  const lower = conditie?.toLowerCase() || ''
  if (lower.includes('slecht') || lower.includes('poor') || lower.includes('bad')) return 'slecht'
  if (lower.includes('matig') || lower.includes('fair') || lower.includes('average')) return 'matig'
  if (lower.includes('onbekend') || lower.includes('unknown')) return 'onbekend'
  return 'goed'
}

/**
 * Exporteer elementen naar JSON
 */
export function exportToJSON(elementen: CADElement[], projectNaam: string): string {
  return JSON.stringify({
    projectNaam,
    exportDatum: new Date().toISOString(),
    aantalElementen: elementen.length,
    elementen: elementen.map(el => ({
      id: el.id,
      type: el.type,
      profielNaam: el.profielNaam,
      lengte: el.lengte,
      gewicht: el.gewicht,
      conditie: el.conditie,
      positie: el.positie,
      rotatie: el.rotatie,
      verdieping: el.verdieping
    }))
  }, null, 2)
}

/**
 * Exporteer naar DXF formaat (basis)
 */
export function exportToDXF(elementen: CADElement[]): string {
  let dxf = `0
SECTION
2
HEADER
0
ENDSEC
0
SECTION
2
ENTITIES
`
  
  elementen.forEach((el) => {
    // Voeg een lijn toe voor elk element
    dxf += `0
LINE
8
${el.profielNaam}
10
${el.positie.x}
20
${el.positie.y}
30
${el.positie.z}
11
${el.positie.x + el.lengte}
21
${el.positie.y}
31
${el.positie.z}
`
  })
  
  dxf += `0
ENDSEC
0
EOF`
  
  return dxf
}
