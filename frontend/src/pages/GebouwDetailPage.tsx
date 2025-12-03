import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  MapPin,
  Package,
  Edit,
  Download,
  Layers,
  AlertTriangle
} from 'lucide-react'
import type { GebouwElement, ElementType, Conditie } from '../types'

// Demo element data
const DEMO_ELEMENTEN: GebouwElement[] = [
  { id: 'el-001', gebouwId: 'geb-001', type: 'balk', profielId: 'hea-300', profielNaam: 'HEA 300', lengte: 6000, gewicht: 529.8, conditie: 'goed', positie: { x: 0, y: 0, z: 3000 }, rotatie: { x: 0, y: 0, z: 0 }, verdieping: 0 },
  { id: 'el-002', gebouwId: 'geb-001', type: 'balk', profielId: 'hea-300', profielNaam: 'HEA 300', lengte: 6000, gewicht: 529.8, conditie: 'goed', positie: { x: 6000, y: 0, z: 3000 }, rotatie: { x: 0, y: 0, z: 0 }, verdieping: 0 },
  { id: 'el-003', gebouwId: 'geb-001', type: 'kolom', profielId: 'heb-300', profielNaam: 'HEB 300', lengte: 4000, gewicht: 468, conditie: 'goed', positie: { x: 0, y: 0, z: 0 }, rotatie: { x: 0, y: 0, z: 90 }, verdieping: 0 },
  { id: 'el-004', gebouwId: 'geb-001', type: 'kolom', profielId: 'heb-300', profielNaam: 'HEB 300', lengte: 4000, gewicht: 468, conditie: 'matig', positie: { x: 6000, y: 0, z: 0 }, rotatie: { x: 0, y: 0, z: 90 }, verdieping: 0 },
  { id: 'el-005', gebouwId: 'geb-001', type: 'kolom', profielId: 'heb-300', profielNaam: 'HEB 300', lengte: 4000, gewicht: 468, conditie: 'goed', positie: { x: 12000, y: 0, z: 0 }, rotatie: { x: 0, y: 0, z: 90 }, verdieping: 0 },
  { id: 'el-006', gebouwId: 'geb-001', type: 'balk', profielId: 'ipe-400', profielNaam: 'IPE 400', lengte: 8000, gewicht: 530.4, conditie: 'goed', positie: { x: 0, y: 0, z: 4000 }, rotatie: { x: 0, y: 90, z: 0 }, verdieping: 1 },
  { id: 'el-007', gebouwId: 'geb-001', type: 'ligger', profielId: 'ipe-300', profielNaam: 'IPE 300', lengte: 6000, gewicht: 253.2, conditie: 'slecht', positie: { x: 0, y: 2000, z: 4000 }, rotatie: { x: 0, y: 0, z: 0 }, verdieping: 1 },
  { id: 'el-008', gebouwId: 'geb-001', type: 'ligger', profielId: 'ipe-300', profielNaam: 'IPE 300', lengte: 6000, gewicht: 253.2, conditie: 'goed', positie: { x: 0, y: 4000, z: 4000 }, rotatie: { x: 0, y: 0, z: 0 }, verdieping: 1 },
  { id: 'el-009', gebouwId: 'geb-001', type: 'schoor', profielId: 'hea-200', profielNaam: 'HEA 200', lengte: 5000, gewicht: 211.5, conditie: 'matig', positie: { x: 0, y: 0, z: 0 }, rotatie: { x: 0, y: 45, z: 0 }, verdieping: 0 },
  { id: 'el-010', gebouwId: 'geb-001', type: 'schoor', profielId: 'hea-200', profielNaam: 'HEA 200', lengte: 5000, gewicht: 211.5, conditie: 'goed', positie: { x: 12000, y: 0, z: 0 }, rotatie: { x: 0, y: -45, z: 0 }, verdieping: 0 },
]

const conditieKleuren: Record<Conditie, { bg: string; text: string; border: string }> = {
  goed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  matig: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  slecht: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  onbekend: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
}

const typeIcons: Record<ElementType, string> = {
  kolom: '⬍',
  balk: '⬌',
  ligger: '━',
  schoor: '╱',
  windverband: '╳',
  vloerligger: '═',
  spant: '⌂',
}

export default function GebouwDetailPage() {
  const { id } = useParams<{ id: string }>()
  
  // Demo gebouw data
  const gebouw = {
    id: id,
    naam: 'Fabriekshal Oost',
    adres: 'Industrieweg 45, Amsterdam',
    bouwjaar: 1985,
    ontmantelingsDatum: '2024-12-15',
    status: 'actief' as const,
    totaalGewicht: 45200,
    aantalElementen: 124,
    verdiepingen: 2,
  }

  // Statistieken
  const conditieTelling = DEMO_ELEMENTEN.reduce((acc, el) => {
    acc[el.conditie] = (acc[el.conditie] || 0) + 1
    return acc
  }, {} as Record<Conditie, number>)

  const typeTelling = DEMO_ELEMENTEN.reduce((acc, el) => {
    acc[el.type] = (acc[el.type] || 0) + 1
    return acc
  }, {} as Record<ElementType, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link
          to="/gebouwen"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{gebouw.naam}</h1>
              <div className="flex items-center gap-4 text-gray-500 mt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {gebouw.adres}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Bouwjaar {gebouw.bouwjaar}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700">
                <Edit className="w-4 h-4" />
                Bewerken
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Elementen</p>
              <p className="text-xl font-bold">{DEMO_ELEMENTEN.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totaal Gewicht</p>
              <p className="text-xl font-bold">
                {(DEMO_ELEMENTEN.reduce((s, e) => s + e.gewicht, 0) / 1000).toFixed(1)} ton
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Layers className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Verdiepingen</p>
              <p className="text-xl font-bold">{gebouw.verdiepingen}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Aandachtspunten</p>
              <p className="text-xl font-bold">{conditieTelling.slecht || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D View placeholder */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">3D Weergave</h3>
          </div>
          <div className="h-96 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">3D viewer wordt hier geladen</p>
              <p className="text-sm text-gray-400 mt-1">
                Gebruik Three.js voor interactieve weergave
              </p>
            </div>
          </div>
        </div>

        {/* Conditie overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Conditie Overzicht</h3>
          <div className="space-y-4">
            {(['goed', 'matig', 'slecht'] as Conditie[]).map(conditie => {
              const aantal = conditieTelling[conditie] || 0
              const percentage = (aantal / DEMO_ELEMENTEN.length) * 100
              return (
                <div key={conditie}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className={`px-2 py-0.5 rounded-full ${conditieKleuren[conditie].bg} ${conditieKleuren[conditie].text}`}>
                      {conditie.charAt(0).toUpperCase() + conditie.slice(1)}
                    </span>
                    <span className="text-gray-600">{aantal} elementen</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${conditieKleuren[conditie].bg.replace('100', '500')}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3">Element Types</h4>
            <div className="space-y-2">
              {Object.entries(typeTelling).map(([type, aantal]) => (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="w-6 text-center text-lg">{typeIcons[type as ElementType]}</span>
                    <span className="text-gray-700 capitalize">{type}</span>
                  </span>
                  <span className="text-gray-600">{aantal}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Elementen tabel */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Staal Elementen</h3>
          <span className="text-sm text-gray-500">{DEMO_ELEMENTEN.length} elementen</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">ID</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Profiel</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Lengte</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Gewicht</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Verdieping</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Conditie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {DEMO_ELEMENTEN.map((element) => (
                <tr key={element.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{element.id}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{typeIcons[element.type]}</span>
                      <span className="text-sm capitalize">{element.type}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{element.profielNaam}</td>
                  <td className="px-4 py-3 text-sm">{element.lengte} mm</td>
                  <td className="px-4 py-3 text-sm">{element.gewicht} kg</td>
                  <td className="px-4 py-3 text-sm">{element.verdieping}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${conditieKleuren[element.conditie].bg} ${conditieKleuren[element.conditie].text}`}>
                      {element.conditie}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
