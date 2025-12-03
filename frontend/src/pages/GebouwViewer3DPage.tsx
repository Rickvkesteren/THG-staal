import { useState, useRef, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Edges,
  ContactShadows,
  Sky,
  Html,
  Text
} from '@react-three/drei'
import { loadModel } from '../utils/modelStorage'
import { 
  Building2, 
  Layers,
  RotateCcw,
  Sun,
  Moon,
  Maximize2,
  Grid3X3,
  Box,
  ChevronDown,
  Scissors,
  CheckCircle2,
  ArrowLeft,
  Eye,
  Target,
  Crosshair,
  ListOrdered,
  Wand2,
  Download,
  Trash2,
  FileText
} from 'lucide-react'
import * as THREE from 'three'
import { MOCK_GEBOUWEN, getGebouwStatistieken, type MockGebouw } from '../data/mockBuildings'
import type { CADElement, Conditie, ElementType } from '../types'

// Snijpunt types
type SnijType = 'zaag' | 'plasma' | 'autogeen' | 'slijp'
interface Snijpunt {
  id: string
  elementId: string
  positie: number // 0-1 relatief op element
  type: SnijType
}

// Oogstplan types
type PlanModus = 'bekijken' | 'volgorde' | 'snijpunten' | 'review'

const SNIJ_KLEUREN: Record<SnijType, string> = {
  zaag: '#3b82f6',
  plasma: '#f59e0b',
  autogeen: '#ef4444',
  slijp: '#22c55e'
}

// Kleuren per conditie
const CONDITIE_KLEUREN: Record<Conditie, string> = {
  goed: '#22c55e',
  matig: '#f59e0b', 
  slecht: '#ef4444',
  onbekend: '#6b7280'
}

// Type kleuren
const TYPE_KLEUREN: Record<ElementType, string> = {
  kolom: '#3b82f6',
  balk: '#8b5cf6',
  ligger: '#06b6d4',
  schoor: '#f97316',
  spant: '#ec4899',
  windverband: '#84cc16',
  vloerligger: '#14b8a6',
  gording: '#22c55e',    // Groen
  dakspoor: '#a855f7',   // Paars
  stijl: '#0ea5e9',      // Lichtblauw
  regel: '#eab308'       // Geel
}

// Demontage volgorde prioriteit (hoger = later demonteren)
const DEMONTAGE_PRIORITEIT: Record<ElementType, number> = {
  windverband: 1,
  schoor: 2,
  gording: 3,
  dakspoor: 4,
  regel: 5,
  ligger: 6,
  vloerligger: 7,
  balk: 8,
  spant: 9,
  stijl: 10,
  kolom: 11
}

// 3D Snijpunt marker
function SnijpuntMarker3D({ 
  positie, 
  type, 
  onClick 
}: { 
  positie: [number, number, number]
  type: SnijType
  onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  
  return (
    <group position={positie}>
      <mesh 
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick?.() }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true) }}
        onPointerOut={() => setHovered(false)}
      >
        <torusGeometry args={[0.15, 0.04, 8, 24]} />
        <meshStandardMaterial 
          color={SNIJ_KLEUREN[type]} 
          emissive={SNIJ_KLEUREN[type]}
          emissiveIntensity={hovered ? 0.8 : 0.4}
        />
      </mesh>
      {hovered && (
        <Html center>
          <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap capitalize">
            {type}snede
          </div>
        </Html>
      )}
    </group>
  )
}

// Volgorde nummer label in 3D
function VolgordeLabel({ positie, nummer }: { positie: [number, number, number]; nummer: number }) {
  // Gradient van groen (1) naar rood (max)
  const kleur = nummer <= 3 ? '#22c55e' : nummer <= 6 ? '#f59e0b' : '#ef4444'
  
  return (
    <group position={positie}>
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color={kleur} emissive={kleur} emissiveIntensity={0.3} />
      </mesh>
      <Text
        position={[0, 0, 0.26]}
        fontSize={0.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        font="/fonts/Inter-Bold.woff"
      >
        {nummer}
      </Text>
    </group>
  )
}

// Realistische I-profiel component met correcte oriëntatie
function IProfielMesh({ 
  element, 
  selected, 
  highlighted,
  colorMode,
  showEdges,
  onClick,
  onSnijpuntClick,
  planModus,
  volgordeNummer,
  snijpunten,
  onSnijpuntDelete
}: { 
  element: CADElement
  selected: boolean
  highlighted: boolean
  colorMode: 'conditie' | 'type' | 'status'
  showEdges: boolean
  onClick: () => void
  onSnijpuntClick?: (positie: number) => void
  planModus: PlanModus
  volgordeNummer?: number
  snijpunten: Snijpunt[]
  onSnijpuntDelete?: (id: string) => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const scale = 0.001 // mm to m
  
  // Profiel dimensies (realistic I-profile)
  const profielMatch = element.profielNaam.match(/(\d+)/)
  const profielHoogte = profielMatch ? parseInt(profielMatch[1]) : 200
  
  // HEA/HEB/IPE dimensies
  const isHEB = element.profielNaam.includes('HEB')
  const isIPE = element.profielNaam.includes('IPE')
  const isUNP = element.profielNaam.includes('UNP')
  
  // Profieldimensies in meters
  const h = profielHoogte * scale  // profiel hoogte
  const b = (isIPE ? profielHoogte * 0.46 : isUNP ? profielHoogte * 0.5 : profielHoogte * 0.9) * scale
  const tf = (isHEB ? 0.06 : 0.05) * profielHoogte * scale  // flens dikte
  const tw = (isHEB ? 0.045 : 0.035) * profielHoogte * scale  // lijf dikte
  const length = element.lengte * scale  // lengte element
  
  // Bepaal oriëntatie
  const isVertical = element.type === 'kolom'
  const isYDirection = element.rotatie.z === 90
  const isDiagonal = element.type === 'schoor' || element.type === 'windverband'
  
  // Positie berekening (data: x=x, y=y horizontaal, z=hoogte)
  // Three.js: x=x, y=hoogte, z=y (diepte)
  const posX = element.positie.x * scale
  const posZ = element.positie.y * scale
  let posY = element.positie.z * scale
  
  // Kolommen: basis op z=0, dus centrum op halve lengte
  if (isVertical) {
    posY = length / 2
  }
  
  // Kleur bepalen
  let baseColor = colorMode === 'conditie' 
    ? CONDITIE_KLEUREN[element.conditie]
    : colorMode === 'type'
      ? TYPE_KLEUREN[element.type]
      : '#6b7280'
  
  // In volgorde modus: kleur op basis van volgordenummer
  if (planModus === 'volgorde' && volgordeNummer) {
    const hue = 120 - (volgordeNummer / 10) * 120 // Groen naar rood
    baseColor = `hsl(${hue}, 70%, 50%)`
  }
  
  if (selected) baseColor = '#ffffff'
  if (highlighted) baseColor = '#a78bfa'
  
  const [hovered, setHovered] = useState(false)
  
  // Click handler - afhankelijk van modus
  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (planModus === 'snijpunten' && onSnijpuntClick) {
      // Bereken relatieve positie op element (vereenvoudigd: midden)
      onSnijpuntClick(0.5)
    } else {
      onClick()
    }
  }
  
  // Bereken snijpunt posities in 3D
  const snijpuntPosities = useMemo(() => {
    return snijpunten.map(sp => {
      // Positie langs element
      const offset = (sp.positie - 0.5) * length
      if (isVertical) {
        return { ...sp, pos: [posX, posY + offset, posZ] as [number, number, number] }
      } else if (isYDirection) {
        return { ...sp, pos: [posX, posY, posZ + offset] as [number, number, number] }
      } else {
        return { ...sp, pos: [posX + offset, posY, posZ] as [number, number, number] }
      }
    })
  }, [snijpunten, length, isVertical, isYDirection, posX, posY, posZ])
  
  const materialProps = {
    color: hovered && !selected ? '#60a5fa' : baseColor,
    metalness: 0.75,
    roughness: 0.2,
    emissive: selected ? baseColor : hovered ? '#3b82f6' : '#000000',
    emissiveIntensity: selected ? 0.4 : hovered ? 0.25 : 0
  }

  // Render I-profiel als 3 boxes (flenzen + lijf)
  // De group wordt getransformeerd, de mesh blijft in lokale coordinaten
  
  if (isVertical) {
    // KOLOM: staat verticaal, I-profiel in lengterichting (Y-as)
    return (
      <group 
        ref={groupRef}
        position={[posX, posY, posZ]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      >
        {/* Kolom: lengte langs Y-as, profiel in X-Z vlak */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[b, length, h]} />
          <meshStandardMaterial {...materialProps} />
          {showEdges && <Edges color="#0f172a" threshold={15} />}
        </mesh>
        
        {/* Volgorde nummer */}
        {volgordeNummer && planModus !== 'bekijken' && (
          <VolgordeLabel positie={[0, length/2 + 0.4, 0]} nummer={volgordeNummer} />
        )}
        
        {/* Snijpunten */}
        {snijpuntPosities.map((sp) => (
          <SnijpuntMarker3D 
            key={sp.id} 
            positie={[sp.pos[0] - posX, sp.pos[1] - posY, sp.pos[2] - posZ]}
            type={sp.type}
            onClick={() => onSnijpuntDelete?.(sp.id)}
          />
        ))}
      </group>
    )
  }
  
  if (isDiagonal) {
    // SCHOOR: diagonaal windverband
    const diagLength = length
    const angle = Math.atan2(8, 7.5)  // ~47 graden
    return (
      <group 
        ref={groupRef}
        position={[posX, posY, posZ]}
        rotation={[0, isYDirection ? Math.PI/2 : 0, angle]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[diagLength, h, b]} />
          <meshStandardMaterial {...materialProps} />
          {showEdges && <Edges color="#0f172a" threshold={15} />}
        </mesh>
        
        {/* Volgorde nummer */}
        {volgordeNummer && planModus !== 'bekijken' && (
          <VolgordeLabel positie={[0, 0.4, 0]} nummer={volgordeNummer} />
        )}
      </group>
    )
  }
  
  // HORIZONTALE BALK
  if (isYDirection) {
    // Balk in Z-richting (data Y = three.js Z)
    return (
      <group 
        ref={groupRef}
        position={[posX, posY, posZ]}
        onClick={handleClick}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      >
        {/* I-profiel in Z richting */}
        {/* Bovenflens */}
        <mesh position={[0, h/2 - tf/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[b, tf, length]} />
          <meshStandardMaterial {...materialProps} />
          {showEdges && <Edges color="#0f172a" threshold={15} />}
        </mesh>
        {/* Onderflens */}
        <mesh position={[0, -h/2 + tf/2, 0]} castShadow receiveShadow>
          <boxGeometry args={[b, tf, length]} />
          <meshStandardMaterial {...materialProps} />
          {showEdges && <Edges color="#0f172a" threshold={15} />}
        </mesh>
        {/* Lijf */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[tw, h - 2*tf, length]} />
          <meshStandardMaterial {...materialProps} />
          {showEdges && <Edges color="#0f172a" threshold={15} />}
        </mesh>
        
        {/* Volgorde nummer */}
        {volgordeNummer && planModus !== 'bekijken' && (
          <VolgordeLabel positie={[0, h/2 + 0.4, 0]} nummer={volgordeNummer} />
        )}
        
        {/* Snijpunten */}
        {snijpuntPosities.map((sp) => (
          <SnijpuntMarker3D 
            key={sp.id} 
            positie={[sp.pos[0] - posX, sp.pos[1] - posY, sp.pos[2] - posZ]}
            type={sp.type}
            onClick={() => onSnijpuntDelete?.(sp.id)}
          />
        ))}
      </group>
    )
  }
  
  // Balk in X-richting (default)
  return (
    <group 
      ref={groupRef}
      position={[posX, posY, posZ]}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
    >
      {/* I-profiel in X richting */}
      {/* Bovenflens */}
      <mesh position={[0, h/2 - tf/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, tf, b]} />
        <meshStandardMaterial {...materialProps} />
        {showEdges && <Edges color="#0f172a" threshold={15} />}
      </mesh>
      {/* Onderflens */}
      <mesh position={[0, -h/2 + tf/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[length, tf, b]} />
        <meshStandardMaterial {...materialProps} />
        {showEdges && <Edges color="#0f172a" threshold={15} />}
      </mesh>
      {/* Lijf */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, h - 2*tf, tw]} />
        <meshStandardMaterial {...materialProps} />
        {showEdges && <Edges color="#0f172a" threshold={15} />}
      </mesh>
      
      {/* Volgorde nummer */}
      {volgordeNummer && planModus !== 'bekijken' && (
        <VolgordeLabel positie={[0, h/2 + 0.4, 0]} nummer={volgordeNummer} />
      )}
      
      {/* Snijpunten */}
      {snijpuntPosities.map((sp) => (
        <SnijpuntMarker3D 
          key={sp.id} 
          positie={[sp.pos[0] - posX, sp.pos[1] - posY, sp.pos[2] - posZ]}
          type={sp.type}
          onClick={() => onSnijpuntDelete?.(sp.id)}
        />
      ))}
    </group>
  )
}

// Fundering/vloer
function Fundering({ bounds }: { bounds: { maxX: number; maxZ: number } }) {
  return (
    <group>
      {/* Betonvloer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.maxX / 2, -0.15, bounds.maxZ / 2]} receiveShadow>
        <boxGeometry args={[bounds.maxX + 4, bounds.maxZ + 4, 0.3]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} />
      </mesh>
      
      {/* Fundering stroken */}
      {[0, bounds.maxX].map((x, i) => (
        <mesh key={`fund-x-${i}`} position={[x, -0.4, bounds.maxZ / 2]} receiveShadow>
          <boxGeometry args={[0.6, 0.5, bounds.maxZ + 2]} />
          <meshStandardMaterial color="#64748b" roughness={0.95} />
        </mesh>
      ))}
      {[0, bounds.maxZ].map((z, i) => (
        <mesh key={`fund-z-${i}`} position={[bounds.maxX / 2, -0.4, z]} receiveShadow>
          <boxGeometry args={[bounds.maxX + 2, 0.5, 0.6]} />
          <meshStandardMaterial color="#64748b" roughness={0.95} />
        </mesh>
      ))}
    </group>
  )
}

// Dakplaten (transparant)
function DakPlaten({ bounds, hoogste }: { bounds: { maxX: number; maxZ: number }; hoogste: number }) {
  return (
    <mesh position={[bounds.maxX / 2, hoogste + 0.1, bounds.maxZ / 2]}>
      <boxGeometry args={[bounds.maxX + 1, 0.05, bounds.maxZ + 1]} />
      <meshStandardMaterial 
        color="#93c5fd" 
        transparent 
        opacity={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Stramien Grid met labels en afmetingen
function StramienGrid({ 
  bounds, 
  rasterX, 
  rasterY,
  hoogte 
}: { 
  bounds: { maxX: number; maxY: number; maxZ: number }
  rasterX: number  // meters
  rasterY: number  // meters
  hoogte: number   // meters
}) {
  // Bereken aantal assen
  const aantalX = Math.ceil(bounds.maxX / rasterX) + 1
  const aantalY = Math.ceil(bounds.maxZ / rasterY) + 1
  
  // Genereer as labels (A, B, C, ... voor X-richting)
  const asLabelsX = Array.from({ length: aantalX }, (_, i) => String.fromCharCode(65 + i))
  // Nummers voor Y-richting
  const asLabelsY = Array.from({ length: aantalY }, (_, i) => String(i + 1))
  
  return (
    <group>
      {/* Basisgrid op de grond */}
      <gridHelper 
        args={[Math.max(bounds.maxX, bounds.maxZ) * 1.2, 50, '#1e3a5f', '#1e3a5f']} 
        position={[bounds.maxX / 2, 0.01, bounds.maxZ / 2]}
      />
      
      {/* X-assen (A, B, C, ...) - lopen in X-richting */}
      {asLabelsX.map((label, i) => {
        const x = i * rasterX
        if (x > bounds.maxX + 1) return null
        return (
          <group key={`as-x-${label}`}>
            {/* Verticale lijn (as) */}
            <mesh position={[x, 0.02, bounds.maxZ / 2]}>
              <boxGeometry args={[0.02, 0.02, bounds.maxZ + 2]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
            
            {/* As label (cirkel met letter) aan de voorzijde */}
            <group position={[x, 0.1, -1.5]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.6, 32]} />
                <meshBasicMaterial color="#1e40af" />
              </mesh>
              <Text
                position={[0, 0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.5}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {label}
              </Text>
            </group>
            
            {/* As label aan achterzijde */}
            <group position={[x, 0.1, bounds.maxZ + 1.5]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.6, 32]} />
                <meshBasicMaterial color="#1e40af" />
              </mesh>
              <Text
                position={[0, 0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.5}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {label}
              </Text>
            </group>
            
            {/* Afmeting label tussen assen */}
            {i < aantalX - 1 && x + rasterX <= bounds.maxX + 1 && (
              <group position={[x + rasterX / 2, 0.1, -2.5]}>
                <Text
                  rotation={[-Math.PI / 2, 0, 0]}
                  fontSize={0.35}
                  color="#94a3b8"
                  anchorX="center"
                  anchorY="middle"
                >
                  {(rasterX * 1000).toFixed(0)} mm
                </Text>
              </group>
            )}
          </group>
        )
      })}
      
      {/* Y-assen (1, 2, 3, ...) - lopen in Z-richting */}
      {asLabelsY.map((label, i) => {
        const z = i * rasterY
        if (z > bounds.maxZ + 1) return null
        return (
          <group key={`as-y-${label}`}>
            {/* Horizontale lijn (as) */}
            <mesh position={[bounds.maxX / 2, 0.02, z]}>
              <boxGeometry args={[bounds.maxX + 2, 0.02, 0.02]} />
              <meshBasicMaterial color="#22c55e" />
            </mesh>
            
            {/* As label (cirkel met nummer) aan linkerzijde */}
            <group position={[-1.5, 0.1, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.6, 32]} />
                <meshBasicMaterial color="#15803d" />
              </mesh>
              <Text
                position={[0, 0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.5}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {label}
              </Text>
            </group>
            
            {/* As label aan rechterzijde */}
            <group position={[bounds.maxX + 1.5, 0.1, z]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.6, 32]} />
                <meshBasicMaterial color="#15803d" />
              </mesh>
              <Text
                position={[0, 0.01, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={0.5}
                color="white"
                anchorX="center"
                anchorY="middle"
              >
                {label}
              </Text>
            </group>
            
            {/* Afmeting label tussen assen */}
            {i < aantalY - 1 && z + rasterY <= bounds.maxZ + 1 && (
              <group position={[-2.8, 0.1, z + rasterY / 2]}>
                <Text
                  rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                  fontSize={0.35}
                  color="#94a3b8"
                  anchorX="center"
                  anchorY="middle"
                >
                  {(rasterY * 1000).toFixed(0)} mm
                </Text>
              </group>
            )}
          </group>
        )
      })}
      
      {/* Totale afmetingen box */}
      <group position={[bounds.maxX / 2, 0.1, -4]}>
        <Text
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.4}
          color="#f59e0b"
          anchorX="center"
          anchorY="middle"
          fontWeight="bold"
        >
          {`TOTAAL: ${(bounds.maxX * 1000).toFixed(0)} × ${(bounds.maxZ * 1000).toFixed(0)} mm`}
        </Text>
      </group>
      
      {/* Hoogte indicator aan de zijkant */}
      <group position={[-3, hoogte / 2, 0]}>
        {/* Verticale lijn */}
        <mesh>
          <boxGeometry args={[0.02, hoogte, 0.02]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
        {/* Hoogte label */}
        <Text
          position={[-0.8, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          fontSize={0.35}
          color="#f97316"
          anchorX="center"
          anchorY="middle"
        >
          {`H = ${(hoogte * 1000).toFixed(0)} mm`}
        </Text>
        {/* Pijlpunten */}
        <mesh position={[0, hoogte / 2 - 0.1, 0]}>
          <coneGeometry args={[0.1, 0.2, 8]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
        <mesh position={[0, -hoogte / 2 + 0.1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.1, 0.2, 8]} />
          <meshBasicMaterial color="#f97316" />
        </mesh>
      </group>
      
      {/* Info panel - constructie layout */}
      <Html position={[bounds.maxX + 3, hoogte / 2, bounds.maxZ / 2]} center>
        <div className="bg-slate-900/90 text-white p-4 rounded-lg shadow-xl min-w-[200px] text-sm">
          <h3 className="font-bold text-lg mb-2 text-blue-400">📐 Constructie Layout</h3>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Assen X:</span>
              <span className="font-mono">{asLabelsX.filter((_, i) => i * rasterX <= bounds.maxX + 1).join(' - ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assen Y:</span>
              <span className="font-mono">1 - {asLabelsY.filter((_, i) => i * rasterY <= bounds.maxZ + 1).length}</span>
            </div>
            <hr className="border-slate-700 my-2" />
            <div className="flex justify-between">
              <span className="text-slate-400">Raster X:</span>
              <span className="font-mono text-blue-300">{(rasterX * 1000).toFixed(0)} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Raster Y:</span>
              <span className="font-mono text-green-300">{(rasterY * 1000).toFixed(0)} mm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Hoogte:</span>
              <span className="font-mono text-orange-300">{(hoogte * 1000).toFixed(0)} mm</span>
            </div>
            <hr className="border-slate-700 my-2" />
            <div className="flex justify-between font-semibold">
              <span className="text-yellow-400">Totaal:</span>
              <span className="font-mono">{(bounds.maxX * 1000 / 1000).toFixed(1)}m × {(bounds.maxZ * 1000 / 1000).toFixed(1)}m</span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}

// Scene component
function Scene({ 
  elementen, 
  selectedId, 
  highlightedType,
  onSelect,
  colorMode,
  showEdges,
  showFundering,
  showDak,
  showGrid,
  isDayMode,
  planModus,
  volgorde,
  snijpunten,
  onSnijpuntClick,
  onSnijpuntDelete
}: { 
  elementen: CADElement[]
  selectedId: string | null
  highlightedType: ElementType | null
  onSelect: (id: string | null) => void
  colorMode: 'conditie' | 'type' | 'status'
  showEdges: boolean
  showFundering: boolean
  showDak: boolean
  showGrid: boolean
  isDayMode: boolean
  planModus: PlanModus
  volgorde: string[]
  snijpunten: Snijpunt[]
  onSnijpuntClick: (elementId: string, positie: number) => void
  onSnijpuntDelete: (id: string) => void
}) {
  const scale = 0.001
  
  // Bereken bounding box (inclusief negatieve posities voor overkapping)
  const bounds = useMemo(() => {
    if (elementen.length === 0) return { minX: 0, maxX: 10, minY: 0, maxY: 10, minZ: 0, maxZ: 10 }
    const minX = Math.min(...elementen.map(e => e.positie.x)) * scale - 1
    const maxX = Math.max(...elementen.map(e => e.positie.x)) * scale + 2
    const maxY = Math.max(...elementen.map(e => e.positie.z + (e.type === 'kolom' ? e.lengte : 0))) * scale
    const minZ = Math.min(...elementen.map(e => e.positie.y)) * scale - 1
    const maxZ = Math.max(...elementen.map(e => e.positie.y)) * scale + 2
    return { minX, maxX, minY: 0, maxY, minZ, maxZ }
  }, [elementen])
  
  const cameraDistance = Math.max(bounds.maxX - bounds.minX, bounds.maxY, bounds.maxZ - bounds.minZ) * 1.8

  return (
    <>
      <PerspectiveCamera 
        makeDefault 
        position={[cameraDistance * 0.8, cameraDistance * 0.6, cameraDistance * 0.8]} 
        fov={45} 
      />
      <OrbitControls 
        enablePan 
        enableZoom 
        enableRotate 
        maxPolarAngle={Math.PI / 2.05}
        minDistance={3}
        maxDistance={150}
        target={[bounds.maxX / 2, bounds.maxY / 3, bounds.maxZ / 2]}
      />
      
      {/* Lighting */}
      {isDayMode ? (
        <>
          <Sky sunPosition={[100, 50, 100]} />
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[50, 80, 50]} 
            intensity={1.5} 
            castShadow
            shadow-mapSize={[4096, 4096]}
            shadow-camera-far={200}
            shadow-camera-left={-50}
            shadow-camera-right={50}
            shadow-camera-top={50}
            shadow-camera-bottom={-50}
          />
          <directionalLight position={[-30, 40, -30]} intensity={0.3} />
        </>
      ) : (
        <>
          <Environment preset="night" />
          <ambientLight intensity={0.15} />
          <pointLight position={[bounds.maxX/2, bounds.maxY + 5, bounds.maxZ/2]} intensity={100} color="#fef3c7" />
          <spotLight 
            position={[bounds.maxX, bounds.maxY + 10, bounds.maxZ]} 
            angle={0.5} 
            intensity={50}
            castShadow
          />
        </>
      )}
      
      {/* Grid met stramien labels en afmetingen */}
      {showGrid && (
        <StramienGrid 
          bounds={bounds} 
          rasterX={6} 
          rasterY={7.5} 
          hoogte={8}
        />
      )}
      
      {/* Fundering */}
      {showFundering && <Fundering bounds={bounds} />}
      
      {/* Contact shadows */}
      <ContactShadows 
        position={[bounds.maxX / 2, 0.01, bounds.maxZ / 2]} 
        scale={50} 
        blur={2} 
        opacity={0.5} 
        far={30}
      />
      
      {/* Staal elementen */}
      {elementen.map((element) => {
        const volgordeNummer = volgorde.indexOf(element.id) + 1
        const elementSnijpunten = snijpunten.filter(s => s.elementId === element.id)
        
        return (
          <IProfielMesh
            key={element.id}
            element={element}
            selected={selectedId === element.id}
            highlighted={highlightedType === element.type}
            colorMode={colorMode}
            showEdges={showEdges}
            onClick={() => onSelect(selectedId === element.id ? null : element.id)}
            planModus={planModus}
            volgordeNummer={volgordeNummer > 0 ? volgordeNummer : undefined}
            snijpunten={elementSnijpunten}
            onSnijpuntClick={(positie) => onSnijpuntClick(element.id, positie)}
            onSnijpuntDelete={onSnijpuntDelete}
          />
        )
      })}
      
      {/* Dak */}
      {showDak && <DakPlaten bounds={bounds} hoogste={bounds.maxY} />}
    </>
  )
}

// Stats Card
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-800/80 backdrop-blur rounded-lg px-3 py-2">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

// Element Info Panel
function ElementInfoPanel({ element, onClose }: { element: CADElement; onClose: () => void }) {
  return (
    <div className="absolute right-4 top-4 w-72 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm">Element ID</p>
            <p className="text-xl font-bold text-white">{element.id}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Profiel */}
        <div className="text-center py-3 bg-gray-800 rounded-xl">
          <p className="text-3xl font-bold text-white">{element.profielNaam}</p>
          <p className="text-sm text-gray-400 capitalize">{element.type}</p>
        </div>
        
        {/* Specs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Lengte</p>
            <p className="text-lg font-bold text-white">{element.lengte} mm</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Gewicht</p>
            <p className="text-lg font-bold text-white">{element.gewicht} kg</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Verdieping</p>
            <p className="text-lg font-bold text-white">{element.verdieping}</p>
          </div>
          <div 
            className="rounded-lg p-3"
            style={{ backgroundColor: CONDITIE_KLEUREN[element.conditie] + '30' }}
          >
            <p className="text-xs text-gray-400">Conditie</p>
            <p 
              className="text-lg font-bold capitalize"
              style={{ color: CONDITIE_KLEUREN[element.conditie] }}
            >
              {element.conditie}
            </p>
          </div>
        </div>
        
        {/* Positie */}
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-400 mb-2">Positie (mm)</p>
          <div className="grid grid-cols-3 gap-2 text-center font-mono text-sm">
            <div>
              <span className="text-gray-500">X:</span>
              <span className="text-white ml-1">{element.positie.x}</span>
            </div>
            <div>
              <span className="text-gray-500">Y:</span>
              <span className="text-white ml-1">{element.positie.y}</span>
            </div>
            <div>
              <span className="text-gray-500">Z:</span>
              <span className="text-white ml-1">{element.positie.z}</span>
            </div>
          </div>
        </div>
        
        {/* Acties */}
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-2 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
            <CheckCircle2 className="w-4 h-4" />
            Oogsten
          </button>
          <button className="flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Scissors className="w-4 h-4" />
            Planning
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GebouwViewer3DPage() {
  const { gebouwId } = useParams<{ gebouwId: string }>()
  const navigate = useNavigate()
  
  // State voor geïmporteerd model uit IndexedDB
  const [importedModel, setImportedModel] = useState<MockGebouw | null>(null)
  const [isLoadingModel, setIsLoadingModel] = useState(false)
  
  // Laad geïmporteerd model uit IndexedDB
  useEffect(() => {
    if (gebouwId === 'imported') {
      console.log('Laden geïmporteerd model uit IndexedDB...')
      setIsLoadingModel(true)
      loadModel('imported')
        .then((stored) => {
          console.log('Geladen uit IndexedDB:', stored)
          if (stored) {
            console.log('Aantal elementen:', stored.elementen?.length)
            setImportedModel({
              id: 'imported',
              naam: stored.naam || 'Geïmporteerd Model',
              adres: 'Via PDF Import',
              beschrijving: `Geïmporteerd model met ${stored.elementen?.length || 0} elementen`,
              bouwjaar: new Date().getFullYear(),
              type: 'industriehal',
              elementen: stored.elementen || []
            })
          } else {
            console.warn('Geen model gevonden in IndexedDB')
          }
        })
        .catch((e) => {
          console.error('Fout bij laden geïmporteerd model:', e)
        })
        .finally(() => {
          setIsLoadingModel(false)
        })
    }
  }, [gebouwId])
  
  // Vind gebouw op basis van route param of gebruik eerste
  const initialGebouw = useMemo(() => {
    // Gebruik geïmporteerd model als beschikbaar
    if (importedModel) return importedModel
    
    if (gebouwId && gebouwId !== 'imported') {
      const found = MOCK_GEBOUWEN.find(g => g.id === gebouwId)
      if (found) return found
    }
    return MOCK_GEBOUWEN[0]
  }, [gebouwId, importedModel])
  
  // Lijst van alle beschikbare gebouwen (inclusief geïmporteerd)
  const alleGebouwen = useMemo(() => {
    const lijst = [...MOCK_GEBOUWEN]
    if (importedModel) {
      lijst.unshift(importedModel)
    }
    return lijst
  }, [importedModel])
  
  const [selectedGebouw, setSelectedGebouw] = useState<MockGebouw>(initialGebouw)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [colorMode, setColorMode] = useState<'conditie' | 'type' | 'status'>('conditie')
  const [highlightedType, setHighlightedType] = useState<ElementType | null>(null)
  const [showEdges, setShowEdges] = useState(true)
  const [showFundering, setShowFundering] = useState(true)
  const [showDak, setShowDak] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [isDayMode, setIsDayMode] = useState(true)
  const showStats = true
  
  // Update selectedGebouw wanneer importedModel beschikbaar komt
  useEffect(() => {
    if (importedModel && gebouwId === 'imported') {
      console.log('Updating selectedGebouw met importedModel:', importedModel.naam, 'met', importedModel.elementen.length, 'elementen')
      setSelectedGebouw(importedModel)
    }
  }, [importedModel, gebouwId])
  
  // === OOGSTPLAN STATE ===
  const [planModus, setPlanModus] = useState<PlanModus>('bekijken')
  const [volgorde, setVolgorde] = useState<string[]>([])
  const [snijpunten, setSnijpunten] = useState<Snijpunt[]>([])
  const [selectedSnijType, setSelectedSnijType] = useState<SnijType>('zaag')
  const [isGenerating, setIsGenerating] = useState(false)
  
  // Update URL als gebouw wijzigt (maar niet voor imported)
  useEffect(() => {
    if (selectedGebouw.id !== gebouwId && gebouwId !== 'imported') {
      navigate(`/gebouw-3d/${selectedGebouw.id}`, { replace: true })
    }
  }, [selectedGebouw.id, gebouwId, navigate])
  
  // === OOGSTPLAN HANDLERS ===
  const handleElementClick = (id: string | null) => {
    if (planModus === 'volgorde' && id) {
      // Toggle in volgorde
      if (volgorde.includes(id)) {
        setVolgorde(prev => prev.filter(v => v !== id))
      } else {
        setVolgorde(prev => [...prev, id])
      }
    } else {
      setSelectedElementId(selectedElementId === id ? null : id)
    }
  }
  
  const handleSnijpuntClick = (elementId: string, positie: number) => {
    if (planModus === 'snijpunten') {
      const newSnijpunt: Snijpunt = {
        id: `sp-${Date.now()}`,
        elementId,
        positie,
        type: selectedSnijType
      }
      setSnijpunten(prev => [...prev, newSnijpunt])
    }
  }
  
  const handleSnijpuntDelete = (id: string) => {
    setSnijpunten(prev => prev.filter(s => s.id !== id))
  }
  
  const handleAutoGenerate = async () => {
    setIsGenerating(true)
    
    // Simuleer AI generatie
    await new Promise(r => setTimeout(r, 1500))
    
    // Sorteer elementen op demontage prioriteit
    const gesorteerd = [...selectedGebouw.elementen].sort((a, b) => 
      DEMONTAGE_PRIORITEIT[a.type] - DEMONTAGE_PRIORITEIT[b.type]
    )
    
    setVolgorde(gesorteerd.map(e => e.id))
    
    // Voeg snijpunten toe voor lange elementen (>6m)
    const nieuweSnijpunten: Snijpunt[] = []
    gesorteerd.forEach(el => {
      if (el.lengte > 6000) {
        nieuweSnijpunten.push({
          id: `sp-auto-${el.id}`,
          elementId: el.id,
          positie: 0.5,
          type: 'zaag'
        })
      }
    })
    setSnijpunten(nieuweSnijpunten)
    
    setIsGenerating(false)
    setPlanModus('review')
  }
  
  const handleExport = () => {
    const exportData = {
      gebouw: selectedGebouw.naam,
      datum: new Date().toISOString(),
      volgorde: volgorde.map((id, idx) => {
        const el = selectedGebouw.elementen.find(e => e.id === id)
        return { stap: idx + 1, element: el?.profielNaam, id }
      }),
      snijpunten: snijpunten.map(s => ({
        element: selectedGebouw.elementen.find(e => e.id === s.elementId)?.profielNaam,
        type: s.type,
        positie: `${(s.positie * 100).toFixed(0)}%`
      }))
    }
    console.log('Export oogstplan:', exportData)
    alert('Oogstplan geëxporteerd! (zie console)')
  }
  
  const stats = useMemo(() => getGebouwStatistieken(selectedGebouw), [selectedGebouw])
  const selectedElement = selectedGebouw.elementen.find(e => e.id === selectedElementId)

  // Loading state voor geïmporteerde modellen
  if (isLoadingModel) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center bg-gray-900 rounded-xl">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">3D Model laden...</p>
          <p className="text-gray-400 text-sm mt-2">Dit kan even duren voor grote modellen</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800/90 backdrop-blur border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Terug naar Gebouwen */}
            <button
              onClick={() => navigate('/gebouwen')}
              className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Terug naar gebouwen"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">FASE 1</span>
                <span className="text-gray-400 text-sm">3D Viewer + Oogstplan</span>
              </div>
              <h1 className="text-xl font-bold text-white">{selectedGebouw.naam}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Gebouw selector */}
            <div className="relative">
              <select
                value={selectedGebouw.id}
                onChange={(e) => {
                  const gebouw = MOCK_GEBOUWEN.find(g => g.id === e.target.value)
                  if (gebouw) {
                    setSelectedGebouw(gebouw)
                    setSelectedElementId(null)
                    setVolgorde([])
                    setSnijpunten([])
                    setPlanModus('bekijken')
                  }
                }}
                className="appearance-none bg-gray-700 text-white pl-4 pr-10 py-2.5 rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none cursor-pointer"
              >
                {alleGebouwen.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.naam}{g.id === 'imported' || g.adres === 'Via PDF Import' ? ' (PDF Import)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Day/Night toggle */}
            <button
              onClick={() => setIsDayMode(!isDayMode)}
              className={`p-2.5 rounded-xl transition-colors ${
                isDayMode ? 'bg-yellow-500 text-yellow-900' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {isDayMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        {/* MODUS SELECTOR - Oogstplan Workflow */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex bg-gray-700 rounded-xl p-1">
            {([
              { id: 'bekijken', icon: Eye, label: 'Bekijken' },
              { id: 'volgorde', icon: ListOrdered, label: 'Volgorde' },
              { id: 'snijpunten', icon: Crosshair, label: 'Snijpunten' },
              { id: 'review', icon: FileText, label: 'Review' }
            ] as const).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setPlanModus(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  planModus === id 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : 'text-gray-300 hover:text-white hover:bg-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
          
          {/* Auto-genereer knop */}
          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
              isGenerating 
                ? 'bg-purple-800 text-purple-300 cursor-wait' 
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <Wand2 className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Genereren...' : 'Auto-genereer Plan'}
          </button>
          
          {/* Kleur mode (alleen in bekijken) */}
          {planModus === 'bekijken' && (
            <div className="flex bg-gray-700 rounded-xl p-1 ml-auto">
              {(['conditie', 'type'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setColorMode(mode)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    colorMode === mode 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          )}
          
          {/* Snijtype selector (alleen in snijpunten modus) */}
          {planModus === 'snijpunten' && (
            <div className="flex bg-gray-700 rounded-xl p-1 ml-auto">
              {(['zaag', 'plasma', 'autogeen', 'slijp'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedSnijType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedSnijType === type 
                      ? 'text-white shadow-lg' 
                      : 'text-gray-300 hover:text-white'
                  }`}
                  style={{ backgroundColor: selectedSnijType === type ? SNIJ_KLEUREN[type] : undefined }}
                >
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: SNIJ_KLEUREN[type] }}
                  />
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}
          
          {/* Export knop (in review) */}
          {planModus === 'review' && volgorde.length > 0 && (
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors ml-auto"
            >
              <Download className="w-4 h-4" />
              Export Oogstplan
            </button>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 relative">
        {/* Debug info */}
        <div className="absolute top-4 right-4 z-50 bg-black/80 text-white p-2 rounded text-xs font-mono">
          <div>Gebouw: {selectedGebouw.naam}</div>
          <div>Elementen: {selectedGebouw.elementen.length}</div>
          <div>gebouwId: {gebouwId}</div>
        </div>
        
        {/* 3D Canvas */}
        <Canvas shadows className="bg-gradient-to-b from-gray-900 to-gray-800">
          <Scene 
            elementen={selectedGebouw.elementen}
            selectedId={selectedElementId}
            highlightedType={highlightedType}
            onSelect={handleElementClick}
            colorMode={colorMode}
            showEdges={showEdges}
            showFundering={showFundering}
            showDak={showDak}
            showGrid={showGrid}
            isDayMode={isDayMode}
            planModus={planModus}
            volgorde={volgorde}
            snijpunten={snijpunten}
            onSnijpuntClick={handleSnijpuntClick}
            onSnijpuntDelete={handleSnijpuntDelete}
          />
        </Canvas>
        
        {/* Gebouw Info Overlay */}
        <div className="absolute top-4 left-4 bg-gray-900/90 backdrop-blur-xl rounded-2xl p-4 border border-gray-700 max-w-xs">
          <h3 className="font-bold text-white text-lg">{selectedGebouw.naam}</h3>
          <p className="text-gray-400 text-sm mb-3">{selectedGebouw.adres}</p>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
              {selectedGebouw.bouwjaar}
            </span>
            <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs capitalize">
              {selectedGebouw.type}
            </span>
          </div>
          
          {showStats && (
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Elementen" value={stats.totaalElementen} color="#3b82f6" />
              <StatCard label="Gewicht" value={`${(stats.totaalGewicht/1000).toFixed(1)}t`} color="#8b5cf6" />
              <StatCard label="Herbruikbaar" value={`${stats.herbruikbaarheid}%`} color="#22c55e" />
              <StatCard label="Profielen" value={Object.keys(stats.profielen).length} color="#f59e0b" />
            </div>
          )}
        </div>
        
        {/* View Controls */}
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setShowEdges(!showEdges)}
              className={`p-2.5 rounded-xl backdrop-blur transition-all ${
                showEdges ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
              }`}
              title="Randen tonen"
            >
              <Box className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2.5 rounded-xl backdrop-blur transition-all ${
                showGrid ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
              }`}
              title="Grid tonen"
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowFundering(!showFundering)}
              className={`p-2.5 rounded-xl backdrop-blur transition-all ${
                showFundering ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
              }`}
              title="Fundering tonen"
            >
              <Layers className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowDak(!showDak)}
              className={`p-2.5 rounded-xl backdrop-blur transition-all ${
                showDak ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300 hover:bg-gray-700'
              }`}
              title="Dak tonen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={() => {
              setSelectedElementId(null)
              setHighlightedType(null)
            }}
            className="p-2.5 rounded-xl bg-gray-800/80 text-gray-300 hover:bg-gray-700 backdrop-blur transition-all"
            title="Reset view"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
        
        {/* Type Legend */}
        <div className="absolute bottom-4 right-4 bg-gray-900/90 backdrop-blur-xl rounded-xl p-3 border border-gray-700">
          <p className="text-xs text-gray-400 mb-2 font-medium">
            {colorMode === 'conditie' ? 'Conditie' : 'Element Type'}
          </p>
          <div className="space-y-1">
            {colorMode === 'conditie' ? (
              (['goed', 'matig', 'slecht'] as const).map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: CONDITIE_KLEUREN[key] }} />
                  <span className="text-xs text-gray-300 capitalize">{key}</span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {stats.conditie[key] || 0}
                  </span>
                </div>
              ))
            ) : (
              Object.entries(stats.types).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setHighlightedType(highlightedType === type ? null : type as ElementType)}
                  className={`w-full flex items-center gap-2 px-1 py-0.5 rounded transition-colors ${
                    highlightedType === type ? 'bg-purple-600/30' : 'hover:bg-gray-800'
                  }`}
                >
                  <div 
                    className="w-3 h-3 rounded" 
                    style={{ backgroundColor: TYPE_KLEUREN[type as ElementType] }} 
                  />
                  <span className="text-xs text-gray-300 capitalize">{type}</span>
                  <span className="text-xs text-gray-500 ml-auto">{count}</span>
                </button>
              ))
            )}
          </div>
        </div>
        
        {/* Navigation Help */}
        <div className="absolute top-4 right-4 bg-gray-900/70 backdrop-blur rounded-lg px-3 py-2 text-xs text-gray-400">
          {planModus === 'bekijken' && <p>🖱️ Links: Roteren • Rechts: Pan • Scroll: Zoom</p>}
          {planModus === 'volgorde' && <p>🎯 Klik op elementen om volgorde te bepalen</p>}
          {planModus === 'snijpunten' && <p>✂️ Klik op een element om snijpunt te plaatsen</p>}
          {planModus === 'review' && <p>📋 Bekijk je oogstplan en exporteer</p>}
        </div>
        
        {/* OOGSTPLAN SIDEBAR - Volgorde & Review */}
        {(planModus === 'volgorde' || planModus === 'review') && volgorde.length > 0 && (
          <div className="absolute top-4 right-4 w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden max-h-[70vh]">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Demontage Volgorde</p>
                  <p className="text-xl font-bold text-white">{volgorde.length} elementen</p>
                </div>
                <ListOrdered className="w-8 h-8 text-white/70" />
              </div>
            </div>
            
            <div className="p-3 max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {volgorde.map((id, index) => {
                  const el = selectedGebouw.elementen.find(e => e.id === id)
                  if (!el) return null
                  const snijCount = snijpunten.filter(s => s.elementId === id).length
                  
                  return (
                    <div 
                      key={id}
                      className="flex items-center gap-3 p-2 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                    >
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                        style={{ 
                          backgroundColor: index < 3 ? '#22c55e' : index < 6 ? '#f59e0b' : '#ef4444'
                        }}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">{el.profielNaam}</p>
                        <p className="text-gray-400 text-xs capitalize">{el.type} • {el.lengte}mm</p>
                      </div>
                      {snijCount > 0 && (
                        <span className="px-2 py-0.5 bg-orange-600/30 text-orange-400 text-xs rounded">
                          {snijCount} ✂️
                        </span>
                      )}
                      {planModus === 'volgorde' && (
                        <button
                          onClick={() => setVolgorde(prev => prev.filter(v => v !== id))}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            
            {/* Snijpunten overzicht in review */}
            {planModus === 'review' && snijpunten.length > 0 && (
              <div className="border-t border-gray-700 p-3">
                <p className="text-gray-400 text-xs font-medium mb-2">Snijpunten ({snijpunten.length})</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(
                    snijpunten.reduce((acc, s) => {
                      acc[s.type] = (acc[s.type] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <span 
                      key={type}
                      className="px-2 py-1 rounded text-xs font-medium text-white"
                      style={{ backgroundColor: SNIJ_KLEUREN[type as SnijType] }}
                    >
                      {type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Totaal gewicht */}
            <div className="border-t border-gray-700 p-3 bg-gray-800/50">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Totaal gewicht:</span>
                <span className="text-white font-bold">
                  {(volgorde.reduce((sum, id) => {
                    const el = selectedGebouw.elementen.find(e => e.id === id)
                    return sum + (el?.gewicht || 0)
                  }, 0) / 1000).toFixed(2)} ton
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Instructie banner voor lege states */}
        {planModus === 'volgorde' && volgorde.length === 0 && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-600/90 backdrop-blur text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <Target className="w-5 h-5" />
            <span>Klik op elementen in het 3D model om de demontage volgorde te bepalen</span>
          </div>
        )}
        
        {planModus === 'snijpunten' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-orange-600/90 backdrop-blur text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <Crosshair className="w-5 h-5" />
            <span>Klik op een element om een {selectedSnijType}snede te plaatsen</span>
          </div>
        )}
        
        {/* Element Info Panel */}
        {selectedElement && planModus === 'bekijken' && (
          <ElementInfoPanel element={selectedElement} onClose={() => setSelectedElementId(null)} />
        )}
      </div>
    </div>
  )
}
