import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Text, Line } from '@react-three/drei'
import { 
  Cpu, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Layers,
  Target,
  Zap,
  Clock,
  Truck,
  Users,
  TrendingUp,
  ChevronRight,
  Building2,
  GitBranch,
  Network,
  Loader2,
  FileCheck,
  ShieldCheck
} from 'lucide-react'
import * as THREE from 'three'

// ============================================================
// TYPES
// ============================================================

interface StructureleVerbinding {
  van: string
  naar: string
  type: 'ondersteund_door' | 'verbonden_met' | 'rust_op'
  kritiek: boolean
}

interface AnalyseElement {
  id: string
  naam: string
  type: 'kolom' | 'ligger' | 'schoor' | 'spant' | 'gordel' | 'stabiliteit'
  positie: { x: number; y: number; z: number }
  afmetingen: { lengte: number; hoogte: number; breedte: number }
  gewicht: number // kg
  niveau: number // verdieping/zone
  structureleRol: 'primair' | 'secundair' | 'tertiair'
  afhankelijkheden: string[] // IDs van elementen die dit ondersteunen
  ondersteunt: string[] // IDs die dit element ondersteunt
  demontageFase?: number
  demontageKlaar: boolean
  conditie: 'goed' | 'matig' | 'slecht'
  geschatteTijd: number // minuten
}

interface DemontageFase {
  fase: number
  naam: string
  elementen: string[]
  beschrijving: string
  geschatteTijd: number // minuten
  vereisten: string[]
  veiligheidsNotities: string[]
}

interface AnalyseResultaat {
  gebouwId: string
  timestamp: Date
  totaalElementen: number
  totaalFasen: number
  geschatteTotaalTijd: number
  kritiekePaden: string[][]
  fasen: DemontageFase[]
  waarschuwingen: string[]
  aanbevelingen: string[]
}

// ============================================================
// MOCK DATA - Gebouw met structurele analyse
// ============================================================

const MOCK_ELEMENTEN: AnalyseElement[] = [
  // Niveau 3 - Dak/Spanten (eerst verwijderen)
  { id: 'SP-01', naam: 'Dakspant West', type: 'spant', positie: { x: -4, y: 8, z: 0 }, afmetingen: { lengte: 12, hoogte: 0.6, breedte: 0.3 }, gewicht: 1200, niveau: 3, structureleRol: 'primair', afhankelijkheden: ['K-01', 'K-02'], ondersteunt: ['G-01', 'G-02'], demontageKlaar: false, conditie: 'goed', geschatteTijd: 45 },
  { id: 'SP-02', naam: 'Dakspant Midden', type: 'spant', positie: { x: 0, y: 8, z: 0 }, afmetingen: { lengte: 12, hoogte: 0.6, breedte: 0.3 }, gewicht: 1200, niveau: 3, structureleRol: 'primair', afhankelijkheden: ['K-02', 'K-03'], ondersteunt: ['G-02', 'G-03'], demontageKlaar: false, conditie: 'goed', geschatteTijd: 45 },
  { id: 'SP-03', naam: 'Dakspant Oost', type: 'spant', positie: { x: 4, y: 8, z: 0 }, afmetingen: { lengte: 12, hoogte: 0.6, breedte: 0.3 }, gewicht: 1100, niveau: 3, structureleRol: 'primair', afhankelijkheden: ['K-03', 'K-04'], ondersteunt: ['G-03', 'G-04'], demontageKlaar: false, conditie: 'matig', geschatteTijd: 50 },
  
  // Gordingen (secundair)
  { id: 'G-01', naam: 'Gording 1', type: 'gordel', positie: { x: -4, y: 8.5, z: -2 }, afmetingen: { lengte: 4, hoogte: 0.15, breedte: 0.1 }, gewicht: 80, niveau: 3, structureleRol: 'secundair', afhankelijkheden: ['SP-01'], ondersteunt: [], demontageKlaar: false, conditie: 'goed', geschatteTijd: 10 },
  { id: 'G-02', naam: 'Gording 2', type: 'gordel', positie: { x: -2, y: 8.5, z: -2 }, afmetingen: { lengte: 4, hoogte: 0.15, breedte: 0.1 }, gewicht: 80, niveau: 3, structureleRol: 'secundair', afhankelijkheden: ['SP-01', 'SP-02'], ondersteunt: [], demontageKlaar: false, conditie: 'goed', geschatteTijd: 10 },
  { id: 'G-03', naam: 'Gording 3', type: 'gordel', positie: { x: 2, y: 8.5, z: -2 }, afmetingen: { lengte: 4, hoogte: 0.15, breedte: 0.1 }, gewicht: 80, niveau: 3, structureleRol: 'secundair', afhankelijkheden: ['SP-02', 'SP-03'], ondersteunt: [], demontageKlaar: false, conditie: 'matig', geschatteTijd: 12 },
  { id: 'G-04', naam: 'Gording 4', type: 'gordel', positie: { x: 4, y: 8.5, z: -2 }, afmetingen: { lengte: 4, hoogte: 0.15, breedte: 0.1 }, gewicht: 75, niveau: 3, structureleRol: 'secundair', afhankelijkheden: ['SP-03'], ondersteunt: [], demontageKlaar: false, conditie: 'goed', geschatteTijd: 10 },

  // Niveau 2 - Liggers
  { id: 'L-01', naam: 'Hoofdligger West', type: 'ligger', positie: { x: -4, y: 5, z: 0 }, afmetingen: { lengte: 10, hoogte: 0.4, breedte: 0.25 }, gewicht: 650, niveau: 2, structureleRol: 'primair', afhankelijkheden: ['K-01', 'K-02'], ondersteunt: ['SC-01'], demontageKlaar: false, conditie: 'goed', geschatteTijd: 35 },
  { id: 'L-02', naam: 'Hoofdligger Oost', type: 'ligger', positie: { x: 4, y: 5, z: 0 }, afmetingen: { lengte: 10, hoogte: 0.4, breedte: 0.25 }, gewicht: 650, niveau: 2, structureleRol: 'primair', afhankelijkheden: ['K-03', 'K-04'], ondersteunt: ['SC-02'], demontageKlaar: false, conditie: 'goed', geschatteTijd: 35 },
  { id: 'L-03', naam: 'Tussenligger 1', type: 'ligger', positie: { x: 0, y: 5, z: -3 }, afmetingen: { lengte: 8, hoogte: 0.3, breedte: 0.2 }, gewicht: 420, niveau: 2, structureleRol: 'secundair', afhankelijkheden: ['K-02', 'K-03'], ondersteunt: [], demontageKlaar: false, conditie: 'matig', geschatteTijd: 25 },
  { id: 'L-04', naam: 'Tussenligger 2', type: 'ligger', positie: { x: 0, y: 5, z: 3 }, afmetingen: { lengte: 8, hoogte: 0.3, breedte: 0.2 }, gewicht: 420, niveau: 2, structureleRol: 'secundair', afhankelijkheden: ['K-02', 'K-03'], ondersteunt: [], demontageKlaar: false, conditie: 'goed', geschatteTijd: 25 },

  // Schoren (stabiliteit)
  { id: 'SC-01', naam: 'Windschoor West', type: 'schoor', positie: { x: -4, y: 4, z: 0 }, afmetingen: { lengte: 6, hoogte: 0.15, breedte: 0.15 }, gewicht: 180, niveau: 2, structureleRol: 'tertiair', afhankelijkheden: ['L-01'], ondersteunt: [], demontageKlaar: false, conditie: 'goed', geschatteTijd: 15 },
  { id: 'SC-02', naam: 'Windschoor Oost', type: 'schoor', positie: { x: 4, y: 4, z: 0 }, afmetingen: { lengte: 6, hoogte: 0.15, breedte: 0.15 }, gewicht: 180, niveau: 2, structureleRol: 'tertiair', afhankelijkheden: ['L-02'], ondersteunt: [], demontageKlaar: false, conditie: 'matig', geschatteTijd: 18 },
  { id: 'SC-03', naam: 'Kruisschoor', type: 'stabiliteit', positie: { x: 0, y: 4, z: -5 }, afmetingen: { lengte: 8, hoogte: 0.12, breedte: 0.12 }, gewicht: 150, niveau: 2, structureleRol: 'secundair', afhankelijkheden: ['K-02', 'K-03'], ondersteunt: [], demontageKlaar: false, conditie: 'goed', geschatteTijd: 20 },

  // Niveau 1 - Kolommen (laatst verwijderen)
  { id: 'K-01', naam: 'Kolom A1', type: 'kolom', positie: { x: -6, y: 0, z: -5 }, afmetingen: { lengte: 0.3, hoogte: 8, breedte: 0.3 }, gewicht: 1800, niveau: 1, structureleRol: 'primair', afhankelijkheden: [], ondersteunt: ['SP-01', 'L-01'], demontageKlaar: false, conditie: 'goed', geschatteTijd: 60 },
  { id: 'K-02', naam: 'Kolom A2', type: 'kolom', positie: { x: -6, y: 0, z: 5 }, afmetingen: { lengte: 0.3, hoogte: 8, breedte: 0.3 }, gewicht: 1800, niveau: 1, structureleRol: 'primair', afhankelijkheden: [], ondersteunt: ['SP-01', 'SP-02', 'L-01', 'L-03', 'L-04', 'SC-03'], demontageKlaar: false, conditie: 'goed', geschatteTijd: 60 },
  { id: 'K-03', naam: 'Kolom B1', type: 'kolom', positie: { x: 6, y: 0, z: -5 }, afmetingen: { lengte: 0.3, hoogte: 8, breedte: 0.3 }, gewicht: 1800, niveau: 1, structureleRol: 'primair', afhankelijkheden: [], ondersteunt: ['SP-02', 'SP-03', 'L-02', 'L-03', 'L-04', 'SC-03'], demontageKlaar: false, conditie: 'matig', geschatteTijd: 70 },
  { id: 'K-04', naam: 'Kolom B2', type: 'kolom', positie: { x: 6, y: 0, z: 5 }, afmetingen: { lengte: 0.3, hoogte: 8, breedte: 0.3 }, gewicht: 1750, niveau: 1, structureleRol: 'primair', afhankelijkheden: [], ondersteunt: ['SP-03', 'L-02'], demontageKlaar: false, conditie: 'slecht', geschatteTijd: 75 },
]

const TYPE_KLEUREN: Record<string, string> = {
  kolom: '#3b82f6',
  ligger: '#22c55e',
  schoor: '#f59e0b',
  spant: '#8b5cf6',
  gordel: '#ec4899',
  stabiliteit: '#14b8a6',
  balk: '#8b5cf6',
  windverband: '#84cc16',
  vloerligger: '#14b8a6',
  gording: '#22c55e',
  dakspoor: '#a855f7',
  stijl: '#0ea5e9',
  regel: '#eab308'
}

const FASE_KLEUREN = [
  '#22c55e', // Fase 1 - groen
  '#3b82f6', // Fase 2 - blauw
  '#f59e0b', // Fase 3 - oranje
  '#8b5cf6', // Fase 4 - paars
  '#ef4444', // Fase 5 - rood
  '#14b8a6', // Fase 6 - teal
]

// ============================================================
// ANALYSE ALGORITME
// ============================================================

function analyseerDemontageVolgorde(elementen: AnalyseElement[]): AnalyseResultaat {
  const fasen: DemontageFase[] = []
  const waarschuwingen: string[] = []
  const aanbevelingen: string[] = []
  
  // Kopieer elementen om te muteren
  const werkElementen = elementen.map(e => ({ ...e }))
  
  // Topologische sortering op basis van afhankelijkheden
  // Element kan pas verwijderd worden als alles wat het ondersteunt al weg is
  
  let faseNummer = 1
  let verwijderd = new Set<string>()
  
  while (verwijderd.size < werkElementen.length) {
    // Vind elementen die nu verwijderd kunnen worden
    // (alles wat ze ondersteunen is al verwijderd)
    const kandidaten = werkElementen.filter(e => 
      !verwijderd.has(e.id) && 
      e.ondersteunt.every(id => verwijderd.has(id))
    )
    
    if (kandidaten.length === 0 && verwijderd.size < werkElementen.length) {
      // Circular dependency of probleem
      waarschuwingen.push('⚠️ Circulaire afhankelijkheid gedetecteerd. Handmatige review vereist.')
      break
    }
    
    // Sorteer kandidaten: eerst tertiair, dan secundair, dan primair
    // En binnen dezelfde rol: eerst hogere niveaus
    kandidaten.sort((a, b) => {
      const rolOrder = { tertiair: 0, secundair: 1, primair: 2 }
      if (rolOrder[a.structureleRol] !== rolOrder[b.structureleRol]) {
        return rolOrder[a.structureleRol] - rolOrder[b.structureleRol]
      }
      return b.niveau - a.niveau // Hoger niveau eerst
    })
    
    // Groepeer in logische fasen (max 5 elementen per fase voor overzichtelijkheid)
    const faseElementen = kandidaten.slice(0, 5)
    
    // Bepaal fasekenmerken
    const primairCount = faseElementen.filter(e => e.structureleRol === 'primair').length
    const totaalTijd = faseElementen.reduce((sum, e) => sum + e.geschatteTijd, 0)
    
    const fase: DemontageFase = {
      fase: faseNummer,
      naam: bepaalFaseNaam(faseElementen),
      elementen: faseElementen.map(e => e.id),
      beschrijving: `Verwijderen van ${faseElementen.length} ${faseElementen[0]?.type || 'elementen'}`,
      geschatteTijd: totaalTijd,
      vereisten: bepaalVereisten(faseElementen),
      veiligheidsNotities: bepaalVeiligheidsNotities(faseElementen, primairCount),
    }
    
    fasen.push(fase)
    
    // Markeer als verwijderd
    faseElementen.forEach(e => {
      verwijderd.add(e.id)
      const origElement = werkElementen.find(we => we.id === e.id)
      if (origElement) {
        origElement.demontageFase = faseNummer
        origElement.demontageKlaar = true
      }
    })
    
    faseNummer++
  }
  
  // Genereer aanbevelingen
  const kolommenAlsLaatst = fasen[fasen.length - 1]?.elementen.every(id => 
    werkElementen.find(e => e.id === id)?.type === 'kolom'
  )
  if (kolommenAlsLaatst) {
    aanbevelingen.push('✓ Kolommen worden als laatste verwijderd - correct structureel plan')
  }
  
  const slechtConditie = werkElementen.filter(e => e.conditie === 'slecht')
  if (slechtConditie.length > 0) {
    waarschuwingen.push(`⚠️ ${slechtConditie.length} elementen in slechte conditie - extra voorzichtigheid vereist`)
  }
  
  const totaalTijd = fasen.reduce((sum, f) => sum + f.geschatteTijd, 0)
  aanbevelingen.push(`⏱️ Geschatte totale demontagetijd: ${Math.round(totaalTijd / 60)} uur (${Math.ceil(totaalTijd / 480)} werkdagen)`)
  
  return {
    gebouwId: 'analyse-gebouw',
    timestamp: new Date(),
    totaalElementen: elementen.length,
    totaalFasen: fasen.length,
    geschatteTotaalTijd: totaalTijd,
    kritiekePaden: [],
    fasen,
    waarschuwingen,
    aanbevelingen,
  }
}

function bepaalFaseNaam(elementen: AnalyseElement[]): string {
  if (elementen.length === 0) return 'Lege fase'
  const types = [...new Set(elementen.map(e => e.type))]
  if (types.includes('gordel') || types.includes('schoor')) return 'Secundaire constructie'
  if (types.includes('spant')) return 'Dakconstructie'
  if (types.includes('ligger')) return 'Vloerliggers'
  if (types.includes('kolom')) return 'Hoofdconstructie'
  return `${types[0].charAt(0).toUpperCase() + types[0].slice(1)} demontage`
}

function bepaalVereisten(elementen: AnalyseElement[]): string[] {
  const vereisten: string[] = []
  const totaalGewicht = elementen.reduce((sum, e) => sum + e.gewicht, 0)
  
  if (totaalGewicht > 2000) {
    vereisten.push('Zware hijskraan (>50 ton)')
  } else if (totaalGewicht > 500) {
    vereisten.push('Middel hijskraan (20-50 ton)')
  } else {
    vereisten.push('Lichte hijsmiddelen')
  }
  
  if (elementen.some(e => e.niveau >= 3)) {
    vereisten.push('Hoogwerker of steiger')
  }
  
  return vereisten
}

function bepaalVeiligheidsNotities(elementen: AnalyseElement[], primairCount: number): string[] {
  const notities: string[] = []
  
  if (primairCount > 0) {
    notities.push('Primaire constructie - tijdelijke ondersteuning mogelijk nodig')
  }
  
  if (elementen.some(e => e.conditie === 'slecht')) {
    notities.push('Elementen in slechte staat - onverwacht bezwijken mogelijk')
  }
  
  if (elementen.some(e => e.gewicht > 1500)) {
    notities.push('Zware elementen - exclusieve zone voor hijswerk')
  }
  
  return notities
}

// ============================================================
// 3D VISUALISATIE COMPONENTS
// ============================================================

function Element3D({ 
  element, 
  fase,
  isGeselecteerd,
  toonFaseKleur,
  onClick 
}: { 
  element: AnalyseElement
  fase?: number
  isGeselecteerd: boolean
  toonFaseKleur: boolean
  onClick: () => void
}) {
  const kleur = toonFaseKleur && fase 
    ? FASE_KLEUREN[(fase - 1) % FASE_KLEUREN.length]
    : TYPE_KLEUREN[element.type]
  
  const opacity = element.demontageKlaar ? 0.3 : 1
  
  // Bepaal geometry op basis van type
  const isKolom = element.type === 'kolom'
  const width = isKolom ? element.afmetingen.breedte : element.afmetingen.lengte
  const height = isKolom ? element.afmetingen.hoogte : element.afmetingen.hoogte
  const depth = isKolom ? element.afmetingen.lengte : element.afmetingen.breedte
  
  const yPos = isKolom ? element.positie.y + height / 2 : element.positie.y

  return (
    <group position={[element.positie.x, yPos, element.positie.z]}>
      <mesh 
        onClick={(e) => { e.stopPropagation(); onClick() }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          color={kleur} 
          transparent 
          opacity={isGeselecteerd ? 1 : opacity * 0.8}
          emissive={isGeselecteerd ? kleur : '#000000'}
          emissiveIntensity={isGeselecteerd ? 0.3 : 0}
        />
      </mesh>
      
      {/* Fase nummer label */}
      {fase && toonFaseKleur && (
        <Text
          position={[0, height / 2 + 0.5, 0]}
          fontSize={0.4}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {fase}
        </Text>
      )}
      
      {/* Selection ring */}
      {isGeselecteerd && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + 0.1, height + 0.1, depth + 0.1]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}
    </group>
  )
}

function Scene({ 
  elementen, 
  fasen,
  geselecteerd,
  toonFaseKleur,
  onSelect 
}: { 
  elementen: AnalyseElement[]
  fasen: DemontageFase[]
  geselecteerd: string | null
  toonFaseKleur: boolean
  onSelect: (id: string | null) => void
}) {
  // Maak lookup voor fase per element
  const faseMap = useMemo(() => {
    const map = new Map<string, number>()
    fasen.forEach(f => {
      f.elementen.forEach(id => map.set(id, f.fase))
    })
    return map
  }, [fasen])

  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 12, 15]} />
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
      />
      
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      
      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      {/* Grid */}
      <gridHelper args={[30, 30, '#333', '#222']} position={[0, 0, 0]} />
      
      {/* Elementen */}
      {elementen.map(element => (
        <Element3D
          key={element.id}
          element={element}
          fase={faseMap.get(element.id)}
          isGeselecteerd={geselecteerd === element.id}
          toonFaseKleur={toonFaseKleur}
          onClick={() => onSelect(element.id)}
        />
      ))}
    </>
  )
}

// ============================================================
// UI COMPONENTS
// ============================================================

function FaseKaart({ 
  fase, 
  elementen,
  isActief,
  onClick 
}: { 
  fase: DemontageFase
  elementen: AnalyseElement[]
  isActief: boolean
  onClick: () => void
}) {
  const faseElementen = elementen.filter(e => fase.elementen.includes(e.id))
  const totaalGewicht = faseElementen.reduce((sum, e) => sum + e.gewicht, 0)
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isActief 
          ? 'bg-blue-900/50 border-blue-500' 
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white"
            style={{ backgroundColor: FASE_KLEUREN[(fase.fase - 1) % FASE_KLEUREN.length] }}
          >
            {fase.fase}
          </div>
          <span className="font-medium text-white">{fase.naam}</span>
        </div>
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isActief ? 'rotate-90' : ''}`} />
      </div>
      
      <p className="text-sm text-gray-400 mb-2">{fase.beschrijving}</p>
      
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {fase.elementen.length} elementen
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {fase.geschatteTijd} min
        </span>
        <span className="flex items-center gap-1">
          <Truck className="w-3 h-3" />
          {(totaalGewicht / 1000).toFixed(1)} ton
        </span>
      </div>
      
      {isActief && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
          {fase.vereisten.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Vereisten:</p>
              {fase.vereisten.map((v, i) => (
                <span key={i} className="inline-block bg-blue-900/50 text-blue-300 text-xs px-2 py-0.5 rounded mr-1 mb-1">
                  {v}
                </span>
              ))}
            </div>
          )}
          {fase.veiligheidsNotities.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-1">Veiligheid:</p>
              {fase.veiligheidsNotities.map((n, i) => (
                <span key={i} className="inline-block bg-orange-900/50 text-orange-300 text-xs px-2 py-0.5 rounded mr-1 mb-1">
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  )
}

function ElementDetail({ 
  element, 
  fase,
  onClose 
}: { 
  element: AnalyseElement
  fase?: number
  onClose: () => void
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${TYPE_KLEUREN[element.type]}30` }}
          >
            <Layers className="w-5 h-5" style={{ color: TYPE_KLEUREN[element.type] }} />
          </div>
          <div>
            <h3 className="font-bold text-white">{element.naam}</h3>
            <p className="text-sm text-gray-400 capitalize">{element.type} • {element.structureleRol}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Gewicht</p>
          <p className="text-white font-medium">{element.gewicht} kg</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Demontage Fase</p>
          <p className="font-medium" style={{ color: fase ? FASE_KLEUREN[(fase - 1) % FASE_KLEUREN.length] : '#888' }}>
            Fase {fase || '?'}
          </p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Geschatte Tijd</p>
          <p className="text-white font-medium">{element.geschatteTijd} min</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs">Conditie</p>
          <p className={`font-medium ${
            element.conditie === 'goed' ? 'text-green-400' :
            element.conditie === 'matig' ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {element.conditie.charAt(0).toUpperCase() + element.conditie.slice(1)}
          </p>
        </div>
      </div>
      
      {element.ondersteunt.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-1">Ondersteunt:</p>
          <div className="flex flex-wrap gap-1">
            {element.ondersteunt.map(id => (
              <span key={id} className="bg-red-900/50 text-red-300 text-xs px-2 py-0.5 rounded">
                {id}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {element.afhankelijkheden.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-gray-400 mb-1">Rust op:</p>
          <div className="flex flex-wrap gap-1">
            {element.afhankelijkheden.map(id => (
              <span key={id} className="bg-blue-900/50 text-blue-300 text-xs px-2 py-0.5 rounded">
                {id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OogstAnalysePage() {
  const [elementen, setElementen] = useState<AnalyseElement[]>(MOCK_ELEMENTEN)
  const [analyseResultaat, setAnalyseResultaat] = useState<AnalyseResultaat | null>(null)
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [geselecteerdElement, setGeselecteerdElement] = useState<string | null>(null)
  const [geselecteerdeFase, setGeselecteerdeFase] = useState<number | null>(null)
  const [toonFaseKleur, setToonFaseKleur] = useState(true)
  
  const geselecteerdElementData = elementen.find(e => e.id === geselecteerdElement)
  
  // Start analyse
  const startAnalyse = async () => {
    setIsAnalysing(true)
    
    // Simuleer processing tijd
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const resultaat = analyseerDemontageVolgorde(elementen)
    setAnalyseResultaat(resultaat)
    
    // Update elementen met fase info
    setElementen(prev => prev.map(e => {
      const fase = resultaat.fasen.find(f => f.elementen.includes(e.id))
      return { ...e, demontageFase: fase?.fase }
    }))
    
    setIsAnalysing(false)
  }
  
  // Reset
  const resetAnalyse = () => {
    setAnalyseResultaat(null)
    setElementen(MOCK_ELEMENTEN)
    setGeselecteerdElement(null)
    setGeselecteerdeFase(null)
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Automatische Oogst Analyse</h1>
              <p className="text-sm text-gray-400">AI-gestuurde demontage volgorde optimalisatie</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {!analyseResultaat ? (
              <button
                onClick={startAnalyse}
                disabled={isAnalysing}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
              >
                {isAnalysing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyseren...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Start Analyse
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setToonFaseKleur(!toonFaseKleur)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    toonFaseKleur ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  <Network className="w-4 h-4 inline mr-1" />
                  Fase Kleuren
                </button>
                <button
                  onClick={resetAnalyse}
                  className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  <RotateCcw className="w-5 h-5" />
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-96 bg-gray-800/50 border-r border-gray-700 overflow-y-auto p-4 space-y-4">
          {/* Statistieken */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-white mb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-400" />
              Gebouw Overzicht
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-900/50 rounded p-2">
                <p className="text-gray-400 text-xs">Elementen</p>
                <p className="text-white font-bold">{elementen.length}</p>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <p className="text-gray-400 text-xs">Totaal Gewicht</p>
                <p className="text-white font-bold">{(elementen.reduce((s, e) => s + e.gewicht, 0) / 1000).toFixed(1)} ton</p>
              </div>
            </div>
          </div>
          
          {/* Analyse Resultaat */}
          {analyseResultaat && (
            <>
              {/* Summary */}
              <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 rounded-lg p-4 border border-purple-700/50">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="font-medium text-white">Analyse Compleet</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Fasen</p>
                    <p className="text-white font-bold">{analyseResultaat.totaalFasen}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Totale Tijd</p>
                    <p className="text-white font-bold">{Math.round(analyseResultaat.geschatteTotaalTijd / 60)} uur</p>
                  </div>
                </div>
              </div>
              
              {/* Waarschuwingen */}
              {analyseResultaat.waarschuwingen.length > 0 && (
                <div className="bg-yellow-900/20 rounded-lg p-3 border border-yellow-700/50">
                  {analyseResultaat.waarschuwingen.map((w, i) => (
                    <p key={i} className="text-sm text-yellow-300">{w}</p>
                  ))}
                </div>
              )}
              
              {/* Aanbevelingen */}
              {analyseResultaat.aanbevelingen.length > 0 && (
                <div className="bg-green-900/20 rounded-lg p-3 border border-green-700/50">
                  {analyseResultaat.aanbevelingen.map((a, i) => (
                    <p key={i} className="text-sm text-green-300">{a}</p>
                  ))}
                </div>
              )}
              
              {/* Fasen lijst */}
              <div className="space-y-2">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-purple-400" />
                  Demontage Fasen
                </h3>
                {analyseResultaat.fasen.map(fase => (
                  <FaseKaart
                    key={fase.fase}
                    fase={fase}
                    elementen={elementen}
                    isActief={geselecteerdeFase === fase.fase}
                    onClick={() => setGeselecteerdeFase(geselecteerdeFase === fase.fase ? null : fase.fase)}
                  />
                ))}
              </div>
            </>
          )}
          
          {/* Element detail */}
          {geselecteerdElementData && (
            <ElementDetail
              element={geselecteerdElementData}
              fase={geselecteerdElementData.demontageFase}
              onClose={() => setGeselecteerdElement(null)}
            />
          )}
          
          {/* Legenda */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-medium text-white mb-3">Element Types</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(TYPE_KLEUREN).map(([type, kleur]) => (
                <div key={type} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: kleur }} />
                  <span className="text-xs text-gray-300 capitalize">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas shadows>
            <Scene
              elementen={elementen}
              fasen={analyseResultaat?.fasen || []}
              geselecteerd={geselecteerdElement}
              toonFaseKleur={toonFaseKleur && !!analyseResultaat}
              onSelect={setGeselecteerdElement}
            />
          </Canvas>
          
          {/* Loading overlay */}
          {isAnalysing && (
            <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">Analyseren structurele afhankelijkheden...</p>
                <p className="text-gray-400 text-sm">Berekenen optimale demontage volgorde</p>
              </div>
            </div>
          )}
          
          {/* Help */}
          <div className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur rounded-lg p-3 text-xs text-gray-400">
            <p className="flex items-center gap-2 mb-1">
              <span>🖱️</span>
              <span>Klik element voor details</span>
            </p>
            <p className="flex items-center gap-2">
              <span>🔄</span>
              <span>Roteren: Links klik + slepen</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
