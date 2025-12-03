/**
 * Leveringen Pagina
 * Overzicht van alle leveringen en orders
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  User,
  Phone,
  FileText,
  Download,
  Eye,
  ChevronRight,
  Filter,
  Search,
  ArrowUpDown,
  Building2,
  Euro,
  Boxes
} from 'lucide-react'

type LeveringStatus = 'gepland' | 'onderweg' | 'afgeleverd' | 'probleem'

interface Levering {
  id: string
  orderNummer: string
  klant: {
    naam: string
    bedrijf: string
    adres: string
    telefoon: string
  }
  items: {
    profielNaam: string
    aantal: number
    gewicht: number
  }[]
  totaalGewicht: number
  totaalWaarde: number
  status: LeveringStatus
  geplannedeDatum: string
  afleverDatum?: string
  chauffeur?: string
  kenteken?: string
  tracking?: string
}

const MOCK_LEVERINGEN: Levering[] = [
  {
    id: 'LEV-001',
    orderNummer: 'ORD-2024-0847',
    klant: {
      naam: 'Jan de Vries',
      bedrijf: 'Bouwbedrijf De Vries BV',
      adres: 'Industrieweg 45, 1234 AB Amsterdam',
      telefoon: '+31 6 12345678'
    },
    items: [
      { profielNaam: 'HEA 200', aantal: 5, gewicht: 850 },
      { profielNaam: 'IPE 300', aantal: 3, gewicht: 420 },
    ],
    totaalGewicht: 1270,
    totaalWaarde: 4250,
    status: 'onderweg',
    geplannedeDatum: '2024-12-01',
    chauffeur: 'Pieter Jansen',
    kenteken: 'AB-123-CD',
    tracking: 'TRK-847291'
  },
  {
    id: 'LEV-002',
    orderNummer: 'ORD-2024-0846',
    klant: {
      naam: 'Maria Bakker',
      bedrijf: 'Staalbouw Bakker',
      adres: 'Havenstraat 12, 5678 CD Rotterdam',
      telefoon: '+31 6 87654321'
    },
    items: [
      { profielNaam: 'HEB 300', aantal: 8, gewicht: 1840 },
    ],
    totaalGewicht: 1840,
    totaalWaarde: 6120,
    status: 'gepland',
    geplannedeDatum: '2024-12-02',
  },
  {
    id: 'LEV-003',
    orderNummer: 'ORD-2024-0840',
    klant: {
      naam: 'Kees van Dijk',
      bedrijf: 'Constructie Van Dijk',
      adres: 'Fabrieksweg 89, 9012 EF Utrecht',
      telefoon: '+31 6 11223344'
    },
    items: [
      { profielNaam: 'IPE 200', aantal: 12, gewicht: 1440 },
      { profielNaam: 'HEA 160', aantal: 6, gewicht: 480 },
    ],
    totaalGewicht: 1920,
    totaalWaarde: 5890,
    status: 'afgeleverd',
    geplannedeDatum: '2024-11-29',
    afleverDatum: '2024-11-29',
    chauffeur: 'Willem Smit',
    kenteken: 'EF-456-GH',
  },
  {
    id: 'LEV-004',
    orderNummer: 'ORD-2024-0838',
    klant: {
      naam: 'Sandra Peters',
      bedrijf: 'Peters Constructies',
      adres: 'Staalweg 23, 3456 GH Eindhoven',
      telefoon: '+31 6 99887766'
    },
    items: [
      { profielNaam: 'HEA 300', aantal: 4, gewicht: 920 },
    ],
    totaalGewicht: 920,
    totaalWaarde: 3450,
    status: 'probleem',
    geplannedeDatum: '2024-11-28',
  },
]

const STATUS_CONFIG: Record<LeveringStatus, { label: string; kleur: string; icon: any; bgKleur: string }> = {
  gepland: { label: 'Gepland', kleur: 'text-blue-600', icon: Calendar, bgKleur: 'bg-blue-50' },
  onderweg: { label: 'Onderweg', kleur: 'text-amber-600', icon: Truck, bgKleur: 'bg-amber-50' },
  afgeleverd: { label: 'Afgeleverd', kleur: 'text-green-600', icon: CheckCircle, bgKleur: 'bg-green-50' },
  probleem: { label: 'Probleem', kleur: 'text-red-600', icon: AlertCircle, bgKleur: 'bg-red-50' },
}

function LeveringKaart({ levering }: { levering: Levering }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[levering.status]
  const StatusIcon = config.icon
  
  return (
    <div className={`bg-white rounded-xl border-2 transition-all ${
      levering.status === 'probleem' ? 'border-red-200' : 
      levering.status === 'onderweg' ? 'border-amber-200' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className={`w-12 h-12 ${config.bgKleur} rounded-xl flex items-center justify-center`}>
              <StatusIcon className={`w-6 h-6 ${config.kleur}`} />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{levering.id}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bgKleur} ${config.kleur}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-sm text-gray-500">{levering.orderNummer}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{levering.klant.bedrijf}</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">€{levering.totaalWaarde.toLocaleString()}</p>
            <p className="text-sm text-gray-500">{levering.totaalGewicht} kg</p>
            <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
              <Calendar className="w-4 h-4" />
              {levering.geplannedeDatum}
            </div>
          </div>
        </div>
        
        {/* Items preview */}
        <div className="flex gap-2 mt-3">
          {levering.items.map((item, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
              {item.aantal}x {item.profielNaam}
            </span>
          ))}
        </div>
      </div>
      
      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Klant info */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                Klantgegevens
              </h4>
              <div className="space-y-2 text-sm">
                <p className="font-medium">{levering.klant.naam}</p>
                <p className="text-gray-600">{levering.klant.bedrijf}</p>
                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {levering.klant.adres}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {levering.klant.telefoon}
                </div>
              </div>
            </div>
            
            {/* Transport info */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Truck className="w-4 h-4 text-gray-500" />
                Transport
              </h4>
              <div className="space-y-2 text-sm">
                {levering.chauffeur ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chauffeur</span>
                      <span className="font-medium">{levering.chauffeur}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kenteken</span>
                      <span className="font-medium">{levering.kenteken}</span>
                    </div>
                    {levering.tracking && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tracking</span>
                        <span className="font-medium text-blue-600">{levering.tracking}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-gray-500 italic">Nog niet toegewezen</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Items detail */}
          <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-gray-500" />
              Items ({levering.items.length})
            </h4>
            <div className="space-y-2">
              {levering.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                      <Package className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-medium">{item.profielNaam}</span>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{item.aantal} stuks</p>
                    <p className="text-gray-500">{item.gewicht} kg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Acties */}
          <div className="flex gap-2 mt-4">
            <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Eye className="w-4 h-4" />
              Bekijk Order
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <FileText className="w-4 h-4" />
              Pakbon
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Certificaat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeveringenPage() {
  const [filter, setFilter] = useState<LeveringStatus | 'alle'>('alle')
  const [zoekterm, setZoekterm] = useState('')
  
  const gefilterdeLeveringen = MOCK_LEVERINGEN.filter(l => {
    if (filter !== 'alle' && l.status !== filter) return false
    if (zoekterm) {
      const term = zoekterm.toLowerCase()
      return (
        l.id.toLowerCase().includes(term) ||
        l.orderNummer.toLowerCase().includes(term) ||
        l.klant.bedrijf.toLowerCase().includes(term) ||
        l.klant.naam.toLowerCase().includes(term)
      )
    }
    return true
  })
  
  // Stats
  const stats = {
    gepland: MOCK_LEVERINGEN.filter(l => l.status === 'gepland').length,
    onderweg: MOCK_LEVERINGEN.filter(l => l.status === 'onderweg').length,
    afgeleverd: MOCK_LEVERINGEN.filter(l => l.status === 'afgeleverd').length,
    probleem: MOCK_LEVERINGEN.filter(l => l.status === 'probleem').length,
    totaalWaarde: MOCK_LEVERINGEN.reduce((s, l) => s + l.totaalWaarde, 0),
    totaalGewicht: MOCK_LEVERINGEN.reduce((s, l) => s + l.totaalGewicht, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leveringen</h1>
              <p className="text-gray-500">Beheer orders en verzendingen</p>
            </div>
          </div>
          
          <Link
            to="/shop"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Package className="w-4 h-4" />
            Naar Webshop
          </Link>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">Gepland</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.gepland}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Truck className="w-5 h-5" />
            <span className="text-sm font-medium">Onderweg</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.onderweg}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Afgeleverd</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.afgeleverd}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-red-600 mb-1">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Problemen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.probleem}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Euro className="w-5 h-5" />
            <span className="text-sm font-medium">Totaal Waarde</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">€{stats.totaalWaarde.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-1">
            <Package className="w-5 h-5" />
            <span className="text-sm font-medium">Totaal Gewicht</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(stats.totaalGewicht / 1000).toFixed(1)}t</p>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Zoeken */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek op order, klant..."
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
          
          {/* Status filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('alle')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === 'alle' 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Alle ({MOCK_LEVERINGEN.length})
            </button>
            {(['gepland', 'onderweg', 'afgeleverd', 'probleem'] as LeveringStatus[]).map(status => {
              const config = STATUS_CONFIG[status]
              const count = MOCK_LEVERINGEN.filter(l => l.status === status).length
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === status 
                      ? `${config.bgKleur} ${config.kleur}` 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {config.label} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Leveringen lijst */}
      <div className="space-y-4">
        {gefilterdeLeveringen.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Geen leveringen gevonden</p>
          </div>
        ) : (
          gefilterdeLeveringen.map(levering => (
            <LeveringKaart key={levering.id} levering={levering} />
          ))
        )}
      </div>
    </div>
  )
}
