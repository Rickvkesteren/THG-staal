import { useState } from 'react'
import {
  FileCheck,
  Search,
  Plus,
  Download,
  Eye,
  QrCode,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Printer,
  Share2
} from 'lucide-react'

interface Certificaat {
  id: string
  nummer: string
  type: 'herkomst' | 'kwaliteit' | 'volledig'
  elementId: string
  profielNaam: string
  lengte: number
  gewicht: number
  herkomstGebouw: string
  herkomstAdres: string
  bouwjaar: number
  oogstDatum: string
  uitgifteDatum: string
  geldigTot: string
  status: 'actief' | 'verlopen' | 'ingetrokken'
  kwaliteitsgraad: 'A' | 'B' | 'C'
  inspecteur: string
  qrCode: string
}

// Demo certificaten
const CERTIFICATEN: Certificaat[] = [
  {
    id: 'cert-001',
    nummer: 'SHC-2024-001',
    type: 'volledig',
    elementId: 'inv-001',
    profielNaam: 'HEA 300',
    lengte: 5850,
    gewicht: 516.5,
    herkomstGebouw: 'Fabriekshal Oost',
    herkomstAdres: 'Industrieweg 45, Amsterdam',
    bouwjaar: 1985,
    oogstDatum: '2024-10-15',
    uitgifteDatum: '2024-10-20',
    geldigTot: '2029-10-20',
    status: 'actief',
    kwaliteitsgraad: 'A',
    inspecteur: 'Ing. J. de Vries',
    qrCode: 'https://staalhergebruik.nl/cert/SHC-2024-001'
  },
  {
    id: 'cert-002',
    nummer: 'SHC-2024-002',
    type: 'volledig',
    elementId: 'inv-002',
    profielNaam: 'HEA 300',
    lengte: 5850,
    gewicht: 516.5,
    herkomstGebouw: 'Fabriekshal Oost',
    herkomstAdres: 'Industrieweg 45, Amsterdam',
    bouwjaar: 1985,
    oogstDatum: '2024-10-15',
    uitgifteDatum: '2024-10-20',
    geldigTot: '2029-10-20',
    status: 'actief',
    kwaliteitsgraad: 'A',
    inspecteur: 'Ing. J. de Vries',
    qrCode: 'https://staalhergebruik.nl/cert/SHC-2024-002'
  },
  {
    id: 'cert-003',
    nummer: 'SHC-2024-003',
    type: 'herkomst',
    elementId: 'inv-003',
    profielNaam: 'HEB 300',
    lengte: 3950,
    gewicht: 461.5,
    herkomstGebouw: 'Fabriekshal Oost',
    herkomstAdres: 'Industrieweg 45, Amsterdam',
    bouwjaar: 1985,
    oogstDatum: '2024-10-16',
    uitgifteDatum: '2024-10-22',
    geldigTot: '2029-10-22',
    status: 'actief',
    kwaliteitsgraad: 'A',
    inspecteur: 'Ing. M. Bakker',
    qrCode: 'https://staalhergebruik.nl/cert/SHC-2024-003'
  },
  {
    id: 'cert-004',
    nummer: 'SHC-2024-004',
    type: 'kwaliteit',
    elementId: 'inv-005',
    profielNaam: 'IPE 400',
    lengte: 7800,
    gewicht: 517,
    herkomstGebouw: 'Sporthal De Meerkamp',
    herkomstAdres: 'Sportlaan 5, Amersfoort',
    bouwjaar: 1995,
    oogstDatum: '2024-10-20',
    uitgifteDatum: '2024-10-25',
    geldigTot: '2029-10-25',
    status: 'actief',
    kwaliteitsgraad: 'B',
    inspecteur: 'Ing. J. de Vries',
    qrCode: 'https://staalhergebruik.nl/cert/SHC-2024-004'
  },
  {
    id: 'cert-005',
    nummer: 'SHC-2023-089',
    type: 'volledig',
    elementId: 'inv-old',
    profielNaam: 'HEB 200',
    lengte: 4500,
    gewicht: 276,
    herkomstGebouw: 'Oude Fabriek Noord',
    herkomstAdres: 'Havenstraat 12, Rotterdam',
    bouwjaar: 1972,
    oogstDatum: '2023-06-10',
    uitgifteDatum: '2023-06-15',
    geldigTot: '2023-12-15',
    status: 'verlopen',
    kwaliteitsgraad: 'B',
    inspecteur: 'Ing. P. Jansen',
    qrCode: 'https://staalhergebruik.nl/cert/SHC-2023-089'
  },
]

const typeConfig = {
  herkomst: { label: 'Herkomst', color: 'bg-blue-100 text-blue-700' },
  kwaliteit: { label: 'Kwaliteit', color: 'bg-green-100 text-green-700' },
  volledig: { label: 'Volledig', color: 'bg-purple-100 text-purple-700' },
}

const statusConfig = {
  actief: { icon: CheckCircle, color: 'text-green-600', label: 'Actief' },
  verlopen: { icon: Clock, color: 'text-amber-600', label: 'Verlopen' },
  ingetrokken: { icon: AlertTriangle, color: 'text-red-600', label: 'Ingetrokken' },
}

const graadConfig = {
  A: { color: 'bg-green-500', label: 'Uitstekend' },
  B: { color: 'bg-blue-500', label: 'Goed' },
  C: { color: 'bg-yellow-500', label: 'Voldoende' },
}

export default function CertificeringPage() {
  const [zoekterm, setZoekterm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'actief' | 'verlopen' | 'ingetrokken' | ''>('')
  const [geselecteerdCertificaat, setGeselecteerdCertificaat] = useState<Certificaat | null>(null)

  const gefilterdeCertificaten = CERTIFICATEN.filter(cert => {
    const matchZoek = cert.nummer.toLowerCase().includes(zoekterm.toLowerCase()) ||
                      cert.profielNaam.toLowerCase().includes(zoekterm.toLowerCase()) ||
                      cert.herkomstGebouw.toLowerCase().includes(zoekterm.toLowerCase())
    const matchStatus = !statusFilter || cert.status === statusFilter
    return matchZoek && matchStatus
  })

  const stats = {
    totaal: CERTIFICATEN.length,
    actief: CERTIFICATEN.filter(c => c.status === 'actief').length,
    verlopen: CERTIFICATEN.filter(c => c.status === 'verlopen').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificering</h1>
          <p className="text-gray-500 mt-1">Herkomst certificaten en traceerbaarheid</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          Nieuw Certificaat
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Totaal Certificaten</p>
              <p className="text-xl font-bold">{stats.totaal}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Actief</p>
              <p className="text-xl font-bold">{stats.actief}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Verlopen</p>
              <p className="text-xl font-bold">{stats.verlopen}</p>
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
              placeholder="Zoek op nummer, profiel of herkomst..."
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle statussen</option>
            <option value="actief">Actief</option>
            <option value="verlopen">Verlopen</option>
            <option value="ingetrokken">Ingetrokken</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Certificaten lijst */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {gefilterdeCertificaten.map((cert) => {
              const StatusIcon = statusConfig[cert.status].icon
              return (
                <button
                  key={cert.id}
                  onClick={() => setGeselecteerdCertificaat(cert)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    geselecteerdCertificaat?.id === cert.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Certificaat icoon */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      cert.status === 'actief' ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <FileCheck className={`w-6 h-6 ${
                        cert.status === 'actief' ? 'text-green-600' : 'text-gray-400'
                      }`} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{cert.nummer}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig[cert.type].color}`}>
                          {typeConfig[cert.type].label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">
                        {cert.profielNaam} • {cert.lengte} mm • {cert.gewicht} kg
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {cert.herkomstGebouw}
                      </div>
                    </div>

                    {/* Status & Grade */}
                    <div className="text-right">
                      <div className={`flex items-center gap-1 ${statusConfig[cert.status].color}`}>
                        <StatusIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{statusConfig[cert.status].label}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs font-bold ${graadConfig[cert.kwaliteitsgraad].color}`}>
                          {cert.kwaliteitsgraad}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              )
            })}
          </div>

          {gefilterdeCertificaten.length === 0 && (
            <div className="p-12 text-center">
              <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Geen certificaten gevonden</h3>
              <p className="text-gray-500">Pas je zoekopdracht aan.</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {geselecteerdCertificaat ? (
            <div>
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig[geselecteerdCertificaat.type].color}`}>
                    {typeConfig[geselecteerdCertificaat.type].label} Certificaat
                  </span>
                  <span className={`flex items-center gap-1 ${statusConfig[geselecteerdCertificaat.status].color}`}>
                    {(() => {
                      const Icon = statusConfig[geselecteerdCertificaat.status].icon
                      return <Icon className="w-4 h-4" />
                    })()}
                    <span className="text-sm font-medium">{statusConfig[geselecteerdCertificaat.status].label}</span>
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">{geselecteerdCertificaat.nummer}</h3>
              </div>

              {/* QR Code */}
              <div className="p-4 border-b border-gray-200 flex justify-center">
                <div className="bg-white p-4 border border-gray-200 rounded-lg">
                  <div className="w-32 h-32 bg-gray-100 flex items-center justify-center">
                    <QrCode className="w-24 h-24 text-gray-400" />
                  </div>
                  <p className="text-xs text-center text-gray-500 mt-2">Scan voor verificatie</p>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-4">
                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Element Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Profiel</span>
                      <span className="font-medium">{geselecteerdCertificaat.profielNaam}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Lengte</span>
                      <span className="font-medium">{geselecteerdCertificaat.lengte} mm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Gewicht</span>
                      <span className="font-medium">{geselecteerdCertificaat.gewicht} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Kwaliteitsgraad</span>
                      <span className={`px-2 py-0.5 rounded text-white text-xs font-bold ${graadConfig[geselecteerdCertificaat.kwaliteitsgraad].color}`}>
                        {geselecteerdCertificaat.kwaliteitsgraad} - {graadConfig[geselecteerdCertificaat.kwaliteitsgraad].label}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Herkomst</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <div className="font-medium">{geselecteerdCertificaat.herkomstGebouw}</div>
                        <div className="text-gray-500">{geselecteerdCertificaat.herkomstAdres}</div>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bouwjaar</span>
                      <span className="font-medium">{geselecteerdCertificaat.bouwjaar}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Oogstdatum</span>
                      <span className="font-medium">
                        {new Date(geselecteerdCertificaat.oogstDatum).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Certificering</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Uitgiftedatum</span>
                      <span className="font-medium">
                        {new Date(geselecteerdCertificaat.uitgifteDatum).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Geldig tot</span>
                      <span className="font-medium">
                        {new Date(geselecteerdCertificaat.geldigTot).toLocaleDateString('nl-NL')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Inspecteur</span>
                      <span className="font-medium">{geselecteerdCertificaat.inspecteur}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-200 flex gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                  PDF
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Printer className="w-4 h-4" />
                  Print
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <Share2 className="w-4 h-4" />
                  Deel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Selecteer een certificaat</h3>
              <p className="text-gray-500">Kies een certificaat uit de lijst voor details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
