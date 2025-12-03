import { useState, useMemo, useCallback, Suspense, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Environment, Html } from '@react-three/drei'
import * as THREE from 'three'
import {
  ArrowLeft,
  Scissors,
  SkipForward,
  CheckCircle,
  AlertTriangle,
  Move,
  Eye,
  EyeOff,
  Layers,
  List,
  ChevronUp,
  ChevronDown,
  Save,
  RotateCcw,
  Info,
  Wrench,
  Clock,
  Weight,
  Ruler
} from 'lucide-react'
import { MOCK_GEBOUWEN } from '../data/mockBuildings'

// Types
interface Snijpunt {
  id: string
  positie: [number, number, number]
  type: 'zaag' | 'slijp' | 'autogeen' | 'plasma'
  notitie?: string
}

interface DemontageElement {
  id: string
  profielNaam: string
  lengte: number
  gewicht: number
  positie: { x: number; y: number; z: number }
  rotatie: { x: number; y: number; z: number }
  volgorde: number
  status: 'wachten' | 'actief' | 'voltooid' | 'overslaan'
  snijpunten: Snijpunt[]
  afhankelijkheden: string[]
  instructies: string[]
  geschatteTijd: number // minuten
  risico: 'laag' | 'middel' | 'hoog'
}

interface PlanningState {
  modus: 'planning' | 'uitvoering' | 'review'
  actieveStap: number
  toonVoltooid: boolean
  toonSnijpunten: boolean
  geselecteerdElement: string | null
  snijpuntModus: boolean
}

// Snijpunt marker in 3D
function SnijpuntMarker({ 
  positie, 
  type,
  isActief,
  onClick
}: { 
  positie: [number, number, number]
  type: Snijpunt['type']
  isActief?: boolean
  onClick?: () => void
}) {
  const markerRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (markerRef.current && isActief) {
      markerRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1)
    }
  })

  const kleur = {
    zaag: '#ef4444',
    slijp: '#f59e0b',
    autogeen: '#3b82f6',
    plasma: '#8b5cf6'
  }[type]

  return (
    <group position={positie}>
      <mesh ref={markerRef} onClick={onClick}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color={kleur} 
          emissive={kleur}
          emissiveIntensity={isActief ? 0.8 : 0.3}
        />
      </mesh>
      {/* Snijlijn indicator */}
      <mesh rotation={[0, 0, Math.PI / 4]}>
        <ringGeometry args={[0.2, 0.25, 32]} />
        <meshBasicMaterial color={kleur} side={THREE.DoubleSide} transparent opacity={0.5} />
      </mesh>
      {isActief && (
        <Html center distanceFactor={10}>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
            <Scissors className="w-3 h-3 inline mr-1" />
            {type.charAt(0).toUpperCase() + type.slice(1)} snede
          </div>
        </Html>
      )}
    </group>
  )
}

// 3D Element component
function Element3D({
  element,
  isActief,
  isGeselecteerd,
  isVoltooid,
  toonSnijpunten,
  onClick
}: {
  element: DemontageElement
  isActief: boolean
  isGeselecteerd: boolean
  isVoltooid: boolean
  toonSnijpunten: boolean
  onClick: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  const { positie3D, lengte3D, profielGrootte } = useMemo(() => {
    // Gebruik directe positie en rotatie uit element
    const positie3D = new THREE.Vector3(element.positie.x, element.positie.y, element.positie.z)
    const lengte3D = element.lengte / 1000 // Convert mm naar meters
    
    // Bepaal profiel grootte op basis van naam
    let size = 0.2
    if (element.profielNaam.includes('HEB') || element.profielNaam.includes('HEA')) {
      const match = element.profielNaam.match(/\d+/)
      if (match) size = parseInt(match[0]) / 1000
    } else if (element.profielNaam.includes('IPE')) {
      const match = element.profielNaam.match(/\d+/)
      if (match) size = parseInt(match[0]) / 1500
    }
    
    return { positie3D, lengte3D, profielGrootte: size }
  }, [element.positie, element.lengte, element.profielNaam])

  // Rotatie uit element
  const euler = useMemo(() => {
    return new THREE.Euler(
      element.rotatie.x * Math.PI / 180,
      element.rotatie.y * Math.PI / 180,
      element.rotatie.z * Math.PI / 180
    )
  }, [element.rotatie])

  // Kleur op basis van status
  const kleur = useMemo(() => {
    if (isVoltooid) return '#22c55e'
    if (element.status === 'overslaan') return '#9ca3af'
    if (isActief) return '#3b82f6'
    if (isGeselecteerd) return '#f59e0b'
    
    // Kleur op basis van volgorde
    const hue = (element.volgorde * 30) % 360
    return `hsl(${hue}, 60%, 50%)`
  }, [isVoltooid, element.status, isActief, isGeselecteerd, element.volgorde])

  // Pulseer effect voor actief element
  useFrame((state) => {
    if (meshRef.current && isActief) {
      meshRef.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05
      meshRef.current.scale.z = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05
    }
  })

  const opacity = isVoltooid ? 0.3 : element.status === 'overslaan' ? 0.2 : 1

  return (
    <group position={positie3D} rotation={euler}>
      {/* Hoofd balk */}
      <mesh
        ref={meshRef}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          onClick()
        }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[profielGrootte, lengte3D, profielGrootte]} />
        <meshStandardMaterial 
          color={kleur}
          transparent
          opacity={opacity}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      {/* Volgorde nummer */}
      {!isVoltooid && element.status !== 'overslaan' && (
        <Html center position={[0, lengte3D / 2 + 0.3, 0]} distanceFactor={8}>
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg
            ${isActief ? 'bg-blue-600 ring-4 ring-blue-300 animate-pulse' : 
              isGeselecteerd ? 'bg-amber-500' : 'bg-gray-600'}
          `}>
            {element.volgorde}
          </div>
        </Html>
      )}

      {/* Snijpunten */}
      {toonSnijpunten && element.snijpunten.map((snijpunt) => (
        <SnijpuntMarker
          key={snijpunt.id}
          positie={[
            snijpunt.positie[0] - positie3D.x,
            snijpunt.positie[1] - positie3D.y + lengte3D / 2,
            snijpunt.positie[2] - positie3D.z
          ]}
          type={snijpunt.type}
          isActief={isActief}
        />
      ))}

      {/* Actief element highlight */}
      {isActief && (
        <mesh>
          <boxGeometry args={[profielGrootte + 0.1, lengte3D + 0.1, profielGrootte + 0.1]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} wireframe />
        </mesh>
      )}
    </group>
  )
}

// 3D Scene
function DemontageScene({
  elementen,
  planning,
  onElementClick
}: {
  elementen: DemontageElement[]
  planning: PlanningState
  onElementClick: (id: string) => void
}) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <Environment preset="warehouse" />
      
      {/* Vloer grid */}
      <gridHelper args={[50, 50, '#666666', '#444444']} position={[0, 0, 0]} />
      
      {/* Elementen */}
      {elementen
        .filter(e => planning.toonVoltooid || e.status !== 'voltooid')
        .map((element) => (
          <Element3D
            key={element.id}
            element={element}
            isActief={element.volgorde === planning.actieveStap}
            isGeselecteerd={element.id === planning.geselecteerdElement}
            isVoltooid={element.status === 'voltooid'}
            toonSnijpunten={planning.toonSnijpunten}
            onClick={() => onElementClick(element.id)}
          />
        ))}

      <OrbitControls 
        makeDefault
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

// Instructie Panel component
function InstructiePanel({
  element,
  onVolgende,
  onVoltooid
}: {
  element: DemontageElement | undefined
  onVolgende: () => void
  onVoltooid: () => void
}) {
  if (!element) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900">Alle stappen voltooid!</h3>
        <p className="text-gray-500 text-sm mt-1">De demontage planning is afgerond.</p>
      </div>
    )
  }

  const risicoKleur = {
    laag: 'bg-green-100 text-green-700',
    middel: 'bg-amber-100 text-amber-700',
    hoog: 'bg-red-100 text-red-700'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
            Stap {element.volgorde}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${risicoKleur[element.risico]}`}>
            {element.risico.charAt(0).toUpperCase() + element.risico.slice(1)} risico
          </span>
        </div>
        <h3 className="text-xl font-bold">{element.profielNaam}</h3>
        <p className="text-blue-100 text-sm">Element ID: {element.id}</p>
      </div>

      {/* Element info */}
      <div className="p-4 grid grid-cols-3 gap-4 bg-gray-50 border-b">
        <div className="text-center">
          <Ruler className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{element.lengte} mm</p>
          <p className="text-xs text-gray-500">Lengte</p>
        </div>
        <div className="text-center">
          <Weight className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{element.gewicht} kg</p>
          <p className="text-xs text-gray-500">Gewicht</p>
        </div>
        <div className="text-center">
          <Clock className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-lg font-bold text-gray-900">{element.geschatteTijd} min</p>
          <p className="text-xs text-gray-500">Geschatte tijd</p>
        </div>
      </div>

      {/* Snijpunten */}
      {element.snijpunten.length > 0 && (
        <div className="p-4 border-b">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Scissors className="w-4 h-4 text-red-500" />
            Snijpunten ({element.snijpunten.length})
          </h4>
          <div className="space-y-2">
            {element.snijpunten.map((snijpunt, idx) => (
              <div key={snijpunt.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-lg">
                <span className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {idx + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900 capitalize">{snijpunt.type} snede</p>
                  {snijpunt.notitie && (
                    <p className="text-xs text-gray-500">{snijpunt.notitie}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructies */}
      <div className="p-4 border-b">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-blue-500" />
          Werkinstructies
        </h4>
        <ol className="space-y-2">
          {element.instructies.map((instructie, idx) => (
            <li key={idx} className="flex gap-3">
              <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                {idx + 1}
              </span>
              <span className="text-gray-700">{instructie}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Afhankelijkheden */}
      {element.afhankelijkheden.length > 0 && (
        <div className="p-4 border-b bg-amber-50">
          <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Let op: Afhankelijkheden
          </h4>
          <p className="text-sm text-amber-700">
            Dit element kan pas verwijderd worden nadat de volgende elementen zijn verwijderd: {element.afhankelijkheden.join(', ')}
          </p>
        </div>
      )}

      {/* Acties */}
      <div className="p-4 flex gap-3">
        <button
          onClick={onVoltooid}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          <CheckCircle className="w-5 h-5" />
          Markeer Voltooid
        </button>
        <button
          onClick={onVolgende}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Volgende
          <SkipForward className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

// Volgorde Editor component
function VolgordeEditor({
  elementen,
  onVolgordeWijzig,
  geselecteerdElement,
  onSelecteer
}: {
  elementen: DemontageElement[]
  onVolgordeWijzig: (elementId: string, nieuweVolgorde: number) => void
  geselecteerdElement: string | null
  onSelecteer: (id: string) => void
}) {
  const gesorteerd = [...elementen].sort((a, b) => a.volgorde - b.volgorde)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <List className="w-5 h-5" />
          Demontage Volgorde
        </h3>
        <p className="text-sm text-gray-500 mt-1">Klik op pijlen om volgorde aan te passen</p>
      </div>
      
      <div className="max-h-96 overflow-y-auto">
        {gesorteerd.map((element) => (
          <div
            key={element.id}
            onClick={() => onSelecteer(element.id)}
            className={`
              flex items-center gap-3 p-3 border-b cursor-pointer transition-colors
              ${geselecteerdElement === element.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
              ${element.status === 'voltooid' ? 'opacity-50' : ''}
            `}
          >
            {/* Volgorde controls */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (element.volgorde > 1) {
                    onVolgordeWijzig(element.id, element.volgorde - 1)
                  }
                }}
                disabled={element.volgorde === 1}
                className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
              >
                <ChevronUp className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onVolgordeWijzig(element.id, element.volgorde + 1)
                }}
                disabled={element.volgorde === elementen.length}
                className="p-0.5 hover:bg-gray-200 rounded disabled:opacity-30"
              >
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Volgorde nummer */}
            <span className={`
              w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
              ${element.status === 'voltooid' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}
            `}>
              {element.volgorde}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{element.profielNaam}</p>
              <p className="text-xs text-gray-500">{element.lengte}mm • {element.gewicht}kg</p>
            </div>

            {/* Status */}
            {element.status === 'voltooid' && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {element.snijpunten.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <Scissors className="w-3 h-3" />
                {element.snijpunten.length}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Hoofd component
export default function OperatorDemontagePage() {
  const { gebouwId } = useParams<{ gebouwId: string }>()
  const navigate = useNavigate()

  // Gebouw data
  const gebouw = useMemo(() => {
    return MOCK_GEBOUWEN.find(g => g.id === gebouwId) || MOCK_GEBOUWEN[0]
  }, [gebouwId])

  // Genereer demontage elementen uit gebouw elementen
  const [elementen, setElementen] = useState<DemontageElement[]>(() => {
    return gebouw.elementen.map((el, idx) => ({
      id: el.id,
      profielNaam: el.profielNaam,
      lengte: el.lengte,
      gewicht: el.gewicht,
      positie: el.positie,
      rotatie: el.rotatie,
      volgorde: idx + 1,
      status: 'wachten' as const,
      snijpunten: idx % 3 === 0 ? [
        {
          id: `snij-${el.id}-1`,
          positie: [el.positie.x, el.positie.y + 0.5, el.positie.z] as [number, number, number],
          type: (['zaag', 'slijp', 'autogeen', 'plasma'] as const)[idx % 4],
          notitie: 'Snij aan kopzijde'
        }
      ] : [],
      afhankelijkheden: idx > 2 && idx % 4 === 0 ? [gebouw.elementen[idx - 1]?.id].filter(Boolean) : [],
      instructies: [
        'Controleer of het element vrij is van kabels en leidingen',
        'Bevestig hijsband op aangegeven punten',
        idx % 3 === 0 ? 'Maak de benodigde snedes volgens markering' : 'Verwijder bevestigingsbouten',
        'Laat element gecontroleerd zakken naar transport niveau',
        'Markeer element met unieke code voor tracking'
      ],
      geschatteTijd: Math.round(el.gewicht / 15) + 10,
      risico: (el.gewicht > 500 ? 'hoog' : el.gewicht > 200 ? 'middel' : 'laag') as 'laag' | 'middel' | 'hoog'
    }))
  })

  // Planning state
  const [planning, setPlanning] = useState<PlanningState>({
    modus: 'planning',
    actieveStap: 1,
    toonVoltooid: true,
    toonSnijpunten: true,
    geselecteerdElement: null,
    snijpuntModus: false
  })

  // Huidige actieve element
  const actiefElement = elementen.find(e => e.volgorde === planning.actieveStap)

  // Handlers
  const handleElementClick = useCallback((id: string) => {
    setPlanning(p => ({ ...p, geselecteerdElement: id }))
  }, [])

  const handleVolgordeWijzig = useCallback((elementId: string, nieuweVolgorde: number) => {
    setElementen(prev => {
      const huidigeElement = prev.find(e => e.id === elementId)
      if (!huidigeElement) return prev

      const huidigeVolgorde = huidigeElement.volgorde
      
      return prev.map(e => {
        if (e.id === elementId) {
          return { ...e, volgorde: nieuweVolgorde }
        }
        if (nieuweVolgorde < huidigeVolgorde) {
          // Element gaat omhoog, anderen schuiven omlaag
          if (e.volgorde >= nieuweVolgorde && e.volgorde < huidigeVolgorde) {
            return { ...e, volgorde: e.volgorde + 1 }
          }
        } else {
          // Element gaat omlaag, anderen schuiven omhoog
          if (e.volgorde <= nieuweVolgorde && e.volgorde > huidigeVolgorde) {
            return { ...e, volgorde: e.volgorde - 1 }
          }
        }
        return e
      })
    })
  }, [])

  const handleVolgende = useCallback(() => {
    setPlanning(p => ({
      ...p,
      actieveStap: Math.min(p.actieveStap + 1, elementen.length)
    }))
  }, [elementen.length])

  const handleVoltooid = useCallback(() => {
    setElementen(prev => prev.map(e => 
      e.volgorde === planning.actieveStap 
        ? { ...e, status: 'voltooid' }
        : e
    ))
    handleVolgende()
  }, [planning.actieveStap, handleVolgende])

  const handleReset = useCallback(() => {
    setElementen(prev => prev.map(e => ({ ...e, status: 'wachten' })))
    setPlanning(p => ({ ...p, actieveStap: 1 }))
  }, [])

  // Statistieken
  const stats = useMemo(() => ({
    totaal: elementen.length,
    voltooid: elementen.filter(e => e.status === 'voltooid').length,
    metSnijpunten: elementen.filter(e => e.snijpunten.length > 0).length,
    totaleSnijpunten: elementen.reduce((s, e) => s + e.snijpunten.length, 0),
    geschatteTijd: elementen.reduce((s, e) => s + e.geschatteTijd, 0),
    hoogRisico: elementen.filter(e => e.risico === 'hoog').length
  }), [elementen])

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/gebouwen`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Operator Demontage Planning</h1>
            <p className="text-sm text-gray-500">{gebouw.naam}</p>
          </div>
        </div>

        {/* Modus switch */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          {(['planning', 'uitvoering'] as const).map(modus => (
            <button
              key={modus}
              onClick={() => setPlanning(p => ({ ...p, modus }))}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                planning.modus === modus 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {modus === 'planning' ? 'Planning' : 'Uitvoering'}
            </button>
          ))}
        </div>

        {/* Acties */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlanning(p => ({ ...p, toonSnijpunten: !p.toonSnijpunten }))}
            className={`p-2 rounded-lg transition-colors ${
              planning.toonSnijpunten ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}
            title="Toon snijpunten"
          >
            <Scissors className="w-5 h-5" />
          </button>
          <button
            onClick={() => setPlanning(p => ({ ...p, toonVoltooid: !p.toonVoltooid }))}
            className={`p-2 rounded-lg transition-colors ${
              planning.toonVoltooid ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
            title="Toon voltooide elementen"
          >
            {planning.toonVoltooid ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            title="Reset planning"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            <Save className="w-4 h-4" />
            Opslaan
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-4 py-2 bg-gray-50 border-b text-sm">
        <span className="flex items-center gap-2 text-gray-600">
          <Layers className="w-4 h-4" />
          {stats.voltooid}/{stats.totaal} elementen
        </span>
        <span className="flex items-center gap-2 text-red-600">
          <Scissors className="w-4 h-4" />
          {stats.totaleSnijpunten} snijpunten
        </span>
        <span className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-4 h-4" />
          {stats.hoogRisico} hoog risico
        </span>
        <span className="flex items-center gap-2 text-gray-600">
          <Clock className="w-4 h-4" />
          ~{Math.floor(stats.geschatteTijd / 60)}u {stats.geschatteTijd % 60}m totaal
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="h-2 w-48 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(stats.voltooid / stats.totaal) * 100}%` }}
            />
          </div>
          <span className="text-gray-600 font-medium">
            {Math.round((stats.voltooid / stats.totaal) * 100)}%
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D View */}
        <div className="flex-1 relative">
          <Canvas shadows camera={{ position: [15, 15, 15], fov: 50 }}>
            <Suspense fallback={null}>
              <DemontageScene
                elementen={elementen}
                planning={planning}
                onElementClick={handleElementClick}
              />
            </Suspense>
          </Canvas>

          {/* 3D Controls overlay */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <div className="bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-sm text-gray-600 shadow-lg">
              <Move className="w-4 h-4 inline mr-2" />
              Sleep om te roteren • Scroll om te zoomen
            </div>
          </div>

          {/* Legenda */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg">
            <h4 className="font-medium text-gray-900 mb-2 text-sm">Legenda</h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded" />
                <span>Actieve stap</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-amber-500 rounded" />
                <span>Geselecteerd</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded opacity-50" />
                <span>Voltooid</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded-full" />
                <span>Snijpunt</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-gray-50 border-l overflow-y-auto p-4 space-y-4">
          {planning.modus === 'planning' ? (
            <>
              <VolgordeEditor
                elementen={elementen}
                onVolgordeWijzig={handleVolgordeWijzig}
                geselecteerdElement={planning.geselecteerdElement}
                onSelecteer={handleElementClick}
              />
              
              {/* Quick info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4" />
                  Planning Tips
                </h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Verwijder eerst elementen zonder afhankelijkheden</li>
                  <li>• Houd rekening met hijscapaciteit en bereik</li>
                  <li>• Groepeer elementen met snijpunten</li>
                </ul>
              </div>
            </>
          ) : (
            <InstructiePanel
              element={actiefElement}
              onVolgende={handleVolgende}
              onVoltooid={handleVoltooid}
            />
          )}
        </div>
      </div>
    </div>
  )
}
