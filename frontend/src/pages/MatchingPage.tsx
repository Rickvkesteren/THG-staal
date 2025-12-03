import { useState } from 'react'
import {
  Scale,
  ArrowRight,
  CheckCircle,
  XCircle,
  Zap,
  Package,
  Search
} from 'lucide-react'

interface VraagItem {
  id: string
  projectNaam: string
  profielType: string
  benodigdeLengte: number
  aantal: number
  deadline: string
  prioriteit: 'hoog' | 'normaal' | 'laag'
}

interface AanbodItem {
  id: string
  profielNaam: string
  beschikbareLengte: number
  conditie: 'goed' | 'matig' | 'slecht'
  locatie: string
  herkomst: string
}

interface Match {
  vraagId: string
  aanbodId: string
  profielType: string
  vraagLengte: number
  aanbodLengte: number
  restLengte: number
  score: number
  status: 'voorgesteld' | 'geaccepteerd' | 'afgewezen'
}

// Demo data
const VRAAG_DATA: VraagItem[] = [
  { id: 'v-001', projectNaam: 'Nieuwbouw Kantoor A', profielType: 'HEA 300', benodigdeLengte: 5500, aantal: 4, deadline: '2024-12-01', prioriteit: 'hoog' },
  { id: 'v-002', projectNaam: 'Nieuwbouw Kantoor A', profielType: 'HEB 300', benodigdeLengte: 3800, aantal: 6, deadline: '2024-12-01', prioriteit: 'hoog' },
  { id: 'v-003', projectNaam: 'Renovatie Hal B', profielType: 'IPE 400', benodigdeLengte: 7500, aantal: 2, deadline: '2024-12-15', prioriteit: 'normaal' },
  { id: 'v-004', projectNaam: 'Woningbouw Project', profielType: 'HEA 200', benodigdeLengte: 4000, aantal: 8, deadline: '2025-01-10', prioriteit: 'laag' },
]

const AANBOD_DATA: AanbodItem[] = [
  { id: 'a-001', profielNaam: 'HEA 300', beschikbareLengte: 5850, conditie: 'goed', locatie: 'Hal A-12', herkomst: 'Fabriekshal Oost' },
  { id: 'a-002', profielNaam: 'HEA 300', beschikbareLengte: 5850, conditie: 'goed', locatie: 'Hal A-13', herkomst: 'Fabriekshal Oost' },
  { id: 'a-003', profielNaam: 'HEB 300', beschikbareLengte: 3950, conditie: 'goed', locatie: 'Hal A-15', herkomst: 'Fabriekshal Oost' },
  { id: 'a-004', profielNaam: 'HEB 300', beschikbareLengte: 3800, conditie: 'matig', locatie: 'Hal A-16', herkomst: 'Fabriekshal Oost' },
  { id: 'a-005', profielNaam: 'IPE 400', beschikbareLengte: 7800, conditie: 'goed', locatie: 'Hal B-03', herkomst: 'Sporthal De Meerkamp' },
  { id: 'a-006', profielNaam: 'HEA 200', beschikbareLengte: 4200, conditie: 'slecht', locatie: 'Hal C-08', herkomst: 'Parkeergarage Zuid' },
]

const MATCHES: Match[] = [
  { vraagId: 'v-001', aanbodId: 'a-001', profielType: 'HEA 300', vraagLengte: 5500, aanbodLengte: 5850, restLengte: 350, score: 94, status: 'voorgesteld' },
  { vraagId: 'v-001', aanbodId: 'a-002', profielType: 'HEA 300', vraagLengte: 5500, aanbodLengte: 5850, restLengte: 350, score: 94, status: 'voorgesteld' },
  { vraagId: 'v-002', aanbodId: 'a-003', profielType: 'HEB 300', vraagLengte: 3800, aanbodLengte: 3950, restLengte: 150, score: 96, status: 'geaccepteerd' },
  { vraagId: 'v-002', aanbodId: 'a-004', profielType: 'HEB 300', vraagLengte: 3800, aanbodLengte: 3800, restLengte: 0, score: 100, status: 'voorgesteld' },
  { vraagId: 'v-003', aanbodId: 'a-005', profielType: 'IPE 400', vraagLengte: 7500, aanbodLengte: 7800, restLengte: 300, score: 96, status: 'voorgesteld' },
]

const prioriteitConfig = {
  hoog: { color: 'bg-red-100 text-red-700', label: 'Hoog' },
  normaal: { color: 'bg-blue-100 text-blue-700', label: 'Normaal' },
  laag: { color: 'bg-gray-100 text-gray-700', label: 'Laag' },
}

const conditieConfig = {
  goed: { color: 'bg-green-100 text-green-700' },
  matig: { color: 'bg-yellow-100 text-yellow-700' },
  slecht: { color: 'bg-red-100 text-red-700' },
}

export default function MatchingPage() {
  const [activeTab, setActiveTab] = useState<'matches' | 'vraag' | 'aanbod'>('matches')
  const [zoekterm, setZoekterm] = useState('')
  const [matches, setMatches] = useState(MATCHES)

  const accepteerMatch = (vraagId: string, aanbodId: string) => {
    setMatches(matches.map(m => 
      m.vraagId === vraagId && m.aanbodId === aanbodId 
        ? { ...m, status: 'geaccepteerd' as const }
        : m
    ))
  }

  const wijsAfMatch = (vraagId: string, aanbodId: string) => {
    setMatches(matches.map(m => 
      m.vraagId === vraagId && m.aanbodId === aanbodId 
        ? { ...m, status: 'afgewezen' as const }
        : m
    ))
  }

  const stats = {
    totaalVraag: VRAAG_DATA.reduce((s, v) => s + v.aantal, 0),
    totaalAanbod: AANBOD_DATA.length,
    matches: matches.filter(m => m.status === 'geaccepteerd').length,
    voorgesteld: matches.filter(m => m.status === 'voorgesteld').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matching Algoritme</h1>
          <p className="text-gray-500 mt-1">Match geoogste balken met projectvraag</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700">
          <Zap className="w-4 h-4" />
          Run Matching
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Vraag Items</p>
              <p className="text-xl font-bold">{stats.totaalVraag}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aanbod Items</p>
              <p className="text-xl font-bold">{stats.totaalAanbod}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Scale className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Voorgesteld</p>
              <p className="text-xl font-bold">{stats.voorgesteld}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Gematcht</p>
              <p className="text-xl font-bold">{stats.matches}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {[
              { id: 'matches', label: 'Matches', count: matches.length },
              { id: 'vraag', label: 'Vraag', count: VRAAG_DATA.length },
              { id: 'aanbod', label: 'Aanbod', count: AANBOD_DATA.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {/* Search */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Zoeken..."
                value={zoekterm}
                onChange={(e) => setZoekterm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Matches Tab */}
          {activeTab === 'matches' && (
            <div className="space-y-3">
              {matches.map((match) => {
                const vraag = VRAAG_DATA.find(v => v.id === match.vraagId)
                const aanbod = AANBOD_DATA.find(a => a.id === match.aanbodId)
                if (!vraag || !aanbod) return null

                return (
                  <div
                    key={`${match.vraagId}-${match.aanbodId}`}
                    className={`rounded-xl border p-4 ${
                      match.status === 'geaccepteerd' ? 'bg-green-50 border-green-200' :
                      match.status === 'afgewezen' ? 'bg-red-50 border-red-200' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Vraag kant */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500">Vraag</div>
                        <div className="font-medium text-gray-900">{vraag.projectNaam}</div>
                        <div className="text-sm text-gray-600">
                          {match.profielType} • {match.vraagLengte} mm nodig
                        </div>
                      </div>

                      {/* Arrow met score */}
                      <div className="flex flex-col items-center px-4">
                        <div className={`text-lg font-bold ${
                          match.score >= 95 ? 'text-green-600' :
                          match.score >= 85 ? 'text-blue-600' :
                          'text-amber-600'
                        }`}>
                          {match.score}%
                        </div>
                        <ArrowRight className="w-6 h-6 text-gray-400" />
                        <div className="text-xs text-gray-500">
                          Rest: {match.restLengte}mm
                        </div>
                      </div>

                      {/* Aanbod kant */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-500">Aanbod</div>
                        <div className="font-medium text-gray-900">{aanbod.profielNaam}</div>
                        <div className="text-sm text-gray-600">
                          {match.aanbodLengte} mm • {aanbod.locatie}
                        </div>
                      </div>

                      {/* Status / Actions */}
                      <div className="flex items-center gap-2">
                        {match.status === 'voorgesteld' ? (
                          <>
                            <button
                              onClick={() => accepteerMatch(match.vraagId, match.aanbodId)}
                              className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => wijsAfMatch(match.vraagId, match.aanbodId)}
                              className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          </>
                        ) : match.status === 'geaccepteerd' ? (
                          <span className="flex items-center gap-1 text-green-700 font-medium">
                            <CheckCircle className="w-5 h-5" />
                            Gematcht
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-700 font-medium">
                            <XCircle className="w-5 h-5" />
                            Afgewezen
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Vraag Tab */}
          {activeTab === 'vraag' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Project</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Profiel</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Lengte</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Aantal</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Deadline</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Prioriteit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {VRAAG_DATA.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{item.projectNaam}</td>
                      <td className="px-4 py-3">{item.profielType}</td>
                      <td className="px-4 py-3">{item.benodigdeLengte} mm</td>
                      <td className="px-4 py-3">{item.aantal}</td>
                      <td className="px-4 py-3">{new Date(item.deadline).toLocaleDateString('nl-NL')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${prioriteitConfig[item.prioriteit].color}`}>
                          {prioriteitConfig[item.prioriteit].label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Aanbod Tab */}
          {activeTab === 'aanbod' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Profiel</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Lengte</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Conditie</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Locatie</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Herkomst</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {AANBOD_DATA.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-600">{item.id}</td>
                      <td className="px-4 py-3 font-medium">{item.profielNaam}</td>
                      <td className="px-4 py-3">{item.beschikbareLengte} mm</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${conditieConfig[item.conditie].color}`}>
                          {item.conditie}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.locatie}</td>
                      <td className="px-4 py-3 text-gray-600">{item.herkomst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
