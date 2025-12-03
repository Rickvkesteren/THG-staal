import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  ChevronRight,
  Building2,
  Package,
  Truck,
  ArrowLeft,
  ArrowRight,
  Eye
} from 'lucide-react'
import { MOCK_GEBOUWEN } from '../data/mockBuildings'

interface OogstTaak {
  id: string
  gebouwId: string
  gebouwNaam: string
  elementId: string
  profielNaam: string
  lengte: number
  gewicht: number
  volgorde: number
  status: 'wachten' | 'bezig' | 'voltooid' | 'probleem'
  geplandeDatum: string
  geschatteTijd: number // minuten
  medewerker?: string
}

// Genereer taken op basis van mock gebouwen
function genereerTaken(): OogstTaak[] {
  const taken: OogstTaak[] = []
  let taakNr = 1
  
  MOCK_GEBOUWEN.forEach(gebouw => {
    gebouw.elementen.slice(0, 8).forEach((element, idx) => {
      const statussen: OogstTaak['status'][] = ['voltooid', 'bezig', 'wachten', 'wachten', 'probleem', 'wachten', 'wachten', 'wachten']
      taken.push({
        id: `t-${String(taakNr++).padStart(3, '0')}`,
        gebouwId: gebouw.id,
        gebouwNaam: gebouw.naam,
        elementId: element.id,
        profielNaam: element.profielNaam,
        lengte: element.lengte,
        gewicht: element.gewicht,
        volgorde: idx + 1,
        status: statussen[idx] || 'wachten',
        geplandeDatum: '2024-11-08',
        geschatteTijd: Math.round(element.gewicht / 10) + 20,
        medewerker: idx < 2 ? ['Jan Peters', 'Piet Jansen'][idx] : undefined
      })
    })
  })
  
  return taken
}

const TAKEN = genereerTaken()

const statusConfig = {
  wachten: { icon: Clock, color: 'text-gray-600 bg-gray-100', label: 'Wachten' },
  bezig: { icon: Play, color: 'text-blue-600 bg-blue-100', label: 'Bezig' },
  voltooid: { icon: CheckCircle, color: 'text-green-600 bg-green-100', label: 'Voltooid' },
  probleem: { icon: AlertTriangle, color: 'text-red-600 bg-red-100', label: 'Probleem' },
}

export default function OogstPlanningPage() {
  const { gebouwId } = useParams<{ gebouwId: string }>()
  const navigate = useNavigate()
  
  // Vind gebouw op basis van route param
  const geselecteerdGebouwData = useMemo(() => {
    if (gebouwId) {
      return MOCK_GEBOUWEN.find(g => g.id === gebouwId)
    }
    return null
  }, [gebouwId])
  
  const [geselecteerdeDatum, setGeselecteerdeDatum] = useState('2024-11-08')
  const [geselecteerdGebouw, setGeselecteerdGebouw] = useState<string | null>(
    geselecteerdGebouwData?.naam || null
  )

  const takenVoorDatum = TAKEN.filter(t => t.geplandeDatum === geselecteerdeDatum)
  const gebouwen = [...new Set(takenVoorDatum.map(t => t.gebouwNaam))]

  const takenVoorWeergave = geselecteerdGebouw 
    ? takenVoorDatum.filter(t => t.gebouwNaam === geselecteerdGebouw)
    : takenVoorDatum

  const statistieken = {
    totaal: takenVoorDatum.length,
    voltooid: takenVoorDatum.filter(t => t.status === 'voltooid').length,
    bezig: takenVoorDatum.filter(t => t.status === 'bezig').length,
    wachten: takenVoorDatum.filter(t => t.status === 'wachten').length,
    probleem: takenVoorDatum.filter(t => t.status === 'probleem').length,
    totaalGewicht: takenVoorDatum.reduce((s, t) => s + t.gewicht, 0),
    geschatteTijd: takenVoorDatum.reduce((s, t) => s + t.geschatteTijd, 0),
  }

  return (
    <div className="space-y-6">
      {/* Header met navigatie */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(gebouwId ? `/gebouw-3d/${gebouwId}` : '/gebouwen')}
            className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            title="Terug"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded">FASE 1</span>
              <span className="text-gray-400 text-sm">Stap 3 van 5</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Oogst Planning</h1>
            {geselecteerdGebouwData && (
              <p className="text-gray-500 mt-1">
                <Building2 className="w-4 h-4 inline mr-1" />
                {geselecteerdGebouwData.naam}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {gebouwId && (
            <button
              onClick={() => navigate(`/gebouw-3d/${gebouwId}`)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <Eye className="w-4 h-4" />
              3D Bekijken
            </button>
          )}
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={geselecteerdeDatum}
              onChange={(e) => setGeselecteerdeDatum(e.target.value)}
              className="border-0 focus:ring-0 p-0 text-sm"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700">
            <Play className="w-4 h-4" />
            Start Dag
          </button>
          <button
            onClick={() => navigate('/oogst-3d')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg text-sm font-medium text-white hover:bg-green-700"
          >
            Demontage 3D
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Totaal</p>
              <p className="text-xl font-bold">{statistieken.totaal}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Voltooid</p>
              <p className="text-xl font-bold">{statistieken.voltooid}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Play className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Bezig</p>
              <p className="text-xl font-bold">{statistieken.bezig}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Clock className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Wachten</p>
              <p className="text-xl font-bold">{statistieken.wachten}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Truck className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Gewicht</p>
              <p className="text-xl font-bold">{(statistieken.totaalGewicht / 1000).toFixed(1)}t</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Est. Tijd</p>
              <p className="text-xl font-bold">{Math.floor(statistieken.geschatteTijd / 60)}u {statistieken.geschatteTijd % 60}m</p>
            </div>
          </div>
        </div>
      </div>

      {/* Voortgangsbalk */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Dagvoortgang</span>
          <span className="text-sm text-gray-500">
            {statistieken.voltooid} / {statistieken.totaal} taken ({Math.round((statistieken.voltooid / statistieken.totaal) * 100)}%)
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
          <div 
            className="bg-green-500 h-full transition-all" 
            style={{ width: `${(statistieken.voltooid / statistieken.totaal) * 100}%` }} 
          />
          <div 
            className="bg-blue-500 h-full transition-all" 
            style={{ width: `${(statistieken.bezig / statistieken.totaal) * 100}%` }} 
          />
          <div 
            className="bg-red-500 h-full transition-all" 
            style={{ width: `${(statistieken.probleem / statistieken.totaal) * 100}%` }} 
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Voltooid</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Bezig</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span> Wachten</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Probleem</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Gebouwen sidebar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Gebouwen</h3>
          <div className="space-y-2">
            <button
              onClick={() => setGeselecteerdGebouw(null)}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                !geselecteerdGebouw ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Alle gebouwen</span>
              <span className="ml-auto text-sm bg-gray-200 px-2 py-0.5 rounded-full">
                {takenVoorDatum.length}
              </span>
            </button>
            {gebouwen.map(gebouw => {
              const takenGebouw = takenVoorDatum.filter(t => t.gebouwNaam === gebouw)
              return (
                <button
                  key={gebouw}
                  onClick={() => setGeselecteerdGebouw(gebouw)}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                    geselecteerdGebouw === gebouw ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span className="truncate">{gebouw}</span>
                  <span className="ml-auto text-sm bg-gray-200 px-2 py-0.5 rounded-full">
                    {takenGebouw.length}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Taken lijst */}
        <div className="lg:col-span-3 space-y-3">
          {takenVoorWeergave.map((taak) => {
            const StatusIcon = statusConfig[taak.status].icon
            return (
              <div 
                key={taak.id} 
                className={`bg-white rounded-xl border p-4 flex items-center gap-4 transition-colors ${
                  taak.status === 'probleem' ? 'border-red-300 bg-red-50' : 
                  taak.status === 'bezig' ? 'border-blue-300 bg-blue-50' : 
                  'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Volgorde */}
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600">
                  {taak.volgorde}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{taak.profielNaam}</span>
                    <span className="text-sm text-gray-500">• {taak.lengte} mm</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    {taak.gebouwNaam} • Element {taak.elementId}
                  </div>
                </div>

                {/* Gewicht & tijd */}
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{taak.gewicht} kg</div>
                  <div className="text-xs text-gray-500">~{taak.geschatteTijd} min</div>
                </div>

                {/* Medewerker */}
                <div className="hidden md:flex items-center gap-2 min-w-32">
                  {taak.medewerker ? (
                    <>
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                        {taak.medewerker.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="text-sm text-gray-600">{taak.medewerker}</span>
                    </>
                  ) : (
                    <span className="text-sm text-gray-400">Niet toegewezen</span>
                  )}
                </div>

                {/* Status */}
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig[taak.status].color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig[taak.status].label}
                </span>

                {/* Actie */}
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            )
          })}

          {takenVoorWeergave.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">Geen taken gepland</h3>
              <p className="text-gray-500">Er zijn geen oogsttaken voor deze datum.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
