/**
 * Flow Acties Component
 * Floating action button met snelle acties voor de huidige context
 */

import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  Plus,
  X,
  Building2,
  Scissors,
  Factory,
  ShoppingCart,
  FileCheck,
  Layers,
  Calculator,
  Truck,
  ArrowRight,
  Wrench,
  Package,
  Cpu,
  Workflow,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap
} from 'lucide-react'

interface FlowActie {
  label: string
  beschrijving: string
  icon: any
  to: string
  kleur: string
  disabled?: boolean
}

// Context-afhankelijke acties
function getActiesVoorPagina(pathname: string, params: Record<string, string | undefined>): FlowActie[] {
  const gebouwId = params.gebouwId || 'industriehal-001'
  
  // Gebouwen pagina
  if (pathname === '/gebouwen') {
    return [
      { label: 'Analyseer Gebouw', beschrijving: 'Start constructie analyse', icon: Calculator, to: `/constructie-analyse/${gebouwId}`, kleur: 'bg-green-500' },
      { label: 'Bekijk in 3D', beschrijving: 'Visualiseer constructie', icon: Layers, to: `/gebouw-3d/${gebouwId}`, kleur: 'bg-blue-500' },
      { label: 'Import CAD', beschrijving: 'Upload nieuw gebouw', icon: Plus, to: '/cad-import', kleur: 'bg-purple-500' },
    ]
  }
  
  // Constructie Analyse
  if (pathname.startsWith('/constructie-analyse')) {
    return [
      { label: 'NTA 8713 Certificering', beschrijving: 'Europese certificering', icon: FileCheck, to: `/nta8713/${gebouwId}`, kleur: 'bg-blue-500' },
      { label: 'Start Demontage', beschrijving: 'Operator interface', icon: Scissors, to: `/operator-demontage/${gebouwId}`, kleur: 'bg-green-500' },
      { label: 'Oogst Volgorde', beschrijving: 'AI planning', icon: Cpu, to: `/oogst-analyse/${gebouwId}`, kleur: 'bg-purple-500' },
      { label: '3D Viewer', beschrijving: 'Bekijk constructie', icon: Layers, to: `/gebouw-3d/${gebouwId}`, kleur: 'bg-gray-500' },
    ]
  }
  
  // NTA 8713
  if (pathname.startsWith('/nta8713')) {
    return [
      { label: 'Bewerkingsplan', beschrijving: 'Plan fabricage', icon: Wrench, to: `/bewerkingsplan/${gebouwId}`, kleur: 'bg-amber-500' },
      { label: 'Terug naar Analyse', beschrijving: 'Constructie details', icon: Calculator, to: `/constructie-analyse/${gebouwId}`, kleur: 'bg-green-500' },
    ]
  }
  
  // Oogst Planning
  if (pathname.startsWith('/oogst-planning') || pathname.startsWith('/oogst-analyse')) {
    return [
      { label: 'Operator Modus', beschrijving: 'Start demontage', icon: Scissors, to: `/operator-demontage/${gebouwId}`, kleur: 'bg-green-500' },
      { label: 'Productie Stroom', beschrijving: 'Bekijk faciliteit', icon: Workflow, to: '/productie-stroom', kleur: 'bg-amber-500' },
    ]
  }
  
  // Operator Demontage
  if (pathname.startsWith('/operator-demontage')) {
    return [
      { label: 'Naar Voorraad', beschrijving: 'Bekijk gedemonteerd', icon: Package, to: '/voorraad', kleur: 'bg-amber-500' },
      { label: 'Productie 3D', beschrijving: 'Tracking faciliteit', icon: Factory, to: '/productie-3d', kleur: 'bg-blue-500' },
    ]
  }
  
  // Voorraad
  if (pathname === '/voorraad') {
    return [
      { label: 'Bewerkingsplan', beschrijving: 'Start bewerking', icon: Wrench, to: `/bewerkingsplan/${gebouwId}`, kleur: 'bg-amber-500' },
      { label: 'Matching', beschrijving: 'Koppel aan projecten', icon: Package, to: '/matching-3d', kleur: 'bg-blue-500' },
      { label: 'Naar Webshop', beschrijving: 'Publiceer items', icon: ShoppingCart, to: '/shop', kleur: 'bg-purple-500' },
    ]
  }
  
  // Bewerkingsplan
  if (pathname.startsWith('/bewerkingsplan')) {
    return [
      { label: 'Productie 3D', beschrijving: 'Start productie', icon: Factory, to: '/productie-3d', kleur: 'bg-blue-500' },
      { label: 'Productie Stroom', beschrijving: 'Faciliteit overzicht', icon: Workflow, to: '/productie-stroom', kleur: 'bg-amber-500' },
    ]
  }
  
  // Productie
  if (pathname.startsWith('/productie')) {
    return [
      { label: 'Voorraad Check', beschrijving: 'Bekijk stock', icon: Package, to: '/voorraad', kleur: 'bg-green-500' },
      { label: 'Matching 3D', beschrijving: 'Koppel projecten', icon: Layers, to: '/matching-3d', kleur: 'bg-blue-500' },
      { label: 'Naar Webshop', beschrijving: 'Publiceer items', icon: ShoppingCart, to: '/shop', kleur: 'bg-purple-500' },
    ]
  }
  
  // Shop
  if (pathname === '/shop') {
    return [
      { label: 'Leveringen', beschrijving: 'Verzend orders', icon: Truck, to: '/leveringen', kleur: 'bg-green-500' },
      { label: 'Certificering', beschrijving: 'Download certificaten', icon: FileCheck, to: '/certificering', kleur: 'bg-blue-500' },
    ]
  }
  
  // Default acties
  return [
    { label: 'Gebouwen', beschrijving: 'Bekijk projecten', icon: Building2, to: '/gebouwen', kleur: 'bg-green-500' },
    { label: 'Voorraad', beschrijving: 'Bekijk stock', icon: Package, to: '/voorraad', kleur: 'bg-amber-500' },
    { label: 'Webshop', beschrijving: 'Ga naar shop', icon: ShoppingCart, to: '/shop', kleur: 'bg-purple-500' },
  ]
}

// Flow stappen voor voortgang indicator
const FLOW_STAPPEN = [
  { fase: 1, stap: 1, naam: 'Gebouw Selectie', pad: '/gebouwen' },
  { fase: 1, stap: 2, naam: 'Constructie Analyse', pad: '/constructie-analyse' },
  { fase: 1, stap: 3, naam: 'NTA 8713', pad: '/nta8713' },
  { fase: 1, stap: 4, naam: 'Demontage', pad: '/operator-demontage' },
  { fase: 2, stap: 5, naam: 'Voorraad', pad: '/voorraad' },
  { fase: 2, stap: 6, naam: 'Bewerking', pad: '/bewerkingsplan' },
  { fase: 2, stap: 7, naam: 'Productie', pad: '/productie' },
  { fase: 3, stap: 8, naam: 'Webshop', pad: '/shop' },
  { fase: 3, stap: 9, naam: 'Levering', pad: '/leveringen' },
]

export default function FlowActies() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const params = useParams()
  
  const acties = getActiesVoorPagina(location.pathname, params)
  
  // Bepaal huidige stap
  const huidigeStap = FLOW_STAPPEN.findIndex(s => location.pathname.startsWith(s.pad)) + 1 || 0
  
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Acties Menu */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Acties lijst */}
        {isOpen && (
          <div className="absolute bottom-16 right-0 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-2">
            {/* Header met voortgang */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 text-white">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Flow Voortgang</span>
                <span className="text-xs px-2 py-0.5 bg-white/20 rounded-full">
                  Stap {huidigeStap}/{FLOW_STAPPEN.length}
                </span>
              </div>
              <div className="flex gap-0.5">
                {FLOW_STAPPEN.map((stap, idx) => (
                  <div 
                    key={stap.stap}
                    className={`flex-1 h-1.5 rounded-full ${
                      idx < huidigeStap 
                        ? stap.fase === 1 ? 'bg-green-500' : stap.fase === 2 ? 'bg-amber-500' : 'bg-purple-500'
                        : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Acties */}
            <div className="p-2">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium px-2 py-1">
                Volgende Stappen
              </p>
              {acties.map((actie, idx) => (
                <Link
                  key={idx}
                  to={actie.to}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group ${
                    actie.disabled ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <div className={`w-10 h-10 ${actie.kleur} rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <actie.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{actie.label}</p>
                    <p className="text-xs text-gray-500">{actie.beschrijving}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              ))}
            </div>
            
            {/* Quick stats */}
            <div className="border-t border-gray-100 p-3 bg-gray-50">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-green-600">12</p>
                  <p className="text-xs text-gray-500">Voltooid</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">3</p>
                  <p className="text-xs text-gray-500">In bewerking</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-600">5</p>
                  <p className="text-xs text-gray-500">Gepland</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* FAB Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isOpen 
              ? 'bg-gray-800 rotate-45' 
              : 'bg-gradient-to-r from-green-500 via-amber-500 to-purple-500 hover:shadow-xl hover:scale-105'
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Zap className="w-6 h-6 text-white" />
          )}
        </button>
        
        {/* Pulse indicator als er acties zijn */}
        {!isOpen && acties.length > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold animate-pulse">
            {acties.length}
          </span>
        )}
      </div>
    </>
  )
}
