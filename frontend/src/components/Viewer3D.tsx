import { useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import type { GebouwElement, Conditie } from '../types'

interface SteelBeamProps {
  element: GebouwElement
  selected: boolean
  onSelect: (element: GebouwElement) => void
  showLabels: boolean
}

// Kleuren op basis van conditie
const CONDITIE_KLEUREN: Record<Conditie, string> = {
  goed: '#22c55e',
  matig: '#f59e0b',
  slecht: '#ef4444',
  onbekend: '#6b7280',
}

// I-profiel geometrie generator
function createIProfileGeometry(
  hoogte: number,
  breedte: number,
  flensDikte: number,
  lijfDikte: number,
  lengte: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  
  // Schaal naar meters
  const h = hoogte / 1000
  const b = breedte / 1000
  const tf = flensDikte / 1000
  const tw = lijfDikte / 1000
  
  // Teken I-profiel (2D doorsnede)
  // Start linksonder
  shape.moveTo(-b / 2, -h / 2)
  shape.lineTo(b / 2, -h / 2)
  shape.lineTo(b / 2, -h / 2 + tf)
  shape.lineTo(tw / 2, -h / 2 + tf)
  shape.lineTo(tw / 2, h / 2 - tf)
  shape.lineTo(b / 2, h / 2 - tf)
  shape.lineTo(b / 2, h / 2)
  shape.lineTo(-b / 2, h / 2)
  shape.lineTo(-b / 2, h / 2 - tf)
  shape.lineTo(-tw / 2, h / 2 - tf)
  shape.lineTo(-tw / 2, -h / 2 + tf)
  shape.lineTo(-b / 2, -h / 2 + tf)
  shape.closePath()
  
  // Extrude naar 3D
  const extrudeSettings = {
    depth: lengte / 1000,
    bevelEnabled: false,
  }
  
  return new THREE.ExtrudeGeometry(shape, extrudeSettings)
}

// Profiel afmetingen (vereenvoudigd)
const PROFIEL_AFMETINGEN: Record<string, { h: number; b: number; tf: number; tw: number }> = {
  'HEA 100': { h: 100, b: 100, tf: 8, tw: 5 },
  'HEA 200': { h: 200, b: 200, tf: 10, tw: 6.5 },
  'HEA 300': { h: 300, b: 300, tf: 14, tw: 8.5 },
  'HEB 200': { h: 200, b: 200, tf: 15, tw: 9 },
  'HEB 300': { h: 300, b: 300, tf: 19, tw: 11 },
  'IPE 200': { h: 200, b: 100, tf: 8.5, tw: 5.6 },
  'IPE 300': { h: 300, b: 150, tf: 10.7, tw: 7.1 },
  'IPE 400': { h: 400, b: 180, tf: 13.5, tw: 8.6 },
}

function SteelBeam({ element, selected, onSelect, showLabels }: SteelBeamProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  // Haal profiel afmetingen op
  const profielNaam = element.profielNaam || 'HEA 200'
  const afmetingen = PROFIEL_AFMETINGEN[profielNaam] || PROFIEL_AFMETINGEN['HEA 200']
  
  // Maak geometrie
  const geometry = createIProfileGeometry(
    afmetingen.h,
    afmetingen.b,
    afmetingen.tf,
    afmetingen.tw,
    element.lengte
  )
  
  // Kleur op basis van conditie en selectie
  const baseColor = CONDITIE_KLEUREN[element.conditie]
  const color = selected ? '#3b82f6' : hovered ? '#60a5fa' : baseColor
  
  // Positie conversie (mm naar m)
  const position: [number, number, number] = [
    element.positie.x / 1000,
    element.positie.z / 1000, // Z wordt Y (hoogte)
    element.positie.y / 1000,
  ]
  
  // Rotatie conversie (graden naar radialen)
  const rotation: [number, number, number] = [
    (element.rotatie.x * Math.PI) / 180,
    (element.rotatie.z * Math.PI) / 180,
    (element.rotatie.y * Math.PI) / 180,
  ]
  
  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(element)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'default'
        }}
      >
        <meshStandardMaterial 
          color={color} 
          metalness={0.6} 
          roughness={0.4}
          emissive={selected ? '#1d4ed8' : '#000000'}
          emissiveIntensity={selected ? 0.2 : 0}
        />
      </mesh>
      
      {/* Outline voor geselecteerd element */}
      {selected && (
        <lineSegments>
          <edgesGeometry args={[geometry]} />
          <lineBasicMaterial color="#1d4ed8" linewidth={2} />
        </lineSegments>
      )}
      
      {/* Label */}
      {showLabels && (
        <Html
          position={[0, afmetingen.h / 2000 + 0.1, element.lengte / 2000]}
          center
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-gray-900/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
            {element.profielNaam}
          </div>
        </Html>
      )}
    </group>
  )
}

// Scene component
interface GebouwSceneProps {
  elementen: GebouwElement[]
  geselecteerdElement: GebouwElement | null
  onSelectElement: (element: GebouwElement | null) => void
  showLabels: boolean
  showGrid: boolean
}

function GebouwScene({ 
  elementen, 
  geselecteerdElement, 
  onSelectElement,
  showLabels,
  showGrid 
}: GebouwSceneProps) {
  return (
    <>
      {/* Verlichting */}
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1} 
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-10, 10, -10]} intensity={0.3} />
      
      {/* Grid */}
      {showGrid && (
        <Grid
          args={[50, 50]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#374151"
          fadeDistance={50}
          fadeStrength={1}
          position={[0, 0, 0]}
        />
      )}
      
      {/* Assen */}
      <axesHelper args={[5]} />
      
      {/* Stalen elementen */}
      {elementen.map((element) => (
        <SteelBeam
          key={element.id}
          element={element}
          selected={geselecteerdElement?.id === element.id}
          onSelect={onSelectElement}
          showLabels={showLabels}
        />
      ))}
      
      {/* Vloer referentie */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#1f2937" transparent opacity={0.3} />
      </mesh>
    </>
  )
}

// Hoofd component
interface Viewer3DProps {
  elementen: GebouwElement[]
  geselecteerdElement: GebouwElement | null
  onSelectElement: (element: GebouwElement | null) => void
  className?: string
}

export default function Viewer3D({ 
  elementen, 
  geselecteerdElement, 
  onSelectElement,
  className = ''
}: Viewer3DProps) {
  const [showLabels, setShowLabels] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [viewMode, setViewMode] = useState<'perspective' | 'top' | 'front' | 'side'>('perspective')
  
  return (
    <div className={`relative ${className}`}>
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur rounded-lg shadow-lg p-2 flex gap-1">
          {(['perspective', 'top', 'front', 'side'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                viewMode === mode 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {mode === 'perspective' ? '3D' : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        
        <div className="bg-white/90 backdrop-blur rounded-lg shadow-lg p-2 space-y-1">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="rounded"
            />
            Labels
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded"
            />
            Grid
          </label>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3">
        <div className="text-xs font-medium text-gray-700 mb-2">Conditie</div>
        <div className="space-y-1">
          {Object.entries(CONDITIE_KLEUREN).map(([conditie, kleur]) => (
            <div key={conditie} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: kleur as string }} />
              <span className="capitalize">{conditie}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Info overlay */}
      <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3">
        <div className="text-xs text-gray-500">Elementen</div>
        <div className="text-lg font-bold">{elementen.length}</div>
        <div className="text-xs text-gray-500 mt-2">Navigatie</div>
        <div className="text-xs text-gray-600">
          <div>🖱️ Links: Roteren</div>
          <div>🖱️ Rechts: Pannen</div>
          <div>🖱️ Scroll: Zoom</div>
        </div>
      </div>
      
      {/* Three.js Canvas */}
      <Canvas
        shadows
        onClick={() => onSelectElement(null)}
        style={{ background: 'linear-gradient(to bottom, #1e293b, #0f172a)' }}
      >
        <PerspectiveCamera 
          makeDefault 
          position={
            viewMode === 'top' ? [0, 20, 0] :
            viewMode === 'front' ? [0, 5, 20] :
            viewMode === 'side' ? [20, 5, 0] :
            [15, 10, 15]
          }
          fov={50}
        />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={100}
        />
        <GebouwScene
          elementen={elementen}
          geselecteerdElement={geselecteerdElement}
          onSelectElement={onSelectElement}
          showLabels={showLabels}
          showGrid={showGrid}
        />
      </Canvas>
    </div>
  )
}
