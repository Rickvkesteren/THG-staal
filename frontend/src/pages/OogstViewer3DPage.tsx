import { useState, useMemo, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Text,
  Line
} from '@react-three/drei'
import { 
  Scissors, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Play,
  Pause,
  RotateCcw,
  Users,
  Truck,
  Shield,
  ArrowDown,
  Layers,
  Weight,
  Timer
} from 'lucide-react'
import * as THREE from 'three'

// Types
interface OogstElement {
  id: string
  type: 'kolom' | 'balk' | 'ligger' | 'spant' | 'schoor' | 'windverband'
  profielNaam: string
  lengte: number // mm
  gewicht: number // kg
  positie: { x: number; y: number; z: number }
  rotatie: { x: number; y: number; z: number }
  verdieping: number
  conditie: 'goed' | 'matig' | 'slecht'
  oogstVolgorde: number // 0 = nog niet gepland
  status: 'wacht' | 'actief' | 'geoogst'
  afhankelijkheden: string[] // IDs van elementen die eerst weg moeten
  risico: 'laag' | 'gemiddeld' | 'hoog'
  geschatteTijd: number // minuten
  benodigd: {
    kraan: boolean
    steiger: boolean
    personen: number
  }
}

interface OogstFase {
  id: number
  naam: string
  beschrijving: string
  elementen: string[] // Element IDs
  geschatteTijd: number // minuten
  veiligheidsNiveau: 'groen' | 'geel' | 'rood'
}

// Mock oogst gebouw data
const createOogstGebouw = (): { elementen: OogstElement[]; fasen: OogstFase[] } => {
  const elementen: OogstElement[] = []
  
  // Kolommen (verticaal, moeten als laatste)
  const kolomPosities = [
    { x: 0, y: 0 }, { x: 6000, y: 0 }, { x: 12000, y: 0 }, { x: 18000, y: 0 },
    { x: 0, y: 8000 }, { x: 6000, y: 8000 }, { x: 12000, y: 8000 }, { x: 18000, y: 8000 }
  ]
  
  kolomPosities.forEach((pos, i) => {
    elementen.push({
      id: `K${i + 1}`,
      type: 'kolom',
      profielNaam: 'HEB 300',
      lengte: 6000,
      gewicht: 550,
      positie: { x: pos.x, y: pos.y, z: 0 },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 0,
      conditie: ['goed', 'goed', 'matig', 'goed', 'goed', 'matig', 'goed', 'slecht'][i] as any,
      oogstVolgorde: 0, // Bepaald door afhankelijkheden
      status: 'wacht',
      afhankelijkheden: [], // Wordt later ingevuld
      risico: 'hoog',
      geschatteTijd: 45,
      benodigd: { kraan: true, steiger: true, personen: 4 }
    })
  })
  
  // Dakliggers (horizontaal bovenaan, moeten eerst)
  for (let i = 0; i < 4; i++) {
    elementen.push({
      id: `DL${i + 1}`,
      type: 'ligger',
      profielNaam: 'IPE 300',
      lengte: 8000,
      gewicht: 340,
      positie: { x: i * 6000, y: 0, z: 6000 },
      rotatie: { x: 0, y: 90, z: 0 },
      verdieping: 1,
      conditie: ['goed', 'matig', 'goed', 'goed'][i] as any,
      oogstVolgorde: i + 1,
      status: 'wacht',
      afhankelijkheden: [],
      risico: 'gemiddeld',
      geschatteTijd: 25,
      benodigd: { kraan: true, steiger: false, personen: 2 }
    })
  }
  
  // Dakbalken (horizontaal in lengterichting)
  for (let i = 0; i < 3; i++) {
    elementen.push({
      id: `DB${i + 1}`,
      type: 'balk',
      profielNaam: 'HEA 280',
      lengte: 6000,
      gewicht: 430,
      positie: { x: i * 6000, y: 4000, z: 6000 },
      rotatie: { x: 0, y: 0, z: 0 },
      verdieping: 1,
      conditie: ['goed', 'goed', 'matig'][i] as any,
      oogstVolgorde: i + 5,
      status: 'wacht',
      afhankelijkheden: [`DL${i + 1}`, `DL${i + 2}`],
      risico: 'gemiddeld',
      geschatteTijd: 30,
      benodigd: { kraan: true, steiger: false, personen: 2 }
    })
  }
  
  // Windverbanden (diagonaal)
  const windPosities = [
    { x: 0, y: 0, afhankelijk: ['DB1'] },
    { x: 12000, y: 0, afhankelijk: ['DB3'] },
    { x: 0, y: 8000, afhankelijk: ['DB1'] },
    { x: 12000, y: 8000, afhankelijk: ['DB3'] }
  ]
  
  windPosities.forEach((pos, i) => {
    elementen.push({
      id: `WV${i + 1}`,
      type: 'windverband',
      profielNaam: 'L 100x100x10',
      lengte: 7200,
      gewicht: 110,
      positie: { x: pos.x, y: pos.y, z: 3000 },
      rotatie: { x: 45, y: 0, z: 0 },
      verdieping: 0,
      conditie: 'goed',
      oogstVolgorde: i + 8,
      status: 'wacht',
      afhankelijkheden: pos.afhankelijk,
      risico: 'laag',
      geschatteTijd: 15,
      benodigd: { kraan: false, steiger: true, personen: 2 }
    })
  })
  
  // Schoren
  for (let i = 0; i < 4; i++) {
    elementen.push({
      id: `SC${i + 1}`,
      type: 'schoor',
      profielNaam: 'HEA 160',
      lengte: 3500,
      gewicht: 120,
      positie: { x: i * 6000, y: 0, z: 4500 },
      rotatie: { x: -30, y: 0, z: 0 },
      verdieping: 0,
      conditie: ['goed', 'matig', 'goed', 'goed'][i] as any,
      oogstVolgorde: i + 12,
      status: 'wacht',
      afhankelijkheden: [`WV${Math.min(i + 1, 4)}`],
      risico: 'laag',
      geschatteTijd: 20,
      benodigd: { kraan: false, steiger: true, personen: 2 }
    })
  }
  
  // Update kolom afhankelijkheden (kolommen zijn afhankelijk van alles erboven)
  const kolomIds = elementen.filter(e => e.type === 'kolom').map(e => e.id)
  const nietKolomIds = elementen.filter(e => e.type !== 'kolom').map(e => e.id)
  
  kolomIds.forEach((kId, i) => {
    const kolom = elementen.find(e => e.id === kId)!
    kolom.afhankelijkheden = nietKolomIds
    kolom.oogstVolgorde = 16 + i
  })
  
  // Fasen
  const fasen: OogstFase[] = [
    {
      id: 1,
      naam: 'Fase 1: Dakliggers',
      beschrijving: 'Verwijderen van dakliggers en gordingen. Start aan de randen.',
      elementen: ['DL1', 'DL2', 'DL3', 'DL4'],
      geschatteTijd: 100,
      veiligheidsNiveau: 'geel'
    },
    {
      id: 2,
      naam: 'Fase 2: Dakbalken',
      beschrijving: 'Verwijderen van hoofddakbalken na demontage liggers.',
      elementen: ['DB1', 'DB2', 'DB3'],
      geschatteTijd: 90,
      veiligheidsNiveau: 'geel'
    },
    {
      id: 3,
      naam: 'Fase 3: Windverbanden',
      beschrijving: 'Demontage van diagonale windverbanden.',
      elementen: ['WV1', 'WV2', 'WV3', 'WV4'],
      geschatteTijd: 60,
      veiligheidsNiveau: 'groen'
    },
    {
      id: 4,
      naam: 'Fase 4: Schoren',
      beschrijving: 'Verwijderen van schoren voordat kolommen worden gedemonteerd.',
      elementen: ['SC1', 'SC2', 'SC3', 'SC4'],
      geschatteTijd: 80,
      veiligheidsNiveau: 'groen'
    },
    {
      id: 5,
      naam: 'Fase 5: Kolommen',
      beschrijving: 'Finale fase: gecontroleerd neerhalen van kolommen. Hoogste risico.',
      elementen: kolomIds,
      geschatteTijd: 360,
      veiligheidsNiveau: 'rood'
    }
  ]
  
  return { elementen, fasen }
}

const { elementen: OOGST_ELEMENTEN, fasen: OOGST_FASEN } = createOogstGebouw()

// Kleuren
const CONDITIE_KLEUREN = {
  goed: '#22c55e',
  matig: '#f59e0b',
  slecht: '#ef4444'
}

const STATUS_KLEUREN = {
  wacht: '#6b7280',
  actief: '#f59e0b',
  geoogst: '#22c55e'
}

const RISICO_KLEUREN = {
  laag: '#22c55e',
  gemiddeld: '#f59e0b',
  hoog: '#ef4444'
}

const FASE_KLEUREN = {
  groen: '#22c55e',
  geel: '#f59e0b',
  rood: '#ef4444'
}

// 3D Element component
function OogstElement3D({ 
  element, 
  selected, 
  highlighted,
  showVolgorde,
  animatieProgress,
  onClick
}: { 
  element: OogstElement
  selected: boolean
  highlighted: boolean
  showVolgorde: boolean
  animatieProgress: number // 0-1 voor geoogste elementen
  onClick: () => void
}) {
  const ref = useRef<THREE.Group>(null)
  const isKolom = element.type === 'kolom'
  const scale = 0.001
  
  // Bereken dimensies
  const profielGrootte = parseFloat(element.profielNaam.match(/\d+/)?.[0] || '200') * scale * 0.8
  const lengteM = element.lengte * scale
  
  let width = profielGrootte
  let height = isKolom ? lengteM : profielGrootte
  let depth = isKolom ? profielGrootte : lengteM
  
  // Positie
  let posX = element.positie.x * scale
  let posY = element.positie.z * scale + (isKolom ? lengteM / 2 : profielGrootte / 2)
  let posZ = element.positie.y * scale
  
  // Animatie voor geoogste elementen (vallen)
  if (element.status === 'geoogst') {
    const fallProgress = Math.min(animatieProgress * 2, 1)
    posY = posY * (1 - fallProgress) - fallProgress * 2
  }
  
  // Kleur op basis van status
  let color = CONDITIE_KLEUREN[element.conditie]
  if (element.status === 'geoogst') color = '#22c55e'
  if (element.status === 'actief') color = '#f59e0b'
  if (selected) color = '#ffffff'
  if (highlighted) color = '#a78bfa'
  
  // Opacity voor geoogste elementen
  const opacity = element.status === 'geoogst' ? Math.max(0, 1 - animatieProgress) : 1

  return (
    <group ref={ref}>
      <mesh
        position={[posX, posY, posZ]}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        visible={opacity > 0.1}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          color={color}
          metalness={0.6}
          roughness={0.3}
          transparent
          opacity={opacity}
          emissive={selected || highlighted ? color : element.status === 'actief' ? '#f59e0b' : '#000000'}
          emissiveIntensity={selected ? 0.5 : highlighted ? 0.3 : element.status === 'actief' ? 0.3 : 0}
        />
      </mesh>
      
      {/* Volgorde nummer */}
      {showVolgorde && element.oogstVolgorde > 0 && element.status !== 'geoogst' && (
        <Text
          position={[posX, posY + height/2 + 0.3, posZ]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {element.oogstVolgorde}
        </Text>
      )}
      
      {/* Status indicator */}
      {element.status === 'actief' && (
        <mesh position={[posX, posY + height/2 + 0.1, posZ]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      )}
    </group>
  )
}

// Afhankelijkheidslijnen
function AfhankelijkheidsLijnen({ 
  elementen, 
  selectedElement,
  show
}: { 
  elementen: OogstElement[]
  selectedElement: OogstElement | null
  show: boolean
}) {
  if (!show || !selectedElement) return null
  
  const scale = 0.001
  const lines: { start: [number, number, number]; end: [number, number, number] }[] = []
  
  selectedElement.afhankelijkheden.forEach(depId => {
    const dep = elementen.find(e => e.id === depId)
    if (!dep) return
    
    const isKolom1 = selectedElement.type === 'kolom'
    const isKolom2 = dep.type === 'kolom'
    
    const start: [number, number, number] = [
      selectedElement.positie.x * scale,
      selectedElement.positie.z * scale + (isKolom1 ? selectedElement.lengte * scale / 2 : 0),
      selectedElement.positie.y * scale
    ]
    
    const end: [number, number, number] = [
      dep.positie.x * scale,
      dep.positie.z * scale + (isKolom2 ? dep.lengte * scale / 2 : 0),
      dep.positie.y * scale
    ]
    
    lines.push({ start, end })
  })

  return (
    <>
      {lines.map((line, i) => (
        <Line
          key={i}
          points={[line.start, line.end]}
          color="#ef4444"
          lineWidth={2}
          dashed
          dashScale={10}
        />
      ))}
    </>
  )
}

// Scene
function Scene({ 
  elementen, 
  selectedId,
  highlightedFase,
  onSelect,
  showVolgorde,
  showAfhankelijkheden,
  animatieProgress
}: { 
  elementen: OogstElement[]
  selectedId: string | null
  highlightedFase: number | null
  onSelect: (id: string | null) => void
  showVolgorde: boolean
  showAfhankelijkheden: boolean
  animatieProgress: Record<string, number>
}) {
  const selectedElement = elementen.find(e => e.id === selectedId)
  
  // Bepaal welke elementen gehighlight moeten worden
  const highlightedIds = highlightedFase 
    ? OOGST_FASEN.find(f => f.id === highlightedFase)?.elementen || []
    : []

  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />
      <OrbitControls 
        target={[9, 3, 4]} 
        enablePan 
        enableZoom 
        enableRotate 
        maxPolarAngle={Math.PI / 2.1}
      />
      
      <Environment preset="city" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[20, 30, 20]} intensity={1} castShadow />
      <directionalLight position={[-10, 20, -10]} intensity={0.3} />
      
      {/* Grid */}
      <gridHelper args={[30, 30, '#334155', '#1e293b']} position={[9, 0, 4]} />
      
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[9, -0.01, 4]} receiveShadow>
        <planeGeometry args={[25, 15]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      
      {/* Elementen */}
      {elementen.map((element) => (
        <OogstElement3D
          key={element.id}
          element={element}
          selected={selectedId === element.id}
          highlighted={highlightedIds.includes(element.id)}
          showVolgorde={showVolgorde}
          animatieProgress={animatieProgress[element.id] || 0}
          onClick={() => onSelect(selectedId === element.id ? null : element.id)}
        />
      ))}
      
      {/* Afhankelijkheidslijnen */}
      <AfhankelijkheidsLijnen 
        elementen={elementen}
        selectedElement={selectedElement || null}
        show={showAfhankelijkheden}
      />
    </>
  )
}

// Element detail panel
function ElementDetailPanel({ element, onClose }: { element: OogstElement; onClose: () => void }) {
  return (
    <div className="absolute right-4 top-4 w-80 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <span className="text-lg">{element.id}</span>
          <span className="text-sm text-gray-400 capitalize">({element.type})</span>
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Profiel */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-white">{element.profielNaam}</p>
          <p className="text-blue-100 text-sm">{element.lengte}mm • {element.gewicht}kg</p>
        </div>
        
        {/* Status & Volgorde */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="rounded-lg p-3 text-center"
            style={{ backgroundColor: STATUS_KLEUREN[element.status] + '30' }}
          >
            <p className="text-xs text-gray-400">Status</p>
            <p className="font-medium capitalize" style={{ color: STATUS_KLEUREN[element.status] }}>
              {element.status}
            </p>
          </div>
          <div className="bg-gray-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400">Volgorde</p>
            <p className="text-xl font-bold text-white">#{element.oogstVolgorde || '-'}</p>
          </div>
        </div>
        
        {/* Conditie & Risico */}
        <div className="grid grid-cols-2 gap-3">
          <div 
            className="rounded-lg p-3"
            style={{ backgroundColor: CONDITIE_KLEUREN[element.conditie] + '30' }}
          >
            <p className="text-xs text-gray-400">Conditie</p>
            <p className="font-medium capitalize" style={{ color: CONDITIE_KLEUREN[element.conditie] }}>
              {element.conditie}
            </p>
          </div>
          <div 
            className="rounded-lg p-3"
            style={{ backgroundColor: RISICO_KLEUREN[element.risico] + '30' }}
          >
            <p className="text-xs text-gray-400">Risico</p>
            <p className="font-medium capitalize" style={{ color: RISICO_KLEUREN[element.risico] }}>
              {element.risico}
            </p>
          </div>
        </div>
        
        {/* Benodigdheden */}
        <div className="bg-gray-700 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">Benodigdheden</p>
          <div className="flex flex-wrap gap-2">
            {element.benodigd.kraan && (
              <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs flex items-center gap-1">
                <Truck className="w-3 h-3" /> Kraan
              </span>
            )}
            {element.benodigd.steiger && (
              <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs flex items-center gap-1">
                <Layers className="w-3 h-3" /> Steiger
              </span>
            )}
            <span className="px-2 py-1 bg-green-900/50 text-green-300 rounded text-xs flex items-center gap-1">
              <Users className="w-3 h-3" /> {element.benodigd.personen} personen
            </span>
          </div>
        </div>
        
        {/* Tijd */}
        <div className="bg-gray-700 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400 text-sm">Geschatte tijd</span>
          </div>
          <span className="text-white font-medium">{element.geschatteTijd} min</span>
        </div>
        
        {/* Afhankelijkheden */}
        {element.afhankelijkheden.length > 0 && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-3">
            <p className="text-xs text-red-400 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Eerst verwijderen:
            </p>
            <div className="flex flex-wrap gap-1">
              {element.afhankelijkheden.map(depId => (
                <span key={depId} className="px-2 py-1 bg-red-900/50 text-red-300 rounded text-xs">
                  {depId}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Main component
export default function OogstViewer3DPage() {
  const [elementen, setElementen] = useState<OogstElement[]>(OOGST_ELEMENTEN)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [highlightedFase, setHighlightedFase] = useState<number | null>(null)
  const [showVolgorde, setShowVolgorde] = useState(true)
  const [showAfhankelijkheden, setShowAfhankelijkheden] = useState(true)
  const [isSimulating, setIsSimulating] = useState(false)
  const [currentFase, setCurrentFase] = useState(0)
  const [animatieProgress, setAnimatieProgress] = useState<Record<string, number>>({})
  
  const selectedElement = elementen.find(e => e.id === selectedId)
  
  // Simulatie
  useEffect(() => {
    if (!isSimulating) return
    
    const interval = setInterval(() => {
      setElementen(prev => {
        const newElementen = [...prev]
        const fase = OOGST_FASEN[currentFase]
        if (!fase) {
          setIsSimulating(false)
          return prev
        }
        
        // Vind eerste niet-geoogste element in huidige fase
        const activeElement = fase.elementen.find(id => {
          const el = newElementen.find(e => e.id === id)
          return el && el.status !== 'geoogst'
        })
        
        if (!activeElement) {
          // Fase klaar, naar volgende
          setCurrentFase(c => c + 1)
          return prev
        }
        
        // Update status
        const elIndex = newElementen.findIndex(e => e.id === activeElement)
        if (newElementen[elIndex].status === 'wacht') {
          newElementen[elIndex] = { ...newElementen[elIndex], status: 'actief' }
        } else if (newElementen[elIndex].status === 'actief') {
          newElementen[elIndex] = { ...newElementen[elIndex], status: 'geoogst' }
          // Start animatie
          setAnimatieProgress(prev => ({ ...prev, [activeElement]: 0 }))
        }
        
        return newElementen
      })
    }, 1500)
    
    return () => clearInterval(interval)
  }, [isSimulating, currentFase])
  
  // Animatie progress
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatieProgress(prev => {
        const newProgress = { ...prev }
        let changed = false
        Object.keys(newProgress).forEach(key => {
          if (newProgress[key] < 1) {
            newProgress[key] = Math.min(1, newProgress[key] + 0.05)
            changed = true
          }
        })
        return changed ? newProgress : prev
      })
    }, 50)
    return () => clearInterval(interval)
  }, [])
  
  // Reset functie
  const resetSimulatie = () => {
    setIsSimulating(false)
    setCurrentFase(0)
    setAnimatieProgress({})
    setElementen(OOGST_ELEMENTEN.map(e => ({ ...e, status: 'wacht' as const })))
  }
  
  // Stats
  const stats = useMemo(() => {
    const geoogst = elementen.filter(e => e.status === 'geoogst').length
    const actief = elementen.filter(e => e.status === 'actief').length
    const totaal = elementen.length
    const totaalGewicht = elementen.reduce((sum, e) => sum + e.gewicht, 0)
    const geoogstGewicht = elementen.filter(e => e.status === 'geoogst').reduce((sum, e) => sum + e.gewicht, 0)
    const totaalTijd = OOGST_FASEN.reduce((sum, f) => sum + f.geschatteTijd, 0)
    
    return { geoogst, actief, totaal, totaalGewicht, geoogstGewicht, totaalTijd }
  }, [elementen])

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Scissors className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">3D Oogst Planning</h1>
              <p className="text-sm text-gray-400">Interactieve demontage simulatie</p>
            </div>
          </div>
          
          {/* Simulatie controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isSimulating 
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isSimulating ? 'Pauze' : 'Start Simulatie'}
            </button>
            <button
              onClick={resetSimulatie}
              className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Fasen */}
        <div className="w-80 bg-gray-800/50 border-r border-gray-700 overflow-y-auto p-4 space-y-4">
          {/* Progress */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Oogst Voortgang</h4>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-teal-400 transition-all duration-300"
                style={{ width: `${stats.geoogst / stats.totaal * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{stats.geoogst} / {stats.totaal} elementen</span>
              <span className="text-green-400">{Math.round(stats.geoogst / stats.totaal * 100)}%</span>
            </div>
          </div>
          
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Weight className="w-3 h-3" /> Gewicht
              </div>
              <p className="text-lg font-bold text-white">{(stats.geoogstGewicht/1000).toFixed(1)}t</p>
              <p className="text-xs text-gray-500">van {(stats.totaalGewicht/1000).toFixed(1)}t</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Timer className="w-3 h-3" /> Totale tijd
              </div>
              <p className="text-lg font-bold text-white">{Math.round(stats.totaalTijd/60)}u</p>
              <p className="text-xs text-gray-500">{stats.totaalTijd} minuten</p>
            </div>
          </div>
          
          {/* Fasen */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Demontage Fasen</h4>
            {OOGST_FASEN.map((fase, i) => {
              const faseElementen = elementen.filter(e => fase.elementen.includes(e.id))
              const klaar = faseElementen.filter(e => e.status === 'geoogst').length
              const isActive = i === currentFase
              const isDone = klaar === fase.elementen.length
              
              return (
                <button
                  key={fase.id}
                  onClick={() => setHighlightedFase(highlightedFase === fase.id ? null : fase.id)}
                  onMouseEnter={() => setHighlightedFase(fase.id)}
                  onMouseLeave={() => setHighlightedFase(null)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    highlightedFase === fase.id 
                      ? 'bg-purple-600/20 border-purple-500' 
                      : isActive 
                        ? 'bg-yellow-600/20 border-yellow-500' 
                        : isDone 
                          ? 'bg-green-600/10 border-green-800' 
                          : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-white text-sm">{fase.naam}</span>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: FASE_KLEUREN[fase.veiligheidsNiveau] }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{fase.beschrijving}</p>
                  
                  {/* Mini progress */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${klaar / fase.elementen.length * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400">{klaar}/{fase.elementen.length}</span>
                  </div>
                  
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{fase.geschatteTijd} min</span>
                    {isDone && <CheckCircle2 className="w-3 h-3 text-green-400 ml-auto" />}
                    {isActive && <span className="text-yellow-400 ml-auto">Actief</span>}
                  </div>
                </button>
              )
            })}
          </div>
          
          {/* Veiligheid legenda */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-gray-400" />
              <h4 className="text-sm font-medium text-gray-300">Veiligheidsniveaus</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-300">Groen - Standaard veiligheid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-xs text-gray-300">Geel - Extra aandacht vereist</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-gray-300">Rood - Hoog risico</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas shadows className="bg-gray-900">
            <Scene 
              elementen={elementen}
              selectedId={selectedId}
              highlightedFase={highlightedFase}
              onSelect={setSelectedId}
              showVolgorde={showVolgorde}
              showAfhankelijkheden={showAfhankelijkheden}
              animatieProgress={animatieProgress}
            />
          </Canvas>
          
          {/* Controls */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <button
              onClick={() => setShowVolgorde(!showVolgorde)}
              className={`px-3 py-2 rounded-lg backdrop-blur transition-colors flex items-center gap-2 ${
                showVolgorde ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300'
              }`}
            >
              <span className="text-sm font-medium">#</span>
              <span className="text-sm">Volgorde</span>
            </button>
            <button
              onClick={() => setShowAfhankelijkheden(!showAfhankelijkheden)}
              className={`px-3 py-2 rounded-lg backdrop-blur transition-colors flex items-center gap-2 ${
                showAfhankelijkheden ? 'bg-red-600 text-white' : 'bg-gray-800/80 text-gray-300'
              }`}
            >
              <ArrowDown className="w-4 h-4" />
              <span className="text-sm">Afhankelijkheden</span>
            </button>
          </div>
          
          {/* Current fase indicator */}
          {isSimulating && currentFase < OOGST_FASEN.length && (
            <div className="absolute top-4 left-4 bg-yellow-600/90 backdrop-blur rounded-lg px-4 py-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-white font-medium">
                {OOGST_FASEN[currentFase].naam}
              </span>
            </div>
          )}
          
          {/* Element detail panel */}
          {selectedElement && (
            <ElementDetailPanel element={selectedElement} onClose={() => setSelectedId(null)} />
          )}
          
          {/* Navigation help */}
          <div className="absolute bottom-4 right-4 bg-gray-800/80 backdrop-blur rounded-lg p-3 text-xs text-gray-400">
            <p className="mb-1">🖱️ Links: Roteren</p>
            <p className="mb-1">🖱️ Rechts: Pannen</p>
            <p>🖱️ Scroll: Zoomen</p>
          </div>
        </div>
      </div>
    </div>
  )
}
