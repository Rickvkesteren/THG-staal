/**
 * 3D Mockup Data - Staal Hergebruik Systeem
 * Realistische gebouwstructuren voor demonstratie
 */

import type { CADElement, Conditie } from '../types'

export interface MockGebouw {
  id: string
  naam: string
  adres: string
  bouwjaar: number
  type: 'industriehal' | 'kantoor' | 'parkeergarage' | 'loods' | 'sporthal'
  beschrijving: string
  elementen: CADElement[]
  afbeelding?: string
}

// Helper functie voor gewicht berekening
const berekenGewicht = (profiel: string, lengte: number): number => {
  const gewichtPerM: Record<string, number> = {
    'HEA 100': 16.7, 'HEA 140': 24.7, 'HEA 160': 30.4, 'HEA 180': 35.5,
    'HEA 200': 42.3, 'HEA 220': 50.5, 'HEA 240': 60.3, 'HEA 260': 68.2,
    'HEA 280': 76.4, 'HEA 300': 88.3, 'HEA 320': 97.6, 'HEA 340': 105,
    'HEA 360': 112, 'HEA 400': 125, 'HEA 450': 140, 'HEA 500': 155,
    'HEB 100': 20.4, 'HEB 120': 26.7, 'HEB 140': 33.7, 'HEB 160': 42.6,
    'HEB 180': 51.2, 'HEB 200': 61.3, 'HEB 220': 71.5, 'HEB 240': 83.2,
    'HEB 260': 93.0, 'HEB 280': 103, 'HEB 300': 117, 'HEB 320': 127,
    'HEB 340': 134, 'HEB 360': 142, 'HEB 400': 155, 'HEB 450': 171,
    'IPE 100': 8.1, 'IPE 120': 10.4, 'IPE 140': 12.9, 'IPE 160': 15.8,
    'IPE 180': 18.8, 'IPE 200': 22.4, 'IPE 220': 26.2, 'IPE 240': 30.7,
    'IPE 270': 36.1, 'IPE 300': 42.2, 'IPE 330': 49.1, 'IPE 360': 57.1,
    'IPE 400': 66.3, 'IPE 450': 77.6, 'IPE 500': 90.7, 'IPE 550': 106,
    'UNP 100': 10.6, 'UNP 120': 13.4, 'UNP 140': 16.0, 'UNP 160': 18.8,
    'UNP 180': 22.0, 'UNP 200': 25.3, 'UNP 220': 29.4, 'UNP 240': 33.2,
  }
  const gpm = gewichtPerM[profiel] || 50
  return Math.round((gpm * lengte / 1000) * 10) / 10
}

// Helper om conditie te bepalen met random distributie
const randomConditie = (goedKans = 0.6, matigKans = 0.3): Conditie => {
  const r = Math.random()
  if (r < goedKans) return 'goed'
  if (r < goedKans + matigKans) return 'matig'
  return 'slecht'
}

// ============================================================
// GEBOUW 1: Grote Industriehal (30x18m, 8m hoog)
// Een typische stalen industriehal met:
// - Kolommen op een raster
// - Hoofdbalken tussen kolommen
// - Gordingen voor dakbedekking
// - Windverbanden voor stabiliteit
// ============================================================
const industriehalElementen: CADElement[] = []
let idCounter = 1

// Kolommen grid (5 kolommen in X, 3 in Y)
const kolomPosX = [0, 7500, 15000, 22500, 30000]  // 4 velden van 7.5m
const kolomPosY = [0, 9000, 18000]                 // 2 velden van 9m

// 1. KOLOMMEN - verticale HEB 300 profielen
for (const x of kolomPosX) {
  for (const y of kolomPosY) {
    industriehalElementen.push({
      id: `IH-K${idCounter++}`,
      gebouwId: 'industriehal-001',
      type: 'kolom',
      profielId: 'heb-300',
      profielNaam: 'HEB 300',
      lengte: 8000,
      gewicht: berekenGewicht('HEB 300', 8000),
      conditie: randomConditie(0.7, 0.2),
      positie: { x, y, z: 0 },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
  }
}

// 2. HOOFDBALKEN X-RICHTING - verbinden kolommen in X richting
// Positie = startpunt van de balk, lengte loopt in X richting
for (let i = 0; i < kolomPosX.length - 1; i++) {
  for (const y of kolomPosY) {
    const startX = kolomPosX[i]
    const balkLengte = kolomPosX[i + 1] - kolomPosX[i]  // 7500mm
    industriehalElementen.push({
      id: `IH-BX${idCounter++}`,
      gebouwId: 'industriehal-001',
      type: 'balk',
      profielId: 'hea-400',
      profielNaam: 'HEA 400',
      lengte: balkLengte,
      gewicht: berekenGewicht('HEA 400', balkLengte),
      conditie: randomConditie(0.65, 0.25),
      positie: { x: startX + balkLengte / 2, y, z: 8000 },  // Centrum van balk
      rotatie: { x: 0, y: 0, z: 0 },  // 0 = X richting
      verdieping: 0
    })
  }
}

// 3. HOOFDBALKEN Y-RICHTING - verbinden kolommen in Y richting
// Positie = centrum van de balk, rotatie z=90 voor Y richting
for (const x of kolomPosX) {
  for (let i = 0; i < kolomPosY.length - 1; i++) {
    const startY = kolomPosY[i]
    const balkLengte = kolomPosY[i + 1] - kolomPosY[i]  // 9000mm
    industriehalElementen.push({
      id: `IH-BY${idCounter++}`,
      gebouwId: 'industriehal-001',
      type: 'balk',
      profielId: 'hea-360',
      profielNaam: 'HEA 360',
      lengte: balkLengte,
      gewicht: berekenGewicht('HEA 360', balkLengte),
      conditie: randomConditie(0.6, 0.3),
      positie: { x, y: startY + balkLengte / 2, z: 8000 },  // Centrum van balk
      rotatie: { x: 0, y: 0, z: 90 },  // 90 = Y richting
      verdieping: 0
    })
  }
}

// 4. GORDINGEN - liggers voor dakbedekking, lopen in Y richting
// Verdeeld over de X-as tussen de kolommen
for (let i = 0; i < kolomPosX.length - 1; i++) {
  for (let j = 1; j <= 3; j++) {
    const xPos = kolomPosX[i] + ((kolomPosX[i + 1] - kolomPosX[i]) * j / 4)
    industriehalElementen.push({
      id: `IH-G${idCounter++}`,
      gebouwId: 'industriehal-001',
      type: 'ligger',
      profielId: 'ipe-200',
      profielNaam: 'IPE 200',
      lengte: 18000,  // Volle breedte hal
      gewicht: berekenGewicht('IPE 200', 18000),
      conditie: randomConditie(0.5, 0.35),
      positie: { x: xPos, y: 9000, z: 8000 },  // Centrum in Y
      rotatie: { x: 0, y: 0, z: 90 },  // Y richting
      verdieping: 0
    })
  }
}

// 5. WINDVERBANDEN - diagonale stabiliteitsverbanden in de gevels
const windverbandParen = [
  { x1: 0, y1: 0, x2: 7500, y2: 0 },
  { x1: 22500, y1: 0, x2: 30000, y2: 0 },
  { x1: 0, y1: 18000, x2: 7500, y2: 18000 },
  { x1: 22500, y1: 18000, x2: 30000, y2: 18000 },
]

for (const wv of windverbandParen) {
  // Diagonaal 1
  industriehalElementen.push({
    id: `IH-WV${idCounter++}`,
    gebouwId: 'industriehal-001',
    type: 'schoor',
    profielId: 'hea-160',
    profielNaam: 'HEA 160',
    lengte: Math.round(Math.sqrt(7500**2 + 8000**2)),
    gewicht: berekenGewicht('HEA 160', 11000),
    conditie: randomConditie(0.55, 0.3),
    positie: { x: wv.x1, y: wv.y1, z: 0 },
    rotatie: { x: 47, y: 0, z: 0 },
    verdieping: 0
  })
}

// ============================================================
// GEBOUW 2: Kantoorpand (24x15m, 3 verdiepingen à 3.5m)
// ============================================================
const kantoorElementen: CADElement[] = []
idCounter = 1

const kantoorKolomX = [0, 6000, 12000, 18000, 24000]
const kantoorKolomY = [0, 7500, 15000]
const verdiepingHoogte = 3500

// Kolommen voor 3 verdiepingen
for (let v = 0; v < 3; v++) {
  for (const x of kantoorKolomX) {
    for (const y of kantoorKolomY) {
      kantoorElementen.push({
        id: `KP-K${idCounter++}`,
        gebouwId: 'kantoor-001',
        type: 'kolom',
        profielId: 'heb-220',
        profielNaam: 'HEB 220',
        lengte: verdiepingHoogte,
        gewicht: berekenGewicht('HEB 220', verdiepingHoogte),
        conditie: randomConditie(0.75, 0.2),
        positie: { x, y, z: v * verdiepingHoogte },
        rotatie: { x: 0, y: 0, z: 0 },
        verdieping: v
      })
    }
  }
}

// Vloerliggers per verdieping
for (let v = 1; v <= 3; v++) {
  const zPos = v * verdiepingHoogte
  
  // X-richting liggers
  for (let i = 0; i < kantoorKolomX.length - 1; i++) {
    for (const y of kantoorKolomY) {
      const balkLengte = kantoorKolomX[i + 1] - kantoorKolomX[i]
      kantoorElementen.push({
        id: `KP-VX${idCounter++}`,
        gebouwId: 'kantoor-001',
        type: 'balk',
        profielId: 'ipe-330',
        profielNaam: 'IPE 330',
        lengte: balkLengte,
        gewicht: berekenGewicht('IPE 330', balkLengte),
        conditie: randomConditie(0.7, 0.25),
        positie: { x: kantoorKolomX[i] + balkLengte / 2, y, z: zPos },  // Centrum
        rotatie: { x: 0, y: 0, z: 0 },
        verdieping: v
      })
    }
  }
  
  // Y-richting liggers
  for (const x of kantoorKolomX) {
    for (let i = 0; i < kantoorKolomY.length - 1; i++) {
      const balkLengte = kantoorKolomY[i + 1] - kantoorKolomY[i]
      kantoorElementen.push({
        id: `KP-VY${idCounter++}`,
        gebouwId: 'kantoor-001',
        type: 'balk',
        profielId: 'ipe-300',
        profielNaam: 'IPE 300',
        lengte: balkLengte,
        gewicht: berekenGewicht('IPE 300', balkLengte),
        conditie: randomConditie(0.65, 0.3),
        positie: { x, y: kantoorKolomY[i] + balkLengte / 2, z: zPos },  // Centrum
        rotatie: { x: 0, y: 0, z: 90 },
        verdieping: v
      })
    }
  }
  
  // Vloerliggers (secundair)
  for (let i = 0; i < kantoorKolomX.length - 1; i++) {
    for (let j = 1; j <= 2; j++) {
      const xPos = kantoorKolomX[i] + (6000 * j / 3)
      kantoorElementen.push({
        id: `KP-VL${idCounter++}`,
        gebouwId: 'kantoor-001',
        type: 'vloerligger',
        profielId: 'ipe-220',
        profielNaam: 'IPE 220',
        lengte: 15000,
        gewicht: berekenGewicht('IPE 220', 15000),
        conditie: randomConditie(0.6, 0.3),
        positie: { x: xPos, y: 0, z: zPos },
        rotatie: { x: 0, y: 0, z: 90 },
        verdieping: v
      })
    }
  }
}

// ============================================================
// GEBOUW 3: Parkeergarage (40x20m, 2 dekken)
// ============================================================
const parkeerElementen: CADElement[] = []
idCounter = 1

const parkeerKolomX = [0, 8000, 16000, 24000, 32000, 40000]
const parkeerKolomY = [0, 10000, 20000]

// Kolommen (zwaar belast)
for (let v = 0; v < 2; v++) {
  for (const x of parkeerKolomX) {
    for (const y of parkeerKolomY) {
      parkeerElementen.push({
        id: `PG-K${idCounter++}`,
        gebouwId: 'parkeer-001',
        type: 'kolom',
        profielId: 'heb-280',
        profielNaam: 'HEB 280',
        lengte: 3000,
        gewicht: berekenGewicht('HEB 280', 3000),
        conditie: randomConditie(0.4, 0.4), // Meer schade door weer/zout
        positie: { x, y, z: v * 3000 },
        rotatie: { x: 0, y: 0, z: 0 },
        verdieping: v
      })
    }
  }
}

// Dekliggers
for (let v = 1; v <= 2; v++) {
  const zPos = v * 3000
  
  for (let i = 0; i < parkeerKolomX.length - 1; i++) {
    for (const y of parkeerKolomY) {
      parkeerElementen.push({
        id: `PG-DX${idCounter++}`,
        gebouwId: 'parkeer-001',
        type: 'balk',
        profielId: 'hea-450',
        profielNaam: 'HEA 450',
        lengte: 8000,
        gewicht: berekenGewicht('HEA 450', 8000),
        conditie: randomConditie(0.35, 0.45), // Agressieve omgeving
        positie: { x: parkeerKolomX[i], y, z: zPos },
        rotatie: { x: 0, y: 0, z: 0 },
        verdieping: v
      })
    }
  }
  
  for (const x of parkeerKolomX) {
    for (let i = 0; i < parkeerKolomY.length - 1; i++) {
      parkeerElementen.push({
        id: `PG-DY${idCounter++}`,
        gebouwId: 'parkeer-001',
        type: 'balk',
        profielId: 'hea-400',
        profielNaam: 'HEA 400',
        lengte: 10000,
        gewicht: berekenGewicht('HEA 400', 10000),
        conditie: randomConditie(0.3, 0.5),
        positie: { x, y: parkeerKolomY[i], z: zPos },
        rotatie: { x: 0, y: 0, z: 90 },
        verdieping: v
      })
    }
  }
}

// ============================================================
// GEBOUW 4: Opslagloods (50x20m, 6m hoog, portaalframe)
// ============================================================
const loodsElementen: CADElement[] = []
idCounter = 1

const loodsFrameX = [0, 10000, 20000, 30000, 40000, 50000]

// Portaalframe kolommen
for (const x of loodsFrameX) {
  // Linker kolom
  loodsElementen.push({
    id: `LO-KL${idCounter++}`,
    gebouwId: 'loods-001',
    type: 'kolom',
    profielId: 'heb-340',
    profielNaam: 'HEB 340',
    lengte: 6000,
    gewicht: berekenGewicht('HEB 340', 6000),
    conditie: randomConditie(0.5, 0.35),
    positie: { x, y: 0, z: 0 },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  })
  
  // Rechter kolom
  loodsElementen.push({
    id: `LO-KR${idCounter++}`,
    gebouwId: 'loods-001',
    type: 'kolom',
    profielId: 'heb-340',
    profielNaam: 'HEB 340',
    lengte: 6000,
    gewicht: berekenGewicht('HEB 340', 6000),
    conditie: randomConditie(0.5, 0.35),
    positie: { x, y: 20000, z: 0 },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  })
  
  // Spantbeen links (schuin)
  loodsElementen.push({
    id: `LO-SL${idCounter++}`,
    gebouwId: 'loods-001',
    type: 'spant',
    profielId: 'hea-340',
    profielNaam: 'HEA 340',
    lengte: 10500,
    gewicht: berekenGewicht('HEA 340', 10500),
    conditie: randomConditie(0.55, 0.3),
    positie: { x, y: 0, z: 6000 },
    rotatie: { x: 15, y: 0, z: 90 },
    verdieping: 0
  })
  
  // Spantbeen rechts (schuin)
  loodsElementen.push({
    id: `LO-SR${idCounter++}`,
    gebouwId: 'loods-001',
    type: 'spant',
    profielId: 'hea-340',
    profielNaam: 'HEA 340',
    lengte: 10500,
    gewicht: berekenGewicht('HEA 340', 10500),
    conditie: randomConditie(0.55, 0.3),
    positie: { x, y: 10000, z: 8000 },
    rotatie: { x: -15, y: 0, z: 90 },
    verdieping: 0
  })
}

// Gordingen
for (let i = 0; i < loodsFrameX.length - 1; i++) {
  for (let g = 0; g < 8; g++) {
    const yPos = g * 2500 + 1250
    loodsElementen.push({
      id: `LO-G${idCounter++}`,
      gebouwId: 'loods-001',
      type: 'ligger',
      profielId: 'unp-160',
      profielNaam: 'UNP 160',
      lengte: 10000,
      gewicht: berekenGewicht('UNP 160', 10000),
      conditie: randomConditie(0.45, 0.4),
      positie: { x: loodsFrameX[i], y: yPos, z: 6000 + (yPos < 10000 ? yPos * 0.2 : (20000 - yPos) * 0.2) },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
  }
}

// Windverbanden
for (let i = 0; i < 2; i++) {
  const xBase = i === 0 ? 0 : 40000
  loodsElementen.push({
    id: `LO-WV${idCounter++}`,
    gebouwId: 'loods-001',
    type: 'schoor',
    profielId: 'hea-140',
    profielNaam: 'HEA 140',
    lengte: 11700,
    gewicht: berekenGewicht('HEA 140', 11700),
    conditie: randomConditie(0.5, 0.35),
    positie: { x: xBase, y: 0, z: 0 },
    rotatie: { x: 31, y: 0, z: 0 },
    verdieping: 0
  })
}

// ============================================================
// GEBOUW 5: Sporthal (36x24m, 9m vrije hoogte)
// ============================================================
const sporthalElementen: CADElement[] = []
idCounter = 1

const sportKolomX = [0, 12000, 24000, 36000]
const sportKolomY = [0, 12000, 24000]

// Hoofdkolommen (extra zwaar voor grote overspanning)
for (const x of sportKolomX) {
  for (const y of sportKolomY) {
    sporthalElementen.push({
      id: `SH-K${idCounter++}`,
      gebouwId: 'sporthal-001',
      type: 'kolom',
      profielId: 'heb-400',
      profielNaam: 'HEB 400',
      lengte: 9000,
      gewicht: berekenGewicht('HEB 400', 9000),
      conditie: randomConditie(0.7, 0.25),
      positie: { x, y, z: 0 },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
  }
}

// Vakwerkspanten (vereenvoudigd als liggers)
for (let i = 0; i < sportKolomX.length - 1; i++) {
  for (const y of sportKolomY) {
    // Bovenrand vakwerk
    sporthalElementen.push({
      id: `SH-VB${idCounter++}`,
      gebouwId: 'sporthal-001',
      type: 'balk',
      profielId: 'hea-300',
      profielNaam: 'HEA 300',
      lengte: 12000,
      gewicht: berekenGewicht('HEA 300', 12000),
      conditie: randomConditie(0.65, 0.3),
      positie: { x: sportKolomX[i], y, z: 9000 },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
    
    // Onderrand vakwerk
    sporthalElementen.push({
      id: `SH-VO${idCounter++}`,
      gebouwId: 'sporthal-001',
      type: 'balk',
      profielId: 'hea-240',
      profielNaam: 'HEA 240',
      lengte: 12000,
      gewicht: berekenGewicht('HEA 240', 12000),
      conditie: randomConditie(0.6, 0.35),
      positie: { x: sportKolomX[i], y, z: 7500 },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0
    })
  }
}

// Dwarsliggers
for (const x of sportKolomX) {
  for (let i = 0; i < sportKolomY.length - 1; i++) {
    sporthalElementen.push({
      id: `SH-DW${idCounter++}`,
      gebouwId: 'sporthal-001',
      type: 'balk',
      profielId: 'hea-280',
      profielNaam: 'HEA 280',
      lengte: 12000,
      gewicht: berekenGewicht('HEA 280', 12000),
      conditie: randomConditie(0.65, 0.3),
      positie: { x, y: sportKolomY[i], z: 9000 },
      rotatie: { x: 0, y: 0, z: 90 },
      verdieping: 0
    })
  }
}

// Gordingen
for (let i = 0; i < sportKolomX.length - 1; i++) {
  for (let g = 1; g <= 5; g++) {
    const xPos = sportKolomX[i] + (12000 * g / 6)
    sporthalElementen.push({
      id: `SH-G${idCounter++}`,
      gebouwId: 'sporthal-001',
      type: 'ligger',
      profielId: 'ipe-240',
      profielNaam: 'IPE 240',
      lengte: 24000,
      gewicht: berekenGewicht('IPE 240', 24000),
      conditie: randomConditie(0.55, 0.35),
      positie: { x: xPos, y: 0, z: 9000 },
      rotatie: { x: 0, y: 0, z: 90 },
      verdieping: 0
    })
  }
}

// ============================================================
// GEBOUW 6: Klassieke Productiehal met Portaalframes
// Een typische Nederlandse hal: 40x20m, 6m goothoogte
// ============================================================
const productiehalElementen: CADElement[] = []
idCounter = 1

// Hal dimensies
const halLengte = 40000  // 40m
const halBreedte = 20000 // 20m
const gootHoogte = 6000  // 6m
const travee = 5000      // 5m tussen frames
const aantalFrames = halLengte / travee + 1  // 9 frames

// Genereer portaalframes
for (let f = 0; f < aantalFrames; f++) {
  const xPos = f * travee
  
  // Linker kolom
  productiehalElementen.push({
    id: `PH-KL${idCounter++}`,
    gebouwId: 'productiehal-001',
    type: 'kolom',
    profielId: 'heb-260',
    profielNaam: 'HEB 260',
    lengte: gootHoogte,
    gewicht: berekenGewicht('HEB 260', gootHoogte),
    conditie: randomConditie(0.65, 0.25),
    positie: { x: xPos, y: 0, z: 0 },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  })
  
  // Rechter kolom
  productiehalElementen.push({
    id: `PH-KR${idCounter++}`,
    gebouwId: 'productiehal-001',
    type: 'kolom',
    profielId: 'heb-260',
    profielNaam: 'HEB 260',
    lengte: gootHoogte,
    gewicht: berekenGewicht('HEB 260', gootHoogte),
    conditie: randomConditie(0.65, 0.25),
    positie: { x: xPos, y: halBreedte, z: 0 },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  })
  
  // Hoofdbalk (spoor) - horizontaal over de breedte
  productiehalElementen.push({
    id: `PH-HB${idCounter++}`,
    gebouwId: 'productiehal-001',
    type: 'balk',
    profielId: 'hea-400',
    profielNaam: 'HEA 400',
    lengte: halBreedte,
    gewicht: berekenGewicht('HEA 400', halBreedte),
    conditie: randomConditie(0.6, 0.3),
    positie: { x: xPos, y: halBreedte / 2, z: gootHoogte },
    rotatie: { x: 0, y: 0, z: 90 },
    verdieping: 0
  })
}

// Koppelbalken tussen de frames (liggen in X-richting)
for (let f = 0; f < aantalFrames - 1; f++) {
  const xStart = f * travee
  const xMid = xStart + travee / 2
  
  // Nokgording (boven, midden)
  productiehalElementen.push({
    id: `PH-NK${idCounter++}`,
    gebouwId: 'productiehal-001',
    type: 'ligger',
    profielId: 'ipe-180',
    profielNaam: 'IPE 180',
    lengte: travee,
    gewicht: berekenGewicht('IPE 180', travee),
    conditie: randomConditie(0.55, 0.35),
    positie: { x: xMid, y: halBreedte / 2, z: gootHoogte },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  })
  
  // Gordingen links
  productiehalElementen.push({
    id: `PH-GL${idCounter++}`,
    gebouwId: 'productiehal-001',
    type: 'ligger',
    profielId: 'ipe-160',
    profielNaam: 'IPE 160',
    lengte: travee,
    gewicht: berekenGewicht('IPE 160', travee),
    conditie: randomConditie(0.5, 0.35),
    positie: { x: xMid, y: halBreedte * 0.25, z: gootHoogte },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  })
  
  // Gordingen rechts
  productiehalElementen.push({
    id: `PH-GR${idCounter++}`,
    gebouwId: 'productiehal-001',
    type: 'ligger',
    profielId: 'ipe-160',
    profielNaam: 'IPE 160',
    lengte: travee,
    gewicht: berekenGewicht('IPE 160', travee),
    conditie: randomConditie(0.5, 0.35),
    positie: { x: xMid, y: halBreedte * 0.75, z: gootHoogte },
    rotatie: { x: 0, y: 0, z: 0 },
    verdieping: 0
  })
}

// Windverbanden in de kopgevels
// Voorste gevel
productiehalElementen.push({
  id: `PH-WV${idCounter++}`,
  gebouwId: 'productiehal-001',
  type: 'schoor',
  profielId: 'hea-140',
  profielNaam: 'HEA 140',
  lengte: Math.sqrt(travee**2 + gootHoogte**2),
  gewicht: berekenGewicht('HEA 140', 7800),
  conditie: randomConditie(0.6, 0.3),
  positie: { x: travee / 2, y: 0, z: gootHoogte / 2 },
  rotatie: { x: 0, y: 0, z: 0 },
  verdieping: 0
})

// Achterste gevel
productiehalElementen.push({
  id: `PH-WV${idCounter++}`,
  gebouwId: 'productiehal-001',
  type: 'schoor',
  profielId: 'hea-140',
  profielNaam: 'HEA 140',
  lengte: Math.sqrt(travee**2 + gootHoogte**2),
  gewicht: berekenGewicht('HEA 140', 7800),
  conditie: randomConditie(0.6, 0.3),
  positie: { x: halLengte - travee / 2, y: 0, z: gootHoogte / 2 },
  rotatie: { x: 0, y: 0, z: 0 },
  verdieping: 0
})

// ============================================================
// EXPORT: Alle mock gebouwen
// ============================================================
export const MOCK_GEBOUWEN: MockGebouw[] = [
  {
    id: 'productiehal-001',
    naam: 'Productiehal Schiedam',
    adres: 'Nijverheidsweg 42, Schiedam',
    bouwjaar: 1985,
    type: 'industriehal',
    beschrijving: 'Klassieke portaalframe hal met 8 traveeën. Gebruikt voor lichte industrie. Duidelijke constructie, ideaal voor hergebruik.',
    elementen: productiehalElementen
  },
  {
    id: 'industriehal-001',
    naam: 'Industriehal Amstelveense Poort',
    adres: 'Industrieweg 145, Amstelveen',
    bouwjaar: 1978,
    type: 'industriehal',
    beschrijving: 'Grote productiehal met portaalframe constructie. Voorheen gebruikt als metaalbewerking. Goede staat ondanks leeftijd.',
    elementen: industriehalElementen
  },
  {
    id: 'kantoor-001',
    naam: 'Kantoorpand De Beurs',
    adres: 'Stationsplein 23, Rotterdam',
    bouwjaar: 1992,
    type: 'kantoor',
    beschrijving: 'Modern kantoorgebouw met 3 verdiepingen. Staalskelet met betonnen vloeren. Recent gerenoveerd.',
    elementen: kantoorElementen
  },
  {
    id: 'parkeer-001',
    naam: 'Parkeergarage Centrum',
    adres: 'Marktstraat 5, Utrecht',
    bouwjaar: 1985,
    type: 'parkeergarage',
    beschrijving: 'Overdekte parkeergarage met 2 dekken. Enige roestschade door zout en vocht. Extra inspectie aanbevolen.',
    elementen: parkeerElementen
  },
  {
    id: 'loods-001',
    naam: 'Opslagloods Haven West',
    adres: 'Havenkade 78, Rotterdam',
    bouwjaar: 1972,
    type: 'loods',
    beschrijving: 'Grote opslagloods met portaalframe en zadeldak. Gebruikte gordingen tonen slijtage. Spanten in goede staat.',
    elementen: loodsElementen
  },
  {
    id: 'sporthal-001',
    naam: 'Sporthal De Boogerd',
    adres: 'Sportlaan 12, Haarlem',
    bouwjaar: 1988,
    type: 'sporthal',
    beschrijving: 'Multifunctionele sporthal met grote overspanning. Vakwerkspanten voor vrije speelruimte. Goed onderhouden.',
    elementen: sporthalElementen
  }
]

// Helper om totaal gewicht te berekenen
export const berekenTotaalGewicht = (elementen: CADElement[]): number => {
  return Math.round(elementen.reduce((sum, el) => sum + el.gewicht, 0))
}

// Helper voor statistieken
export const getGebouwStatistieken = (gebouw: MockGebouw) => {
  const elementen = gebouw.elementen
  const conditieTelling = {
    goed: elementen.filter(e => e.conditie === 'goed').length,
    matig: elementen.filter(e => e.conditie === 'matig').length,
    slecht: elementen.filter(e => e.conditie === 'slecht').length,
  }
  
  const typeTelling = elementen.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const profielTelling = elementen.reduce((acc, el) => {
    acc[el.profielNaam] = (acc[el.profielNaam] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    totaalElementen: elementen.length,
    totaalGewicht: berekenTotaalGewicht(elementen),
    conditie: conditieTelling,
    types: typeTelling,
    profielen: profielTelling,
    herbruikbaarheid: Math.round((conditieTelling.goed + conditieTelling.matig * 0.7) / elementen.length * 100)
  }
}

export default MOCK_GEBOUWEN
