import { useState, useMemo, useCallback, Suspense, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Environment, Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import {
  ArrowLeft,
  Scissors,
  CheckCircle,
  AlertTriangle,
  Move,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Info,
  Clock,
  Weight,
  Ruler,
  Cpu,
  Sparkles,
  ArrowRight,
  Target,
  TrendingUp,
  Factory,
  MousePointer,
  Plus,
  Trash2,
  Play,
  Pause,
  SkipForward,
  List,
  Layers,
  Zap,
  Hand,
  CircleDot,
  X,
  Download,
  FileText,
  ChevronRight,
  Settings
} from 'lucide-react'
import { MOCK_GEBOUWEN } from '../data/mockBuildings'

// Types
interface Snijpunt {
  id: string
  elementId: string
  positie: [number, number, number] // Relatief t.o.v. element
  type: 'zaag' | 'plasma' | 'autogeen' | 'slijp'
}

interface DemontageElement {
  id: string
  profielNaam: string
  lengte: number
  gewicht: number
  positie: { x: number; y: number; z: number }
  rotatie: { x: number; y: number; z: number }
  volgorde: number | null // null = nog niet toegewezen
  type: string // Flexibel type om compatibel te zijn met verschillende element types
  snijpunten: Snijpunt[]
}

type PlanModus = 'selectie' | 'volgorde' | 'snijpunten' | 'review'

// Snijpunt 3D Marker
function SnijpuntMarker3D({ 
  snijpunt, 
  isActief,
  onDelete
}: { 
  snijpunt: Snijpunt
  isActief: boolean
  onDelete: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current && isActief) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 2
    }
  })

  const kleur = {
    zaag: '#ef4444',
    plasma: '#8b5cf6',
    autogeen: '#f59e0b',
    slijp: '#3b82f6'
  }[snijpunt.type]

  return (
    <group position={snijpunt.positie}>
      {/* Snijvlak ring */}
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.25, 0.05, 8, 24]} />
        <meshStandardMaterial color={kleur} emissive={kleur} emissiveIntensity={0.5} />
      </mesh>
      {/* Snijlijn */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.6, 0.02]} />
        <meshBasicMaterial color={kleur} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[Math.PI / 2, Math.PI / 2, 0]}>
        <planeGeometry args={[0.6, 0.02]} />
        <meshBasicMaterial color={kleur} side={THREE.DoubleSide} />
      </mesh>
      {/* Label */}
      <Html center distanceFactor={8} position={[0, 0.4, 0]}>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs flex items-center gap-1 whitespace-nowrap">
          <Scissors className="w-3 h-3" style={{ color: kleur }} />
          <span className="capitalize">{snijpunt.type}</span>
          {isActief && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="ml-1 hover:text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </Html>
    </group>
  )
}

// 3D Element met interactie
function Element3D({
  element,
  isGeselecteerd,
  isHovered,
  volgordeNummer,
  modus,
  snijpuntModus,
  actieveSnijType,
  onSelect,
  onHover,
  onSnijpuntToevoegen,
  onSnijpuntVerwijderen
}: {
  element: DemontageElement
  isGeselecteerd: boolean
  isHovered: boolean
  volgordeNummer: number | null
  modus: PlanModus
  snijpuntModus: boolean
  actieveSnijType: Snijpunt['type']
  onSelect: () => void
  onHover: (hover: boolean) => void
  onSnijpuntToevoegen: (positie: [number, number, number]) => void
  onSnijpuntVerwijderen: (id: string) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [localHover, setLocalHover] = useState(false)
  
  const { positie3D, lengte3D, profielGrootte, euler } = useMemo(() => {
    const positie3D = new THREE.Vector3(element.positie.x, element.positie.y, element.positie.z)
    const lengte3D = element.lengte / 1000
    
    let size = 0.2
    if (element.profielNaam.includes('HEB') || element.profielNaam.includes('HEA')) {
      const match = element.profielNaam.match(/\d+/)
      if (match) size = parseInt(match[0]) / 1000
    } else if (element.profielNaam.includes('IPE')) {
      const match = element.profielNaam.match(/\d+/)
      if (match) size = parseInt(match[0]) / 1500
    }
    
    const euler = new THREE.Euler(
      element.rotatie.x * Math.PI / 180,
      element.rotatie.y * Math.PI / 180,
      element.rotatie.z * Math.PI / 180
    )
    
    return { positie3D, lengte3D, profielGrootte: size, euler }
  }, [element])

  // Kleur bepalen
  const kleur = useMemo(() => {
    if (isGeselecteerd) return '#3b82f6'
    if (isHovered || localHover) return '#60a5fa'
    if (volgordeNummer !== null) {
      // Gradient van groen naar rood op basis van volgorde
      const maxVolgorde = 20 // Aanname
      const ratio = Math.min(volgordeNummer / maxVolgorde, 1)
      const hue = 120 - ratio * 120 // Groen (120) naar Rood (0)
      return `hsl(${hue}, 70%, 45%)`
    }
    // Type-gebaseerde kleur als geen volgorde
    const typeKleuren: Record<string, string> = {
      kolom: '#22c55e',
      ligger: '#3b82f6',
      spant: '#8b5cf6',
      schoor: '#f59e0b',
      gordel: '#ec4899',
      stabiliteit: '#06b6d4'
    }
    return typeKleuren[element.type] || '#6b7280'
  }, [isGeselecteerd, isHovered, localHover, volgordeNummer, element.type])

  // Klik handler voor snijpunten
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    
    if (snijpuntModus && modus === 'snijpunten') {
      // Bereken lokale positie op element
      const localPoint = e.point.clone()
      localPoint.sub(positie3D)
      
      // Roteer terug
      const inverseEuler = euler.clone()
      inverseEuler.x *= -1
      inverseEuler.y *= -1
      inverseEuler.z *= -1
      localPoint.applyEuler(inverseEuler)
      
      onSnijpuntToevoegen([localPoint.x, localPoint.y, localPoint.z])
    } else {
      onSelect()
    }
  }, [snijpuntModus, modus, positie3D, euler, onSelect, onSnijpuntToevoegen])

  return (
    <group position={positie3D} rotation={euler}>
      {/* Hoofdmesh */}
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => { setLocalHover(true); onHover(true) }}
        onPointerOut={() => { setLocalHover(false); onHover(false) }}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[profielGrootte, lengte3D, profielGrootte]} />
        <meshStandardMaterial 
          color={kleur}
          metalness={0.3}
          roughness={0.7}
          transparent={modus === 'snijpunten' && !isGeselecteerd}
          opacity={modus === 'snijpunten' && !isGeselecteerd ? 0.6 : 1}
        />
      </mesh>

      {/* Selectie highlight */}
      {(isGeselecteerd || isHovered || localHover) && (
        <mesh>
          <boxGeometry args={[profielGrootte + 0.08, lengte3D + 0.08, profielGrootte + 0.08]} />
          <meshBasicMaterial color={isGeselecteerd ? '#3b82f6' : '#60a5fa'} transparent opacity={0.3} wireframe />
        </mesh>
      )}

      {/* Volgorde nummer */}
      {volgordeNummer !== null && (
        <Html center position={[0, lengte3D / 2 + 0.5, 0]} distanceFactor={8}>
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg
            ${isGeselecteerd ? 'bg-blue-600 ring-4 ring-blue-300' : 'bg-gray-800 border-2 border-white'}
          `}>
            {volgordeNummer}
          </div>
        </Html>
      )}

      {/* Snijpunten markers */}
      {element.snijpunten.map((snijpunt) => (
        <SnijpuntMarker3D
          key={snijpunt.id}
          snijpunt={snijpunt}
          isActief={isGeselecteerd}
          onDelete={() => onSnijpuntVerwijderen(snijpunt.id)}
        />
      ))}

      {/* Snijpunt modus cursor hint */}
      {snijpuntModus && isGeselecteerd && (
        <Html center position={[0, -lengte3D / 2 - 0.5, 0]} distanceFactor={10}>
          <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1 animate-pulse">
            <Scissors className="w-3 h-3" />
            Klik om snijpunt te plaatsen
          </div>
        </Html>
      )}
    </group>
  )
}

// 3D Scene
function OogstScene({
  elementen,
  geselecteerdElement,
  hoveredElement,
  modus,
  snijpuntModus,
  actieveSnijType,
  toonNietToegewezen,
  onElementSelect,
  onElementHover,
  onSnijpuntToevoegen,
  onSnijpuntVerwijderen
}: {
  elementen: DemontageElement[]
  geselecteerdElement: string | null
  hoveredElement: string | null
  modus: PlanModus
  snijpuntModus: boolean
  actieveSnijType: Snijpunt['type']
  toonNietToegewezen: boolean
  onElementSelect: (id: string) => void
  onElementHover: (id: string | null) => void
  onSnijpuntToevoegen: (elementId: string, positie: [number, number, number]) => void
  onSnijpuntVerwijderen: (elementId: string, snijpuntId: string) => void
}) {
  // Filter elementen op basis van toonNietToegewezen
  const zichtbareElementen = elementen.filter(e => 
    toonNietToegewezen || e.volgorde !== null
  )

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <Environment preset="warehouse" />
      
      {/* Vloer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      
      {/* Grid */}
      <gridHelper args={[50, 50, '#334155', '#1e293b']} position={[0, 0, 0]} />
      
      {/* Elementen */}
      {zichtbareElementen.map((element) => (
        <Element3D
          key={element.id}
          element={element}
          isGeselecteerd={element.id === geselecteerdElement}
          isHovered={element.id === hoveredElement}
          volgordeNummer={element.volgorde}
          modus={modus}
          snijpuntModus={snijpuntModus && element.id === geselecteerdElement}
          actieveSnijType={actieveSnijType}
          onSelect={() => onElementSelect(element.id)}
          onHover={(hover) => onElementHover(hover ? element.id : null)}
          onSnijpuntToevoegen={(pos) => onSnijpuntToevoegen(element.id, pos)}
          onSnijpuntVerwijderen={(sid) => onSnijpuntVerwijderen(element.id, sid)}
        />
      ))}

      <OrbitControls 
        makeDefault
        minDistance={5}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  )
}

// Modus Selector Component
function ModusSelector({ 
  modus, 
  onModusChange 
}: { 
  modus: PlanModus
  onModusChange: (m: PlanModus) => void
}) {
  const stappen = [
    { id: 'selectie' as PlanModus, label: 'Selectie', icon: MousePointer, beschrijving: 'Selecteer elementen' },
    { id: 'volgorde' as PlanModus, label: 'Volgorde', icon: List, beschrijving: 'Bepaal demontagevolgorde' },
    { id: 'snijpunten' as PlanModus, label: 'Snijpunten', icon: Scissors, beschrijving: 'Plaats cuts op elementen' },
    { id: 'review' as PlanModus, label: 'Review', icon: CheckCircle, beschrijving: 'Controleer & exporteer' },
  ]

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
      {stappen.map((stap, idx) => {
        const isActief = modus === stap.id
        const Icon = stap.icon
        return (
          <button
            key={stap.id}
            onClick={() => onModusChange(stap.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${isActief 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden md:inline">{stap.label}</span>
            {idx < stappen.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 ml-1 hidden lg:block" />
            )}
          </button>
        )
      })}
    </div>
  )
}

// Snijpunt Type Selector
function SnijpuntTypeSelector({
  actieveType,
  onTypeChange
}: {
  actieveType: Snijpunt['type']
  onTypeChange: (type: Snijpunt['type']) => void
}) {
  const types: { id: Snijpunt['type']; label: string; kleur: string }[] = [
    { id: 'zaag', label: 'Zaag', kleur: '#ef4444' },
    { id: 'plasma', label: 'Plasma', kleur: '#8b5cf6' },
    { id: 'autogeen', label: 'Autogeen', kleur: '#f59e0b' },
    { id: 'slijp', label: 'Slijp', kleur: '#3b82f6' },
  ]

  return (
    <div className="flex gap-2">
      {types.map((type) => (
        <button
          key={type.id}
          onClick={() => onTypeChange(type.id)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
            ${actieveType === type.id 
              ? 'bg-gray-900 text-white' 
              : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'}
          `}
        >
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: type.kleur }}
          />
          {type.label}
        </button>
      ))}
    </div>
  )
}

// Volgorde Panel
function VolgordePanel({
  elementen,
  geselecteerdElement,
  onVolgordeToevoegen,
  onVolgordeVerwijderen,
  onVolgordeClear
}: {
  elementen: DemontageElement[]
  geselecteerdElement: string | null
  onVolgordeToevoegen: (id: string) => void
  onVolgordeVerwijderen: (id: string) => void
  onVolgordeClear: () => void
}) {
  const toegewezen = elementen.filter(e => e.volgorde !== null).sort((a, b) => a.volgorde! - b.volgorde!)
  const nietToegewezen = elementen.filter(e => e.volgorde === null)

  return (
    <div className="space-y-4">
      {/* Toegewezen elementen */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Demontagevolgorde</h3>
          <button
            onClick={onVolgordeClear}
            className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
        
        {toegewezen.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Target className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Klik op elementen om volgorde toe te wijzen</p>
          </div>
        ) : (
          <div className="divide-y max-h-64 overflow-y-auto">
            {toegewezen.map((el) => (
              <div
                key={el.id}
                className={`flex items-center gap-3 p-3 hover:bg-gray-50 ${
                  el.id === geselecteerdElement ? 'bg-blue-50' : ''
                }`}
              >
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-red-500 flex items-center justify-center text-white font-bold text-sm"
                  style={{
                    background: `hsl(${120 - (el.volgorde! / toegewezen.length) * 120}, 70%, 45%)`
                  }}
                >
                  {el.volgorde}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">{el.profielNaam}</p>
                  <p className="text-xs text-gray-500">{el.type} • {el.gewicht}kg</p>
                </div>
                {el.snijpunten.length > 0 && (
                  <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                    <Scissors className="w-3 h-3" />
                    {el.snijpunten.length}
                  </span>
                )}
                <button
                  onClick={() => onVolgordeVerwijderen(el.id)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Niet toegewezen */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-3">
        <p className="text-xs text-gray-500 mb-2">
          Nog niet toegewezen: <span className="font-semibold">{nietToegewezen.length}</span> elementen
        </p>
        <div className="flex flex-wrap gap-1">
          {nietToegewezen.slice(0, 10).map((el) => (
            <button
              key={el.id}
              onClick={() => onVolgordeToevoegen(el.id)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                el.id === geselecteerdElement
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {el.profielNaam}
            </button>
          ))}
          {nietToegewezen.length > 10 && (
            <span className="px-2 py-1 text-xs text-gray-400">
              +{nietToegewezen.length - 10} meer
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// Automatisch Plan Generator
function AutomatischPlanPanel({
  onGenereer,
  isGenerating,
  progress
}: {
  onGenereer: () => void
  isGenerating: boolean
  progress: number
}) {
  return (
    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold">AI Ontmantelingsplan</h3>
          <p className="text-purple-200 text-sm">Automatisch genereren</p>
        </div>
      </div>

      {isGenerating ? (
        <div className="space-y-3">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-purple-200 text-sm">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {progress < 25 && 'Constructie analyseren...'}
            {progress >= 25 && progress < 50 && 'Stabiliteit berekenen...'}
            {progress >= 50 && progress < 75 && 'Optimale volgorde bepalen...'}
            {progress >= 75 && 'Snijpunten plaatsen...'}
          </div>
        </div>
      ) : (
        <>
          <p className="text-purple-100 text-sm mb-4">
            Laat de AI automatisch het optimale ontmantelingsplan genereren, inclusief:
          </p>
          <ul className="text-sm text-purple-100 space-y-1 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-300" />
              Veilige demontagevolgorde
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-300" />
              Optimale snijpuntlocaties
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-300" />
              Productie-efficiëntie maximalisatie
            </li>
          </ul>
          <button
            onClick={onGenereer}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-colors"
          >
            <Sparkles className="w-5 h-5" />
            Genereer Automatisch Plan
          </button>
        </>
      )}
    </div>
  )
}

// Snijpunten Panel
function SnijpuntenPanel({
  element,
  actieveType,
  onTypeChange,
  snijpuntModus,
  onSnijpuntModusToggle
}: {
  element: DemontageElement | null
  actieveType: Snijpunt['type']
  onTypeChange: (type: Snijpunt['type']) => void
  snijpuntModus: boolean
  onSnijpuntModusToggle: () => void
}) {
  if (!element) {
    return (
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <Scissors className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Selecteer eerst een element in de 3D viewer</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{element.profielNaam}</h3>
            <p className="text-sm text-gray-500">{element.lengte}mm • {element.gewicht}kg</p>
          </div>
          <button
            onClick={onSnijpuntModusToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              snijpuntModus
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {snijpuntModus ? (
              <>
                <X className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Snijpunt Toevoegen
              </>
            )}
          </button>
        </div>

        {snijpuntModus && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-200 mb-4">
            <p className="text-sm text-red-700 flex items-center gap-2">
              <CircleDot className="w-4 h-4 animate-pulse" />
              Klik op het element in de 3D viewer om een snijpunt te plaatsen
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 block mb-2">Snijtype</label>
          <SnijpuntTypeSelector actieveType={actieveType} onTypeChange={onTypeChange} />
        </div>

        {/* Bestaande snijpunten */}
        {element.snijpunten.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Snijpunten ({element.snijpunten.length})
            </label>
            <div className="space-y-2">
              {element.snijpunten.map((sp, idx) => (
                <div 
                  key={sp.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: {
                        zaag: '#ef4444',
                        plasma: '#8b5cf6',
                        autogeen: '#f59e0b',
                        slijp: '#3b82f6'
                      }[sp.type] }}
                    />
                    <span className="text-sm font-medium text-gray-700 capitalize">{sp.type}</span>
                    <span className="text-xs text-gray-400">#{idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Review Panel
function ReviewPanel({
  elementen,
  onExport
}: {
  elementen: DemontageElement[]
  onExport: () => void
}) {
  const toegewezen = elementen.filter(e => e.volgorde !== null)
  const totaalSnijpunten = elementen.reduce((s, e) => s + e.snijpunten.length, 0)
  const totaalGewicht = toegewezen.reduce((s, e) => s + e.gewicht, 0)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-4">Plan Overzicht</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{toegewezen.length}</p>
            <p className="text-xs text-green-600">Elementen gepland</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-700">{totaalSnijpunten}</p>
            <p className="text-xs text-red-600">Snijpunten</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{(totaalGewicht / 1000).toFixed(1)}t</p>
            <p className="text-xs text-blue-600">Totaal gewicht</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-purple-700">{Math.ceil(toegewezen.length * 15)}min</p>
            <p className="text-xs text-purple-600">Geschatte tijd</p>
          </div>
        </div>

        {/* Waarschuwingen */}
        {elementen.length - toegewezen.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 mb-4">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {elementen.length - toegewezen.length} elementen zijn nog niet toegewezen aan de volgorde
            </p>
          </div>
        )}

        <button
          onClick={onExport}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Exporteer Ontmantelingsplan
        </button>
      </div>

      <div className="bg-blue-50 rounded-xl p-4">
        <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4" />
          Export opties
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• PDF met werkinstructies per element</li>
          <li>• Excel met volledige elementenlijst</li>
          <li>• 3D model met snijpunten markering</li>
        </ul>
      </div>
    </div>
  )
}

// Hoofd Component
export default function OogstplanPage() {
  const { gebouwId } = useParams<{ gebouwId: string }>()
  const navigate = useNavigate()

  const gebouw = useMemo(() => {
    return MOCK_GEBOUWEN.find(g => g.id === gebouwId) || MOCK_GEBOUWEN[0]
  }, [gebouwId])

  // State
  const [modus, setModus] = useState<PlanModus>('selectie')
  const [elementen, setElementen] = useState<DemontageElement[]>(() => {
    return gebouw.elementen.map((el, idx) => ({
      id: el.id,
      profielNaam: el.profielNaam,
      lengte: el.lengte,
      gewicht: el.gewicht,
      positie: el.positie,
      rotatie: el.rotatie,
      volgorde: null,
      type: el.type || ['kolom', 'ligger', 'spant', 'schoor', 'gordel', 'stabiliteit'][idx % 6],
      snijpunten: []
    }))
  })

  const [geselecteerdElement, setGeselecteerdElement] = useState<string | null>(null)
  const [hoveredElement, setHoveredElement] = useState<string | null>(null)
  const [snijpuntModus, setSnijpuntModus] = useState(false)
  const [actieveSnijType, setActieveSnijType] = useState<Snijpunt['type']>('zaag')
  const [toonNietToegewezen, setToonNietToegewezen] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateProgress, setGenerateProgress] = useState(0)

  // Geselecteerd element object
  const geselecteerd = elementen.find(e => e.id === geselecteerdElement) || null

  // Volgorde handlers
  const handleVolgordeToevoegen = useCallback((id: string) => {
    setElementen(prev => {
      const maxVolgorde = Math.max(0, ...prev.filter(e => e.volgorde !== null).map(e => e.volgorde!))
      return prev.map(e => 
        e.id === id ? { ...e, volgorde: maxVolgorde + 1 } : e
      )
    })
  }, [])

  const handleVolgordeVerwijderen = useCallback((id: string) => {
    setElementen(prev => {
      const verwijderdElement = prev.find(e => e.id === id)
      if (!verwijderdElement || verwijderdElement.volgorde === null) return prev
      
      const verwijderdeVolgorde = verwijderdElement.volgorde
      return prev.map(e => {
        if (e.id === id) return { ...e, volgorde: null }
        if (e.volgorde !== null && e.volgorde > verwijderdeVolgorde) {
          return { ...e, volgorde: e.volgorde - 1 }
        }
        return e
      })
    })
  }, [])

  const handleVolgordeClear = useCallback(() => {
    setElementen(prev => prev.map(e => ({ ...e, volgorde: null })))
  }, [])

  // Snijpunt handlers
  const handleSnijpuntToevoegen = useCallback((elementId: string, positie: [number, number, number]) => {
    setElementen(prev => prev.map(e => {
      if (e.id !== elementId) return e
      return {
        ...e,
        snijpunten: [...e.snijpunten, {
          id: `snij-${Date.now()}`,
          elementId,
          positie,
          type: actieveSnijType
        }]
      }
    }))
  }, [actieveSnijType])

  const handleSnijpuntVerwijderen = useCallback((elementId: string, snijpuntId: string) => {
    setElementen(prev => prev.map(e => {
      if (e.id !== elementId) return e
      return {
        ...e,
        snijpunten: e.snijpunten.filter(sp => sp.id !== snijpuntId)
      }
    }))
  }, [])

  // Automatisch plan genereren
  const handleAutomatischGenereren = useCallback(() => {
    setIsGenerating(true)
    setGenerateProgress(0)

    // Simuleer generatie proces
    const interval = setInterval(() => {
      setGenerateProgress(p => {
        if (p >= 100) {
          clearInterval(interval)
          setIsGenerating(false)
          
          // Genereer plan
          const typeVolgorde: Record<string, number> = {
            stabiliteit: 1, gordel: 2, ligger: 3, spant: 4, schoor: 5, kolom: 6
          }
          
          const gesorteerd = [...elementen]
            .sort((a, b) => {
              const ta = typeVolgorde[a.type] || 99
              const tb = typeVolgorde[b.type] || 99
              if (ta !== tb) return ta - tb
              if (Math.abs(a.positie.y - b.positie.y) > 0.5) return b.positie.y - a.positie.y
              return a.gewicht - b.gewicht
            })
          
          setElementen(gesorteerd.map((el, idx) => ({
            ...el,
            volgorde: idx + 1,
            snijpunten: el.lengte > 6000 ? [{
              id: `snij-auto-${el.id}`,
              elementId: el.id,
              positie: [0, 0, 0] as [number, number, number],
              type: 'zaag' as const
            }] : el.snijpunten
          })))

          setModus('review')
          return 100
        }
        return p + Math.random() * 8 + 2
      })
    }, 100)
  }, [elementen])

  // Element selectie handler
  const handleElementSelect = useCallback((id: string) => {
    setGeselecteerdElement(id)
    
    // In volgorde modus: automatisch toevoegen
    if (modus === 'volgorde') {
      const element = elementen.find(e => e.id === id)
      if (element && element.volgorde === null) {
        handleVolgordeToevoegen(id)
      }
    }
  }, [modus, elementen, handleVolgordeToevoegen])

  // Export handler
  const handleExport = useCallback(() => {
    alert('Ontmantelingsplan wordt geëxporteerd...\n\nIn productie zou dit een PDF/Excel genereren met:\n- Werkinstructies per element\n- Snijpuntlocaties\n- Veiligheidsrichtlijnen')
  }, [])

  // Stats
  const stats = useMemo(() => {
    const toegewezen = elementen.filter(e => e.volgorde !== null)
    return {
      totaal: elementen.length,
      toegewezen: toegewezen.length,
      snijpunten: elementen.reduce((s, e) => s + e.snijpunten.length, 0),
      gewicht: toegewezen.reduce((s, e) => s + e.gewicht, 0)
    }
  }, [elementen])

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/gebouwen')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Oogstplan</h1>
            <p className="text-sm text-gray-500">{gebouw.naam} - Ontmantelingsplanning</p>
          </div>
        </div>

        {/* Modus selector */}
        <ModusSelector modus={modus} onModusChange={setModus} />

        {/* Acties */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setToonNietToegewezen(!toonNietToegewezen)}
            className={`p-2 rounded-lg transition-colors ${
              toonNietToegewezen ? 'bg-gray-100 text-gray-700' : 'bg-gray-200 text-gray-900'
            }`}
            title={toonNietToegewezen ? 'Verberg niet-toegewezen' : 'Toon alle elementen'}
          >
            {toonNietToegewezen ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            <Save className="w-4 h-4" />
            Opslaan
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-4 py-2 bg-white border-b text-sm">
        <span className="flex items-center gap-2 text-gray-600">
          <Layers className="w-4 h-4" />
          {stats.toegewezen}/{stats.totaal} gepland
        </span>
        <span className="flex items-center gap-2 text-red-600">
          <Scissors className="w-4 h-4" />
          {stats.snijpunten} snijpunten
        </span>
        <span className="flex items-center gap-2 text-gray-600">
          <Weight className="w-4 h-4" />
          {(stats.gewicht / 1000).toFixed(1)} ton
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <div className="h-2 w-40 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(stats.toegewezen / stats.totaal) * 100}%` }}
            />
          </div>
          <span className="text-gray-600 font-medium">
            {Math.round((stats.toegewezen / stats.totaal) * 100)}%
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* 3D Viewer */}
        <div className="flex-1 relative">
          <Canvas shadows camera={{ position: [20, 15, 20], fov: 50 }}>
            <Suspense fallback={null}>
              <OogstScene
                elementen={elementen}
                geselecteerdElement={geselecteerdElement}
                hoveredElement={hoveredElement}
                modus={modus}
                snijpuntModus={snijpuntModus}
                actieveSnijType={actieveSnijType}
                toonNietToegewezen={toonNietToegewezen}
                onElementSelect={handleElementSelect}
                onElementHover={setHoveredElement}
                onSnijpuntToevoegen={handleSnijpuntToevoegen}
                onSnijpuntVerwijderen={handleSnijpuntVerwijderen}
              />
            </Suspense>
          </Canvas>

          {/* Controls hint */}
          <div className="absolute bottom-4 left-4">
            <div className="bg-white/90 backdrop-blur rounded-lg px-3 py-2 text-sm text-gray-600 shadow-lg flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Move className="w-4 h-4" />
                Roteren
              </span>
              <span className="flex items-center gap-1">
                <MousePointer className="w-4 h-4" />
                Selecteren
              </span>
              {modus === 'snijpunten' && snijpuntModus && (
                <span className="flex items-center gap-1 text-red-600">
                  <Scissors className="w-4 h-4" />
                  Klik voor snijpunt
                </span>
              )}
            </div>
          </div>

          {/* Legenda */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg">
            <h4 className="font-medium text-gray-900 mb-2 text-sm">Elementtypes</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Kolom</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Ligger</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>Spant</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Schoor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-pink-500" />
                <span>Gordel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-cyan-500" />
                <span>Stabiliteit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[380px] bg-white border-l overflow-y-auto p-4 space-y-4">
          {/* Automatisch plan optie - altijd zichtbaar */}
          {modus !== 'review' && (
            <AutomatischPlanPanel
              onGenereer={handleAutomatischGenereren}
              isGenerating={isGenerating}
              progress={generateProgress}
            />
          )}

          {/* Modus-specifieke panels */}
          {modus === 'selectie' && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-medium text-blue-900 flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                Selectie Modus
              </h4>
              <p className="text-sm text-blue-700">
                Klik op elementen in de 3D viewer om ze te selecteren. 
                Ga naar <strong>Volgorde</strong> om de demontagevolgorde te bepalen.
              </p>
            </div>
          )}

          {modus === 'volgorde' && (
            <VolgordePanel
              elementen={elementen}
              geselecteerdElement={geselecteerdElement}
              onVolgordeToevoegen={handleVolgordeToevoegen}
              onVolgordeVerwijderen={handleVolgordeVerwijderen}
              onVolgordeClear={handleVolgordeClear}
            />
          )}

          {modus === 'snijpunten' && (
            <SnijpuntenPanel
              element={geselecteerd}
              actieveType={actieveSnijType}
              onTypeChange={setActieveSnijType}
              snijpuntModus={snijpuntModus}
              onSnijpuntModusToggle={() => setSnijpuntModus(!snijpuntModus)}
            />
          )}

          {modus === 'review' && (
            <ReviewPanel
              elementen={elementen}
              onExport={handleExport}
            />
          )}

          {/* Element info panel */}
          {geselecteerd && modus !== 'snijpunten' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Geselecteerd Element</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Profiel</span>
                  <span className="font-medium">{geselecteerd.profielNaam}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium capitalize">{geselecteerd.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lengte</span>
                  <span className="font-medium">{geselecteerd.lengte}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Gewicht</span>
                  <span className="font-medium">{geselecteerd.gewicht}kg</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Volgorde</span>
                  <span className="font-medium">
                    {geselecteerd.volgorde !== null ? `#${geselecteerd.volgorde}` : 'Niet toegewezen'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Snijpunten</span>
                  <span className="font-medium">{geselecteerd.snijpunten.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
