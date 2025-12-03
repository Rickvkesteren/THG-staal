import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Warehouse,
  Search,
  Filter,
  Plus,
  ArrowUpDown,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  Factory,
  ArrowRight
} from 'lucide-react'
import type { VoorraadItem, VoorraadStatus, Conditie } from '../types'

// Demo voorraad data
const VOORRAAD_DATA: VoorraadItem[] = [
  { id: 'inv-001', profielId: 'hea-300', profielNaam: 'HEA 300', lengte: 5850, gewicht: 516.5, conditie: 'goed', herkomstGebouw: 'Fabriekshal Oost', herkomstElement: 'el-001', status: 'beschikbaar', locatie: 'Hal A-12', oogstDatum: '2024-10-15', schoonmaakVoltooid: true },
  { id: 'inv-002', profielId: 'hea-300', profielNaam: 'HEA 300', lengte: 5850, gewicht: 516.5, conditie: 'goed', herkomstGebouw: 'Fabriekshal Oost', herkomstElement: 'el-002', status: 'beschikbaar', locatie: 'Hal A-13', oogstDatum: '2024-10-15', schoonmaakVoltooid: true },
  { id: 'inv-003', profielId: 'heb-300', profielNaam: 'HEB 300', lengte: 3950, gewicht: 461.5, conditie: 'goed', herkomstGebouw: 'Fabriekshal Oost', herkomstElement: 'el-003', status: 'gereserveerd', locatie: 'Hal A-15', oogstDatum: '2024-10-16', schoonmaakVoltooid: true },
  { id: 'inv-004', profielId: 'heb-300', profielNaam: 'HEB 300', lengte: 3800, gewicht: 444, conditie: 'matig', herkomstGebouw: 'Fabriekshal Oost', herkomstElement: 'el-004', status: 'in_bewerking', locatie: 'Robot Cel 2', oogstDatum: '2024-10-16', schoonmaakVoltooid: false },
  { id: 'inv-005', profielId: 'ipe-400', profielNaam: 'IPE 400', lengte: 7800, gewicht: 517, conditie: 'goed', herkomstGebouw: 'Kantoorpand Centrum', herkomstElement: 'el-012', status: 'beschikbaar', locatie: 'Hal B-03', oogstDatum: '2024-10-20', schoonmaakVoltooid: true },
  { id: 'inv-006', profielId: 'ipe-300', profielNaam: 'IPE 300', lengte: 5500, gewicht: 232.1, conditie: 'goed', herkomstGebouw: 'Kantoorpand Centrum', herkomstElement: 'el-015', status: 'verkocht', locatie: 'Verzending', oogstDatum: '2024-10-18', schoonmaakVoltooid: true },
  { id: 'inv-007', profielId: 'hea-200', profielNaam: 'HEA 200', lengte: 4200, gewicht: 177.7, conditie: 'slecht', herkomstGebouw: 'Parkeergarage Zuid', herkomstElement: 'el-044', status: 'beschikbaar', locatie: 'Hal C-08', oogstDatum: '2024-11-02', schoonmaakVoltooid: true },
  { id: 'inv-008', profielId: 'heb-240', profielNaam: 'HEB 240', lengte: 6000, gewicht: 499.2, conditie: 'goed', herkomstGebouw: 'Distributiecentrum West', herkomstElement: 'el-088', status: 'in_bewerking', locatie: 'Robot Cel 1', oogstDatum: '2024-11-05', schoonmaakVoltooid: false },
]

const statusConfig: Record<VoorraadStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  beschikbaar: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Beschikbaar' },
  gereserveerd: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Gereserveerd' },
  in_bewerking: { icon: AlertCircle, color: 'text-amber-600 bg-amber-100', label: 'In Bewerking' },
  verkocht: { icon: Package, color: 'text-purple-600 bg-purple-100', label: 'Verkocht' },
}

const conditieKleuren: Record<Conditie, string> = {
  goed: 'bg-green-100 text-green-800',
  matig: 'bg-yellow-100 text-yellow-800',
  slecht: 'bg-red-100 text-red-800',
  onbekend: 'bg-gray-100 text-gray-800',
}

export default function VoorraadPage() {
  const navigate = useNavigate()
  const [zoekterm, setZoekterm] = useState('')
  const [statusFilter, setStatusFilter] = useState<VoorraadStatus | ''>('')
  const [conditieFilter, setConditieFilter] = useState<Conditie | ''>('')
  const [sorteerOp, setSorteerOp] = useState<'datum' | 'gewicht' | 'profiel'>('datum')
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)

  const gefilterdeVoorraad = VOORRAAD_DATA.filter(item => {
    const matchZoek = item.profielNaam.toLowerCase().includes(zoekterm.toLowerCase()) ||
                      item.herkomstGebouw.toLowerCase().includes(zoekterm.toLowerCase()) ||
                      (item.locatie || '').toLowerCase().includes(zoekterm.toLowerCase())
    const matchStatus = !statusFilter || item.status === statusFilter
    const matchConditie = !conditieFilter || item.conditie === conditieFilter
    return matchZoek && matchStatus && matchConditie
  }).sort((a, b) => {
    if (sorteerOp === 'datum') return new Date(b.oogstDatum || 0).getTime() - new Date(a.oogstDatum || 0).getTime()
    if (sorteerOp === 'gewicht') return (b.gewicht || 0) - (a.gewicht || 0)
    return a.profielNaam.localeCompare(b.profielNaam)
  })

  const totalen = {
    items: VOORRAAD_DATA.length,
    beschikbaar: VOORRAAD_DATA.filter(i => i.status === 'beschikbaar').length,
    gewicht: VOORRAAD_DATA.reduce((s, i) => s + (i.gewicht || 0), 0),
    inBewerking: VOORRAAD_DATA.filter(i => i.status === 'in_bewerking').length,
    nietSchoon: VOORRAAD_DATA.filter(i => !i.schoonmaakVoltooid).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-amber-600 text-white text-xs font-medium rounded">FASE 2</span>
            <span className="text-gray-400 text-sm">Stap 1 van 4</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Voorraad</h1>
          <p className="text-gray-500 mt-1">Beheer geoogste stalen balken - {totalen.items} items</p>
        </div>
        <div className="flex items-center gap-3">
          {totalen.nietSchoon > 0 && (
            <button
              onClick={() => navigate('/schoonmaak')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 rounded-lg text-sm font-medium text-white hover:bg-amber-600"
            >
              <Sparkles className="w-4 h-4" />
              {totalen.nietSchoon} te schoonmaken
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {totalen.inBewerking > 0 && (
            <button
              onClick={() => navigate('/productie-3d')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg text-sm font-medium text-white hover:bg-purple-700"
            >
              <Factory className="w-4 h-4" />
              {totalen.inBewerking} in productie
            </button>
          )}
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="w-4 h-4" />
            Balk Toevoegen
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Warehouse className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totaal Items</p>
              <p className="text-xl font-bold">{totalen.items}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Beschikbaar</p>
              <p className="text-xl font-bold">{totalen.beschikbaar}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totaal Gewicht</p>
              <p className="text-xl font-bold">{(totalen.gewicht / 1000).toFixed(1)} ton</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek op profiel, herkomst of locatie..."
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as VoorraadStatus | '')}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle statussen</option>
                <option value="beschikbaar">Beschikbaar</option>
                <option value="gereserveerd">Gereserveerd</option>
                <option value="in_bewerking">In Bewerking</option>
                <option value="verkocht">Verkocht</option>
              </select>
            </div>
            <select
              value={conditieFilter}
              onChange={(e) => setConditieFilter(e.target.value as Conditie | '')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle condities</option>
              <option value="goed">Goed</option>
              <option value="matig">Matig</option>
              <option value="slecht">Slecht</option>
            </select>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-gray-400" />
              <select
                value={sorteerOp}
                onChange={(e) => setSorteerOp(e.target.value as 'datum' | 'gewicht' | 'profiel')}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="datum">Sorteer op datum</option>
                <option value="gewicht">Sorteer op gewicht</option>
                <option value="profiel">Sorteer op profiel</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Voorraad tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Profiel</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Lengte</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Gewicht</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Conditie</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Herkomst</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Locatie</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gefilterdeVoorraad.map((item) => {
                const StatusIcon = statusConfig[item.status].icon
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{item.id}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{item.profielNaam}</span>
                    </td>
                    <td className="px-4 py-3 text-sm">{item.lengte} mm</td>
                    <td className="px-4 py-3 text-sm">{item.gewicht} kg</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${conditieKleuren[item.conditie || 'onbekend']}`}>
                        {item.conditie || 'onbekend'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.herkomstGebouw}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.locatie}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[item.status].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[item.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 relative">
                      <button
                        onClick={() => setDropdownOpen(dropdownOpen === item.id ? null : item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      {dropdownOpen === item.id && (
                        <div className="absolute right-4 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32">
                          <button className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Eye className="w-4 h-4" /> Bekijken
                          </button>
                          <button className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                            <Edit className="w-4 h-4" /> Bewerken
                          </button>
                          <button className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                            <Trash2 className="w-4 h-4" /> Verwijderen
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          {gefilterdeVoorraad.length} van {VOORRAAD_DATA.length} items
        </div>
      </div>
    </div>
  )
}
