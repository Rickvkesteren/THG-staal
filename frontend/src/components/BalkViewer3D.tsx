import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Html, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
// Types are inferred locally

interface SchoonmaakZone {
  id: string
  type: 'roest' | 'verf' | 'beton' | 'las' | 'deuk'
  positie: { start: number; einde: number; kant: 'boven' | 'onder' | 'links' | 'rechts' }
  oppervlakte: number
  diepte: number
  actie: 'verwijderen' | 'repareren' | 'markeren'
}

interface BalkViewer3DProps {
  profielNaam: string
  lengte: number
  zones: SchoonmaakZone[]
  afSnijdenStart: number
  afSnijdenEinde: number
  className?: string
}

// Profiel afmetingen
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

// I-profiel geometrie generator
function createIProfileGeometry(
  hoogte: number,
  breedte: number,
  flensDikte: number,
  lijfDikte: number,
  lengte: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape()
  
  const h = hoogte / 1000
  const b = breedte / 1000
  const tf = flensDikte / 1000
  const tw = lijfDikte / 1000
  
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
  
  return new THREE.ExtrudeGeometry(shape, {
    depth: lengte / 1000,
    bevelEnabled: false,
  })
}

// Balk mesh component
function Balk({ 
  profielNaam, 
  lengte, 
  afSnijdenStart, 
  afSnijdenEinde 
}: { 
  profielNaam: string
  lengte: number
  afSnijdenStart: number
  afSnijdenEinde: number
}) {
  const afmetingen = PROFIEL_AFMETINGEN[profielNaam] || PROFIEL_AFMETINGEN['HEA 200']
  
  // Netto lengte (na afsnijden)
  const nettoLengte = lengte - afSnijdenStart - afSnijdenEinde
  const nettoStart = afSnijdenStart
  
  // Geometrie voor netto deel
  const nettoGeometry = useMemo(() => 
    createIProfileGeometry(
      afmetingen.h,
      afmetingen.b,
      afmetingen.tf,
      afmetingen.tw,
      nettoLengte
    ), [afmetingen, nettoLengte]
  )
  
  // Geometrie voor af te snijden delen
  const startCutGeometry = useMemo(() => 
    afSnijdenStart > 0 ? createIProfileGeometry(
      afmetingen.h,
      afmetingen.b,
      afmetingen.tf,
      afmetingen.tw,
      afSnijdenStart
    ) : null, [afmetingen, afSnijdenStart]
  )
  
  const endCutGeometry = useMemo(() => 
    afSnijdenEinde > 0 ? createIProfileGeometry(
      afmetingen.h,
      afmetingen.b,
      afmetingen.tf,
      afmetingen.tw,
      afSnijdenEinde
    ) : null, [afmetingen, afSnijdenEinde]
  )
  
  return (
    <group>
      {/* Af te snijden start - ROOD */}
      {startCutGeometry && (
        <mesh geometry={startCutGeometry} position={[0, 0, 0]}>
          <meshStandardMaterial 
            color="#ef4444" 
            metalness={0.4} 
            roughness={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Netto deel - GROEN */}
      <mesh 
        geometry={nettoGeometry} 
        position={[0, 0, nettoStart / 1000]}
      >
        <meshStandardMaterial 
          color="#22c55e" 
          metalness={0.6} 
          roughness={0.4}
        />
      </mesh>
      
      {/* Af te snijden einde - ROOD */}
      {endCutGeometry && (
        <mesh 
          geometry={endCutGeometry} 
          position={[0, 0, (lengte - afSnijdenEinde) / 1000]}
        >
          <meshStandardMaterial 
            color="#ef4444" 
            metalness={0.4} 
            roughness={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>
      )}
      
      {/* Snijlijnen */}
      {afSnijdenStart > 0 && (
        <mesh position={[0, 0, afSnijdenStart / 1000]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial color="#dc2626" side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      )}
      {afSnijdenEinde > 0 && (
        <mesh position={[0, 0, (lengte - afSnijdenEinde) / 1000]}>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial color="#dc2626" side={THREE.DoubleSide} transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  )
}

// Zone marker component
function ZoneMarker({ 
  zone, 
  balkLengte: _balkLengte, 
  balkAfmetingen 
}: { 
  zone: SchoonmaakZone
  balkLengte: number
  balkAfmetingen: { h: number; b: number; tf: number; tw: number }
}) {
  const startZ = zone.positie.start / 1000
  const lengteZ = (zone.positie.einde - zone.positie.start) / 1000
  const centerZ = startZ + lengteZ / 2
  
  // Positie op basis van kant
  let position: [number, number, number] = [0, 0, centerZ]
  let rotation: [number, number, number] = [0, 0, 0]
  const h = balkAfmetingen.h / 1000
  const b = balkAfmetingen.b / 1000
  
  switch (zone.positie.kant) {
    case 'boven':
      position = [0, h / 2 + 0.02, centerZ]
      rotation = [-Math.PI / 2, 0, 0]
      break
    case 'onder':
      position = [0, -h / 2 - 0.02, centerZ]
      rotation = [Math.PI / 2, 0, 0]
      break
    case 'links':
      position = [-b / 2 - 0.02, 0, centerZ]
      rotation = [0, Math.PI / 2, 0]
      break
    case 'rechts':
      position = [b / 2 + 0.02, 0, centerZ]
      rotation = [0, -Math.PI / 2, 0]
      break
  }
  
  const kleur = zone.actie === 'verwijderen' ? '#ef4444' : 
                zone.actie === 'repareren' ? '#f59e0b' : '#eab308'
  
  return (
    <group position={position} rotation={rotation}>
      {/* Zone vlak */}
      <mesh>
        <planeGeometry args={[b * 0.8, lengteZ]} />
        <meshBasicMaterial 
          color={kleur} 
          transparent 
          opacity={0.7} 
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Rand */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(b * 0.8, lengteZ)]} />
        <lineBasicMaterial color={kleur} linewidth={2} />
      </lineSegments>
      
      {/* Label */}
      <Html position={[0, 0, 0.05]} center>
        <div 
          className="text-xs font-bold px-1 py-0.5 rounded whitespace-nowrap"
          style={{ 
            backgroundColor: kleur, 
            color: 'white',
            transform: 'scale(0.8)'
          }}
        >
          {zone.type}
        </div>
      </Html>
    </group>
  )
}

// Scene component
function BalkScene({ 
  profielNaam, 
  lengte, 
  zones, 
  afSnijdenStart, 
  afSnijdenEinde 
}: BalkViewer3DProps) {
  const afmetingen = PROFIEL_AFMETINGEN[profielNaam] || PROFIEL_AFMETINGEN['HEA 200']
  
  // Center de balk
  const centerOffset = -lengte / 2000
  
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      
      <group position={[0, 0, centerOffset]}>
        {/* Balk */}
        <Balk 
          profielNaam={profielNaam}
          lengte={lengte}
          afSnijdenStart={afSnijdenStart}
          afSnijdenEinde={afSnijdenEinde}
        />
        
        {/* Zone markers */}
        {zones.map((zone) => (
          <ZoneMarker 
            key={zone.id}
            zone={zone}
            balkLengte={lengte}
            balkAfmetingen={afmetingen}
          />
        ))}
        
        {/* Lengtemaat */}
        <group position={[0, -afmetingen.h / 2000 - 0.15, lengte / 2000]}>
          <Html center>
            <div className="text-xs text-white bg-gray-800/80 px-2 py-1 rounded">
              {lengte} mm
            </div>
          </Html>
        </group>
      </group>
      
      {/* Grid */}
      <Grid
        args={[10, 10]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#4b5563"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#374151"
        fadeDistance={20}
        position={[0, -0.3, 0]}
      />
      
      <axesHelper args={[1]} />
    </>
  )
}

// Hoofd component
export default function BalkViewer3D({ 
  profielNaam, 
  lengte, 
  zones,
  afSnijdenStart = 0,
  afSnijdenEinde = 0,
  className = ''
}: BalkViewer3DProps) {
  const [viewAngle, setViewAngle] = useState<'3d' | 'top' | 'side' | 'front'>('3d')
  
  const cameraPosition: [number, number, number] = 
    viewAngle === 'top' ? [0, 5, 0] :
    viewAngle === 'side' ? [5, 0, 0] :
    viewAngle === 'front' ? [0, 0, 5] :
    [3, 2, 3]
  
  return (
    <div className={`relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden ${className}`}>
      {/* View controls */}
      <div className="absolute top-3 left-3 z-10 flex gap-1 bg-white/90 backdrop-blur rounded-lg p-1">
        {(['3d', 'top', 'side', 'front'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setViewAngle(view)}
            className={`px-2 py-1 text-xs font-medium rounded ${
              viewAngle === view 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            {view.toUpperCase()}
          </button>
        ))}
      </div>
      
      {/* Legenda */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur rounded-lg p-2 text-xs">
        <div className="font-medium mb-1">Legenda</div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Bruikbaar</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>Af te snijden</span>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-3 h-3 bg-red-500/70 rounded" />
          <span>Verwijderen</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-amber-500/70 rounded" />
          <span>Repareren</span>
        </div>
      </div>
      
      {/* Info */}
      <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur rounded-lg p-2 text-xs">
        <div className="font-medium">{profielNaam}</div>
        <div className="text-gray-600">{lengte} mm</div>
        <div className="text-gray-600">{zones.length} zones</div>
        {(afSnijdenStart > 0 || afSnijdenEinde > 0) && (
          <div className="text-red-600 font-medium mt-1">
            Afsnijden: {afSnijdenStart + afSnijdenEinde} mm
          </div>
        )}
      </div>
      
      {/* Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={cameraPosition} fov={50} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          minDistance={1}
          maxDistance={20}
        />
        <BalkScene 
          profielNaam={profielNaam}
          lengte={lengte}
          zones={zones}
          afSnijdenStart={afSnijdenStart}
          afSnijdenEinde={afSnijdenEinde}
        />
      </Canvas>
    </div>
  )
}
