import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, PerspectiveCamera, Environment } from '@react-three/drei'
import { parseCADFile, type CADParseResult, exportToJSON } from '../utils/cadParser'
import type { CADElement, Conditie } from '../types'

// Kleuren per conditie
const CONDITIE_KLEUREN: Record<Conditie, string> = {
  goed: '#22c55e',
  matig: '#f59e0b',
  slecht: '#ef4444',
  onbekend: '#6b7280'
}

// 3D Element component
function Element3D({ 
  element, 
  selected, 
  onClick 
}: { 
  element: CADElement
  selected: boolean
  onClick: () => void 
}) {
  const isKolom = element.type === 'kolom'
  const color = CONDITIE_KLEUREN[element.conditie] || '#3b82f6'
  
  // Schaal voor weergave (mm naar meters voor Three.js)
  const lengteM = element.lengte / 1000
  const profielGrootte = parseFloat(element.profielNaam.match(/\d+/)?.[0] || '200') / 1000
  
  return (
    <mesh
      position={[
        element.positie.x / 1000,
        element.positie.z / 1000 + (isKolom ? lengteM / 2 : 0),
        element.positie.y / 1000
      ]}
      rotation={[
        isKolom ? 0 : Math.PI / 2,
        0,
        element.rotatie.z * (Math.PI / 180)
      ]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <boxGeometry args={[
        isKolom ? profielGrootte : lengteM,
        isKolom ? lengteM : profielGrootte,
        profielGrootte
      ]} />
      <meshStandardMaterial 
        color={selected ? '#8b5cf6' : color} 
        metalness={0.6}
        roughness={0.3}
        emissive={selected ? '#4c1d95' : '#000000'}
        emissiveIntensity={selected ? 0.3 : 0}
      />
    </mesh>
  )
}

// 3D Scene
function Scene({ 
  elementen, 
  selectedId, 
  onSelect 
}: { 
  elementen: CADElement[]
  selectedId: string | null
  onSelect: (id: string | null) => void 
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={50} />
      <OrbitControls 
        enablePan 
        enableZoom 
        enableRotate 
        maxPolarAngle={Math.PI / 2}
        minDistance={5}
        maxDistance={100}
      />
      
      <Environment preset="warehouse" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      
      <Grid 
        infiniteGrid 
        cellSize={1} 
        sectionSize={5} 
        fadeDistance={50}
        cellColor="#374151"
        sectionColor="#1f2937"
      />
      
      {/* Vloer */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1f2937" transparent opacity={0.5} />
      </mesh>
      
      {/* Elementen */}
      {elementen.map((element) => (
        <Element3D
          key={element.id}
          element={element}
          selected={selectedId === element.id}
          onClick={() => onSelect(selectedId === element.id ? null : element.id)}
        />
      ))}
    </>
  )
}

export function CADImportPage() {
  const [parseResult, setParseResult] = useState<CADParseResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [viewMode, setViewMode] = useState<'3d' | 'lijst'>('3d')
  
  const selectedElement = parseResult?.elementen.find(e => e.id === selectedId)
  
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    const cadFile = files.find(f => 
      /\.(ifc|step|stp|dxf|json)$/i.test(f.name)
    )
    
    if (cadFile) {
      const result = await parseCADFile(cadFile)
      setParseResult(result)
      setSelectedId(null)
    }
  }, [])
  
  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const result = await parseCADFile(file)
      setParseResult(result)
      setSelectedId(null)
    }
  }, [])
  
  const handleExport = useCallback(() => {
    if (!parseResult) return
    
    const json = exportToJSON(parseResult.elementen, parseResult.metadata.projectNaam || 'export')
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `staal-export-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [parseResult])
  
  const handleLoadDemo = useCallback(async () => {
    // Demo data laden
    const demoData = {
      projectNaam: "Demo Industriehal",
      bouwjaar: 1985,
      elementen: [
        { id: "k1", type: "kolom", profielNaam: "HEB 300", lengte: 6000, conditie: "goed", positie: { x: 0, y: 0, z: 0 } },
        { id: "k2", type: "kolom", profielNaam: "HEB 300", lengte: 6000, conditie: "goed", positie: { x: 6000, y: 0, z: 0 } },
        { id: "k3", type: "kolom", profielNaam: "HEB 300", lengte: 6000, conditie: "matig", positie: { x: 12000, y: 0, z: 0 } },
        { id: "k4", type: "kolom", profielNaam: "HEB 300", lengte: 6000, conditie: "goed", positie: { x: 0, y: 6000, z: 0 } },
        { id: "k5", type: "kolom", profielNaam: "HEB 300", lengte: 6000, conditie: "slecht", positie: { x: 6000, y: 6000, z: 0 } },
        { id: "k6", type: "kolom", profielNaam: "HEB 300", lengte: 6000, conditie: "goed", positie: { x: 12000, y: 6000, z: 0 } },
        { id: "b1", type: "balk", profielNaam: "HEA 300", lengte: 6000, conditie: "goed", positie: { x: 0, y: 0, z: 6000 } },
        { id: "b2", type: "balk", profielNaam: "HEA 300", lengte: 6000, conditie: "goed", positie: { x: 6000, y: 0, z: 6000 } },
        { id: "b3", type: "balk", profielNaam: "HEA 300", lengte: 6000, conditie: "matig", positie: { x: 0, y: 6000, z: 6000 } },
        { id: "b4", type: "balk", profielNaam: "HEA 300", lengte: 6000, conditie: "goed", positie: { x: 6000, y: 6000, z: 6000 } },
        { id: "l1", type: "ligger", profielNaam: "IPE 300", lengte: 6000, conditie: "goed", positie: { x: 0, y: 0, z: 6000 }, rotatie: { x: 0, y: 0, z: 90 } },
        { id: "l2", type: "ligger", profielNaam: "IPE 300", lengte: 6000, conditie: "goed", positie: { x: 6000, y: 0, z: 6000 }, rotatie: { x: 0, y: 0, z: 90 } },
        { id: "l3", type: "ligger", profielNaam: "IPE 300", lengte: 6000, conditie: "goed", positie: { x: 12000, y: 0, z: 6000 }, rotatie: { x: 0, y: 0, z: 90 } },
      ]
    }
    
    const blob = new Blob([JSON.stringify(demoData)], { type: 'application/json' })
    const file = new File([blob], 'demo.json', { type: 'application/json' })
    const result = await parseCADFile(file)
    setParseResult(result)
  }, [])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">📐 CAD Import</h1>
            <p className="text-gray-400">Importeer IFC, STEP, DXF of JSON bestanden</p>
          </div>
          
          <div className="flex gap-3">
            {/* View toggle */}
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === '3d' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                🎮 3D View
              </button>
              <button
                onClick={() => setViewMode('lijst')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'lijst' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                📋 Lijst
              </button>
            </div>
            
            <button
              onClick={handleLoadDemo}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              🏭 Demo Laden
            </button>
            
            {parseResult && parseResult.success && (
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                💾 Exporteren
              </button>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Main Content */}
        <div className="flex-1 relative">
          {!parseResult ? (
            // Upload zone
            <div
              className={`absolute inset-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors ${
                isDragging 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <div className="text-6xl mb-4">📁</div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Sleep een CAD bestand hierheen
              </h2>
              <p className="text-gray-400 mb-6">
                Ondersteunde formaten: IFC, STEP, DXF, JSON
              </p>
              
              <label className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors">
                Of kies een bestand
                <input
                  type="file"
                  accept=".ifc,.step,.stp,.dxf,.json"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          ) : parseResult.success ? (
            viewMode === '3d' ? (
              // 3D Canvas
              <Canvas shadows className="bg-gray-900">
                <Scene 
                  elementen={parseResult.elementen}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </Canvas>
            ) : (
              // Lijst view
              <div className="p-4 overflow-auto h-full">
                <table className="w-full text-left">
                  <thead className="bg-gray-800 sticky top-0">
                    <tr>
                      <th className="p-3 text-gray-300">ID</th>
                      <th className="p-3 text-gray-300">Type</th>
                      <th className="p-3 text-gray-300">Profiel</th>
                      <th className="p-3 text-gray-300">Lengte</th>
                      <th className="p-3 text-gray-300">Gewicht</th>
                      <th className="p-3 text-gray-300">Conditie</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.elementen.map(el => (
                      <tr 
                        key={el.id}
                        onClick={() => setSelectedId(el.id)}
                        className={`border-b border-gray-700 cursor-pointer transition-colors ${
                          selectedId === el.id ? 'bg-blue-900/50' : 'hover:bg-gray-800'
                        }`}
                      >
                        <td className="p-3 text-gray-200 font-mono">{el.id}</td>
                        <td className="p-3 text-gray-200 capitalize">{el.type}</td>
                        <td className="p-3 text-blue-400 font-medium">{el.profielNaam}</td>
                        <td className="p-3 text-gray-200">{el.lengte} mm</td>
                        <td className="p-3 text-gray-200">{el.gewicht.toFixed(1)} kg</td>
                        <td className="p-3">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{ 
                              backgroundColor: CONDITIE_KLEUREN[el.conditie] + '20',
                              color: CONDITIE_KLEUREN[el.conditie]
                            }}
                          >
                            {el.conditie}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            // Error state
            <div className="absolute inset-4 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-white mb-2">Fout bij importeren</h2>
              {parseResult.errors.map((err, i) => (
                <p key={i} className="text-red-400">{err}</p>
              ))}
              <button
                onClick={() => setParseResult(null)}
                className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                Opnieuw proberen
              </button>
            </div>
          )}
        </div>
        
        {/* Sidebar met details */}
        {parseResult && parseResult.success && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            {/* Metadata */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">📄 Bestandsinfo</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bestand:</span>
                  <span className="text-white">{parseResult.metadata.bestandsnaam}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Formaat:</span>
                  <span className="text-blue-400">{parseResult.metadata.formaat}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Elementen:</span>
                  <span className="text-green-400">{parseResult.metadata.aantalElementen}</span>
                </div>
                {parseResult.metadata.projectNaam && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Project:</span>
                    <span className="text-white">{parseResult.metadata.projectNaam}</span>
                  </div>
                )}
                {parseResult.metadata.bouwjaar && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Bouwjaar:</span>
                    <span className="text-white">{parseResult.metadata.bouwjaar}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Statistieken */}
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">📊 Statistieken</h3>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(
                  parseResult.elementen.reduce((acc, el) => {
                    acc[el.type] = (acc[el.type] || 0) + 1
                    return acc
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <div key={type} className="bg-gray-700 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">{count}</div>
                    <div className="text-xs text-gray-400 capitalize">{type}en</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 bg-gray-700 rounded-lg p-3">
                <div className="text-2xl font-bold text-green-400">
                  {parseResult.elementen.reduce((sum, el) => sum + el.gewicht, 0).toFixed(0)} kg
                </div>
                <div className="text-xs text-gray-400">Totaal gewicht</div>
              </div>
            </div>
            
            {/* Geselecteerd element */}
            {selectedElement && (
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">✨ Geselecteerd</h3>
                <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                  <div className="text-xl font-bold text-blue-400">
                    {selectedElement.profielNaam}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white ml-2 capitalize">{selectedElement.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">ID:</span>
                      <span className="text-white ml-2 font-mono">{selectedElement.id}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Lengte:</span>
                      <span className="text-white ml-2">{selectedElement.lengte} mm</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Gewicht:</span>
                      <span className="text-white ml-2">{selectedElement.gewicht.toFixed(1)} kg</span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-600">
                    <span className="text-gray-400 text-sm">Conditie:</span>
                    <div 
                      className="mt-1 px-3 py-2 rounded-lg text-center font-medium"
                      style={{ 
                        backgroundColor: CONDITIE_KLEUREN[selectedElement.conditie] + '20',
                        color: CONDITIE_KLEUREN[selectedElement.conditie]
                      }}
                    >
                      {selectedElement.conditie.toUpperCase()}
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-600 text-sm">
                    <span className="text-gray-400">Positie:</span>
                    <div className="font-mono text-gray-300 mt-1">
                      X: {selectedElement.positie.x} | Y: {selectedElement.positie.y} | Z: {selectedElement.positie.z}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Legenda */}
            <div className="p-4 border-t border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">🎨 Legenda</h3>
              <div className="space-y-2">
                {Object.entries(CONDITIE_KLEUREN).map(([conditie, kleur]) => (
                  <div key={conditie} className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: kleur }}
                    />
                    <span className="text-gray-300 capitalize">{conditie}</span>
                  </div>
                ))}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-gray-700">
                  <div className="w-4 h-4 rounded bg-purple-500" />
                  <span className="text-gray-300">Geselecteerd</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CADImportPage
