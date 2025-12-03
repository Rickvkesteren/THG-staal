/**
 * Flow Navigation Component
 * Toont de huidige positie in de flow en navigeert naar vorige/volgende stappen
 */

import { Link } from 'react-router-dom'
import { 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  Scissors, 
  Wrench, 
  Layers, 
  ShoppingCart,
  FileCheck,
  Home,
  CheckCircle2
} from 'lucide-react'

// Flow stappen definitie
export const FLOW_STAPPEN = [
  {
    id: 'gebouwen',
    fase: 1,
    naam: 'Gebouw Selectie',
    beschrijving: 'Kies gebouw voor demontage',
    icon: Building2,
    kleur: '#22c55e',
    routes: ['/gebouwen', '/gebouw-3d'],
    subStappen: ['Gebouwenoverzicht', '3D Visualisatie']
  },
  {
    id: 'oogst',
    fase: 1,
    naam: 'Oogsten',
    beschrijving: 'Demontage & oogst planning',
    icon: Scissors,
    kleur: '#22c55e',
    routes: ['/oogst-planning', '/oogst-3d'],
    subStappen: ['Planning', '3D Demontage']
  },
  {
    id: 'certificering',
    fase: 1,
    naam: 'Certificering',
    beschrijving: 'Herkomst documentatie',
    icon: FileCheck,
    kleur: '#22c55e',
    routes: ['/certificering'],
    subStappen: ['Certificaten']
  },
  {
    id: 'voorraad',
    fase: 2,
    naam: 'Voorraad',
    beschrijving: 'Geoogst materiaal beheer',
    icon: Building2,
    kleur: '#f59e0b',
    routes: ['/voorraad'],
    subStappen: ['Voorraad beheer']
  },
  {
    id: 'schoonmaak',
    fase: 2,
    naam: 'Schoonmaak',
    beschrijving: 'Reiniging & bewerking',
    icon: Wrench,
    kleur: '#f59e0b',
    routes: ['/schoonmaak', '/productie-3d'],
    subStappen: ['Schoonmaak', '3D Productie']
  },
  {
    id: 'matching',
    fase: 2,
    naam: 'Matching',
    beschrijving: 'Koppelen standaard profielen',
    icon: Layers,
    kleur: '#f59e0b',
    routes: ['/matching', '/matching-3d'],
    subStappen: ['Matching', '3D Vergelijking']
  },
  {
    id: 'verkoop',
    fase: 3,
    naam: 'Verkoop',
    beschrijving: 'Webshop & bestellingen',
    icon: ShoppingCart,
    kleur: '#8b5cf6',
    routes: ['/shop'],
    subStappen: ['Webshop']
  }
]

// Bepaal huidige stap op basis van route
export function getHuidigeStap(pathname: string) {
  const index = FLOW_STAPPEN.findIndex(stap => 
    stap.routes.some(route => pathname.startsWith(route))
  )
  return index >= 0 ? index : -1
}

// Bepaal fase op basis van route
export function getHuidigeFase(pathname: string): 1 | 2 | 3 | null {
  const stap = FLOW_STAPPEN.find(s => s.routes.some(r => pathname.startsWith(r)))
  return stap?.fase as 1 | 2 | 3 | null
}

interface FlowNavigationProps {
  huidigeRoute: string
  gebouwNaam?: string
  elementId?: string
}

export default function FlowNavigation({ 
  huidigeRoute, 
  gebouwNaam,
  elementId
}: FlowNavigationProps) {
  const huidigeIndex = getHuidigeStap(huidigeRoute)
  const huidigeStap = huidigeIndex >= 0 ? FLOW_STAPPEN[huidigeIndex] : null
  const vorigeStap = huidigeIndex > 0 ? FLOW_STAPPEN[huidigeIndex - 1] : null
  const volgendeStap = huidigeIndex < FLOW_STAPPEN.length - 1 ? FLOW_STAPPEN[huidigeIndex + 1] : null
  
  const fase = huidigeStap?.fase || 1
  const faseNamen = { 1: 'Oogsten', 2: 'Verwerken', 3: 'Verkopen' }
  const faseKleuren = { 1: '#22c55e', 2: '#f59e0b', 3: '#8b5cf6' }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3 mb-4 rounded-t-xl shadow-sm">
      <div className="flex items-center justify-between">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <Link to="/flow" className="text-gray-500 hover:text-gray-700 flex items-center gap-1">
            <Home className="w-4 h-4" />
            Flow
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span 
            className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: faseKleuren[fase as keyof typeof faseKleuren] }}
          >
            Fase {fase}: {faseNamen[fase as keyof typeof faseNamen]}
          </span>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-900">
            {huidigeStap?.naam || 'Onbekend'}
          </span>
          {gebouwNaam && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{gebouwNaam}</span>
            </>
          )}
          {elementId && (
            <>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500 font-mono text-xs">{elementId}</span>
            </>
          )}
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          {vorigeStap && (
            <Link
              to={vorigeStap.routes[0]}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{vorigeStap.naam}</span>
            </Link>
          )}
          
          {volgendeStap && (
            <Link
              to={volgendeStap.routes[0]}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white rounded-lg transition-colors"
              style={{ backgroundColor: volgendeStap.kleur }}
            >
              <span className="hidden sm:inline">Volgende: {volgendeStap.naam}</span>
              <span className="sm:hidden">Volgende</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
        {FLOW_STAPPEN.map((stap, index) => {
          const isActief = index === huidigeIndex
          const isVoltooid = index < huidigeIndex
          const Icon = stap.icon
          
          return (
            <Link
              key={stap.id}
              to={stap.routes[0]}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                isActief 
                  ? 'bg-gray-900 text-white shadow-lg' 
                  : isVoltooid
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
            >
              {isVoltooid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Icon className="w-3.5 h-3.5" style={{ color: isActief ? 'white' : stap.kleur }} />
              )}
              <span>{stap.naam}</span>
              {index < FLOW_STAPPEN.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-300 ml-1" />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// Compact versie voor in de header
export function FlowBreadcrumb({ huidigeRoute }: { huidigeRoute: string }) {
  const huidigeIndex = getHuidigeStap(huidigeRoute)
  const huidigeStap = huidigeIndex >= 0 ? FLOW_STAPPEN[huidigeIndex] : null
  
  if (!huidigeStap) return null
  
  const Icon = huidigeStap.icon
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <div 
        className="w-6 h-6 rounded flex items-center justify-center"
        style={{ backgroundColor: `${huidigeStap.kleur}20` }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: huidigeStap.kleur }} />
      </div>
      <span className="font-medium text-gray-700">{huidigeStap.naam}</span>
      <span className="text-gray-400">•</span>
      <span className="text-gray-500">Fase {huidigeStap.fase}</span>
    </div>
  )
}
