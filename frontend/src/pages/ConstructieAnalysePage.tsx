/**
 * Constructie Analyse Pagina - CENTRALE HUB
 * 
 * Dit is de kernpagina waar ALLES samenkomt:
 * 1. Gebouw analyseren → Wat zit erin?
 * 2. Slim snijden → Waar zetten we de cuts?
 * 3. Certificering → Wat mag waarvoor gebruikt worden?
 * 4. Kosten berekenen → Ontmanteling + Fabriek
 * 5. Opbrengsten schatten → Verkoop waarde
 * 6. Business Case → Hoeveel willen we betalen?
 */

import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Building2,
  Scissors,
  Factory,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calculator,
  TrendingUp,
  TrendingDown,
  Layers,
  TestTube,
  Award,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Wrench,
  Scale,
  Package,
  Ruler,
  Play,
  Settings,
  RotateCcw,
  Truck,
  Euro
} from 'lucide-react'
import { MOCK_GEBOUWEN, getGebouwStatistieken } from '../data/mockBuildings'
import { 
  genereerSnijPlan,
  genereerCertificaat
} from '../utils/businessLogic'
import type { CADElement } from '../types'
import type { 
  CertificaatKlasse, 
  MateriaalCertificaat,
  SnijPlan 
} from '../types/business'

// ============================================
// TYPES VOOR DEZE PAGINA
// ============================================

interface ElementAnalyseDetail {
  element: CADElement
  certificaat: MateriaalCertificaat
  snijplan: SnijPlan
  ontmantelingsKosten: number
  fabrieksKosten: number
  verkoopWaarde: number
  nettoBijdrage: number
}

interface ProfielGroep {
  profielNaam: string
  type: string
  elementen: ElementAnalyseDetail[]
  totaalAantal: number
  totaalGewicht: number
  totaalLengte: number
  conditieVerdeling: { goed: number; matig: number; slecht: number }
  certificeringVerdeling: { CE: number; NEN: number; TE_TESTEN: number; GEEN: number }
  totaalOntmantelingsKosten: number
  totaalFabrieksKosten: number
  totaalVerkoopWaarde: number
  totaalNettoBijdrage: number
}

// Business Case Instellingen
interface BusinessCaseInstellingen {
  // Ontmanteling
  demontageUurtarief: number        // €/uur voor demontage werk
  demontageSnelheid: number         // kg per uur
  transportKostenPerKg: number      // €/kg transport
  
  // Fabriek
  stralenKostenPerTon: number       // €/ton stralen
  zaagKostenPerSnede: number        // €/snede
  schoonmaakKostenPerTon: number    // €/ton schoonmaken
  keuringsKostenPerElement: number  // €/element keuring
  
  // Testen
  testKostenVolledig: number        // €/element volledig test pakket
  
  // Verkoop
  verkoopPrijsPerKg: number         // €/kg basis verkoopprijs
  conditieFactorGoed: number        // factor voor goede conditie (1.0 = 100%)
  conditieFactorMatig: number       // factor voor matige conditie
  conditieFactorSlecht: number      // factor voor slechte conditie
  
  // Business Case
  targetMarge: number               // gewenste marge percentage (0.15 = 15%)
  margeGrensAankopen: number        // marge % waarbij aankopen aanbevolen (20)
  margeGrensOnderhandelen: number   // marge % waarbij onderhandelen nodig (5)
}

const DEFAULT_INSTELLINGEN: BusinessCaseInstellingen = {
  demontageUurtarief: 85,
  demontageSnelheid: 500,
  transportKostenPerKg: 0.50,
  stralenKostenPerTon: 150,
  zaagKostenPerSnede: 15,
  schoonmaakKostenPerTon: 45,
  keuringsKostenPerElement: 25,
  testKostenVolledig: 500,
  verkoopPrijsPerKg: 0.80,
  conditieFactorGoed: 1.0,
  conditieFactorMatig: 0.85,
  conditieFactorSlecht: 0.60,
  targetMarge: 0.15,
  margeGrensAankopen: 20,
  margeGrensOnderhandelen: 5
}

// ============================================
// CERTIFICERING INFO
// ============================================

const CERTIFICAAT_INFO: Record<CertificaatKlasse, {
  label: string
  kleur: string
  toepassingen: string[]
  prijsImpact: string
}> = {
  'CE': {
    label: 'CE Gecertificeerd',
    kleur: 'bg-green-100 text-green-800 border-green-300',
    toepassingen: ['Constructief primair', 'Constructief secundair', 'Niet-constructief', 'Decoratief'],
    prijsImpact: '100% marktwaarde'
  },
  'NEN': {
    label: 'NEN Gecertificeerd',
    kleur: 'bg-blue-100 text-blue-800 border-blue-300',
    toepassingen: ['Constructief secundair', 'Niet-constructief', 'Decoratief'],
    prijsImpact: '95% marktwaarde'
  },
  'KOMO': {
    label: 'KOMO Gecertificeerd',
    kleur: 'bg-purple-100 text-purple-800 border-purple-300',
    toepassingen: ['Niet-constructief', 'Decoratief'],
    prijsImpact: '90% marktwaarde'
  },
  'GEEN': {
    label: 'Geen Certificaat',
    kleur: 'bg-gray-100 text-gray-800 border-gray-300',
    toepassingen: ['Decoratief', 'Recycling'],
    prijsImpact: '60% marktwaarde'
  },
  'TE_TESTEN': {
    label: 'Test Nodig',
    kleur: 'bg-amber-100 text-amber-800 border-amber-300',
    toepassingen: ['Na test: afhankelijk van resultaat'],
    prijsImpact: '50% (onzeker)'
  }
}

// Kosten voor testen
const TEST_KOSTEN_DETAIL = {
  visueel: { naam: 'Visuele Inspectie', kosten: 25, tijd: '15 min' },
  hardheid: { naam: 'Hardheidsmeting', kosten: 75, tijd: '30 min' },
  trekproef: { naam: 'Trekproef', kosten: 250, tijd: '2 uur' },
  chemisch: { naam: 'Chemische Analyse', kosten: 350, tijd: '1 dag' },
  volledig: { naam: 'Volledig Pakket', kosten: 500, tijd: '2 dagen' }
}

// Fabrieksbewerkingen met kosten
const FABRIEK_BEWERKINGEN = {
  stralen: { naam: 'Stralen SA2.5', kostenPerTon: 150, tijdPerTon: 30 },
  zagen: { naam: 'Zagen/Snijden', kostenPerSnede: 15, tijdPerSnede: 5 },
  boren: { naam: 'Boren', kostenPerGat: 8, tijdPerGat: 2 },
  frezen: { naam: 'CNC Frezen', kostenPerUur: 150, tijdMin: 30 },
  schoonmaken: { naam: 'Schoonmaken', kostenPerTon: 45, tijdPerTon: 15 },
  coaten: { naam: 'Coaten/Verven', kostenPerTon: 250, tijdPerTon: 45 },
  keuren: { naam: 'Eindkeuring', kostenPerElement: 25, tijdPerElement: 10 }
}

// ============================================
// HELPER FUNCTIES
// ============================================

function analyseerElement(element: CADElement, instellingen: BusinessCaseInstellingen): ElementAnalyseDetail {
  const certificaat = genereerCertificaat(element)
  const snijplan = genereerSnijPlan(element)
  
  // Ontmantelingskosten (demonteren + transport) - met instelbare parameters
  const demontageTijd = element.gewicht / instellingen.demontageSnelheid
  const transportKosten = element.gewicht * instellingen.transportKostenPerKg
  const ontmantelingsKosten = Math.round(demontageTijd * instellingen.demontageUurtarief + transportKosten)
  
  // Fabriekskosten (stralen, zagen, etc.) - met instelbare parameters
  const stralenKosten = (element.gewicht / 1000) * instellingen.stralenKostenPerTon
  const zaagKosten = snijplan.sneden.length * instellingen.zaagKostenPerSnede
  const schoonmaakKosten = (element.gewicht / 1000) * instellingen.schoonmaakKostenPerTon
  const keuringsKosten = instellingen.keuringsKostenPerElement
  const testKosten = certificaat.testNodig ? instellingen.testKostenVolledig : 0
  const fabrieksKosten = Math.round(stralenKosten + zaagKosten + schoonmaakKosten + keuringsKosten + testKosten)
  
  // Verkoopwaarde - met conditie factor
  const conditieFactor = element.conditie === 'goed' 
    ? instellingen.conditieFactorGoed 
    : element.conditie === 'matig' 
      ? instellingen.conditieFactorMatig 
      : instellingen.conditieFactorSlecht
  const basisVerkoopWaarde = element.gewicht * instellingen.verkoopPrijsPerKg
  const verkoopWaarde = Math.round(basisVerkoopWaarde * conditieFactor)
  
  // Netto bijdrage
  const nettoBijdrage = verkoopWaarde - ontmantelingsKosten - fabrieksKosten
  
  return {
    element,
    certificaat,
    snijplan,
    ontmantelingsKosten,
    fabrieksKosten,
    verkoopWaarde,
    nettoBijdrage
  }
}

function groepeerProfielen(analyses: ElementAnalyseDetail[]): ProfielGroep[] {
  const groepen = new Map<string, ElementAnalyseDetail[]>()
  
  for (const analyse of analyses) {
    const key = `${analyse.element.profielNaam}|${analyse.element.type}`
    if (!groepen.has(key)) {
      groepen.set(key, [])
    }
    groepen.get(key)!.push(analyse)
  }
  
  return Array.from(groepen.entries()).map(([key, elementen]) => {
    const [profielNaam, type] = key.split('|')
    
    return {
      profielNaam,
      type,
      elementen,
      totaalAantal: elementen.length,
      totaalGewicht: elementen.reduce((s, e) => s + e.element.gewicht, 0),
      totaalLengte: elementen.reduce((s, e) => s + e.element.lengte, 0),
      conditieVerdeling: {
        goed: elementen.filter(e => e.element.conditie === 'goed').length,
        matig: elementen.filter(e => e.element.conditie === 'matig').length,
        slecht: elementen.filter(e => e.element.conditie === 'slecht').length
      },
      certificeringVerdeling: {
        CE: elementen.filter(e => e.certificaat.huidigeKlasse === 'CE').length,
        NEN: elementen.filter(e => e.certificaat.huidigeKlasse === 'NEN').length,
        TE_TESTEN: elementen.filter(e => e.certificaat.huidigeKlasse === 'TE_TESTEN').length,
        GEEN: elementen.filter(e => e.certificaat.huidigeKlasse === 'GEEN' || e.certificaat.huidigeKlasse === 'KOMO').length
      },
      totaalOntmantelingsKosten: elementen.reduce((s, e) => s + e.ontmantelingsKosten, 0),
      totaalFabrieksKosten: elementen.reduce((s, e) => s + e.fabrieksKosten, 0),
      totaalVerkoopWaarde: elementen.reduce((s, e) => s + e.verkoopWaarde, 0),
      totaalNettoBijdrage: elementen.reduce((s, e) => s + e.nettoBijdrage, 0)
    }
  }).sort((a, b) => b.totaalNettoBijdrage - a.totaalNettoBijdrage)
}

// ============================================
// COMPONENTEN
// ============================================

function ProfielGroepCard({ 
  groep, 
  expanded, 
  onToggle,
  onSelectElement
}: { 
  groep: ProfielGroep
  expanded: boolean
  onToggle: () => void
  onSelectElement: (id: string) => void
}) {
  const isPositief = groep.totaalNettoBijdrage > 0
  
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Winstgevendheid indicator */}
          <div className={`w-3 h-12 rounded-full ${isPositief ? 'bg-green-500' : 'bg-red-500'}`} />
          
          <div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-gray-900">{groep.profielNaam}</span>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-sm capitalize">
                {groep.type}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Package className="w-4 h-4" />
                {groep.totaalAantal}x
              </span>
              <span className="flex items-center gap-1">
                <Scale className="w-4 h-4" />
                {(groep.totaalGewicht / 1000).toFixed(2)}t
              </span>
              <span className="flex items-center gap-1">
                <Ruler className="w-4 h-4" />
                {(groep.totaalLengte / 1000).toFixed(1)}m totaal
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Certificering badges */}
          <div className="flex gap-1">
            {groep.certificeringVerdeling.CE > 0 && (
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                {groep.certificeringVerdeling.CE} CE
              </span>
            )}
            {groep.certificeringVerdeling.NEN > 0 && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                {groep.certificeringVerdeling.NEN} NEN
              </span>
            )}
            {groep.certificeringVerdeling.TE_TESTEN > 0 && (
              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium flex items-center gap-1">
                <TestTube className="w-3 h-3" />
                {groep.certificeringVerdeling.TE_TESTEN} test
              </span>
            )}
          </div>
          
          {/* Conditie badges */}
          <div className="flex gap-1">
            {groep.conditieVerdeling.goed > 0 && (
              <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs">
                {groep.conditieVerdeling.goed} goed
              </span>
            )}
            {groep.conditieVerdeling.matig > 0 && (
              <span className="px-2 py-1 bg-amber-50 text-amber-600 rounded text-xs">
                {groep.conditieVerdeling.matig} matig
              </span>
            )}
            {groep.conditieVerdeling.slecht > 0 && (
              <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">
                {groep.conditieVerdeling.slecht} slecht
              </span>
            )}
          </div>
          
          {/* Financieel */}
          <div className="text-right min-w-[100px]">
            <p className={`text-lg font-bold ${isPositief ? 'text-green-600' : 'text-red-600'}`}>
              {isPositief ? '+' : ''}€{groep.totaalNettoBijdrage.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">netto bijdrage</p>
          </div>
          
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50">
          {/* Kosten/Opbrengsten overzicht */}
          <div className="p-4 grid grid-cols-4 gap-4 border-b border-gray-100">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <Scissors className="w-4 h-4" />
                <span className="text-sm font-medium">Ontmanteling</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                €{groep.totaalOntmantelingsKosten.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">incl. transport</p>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <Factory className="w-4 h-4" />
                <span className="text-sm font-medium">Fabriek</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                €{groep.totaalFabrieksKosten.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">stralen, zagen, etc.</p>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <ShoppingCart className="w-4 h-4" />
                <span className="text-sm font-medium">Verkoop</span>
              </div>
              <p className="text-lg font-bold text-gray-900">
                €{groep.totaalVerkoopWaarde.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">na bewerking</p>
            </div>
            
            <div className={`rounded-lg p-3 border-2 ${isPositief ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
              <div className={`flex items-center gap-2 mb-1 ${isPositief ? 'text-green-700' : 'text-red-700'}`}>
                {isPositief ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">Netto</span>
              </div>
              <p className={`text-xl font-bold ${isPositief ? 'text-green-700' : 'text-red-700'}`}>
                {isPositief ? '+' : ''}€{groep.totaalNettoBijdrage.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                €{Math.round(groep.totaalNettoBijdrage / groep.totaalAantal).toLocaleString()}/stuk
              </p>
            </div>
          </div>
          
          {/* Individuele elementen */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Elementen ({groep.elementen.length})</h4>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {groep.elementen.slice(0, 12).map((analyse) => (
                <button
                  key={analyse.element.id}
                  onClick={() => onSelectElement(analyse.element.id)}
                  className="text-left p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-gray-400">{analyse.element.id}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      analyse.element.conditie === 'goed' ? 'bg-green-500' :
                      analyse.element.conditie === 'matig' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                  </div>
                  <p className="font-medium text-gray-900">{analyse.element.lengte}mm</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{analyse.element.gewicht}kg</span>
                    <span className={`text-xs font-medium ${
                      analyse.nettoBijdrage > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {analyse.nettoBijdrage > 0 ? '+' : ''}€{analyse.nettoBijdrage}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      CERTIFICAAT_INFO[analyse.certificaat.huidigeKlasse].kleur
                    }`}>
                      {analyse.certificaat.huidigeKlasse}
                    </span>
                  </div>
                </button>
              ))}
              {groep.elementen.length > 12 && (
                <div className="flex items-center justify-center p-3 bg-gray-100 rounded-lg text-sm text-gray-500">
                  +{groep.elementen.length - 12} meer
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ElementDetailSidebar({ 
  analyse, 
  onClose 
}: { 
  analyse: ElementAnalyseDetail | null
  onClose: () => void 
}) {
  if (!analyse) return null
  
  const { element, certificaat, snijplan, ontmantelingsKosten, fabrieksKosten, verkoopWaarde, nettoBijdrage } = analyse
  
  return (
    <div className="fixed inset-y-0 right-0 w-[480px] bg-white shadow-2xl z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          ✕
        </button>
        <p className="text-blue-200 text-sm">Element Detail</p>
        <h2 className="text-2xl font-bold mt-1">{element.id}</h2>
        <div className="flex items-center gap-3 mt-3">
          <span className="px-3 py-1 bg-white/20 rounded-lg text-sm">{element.profielNaam}</span>
          <span className="px-3 py-1 bg-white/20 rounded-lg text-sm capitalize">{element.type}</span>
          <span className={`px-3 py-1 rounded-lg text-sm ${
            element.conditie === 'goed' ? 'bg-green-500' :
            element.conditie === 'matig' ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            {element.conditie}
          </span>
        </div>
      </div>
      
      <div className="p-6 space-y-6">
        {/* Basis Info */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Basis Gegevens</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <Ruler className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{element.lengte}</p>
              <p className="text-sm text-gray-500">mm lengte</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <Scale className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{element.gewicht}</p>
              <p className="text-sm text-gray-500">kg gewicht</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl">
              <Layers className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{element.verdieping}</p>
              <p className="text-sm text-gray-500">verdieping</p>
            </div>
          </div>
        </div>
        
        {/* Certificering */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Award className="w-4 h-4" />
            Certificering
          </h3>
          <div className={`p-4 rounded-xl border-2 ${CERTIFICAAT_INFO[certificaat.huidigeKlasse].kleur}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold">{CERTIFICAAT_INFO[certificaat.huidigeKlasse].label}</span>
              <span className="text-sm">{CERTIFICAAT_INFO[certificaat.huidigeKlasse].prijsImpact}</span>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">Toegestane toepassingen:</p>
              <div className="flex flex-wrap gap-1">
                {CERTIFICAAT_INFO[certificaat.huidigeKlasse].toepassingen.map((toepassing, idx) => (
                  <span key={idx} className="px-2 py-1 bg-white/50 rounded text-xs">
                    {toepassing}
                  </span>
                ))}
              </div>
            </div>
            
            {certificaat.testNodig && (
              <div className="mt-4 p-3 bg-white/50 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <TestTube className="w-4 h-4" />
                  <span className="font-medium">Test vereist</span>
                </div>
                <p className="text-sm">Materiaaltest nodig om certificaat te bepalen</p>
                <p className="text-sm font-medium mt-1">Kosten: €{TEST_KOSTEN_DETAIL.volledig.kosten}</p>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t border-current/20">
              <div className="flex justify-between text-sm">
                <span>Materiaal kwaliteit:</span>
                <span className="font-medium">{certificaat.huidigeKwaliteit}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Originele tekening:</span>
                <span className="font-medium">{certificaat.oorspronkelijkeTekening ? 'Ja ✓' : 'Nee ✗'}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Snijplan */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Scissors className="w-4 h-4" />
            Optimaal Snijplan
          </h3>
          <div className="bg-gray-50 rounded-xl p-4">
            {/* Visuele snij weergave */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Snijposities visualisatie</p>
              <div className="h-10 bg-gray-200 rounded relative flex overflow-hidden">
                {snijplan.resultatendeProducten.map((product, idx) => (
                  <div
                    key={idx}
                    className={`h-full border-r-2 border-white flex items-center justify-center text-xs font-medium ${
                      idx % 2 === 0 ? 'bg-blue-500 text-white' : 'bg-blue-400 text-white'
                    }`}
                    style={{ width: `${(product.lengte / element.lengte) * 100}%` }}
                  >
                    {product.lengte >= 1000 && `${Math.round(product.lengte / 100) * 100}mm`}
                  </div>
                ))}
                {/* Restant */}
                {snijplan.materiaalBenutting < 100 && (
                  <div 
                    className="h-full bg-gray-300 flex items-center justify-center text-xs text-gray-600"
                    style={{ width: `${100 - snijplan.materiaalBenutting}%` }}
                  >
                    afval
                  </div>
                )}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span>
                <span>{element.lengte}mm</span>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{snijplan.aantalProducten}</p>
                <p className="text-xs text-gray-500">producten</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{snijplan.materiaalBenutting}%</p>
                <p className="text-xs text-gray-500">benutting</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">{snijplan.sneden.length}</p>
                <p className="text-xs text-gray-500">sneden</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Kosten Breakdown */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Kosten & Opbrengsten
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-red-600" />
                <span className="text-gray-700">Ontmanteling</span>
              </div>
              <span className="font-medium text-red-600">-€{ontmantelingsKosten}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Factory className="w-4 h-4 text-amber-600" />
                <span className="text-gray-700">Fabriek</span>
              </div>
              <span className="font-medium text-amber-600">-€{fabrieksKosten}</span>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-green-600" />
                <span className="text-gray-700">Verkoop</span>
              </div>
              <span className="font-medium text-green-600">+€{verkoopWaarde}</span>
            </div>
            
            <div className={`flex items-center justify-between p-4 rounded-lg mt-4 ${
              nettoBijdrage > 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className="font-bold text-gray-900">Netto Bijdrage</span>
              <span className={`text-xl font-bold ${nettoBijdrage > 0 ? 'text-green-700' : 'text-red-700'}`}>
                {nettoBijdrage > 0 ? '+' : ''}€{nettoBijdrage}
              </span>
            </div>
          </div>
        </div>
        
        {/* Acties */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            <Play className="w-4 h-4" />
            Start Bewerkingsplan
          </button>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
            <Layers className="w-4 h-4" />
            Bekijk in 3D
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// HOOFDCOMPONENT
// ============================================

export default function ConstructieAnalysePage() {
  const { gebouwId } = useParams<{ gebouwId: string }>()
  const navigate = useNavigate()
  
  const [aankoopBudget, setAankoopBudget] = useState<number>(25000)
  const [expandedGroepen, setExpandedGroepen] = useState<Set<string>>(new Set())
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [instellingenOpen, setInstellingenOpen] = useState(false)
  const [instellingen, setInstellingen] = useState<BusinessCaseInstellingen>(DEFAULT_INSTELLINGEN)
  
  // Helper om een instelling aan te passen
  const updateInstelling = <K extends keyof BusinessCaseInstellingen>(
    key: K, 
    value: BusinessCaseInstellingen[K]
  ) => {
    setInstellingen(prev => ({ ...prev, [key]: value }))
  }
  
  // Reset naar defaults
  const resetInstellingen = () => {
    setInstellingen(DEFAULT_INSTELLINGEN)
  }
  
  // Gebouw data
  const gebouw = useMemo(() => {
    return MOCK_GEBOUWEN.find(g => g.id === gebouwId) || MOCK_GEBOUWEN[0]
  }, [gebouwId])
  
  const stats = useMemo(() => getGebouwStatistieken(gebouw), [gebouw])
  
  // Analyseer alle elementen met huidige instellingen
  const elementAnalyses = useMemo(() => {
    return gebouw.elementen.map(el => analyseerElement(el, instellingen))
  }, [gebouw, instellingen])
  
  // Groepeer per profiel
  const profielGroepen = useMemo(() => {
    return groepeerProfielen(elementAnalyses)
  }, [elementAnalyses])
  
  // Totalen berekenen
  const totalen = useMemo(() => {
    return {
      ontmantelingsKosten: elementAnalyses.reduce((s, e) => s + e.ontmantelingsKosten, 0),
      fabrieksKosten: elementAnalyses.reduce((s, e) => s + e.fabrieksKosten, 0),
      verkoopWaarde: elementAnalyses.reduce((s, e) => s + e.verkoopWaarde, 0),
      testKosten: elementAnalyses.filter(e => e.certificaat.testNodig).length * instellingen.testKostenVolledig,
      aantalTests: elementAnalyses.filter(e => e.certificaat.testNodig).length
    }
  }, [elementAnalyses, instellingen])
  
  // Business case berekening met instelbare parameters
  const businessCase = useMemo(() => {
    const totaalKosten = aankoopBudget + totalen.ontmantelingsKosten + totalen.fabrieksKosten
    const nettoResultaat = totalen.verkoopWaarde - totaalKosten
    const margePercentage = totalen.verkoopWaarde > 0 
      ? Math.round((nettoResultaat / totalen.verkoopWaarde) * 100) 
      : 0
    
    // Maximale aankoopprijs voor target marge
    const maxAankoop = totalen.verkoopWaarde * (1 - instellingen.targetMarge) - totalen.ontmantelingsKosten - totalen.fabrieksKosten
    
    let aanbeveling: 'aankopen' | 'onderhandelen' | 'afwijzen'
    if (margePercentage > instellingen.margeGrensAankopen) aanbeveling = 'aankopen'
    else if (margePercentage > instellingen.margeGrensOnderhandelen) aanbeveling = 'onderhandelen'
    else aanbeveling = 'afwijzen'
    
    return {
      totaalKosten,
      nettoResultaat,
      margePercentage,
      maxAankoop: Math.max(0, maxAankoop),
      aanbeveling
    }
  }, [aankoopBudget, totalen])
  
  // Geselecteerd element voor sidebar
  const selectedAnalyse = useMemo(() => {
    if (!selectedElementId) return null
    return elementAnalyses.find(a => a.element.id === selectedElementId) || null
  }, [selectedElementId, elementAnalyses])
  
  const toggleGroep = (key: string) => {
    const newSet = new Set(expandedGroepen)
    if (newSet.has(key)) newSet.delete(key)
    else newSet.add(key)
    setExpandedGroepen(newSet)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Constructie Analyse</h1>
              <p className="text-gray-500">{gebouw.naam}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                  {stats.totaalElementen} elementen
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                  {(stats.totaalGewicht / 1000).toFixed(1)} ton
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium">
                  {Object.keys(stats.profielen).length} profieltypes
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            {/* Instellingen toggle */}
            <button
              onClick={() => setInstellingenOpen(!instellingenOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                instellingenOpen 
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Instellingen</span>
              {instellingenOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            
            <div className="text-right">
              <label className="block text-sm text-gray-500 mb-1">Aankoopbudget</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-lg">€</span>
                <input
                  type="number"
                  value={aankoopBudget}
                  onChange={(e) => setAankoopBudget(Number(e.target.value))}
                  className="w-36 px-4 py-2 border border-gray-300 rounded-xl text-right font-mono text-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step={1000}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Instellingen Panel */}
      {instellingenOpen && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Business Case Instellingen</h3>
                <p className="text-sm text-gray-500">Pas de berekening parameters aan</p>
              </div>
            </div>
            <button
              onClick={resetInstellingen}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset naar standaard
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ontmanteling */}
            <div className="bg-red-50 rounded-xl p-5 border border-red-100">
              <div className="flex items-center gap-2 mb-4">
                <Scissors className="w-5 h-5 text-red-600" />
                <h4 className="font-bold text-gray-900">Ontmanteling</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Demontage uurtarief</span>
                    <span className="font-mono text-gray-900">€{instellingen.demontageUurtarief}/uur</span>
                  </label>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={5}
                    value={instellingen.demontageUurtarief}
                    onChange={(e) => updateInstelling('demontageUurtarief', Number(e.target.value))}
                    className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€50</span>
                    <span>€150</span>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Demontage snelheid</span>
                    <span className="font-mono text-gray-900">{instellingen.demontageSnelheid} kg/uur</span>
                  </label>
                  <input
                    type="range"
                    min={200}
                    max={1000}
                    step={50}
                    value={instellingen.demontageSnelheid}
                    onChange={(e) => updateInstelling('demontageSnelheid', Number(e.target.value))}
                    className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>200 kg/u</span>
                    <span>1000 kg/u</span>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      Transport kosten
                    </span>
                    <span className="font-mono text-gray-900">€{instellingen.transportKostenPerKg.toFixed(2)}/kg</span>
                  </label>
                  <input
                    type="range"
                    min={0.20}
                    max={1.50}
                    step={0.05}
                    value={instellingen.transportKostenPerKg}
                    onChange={(e) => updateInstelling('transportKostenPerKg', Number(e.target.value))}
                    className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€0.20/kg</span>
                    <span>€1.50/kg</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Fabriek */}
            <div className="bg-amber-50 rounded-xl p-5 border border-amber-100">
              <div className="flex items-center gap-2 mb-4">
                <Factory className="w-5 h-5 text-amber-600" />
                <h4 className="font-bold text-gray-900">Fabriek</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Stralen kosten</span>
                    <span className="font-mono text-gray-900">€{instellingen.stralenKostenPerTon}/ton</span>
                  </label>
                  <input
                    type="range"
                    min={80}
                    max={300}
                    step={10}
                    value={instellingen.stralenKostenPerTon}
                    onChange={(e) => updateInstelling('stralenKostenPerTon', Number(e.target.value))}
                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€80</span>
                    <span>€300</span>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Zaag kosten</span>
                    <span className="font-mono text-gray-900">€{instellingen.zaagKostenPerSnede}/snede</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={50}
                    step={5}
                    value={instellingen.zaagKostenPerSnede}
                    onChange={(e) => updateInstelling('zaagKostenPerSnede', Number(e.target.value))}
                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€5</span>
                    <span>€50</span>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Schoonmaken</span>
                    <span className="font-mono text-gray-900">€{instellingen.schoonmaakKostenPerTon}/ton</span>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={5}
                    value={instellingen.schoonmaakKostenPerTon}
                    onChange={(e) => updateInstelling('schoonmaakKostenPerTon', Number(e.target.value))}
                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€20</span>
                    <span>€100</span>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Keuring per element</span>
                    <span className="font-mono text-gray-900">€{instellingen.keuringsKostenPerElement}</span>
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={75}
                    step={5}
                    value={instellingen.keuringsKostenPerElement}
                    onChange={(e) => updateInstelling('keuringsKostenPerElement', Number(e.target.value))}
                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€10</span>
                    <span>€75</span>
                  </div>
                </div>
                
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span className="flex items-center gap-1">
                      <TestTube className="w-4 h-4" />
                      Test kosten (volledig)
                    </span>
                    <span className="font-mono text-gray-900">€{instellingen.testKostenVolledig}</span>
                  </label>
                  <input
                    type="range"
                    min={200}
                    max={1000}
                    step={50}
                    value={instellingen.testKostenVolledig}
                    onChange={(e) => updateInstelling('testKostenVolledig', Number(e.target.value))}
                    className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€200</span>
                    <span>€1000</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Verkoop & Marge */}
            <div className="bg-green-50 rounded-xl p-5 border border-green-100">
              <div className="flex items-center gap-2 mb-4">
                <Euro className="w-5 h-5 text-green-600" />
                <h4 className="font-bold text-gray-900">Verkoop & Marge</h4>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Verkoopprijs per kg</span>
                    <span className="font-mono text-gray-900">€{instellingen.verkoopPrijsPerKg.toFixed(2)}/kg</span>
                  </label>
                  <input
                    type="range"
                    min={0.40}
                    max={2.00}
                    step={0.05}
                    value={instellingen.verkoopPrijsPerKg}
                    onChange={(e) => updateInstelling('verkoopPrijsPerKg', Number(e.target.value))}
                    className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>€0.40/kg</span>
                    <span>€2.00/kg</span>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Conditie Prijsfactoren</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full" />
                        Goed
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0.5}
                          max={1.2}
                          step={0.05}
                          value={instellingen.conditieFactorGoed}
                          onChange={(e) => updateInstelling('conditieFactorGoed', Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-right text-sm"
                        />
                        <span className="text-xs text-gray-500">= {Math.round(instellingen.conditieFactorGoed * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-amber-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-amber-500 rounded-full" />
                        Matig
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0.4}
                          max={1.0}
                          step={0.05}
                          value={instellingen.conditieFactorMatig}
                          onChange={(e) => updateInstelling('conditieFactorMatig', Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-right text-sm"
                        />
                        <span className="text-xs text-gray-500">= {Math.round(instellingen.conditieFactorMatig * 100)}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-red-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                        Slecht
                      </span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0.2}
                          max={0.8}
                          step={0.05}
                          value={instellingen.conditieFactorSlecht}
                          onChange={(e) => updateInstelling('conditieFactorSlecht', Number(e.target.value))}
                          className="w-16 px-2 py-1 border border-gray-200 rounded text-right text-sm"
                        />
                        <span className="text-xs text-gray-500">= {Math.round(instellingen.conditieFactorSlecht * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-green-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">Marge Grenzen</p>
                  <div className="space-y-3">
                    <div>
                      <label className="flex items-center justify-between text-sm text-gray-600 mb-1">
                        <span>Target marge</span>
                        <span className="font-mono text-gray-900">{Math.round(instellingen.targetMarge * 100)}%</span>
                      </label>
                      <input
                        type="range"
                        min={0.05}
                        max={0.40}
                        step={0.01}
                        value={instellingen.targetMarge}
                        onChange={(e) => updateInstelling('targetMarge', Number(e.target.value))}
                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Aankopen bij</label>
                        <div className="flex items-center gap-1">
                          <span className="text-green-600">{'>'}</span>
                          <input
                            type="number"
                            min={5}
                            max={50}
                            value={instellingen.margeGrensAankopen}
                            onChange={(e) => updateInstelling('margeGrensAankopen', Number(e.target.value))}
                            className="w-14 px-2 py-1 border border-gray-200 rounded text-right text-sm"
                          />
                          <span className="text-xs text-gray-500">%</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-gray-500">Onderhandelen bij</label>
                        <div className="flex items-center gap-1">
                          <span className="text-amber-600">{'>'}</span>
                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={instellingen.margeGrensOnderhandelen}
                            onChange={(e) => updateInstelling('margeGrensOnderhandelen', Number(e.target.value))}
                            className="w-14 px-2 py-1 border border-gray-200 rounded text-right text-sm"
                          />
                          <span className="text-xs text-gray-500">%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Samenvatting impact */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Ontmanteling impact</p>
                <p className="text-lg font-bold text-red-600">
                  €{Math.round(totalen.ontmantelingsKosten / stats.totaalElementen)}/element
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Fabriek impact</p>
                <p className="text-lg font-bold text-amber-600">
                  €{Math.round(totalen.fabrieksKosten / stats.totaalElementen)}/element
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Verkoop per kg</p>
                <p className="text-lg font-bold text-green-600">
                  €{(totalen.verkoopWaarde / stats.totaalGewicht).toFixed(2)}/kg
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Max. aankoopprijs</p>
                <p className="text-lg font-bold text-indigo-600">
                  €{businessCase.maxAankoop.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Business Case Banner */}
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
              <p className="text-white/80 mt-1">
                {businessCase.aanbeveling === 'aankopen' 
                  ? `Goede deal met ${businessCase.margePercentage}% marge` 
                  : businessCase.aanbeveling === 'onderhandelen'
                    ? `Marge te laag (${businessCase.margePercentage}%), max €${businessCase.maxAankoop.toLocaleString()} bieden`
                    : `Verwacht verlies van €${(-businessCase.nettoResultaat).toLocaleString()}`}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-white/70 text-sm">Totaal Kosten</p>
              <p className="text-2xl font-bold">€{businessCase.totaalKosten.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-white/70 text-sm">Verkoop Waarde</p>
              <p className="text-2xl font-bold">€{totalen.verkoopWaarde.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-white/70 text-sm">Netto Resultaat</p>
              <p className="text-3xl font-bold">
                {businessCase.nettoResultaat > 0 ? '+' : ''}€{businessCase.nettoResultaat.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Kosten Breakdown */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Building2 className="w-5 h-5" />
            <span className="text-sm font-medium">Aankoop</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">€{aankoopBudget.toLocaleString()}</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Scissors className="w-5 h-5" />
            <span className="text-sm font-medium">Ontmanteling</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">€{totalen.ontmantelingsKosten.toLocaleString()}</p>
          <p className="text-xs text-gray-500">incl. transport</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-amber-600 mb-2">
            <Factory className="w-5 h-5" />
            <span className="text-sm font-medium">Fabriek</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">€{totalen.fabrieksKosten.toLocaleString()}</p>
          <p className="text-xs text-gray-500">stralen, zagen, etc.</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-purple-600 mb-2">
            <TestTube className="w-5 h-5" />
            <span className="text-sm font-medium">Testen</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">€{totalen.testKosten.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{totalen.aantalTests} elementen</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-2">
            <ShoppingCart className="w-5 h-5" />
            <span className="text-sm font-medium">Verkoop Waarde</span>
          </div>
          <p className="text-2xl font-bold text-green-600">€{totalen.verkoopWaarde.toLocaleString()}</p>
          <p className="text-xs text-gray-500">na bewerking</p>
        </div>
      </div>
      
      {/* Profiel Groepen */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Elementen per Profiel</h2>
            <p className="text-sm text-gray-500">Gesorteerd op netto bijdrage (hoogste eerst)</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setExpandedGroepen(new Set())}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Alles inklappen
            </button>
            <button 
              onClick={() => setExpandedGroepen(new Set(profielGroepen.map(g => `${g.profielNaam}|${g.type}`)))}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Alles uitklappen
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-100">
          {profielGroepen.map((groep) => (
            <ProfielGroepCard
              key={`${groep.profielNaam}|${groep.type}`}
              groep={groep}
              expanded={expandedGroepen.has(`${groep.profielNaam}|${groep.type}`)}
              onToggle={() => toggleGroep(`${groep.profielNaam}|${groep.type}`)}
              onSelectElement={setSelectedElementId}
            />
          ))}
        </div>
      </div>
      
      {/* Flow naar volgende stappen */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Vervolgstappen</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={() => navigate(`/nta8713/${gebouw.id}`)}
            className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Award className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-gray-900">NTA 8713</span>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Europese certificering</p>
          </button>
          
          <button
            onClick={() => navigate(`/oogst-analyse/${gebouw.id}`)}
            className="p-4 bg-purple-50 border-2 border-purple-200 rounded-xl hover:bg-purple-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Scissors className="w-6 h-6 text-purple-600" />
              <span className="font-bold text-gray-900">Oogst Analyse</span>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">AI demontage volgorde</p>
          </button>
          
          <button
            onClick={() => navigate(`/operator-demontage/${gebouw.id}`)}
            className="p-4 bg-green-50 border-2 border-green-200 rounded-xl hover:bg-green-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Wrench className="w-6 h-6 text-green-600" />
              <span className="font-bold text-gray-900">Start Demontage</span>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Operator interface</p>
          </button>
          
          <button
            onClick={() => navigate(`/gebouw-3d/${gebouw.id}`)}
            className="p-4 bg-gray-50 border-2 border-gray-200 rounded-xl hover:bg-gray-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Layers className="w-6 h-6 text-gray-600" />
              <span className="font-bold text-gray-900">3D Viewer</span>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Bekijk constructie in 3D</p>
          </button>
          
          <button
            onClick={() => navigate(`/bewerkingsplan/${gebouw.id}`)}
            className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl hover:bg-amber-100 transition-colors text-left group"
          >
            <div className="flex items-center gap-3 mb-2">
              <Factory className="w-6 h-6 text-amber-600" />
              <span className="font-bold text-gray-900">Bewerking</span>
              <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:translate-x-1 transition-transform" />
            </div>
            <p className="text-sm text-gray-600">Zagen, frezen, schoonmaken</p>
          </button>
        </div>
      </div>
      
      {/* Element Detail Sidebar */}
      {selectedAnalyse && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSelectedElementId(null)}
          />
          <ElementDetailSidebar 
            analyse={selectedAnalyse}
            onClose={() => setSelectedElementId(null)}
          />
        </>
      )}
    </div>
  )
}
