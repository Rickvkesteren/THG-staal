import { useState, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Text
} from '@react-three/drei'
import { 
  Wrench, 
  Sparkles, 
  CheckCircle2, 
  Layers,
  Ruler,
  RotateCcw,
  Play,
  Pause,
  Eye,
  EyeOff,
  Scissors,
  Flame,
  SprayCan,
  Drill,
  ScanLine,
  FlaskConical,
  Zap,
  Clock,
  ChevronRight,
  Activity
} from 'lucide-react'
import * as THREE from 'three'

// ============================================================
// TYPES - Treatment/Feature Workflow (uit EMR PDF)
// ============================================================

// Treatment Feature Types (uit PDF)
type FeatureType = 
  | 'probe'           // Scannen van de balk
  | 'initial_defab'   // Snijden/slijpen met robot
  | 'sampling'        // Testen voor certificering
  | 'grinding'        // Frezen/slijpen om cuts glad te maken
  | 'shot_blasting'   // Stralen van de balk

interface TreatmentFeature {
  id: string
  type: FeatureType
  naam: string
  beschrijving: string
  positie?: {
    start: number  // mm vanaf begin balk
    eind: number   // mm
    zijde?: 'boven' | 'onder' | 'links' | 'rechts' | 'flens_boven' | 'flens_onder' | 'volledig'
  }
  status: 'wachten' | 'bezig' | 'voltooid' | 'mislukt'
  tijdSeconden: number  // uit PDF: tijden in seconden
  parameters?: Record<string, number | string>
  resultaat?: {
    meetwaarden?: Record<string, number>
    goedgekeurd?: boolean
    opmerking?: string
  }
}

// TreatmentWorkflow - voor toekomstig gebruik om hele workflows te tracken
export interface TreatmentWorkflow {
  id: string
  balkId: string
  features: TreatmentFeature[]
  startTijd?: Date
  eindTijd?: Date
  totaalTijdSeconden: number
  status: 'gepland' | 'bezig' | 'voltooid' | 'gepauzeerd'
}

// Bestaande types (zones voor visualisatie)
interface BewerkingsZone {
  id: string
  type: 'corrosie' | 'lasnaad' | 'boutgat' | 'aangroei' | 'coating' | 'deuk'
  startPositie: number
  eindPositie: number
  diepte: number
  zijde: 'boven' | 'onder' | 'links' | 'rechts' | 'flens_boven' | 'flens_onder'
  ernst: 'licht' | 'matig' | 'zwaar'
  bewerking: 'stralen' | 'slijpen' | 'frezen' | 'lassen' | 'snijden' | 'boren'
  status: 'gepland' | 'bezig' | 'klaar'
  tijdMinuten: number
}

interface ProfielAfmetingen {
  hoogte: number // mm
  breedte: number // mm
  flensDikte: number // mm
  lijfDikte: number // mm
}

interface ProductieBalk {
  id: string
  profielNaam: string
  afmetingen: ProfielAfmetingen
  lengte: number // mm
  gewicht: number // kg
  origineel: {
    gebouw: string
    positie: string
    conditie: 'goed' | 'matig' | 'slecht'
  }
  zones: BewerkingsZone[]
  snijLengte?: { start: number; eind: number }
  // Treatment workflow (nieuw)
  workflow: TreatmentFeature[]
}

// ============================================================
// FEATURE CONFIGURATIE (uit PDF)
// ============================================================

const FEATURE_CONFIG: Record<FeatureType, {
  naam: string
  beschrijving: string
  kleur: string
  icon: typeof ScanLine
  defaultTijdSec: number
}> = {
  probe: {
    naam: 'Probe / Scannen',
    beschrijving: 'Scannen van de balk voor geometrie en defecten',
    kleur: '#3b82f6',
    icon: ScanLine,
    defaultTijdSec: 45
  },
  initial_defab: {
    naam: 'Initial Defab',
    beschrijving: 'Snijden en slijpen met robot om materiaal te verwijderen',
    kleur: '#ef4444',
    icon: Scissors,
    defaultTijdSec: 120
  },
  sampling: {
    naam: 'Sampling / Testen',
    beschrijving: 'Materiaal testen voor NTA 8713 certificering',
    kleur: '#8b5cf6',
    icon: FlaskConical,
    defaultTijdSec: 60
  },
  grinding: {
    naam: 'Grinding / Slijpen',
    beschrijving: 'Frezen of slijpen om cuts glad te maken',
    kleur: '#f59e0b',
    icon: Sparkles,
    defaultTijdSec: 90
  },
  shot_blasting: {
    naam: 'Shot Blasting',
    beschrijving: 'Stralen van de balk voor oppervlaktebehandeling',
    kleur: '#22c55e',
    icon: Zap,
    defaultTijdSec: 180
  }
}

// ============================================================
// MOCK DATA
// ============================================================

const MOCK_PRODUCTIE_BALKEN: ProductieBalk[] = [
  {
    id: 'PROD-001',
    profielNaam: 'HEA 300',
    afmetingen: { hoogte: 290, breedte: 300, flensDikte: 14, lijfDikte: 8.5 },
    lengte: 6000,
    gewicht: 530,
    origineel: {
      gebouw: 'Industriehal Westpoort',
      positie: 'Kolom A3',
      conditie: 'matig'
    },
    zones: [
      { id: 'z1', type: 'corrosie', startPositie: 0, eindPositie: 400, diepte: 2, zijde: 'flens_onder', ernst: 'zwaar', bewerking: 'stralen', status: 'klaar', tijdMinuten: 15 },
      { id: 'z2', type: 'lasnaad', startPositie: 1200, eindPositie: 1250, diepte: 5, zijde: 'links', ernst: 'matig', bewerking: 'slijpen', status: 'klaar', tijdMinuten: 8 },
      { id: 'z3', type: 'boutgat', startPositie: 2000, eindPositie: 2030, diepte: 14, zijde: 'flens_boven', ernst: 'licht', bewerking: 'lassen', status: 'bezig', tijdMinuten: 12 },
      { id: 'z4', type: 'boutgat', startPositie: 2100, eindPositie: 2130, diepte: 14, zijde: 'flens_boven', ernst: 'licht', bewerking: 'lassen', status: 'gepland', tijdMinuten: 12 },
      { id: 'z5', type: 'aangroei', startPositie: 3500, eindPositie: 3800, diepte: 8, zijde: 'onder', ernst: 'matig', bewerking: 'frezen', status: 'gepland', tijdMinuten: 20 },
      { id: 'z6', type: 'coating', startPositie: 4500, eindPositie: 5200, diepte: 1, zijde: 'boven', ernst: 'licht', bewerking: 'stralen', status: 'gepland', tijdMinuten: 10 },
      { id: 'z7', type: 'corrosie', startPositie: 5700, eindPositie: 6000, diepte: 3, zijde: 'flens_onder', ernst: 'zwaar', bewerking: 'snijden', status: 'gepland', tijdMinuten: 5 },
    ],
    snijLengte: { start: 350, eind: 5750 },
    workflow: [
      {
        id: 'f1-probe',
        type: 'probe',
        naam: 'Initiële Scan',
        beschrijving: 'Volledige geometrie scan en defect detectie',
        positie: { start: 0, eind: 6000, zijde: 'volledig' },
        status: 'voltooid',
        tijdSeconden: 48,
        resultaat: {
          meetwaarden: { lengte: 6003, hoogte: 291, breedte: 300 },
          goedgekeurd: true,
          opmerking: 'Lichte afwijking lengte (+3mm)'
        }
      },
      {
        id: 'f2-defab',
        type: 'initial_defab',
        naam: 'Kop Snijden Start',
        beschrijving: 'Verwijder beschadigde kop (0-350mm)',
        positie: { start: 0, eind: 350, zijde: 'volledig' },
        status: 'voltooid',
        tijdSeconden: 95,
        parameters: { snijDiepte: 290, snijType: 'plasma' }
      },
      {
        id: 'f3-defab',
        type: 'initial_defab',
        naam: 'Kop Snijden Eind',
        beschrijving: 'Verwijder beschadigde kop (5750-6000mm)',
        positie: { start: 5750, eind: 6000, zijde: 'volledig' },
        status: 'bezig',
        tijdSeconden: 85,
        parameters: { snijDiepte: 290, snijType: 'plasma' }
      },
      {
        id: 'f4-sampling',
        type: 'sampling',
        naam: 'Materiaal Test',
        beschrijving: 'NTA 8713 sampling op 3 locaties',
        positie: { start: 1000, eind: 5000 },
        status: 'wachten',
        tijdSeconden: 65,
        parameters: { aantalSamples: 3, testType: 'hardheid' }
      },
      {
        id: 'f5-grinding',
        type: 'grinding',
        naam: 'Snijvlak Afwerking',
        beschrijving: 'Gladmaken van snijvlakken',
        positie: { start: 350, eind: 400, zijde: 'volledig' },
        status: 'wachten',
        tijdSeconden: 45
      },
      {
        id: 'f6-grinding',
        type: 'grinding',
        naam: 'Lasnaad Verwijdering',
        beschrijving: 'Slijpen oude lasnaad op zijkant',
        positie: { start: 1200, eind: 1250, zijde: 'links' },
        status: 'wachten',
        tijdSeconden: 35
      },
      {
        id: 'f7-blasting',
        type: 'shot_blasting',
        naam: 'Volledig Stralen',
        beschrijving: 'Shot blasting volledige balk SA 2.5',
        positie: { start: 350, eind: 5750, zijde: 'volledig' },
        status: 'wachten',
        tijdSeconden: 210,
        parameters: { graad: 'SA 2.5', straalmiddel: 'staal grit' }
      }
    ]
  },
  {
    id: 'PROD-002',
    profielNaam: 'IPE 360',
    afmetingen: { hoogte: 360, breedte: 170, flensDikte: 12.7, lijfDikte: 8 },
    lengte: 8000,
    gewicht: 570,
    origineel: {
      gebouw: 'Kantoorpand Centrum',
      positie: 'Ligger V2-3',
      conditie: 'goed'
    },
    zones: [
      { id: 'z1', type: 'boutgat', startPositie: 150, eindPositie: 180, diepte: 12.7, zijde: 'flens_boven', ernst: 'licht', bewerking: 'lassen', status: 'klaar', tijdMinuten: 10 },
      { id: 'z2', type: 'boutgat', startPositie: 150, eindPositie: 180, diepte: 12.7, zijde: 'flens_onder', ernst: 'licht', bewerking: 'lassen', status: 'klaar', tijdMinuten: 10 },
      { id: 'z3', type: 'lasnaad', startPositie: 4000, eindPositie: 4100, diepte: 6, zijde: 'links', ernst: 'matig', bewerking: 'slijpen', status: 'bezig', tijdMinuten: 15 },
      { id: 'z4', type: 'deuk', startPositie: 6000, eindPositie: 6200, diepte: 4, zijde: 'rechts', ernst: 'licht', bewerking: 'frezen', status: 'gepland', tijdMinuten: 25 },
    ],
    workflow: [
      { id: 'f1', type: 'probe', naam: 'Geometrie Scan', beschrijving: 'Volledige scan', status: 'voltooid', tijdSeconden: 52 },
      { id: 'f2', type: 'initial_defab', naam: 'Boutgat Vullen', beschrijving: 'Lassen boutgaten dicht', positie: { start: 150, eind: 180 }, status: 'voltooid', tijdSeconden: 75 },
      { id: 'f3', type: 'grinding', naam: 'Las Afwerking', beschrijving: 'Gladmaken gelaste gaten', positie: { start: 150, eind: 180 }, status: 'bezig', tijdSeconden: 40 },
      { id: 'f4', type: 'shot_blasting', naam: 'Stralen', beschrijving: 'Volledige balk stralen', status: 'wachten', tijdSeconden: 240 }
    ]
  },
  {
    id: 'PROD-003',
    profielNaam: 'HEB 200',
    afmetingen: { hoogte: 200, breedte: 200, flensDikte: 15, lijfDikte: 9 },
    lengte: 4500,
    gewicht: 280,
    origineel: {
      gebouw: 'Sporthal De Boog',
      positie: 'Schoor D1',
      conditie: 'slecht'
    },
    zones: [
      { id: 'z1', type: 'corrosie', startPositie: 0, eindPositie: 600, diepte: 4, zijde: 'flens_onder', ernst: 'zwaar', bewerking: 'stralen', status: 'klaar', tijdMinuten: 20 },
      { id: 'z2', type: 'corrosie', startPositie: 0, eindPositie: 600, diepte: 3, zijde: 'onder', ernst: 'zwaar', bewerking: 'stralen', status: 'klaar', tijdMinuten: 18 },
      { id: 'z3', type: 'aangroei', startPositie: 1000, eindPositie: 1500, diepte: 10, zijde: 'boven', ernst: 'matig', bewerking: 'frezen', status: 'bezig', tijdMinuten: 30 },
      { id: 'z4', type: 'boutgat', startPositie: 2200, eindPositie: 2240, diepte: 15, zijde: 'flens_boven', ernst: 'licht', bewerking: 'lassen', status: 'gepland', tijdMinuten: 12 },
      { id: 'z5', type: 'boutgat', startPositie: 2200, eindPositie: 2240, diepte: 15, zijde: 'flens_onder', ernst: 'licht', bewerking: 'lassen', status: 'gepland', tijdMinuten: 12 },
      { id: 'z6', type: 'lasnaad', startPositie: 3000, eindPositie: 3100, diepte: 8, zijde: 'links', ernst: 'zwaar', bewerking: 'slijpen', status: 'gepland', tijdMinuten: 20 },
      { id: 'z7', type: 'coating', startPositie: 3800, eindPositie: 4500, diepte: 2, zijde: 'boven', ernst: 'matig', bewerking: 'stralen', status: 'gepland', tijdMinuten: 12 },
    ],
    snijLengte: { start: 550, eind: 4000 },
    workflow: [
      { id: 'f1', type: 'probe', naam: 'Initiële Scan', beschrijving: 'Scan met corrosie detectie', status: 'voltooid', tijdSeconden: 55 },
      { id: 'f2', type: 'initial_defab', naam: 'Kop Afsnijden', beschrijving: 'Verwijder beschadigde koppen', positie: { start: 0, eind: 550 }, status: 'voltooid', tijdSeconden: 110 },
      { id: 'f3', type: 'sampling', naam: 'Materiaal Test', beschrijving: 'Extra testen ivm slechte conditie', status: 'voltooid', tijdSeconden: 85, resultaat: { goedgekeurd: true } },
      { id: 'f4', type: 'initial_defab', naam: 'Eind Afsnijden', beschrijving: 'Verwijder eind sectie', positie: { start: 4000, eind: 4500 }, status: 'bezig', tijdSeconden: 95 },
      { id: 'f5', type: 'grinding', naam: 'Corrosie Verwijderen', beschrijving: 'Diep slijpen corrosie zones', positie: { start: 550, eind: 1200 }, status: 'wachten', tijdSeconden: 120 },
      { id: 'f6', type: 'grinding', naam: 'Snijvlak Afwerking', beschrijving: 'Gladmaken beide snijvlakken', status: 'wachten', tijdSeconden: 60 },
      { id: 'f7', type: 'shot_blasting', naam: 'Volledig Stralen', beschrijving: 'Shot blasting SA 2.5', status: 'wachten', tijdSeconden: 165 }
    ]
  }
]

// Kleuren
const ZONE_KLEUREN: Record<BewerkingsZone['type'], string> = {
  corrosie: '#ef4444',
  lasnaad: '#f59e0b',
  boutgat: '#3b82f6',
  aangroei: '#84cc16',
  coating: '#8b5cf6',
  deuk: '#ec4899'
}

const STATUS_KLEUREN: Record<BewerkingsZone['status'], string> = {
  gepland: '#6b7280',
  bezig: '#f59e0b',
  klaar: '#22c55e'
}

const BEWERKING_ICONS: Record<BewerkingsZone['bewerking'], any> = {
  stralen: SprayCan,
  slijpen: Sparkles,
  frezen: Drill,
  lassen: Flame,
  snijden: Scissors,
  boren: Drill
}

// I-profiel geometry component
function IProfielGeometry({ 
  afmetingen, 
  lengte 
}: { 
  afmetingen: ProfielAfmetingen
  lengte: number 
}) {
  const { hoogte, breedte, flensDikte, lijfDikte } = afmetingen
  const scale = 0.001 // mm to meters
  
  const h = hoogte * scale
  const b = breedte * scale
  const tf = flensDikte * scale
  const tw = lijfDikte * scale
  const l = lengte * scale

  return (
    <group>
      {/* Bovenflens */}
      <mesh position={[l/2, h/2 - tf/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, tf, b]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Onderflens */}
      <mesh position={[l/2, -h/2 + tf/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, tf, b]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Lijf */}
      <mesh position={[l/2, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[l, h - 2*tf, tw]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.3} />
      </mesh>
    </group>
  )
}

// Zone visualization
function ZoneVisualisatie({ 
  zone, 
  afmetingen,
  selected,
  showLabels,
  onClick
}: { 
  zone: BewerkingsZone
  afmetingen: ProfielAfmetingen
  selected: boolean
  showLabels: boolean
  onClick: () => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  const scale = 0.001
  const { hoogte, breedte, flensDikte } = afmetingen
  
  // Bereken positie op basis van zijde
  let posY = 0
  let posZ = 0
  let sizeY = 0.02
  let sizeZ = breedte * scale
  
  switch (zone.zijde) {
    case 'flens_boven':
      posY = hoogte * scale / 2 + 0.01
      sizeZ = breedte * scale
      break
    case 'flens_onder':
      posY = -hoogte * scale / 2 - 0.01
      sizeZ = breedte * scale
      break
    case 'boven':
      posY = hoogte * scale / 2 - flensDikte * scale
      sizeZ = 0.02
      break
    case 'onder':
      posY = -hoogte * scale / 2 + flensDikte * scale
      sizeZ = 0.02
      break
    case 'links':
      posZ = -breedte * scale / 2 - 0.01
      sizeZ = 0.02
      break
    case 'rechts':
      posZ = breedte * scale / 2 + 0.01
      sizeZ = 0.02
      break
  }
  
  const zoneLength = (zone.eindPositie - zone.startPositie) * scale
  const zonePosX = (zone.startPositie + zone.eindPositie) / 2 * scale
  
  // Animatie voor 'bezig' status
  useFrame((state) => {
    if (ref.current && zone.status === 'bezig') {
      const material = ref.current.material as THREE.MeshStandardMaterial
      if (material.opacity !== undefined) {
        material.opacity = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.3
      }
    }
  })

  return (
    <group>
      <mesh
        ref={ref}
        position={[zonePosX, posY, posZ]}
        onClick={(e) => { e.stopPropagation(); onClick() }}
      >
        <boxGeometry args={[zoneLength, sizeY, sizeZ]} />
        <meshStandardMaterial 
          color={selected ? '#ffffff' : ZONE_KLEUREN[zone.type]} 
          transparent 
          opacity={zone.status === 'klaar' ? 0.3 : 0.7}
          emissive={selected ? ZONE_KLEUREN[zone.type] : '#000000'}
          emissiveIntensity={selected ? 0.5 : 0}
        />
      </mesh>
      
      {/* Label */}
      {showLabels && (
        <Text
          position={[zonePosX, posY + 0.08, posZ]}
          fontSize={0.04}
          color="#ffffff"
          anchorX="center"
          anchorY="bottom"
        >
          {zone.type}
        </Text>
      )}
      
      {/* Status indicator */}
      <mesh position={[zonePosX, posY + 0.04, posZ]}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial 
          color={STATUS_KLEUREN[zone.status]} 
          emissive={STATUS_KLEUREN[zone.status]}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  )
}

// Snijlijnen visualisatie
function SnijLijnen({ 
  snijLengte, 
  afmetingen, 
  lengte,
  show
}: { 
  snijLengte: { start: number; eind: number } | undefined
  afmetingen: ProfielAfmetingen
  lengte: number
  show: boolean
}) {
  if (!snijLengte || !show) return null
  
  const scale = 0.001
  const h = afmetingen.hoogte * scale
  const b = afmetingen.breedte * scale
  
  return (
    <group>
      {/* Start snijlijn */}
      <mesh position={[snijLengte.start * scale, 0, 0]}>
        <planeGeometry args={[0.005, h + 0.1]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[snijLengte.start * scale, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
        <planeGeometry args={[0.005, b + 0.1]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Eind snijlijn */}
      <mesh position={[snijLengte.eind * scale, 0, 0]}>
        <planeGeometry args={[0.005, h + 0.1]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[snijLengte.eind * scale, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
        <planeGeometry args={[0.005, b + 0.1]} />
        <meshBasicMaterial color="#ef4444" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Afsnij zones (semi-transparant rood) */}
      <mesh position={[snijLengte.start * scale / 2, 0, 0]}>
        <boxGeometry args={[snijLengte.start * scale, h, b]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.2} />
      </mesh>
      <mesh position={[(snijLengte.eind + (lengte - snijLengte.eind) / 2) * scale, 0, 0]}>
        <boxGeometry args={[(lengte - snijLengte.eind) * scale, h, b]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.2} />
      </mesh>
    </group>
  )
}

// Meetlijnen
function MeetLijnen({ lengte, afmetingen }: { lengte: number; afmetingen: ProfielAfmetingen }) {
  const scale = 0.001
  const l = lengte * scale
  const h = afmetingen.hoogte * scale
  
  return (
    <group>
      {/* Lengte lijn */}
      <mesh position={[l/2, -h/2 - 0.1, 0]}>
        <boxGeometry args={[l, 0.002, 0.002]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      
      {/* Begin marker */}
      <mesh position={[0, -h/2 - 0.1, 0]}>
        <boxGeometry args={[0.002, 0.04, 0.002]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      
      {/* Eind marker */}
      <mesh position={[l, -h/2 - 0.1, 0]}>
        <boxGeometry args={[0.002, 0.04, 0.002]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      
      {/* Meter markers */}
      {Array.from({ length: Math.floor(lengte / 1000) + 1 }, (_, i) => (
        <group key={i}>
          <mesh position={[i, -h/2 - 0.1, 0]}>
            <boxGeometry args={[0.002, 0.02, 0.002]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
          <Text
            position={[i, -h/2 - 0.15, 0]}
            fontSize={0.03}
            color="#3b82f6"
            anchorX="center"
          >
            {i}m
          </Text>
        </group>
      ))}
    </group>
  )
}

// Scene component
function Scene({ 
  balk, 
  selectedZone,
  onSelectZone,
  showLabels,
  showSnijLijnen,
  showMeetLijnen
}: { 
  balk: ProductieBalk
  selectedZone: string | null
  onSelectZone: (id: string | null) => void
  showLabels: boolean
  showSnijLijnen: boolean
  showMeetLijnen: boolean
}) {
  const l = balk.lengte * 0.001

  return (
    <>
      <PerspectiveCamera makeDefault position={[l/2, 0.5, 2]} fov={50} />
      <OrbitControls 
        target={[l/2, 0, 0]} 
        enablePan 
        enableZoom 
        enableRotate 
        maxPolarAngle={Math.PI}
      />
      
      <Environment preset="warehouse" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      
      {/* Grid */}
      <gridHelper args={[20, 40, '#334155', '#1e293b']} rotation={[0, 0, 0]} position={[l/2, -balk.afmetingen.hoogte * 0.001 / 2 - 0.2, 0]} />
      
      {/* I-profiel */}
      <IProfielGeometry afmetingen={balk.afmetingen} lengte={balk.lengte} />
      
      {/* Zones */}
      {balk.zones.map((zone) => (
        <ZoneVisualisatie
          key={zone.id}
          zone={zone}
          afmetingen={balk.afmetingen}
          selected={selectedZone === zone.id}
          showLabels={showLabels}
          onClick={() => onSelectZone(selectedZone === zone.id ? null : zone.id)}
        />
      ))}
      
      {/* Snijlijnen */}
      <SnijLijnen 
        snijLengte={balk.snijLengte} 
        afmetingen={balk.afmetingen} 
        lengte={balk.lengte}
        show={showSnijLijnen}
      />
      
      {/* Meetlijnen */}
      {showMeetLijnen && <MeetLijnen lengte={balk.lengte} afmetingen={balk.afmetingen} />}
    </>
  )
}

// Zone detail panel
function ZoneDetailPanel({ zone, onClose }: { zone: BewerkingsZone; onClose: () => void }) {
  const Icon = BEWERKING_ICONS[zone.bewerking]
  
  return (
    <div className="absolute right-4 top-4 w-72 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white">Zone Details</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Type */}
        <div 
          className="px-4 py-3 rounded-lg text-center font-medium capitalize"
          style={{ backgroundColor: ZONE_KLEUREN[zone.type] + '30', color: ZONE_KLEUREN[zone.type] }}
        >
          {zone.type}
        </div>
        
        {/* Positie */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-700 rounded-lg p-2">
            <p className="text-xs text-gray-400">Start</p>
            <p className="font-mono text-white">{zone.startPositie} mm</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-2">
            <p className="text-xs text-gray-400">Eind</p>
            <p className="font-mono text-white">{zone.eindPositie} mm</p>
          </div>
        </div>
        
        {/* Info */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Zijde</span>
            <span className="text-white capitalize">{zone.zijde.replace('_', ' ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Diepte</span>
            <span className="text-white">{zone.diepte} mm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Ernst</span>
            <span className={`capitalize ${
              zone.ernst === 'zwaar' ? 'text-red-400' : 
              zone.ernst === 'matig' ? 'text-yellow-400' : 'text-green-400'
            }`}>{zone.ernst}</span>
          </div>
        </div>
        
        {/* Bewerking */}
        <div className="bg-blue-900/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-white capitalize">{zone.bewerking}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Geschatte tijd</span>
            <span className="text-blue-300">{zone.tijdMinuten} min</span>
          </div>
        </div>
        
        {/* Status */}
        <div 
          className="flex items-center justify-center gap-2 py-2 rounded-lg"
          style={{ backgroundColor: STATUS_KLEUREN[zone.status] + '30' }}
        >
          {zone.status === 'klaar' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
          {zone.status === 'bezig' && <Play className="w-4 h-4 text-yellow-400" />}
          {zone.status === 'gepland' && <Pause className="w-4 h-4 text-gray-400" />}
          <span className="font-medium capitalize" style={{ color: STATUS_KLEUREN[zone.status] }}>
            {zone.status}
          </span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// TREATMENT WORKFLOW PANEL (Features uit PDF)
// ============================================================

function TreatmentWorkflowPanel({ 
  workflow, 
  selectedFeature,
  onSelectFeature 
}: { 
  workflow: TreatmentFeature[]
  selectedFeature: string | null
  onSelectFeature: (id: string | null) => void
}) {
  // Bereken statistieken
  const totaalTijd = workflow.reduce((sum, f) => sum + f.tijdSeconden, 0)
  const voltooide = workflow.filter(f => f.status === 'voltooid')
  const voltooiTijd = voltooide.reduce((sum, f) => sum + f.tijdSeconden, 0)
  const voortgang = Math.round((voltooiTijd / totaalTijd) * 100)
  
  const huidigeStap = workflow.find(f => f.status === 'bezig')
  const volgendeStap = workflow.find(f => f.status === 'wachten')

  const formatTijd = (seconden: number) => {
    if (seconden < 60) return `${seconden}s`
    return `${Math.floor(seconden / 60)}m ${seconden % 60}s`
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            <h4 className="font-semibold text-white">Treatment Workflow</h4>
          </div>
          <span className="text-sm text-gray-400">{workflow.length} features</span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${voortgang}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>{voltooide.length}/{workflow.length} voltooid</span>
          <span>{formatTijd(voltooiTijd)} / {formatTijd(totaalTijd)}</span>
        </div>
      </div>

      {/* Huidige stap highlight */}
      {huidigeStap && (
        <div className="p-3 bg-amber-900/30 border-b border-amber-700/50">
          <div className="flex items-center gap-2 text-amber-300 text-sm mb-1">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="font-medium">Actieve bewerking</span>
          </div>
          <p className="text-white font-medium">{huidigeStap.naam}</p>
          <p className="text-gray-400 text-xs">{huidigeStap.beschrijving}</p>
        </div>
      )}

      {/* Feature lijst */}
      <div className="p-2 max-h-64 overflow-y-auto">
        {workflow.map((feature, index) => {
          const config = FEATURE_CONFIG[feature.type]
          const Icon = config.icon
          const isSelected = selectedFeature === feature.id
          
          return (
            <button
              key={feature.id}
              onClick={() => onSelectFeature(isSelected ? null : feature.id)}
              className={`w-full flex items-start gap-3 p-2 rounded-lg transition-colors text-left mb-1 ${
                isSelected 
                  ? 'bg-blue-900/50 border border-blue-500' 
                  : 'hover:bg-gray-700/50'
              }`}
            >
              {/* Stap nummer & lijn */}
              <div className="flex flex-col items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    feature.status === 'voltooid' ? 'bg-green-600 text-white' :
                    feature.status === 'bezig' ? 'bg-amber-500 text-white animate-pulse' :
                    'bg-gray-600 text-gray-300'
                  }`}
                >
                  {feature.status === 'voltooid' ? '✓' : index + 1}
                </div>
                {index < workflow.length - 1 && (
                  <div className={`w-0.5 h-6 ${
                    feature.status === 'voltooid' ? 'bg-green-600' : 'bg-gray-600'
                  }`} />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color: config.kleur }} />
                  <span className={`font-medium text-sm ${
                    feature.status === 'voltooid' ? 'text-gray-400' : 'text-white'
                  }`}>
                    {feature.naam}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">{feature.beschrijving}</p>
                
                {/* Tijd en positie */}
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className="flex items-center gap-1 text-gray-400">
                    <Clock className="w-3 h-3" />
                    {formatTijd(feature.tijdSeconden)}
                  </span>
                  {feature.positie && (
                    <span className="text-gray-500">
                      {feature.positie.start}-{feature.positie.eind}mm
                    </span>
                  )}
                </div>

                {/* Resultaat indien aanwezig */}
                {feature.resultaat && (
                  <div className={`mt-1 text-xs px-2 py-0.5 rounded inline-block ${
                    feature.resultaat.goedgekeurd 
                      ? 'bg-green-900/50 text-green-300' 
                      : 'bg-red-900/50 text-red-300'
                  }`}>
                    {feature.resultaat.goedgekeurd ? '✓ Goedgekeurd' : '✗ Afgekeurd'}
                  </div>
                )}
              </div>

              {/* Arrow */}
              <ChevronRight className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${
                isSelected ? 'rotate-90' : ''
              }`} />
            </button>
          )
        })}
      </div>

      {/* Volgende stap */}
      {volgendeStap && (
        <div className="p-3 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Volgende stap</p>
              <p className="text-sm text-white">{volgendeStap.naam}</p>
            </div>
            <button className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-1">
              <Play className="w-3 h-3" />
              Start
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Feature detail overlay
function FeatureDetailPanel({ 
  feature, 
  onClose 
}: { 
  feature: TreatmentFeature
  onClose: () => void 
}) {
  const config = FEATURE_CONFIG[feature.type]
  const Icon = config.icon

  return (
    <div className="absolute left-4 top-4 w-80 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
      <div 
        className="p-4 border-b border-gray-700 flex items-center justify-between"
        style={{ background: `linear-gradient(135deg, ${config.kleur}20, transparent)` }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: config.kleur + '30' }}
          >
            <Icon className="w-6 h-6" style={{ color: config.kleur }} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{feature.naam}</h3>
            <p className="text-xs text-gray-400">{config.naam}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Beschrijving */}
        <p className="text-gray-300 text-sm">{feature.beschrijving}</p>

        {/* Status */}
        <div className={`px-4 py-2 rounded-lg text-center font-medium ${
          feature.status === 'voltooid' ? 'bg-green-900/30 text-green-300' :
          feature.status === 'bezig' ? 'bg-amber-900/30 text-amber-300' :
          feature.status === 'mislukt' ? 'bg-red-900/30 text-red-300' :
          'bg-gray-700 text-gray-300'
        }`}>
          {feature.status === 'voltooid' && '✓ Voltooid'}
          {feature.status === 'bezig' && '⟳ Bezig...'}
          {feature.status === 'wachten' && '○ Wachten'}
          {feature.status === 'mislukt' && '✗ Mislukt'}
        </div>

        {/* Tijd */}
        <div className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
          <span className="text-gray-400 text-sm">Geschatte tijd</span>
          <span className="text-white font-mono">
            {feature.tijdSeconden < 60 
              ? `${feature.tijdSeconden} sec` 
              : `${Math.floor(feature.tijdSeconden/60)}:${String(feature.tijdSeconden%60).padStart(2,'0')} min`
            }
          </span>
        </div>

        {/* Positie */}
        {feature.positie && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-700 rounded-lg p-2">
              <p className="text-xs text-gray-400">Start positie</p>
              <p className="font-mono text-white">{feature.positie.start} mm</p>
            </div>
            <div className="bg-gray-700 rounded-lg p-2">
              <p className="text-xs text-gray-400">Eind positie</p>
              <p className="font-mono text-white">{feature.positie.eind} mm</p>
            </div>
          </div>
        )}

        {/* Parameters */}
        {feature.parameters && Object.keys(feature.parameters).length > 0 && (
          <div className="bg-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-2">Parameters</p>
            <div className="space-y-1">
              {Object.entries(feature.parameters).map(([key, value]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resultaat */}
        {feature.resultaat && (
          <div className={`rounded-lg p-3 ${
            feature.resultaat.goedgekeurd ? 'bg-green-900/30' : 'bg-red-900/30'
          }`}>
            <p className="text-xs text-gray-400 mb-2">Resultaat</p>
            {feature.resultaat.meetwaarden && (
              <div className="space-y-1 mb-2">
                {Object.entries(feature.resultaat.meetwaarden).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-400 capitalize">{key}</span>
                    <span className="text-white">{value} mm</span>
                  </div>
                ))}
              </div>
            )}
            {feature.resultaat.opmerking && (
              <p className="text-sm text-gray-300 italic">{feature.resultaat.opmerking}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Main component
export default function ProductieViewerPage() {
  const [selectedBalk, setSelectedBalk] = useState<ProductieBalk>(MOCK_PRODUCTIE_BALKEN[0])
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null)
  const [showLabels, setShowLabels] = useState(true)
  const [showSnijLijnen, setShowSnijLijnen] = useState(true)
  const [showMeetLijnen, setShowMeetLijnen] = useState(true)
  const [viewMode, setViewMode] = useState<'zones' | 'workflow'>('workflow')
  
  const selectedZone = selectedBalk.zones.find(z => z.id === selectedZoneId)
  const selectedFeature = selectedBalk.workflow.find(f => f.id === selectedFeatureId)
  
  // Statistieken
  const stats = useMemo(() => {
    const totaalTijd = selectedBalk.zones.reduce((sum, z) => sum + z.tijdMinuten, 0)
    const klaar = selectedBalk.zones.filter(z => z.status === 'klaar').length
    const bezig = selectedBalk.zones.filter(z => z.status === 'bezig').length
    const gepland = selectedBalk.zones.filter(z => z.status === 'gepland').length
    const afgewerkteTijd = selectedBalk.zones.filter(z => z.status === 'klaar').reduce((sum, z) => sum + z.tijdMinuten, 0)
    
    return { totaalTijd, klaar, bezig, gepland, voortgang: Math.round(afgewerkteTijd / totaalTijd * 100) }
  }, [selectedBalk])
  
  // Finale lengte na snijden
  const finaleLengte = selectedBalk.snijLengte 
    ? selectedBalk.snijLengte.eind - selectedBalk.snijLengte.start 
    : selectedBalk.lengte

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Productie & Bewerking Viewer</h1>
              <p className="text-sm text-gray-400">Treatment workflow en bewerkingszones</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* View mode toggle */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('workflow')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'workflow' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" />
                Workflow
              </button>
              <button
                onClick={() => setViewMode('zones')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'zones' 
                    ? 'bg-orange-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4 inline mr-1" />
                Zones
              </button>
            </div>

            {/* Balk selector */}
            <select
              value={selectedBalk.id}
              onChange={(e) => {
                const balk = MOCK_PRODUCTIE_BALKEN.find(b => b.id === e.target.value)
                if (balk) {
                  setSelectedBalk(balk)
                  setSelectedZoneId(null)
                  setSelectedFeatureId(null)
                }
              }}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-orange-500 focus:outline-none"
            >
              {MOCK_PRODUCTIE_BALKEN.map(b => (
                <option key={b.id} value={b.id}>{b.id} - {b.profielNaam}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-80 bg-gray-800/50 border-r border-gray-700 overflow-y-auto p-4 space-y-4">
          {/* Balk info - altijd zichtbaar */}
          <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Layers className="w-5 h-5 text-orange-400" />
              <span className="font-bold text-xl text-white">{selectedBalk.profielNaam}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-400">Lengte:</span>
                <span className="text-white ml-2">{selectedBalk.lengte} mm</span>
              </div>
              <div>
                <span className="text-gray-400">Gewicht:</span>
                <span className="text-white ml-2">{selectedBalk.gewicht} kg</span>
              </div>
              <div>
                <span className="text-gray-400">Hoogte:</span>
                <span className="text-white ml-2">{selectedBalk.afmetingen.hoogte} mm</span>
              </div>
              <div>
                <span className="text-gray-400">Breedte:</span>
                <span className="text-white ml-2">{selectedBalk.afmetingen.breedte} mm</span>
              </div>
            </div>
          </div>
          
          {/* === WORKFLOW MODE === */}
          {viewMode === 'workflow' && (
            <>
              {/* Treatment Workflow Panel */}
              <TreatmentWorkflowPanel
                workflow={selectedBalk.workflow}
                selectedFeature={selectedFeatureId}
                onSelectFeature={setSelectedFeatureId}
              />
              
              {/* Feature Detail - als geselecteerd */}
              {selectedFeature && (
                <FeatureDetailPanel
                  feature={selectedFeature}
                  onClose={() => setSelectedFeatureId(null)}
                />
              )}
            </>
          )}

          {/* === ZONES MODE === */}
          {viewMode === 'zones' && (
            <>
              {/* Origineel */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Herkomst</h4>
                <p className="text-white font-medium">{selectedBalk.origineel.gebouw}</p>
                <p className="text-gray-400 text-sm">{selectedBalk.origineel.positie}</p>
                <div className={`mt-2 inline-block px-2 py-1 rounded text-xs font-medium ${
                  selectedBalk.origineel.conditie === 'goed' ? 'bg-green-900/50 text-green-300' :
                  selectedBalk.origineel.conditie === 'matig' ? 'bg-yellow-900/50 text-yellow-300' :
                  'bg-red-900/50 text-red-300'
                }`}>
                  Conditie: {selectedBalk.origineel.conditie}
                </div>
              </div>
              
              {/* Snijden info */}
              {selectedBalk.snijLengte && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scissors className="w-4 h-4 text-red-400" />
                    <h4 className="text-sm font-medium text-red-300">Snijden Vereist</h4>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start snij:</span>
                      <span className="text-white">{selectedBalk.snijLengte.start} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Eind snij:</span>
                      <span className="text-white">{selectedBalk.snijLengte.eind} mm</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span className="text-green-400">Finale lengte:</span>
                      <span className="text-green-300">{finaleLengte} mm</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Voortgang */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Bewerking Voortgang</h4>
                
                {/* Progress bar */}
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${stats.voortgang}%` }}
                  />
                </div>
                <p className="text-right text-sm text-gray-400">{stats.voortgang}% voltooid</p>
                
                {/* Stats */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-900/30 rounded-lg py-2">
                    <p className="text-lg font-bold text-green-400">{stats.klaar}</p>
                    <p className="text-xs text-gray-400">Klaar</p>
                  </div>
                  <div className="bg-yellow-900/30 rounded-lg py-2">
                    <p className="text-lg font-bold text-yellow-400">{stats.bezig}</p>
                    <p className="text-xs text-gray-400">Bezig</p>
                  </div>
                  <div className="bg-gray-700 rounded-lg py-2">
                    <p className="text-lg font-bold text-gray-400">{stats.gepland}</p>
                    <p className="text-xs text-gray-400">Gepland</p>
                  </div>
                </div>
            
                <div className="mt-3 pt-3 border-t border-gray-700 flex justify-between">
                  <span className="text-gray-400 text-sm">Totale tijd:</span>
                  <span className="text-white font-medium">{stats.totaalTijd} min ({Math.round(stats.totaalTijd/60*10)/10} uur)</span>
                </div>
              </div>
          
              {/* Zones lijst */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Bewerkingszones ({selectedBalk.zones.length})</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedBalk.zones.map((zone) => {
                    const Icon = BEWERKING_ICONS[zone.bewerking]
                    return (
                      <button
                        key={zone.id}
                        onClick={() => setSelectedZoneId(selectedZoneId === zone.id ? null : zone.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                          selectedZoneId === zone.id ? 'bg-orange-600/30 border border-orange-500' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: ZONE_KLEUREN[zone.type] }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm capitalize truncate">{zone.type}</p>
                          <p className="text-gray-400 text-xs">{zone.startPositie}-{zone.eindPositie}mm</p>
                        </div>
                        <Icon className="w-4 h-4 text-gray-400" />
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: STATUS_KLEUREN[zone.status] }}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
          
              {/* Legenda */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Legenda</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(ZONE_KLEUREN).map(([type, kleur]) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: kleur }} />
                      <span className="text-xs text-gray-300 capitalize">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas shadows className="bg-gray-900">
            <Scene 
              balk={selectedBalk}
              selectedZone={selectedZoneId}
              onSelectZone={setSelectedZoneId}
              showLabels={showLabels}
              showSnijLijnen={showSnijLijnen}
              showMeetLijnen={showMeetLijnen}
            />
          </Canvas>
          
          {/* Controls */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`p-2 rounded-lg backdrop-blur transition-colors ${
                showLabels ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300'
              }`}
              title="Toggle labels"
            >
              {showLabels ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowSnijLijnen(!showSnijLijnen)}
              className={`p-2 rounded-lg backdrop-blur transition-colors ${
                showSnijLijnen ? 'bg-red-600 text-white' : 'bg-gray-800/80 text-gray-300'
              }`}
              title="Toggle snijlijnen"
            >
              <Scissors className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowMeetLijnen(!showMeetLijnen)}
              className={`p-2 rounded-lg backdrop-blur transition-colors ${
                showMeetLijnen ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300'
              }`}
              title="Toggle meetlijnen"
            >
              <Ruler className="w-5 h-5" />
            </button>
            <button
              onClick={() => setSelectedZoneId(null)}
              className="p-2 rounded-lg bg-gray-800/80 text-gray-300 hover:bg-gray-700 backdrop-blur transition-colors"
              title="Reset selectie"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          
          {/* Zone detail panel */}
          {selectedZone && (
            <ZoneDetailPanel zone={selectedZone} onClose={() => setSelectedZoneId(null)} />
          )}
          
          {/* Navigation help */}
          <div className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur rounded-lg p-3 text-xs text-gray-400">
            <div className="flex items-center gap-2 mb-1">
              <span>🖱️ Links:</span>
              <span className="text-white">Roteren</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span>🖱️ Rechts:</span>
              <span className="text-white">Pannen</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🖱️ Scroll:</span>
              <span className="text-white">Zoomen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
