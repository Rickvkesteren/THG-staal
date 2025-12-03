/**
 * Gebouw Analyse Pagina - Business Case Generator
 * Volledige analyse van kosten, opbrengsten en winstgevendheid
 */

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calculator,
  FileCheck,
  Scissors,
  Factory,
  ShoppingCart,
  ChevronDown,
  Package,
  ArrowRight,
  Info,
  TestTube,
  Award,
  Truck
} from 'lucide-react'
import { MOCK_GEBOUWEN } from '../data/mockBuildings'
import { 
  genereerBusinessCase, 
  genereerSnijPlan,
  berekenProductWaarde,
  genereerCertificaat
} from '../utils/businessLogic'
import type { ElementTypeAnalyse } from '../types/business'

// Kleuren
const FASE_KLEUREN = {
  oogsten: 'bg-green-500',
  verwerken: 'bg-amber-500', 
  verkopen: 'bg-purple-500'
}

export default function GebouwAnalysePage() {
  const { gebouwId } = useParams<{ gebouwId: string }>()
  const navigate = useNavigate()
  
  const [aankoopPrijs, setAankoopPrijs] = useState<number>(25000)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  
  // Vind gebouw
  const gebouw = useMemo(() => {
    return MOCK_GEBOUWEN.find(g => g.id === gebouwId) || MOCK_GEBOUWEN[0]
  }, [gebouwId])
  
  // Genereer business case
  const businessCase = useMemo(() => {
    return genereerBusinessCase(gebouw, aankoopPrijs)
  }, [gebouw, aankoopPrijs])
  
  // Element details voor popup
  const selectedElementData = useMemo(() => {
    if (!selectedElement) return null
    const element = gebouw.elementen.find(e => e.id === selectedElement)
    if (!element) return null
    
    return {
      element,
      snijplan: genereerSnijPlan(element),
      certificaat: genereerCertificaat(element),
      waarde: berekenProductWaarde(element)
    }
  }, [selectedElement, gebouw])
  
  const toggleGroup = (key: string) => {
    const newSet = new Set(expandedGroups)
    if (newSet.has(key)) {
      newSet.delete(key)
    } else {
      newSet.add(key)
    }
    setExpandedGroups(newSet)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Case Analyse</h1>
              <p className="text-gray-500">{gebouw.naam} - {gebouw.adres}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                  {businessCase.totaalElementen} elementen
                </span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                  {(businessCase.totaalGewicht / 1000).toFixed(1)} ton
                </span>
                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                  Bouwjaar {gebouw.bouwjaar}
                </span>
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <label className="block text-sm text-gray-500 mb-1">Aankoopprijs gebouw/staal</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">€</span>
              <input
                type="number"
                value={aankoopPrijs}
                onChange={(e) => setAankoopPrijs(Number(e.target.value))}
                className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-right font-mono text-lg"
                step={1000}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Aanbeveling Banner */}
      <div className={`rounded-2xl p-6 ${
        businessCase.aanbeveling === 'aankopen' 
          ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
          : businessCase.aanbeveling === 'onderhandelen'
            ? 'bg-gradient-to-r from-amber-500 to-orange-600'
            : 'bg-gradient-to-r from-red-500 to-rose-600'
      } text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {businessCase.aanbeveling === 'aankopen' ? (
              <CheckCircle className="w-12 h-12" />
            ) : businessCase.aanbeveling === 'onderhandelen' ? (
              <AlertTriangle className="w-12 h-12" />
            ) : (
              <XCircle className="w-12 h-12" />
            )}
            <div>
              <h2 className="text-2xl font-bold uppercase">
                {businessCase.aanbeveling === 'aankopen' 
                  ? '✓ Aankopen Aanbevolen' 
                  : businessCase.aanbeveling === 'onderhandelen'
                    ? '⚠ Onderhandelen Nodig'
                    : '✕ Niet Rendabel'}
              </h2>
              <p className="text-white/80">
                {businessCase.aanbeveling === 'aankopen' 
                  ? `Goede deal met ${businessCase.margePercentage}% marge` 
                  : businessCase.aanbeveling === 'onderhandelen'
                    ? `Marge te laag (${businessCase.margePercentage}%), maximaal €${businessCase.maxAankoopPrijs.toLocaleString()} bieden`
                    : `Kosten hoger dan opbrengsten, €${(-businessCase.brutomarge).toLocaleString()} verlies`}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-white/80 text-sm">Geschatte Brutomarge</p>
            <p className="text-4xl font-bold">
              €{businessCase.brutomarge.toLocaleString()}
            </p>
            <p className="text-lg text-white/80">{businessCase.margePercentage}%</p>
          </div>
        </div>
      </div>
      
      {/* Financieel Overzicht */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kosten */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-red-500 to-rose-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Kosten Breakdown
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <KostenRij 
              label="Aankoopprijs" 
              bedrag={businessCase.kosten.aankoop} 
              icon={<Building2 className="w-4 h-4" />}
              kleur="text-blue-600"
            />
            <KostenRij 
              label="Ontmanteling & Snijden" 
              bedrag={businessCase.kosten.ontmanteling.totaalOogstKosten} 
              icon={<Scissors className="w-4 h-4" />}
              kleur="text-green-600"
              fase="oogsten"
            />
            <KostenRij 
              label="Transport" 
              bedrag={businessCase.kosten.transport} 
              icon={<Truck className="w-4 h-4" />}
              kleur="text-gray-600"
            />
            <KostenRij 
              label="Fabrieksbewerking" 
              bedrag={businessCase.kosten.fabrieksBewerking} 
              icon={<Factory className="w-4 h-4" />}
              kleur="text-amber-600"
              fase="verwerken"
            />
            <KostenRij 
              label="Overhead (10%)" 
              bedrag={businessCase.kosten.overhead} 
              icon={<Calculator className="w-4 h-4" />}
              kleur="text-gray-400"
            />
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-gray-900">Totaal Kosten</span>
                <span className="text-red-600">€{businessCase.kosten.totaal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Opbrengsten */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Opbrengsten Breakdown
            </h3>
          </div>
          <div className="p-4 space-y-3">
            <KostenRij 
              label="Directe Verkoop (30%)" 
              bedrag={businessCase.opbrengsten.directeVerkoop} 
              icon={<ShoppingCart className="w-4 h-4" />}
              kleur="text-purple-600"
              fase="verkopen"
              positief
            />
            <KostenRij 
              label="Bewerkt & Verkocht (60%)" 
              bedrag={businessCase.opbrengsten.bewerktVerkoop} 
              icon={<Factory className="w-4 h-4" />}
              kleur="text-amber-600"
              positief
            />
            <KostenRij 
              label="Schrootwaarde (10%)" 
              bedrag={businessCase.opbrengsten.schrootWaarde} 
              icon={<Package className="w-4 h-4" />}
              kleur="text-gray-400"
              positief
            />
            <div className="border-t pt-3 mt-3">
              <div className="flex justify-between items-center font-bold text-lg">
                <span className="text-gray-900">Totaal Opbrengsten</span>
                <span className="text-green-600">€{businessCase.opbrengsten.totaal.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Risico's */}
      {businessCase.risicos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5" />
            Risico Analyse
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessCase.risicos.map((risico, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border border-amber-200">
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    risico.impact === 'hoog' ? 'bg-red-500' : 
                    risico.impact === 'midden' ? 'bg-amber-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{risico.type}</p>
                    <p className="text-sm text-gray-600">{risico.beschrijving}</p>
                    {risico.mitigatie && (
                      <p className="text-sm text-amber-700 mt-1">
                        <Info className="w-3 h-3 inline mr-1" />
                        {risico.mitigatie}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Element Type Analyse */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Element Analyse per Type
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Klik op een groep voor details over certificering, conditie en snijplan
          </p>
        </div>
        
        <div className="divide-y divide-gray-100">
          {businessCase.elementAnalyse.map((groep) => (
            <ElementGroepRij 
              key={`${groep.type}-${groep.profiel}`}
              groep={groep}
              expanded={expandedGroups.has(`${groep.type}-${groep.profiel}`)}
              onToggle={() => toggleGroup(`${groep.type}-${groep.profiel}`)}
              gebouw={gebouw}
              onSelectElement={setSelectedElement}
            />
          ))}
        </div>
        
        {/* Totalen */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-500">Totaal Elementen</p>
              <p className="text-xl font-bold text-gray-900">{businessCase.totaalElementen}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Totaal Gewicht</p>
              <p className="text-xl font-bold text-gray-900">{(businessCase.totaalGewicht/1000).toFixed(1)}t</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Geschatte Opbrengst</p>
              <p className="text-xl font-bold text-green-600">
                €{businessCase.elementAnalyse.reduce((s, e) => s + e.geschatteOpbrengst, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Geschatte Kosten</p>
              <p className="text-xl font-bold text-red-600">
                €{businessCase.elementAnalyse.reduce((s, e) => s + e.geschatteKosten, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Flow naar volgende stappen */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="font-bold text-gray-900 mb-4">Volgende Stappen</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FlowButton
            fase="oogsten"
            titel="Start Oogst Planning"
            beschrijving="Bekijk 3D model en plan demontage"
            icon={<Scissors className="w-6 h-6" />}
            onClick={() => navigate(`/gebouw-3d/${gebouw.id}`)}
          />
          <FlowButton
            fase="verwerken"
            titel="Naar Bewerkingsplan"
            beschrijving="Matching, zagen, frezen & schoonmaken"
            icon={<Factory className="w-6 h-6" />}
            onClick={() => navigate(`/bewerkingsplan/${gebouw.id}`)}
          />
          <FlowButton
            fase="verkopen"
            titel="Naar Webshop"
            beschrijving="Publiceer beschikbare balken"
            icon={<ShoppingCart className="w-6 h-6" />}
            onClick={() => navigate('/shop')}
          />
        </div>
      </div>
      
      {/* Element Detail Modal */}
      {selectedElementData && (
        <ElementDetailModal
          data={selectedElementData}
          onClose={() => setSelectedElement(null)}
        />
      )}
    </div>
  )
}

// ============================================
// Sub-componenten
// ============================================

function KostenRij({ 
  label, 
  bedrag, 
  icon, 
  kleur,
  fase,
  positief = false 
}: { 
  label: string
  bedrag: number
  icon: React.ReactNode
  kleur: string
  fase?: 'oogsten' | 'verwerken' | 'verkopen'
  positief?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        {fase && <div className={`w-1 h-8 rounded ${FASE_KLEUREN[fase]}`} />}
        <div className={kleur}>{icon}</div>
        <span className="text-gray-700">{label}</span>
      </div>
      <span className={`font-mono font-medium ${positief ? 'text-green-600' : 'text-gray-900'}`}>
        {positief ? '+' : ''}€{bedrag.toLocaleString()}
      </span>
    </div>
  )
}

function ElementGroepRij({
  groep,
  expanded,
  onToggle,
  gebouw,
  onSelectElement
}: {
  groep: ElementTypeAnalyse
  expanded: boolean
  onToggle: () => void
  gebouw: typeof MOCK_GEBOUWEN[0]
  onSelectElement: (id: string) => void
}) {
  const elementen = gebouw.elementen.filter(
    e => e.type === groep.type && e.profielNaam === groep.profiel
  )
  
  const nettoPositief = groep.nettoBijdrage > 0
  
  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-2 h-2 rounded-full ${nettoPositief ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="text-left">
            <p className="font-medium text-gray-900">
              {groep.profiel} <span className="text-gray-400 capitalize">({groep.type})</span>
            </p>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span>{groep.aantal}x</span>
              <span>{(groep.totaalGewicht/1000).toFixed(2)}t</span>
              <span className="flex items-center gap-1">
                <Award className="w-3 h-3" />
                {groep.metCertificaat} cert.
              </span>
              {groep.testNodig > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <TestTube className="w-3 h-3" />
                  {groep.testNodig} test
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Conditie badges */}
          <div className="flex gap-1">
            {groep.conditieGoed > 0 && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                {groep.conditieGoed} goed
              </span>
            )}
            {groep.conditieMatig > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                {groep.conditieMatig} matig
              </span>
            )}
            {groep.conditieSlecht > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                {groep.conditieSlecht} slecht
              </span>
            )}
          </div>
          
          {/* Netto bijdrage */}
          <div className="text-right w-24">
            <p className={`font-bold ${nettoPositief ? 'text-green-600' : 'text-red-600'}`}>
              {nettoPositief ? '+' : ''}€{groep.nettoBijdrage.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">netto</p>
          </div>
          
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div className="bg-white rounded-lg p-3">
              <p className="text-gray-500">Opbrengst</p>
              <p className="text-lg font-bold text-green-600">€{groep.geschatteOpbrengst.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-gray-500">Kosten</p>
              <p className="text-lg font-bold text-red-600">€{groep.geschatteKosten.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-3">
              <p className="text-gray-500">Kg prijs (gem.)</p>
              <p className="text-lg font-bold text-gray-900">
                €{(groep.geschatteOpbrengst / groep.totaalGewicht).toFixed(2)}/kg
              </p>
            </div>
          </div>
          
          <p className="text-sm font-medium text-gray-700 mb-2">Elementen:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {elementen.slice(0, 8).map(el => (
              <button
                key={el.id}
                onClick={() => onSelectElement(el.id)}
                className="text-left bg-white rounded-lg p-2 border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm"
              >
                <p className="font-mono text-xs text-gray-400">{el.id}</p>
                <p className="font-medium">{el.lengte}mm</p>
                <p className={`text-xs ${
                  el.conditie === 'goed' ? 'text-green-600' : 
                  el.conditie === 'matig' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {el.conditie} • {el.gewicht}kg
                </p>
              </button>
            ))}
            {elementen.length > 8 && (
              <div className="bg-gray-100 rounded-lg p-2 flex items-center justify-center text-sm text-gray-500">
                +{elementen.length - 8} meer
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function FlowButton({
  fase,
  titel,
  beschrijving,
  icon,
  onClick
}: {
  fase: 'oogsten' | 'verwerken' | 'verkopen'
  titel: string
  beschrijving: string
  icon: React.ReactNode
  onClick: () => void
}) {
  const kleuren = {
    oogsten: 'bg-green-50 border-green-200 hover:bg-green-100',
    verwerken: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    verkopen: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  }
  const iconKleuren = {
    oogsten: 'text-green-600',
    verwerken: 'text-amber-600',
    verkopen: 'text-purple-600'
  }
  
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border ${kleuren[fase]} transition-colors text-left group`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className={iconKleuren[fase]}>{icon}</div>
        <span className="font-bold text-gray-900">{titel}</span>
        <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="text-sm text-gray-500">{beschrijving}</p>
    </button>
  )
}

function ElementDetailModal({
  data,
  onClose
}: {
  data: {
    element: typeof MOCK_GEBOUWEN[0]['elementen'][0]
    snijplan: ReturnType<typeof genereerSnijPlan>
    certificaat: ReturnType<typeof genereerCertificaat>
    waarde: number
  }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-sm">Element ID</p>
              <p className="text-2xl font-bold">{data.element.id}</p>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white text-2xl">×</button>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Basis info */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.element.profielNaam}</p>
              <p className="text-sm text-gray-500 capitalize">{data.element.type}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.element.lengte}mm</p>
              <p className="text-sm text-gray-500">Lengte</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{data.element.gewicht}kg</p>
              <p className="text-sm text-gray-500">Gewicht</p>
            </div>
          </div>
          
          {/* Certificering */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Certificering
            </h4>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Certificaat Klasse</p>
                  <p className={`font-bold ${
                    data.certificaat.huidigeKlasse === 'CE' ? 'text-green-600' :
                    data.certificaat.huidigeKlasse === 'NEN' ? 'text-blue-600' :
                    data.certificaat.huidigeKlasse === 'TE_TESTEN' ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {data.certificaat.huidigeKlasse}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Staal Kwaliteit</p>
                  <p className="font-bold">{data.certificaat.huidigeKwaliteit}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Test Nodig?</p>
                  <p className={`font-bold ${data.certificaat.testNodig ? 'text-amber-600' : 'text-green-600'}`}>
                    {data.certificaat.testNodig ? 'Ja - €500' : 'Nee'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Prijsmultiplier</p>
                  <p className="font-bold">{(data.certificaat.prijsMultiplier * 100).toFixed(0)}%</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-2">Toegestane Toepassingen</p>
                <div className="flex flex-wrap gap-2">
                  {data.certificaat.toegestaneToepassingen.map(t => (
                    <span key={t} className="px-2 py-1 bg-white border rounded text-sm capitalize">
                      {t.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Snijplan */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              Optimaal Snijplan
            </h4>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{data.snijplan.aantalProducten}</p>
                  <p className="text-sm text-gray-500">Producten</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{data.snijplan.materiaalBenutting}%</p>
                  <p className="text-sm text-gray-500">Benutting</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">€{data.snijplan.geschatteWaarde}</p>
                  <p className="text-sm text-gray-500">Waarde</p>
                </div>
              </div>
              
              {/* Visuele snij representatie */}
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Snij posities:</p>
                <div className="h-8 bg-gray-200 rounded relative flex">
                  {data.snijplan.resultatendeProducten.map((product, idx) => (
                    <div
                      key={idx}
                      className="h-full bg-blue-500 border-r-2 border-white first:rounded-l last:rounded-r"
                      style={{ width: `${(product.lengte / data.element.lengte) * 100}%` }}
                      title={`${product.lengte}mm - €${product.geschatteWaarde}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0</span>
                  <span>{data.element.lengte}mm</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Waarde samenvatting */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-green-700 font-medium">Geschatte Verkoopwaarde</p>
                <p className="text-sm text-green-600">Na optimaal snijden en verwerking</p>
              </div>
              <p className="text-3xl font-bold text-green-700">€{data.snijplan.geschatteWaarde}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
