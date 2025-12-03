import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Environment, 
  Text,
  Edges,
  Line
} from '@react-three/drei'
import { 
  GitCompare,
  Scissors,
  ArrowRight,
  Package,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Target
} from 'lucide-react'

// Types
interface StandaardProfiel {
  id: string
  naam: string
  type: 'HEA' | 'HEB' | 'IPE' | 'UNP'
  hoogte: number // mm
  breedte: number // mm
  gewichtPerMeter: number // kg/m
  standaardLengtes: number[] // mm
}

interface GeoogstElement {
  id: string
  profielNaam: string
  origineleNaam: string // exacte profiel type
  lengte: number // mm
  conditie: 'goed' | 'matig' | 'slecht'
  herkomst: {
    gebouw: string
    positie: string
  }
  zones: {
    start: number
    eind: number
    type: 'corrosie' | 'schade' | 'lasnaad' | 'boutgat'
    ernst: 'licht' | 'matig' | 'zwaar'
  }[]
}

interface MatchResultaat {
  geoogstElement: GeoogstElement
  matchendProfiel: StandaardProfiel
  snijplan: {
    startSnij: number
    eindSnij: number
    resultaatLengte: number
    afvalStart: number
    afvalEind: number
  }
  matchScore: number // 0-100
  herbruikbaarheid: number // %
  geschatteWaarde: number // €
}

// Standaard profielen database
const STANDAARD_PROFIELEN: StandaardProfiel[] = [
  { id: 'HEA200', naam: 'HEA 200', type: 'HEA', hoogte: 190, breedte: 200, gewichtPerMeter: 42.3, standaardLengtes: [6000, 8000, 10000, 12000] },
  { id: 'HEA240', naam: 'HEA 240', type: 'HEA', hoogte: 230, breedte: 240, gewichtPerMeter: 60.3, standaardLengtes: [6000, 8000, 10000, 12000] },
  { id: 'HEA300', naam: 'HEA 300', type: 'HEA', hoogte: 290, breedte: 300, gewichtPerMeter: 88.3, standaardLengtes: [6000, 8000, 10000, 12000] },
  { id: 'HEB200', naam: 'HEB 200', type: 'HEB', hoogte: 200, breedte: 200, gewichtPerMeter: 61.3, standaardLengtes: [6000, 8000, 10000, 12000] },
  { id: 'HEB300', naam: 'HEB 300', type: 'HEB', hoogte: 300, breedte: 300, gewichtPerMeter: 117, standaardLengtes: [6000, 8000, 10000, 12000] },
  { id: 'IPE200', naam: 'IPE 200', type: 'IPE', hoogte: 200, breedte: 100, gewichtPerMeter: 22.4, standaardLengtes: [6000, 8000, 10000, 12000] },
  { id: 'IPE300', naam: 'IPE 300', type: 'IPE', hoogte: 300, breedte: 150, gewichtPerMeter: 42.2, standaardLengtes: [6000, 8000, 10000, 12000] },
  { id: 'IPE360', naam: 'IPE 360', type: 'IPE', hoogte: 360, breedte: 170, gewichtPerMeter: 57.1, standaardLengtes: [6000, 8000, 10000, 12000] },
]

// Mock geoogste elementen
const MOCK_GEOOGSTE_ELEMENTEN: GeoogstElement[] = [
  {
    id: 'GE-001',
    profielNaam: 'HEA 300',
    origineleNaam: 'HEA 300',
    lengte: 6500,
    conditie: 'goed',
    herkomst: { gebouw: 'Industriehal Westpoort', positie: 'Kolom A3' },
    zones: [
      { start: 0, eind: 350, type: 'corrosie', ernst: 'zwaar' },
      { start: 2000, eind: 2050, type: 'boutgat', ernst: 'licht' },
      { start: 6200, eind: 6500, type: 'lasnaad', ernst: 'matig' }
    ]
  },
  {
    id: 'GE-002',
    profielNaam: 'IPE 360',
    origineleNaam: 'IPE 360',
    lengte: 8200,
    conditie: 'matig',
    herkomst: { gebouw: 'Kantoorpand Centrum', positie: 'Ligger V2-3' },
    zones: [
      { start: 0, eind: 200, type: 'schade', ernst: 'matig' },
      { start: 4000, eind: 4100, type: 'lasnaad', ernst: 'licht' },
      { start: 8000, eind: 8200, type: 'corrosie', ernst: 'licht' }
    ]
  },
  {
    id: 'GE-003',
    profielNaam: 'HEB 200',
    origineleNaam: 'HEB 200',
    lengte: 5800,
    conditie: 'slecht',
    herkomst: { gebouw: 'Parkeergarage Oost', positie: 'Schoor B2' },
    zones: [
      { start: 0, eind: 800, type: 'corrosie', ernst: 'zwaar' },
      { start: 1500, eind: 1600, type: 'boutgat', ernst: 'matig' },
      { start: 3000, eind: 3200, type: 'schade', ernst: 'zwaar' },
      { start: 5500, eind: 5800, type: 'corrosie', ernst: 'zwaar' }
    ]
  },
  {
    id: 'GE-004',
    profielNaam: 'HEA 240',
    origineleNaam: 'HEA 240',
    lengte: 7200,
    conditie: 'goed',
    herkomst: { gebouw: 'Industriehal Westpoort', positie: 'Balk D1' },
    zones: [
      { start: 100, eind: 150, type: 'boutgat', ernst: 'licht' },
      { start: 7050, eind: 7200, type: 'lasnaad', ernst: 'licht' }
    ]
  }
]

// Bereken match resultaat
function berekenMatch(element: GeoogstElement): MatchResultaat | null {
  // Vind matching standaard profiel
  const matchendProfiel = STANDAARD_PROFIELEN.find(p => 
    element.profielNaam.includes(p.naam.split(' ')[1]) && 
    element.profielNaam.includes(p.type)
  )
  
  if (!matchendProfiel) return null
  
  // Bepaal snijpunten gebaseerd op zones
  let startSnij = 0
  let eindSnij = element.lengte
  
  // Zones met zware schade aan begin/eind afsnijden
  element.zones.forEach(zone => {
    if (zone.ernst === 'zwaar') {
      if (zone.start === 0) {
        startSnij = Math.max(startSnij, zone.eind + 50) // 50mm marge
      }
      if (zone.eind === element.lengte) {
        eindSnij = Math.min(eindSnij, zone.start - 50)
      }
    }
  })
  
  // Vind beste standaard lengte
  const beschikbareLengte = eindSnij - startSnij
  const besteStandaardLengte = matchendProfiel.standaardLengtes
    .filter(l => l <= beschikbareLengte)
    .sort((a, b) => b - a)[0] || 0
  
  if (besteStandaardLengte === 0) return null
  
  // Centreer het standaard stuk
  const extraRuimte = beschikbareLengte - besteStandaardLengte
  const nieuweStart = startSnij + extraRuimte / 2
  const nieuweEind = nieuweStart + besteStandaardLengte
  
  // Bereken scores
  const herbruikbaarheid = Math.round((besteStandaardLengte / element.lengte) * 100)
  const matchScore = herbruikbaarheid - (element.conditie === 'slecht' ? 20 : element.conditie === 'matig' ? 10 : 0)
  
  // Geschatte waarde (€0.80/kg voor hergebruikt staal)
  const gewicht = (besteStandaardLengte / 1000) * matchendProfiel.gewichtPerMeter
  const geschatteWaarde = Math.round(gewicht * 0.80)
  
  return {
    geoogstElement: element,
    matchendProfiel,
    snijplan: {
      startSnij: Math.round(nieuweStart),
      eindSnij: Math.round(nieuweEind),
      resultaatLengte: besteStandaardLengte,
      afvalStart: Math.round(nieuweStart),
      afvalEind: Math.round(element.lengte - nieuweEind)
    },
    matchScore: Math.max(0, Math.min(100, matchScore)),
    herbruikbaarheid,
    geschatteWaarde
  }
}

// 3D Balk visualisatie
function Balk3D({ 
  lengte, 
  zones, 
  snijplan,
  profielHoogte,
  profielBreedte,
  showSnijLijnen,
  animatieProgress
}: { 
  lengte: number
  zones: GeoogstElement['zones']
  snijplan?: MatchResultaat['snijplan']
  profielHoogte: number
  profielBreedte: number
  showSnijLijnen: boolean
  animatieProgress: number
}) {
  const scale = 0.0005 // mm to scene units
  const l = lengte * scale
  const h = profielHoogte * scale
  const b = profielBreedte * scale
  const tf = h * 0.07 // flens dikte
  const tw = b * 0.04 // lijf dikte
  
  // Animatie: stukken bewegen na snijden
  const afvalStartOffset = snijplan && animatieProgress > 0.5 
    ? (animatieProgress - 0.5) * 2 * -0.5 
    : 0
  const afvalEindOffset = snijplan && animatieProgress > 0.5 
    ? (animatieProgress - 0.5) * 2 * 0.5 
    : 0
  const fallOffset = snijplan && animatieProgress > 0.7
    ? (animatieProgress - 0.7) * 3 * -0.3
    : 0

  // I-profiel mesh helper
  const renderIProfiel = (startX: number, width: number, color: string, yOffset: number = 0, opacity: number = 1) => (
    <group position={[startX + width/2, yOffset, 0]}>
      {/* Bovenflens */}
      <mesh position={[0, h/2 - tf/2, 0]}>
        <boxGeometry args={[width, tf, b]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} transparent opacity={opacity} />
        <Edges color="#1e293b" threshold={15} />
      </mesh>
      {/* Onderflens */}
      <mesh position={[0, -h/2 + tf/2, 0]}>
        <boxGeometry args={[width, tf, b]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} transparent opacity={opacity} />
        <Edges color="#1e293b" threshold={15} />
      </mesh>
      {/* Lijf */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width, h - 2*tf, tw]} />
        <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} transparent opacity={opacity} />
        <Edges color="#1e293b" threshold={15} />
      </mesh>
    </group>
  )

  return (
    <group>
      {/* Zones visualiseren */}
      {zones.map((zone, i) => {
        const zoneStart = zone.start * scale
        const zoneWidth = (zone.eind - zone.start) * scale
        const color = zone.ernst === 'zwaar' ? '#ef4444' : zone.ernst === 'matig' ? '#f59e0b' : '#fbbf24'
        
        return (
          <mesh key={i} position={[zoneStart + zoneWidth/2, h/2 + 0.02, 0]}>
            <boxGeometry args={[zoneWidth, 0.01, b + 0.02]} />
            <meshStandardMaterial color={color} transparent opacity={0.8} />
          </mesh>
        )
      })}
      
      {/* Snijplan visualisatie */}
      {snijplan && showSnijLijnen && (
        <>
          {/* Afval start (rood, valt weg) */}
          {snijplan.afvalStart > 0 && renderIProfiel(
            afvalStartOffset, 
            snijplan.afvalStart * scale, 
            '#ef4444',
            fallOffset,
            animatieProgress > 0.5 ? 1 - (animatieProgress - 0.5) * 2 : 1
          )}
          
          {/* Bruikbaar deel (groen) */}
          {renderIProfiel(
            snijplan.startSnij * scale, 
            snijplan.resultaatLengte * scale, 
            '#22c55e',
            0,
            1
          )}
          
          {/* Afval eind (rood, valt weg) */}
          {snijplan.afvalEind > 0 && renderIProfiel(
            (snijplan.eindSnij) * scale + afvalEindOffset, 
            snijplan.afvalEind * scale, 
            '#ef4444',
            fallOffset,
            animatieProgress > 0.5 ? 1 - (animatieProgress - 0.5) * 2 : 1
          )}
          
          {/* Snijlijnen */}
          <Line
            points={[
              [snijplan.startSnij * scale, -h, -b],
              [snijplan.startSnij * scale, h, b]
            ]}
            color="#ffffff"
            lineWidth={3}
            dashed
            dashScale={20}
          />
          <Line
            points={[
              [snijplan.eindSnij * scale, -h, -b],
              [snijplan.eindSnij * scale, h, b]
            ]}
            color="#ffffff"
            lineWidth={3}
            dashed
            dashScale={20}
          />
        </>
      )}
      
      {/* Basis profiel (als geen snijplan) */}
      {!snijplan && renderIProfiel(0, l, '#64748b')}
      
      {/* Maatlijnen */}
      <mesh position={[l/2, -h/2 - 0.08, 0]}>
        <boxGeometry args={[l, 0.002, 0.002]} />
        <meshBasicMaterial color="#3b82f6" />
      </mesh>
      
      {/* Labels */}
      <Text
        position={[l/2, -h/2 - 0.12, 0]}
        fontSize={0.04}
        color="#3b82f6"
        anchorX="center"
      >
        {lengte} mm
      </Text>
      
      {snijplan && (
        <Text
          position={[(snijplan.startSnij + snijplan.resultaatLengte/2) * scale, h/2 + 0.1, 0]}
          fontSize={0.04}
          color="#22c55e"
          anchorX="center"
        >
          {snijplan.resultaatLengte} mm → Standaard
        </Text>
      )}
    </group>
  )
}

// Scene
function Scene({ 
  match,
  showSnijLijnen,
  animatieProgress
}: { 
  match: MatchResultaat | null
  showSnijLijnen: boolean
  animatieProgress: number
}) {
  if (!match) {
    return (
      <>
        <PerspectiveCamera makeDefault position={[0, 0.5, 2]} fov={50} />
        <Environment preset="warehouse" />
        <ambientLight intensity={0.5} />
        <Text position={[0, 0, 0]} fontSize={0.1} color="#6b7280">
          Selecteer een element om te matchen
        </Text>
      </>
    )
  }
  
  const profielMatch = match.geoogstElement.profielNaam.match(/(\d+)/)
  const profielSize = profielMatch ? parseInt(profielMatch[1]) : 200
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[1.5, 0.5, 2]} fov={50} />
      <OrbitControls target={[1.5, 0, 0]} enablePan enableZoom enableRotate />
      
      <Environment preset="warehouse" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.3} />
      
      <gridHelper args={[10, 20, '#334155', '#1e293b']} position={[1.5, -0.2, 0]} />
      
      <Balk3D
        lengte={match.geoogstElement.lengte}
        zones={match.geoogstElement.zones}
        snijplan={match.snijplan}
        profielHoogte={profielSize}
        profielBreedte={match.matchendProfiel.type === 'IPE' ? profielSize * 0.5 : profielSize}
        showSnijLijnen={showSnijLijnen}
        animatieProgress={animatieProgress}
      />
    </>
  )
}

// Match Card
function MatchCard({ 
  match, 
  selected, 
  onClick 
}: { 
  match: MatchResultaat
  selected: boolean
  onClick: () => void
}) {
  const scoreBg = match.matchScore >= 80 ? 'bg-green-500' : 
                  match.matchScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        selected 
          ? 'bg-blue-600/20 border-blue-500 shadow-lg shadow-blue-500/20' 
          : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-white">{match.geoogstElement.id}</p>
          <p className="text-sm text-gray-400">{match.geoogstElement.profielNaam}</p>
        </div>
        <div className={`px-2 py-1 rounded-lg text-xs font-bold ${scoreBg}`}>
          {match.matchScore}%
        </div>
      </div>
      
      <div className="text-xs text-gray-400 mb-2">
        {match.geoogstElement.herkomst.gebouw}
      </div>
      
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">{match.geoogstElement.lengte}mm</span>
        <ArrowRight className="w-4 h-4 text-green-400" />
        <span className="text-green-400 font-medium">{match.snijplan.resultaatLengte}mm</span>
      </div>
      
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-gray-500">Afval: {match.snijplan.afvalStart + match.snijplan.afvalEind}mm</span>
        <span className="text-green-400">€{match.geschatteWaarde}</span>
      </div>
    </button>
  )
}

export default function Matching3DPage() {
  const [selectedMatch, setSelectedMatch] = useState<MatchResultaat | null>(null)
  const [showSnijLijnen, setShowSnijLijnen] = useState(true)
  const [animatieProgress, setAnimatieProgress] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  
  // Bereken alle matches
  const matches = useMemo(() => {
    return MOCK_GEOOGSTE_ELEMENTEN
      .map(el => berekenMatch(el))
      .filter((m): m is MatchResultaat => m !== null)
      .sort((a, b) => b.matchScore - a.matchScore)
  }, [])
  
  // Animatie
  const startAnimatie = () => {
    setAnimatieProgress(0)
    setIsAnimating(true)
    const interval = setInterval(() => {
      setAnimatieProgress(p => {
        if (p >= 1) {
          clearInterval(interval)
          setIsAnimating(false)
          return 1
        }
        return p + 0.02
      })
    }, 50)
  }
  
  // Stats
  const totaalStats = useMemo(() => {
    const totaalOrigineel = matches.reduce((sum, m) => sum + m.geoogstElement.lengte, 0)
    const totaalHerbruikbaar = matches.reduce((sum, m) => sum + m.snijplan.resultaatLengte, 0)
    const totaalAfval = totaalOrigineel - totaalHerbruikbaar
    const totaalWaarde = matches.reduce((sum, m) => sum + m.geschatteWaarde, 0)
    
    return {
      totaalOrigineel,
      totaalHerbruikbaar,
      totaalAfval,
      totaalWaarde,
      gemiddeldeScore: Math.round(matches.reduce((sum, m) => sum + m.matchScore, 0) / matches.length)
    }
  }, [matches])

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-gray-900 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800/90 backdrop-blur border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <GitCompare className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Profiel Matching</h1>
              <p className="text-sm text-gray-400">Match geoogst staal met standaard profielen</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Totaal stats */}
            <div className="flex items-center gap-6 px-4 py-2 bg-gray-700/50 rounded-xl">
              <div className="text-center">
                <p className="text-xs text-gray-400">Elementen</p>
                <p className="text-lg font-bold text-white">{matches.length}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Gem. Match</p>
                <p className="text-lg font-bold text-green-400">{totaalStats.gemiddeldeScore}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">Totaal Waarde</p>
                <p className="text-lg font-bold text-blue-400">€{totaalStats.totaalWaarde}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Matches lijst */}
        <div className="w-80 bg-gray-800/50 border-r border-gray-700 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Te Matchen Elementen</h3>
            <span className="text-xs text-gray-500">{matches.length} items</span>
          </div>
          
          {matches.map((match) => (
            <MatchCard
              key={match.geoogstElement.id}
              match={match}
              selected={selectedMatch?.geoogstElement.id === match.geoogstElement.id}
              onClick={() => {
                setSelectedMatch(match)
                setAnimatieProgress(0)
              }}
            />
          ))}
        </div>
        
        {/* Main 3D View */}
        <div className="flex-1 flex flex-col">
          {/* 3D Canvas */}
          <div className="flex-1 relative">
            <Canvas shadows className="bg-gray-900">
              <Scene 
                match={selectedMatch}
                showSnijLijnen={showSnijLijnen}
                animatieProgress={animatieProgress}
              />
            </Canvas>
            
            {/* Controls overlay */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button
                onClick={() => setShowSnijLijnen(!showSnijLijnen)}
                className={`px-3 py-2 rounded-lg backdrop-blur transition-colors flex items-center gap-2 ${
                  showSnijLijnen ? 'bg-blue-600 text-white' : 'bg-gray-800/80 text-gray-300'
                }`}
              >
                <Scissors className="w-4 h-4" />
                Snijlijnen
              </button>
              
              {selectedMatch && (
                <button
                  onClick={startAnimatie}
                  disabled={isAnimating}
                  className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  Simuleer Snijden
                </button>
              )}
            </div>
            
            {/* Legend */}
            <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur rounded-xl p-3 border border-gray-700">
              <p className="text-xs text-gray-400 mb-2 font-medium">Legenda</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-green-500 rounded" />
                  <span className="text-xs text-gray-300">Herbruikbaar</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-red-500 rounded" />
                  <span className="text-xs text-gray-300">Afval (afsnijden)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-3 bg-yellow-500 rounded" />
                  <span className="text-xs text-gray-300">Schade zone</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Details panel */}
          {selectedMatch && (
            <div className="bg-gray-800 border-t border-gray-700 p-4">
              <div className="grid grid-cols-4 gap-4">
                {/* Origineel */}
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-gray-400" />
                    <h4 className="font-medium text-white">Origineel</h4>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedMatch.geoogstElement.profielNaam}</p>
                  <p className="text-sm text-gray-400">{selectedMatch.geoogstElement.lengte} mm</p>
                  <p className="text-xs text-gray-500 mt-1">{selectedMatch.geoogstElement.herkomst.gebouw}</p>
                </div>
                
                {/* Snijplan */}
                <div className="bg-gray-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Scissors className="w-5 h-5 text-orange-400" />
                    <h4 className="font-medium text-white">Snijplan</h4>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Start snij:</span>
                      <span className="text-white">{selectedMatch.snijplan.startSnij} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Eind snij:</span>
                      <span className="text-white">{selectedMatch.snijplan.eindSnij} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">Afval totaal:</span>
                      <span className="text-red-400">
                        {selectedMatch.snijplan.afvalStart + selectedMatch.snijplan.afvalEind} mm
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Resultaat */}
                <div className="bg-green-900/30 border border-green-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-green-400" />
                    <h4 className="font-medium text-white">Standaard Profiel</h4>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{selectedMatch.matchendProfiel.naam}</p>
                  <p className="text-sm text-green-300">{selectedMatch.snijplan.resultaatLengte} mm</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {selectedMatch.herbruikbaarheid}% herbruikbaar
                  </p>
                </div>
                
                {/* Waarde */}
                <div className="bg-blue-900/30 border border-blue-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    <h4 className="font-medium text-white">Resultaat</h4>
                  </div>
                  <p className="text-3xl font-bold text-blue-400">€{selectedMatch.geschatteWaarde}</p>
                  <p className="text-sm text-gray-400">Geschatte waarde</p>
                  <div className="mt-2">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500"
                        style={{ width: `${selectedMatch.matchScore}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Match score: {selectedMatch.matchScore}%</p>
                  </div>
                </div>
              </div>
              
              {/* Action buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Herbereken
                </button>
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Goedkeuren & Naar Productie
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
