import { useState, useMemo } from 'react'
import { 
  Factory, 
  ArrowRight, 
  ArrowDown,
  Package,
  Truck,
  Clock,
  Users,
  Zap,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Settings,
  BarChart3,
  Layers,
  Target,
  Workflow,
  GitBranch,
  Timer,
  Gauge,
  Activity,
  Box,
  Wrench,
  ScanLine,
  Flame,
  SprayCan
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================

interface ProductieStation {
  id: string
  naam: string
  type: 'ontvangst' | 'inspectie' | 'reiniging' | 'bewerking' | 'certificering' | 'opslag' | 'verzending'
  capaciteitPerUur: number // elementen per uur
  huidigeBezetting: number // aantal elementen in bewerking
  maxBezetting: number
  operators: number
  status: 'actief' | 'inactief' | 'onderhoud' | 'overbelast'
  gemiddeldeTijdMin: number // per element
}

interface ProductieElement {
  id: string
  naam: string
  profielType: string
  gewicht: number // kg
  herkomst: string
  huidigeLocatie: string // station ID
  status: 'wachten' | 'in_bewerking' | 'gereed'
  prioriteit: 'hoog' | 'normaal' | 'laag'
  startTijd?: Date
  bewerkingsRoute: string[] // station IDs
  huidigeStap: number
}

interface Bottleneck {
  stationId: string
  type: 'capaciteit' | 'wachtrij' | 'operator' | 'materiaal'
  ernst: 'kritiek' | 'waarschuwing' | 'info'
  beschrijving: string
  aanbeveling: string
}

interface ProductieMetrics {
  totaalInFlow: number // elementen vandaag binnen
  totaalUitFlow: number // elementen vandaag klaar
  gemiddeldeDoorlooptijd: number // uren
  efficiencyPercentage: number
  bottlenecks: Bottleneck[]
}

// ============================================================
// MOCK DATA
// ============================================================

const STATIONS: ProductieStation[] = [
  { id: 'S1', naam: 'Ontvangst & Weging', type: 'ontvangst', capaciteitPerUur: 12, huidigeBezetting: 3, maxBezetting: 5, operators: 2, status: 'actief', gemiddeldeTijdMin: 5 },
  { id: 'S2', naam: 'Visuele Inspectie', type: 'inspectie', capaciteitPerUur: 8, huidigeBezetting: 2, maxBezetting: 4, operators: 2, status: 'actief', gemiddeldeTijdMin: 8 },
  { id: 'S3', naam: 'Shot Blasting', type: 'reiniging', capaciteitPerUur: 4, huidigeBezetting: 4, maxBezetting: 4, operators: 1, status: 'overbelast', gemiddeldeTijdMin: 15 },
  { id: 'S4', naam: 'Robot Bewerking', type: 'bewerking', capaciteitPerUur: 3, huidigeBezetting: 2, maxBezetting: 3, operators: 1, status: 'actief', gemiddeldeTijdMin: 20 },
  { id: 'S5', naam: 'Handmatig Lassen', type: 'bewerking', capaciteitPerUur: 2, huidigeBezetting: 1, maxBezetting: 2, operators: 2, status: 'actief', gemiddeldeTijdMin: 30 },
  { id: 'S6', naam: 'NTA 8713 Keuring', type: 'certificering', capaciteitPerUur: 6, huidigeBezetting: 1, maxBezetting: 3, operators: 1, status: 'actief', gemiddeldeTijdMin: 10 },
  { id: 'S7', naam: 'Conservering', type: 'bewerking', capaciteitPerUur: 5, huidigeBezetting: 2, maxBezetting: 4, operators: 1, status: 'actief', gemiddeldeTijdMin: 12 },
  { id: 'S8', naam: 'Gecertificeerde Opslag', type: 'opslag', capaciteitPerUur: 20, huidigeBezetting: 45, maxBezetting: 100, operators: 1, status: 'actief', gemiddeldeTijdMin: 3 },
  { id: 'S9', naam: 'Verzending', type: 'verzending', capaciteitPerUur: 10, huidigeBezetting: 0, maxBezetting: 8, operators: 2, status: 'inactief', gemiddeldeTijdMin: 6 },
]

const ELEMENTEN: ProductieElement[] = [
  { id: 'E001', naam: 'HEA 300 Kolom', profielType: 'HEA 300', gewicht: 1850, herkomst: 'Industriehal Westpoort', huidigeLocatie: 'S3', status: 'in_bewerking', prioriteit: 'hoog', bewerkingsRoute: ['S1', 'S2', 'S3', 'S4', 'S6', 'S7', 'S8'], huidigeStap: 2 },
  { id: 'E002', naam: 'IPE 360 Ligger', profielType: 'IPE 360', gewicht: 650, herkomst: 'Industriehal Westpoort', huidigeLocatie: 'S3', status: 'wachten', prioriteit: 'normaal', bewerkingsRoute: ['S1', 'S2', 'S3', 'S6', 'S7', 'S8'], huidigeStap: 2 },
  { id: 'E003', naam: 'HEB 200 Schoor', profielType: 'HEB 200', gewicht: 420, herkomst: 'Kantoorpand Centrum', huidigeLocatie: 'S2', status: 'in_bewerking', prioriteit: 'normaal', bewerkingsRoute: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'], huidigeStap: 1 },
  { id: 'E004', naam: 'HEA 200 Kolom', profielType: 'HEA 200', gewicht: 980, herkomst: 'Kantoorpand Centrum', huidigeLocatie: 'S4', status: 'in_bewerking', prioriteit: 'hoog', bewerkingsRoute: ['S1', 'S2', 'S3', 'S4', 'S6', 'S7', 'S8'], huidigeStap: 3 },
  { id: 'E005', naam: 'IPE 300 Ligger', profielType: 'IPE 300', gewicht: 520, herkomst: 'Sporthal De Boog', huidigeLocatie: 'S6', status: 'in_bewerking', prioriteit: 'normaal', bewerkingsRoute: ['S1', 'S2', 'S3', 'S6', 'S7', 'S8'], huidigeStap: 3 },
  { id: 'E006', naam: 'HEB 300 Ligger', profielType: 'HEB 300', gewicht: 1120, herkomst: 'Sporthal De Boog', huidigeLocatie: 'S7', status: 'in_bewerking', prioriteit: 'laag', bewerkingsRoute: ['S1', 'S2', 'S3', 'S4', 'S6', 'S7', 'S8'], huidigeStap: 5 },
  { id: 'E007', naam: 'IPE 240 Ligger', profielType: 'IPE 240', gewicht: 380, herkomst: 'Industriehal Westpoort', huidigeLocatie: 'S1', status: 'in_bewerking', prioriteit: 'normaal', bewerkingsRoute: ['S1', 'S2', 'S3', 'S6', 'S7', 'S8'], huidigeStap: 0 },
  { id: 'E008', naam: 'HEA 240 Kolom', profielType: 'HEA 240', gewicht: 1250, herkomst: 'Industriehal Westpoort', huidigeLocatie: 'S8', status: 'gereed', prioriteit: 'normaal', bewerkingsRoute: ['S1', 'S2', 'S3', 'S4', 'S6', 'S7', 'S8'], huidigeStap: 6 },
]

const BOTTLENECKS: Bottleneck[] = [
  { stationId: 'S3', type: 'capaciteit', ernst: 'kritiek', beschrijving: 'Shot Blasting op maximale capaciteit', aanbeveling: 'Overweeg tweede shift of uitbesteding' },
  { stationId: 'S4', type: 'wachtrij', ernst: 'waarschuwing', beschrijving: 'Wachtrij robot bewerking groeit', aanbeveling: 'Prioriteer elementen zonder robot bewerking' },
  { stationId: 'S9', type: 'operator', ernst: 'info', beschrijving: 'Verzending nog niet actief vandaag', aanbeveling: 'Plan ophaalmoment voor gereed product' },
]

const STATION_ICONS: Record<string, any> = {
  ontvangst: Truck,
  inspectie: ScanLine,
  reiniging: SprayCan,
  bewerking: Wrench,
  certificering: CheckCircle2,
  opslag: Package,
  verzending: Truck,
}

const STATION_KLEUREN: Record<string, string> = {
  ontvangst: '#3b82f6',
  inspectie: '#8b5cf6',
  reiniging: '#f59e0b',
  bewerking: '#ef4444',
  certificering: '#22c55e',
  opslag: '#6b7280',
  verzending: '#14b8a6',
}

const STATUS_KLEUREN: Record<string, string> = {
  actief: '#22c55e',
  inactief: '#6b7280',
  onderhoud: '#f59e0b',
  overbelast: '#ef4444',
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function berekenMetrics(stations: ProductieStation[], elementen: ProductieElement[]): ProductieMetrics {
  const totaalInFlow = elementen.filter(e => e.huidigeStap === 0).length + 4 // Vandaag ontvangen
  const totaalUitFlow = elementen.filter(e => e.status === 'gereed').length
  
  // Gemiddelde doorlooptijd = som van alle station tijden
  const gemiddeldeDoorlooptijd = stations.reduce((sum, s) => sum + s.gemiddeldeTijdMin, 0) / 60
  
  // Efficiency = output / theoretische max output
  const theoretischMax = Math.min(...stations.filter(s => s.type !== 'opslag').map(s => s.capaciteitPerUur)) * 8
  const efficiencyPercentage = Math.round((totaalUitFlow / theoretischMax) * 100) || 75 // Demo waarde
  
  return {
    totaalInFlow,
    totaalUitFlow,
    gemiddeldeDoorlooptijd,
    efficiencyPercentage,
    bottlenecks: BOTTLENECKS,
  }
}

// ============================================================
// COMPONENTS
// ============================================================

function StationKaart({ 
  station, 
  elementen,
  isGeselecteerd,
  onClick 
}: { 
  station: ProductieStation
  elementen: ProductieElement[]
  isGeselecteerd: boolean
  onClick: () => void
}) {
  const Icon = STATION_ICONS[station.type]
  const bezettingPercentage = (station.huidigeBezetting / station.maxBezetting) * 100
  const stationElementen = elementen.filter(e => e.huidigeLocatie === station.id)
  
  return (
    <button
      onClick={onClick}
      className={`relative bg-gray-800 rounded-xl p-4 border-2 transition-all hover:scale-105 ${
        isGeselecteerd 
          ? 'border-blue-500 ring-2 ring-blue-500/30' 
          : station.status === 'overbelast'
            ? 'border-red-500'
            : 'border-gray-700'
      }`}
      style={{ minWidth: '180px' }}
    >
      {/* Status indicator */}
      <div 
        className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900"
        style={{ backgroundColor: STATUS_KLEUREN[station.status] }}
      />
      
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${STATION_KLEUREN[station.type]}30` }}
        >
          <Icon className="w-5 h-5" style={{ color: STATION_KLEUREN[station.type] }} />
        </div>
        <div className="text-left">
          <p className="font-medium text-white text-sm">{station.naam}</p>
          <p className="text-xs text-gray-400">{station.operators} operator(s)</p>
        </div>
      </div>
      
      {/* Bezetting bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Bezetting</span>
          <span className={`font-medium ${
            bezettingPercentage >= 100 ? 'text-red-400' :
            bezettingPercentage >= 75 ? 'text-yellow-400' : 'text-green-400'
          }`}>
            {station.huidigeBezetting}/{station.maxBezetting}
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              bezettingPercentage >= 100 ? 'bg-red-500' :
              bezettingPercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(bezettingPercentage, 100)}%` }}
          />
        </div>
      </div>
      
      {/* Metrics */}
      <div className="flex justify-between text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Gauge className="w-3 h-3" />
          {station.capaciteitPerUur}/uur
        </span>
        <span className="flex items-center gap-1">
          <Timer className="w-3 h-3" />
          {station.gemiddeldeTijdMin}min
        </span>
      </div>
      
      {/* Elementen badges */}
      {stationElementen.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {stationElementen.slice(0, 3).map(e => (
            <span 
              key={e.id}
              className={`text-xs px-1.5 py-0.5 rounded ${
                e.status === 'in_bewerking' ? 'bg-blue-900/50 text-blue-300' :
                e.status === 'wachten' ? 'bg-yellow-900/50 text-yellow-300' :
                'bg-green-900/50 text-green-300'
              }`}
            >
              {e.id}
            </span>
          ))}
          {stationElementen.length > 3 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              +{stationElementen.length - 3}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

function FlowDiagram({ 
  stations, 
  elementen,
  geselecteerd,
  onSelect 
}: { 
  stations: ProductieStation[]
  elementen: ProductieElement[]
  geselecteerd: string | null
  onSelect: (id: string | null) => void
}) {
  // Groepeer stations per rij
  const rij1 = stations.filter(s => ['ontvangst', 'inspectie', 'reiniging'].includes(s.type))
  const rij2 = stations.filter(s => ['bewerking', 'certificering'].includes(s.type))
  const rij3 = stations.filter(s => ['opslag', 'verzending'].includes(s.type))
  
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      {/* Rij 1: Inkomend */}
      <div className="flex items-center gap-4">
        {rij1.map((station, i) => (
          <div key={station.id} className="flex items-center">
            <StationKaart
              station={station}
              elementen={elementen}
              isGeselecteerd={geselecteerd === station.id}
              onClick={() => onSelect(station.id)}
            />
            {i < rij1.length - 1 && (
              <ArrowRight className="w-6 h-6 text-gray-600 mx-2" />
            )}
          </div>
        ))}
      </div>
      
      <ArrowDown className="w-6 h-6 text-gray-600" />
      
      {/* Rij 2: Bewerking */}
      <div className="flex items-center gap-4">
        {rij2.map((station, i) => (
          <div key={station.id} className="flex items-center">
            <StationKaart
              station={station}
              elementen={elementen}
              isGeselecteerd={geselecteerd === station.id}
              onClick={() => onSelect(station.id)}
            />
            {i < rij2.length - 1 && (
              <ArrowRight className="w-6 h-6 text-gray-600 mx-2" />
            )}
          </div>
        ))}
      </div>
      
      <ArrowDown className="w-6 h-6 text-gray-600" />
      
      {/* Rij 3: Uitstroom */}
      <div className="flex items-center gap-4">
        {rij3.map((station, i) => (
          <div key={station.id} className="flex items-center">
            <StationKaart
              station={station}
              elementen={elementen}
              isGeselecteerd={geselecteerd === station.id}
              onClick={() => onSelect(station.id)}
            />
            {i < rij3.length - 1 && (
              <ArrowRight className="w-6 h-6 text-gray-600 mx-2" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricCard({ 
  titel, 
  waarde, 
  eenheid, 
  icon: Icon, 
  kleur, 
  trend 
}: { 
  titel: string
  waarde: number | string
  eenheid?: string
  icon: any
  kleur: string
  trend?: 'up' | 'down' | 'stable'
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${kleur}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: kleur }} />
        </div>
        {trend && (
          <TrendingUp className={`w-4 h-4 ${
            trend === 'up' ? 'text-green-400' : 
            trend === 'down' ? 'text-red-400 rotate-180' : 'text-gray-400'
          }`} />
        )}
      </div>
      <p className="text-gray-400 text-sm">{titel}</p>
      <p className="text-2xl font-bold text-white">
        {waarde}
        {eenheid && <span className="text-sm text-gray-400 ml-1">{eenheid}</span>}
      </p>
    </div>
  )
}

function BottleneckAlert({ bottleneck }: { bottleneck: Bottleneck }) {
  const station = STATIONS.find(s => s.id === bottleneck.stationId)
  
  return (
    <div className={`rounded-lg p-3 border ${
      bottleneck.ernst === 'kritiek' ? 'bg-red-900/20 border-red-700/50' :
      bottleneck.ernst === 'waarschuwing' ? 'bg-yellow-900/20 border-yellow-700/50' :
      'bg-blue-900/20 border-blue-700/50'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className={`w-4 h-4 ${
          bottleneck.ernst === 'kritiek' ? 'text-red-400' :
          bottleneck.ernst === 'waarschuwing' ? 'text-yellow-400' :
          'text-blue-400'
        }`} />
        <span className="font-medium text-white text-sm">{station?.naam}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${
          bottleneck.ernst === 'kritiek' ? 'bg-red-900 text-red-300' :
          bottleneck.ernst === 'waarschuwing' ? 'bg-yellow-900 text-yellow-300' :
          'bg-blue-900 text-blue-300'
        }`}>
          {bottleneck.type}
        </span>
      </div>
      <p className="text-gray-300 text-sm">{bottleneck.beschrijving}</p>
      <p className="text-gray-400 text-xs mt-1">💡 {bottleneck.aanbeveling}</p>
    </div>
  )
}

function ElementenTabel({ 
  elementen, 
  stations 
}: { 
  elementen: ProductieElement[]
  stations: ProductieStation[]
}) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-medium text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-400" />
          Actieve Elementen
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-900/50 text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Element</th>
              <th className="px-4 py-2 text-left">Locatie</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Voortgang</th>
              <th className="px-4 py-2 text-left">Prioriteit</th>
            </tr>
          </thead>
          <tbody>
            {elementen.map(element => {
              const huidigeStation = stations.find(s => s.id === element.huidigeLocatie)
              const voortgang = ((element.huidigeStap + 1) / element.bewerkingsRoute.length) * 100
              
              return (
                <tr key={element.id} className="border-t border-gray-700 hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-mono text-blue-400">{element.id}</td>
                  <td className="px-4 py-3">
                    <p className="text-white">{element.naam}</p>
                    <p className="text-xs text-gray-500">{element.herkomst}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span 
                      className="px-2 py-1 rounded text-xs"
                      style={{ 
                        backgroundColor: `${STATION_KLEUREN[huidigeStation?.type || 'opslag']}20`,
                        color: STATION_KLEUREN[huidigeStation?.type || 'opslag']
                      }}
                    >
                      {huidigeStation?.naam || 'Onbekend'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      element.status === 'in_bewerking' ? 'bg-blue-900/50 text-blue-300' :
                      element.status === 'wachten' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-green-900/50 text-green-300'
                    }`}>
                      {element.status === 'in_bewerking' ? 'Bezig' : 
                       element.status === 'wachten' ? 'Wachten' : 'Gereed'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${voortgang}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400">{Math.round(voortgang)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      element.prioriteit === 'hoog' ? 'bg-red-900/50 text-red-300' :
                      element.prioriteit === 'laag' ? 'bg-gray-700 text-gray-400' :
                      'bg-gray-600 text-gray-300'
                    }`}>
                      {element.prioriteit}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StationDetail({ 
  station, 
  elementen,
  onClose 
}: { 
  station: ProductieStation
  elementen: ProductieElement[]
  onClose: () => void
}) {
  const stationElementen = elementen.filter(e => e.huidigeLocatie === station.id)
  const Icon = STATION_ICONS[station.type]
  
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${STATION_KLEUREN[station.type]}30` }}
          >
            <Icon className="w-6 h-6" style={{ color: STATION_KLEUREN[station.type] }} />
          </div>
          <div>
            <h3 className="font-bold text-white">{station.naam}</h3>
            <p className="text-sm text-gray-400 capitalize">{station.type}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: STATUS_KLEUREN[station.status] }}
          />
          <span className="text-white capitalize">{station.status}</span>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{station.huidigeBezetting}</p>
            <p className="text-xs text-gray-400">In bewerking</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{station.capaciteitPerUur}</p>
            <p className="text-xs text-gray-400">Per uur</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-white">{station.operators}</p>
            <p className="text-xs text-gray-400">Operators</p>
          </div>
        </div>
        
        {/* Elementen in station */}
        {stationElementen.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Huidige elementen</h4>
            <div className="space-y-2">
              {stationElementen.map(e => (
                <div key={e.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg p-2">
                  <div>
                    <p className="text-white text-sm">{e.naam}</p>
                    <p className="text-xs text-gray-500">{e.profielType}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    e.status === 'in_bewerking' ? 'bg-blue-900/50 text-blue-300' : 'bg-yellow-900/50 text-yellow-300'
                  }`}>
                    {e.status === 'in_bewerking' ? 'Bezig' : 'Wachten'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ProductieStroomPage() {
  const [geselecteerdStation, setGeselecteerdStation] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'flow' | 'tabel'>('flow')
  
  const metrics = useMemo(() => berekenMetrics(STATIONS, ELEMENTEN), [])
  const geselecteerdStationData = STATIONS.find(s => s.id === geselecteerdStation)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <Workflow className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Productie Stroom</h1>
            <p className="text-gray-400">Real-time overzicht van de verwerkingsfaciliteit</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('flow')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'flow' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <GitBranch className="w-4 h-4 inline mr-1" />
              Flow
            </button>
            <button
              onClick={() => setViewMode('tabel')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'tabel' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4 inline mr-1" />
              Tabel
            </button>
          </div>
          
          <button className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700">
            <Settings className="w-5 h-5" />
            Configuratie
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          titel="In Flow (vandaag)"
          waarde={metrics.totaalInFlow}
          eenheid="elementen"
          icon={Truck}
          kleur="#3b82f6"
          trend="up"
        />
        <MetricCard
          titel="Uit Flow (vandaag)"
          waarde={metrics.totaalUitFlow}
          eenheid="elementen"
          icon={Package}
          kleur="#22c55e"
          trend="stable"
        />
        <MetricCard
          titel="Gem. Doorlooptijd"
          waarde={metrics.gemiddeldeDoorlooptijd.toFixed(1)}
          eenheid="uur"
          icon={Clock}
          kleur="#f59e0b"
        />
        <MetricCard
          titel="Efficiency"
          waarde={`${metrics.efficiencyPercentage}%`}
          icon={Gauge}
          kleur="#8b5cf6"
          trend="up"
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-4 gap-6">
        {/* Flow diagram / Tabel - 3 kolommen */}
        <div className="col-span-3">
          {viewMode === 'flow' ? (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-auto">
              <div className="p-4 border-b border-gray-700">
                <h3 className="font-medium text-white flex items-center gap-2">
                  <Factory className="w-5 h-5 text-blue-400" />
                  Productie Layout
                </h3>
              </div>
              <FlowDiagram
                stations={STATIONS}
                elementen={ELEMENTEN}
                geselecteerd={geselecteerdStation}
                onSelect={setGeselecteerdStation}
              />
            </div>
          ) : (
            <ElementenTabel elementen={ELEMENTEN} stations={STATIONS} />
          )}
        </div>

        {/* Sidebar - 1 kolom */}
        <div className="space-y-4">
          {/* Bottlenecks */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <h3 className="font-medium text-white flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Knelpunten
            </h3>
            <div className="space-y-3">
              {metrics.bottlenecks.map((b, i) => (
                <BottleneckAlert key={i} bottleneck={b} />
              ))}
            </div>
          </div>
          
          {/* Station detail */}
          {geselecteerdStationData && (
            <StationDetail
              station={geselecteerdStationData}
              elementen={ELEMENTEN}
              onClose={() => setGeselecteerdStation(null)}
            />
          )}
          
          {/* Quick stats */}
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
            <h3 className="font-medium text-white flex items-center gap-2 mb-3">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Vandaag
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Actieve stations</span>
                <span className="text-white font-medium">
                  {STATIONS.filter(s => s.status === 'actief').length}/{STATIONS.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Totale operators</span>
                <span className="text-white font-medium">
                  {STATIONS.reduce((sum, s) => sum + s.operators, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Elementen in systeem</span>
                <span className="text-white font-medium">{ELEMENTEN.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Gereed voor levering</span>
                <span className="text-green-400 font-medium">
                  {ELEMENTEN.filter(e => e.status === 'gereed').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
