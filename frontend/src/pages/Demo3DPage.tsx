import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei'
import { Building2, Box, Layers, BarChart3, Eye, RotateCcw } from 'lucide-react'
import { MOCK_GEBOUWEN, getGebouwStatistieken, type MockGebouw } from '../data/mockBuildings'
import type { CADElement, Conditie, ElementType } from '../types'

// Kleuren per conditie
const CONDITIE_KLEUREN: Record<Conditie, string> = {
  goed: '#22c55e',
  matig: '#f59e0b', 
  slecht: '#ef4444',
  onbekend: '#6b7280'
}

// Type iconen
const TYPE_ICONS: Record<string, string> = {
  kolom: '⬍',
  balk: '━',
  ligger: '═',
  schoor: '╱',
  spant: '⌂',
  windverband: '╳',
  vloerligger: '▬'
}

// 3D Element component
function Element3D({ 
  element, 
  selected, 
  highlighted,
  onClick,
  colorMode
}: { 
  element: CADElement
  selected: boolean
  highlighted: boolean
  onClick: () => void
  colorMode: 'conditie' | 'type'
}) {
  const isKolom = element.type === 'kolom'
  
  // Kleuren
  const typeKleuren: Record<ElementType, string> = {
    kolom: '#3b82f6',
    balk: '#8b5cf6',
    ligger: '#06b6d4',
    schoor: '#f97316',
    spant: '#ec4899',
    windverband: '#84cc16',
    vloerligger: '#14b8a6'
  }
  
  const baseColor = colorMode === 'conditie' 
    ? CONDITIE_KLEUREN[element.conditie] 
    : typeKleuren[element.type] || '#6b7280'
  
  // Schaal voor weergave (mm naar meters)
  const lengteM = element.lengte / 1000
  const profielGrootte = parseFloat(element.profielNaam.match(/\d+/)?.[0] || '200') / 1000 * 0.8
  
  // Bereken dimensies op basis van type
  let width = profielGrootte
  let height = isKolom ? lengteM : profielGrootte
  let depth = isKolom ? profielGrootte : lengteM
  
  // Positie
  const posX = element.positie.x / 1000
  const posY = element.positie.z / 1000 + (isKolom ? lengteM / 2 : profielGrootte / 2)
  const posZ = element.positie.y / 1000
  
  // Rotatie
  const rotX = (element.rotatie.x || 0) * (Math.PI / 180)
  const rotY = (element.rotatie.z || 0) * (Math.PI / 180)
  const rotZ = (element.rotatie.y || 0) * (Math.PI / 180)

  return (
    <mesh
      position={[posX, posY, posZ]}
      rotation={[rotX, rotY, rotZ]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial 
        color={selected ? '#ffffff' : highlighted ? '#a78bfa' : baseColor}
        metalness={0.7}
        roughness={0.2}
        emissive={selected ? baseColor : highlighted ? '#7c3aed' : '#000000'}
        emissiveIntensity={selected ? 0.4 : highlighted ? 0.2 : 0}
      />
    </mesh>
  )
}

// Scene component
function Scene({ 
  elementen, 
  selectedId, 
  highlightedType,
  onSelect,
  colorMode,
  showFloor
}: { 
  elementen: CADElement[]
  selectedId: string | null
  highlightedType: ElementType | null
  onSelect: (id: string | null) => void
  colorMode: 'conditie' | 'type'
  showFloor: boolean
}) {
  // Bereken bounding box voor camera positie
  const bounds = useMemo(() => {
    if (elementen.length === 0) return { maxX: 10, maxY: 10, maxZ: 10 }
    const maxX = Math.max(...elementen.map(e => e.positie.x)) / 1000
    const maxY = Math.max(...elementen.map(e => e.positie.z + e.lengte)) / 1000
    const maxZ = Math.max(...elementen.map(e => e.positie.y)) / 1000
    return { maxX, maxY, maxZ }
  }, [elementen])
  
  const cameraDistance = Math.max(bounds.maxX, bounds.maxY, bounds.maxZ) * 1.5

  return (
    <>
      <PerspectiveCamera 
        makeDefault 
        position={[cameraDistance, cameraDistance * 0.7, cameraDistance]} 
        fov={50} 
      />
      <OrbitControls 
        enablePan 
        enableZoom 
        enableRotate 
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        maxDistance={200}
        target={[bounds.maxX / 2, bounds.maxY / 3, bounds.maxZ / 2]}
      />
      
      <Environment preset="city" />
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[50, 80, 50]} 
        intensity={1.5} 
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />
      <directionalLight position={[-30, 40, -30]} intensity={0.3} />
      
      {/* Grid */}
      <Grid 
        infiniteGrid 
        cellSize={1} 
        sectionSize={5} 
        fadeDistance={100}
        cellColor="#475569"
        sectionColor="#334155"
      />
      
      {/* Floor */}
      {showFloor && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[bounds.maxX / 2, -0.01, bounds.maxZ / 2]} receiveShadow>
          <planeGeometry args={[bounds.maxX + 20, bounds.maxZ + 20]} />
          <meshStandardMaterial color="#1e293b" transparent opacity={0.8} />
        </mesh>
      )}
      
      {/* Contact shadows */}
      <ContactShadows 
        position={[bounds.maxX / 2, 0, bounds.maxZ / 2]} 
        scale={100} 
        blur={2} 
        opacity={0.4} 
        far={50}
      />
      
      {/* Elements */}
      {elementen.map((element) => (
        <Element3D
          key={element.id}
          element={element}
          selected={selectedId === element.id}
          highlighted={highlightedType === element.type}
          onClick={() => onSelect(selectedId === element.id ? null : element.id)}
          colorMode={colorMode}
        />
      ))}
    </>
  )
}

// Stats card component
function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className={`bg-gray-800 rounded-lg p-3 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <p className="text-lg font-bold text-white">{value}</p>
        </div>
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
    </div>
  )
}

export default function Demo3DPage() {
  const [selectedGebouw, setSelectedGebouw] = useState<MockGebouw>(MOCK_GEBOUWEN[0])
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [colorMode, setColorMode] = useState<'conditie' | 'type'>('conditie')
  const [highlightedType, setHighlightedType] = useState<ElementType | null>(null)
  const [showFloor, setShowFloor] = useState(true)
  const [filterConditie, setFilterConditie] = useState<Conditie | 'alle'>('alle')
  
  const stats = useMemo(() => getGebouwStatistieken(selectedGebouw), [selectedGebouw])
  
  const selectedElement = selectedGebouw.elementen.find(e => e.id === selectedElementId)
  
  // Filter elementen
  const gefilterdeElementen = useMemo(() => {
    if (filterConditie === 'alle') return selectedGebouw.elementen
    return selectedGebouw.elementen.filter(e => e.conditie === filterConditie)
  }, [selectedGebouw, filterConditie])

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">3D Gebouw Viewer</h1>
              <p className="text-sm text-gray-400">Interactieve structuur visualisatie</p>
            </div>
          </div>
          
          {/* Gebouw selector */}
          <div className="flex items-center gap-3">
            <select
              value={selectedGebouw.id}
              onChange={(e) => {
                const gebouw = MOCK_GEBOUWEN.find(g => g.id === e.target.value)
                if (gebouw) {
                  setSelectedGebouw(gebouw)
                  setSelectedElementId(null)
                }
              }}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {MOCK_GEBOUWEN.map(g => (
                <option key={g.id} value={g.id}>{g.naam}</option>
              ))}
            </select>
            
            {/* Color mode toggle */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setColorMode('conditie')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  colorMode === 'conditie' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Conditie
              </button>
              <button
                onClick={() => setColorMode('type')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  colorMode === 'type' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                Type
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Stats */}
        <div className="w-72 bg-gray-800/50 border-r border-gray-700 overflow-y-auto p-4 space-y-4">
          {/* Gebouw info */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2">{selectedGebouw.naam}</h3>
            <p className="text-sm text-gray-400 mb-2">{selectedGebouw.adres}</p>
            <p className="text-xs text-gray-500">{selectedGebouw.beschrijving}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                {selectedGebouw.bouwjaar}
              </span>
              <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs capitalize">
                {selectedGebouw.type}
              </span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard 
              label="Elementen" 
              value={stats.totaalElementen} 
              icon={Layers} 
              color="border-blue-500" 
            />
            <StatCard 
              label="Gewicht" 
              value={`${(stats.totaalGewicht / 1000).toFixed(1)}t`}
              icon={Box} 
              color="border-purple-500" 
            />
            <StatCard 
              label="Herbruikbaar" 
              value={`${stats.herbruikbaarheid}%`}
              icon={BarChart3} 
              color="border-green-500" 
            />
            <StatCard 
              label="Profielen" 
              value={Object.keys(stats.profielen).length}
              icon={Layers} 
              color="border-orange-500" 
            />
          </div>
          
          {/* Conditie verdeling */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Conditie Verdeling</h4>
            <div className="space-y-2">
              {Object.entries(stats.conditie).map(([conditie, aantal]) => (
                <div key={conditie} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: CONDITIE_KLEUREN[conditie as Conditie] }}
                  />
                  <span className="text-sm text-gray-300 capitalize flex-1">{conditie}</span>
                  <span className="text-sm font-medium text-white">{aantal}</span>
                  <span className="text-xs text-gray-500">
                    ({Math.round(aantal / stats.totaalElementen * 100)}%)
                  </span>
                </div>
              ))}
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 h-2 bg-gray-700 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${stats.conditie.goed / stats.totaalElementen * 100}%` }}
              />
              <div 
                className="h-full bg-yellow-500" 
                style={{ width: `${stats.conditie.matig / stats.totaalElementen * 100}%` }}
              />
              <div 
                className="h-full bg-red-500" 
                style={{ width: `${stats.conditie.slecht / stats.totaalElementen * 100}%` }}
              />
            </div>
          </div>
          
          {/* Type verdeling met hover highlight */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Element Types</h4>
            <div className="space-y-1">
              {Object.entries(stats.types).map(([type, aantal]) => (
                <button
                  key={type}
                  onClick={() => setHighlightedType(highlightedType === type ? null : type as ElementType)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors ${
                    highlightedType === type ? 'bg-purple-600/30' : 'hover:bg-gray-700'
                  }`}
                >
                  <span className="text-lg">{TYPE_ICONS[type] || '▪'}</span>
                  <span className="text-sm text-gray-300 capitalize flex-1 text-left">{type}</span>
                  <span className="text-sm font-medium text-white">{aantal}</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Filter */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-3">Filter op Conditie</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterConditie('alle')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filterConditie === 'alle' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                Alle
              </button>
              {(['goed', 'matig', 'slecht'] as Conditie[]).map(c => (
                <button
                  key={c}
                  onClick={() => setFilterConditie(c)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors capitalize ${
                    filterConditie === c ? 'text-white' : 'text-gray-300'
                  }`}
                  style={{ 
                    backgroundColor: filterConditie === c ? CONDITIE_KLEUREN[c] : '#374151'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* 3D Canvas */}
        <div className="flex-1 relative">
          <Canvas shadows className="bg-gray-900">
            <Scene 
              elementen={gefilterdeElementen}
              selectedId={selectedElementId}
              highlightedType={highlightedType}
              onSelect={setSelectedElementId}
              colorMode={colorMode}
              showFloor={showFloor}
            />
          </Canvas>
          
          {/* Controls overlay */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            <button
              onClick={() => setShowFloor(!showFloor)}
              className={`p-2 rounded-lg backdrop-blur transition-colors ${
                showFloor ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300'
              }`}
              title="Toggle vloer"
            >
              <Layers className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setSelectedElementId(null)
                setHighlightedType(null)
                setFilterConditie('alle')
              }}
              className="p-2 rounded-lg bg-gray-800/80 text-gray-300 hover:bg-gray-700 backdrop-blur transition-colors"
              title="Reset view"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          
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
        
        {/* Right sidebar - Selected element */}
        {selectedElement && (
          <div className="w-80 bg-gray-800/50 border-l border-gray-700 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-400" />
                Element Details
              </h3>
              <button
                onClick={() => setSelectedElementId(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Profiel */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg p-4">
                <p className="text-blue-100 text-sm">Profiel</p>
                <p className="text-2xl font-bold text-white">{selectedElement.profielNaam}</p>
              </div>
              
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">ID</p>
                  <p className="font-mono text-white">{selectedElement.id}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Type</p>
                  <p className="text-white capitalize flex items-center gap-2">
                    <span>{TYPE_ICONS[selectedElement.type]}</span>
                    {selectedElement.type}
                  </p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Lengte</p>
                  <p className="text-white">{selectedElement.lengte} mm</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-xs text-gray-400">Gewicht</p>
                  <p className="text-white">{selectedElement.gewicht} kg</p>
                </div>
              </div>
              
              {/* Conditie */}
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">Conditie</p>
                <div 
                  className="px-4 py-2 rounded-lg text-center font-medium capitalize"
                  style={{ 
                    backgroundColor: CONDITIE_KLEUREN[selectedElement.conditie] + '30',
                    color: CONDITIE_KLEUREN[selectedElement.conditie]
                  }}
                >
                  {selectedElement.conditie}
                </div>
              </div>
              
              {/* Positie */}
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">Positie (mm)</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-500">X</p>
                    <p className="font-mono text-white">{selectedElement.positie.x}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Y</p>
                    <p className="font-mono text-white">{selectedElement.positie.y}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Z</p>
                    <p className="font-mono text-white">{selectedElement.positie.z}</p>
                  </div>
                </div>
              </div>
              
              {/* Verdieping */}
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-2">Verdieping</p>
                <p className="text-xl font-bold text-white">{selectedElement.verdieping}</p>
              </div>
              
              {/* Acties */}
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium">
                  ✓ Markeer als Herbruikbaar
                </button>
                <button className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium">
                  📋 Toevoegen aan Oogstlijst
                </button>
                <button className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm font-medium">
                  🔍 Bekijk Schoonmaakplan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
