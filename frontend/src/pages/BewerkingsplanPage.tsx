import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Scissors,
  Box,
  Wrench,
  CircleDot,
  Sparkles,
  PaintBucket,
  ClipboardCheck,
  TestTube,
  ArrowLeft,
  ArrowRight,
  Clock,
  Euro,
  CheckCircle2,
  Circle,
  Play,
  Layers,
  Target,
  Package,
  ChevronDown,
  ChevronUp,
  Truck,
  Factory,
  Settings
} from 'lucide-react'
import { MOCK_GEBOUWEN } from '../data/mockBuildings'
import type { 
  BewerkingsType, 
  Bewerking, 
  ElementBewerkingsplan,
  MatchingResultaat 
} from '../types/processing'

// Icons voor bewerkingstypes
const BEWERKING_ICONS: Record<BewerkingsType, React.ReactNode> = {
  ZAGEN: <Scissors className="w-5 h-5" />,
  SNIJDEN: <Scissors className="w-5 h-5 rotate-45" />,
  FREZEN: <Settings className="w-5 h-5" />,
  BOREN: <CircleDot className="w-5 h-5" />,
  STRALEN: <Sparkles className="w-5 h-5" />,
  SLIJPEN: <Box className="w-5 h-5" />,
  SCHOONMAKEN: <Sparkles className="w-5 h-5" />,
  VERVEN: <PaintBucket className="w-5 h-5" />,
  INSPECTEREN: <ClipboardCheck className="w-5 h-5" />,
  TESTEN: <TestTube className="w-5 h-5" />
}

const BEWERKING_KLEUREN: Record<BewerkingsType, string> = {
  ZAGEN: 'bg-red-100 text-red-700 border-red-200',
  SNIJDEN: 'bg-orange-100 text-orange-700 border-orange-200',
  FREZEN: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  BOREN: 'bg-lime-100 text-lime-700 border-lime-200',
  STRALEN: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  SLIJPEN: 'bg-blue-100 text-blue-700 border-blue-200',
  SCHOONMAKEN: 'bg-teal-100 text-teal-700 border-teal-200',
  VERVEN: 'bg-purple-100 text-purple-700 border-purple-200',
  INSPECTEREN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  TESTEN: 'bg-pink-100 text-pink-700 border-pink-200'
}

const BEWERKING_NAMEN: Record<BewerkingsType, string> = {
  ZAGEN: 'Zagen',
  SNIJDEN: 'Snijden',
  FREZEN: 'Frezen',
  BOREN: 'Boren',
  STRALEN: 'Stralen',
  SLIJPEN: 'Slijpen',
  SCHOONMAKEN: 'Schoonmaken',
  VERVEN: 'Verven',
  INSPECTEREN: 'Inspecteren',
  TESTEN: 'Testen'
}

// Kosten per uur voor elke bewerking
const BEWERKING_KOSTEN: Record<BewerkingsType, number> = {
  ZAGEN: 85,
  SNIJDEN: 120,
  FREZEN: 150,
  BOREN: 65,
  STRALEN: 95,
  SLIJPEN: 75,
  SCHOONMAKEN: 45,
  VERVEN: 55,
  INSPECTEREN: 40,
  TESTEN: 200
}

// Genereer mock bewerkingsplannen gebaseerd op gebouw elementen
function generateBewerkingsplannen(gebouwId: string): ElementBewerkingsplan[] {
  const gebouw = MOCK_GEBOUWEN.find(g => g.id === gebouwId)
  if (!gebouw) return []

  return gebouw.elementen.map((element, index) => {
    // Bepaal welke bewerkingen nodig zijn op basis van profiel
    const bewerkingen: BewerkingsType[] = []
    
    // Altijd stralen en schoonmaken
    bewerkingen.push('STRALEN', 'SCHOONMAKEN')
    
    // Zagen als lengte aangepast moet worden
    if (Math.random() > 0.3) bewerkingen.push('ZAGEN')
    
    // Frezen voor aansluitingen
    if (element.profielNaam.startsWith('HEA') || element.profielNaam.startsWith('HEB')) {
      if (Math.random() > 0.5) bewerkingen.push('FREZEN')
    }
    
    // Boren voor boutgaten
    if (Math.random() > 0.4) bewerkingen.push('BOREN')
    
    // Optioneel verven
    if (Math.random() > 0.7) bewerkingen.push('VERVEN')
    
    // Inspectie altijd
    bewerkingen.push('INSPECTEREN')
    
    // Testen indien conditie niet goed
    if (element.conditie !== 'goed') {
      bewerkingen.push('TESTEN')
    }

    // Genereer bewerking details
    const stappen = bewerkingen.map((type, volgorde): Bewerking => {
      let tijd = 0
      switch (type) {
        case 'ZAGEN': tijd = 15 + Math.random() * 20; break
        case 'SNIJDEN': tijd = 20 + Math.random() * 30; break
        case 'FREZEN': tijd = 30 + Math.random() * 45; break
        case 'BOREN': tijd = 10 + Math.random() * 15; break
        case 'STRALEN': tijd = 20 + Math.random() * 25; break
        case 'SLIJPEN': tijd = 15 + Math.random() * 20; break
        case 'SCHOONMAKEN': tijd = 10 + Math.random() * 15; break
        case 'VERVEN': tijd = 25 + Math.random() * 35; break
        case 'INSPECTEREN': tijd = 5 + Math.random() * 10; break
        case 'TESTEN': tijd = 45 + Math.random() * 60; break
        default: tijd = 15
      }

      return {
        id: `bew-${element.id}-${volgorde}`,
        type,
        beschrijving: getBewerkingBeschrijving(type, element.profielNaam),
        geschatteTijd: Math.round(tijd),
        kostenPerUur: BEWERKING_KOSTEN[type],
        volgorde,
        status: volgorde === 0 ? 'BEZIG' : 'GEPLAND'
      }
    })

    const totaalTijd = stappen.reduce((sum, s) => sum + s.geschatteTijd, 0)
    const totaalKosten = stappen.reduce((sum, s) => sum + (s.geschatteTijd / 60) * s.kostenPerUur, 0)

    // Bepaal doellengte (vaak korter dan bron)
    const doelLengte = Math.round(element.lengte * (0.7 + Math.random() * 0.3))

    // Maak element naam van id en type
    const elementNaam = `${element.type.charAt(0).toUpperCase() + element.type.slice(1)} ${element.id}`

    return {
      elementId: element.id,
      elementNaam,
      bronProfiel: element.profielNaam,
      bronLengte: element.lengte,
      doelProfiel: element.profielNaam,
      doelLengte,
      stappen: [{ id: `stap-${element.id}`, bewerkingen: stappen }],
      totaalTijd,
      totaalKosten: Math.round(totaalKosten),
      prioriteit: index < 3 ? 'HOOG' : index < 8 ? 'NORMAAL' : 'LAAG',
      status: index === 0 ? 'IN_PRODUCTIE' : index < 3 ? 'WACHTEND' : 'WACHTEND'
    }
  })
}

function getBewerkingBeschrijving(type: BewerkingsType, profiel: string): string {
  switch (type) {
    case 'ZAGEN': return `Inkorten ${profiel} naar doelmaat`
    case 'SNIJDEN': return `Plasma snijden aansluitdetails`
    case 'FREZEN': return `CNC frezen koppelplaat aansluiting`
    case 'BOREN': return `Boutgaten boren volgens patroon`
    case 'STRALEN': return `Zandstralen SA2.5 kwaliteit`
    case 'SLIJPEN': return `Oppervlakte egaliseren`
    case 'SCHOONMAKEN': return `Industriële reiniging en ontvetten`
    case 'VERVEN': return `Primer + eindcoating aanbrengen`
    case 'INSPECTEREN': return `Visuele inspectie en maatcontrole`
    case 'TESTEN': return `Materiaalsterkte test uitvoeren`
    default: return type
  }
}

// Mock matching resultaten
function generateMatchingResultaten(gebouwId: string): MatchingResultaat[] {
  const gebouw = MOCK_GEBOUWEN.find(g => g.id === gebouwId)
  if (!gebouw) return []

  const projecten = [
    'Nieuwbouw Kantoor Amstelveen',
    'Uitbreiding Magazijn Schiphol',
    'Renovatie Station Utrecht',
    'Loods Westpoort'
  ]

  return gebouw.elementen.slice(0, 8).map((element, index) => {
    const elementNaam = `${element.type.charAt(0).toUpperCase() + element.type.slice(1)} ${element.id}`
    return {
      bronElementId: element.id,
      bronElementNaam: elementNaam,
      bronProfiel: element.profielNaam,
      bronLengte: element.lengte,
      doelProject: projecten[index % projecten.length],
      doelElement: `${element.profielNaam} L=${Math.round(element.lengte * 0.85)}`,
      doelProfiel: element.profielNaam,
      doelLengte: Math.round(element.lengte * 0.85),
      matchScore: 75 + Math.floor(Math.random() * 25),
      redenering: `Profiel ${element.profielNaam} past, lengte vereist inkorten van ${Math.round(element.lengte * 0.15)}mm`,
      benodigdeBewerkingen: ['ZAGEN', 'STRALEN', 'SCHOONMAKEN', 'INSPECTEREN'] as BewerkingsType[],
      geschatteKosten: 150 + Math.round(Math.random() * 200),
      geschatteTijd: 60 + Math.round(Math.random() * 120)
    }
  })
}

export default function BewerkingsplanPage() {
  const { gebouwId } = useParams<{ gebouwId: string }>()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState<'matching' | 'bewerkingen' | 'planning'>('matching')
  const [expandedElement, setExpandedElement] = useState<string | null>(null)
  const [filterPrioriteit, setFilterPrioriteit] = useState<string>('alle')
  
  const gebouw = useMemo(() => MOCK_GEBOUWEN.find(g => g.id === gebouwId), [gebouwId])
  const bewerkingsplannen = useMemo(() => generateBewerkingsplannen(gebouwId || ''), [gebouwId])
  const matchingResultaten = useMemo(() => generateMatchingResultaten(gebouwId || ''), [gebouwId])

  if (!gebouw) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Gebouw niet gevonden</p>
        <button onClick={() => navigate('/gebouwen')} className="mt-4 text-blue-600 hover:underline">
          Terug naar gebouwen
        </button>
      </div>
    )
  }

  // Statistieken
  const totaalElementen = bewerkingsplannen.length
  const inProductie = bewerkingsplannen.filter(b => b.status === 'IN_PRODUCTIE').length
  const gereed = bewerkingsplannen.filter(b => b.status === 'GEREED').length
  const totaalUren = bewerkingsplannen.reduce((sum, b) => sum + b.totaalTijd, 0) / 60
  const totaalKosten = bewerkingsplannen.reduce((sum, b) => sum + b.totaalKosten, 0)
  const gemiddeldeMatchScore = matchingResultaten.length > 0 
    ? matchingResultaten.reduce((sum, m) => sum + m.matchScore, 0) / matchingResultaten.length 
    : 0

  // Filter bewerkingsplannen
  const gefilterdePlannen = filterPrioriteit === 'alle' 
    ? bewerkingsplannen 
    : bewerkingsplannen.filter(b => b.prioriteit === filterPrioriteit.toUpperCase())

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(`/gebouw-analyse/${gebouwId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bewerkingsplan</h1>
            <p className="text-gray-500">{gebouw.naam} - Verwerkingsfase</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            Fase: Verwerken
          </span>
          <button 
            onClick={() => navigate('/voorraad')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Truck className="w-4 h-4" />
            Naar Verkoop
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totaalElementen}</p>
              <p className="text-sm text-gray-500">Elementen</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Factory className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{inProductie}</p>
              <p className="text-sm text-gray-500">In Productie</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{gereed}</p>
              <p className="text-sm text-gray-500">Gereed</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Target className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{gemiddeldeMatchScore.toFixed(0)}%</p>
              <p className="text-sm text-gray-500">Match Score</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totaalUren.toFixed(0)}u</p>
              <p className="text-sm text-gray-500">Werk Uren</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Euro className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">€{totaalKosten.toLocaleString()}</p>
              <p className="text-sm text-gray-500">Totaal Kosten</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('matching')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'matching' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Matching
          </div>
        </button>
        <button
          onClick={() => setActiveTab('bewerkingen')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'bewerkingen' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Bewerkingen
          </div>
        </button>
        <button
          onClick={() => setActiveTab('planning')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'planning' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Planning
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'matching' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Matching Resultaten</h2>
            <p className="text-sm text-gray-500">Elementen gematcht met vraag uit projecten</p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {matchingResultaten.map((match) => (
              <div key={match.bronElementId} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Match Score */}
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-lg ${
                      match.matchScore >= 90 ? 'bg-green-100 text-green-700' :
                      match.matchScore >= 75 ? 'bg-blue-100 text-blue-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {match.matchScore}%
                    </div>
                    
                    {/* Element Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-gray-900">{match.bronElementNaam}</span>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-blue-600">{match.doelProject}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Van: {match.bronProfiel} L={match.bronLengte}mm</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>Naar: {match.doelProfiel} L={match.doelLengte}mm</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{match.redenering}</p>
                    </div>
                  </div>
                  
                  {/* Benodigde Bewerkingen */}
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {match.benodigdeBewerkingen.map((bew) => (
                        <span 
                          key={bew}
                          className={`p-1.5 rounded-lg border ${BEWERKING_KLEUREN[bew]}`}
                          title={BEWERKING_NAMEN[bew]}
                        >
                          {BEWERKING_ICONS[bew]}
                        </span>
                      ))}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">€{match.geschatteKosten}</p>
                      <p className="text-sm text-gray-500">{match.geschatteTijd} min</p>
                    </div>
                    <button className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                      Accepteer
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'bewerkingen' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Filter op prioriteit:</span>
            <select
              value={filterPrioriteit}
              onChange={(e) => setFilterPrioriteit(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="alle">Alle</option>
              <option value="hoog">Hoog</option>
              <option value="normaal">Normaal</option>
              <option value="laag">Laag</option>
            </select>
          </div>

          {/* Bewerkingsplannen */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {gefilterdePlannen.map((plan) => (
                <div key={plan.elementId}>
                  {/* Header Row */}
                  <div 
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setExpandedElement(expandedElement === plan.elementId ? null : plan.elementId)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Status Icon */}
                        <div className={`p-2 rounded-lg ${
                          plan.status === 'IN_PRODUCTIE' ? 'bg-amber-100' :
                          plan.status === 'GEREED' ? 'bg-green-100' :
                          'bg-gray-100'
                        }`}>
                          {plan.status === 'IN_PRODUCTIE' ? (
                            <Play className="w-5 h-5 text-amber-600" />
                          ) : plan.status === 'GEREED' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{plan.elementNaam}</span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              plan.prioriteit === 'HOOG' ? 'bg-red-100 text-red-700' :
                              plan.prioriteit === 'NORMAAL' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {plan.prioriteit}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {plan.bronProfiel} • {plan.bronLengte}mm → {plan.doelLengte}mm
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        {/* Bewerkingen Preview */}
                        <div className="flex gap-1">
                          {plan.stappen[0]?.bewerkingen.slice(0, 5).map((bew) => (
                            <span 
                              key={bew.id}
                              className={`p-1 rounded border ${BEWERKING_KLEUREN[bew.type]} ${
                                bew.status === 'VOLTOOID' ? 'opacity-50' : ''
                              }`}
                              title={BEWERKING_NAMEN[bew.type]}
                            >
                              {BEWERKING_ICONS[bew.type]}
                            </span>
                          ))}
                          {(plan.stappen[0]?.bewerkingen.length || 0) > 5 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{(plan.stappen[0]?.bewerkingen.length || 0) - 5}
                            </span>
                          )}
                        </div>
                        
                        {/* Time & Cost */}
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{plan.totaalTijd} min</p>
                          <p className="text-sm text-gray-500">€{plan.totaalKosten}</p>
                        </div>
                        
                        {/* Expand Icon */}
                        {expandedElement === plan.elementId ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Detail */}
                  {expandedElement === plan.elementId && (
                    <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                      <div className="pt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">Bewerkingsstappen</h4>
                        <div className="space-y-2">
                          {plan.stappen[0]?.bewerkingen.map((bewerking, index) => (
                            <div 
                              key={bewerking.id}
                              className="flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-200"
                            >
                              {/* Step Number */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                bewerking.status === 'VOLTOOID' ? 'bg-green-100 text-green-700' :
                                bewerking.status === 'BEZIG' ? 'bg-amber-100 text-amber-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {index + 1}
                              </div>
                              
                              {/* Icon */}
                              <span className={`p-2 rounded-lg border ${BEWERKING_KLEUREN[bewerking.type]}`}>
                                {BEWERKING_ICONS[bewerking.type]}
                              </span>
                              
                              {/* Details */}
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{BEWERKING_NAMEN[bewerking.type]}</p>
                                <p className="text-sm text-gray-500">{bewerking.beschrijving}</p>
                              </div>
                              
                              {/* Time & Cost */}
                              <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{bewerking.geschatteTijd} min</p>
                                <p className="text-xs text-gray-500">€{bewerking.kostenPerUur}/uur</p>
                              </div>
                              
                              {/* Status */}
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                bewerking.status === 'VOLTOOID' ? 'bg-green-100 text-green-700' :
                                bewerking.status === 'BEZIG' ? 'bg-amber-100 text-amber-700' :
                                bewerking.status === 'GEBLOKKEERD' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {bewerking.status === 'GEPLAND' ? 'Gepland' :
                                 bewerking.status === 'BEZIG' ? 'Bezig' :
                                 bewerking.status === 'VOLTOOID' ? 'Voltooid' :
                                 'Geblokkeerd'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'planning' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="text-center py-12">
            <Layers className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Productieplanning</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Hier komt de visuele productieplanning met machine-indeling, 
              Gantt-chart en capaciteitsoverzicht.
            </p>
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Planning Genereren
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
