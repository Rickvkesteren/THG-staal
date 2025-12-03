/**
 * NTA 8713 Certificeringspagina
 * Volledige pagina voor het beheren van NTA 8713 certificeringen
 */

import { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Shield, ChevronRight, Package,
  Filter, Search, Download, CheckCircle, XCircle,
  ArrowLeft, TrendingUp, Euro, Factory, ShoppingCart, ArrowRight, Wrench
} from 'lucide-react'
import type {
  HergebruikRoute,
  ConditieKlasse
} from '../types/nta8713'
import {
  HERGEBRUIK_ROUTES
} from '../types/nta8713'
import type {
  ElementInspectieData,
  NTA8713BeoordelingResultaat
} from '../utils/nta8713Logic'
import {
  voerNTA8713BeoordelingUit
} from '../utils/nta8713Logic'
import { NTA8713Certificering } from '../components/NTA8713Certificering'
import mockBuildings from '../data/mockBuildings'

// ============================================
// MOCK DATA - Elementen met inspectie data
// ============================================

function generateMockInspectieData(gebouw: typeof mockBuildings[0]): ElementInspectieData[] {
  const roestgraadOptions: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'B', 'C', 'C', 'D']
  const schadeOptions: ('geen' | 'licht' | 'matig' | 'zwaar')[] = ['geen', 'licht', 'licht', 'matig']
  
  return gebouw.elementen.map((element: typeof gebouw.elementen[0], index: number) => ({
    elementId: element.id,
    profielType: element.profielNaam,
    lengte: element.lengte,
    gewicht: element.gewicht,
    gebouwNaam: gebouw.naam,
    adres: gebouw.adres,
    bouwjaar: gebouw.bouwjaar,
    demontageDatum: new Date().toISOString().split('T')[0],
    oorspronkelijkeToepassing: element.type === 'kolom' ? 'kolom' : 'ligger',
    documentatie: {
      heeftMateriaalCertificaat: gebouw.bouwjaar > 2000,
      certificaatType: gebouw.bouwjaar > 2005 ? '3.1' : gebouw.bouwjaar > 2000 ? '2.2' : undefined,
      heeftProductietekeningen: gebouw.bouwjaar > 1995,
      staalsoortVermeld: gebouw.bouwjaar > 2000 ? 'S355' : gebouw.bouwjaar > 1990 ? 'S275' : undefined,
      chargeNummerBekend: gebouw.bouwjaar > 2005,
      ceMarkeringAanwezig: gebouw.bouwjaar > 2010
    },
    visueleInspectie: {
      roestgraad: roestgraadOptions[index % roestgraadOptions.length],
      putcorrosie: index % 8 === 0,
      putcorrosieDiepte: index % 8 === 0 ? 0.5 + (index % 3) * 0.5 : 0,
      vervormingen: index % 12 === 0,
      vervormingsType: index % 12 === 0 ? 'Lichte buiging' : '',
      schade: schadeOptions[index % schadeOptions.length],
      lassenAanwezig: index % 2 === 0,
      lassenConditie: index % 6 === 0 ? 'matig' : 'goed',
      coatingAanwezig: true,
      coatingConditie: index % 4 === 0 ? 'beschadigd' : 'intact'
    },
    afmetingen: {
      hoogte: 400,
      breedte: 200,
      flensDikte: 16,
      lijfDikte: 10,
      tolerantieOK: index % 15 !== 0
    }
  }))
}

// ============================================
// MAIN PAGE
// ============================================

export default function NTA8713Page() {
  const { gebouwId } = useParams<{ gebouwId: string }>()
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [filterRoute, setFilterRoute] = useState<HergebruikRoute | 'ALLE'>('ALLE')
  const [filterConditie, setFilterConditie] = useState<ConditieKlasse | 'ALLE'>('ALLE')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Get building data
  const gebouw = mockBuildings.find((b: typeof mockBuildings[0]) => b.id === gebouwId) || mockBuildings[0]
  
  // Generate mock inspection data and run assessments
  const elementenData = useMemo(() => {
    const inspectieData = generateMockInspectieData(gebouw)
    return inspectieData.map(data => ({
      data,
      beoordeling: voerNTA8713BeoordelingUit(data)
    }))
  }, [gebouw])
  
  // Filter elements
  const gefilterdElementen = useMemo(() => {
    return elementenData.filter(e => {
      if (filterRoute !== 'ALLE' && e.beoordeling.route !== filterRoute) return false
      if (filterConditie !== 'ALLE' && e.beoordeling.conditieKlasse !== filterConditie) return false
      if (searchQuery && !e.data.elementId.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !e.data.profielType.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [elementenData, filterRoute, filterConditie, searchQuery])
  
  // Statistics
  const statistieken = useMemo(() => {
    const certificeerbaar = elementenData.filter(e => e.beoordeling.certificeerbaar).length
    const routeA = elementenData.filter(e => e.beoordeling.route === 'ROUTE_A').length
    const routeB = elementenData.filter(e => e.beoordeling.route === 'ROUTE_B').length
    const routeC = elementenData.filter(e => e.beoordeling.route === 'ROUTE_C').length
    const totaalWaarde = elementenData.reduce((sum, e) => sum + e.beoordeling.geschatteVerkoopwaarde, 0)
    const totaalKosten = elementenData.reduce((sum, e) => sum + e.beoordeling.certificeringsKosten, 0)
    const totaalGewicht = elementenData.reduce((sum, e) => sum + e.data.gewicht, 0)
    
    return {
      totaal: elementenData.length,
      certificeerbaar,
      nietCertificeerbaar: elementenData.length - certificeerbaar,
      routeA,
      routeB,
      routeC,
      totaalWaarde,
      totaalKosten,
      nettoWaarde: totaalWaarde - totaalKosten,
      totaalGewicht
    }
  }, [elementenData])
  
  // Selected element data
  const selectedElementData = selectedElement 
    ? elementenData.find(e => e.data.elementId === selectedElement)
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            to={`/gebouw-analyse/${gebouw.id}`}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-xl">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">NTA 8713 Certificering</h1>
              <p className="text-sm text-gray-600">{gebouw.naam} - {gebouw.adres}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Exporteer Rapport
          </button>
        </div>
      </div>
      
      {/* Info banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-900">NTA 8713: Nederlandse Technische Afspraak voor Hergebruik Staalconstructies</p>
            <p className="text-sm text-blue-700 mt-1">
              Gebaseerd op EN 1090-2 (uitvoering staalconstructies) en EN 10025 (staalsoorten). 
              Bepaalt de route, testen en eisen voor hercertificering van stalen constructie-elementen.
            </p>
          </div>
        </div>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          titel="Totaal Elementen"
          waarde={statistieken.totaal}
          icon={Package}
          kleur="blue"
          subWaarde={`${statistieken.totaalGewicht.toLocaleString('nl-NL')} kg`}
        />
        <StatCard
          titel="Certificeerbaar"
          waarde={statistieken.certificeerbaar}
          icon={CheckCircle}
          kleur="green"
          subWaarde={`${Math.round(statistieken.certificeerbaar / statistieken.totaal * 100)}%`}
        />
        <StatCard
          titel="Niet Certificeerbaar"
          waarde={statistieken.nietCertificeerbaar}
          icon={XCircle}
          kleur="red"
          subWaarde="Conditie D"
        />
        <StatCard
          titel="Geschatte Waarde"
          waarde={`€${(statistieken.totaalWaarde / 1000).toFixed(0)}k`}
          icon={TrendingUp}
          kleur="emerald"
          subWaarde="Na certificering"
        />
        <StatCard
          titel="Certificeringskosten"
          waarde={`€${(statistieken.totaalKosten / 1000).toFixed(0)}k`}
          icon={Euro}
          kleur="orange"
          subWaarde={`Netto: €${(statistieken.nettoWaarde / 1000).toFixed(0)}k`}
        />
      </div>
      
      {/* Route distribution */}
      <div className="grid grid-cols-3 gap-4">
        <RouteCard 
          route="ROUTE_A" 
          aantal={statistieken.routeA} 
          totaal={statistieken.totaal}
          onClick={() => setFilterRoute(filterRoute === 'ROUTE_A' ? 'ALLE' : 'ROUTE_A')}
          actief={filterRoute === 'ROUTE_A'}
        />
        <RouteCard 
          route="ROUTE_B" 
          aantal={statistieken.routeB} 
          totaal={statistieken.totaal}
          onClick={() => setFilterRoute(filterRoute === 'ROUTE_B' ? 'ALLE' : 'ROUTE_B')}
          actief={filterRoute === 'ROUTE_B'}
        />
        <RouteCard 
          route="ROUTE_C" 
          aantal={statistieken.routeC} 
          totaal={statistieken.totaal}
          onClick={() => setFilterRoute(filterRoute === 'ROUTE_C' ? 'ALLE' : 'ROUTE_C')}
          actief={filterRoute === 'ROUTE_C'}
        />
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek op element ID of profieltype..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters || filterRoute !== 'ALLE' || filterConditie !== 'ALLE'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {(filterRoute !== 'ALLE' || filterConditie !== 'ALLE') && (
            <span className="px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {(filterRoute !== 'ALLE' ? 1 : 0) + (filterConditie !== 'ALLE' ? 1 : 0)}
            </span>
          )}
        </button>
      </div>
      
      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-xl flex items-center gap-6">
          <div>
            <label className="text-sm font-medium text-gray-600">Conditie klasse</label>
            <div className="flex gap-2 mt-2">
              {(['ALLE', 'A', 'B', 'C', 'D'] as (ConditieKlasse | 'ALLE')[]).map(c => (
                <button
                  key={c}
                  onClick={() => setFilterConditie(c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    filterConditie === c
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border hover:bg-gray-100'
                  }`}
                >
                  {c === 'ALLE' ? 'Alle' : `Klasse ${c}`}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => { setFilterRoute('ALLE'); setFilterConditie('ALLE') }}
            className="ml-auto text-sm text-gray-600 hover:text-gray-900"
          >
            Reset filters
          </button>
        </div>
      )}
      
      {/* Results count */}
      <p className="text-sm text-gray-600">
        {gefilterdElementen.length} van {elementenData.length} elementen
      </p>
      
      {/* Main content */}
      <div className="flex gap-6">
        {/* Element list */}
        <div className="flex-1 space-y-3">
          {gefilterdElementen.map(({ data, beoordeling }) => (
            <ElementCard
              key={data.elementId}
              data={data}
              beoordeling={beoordeling}
              selected={selectedElement === data.elementId}
              onClick={() => setSelectedElement(
                selectedElement === data.elementId ? null : data.elementId
              )}
            />
          ))}
        </div>
        
        {/* Detail panel */}
        {selectedElementData && (
          <div className="w-[600px] sticky top-6 self-start">
            <NTA8713Certificering
              element={{
                id: selectedElementData.data.elementId,
                profielType: selectedElementData.data.profielType,
                lengte: selectedElementData.data.lengte,
                gewicht: selectedElementData.data.gewicht
              }}
              gebouw={{
                naam: gebouw.naam,
                adres: gebouw.adres,
                bouwjaar: gebouw.bouwjaar
              }}
              onComplete={(result) => {
                console.log('Certificering compleet:', result)
              }}
            />
          </div>
        )}
      </div>
      
      {/* Flow naar volgende stappen */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Volgende Stappen</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to={`/bewerkingsplan/${gebouw.id}`}
            className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-6 h-6 text-amber-600" />
              <span className="font-bold text-gray-900">Bewerkingsplan</span>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Plan de noodzakelijke bewerkingen</p>
          </Link>
          
          <Link
            to="/productie-3d"
            className="p-4 bg-orange-50 border-2 border-orange-200 rounded-xl hover:bg-orange-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Factory className="w-6 h-6 text-orange-600" />
              <span className="font-bold text-gray-900">Productie 3D</span>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">3D visualisatie van bewerkingen</p>
          </Link>
          
          <Link
            to="/shop"
            className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
              <span className="font-bold text-gray-900">Webshop</span>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Publiceer gecertificeerde elementen</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ============================================
// SUB COMPONENTS
// ============================================

interface StatCardProps {
  titel: string
  waarde: string | number
  icon: React.ComponentType<{ className?: string }>
  kleur: 'blue' | 'green' | 'red' | 'emerald' | 'orange'
  subWaarde?: string
}

function StatCard({ titel, waarde, icon: Icon, kleur, subWaarde }: StatCardProps) {
  const kleuren = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600'
  }
  
  return (
    <div className={`p-4 rounded-xl border ${kleuren[kleur]}`}>
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 opacity-80" />
        {subWaarde && <span className="text-xs opacity-70">{subWaarde}</span>}
      </div>
      <p className="text-2xl font-bold mt-2">{waarde}</p>
      <p className="text-sm opacity-70">{titel}</p>
    </div>
  )
}

interface RouteCardProps {
  route: HergebruikRoute
  aantal: number
  totaal: number
  onClick: () => void
  actief: boolean
}

function RouteCard({ route, aantal, totaal, onClick, actief }: RouteCardProps) {
  const info = HERGEBRUIK_ROUTES[route]
  const percentage = Math.round(aantal / totaal * 100)
  
  const kleuren = {
    ROUTE_A: 'border-green-500 bg-green-50',
    ROUTE_B: 'border-yellow-500 bg-yellow-50',
    ROUTE_C: 'border-orange-500 bg-orange-50'
  }
  
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        actief ? kleuren[route] : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`px-2 py-1 rounded text-xs font-bold ${
          route === 'ROUTE_A' ? 'bg-green-200 text-green-700' :
          route === 'ROUTE_B' ? 'bg-yellow-200 text-yellow-700' :
          'bg-orange-200 text-orange-700'
        }`}>
          {route.replace('_', ' ')}
        </span>
        <span className="font-bold text-lg">{aantal}</span>
      </div>
      <p className="font-medium text-sm">{info.naam.split(' - ')[1]}</p>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${
              route === 'ROUTE_A' ? 'bg-green-500' :
              route === 'ROUTE_B' ? 'bg-yellow-500' :
              'bg-orange-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-gray-500">{percentage}%</span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{info.kostenIndicatie} kosten • {info.doorlooptijd}</p>
    </button>
  )
}

interface ElementCardProps {
  data: ElementInspectieData
  beoordeling: NTA8713BeoordelingResultaat
  selected: boolean
  onClick: () => void
}

function ElementCard({ data, beoordeling, selected, onClick }: ElementCardProps) {
  // Unused but kept for potential future use
  // const conditieInfo = CONDITIE_KLASSEN[beoordeling.conditieKlasse]
  
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
        selected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div className={`p-2 rounded-lg ${
          beoordeling.certificeerbaar ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {beoordeling.certificeerbaar 
            ? <CheckCircle className="w-5 h-5 text-green-600" />
            : <XCircle className="w-5 h-5 text-red-600" />
          }
        </div>
        
        {/* Element info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{data.elementId}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-600">{data.profielType}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>{data.lengte} mm</span>
            <span>{data.gewicht} kg</span>
          </div>
        </div>
        
        {/* Route badge */}
        <div className={`px-2 py-1 rounded text-xs font-bold ${
          beoordeling.route === 'ROUTE_A' ? 'bg-green-100 text-green-700' :
          beoordeling.route === 'ROUTE_B' ? 'bg-yellow-100 text-yellow-700' :
          'bg-orange-100 text-orange-700'
        }`}>
          {beoordeling.route.replace('_', ' ')}
        </div>
        
        {/* Conditie badge */}
        <div className={`px-2 py-1 rounded text-xs font-bold ${
          beoordeling.conditieKlasse === 'A' ? 'bg-green-100 text-green-700' :
          beoordeling.conditieKlasse === 'B' ? 'bg-blue-100 text-blue-700' :
          beoordeling.conditieKlasse === 'C' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {beoordeling.conditieKlasse}
        </div>
        
        {/* EXC badge */}
        <div className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-700">
          {beoordeling.maximaleUitvoeringsKlasse}
        </div>
        
        {/* Value */}
        <div className="text-right">
          <p className="font-semibold text-green-600">€{beoordeling.geschatteVerkoopwaarde}</p>
          <p className="text-xs text-gray-500">-€{beoordeling.certificeringsKosten} kosten</p>
        </div>
        
        <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${
          selected ? 'rotate-90' : ''
        }`} />
      </div>
    </button>
  )
}
