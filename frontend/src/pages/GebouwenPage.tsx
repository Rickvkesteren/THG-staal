import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Calendar,
  Package,
  ArrowRight,
  Calculator,
  Trash2,
  Filter,
  Box,
  Play,
  ChevronRight,
  Wrench
} from 'lucide-react'
import type { Gebouw, OntmantelingsStatus } from '../types'
import { MOCK_GEBOUWEN, type MockGebouw } from '../data/mockBuildings'
import type { CADElement } from '../types'

// Combineer demo data met mock buildings
interface ExtendedGebouw extends Gebouw {
  has3D?: boolean
}

const GEBOUWEN_DATA: ExtendedGebouw[] = [
  // Mock buildings met 3D data
  ...MOCK_GEBOUWEN.map((b: MockGebouw) => ({
    id: b.id,
    naam: b.naam,
    adres: b.adres,
    bouwjaar: b.bouwjaar,
    ontmantelingsDatum: '2024-12-15',
    status: 'actief' as OntmantelingsStatus,
    totaalGewicht: b.elementen.reduce((sum: number, e: CADElement) => sum + e.gewicht, 0),
    aantalElementen: b.elementen.length,
    verdiepingen: b.type === 'industriehal' || b.type === 'loods' ? 1 : 2,
    has3D: true
  })),
  // Extra gebouwen zonder 3D
  {
    id: 'geb-extra-001',
    naam: 'Parkeergarage Zuid',
    adres: 'Zuidlaan 78, Utrecht',
    bouwjaar: 1978,
    ontmantelingsDatum: '2024-11-01',
    status: 'voltooid' as OntmantelingsStatus,
    totaalGewicht: 62100,
    aantalElementen: 198,
    verdiepingen: 3,
    has3D: false
  },
]

const statusKleuren: Record<OntmantelingsStatus, { bg: string; text: string; label: string }> = {
  gepland: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Gepland' },
  actief: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Actief' },
  in_uitvoering: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'In Uitvoering' },
  voltooid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Voltooid' },
  geannuleerd: { bg: 'bg-red-100', text: 'text-red-800', label: 'Geannuleerd' }
}

export default function GebouwenPage() {
  const [zoekterm, setZoekterm] = useState('')
  const [statusFilter, setStatusFilter] = useState<OntmantelingsStatus | ''>('')
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  const gefilterdeGebouwen = GEBOUWEN_DATA.filter(g => {
    const matchZoek = g.naam.toLowerCase().includes(zoekterm.toLowerCase()) ||
                      g.adres.toLowerCase().includes(zoekterm.toLowerCase())
    const matchStatus = !statusFilter || g.status === statusFilter
    return matchZoek && matchStatus
  })

  const totaalStatistieken = {
    gebouwen: GEBOUWEN_DATA.length,
    elementen: GEBOUWEN_DATA.reduce((sum, g) => sum + g.aantalElementen, 0),
    gewicht: GEBOUWEN_DATA.reduce((sum, g) => sum + g.totaalGewicht, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gebouwen</h1>
          <p className="text-gray-500 mt-1">Beheer gebouwen voor staal oogst</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nieuw Gebouw
        </button>
      </div>

      {/* Statistieken */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totaal Gebouwen</p>
              <p className="text-xl font-bold">{totaalStatistieken.gebouwen}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Staal Elementen</p>
              <p className="text-xl font-bold">{totaalStatistieken.elementen}</p>
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
              <p className="text-xl font-bold">{(totaalStatistieken.gewicht / 1000).toFixed(1)} ton</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek gebouw of adres..."
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OntmantelingsStatus | '')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle statussen</option>
              <option value="gepland">Gepland</option>
              <option value="actief">Actief</option>
              <option value="voltooid">Voltooid</option>
              <option value="geannuleerd">Geannuleerd</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gebouwen Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {gefilterdeGebouwen.map((gebouw) => (
          <div
            key={gebouw.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{gebouw.naam}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin className="w-4 h-4" />
                    {gebouw.adres}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusKleuren[gebouw.status].bg} ${statusKleuren[gebouw.status].text}`}>
                  {statusKleuren[gebouw.status].label}
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Bouwjaar</p>
                  <p className="font-medium">{gebouw.bouwjaar}</p>
                </div>
                <div>
                  <p className="text-gray-500">Verdiepingen</p>
                  <p className="font-medium">{gebouw.verdiepingen}</p>
                </div>
                <div>
                  <p className="text-gray-500">Elementen</p>
                  <p className="font-medium">{gebouw.aantalElementen}</p>
                </div>
                <div>
                  <p className="text-gray-500">Gewicht</p>
                  <p className="font-medium">{(gebouw.totaalGewicht / 1000).toFixed(1)} ton</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                Ontmanteling: {new Date(gebouw.ontmantelingsDatum!).toLocaleDateString('nl-NL')}
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              {gebouw.has3D ? (
                <div className="flex flex-col gap-2">
                  {/* Hoofd actie - Start Flow */}
                  <button 
                    onClick={() => navigate(`/constructie-analyse/${gebouw.id}`)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
                  >
                    <Play className="w-4 h-4" />
                    Start Volledige Flow
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  {/* Secundaire acties */}
                  <div className="flex gap-2">
                    <Link
                      to={`/gebouw-3d/${gebouw.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Box className="w-4 h-4" />
                      3D
                    </Link>
                    <Link
                      to={`/operator-demontage/${gebouw.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-300 text-amber-700 text-sm font-medium rounded-lg hover:bg-amber-100 transition-colors"
                      title="Operator Demontage Planning"
                    >
                      <Wrench className="w-4 h-4" />
                      Operator
                    </Link>
                    <Link
                      to={`/nta8713/${gebouw.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Calculator className="w-4 h-4" />
                      NTA 8713
                    </Link>
                    <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Geen 3D data beschikbaar</span>
                  <Link
                    to={`/gebouwen/${gebouw.id}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    Details
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {gefilterdeGebouwen.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Geen gebouwen gevonden</h3>
          <p className="text-gray-500">Pas je zoekopdracht aan of voeg een nieuw gebouw toe.</p>
        </div>
      )}

      {/* Modal voor nieuw gebouw */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nieuw Gebouw Toevoegen</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Bijv. Fabriekshal Noord"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Straat en huisnummer, Stad"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bouwjaar</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1990"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verdiepingen</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ontmantelingsdatum</label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Toevoegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
