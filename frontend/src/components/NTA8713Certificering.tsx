/**
 * NTA 8713 Certificering Component
 * Volledige UI voor het NTA 8713 certificeringsproces
 */

import { useState } from 'react'
import {
  Shield, FileCheck, AlertTriangle, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Beaker, FileText, Euro,
  Calendar, Building2, Ruler, Eye, Hammer
} from 'lucide-react'
import type {
  StaalSoort,
  HergebruikRoute
} from '../types/nta8713'
import {
  UITVOERINGSKLASSE_INFO,
  GEVOLGKLASSE_INFO,
  HERGEBRUIK_ROUTES,
  TEST_SPECIFICATIES,
  CONDITIE_KLASSEN
} from '../types/nta8713'
import type {
  ElementInspectieData,
  NTA8713BeoordelingResultaat
} from '../utils/nta8713Logic'
import {
  voerNTA8713BeoordelingUit
} from '../utils/nta8713Logic'

// ============================================
// PROPS & TYPES
// ============================================

interface NTA8713CertificeringProps {
  element: {
    id: string
    profielType: string
    lengte: number
    gewicht: number
  }
  gebouw: {
    naam: string
    adres: string
    bouwjaar: number
  }
  onComplete?: (beoordeling: NTA8713BeoordelingResultaat) => void
}

// State types
interface DocumentatieState {
  heeftMateriaalCertificaat: boolean
  certificaatType?: '2.1' | '2.2' | '3.1' | '3.2'
  heeftProductietekeningen: boolean
  staalsoortVermeld?: StaalSoort
  chargeNummerBekend: boolean
  ceMarkeringAanwezig: boolean
}

interface InspectieState {
  roestgraad: 'A' | 'B' | 'C' | 'D'
  putcorrosie: boolean
  putcorrosieDiepte: number
  vervormingen: boolean
  vervormingsType: string
  schade: 'geen' | 'licht' | 'matig' | 'zwaar'
  lassenAanwezig: boolean
  lassenConditie: 'goed' | 'matig' | 'slecht'
  coatingAanwezig: boolean
  coatingConditie: 'intact' | 'beschadigd' | 'afwezig'
}

interface AfmetingenState {
  hoogte: number
  breedte: number
  flensDikte: number
  lijfDikte: number
  tolerantieOK: boolean
}

// ============================================
// MAIN COMPONENT
// ============================================

export function NTA8713Certificering({ element, gebouw, onComplete }: NTA8713CertificeringProps) {
  const [stap, setStap] = useState<'documentatie' | 'inspectie' | 'resultaat'>('documentatie')
  const [expanded, setExpanded] = useState<string[]>(['route'])
  
  // Formulier state voor documentatie
  const [documentatie, setDocumentatie] = useState<DocumentatieState>({
    heeftMateriaalCertificaat: false,
    certificaatType: undefined,
    heeftProductietekeningen: false,
    staalsoortVermeld: undefined,
    chargeNummerBekend: false,
    ceMarkeringAanwezig: false
  })
  
  // Formulier state voor visuele inspectie
  const [inspectie, setInspectie] = useState<InspectieState>({
    roestgraad: 'B',
    putcorrosie: false,
    putcorrosieDiepte: 0,
    vervormingen: false,
    vervormingsType: '',
    schade: 'geen',
    lassenAanwezig: false,
    lassenConditie: 'goed',
    coatingAanwezig: false,
    coatingConditie: 'intact'
  })
  
  // Afmetingen
  const [afmetingen, setAfmetingen] = useState<AfmetingenState>({
    hoogte: 0,
    breedte: 0,
    flensDikte: 0,
    lijfDikte: 0,
    tolerantieOK: true
  })
  
  // Beoordeling resultaat
  const [beoordeling, setBeoordeling] = useState<NTA8713BeoordelingResultaat | null>(null)

  const toggleExpand = (key: string) => {
    setExpanded(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const voerBeoordelingUit = () => {
    const data: ElementInspectieData = {
      elementId: element.id,
      profielType: element.profielType,
      lengte: element.lengte,
      gewicht: element.gewicht,
      gebouwNaam: gebouw.naam,
      adres: gebouw.adres,
      bouwjaar: gebouw.bouwjaar,
      demontageDatum: new Date().toISOString().split('T')[0],
      oorspronkelijkeToepassing: 'ligger',
      documentatie,
      visueleInspectie: inspectie,
      afmetingen
    }
    
    const resultaat = voerNTA8713BeoordelingUit(data)
    setBeoordeling(resultaat)
    setStap('resultaat')
    onComplete?.(resultaat)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-xl">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">NTA 8713 Certificering</h2>
            <p className="text-sm text-gray-600">Hergebruik van staalconstructies conform EN 1090</p>
          </div>
        </div>
        
        {/* Element info */}
        <div className="mt-4 p-4 bg-white rounded-lg">
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Element</span>
              <p className="font-semibold">{element.id}</p>
            </div>
            <div>
              <span className="text-gray-500">Profiel</span>
              <p className="font-semibold">{element.profielType}</p>
            </div>
            <div>
              <span className="text-gray-500">Lengte</span>
              <p className="font-semibold">{element.lengte} mm</p>
            </div>
            <div>
              <span className="text-gray-500">Gewicht</span>
              <p className="font-semibold">{element.gewicht} kg</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {[
            { key: 'documentatie', label: 'Documentatie', icon: FileText },
            { key: 'inspectie', label: 'Inspectie', icon: Eye },
            { key: 'resultaat', label: 'Resultaat', icon: FileCheck }
          ].map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                stap === s.key 
                  ? 'bg-blue-100 text-blue-700' 
                  : i < ['documentatie', 'inspectie', 'resultaat'].indexOf(stap)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                <s.icon className="w-5 h-5" />
                <span className="font-medium">{s.label}</span>
              </div>
              {i < 2 && (
                <div className={`w-16 h-1 mx-2 rounded ${
                  i < ['documentatie', 'inspectie', 'resultaat'].indexOf(stap)
                    ? 'bg-green-500'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {stap === 'documentatie' && (
          <DocumentatieFormulier
            documentatie={documentatie}
            setDocumentatie={setDocumentatie}
            gebouw={gebouw}
            onVolgende={() => setStap('inspectie')}
          />
        )}
        
        {stap === 'inspectie' && (
          <InspectieFormulier
            inspectie={inspectie}
            setInspectie={setInspectie}
            afmetingen={afmetingen}
            setAfmetingen={setAfmetingen}
            onTerug={() => setStap('documentatie')}
            onVolgende={voerBeoordelingUit}
          />
        )}
        
        {stap === 'resultaat' && beoordeling && (
          <BeoordelingResultaat
            beoordeling={beoordeling}
            element={element}
            expanded={expanded}
            toggleExpand={toggleExpand}
            onTerug={() => setStap('inspectie')}
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// DOCUMENTATIE FORMULIER
// ============================================

interface DocumentatieFormulierProps {
  documentatie: DocumentatieState
  setDocumentatie: React.Dispatch<React.SetStateAction<DocumentatieState>>
  gebouw: { naam: string; bouwjaar: number }
  onVolgende: () => void
}

function DocumentatieFormulier({ documentatie, setDocumentatie, gebouw, onVolgende }: DocumentatieFormulierProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
        <Building2 className="w-5 h-5 text-blue-600" />
        <div>
          <p className="font-medium text-blue-900">Oorsprong: {gebouw.naam}</p>
          <p className="text-sm text-blue-700">Bouwjaar: {gebouw.bouwjaar}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Materiaalcertificaat */}
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={documentatie.heeftMateriaalCertificaat}
              onChange={e => setDocumentatie(prev => ({ 
                ...prev, 
                heeftMateriaalCertificaat: e.target.checked 
              }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="font-medium">Materiaalcertificaat aanwezig</span>
          </label>
          
          {documentatie.heeftMateriaalCertificaat && (
            <div className="ml-8 space-y-2">
              <p className="text-sm text-gray-600">Type certificaat (EN 10204):</p>
              <div className="flex flex-wrap gap-2">
                {(['2.1', '2.2', '3.1', '3.2'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setDocumentatie(prev => ({ ...prev, certificaatType: type }))}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      documentatie.certificaatType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    Type {type}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                {documentatie.certificaatType === '3.1' || documentatie.certificaatType === '3.2'
                  ? '✓ Route A mogelijk - specifieke testgegevens per smelt'
                  : documentatie.certificaatType
                  ? '⚠ Route B - alleen productconformiteit'
                  : ''}
              </p>
            </div>
          )}
        </div>
        
        {/* Productietekeningen */}
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={documentatie.heeftProductietekeningen}
              onChange={e => setDocumentatie(prev => ({ 
                ...prev, 
                heeftProductietekeningen: e.target.checked 
              }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="font-medium">Productietekeningen beschikbaar</span>
          </label>
        </div>
        
        {/* Staalsoort */}
        <div className="space-y-3">
          <p className="font-medium">Staalsoort (indien bekend)</p>
          <div className="flex flex-wrap gap-2">
            {(['S235', 'S275', 'S355', 'S420', 'S460', 'ONBEKEND'] as StaalSoort[]).map(soort => (
              <button
                key={soort}
                onClick={() => setDocumentatie(prev => ({ 
                  ...prev, 
                  staalsoortVermeld: soort === 'ONBEKEND' ? undefined : soort 
                }))}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  documentatie.staalsoortVermeld === soort || 
                  (soort === 'ONBEKEND' && !documentatie.staalsoortVermeld)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {soort}
              </button>
            ))}
          </div>
        </div>
        
        {/* Extra opties */}
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={documentatie.chargeNummerBekend}
              onChange={e => setDocumentatie(prev => ({ 
                ...prev, 
                chargeNummerBekend: e.target.checked 
              }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="font-medium">Chargenummer bekend</span>
          </label>
          
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={documentatie.ceMarkeringAanwezig}
              onChange={e => setDocumentatie(prev => ({ 
                ...prev, 
                ceMarkeringAanwezig: e.target.checked 
              }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="font-medium">CE-markering aanwezig</span>
          </label>
        </div>
      </div>
      
      {/* Route preview */}
      <RoutePreview documentatie={documentatie} bouwjaar={gebouw.bouwjaar} />
      
      <div className="flex justify-end">
        <button
          onClick={onVolgende}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Volgende: Visuele Inspectie →
        </button>
      </div>
    </div>
  )
}

// ============================================
// ROUTE PREVIEW
// ============================================

function RoutePreview({ 
  documentatie, 
  bouwjaar 
}: { 
  documentatie: DocumentatieFormulierProps['documentatie']
  bouwjaar: number 
}) {
  // Bepaal verwachte route
  const heeftOrigineleCertificaten = 
    documentatie.heeftMateriaalCertificaat && 
    (documentatie.certificaatType === '3.1' || documentatie.certificaatType === '3.2')
  
  let route: HergebruikRoute = 'ROUTE_C'
  if (heeftOrigineleCertificaten && documentatie.heeftProductietekeningen) {
    route = 'ROUTE_A'
  } else if (documentatie.staalsoortVermeld && bouwjaar) {
    route = 'ROUTE_B'
  }
  
  const routeInfo = HERGEBRUIK_ROUTES[route]
  
  return (
    <div className={`p-4 rounded-lg border ${
      route === 'ROUTE_A' 
        ? 'bg-green-50 border-green-200' 
        : route === 'ROUTE_B'
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-orange-50 border-orange-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          route === 'ROUTE_A' 
            ? 'bg-green-100' 
            : route === 'ROUTE_B'
            ? 'bg-yellow-100'
            : 'bg-orange-100'
        }`}>
          <FileCheck className={`w-5 h-5 ${
            route === 'ROUTE_A' 
              ? 'text-green-600' 
              : route === 'ROUTE_B'
              ? 'text-yellow-600'
              : 'text-orange-600'
          }`} />
        </div>
        <div className="flex-1">
          <p className="font-semibold">{routeInfo.naam}</p>
          <p className="text-sm mt-1">{routeInfo.beschrijving}</p>
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <Beaker className="w-4 h-4" />
              {routeInfo.testenNodig.length} test(en)
            </span>
            <span className="flex items-center gap-1">
              <Euro className="w-4 h-4" />
              Kosten: {routeInfo.kostenIndicatie}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {routeInfo.doorlooptijd}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================
// INSPECTIE FORMULIER
// ============================================

interface InspectieFormulierProps {
  inspectie: InspectieState
  setInspectie: React.Dispatch<React.SetStateAction<InspectieState>>
  afmetingen: AfmetingenState
  setAfmetingen: React.Dispatch<React.SetStateAction<AfmetingenState>>
  onTerug: () => void
  onVolgende: () => void
}

function InspectieFormulier({ 
  inspectie, 
  setInspectie, 
  afmetingen, 
  setAfmetingen,
  onTerug, 
  onVolgende 
}: InspectieFormulierProps) {
  return (
    <div className="space-y-6">
      {/* Roestgraad */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5 text-gray-400" />
          Roestgraad (EN ISO 8501-1)
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {(['A', 'B', 'C', 'D'] as const).map(graad => (
            <button
              key={graad}
              onClick={() => setInspectie(prev => ({ ...prev, roestgraad: graad }))}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                inspectie.roestgraad === graad
                  ? graad === 'A' ? 'border-green-500 bg-green-50'
                    : graad === 'B' ? 'border-blue-500 bg-blue-50'
                    : graad === 'C' ? 'border-yellow-500 bg-yellow-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="font-bold text-lg">Graad {graad}</p>
              <p className="text-xs text-gray-600 mt-1">
                {graad === 'A' && 'Staaloppervlak met weinig of geen roest'}
                {graad === 'B' && 'Beginnende roestvorming, losse huid'}
                {graad === 'C' && 'Roest met losse lagen, lichte putvorming'}
                {graad === 'D' && 'Volledige roestbedekking, diepe putten'}
              </p>
            </button>
          ))}
        </div>
      </div>
      
      {/* Corrosie details */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={inspectie.putcorrosie}
              onChange={e => setInspectie(prev => ({ ...prev, putcorrosie: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="font-medium">Putcorrosie aanwezig</span>
          </label>
          
          {inspectie.putcorrosie && (
            <div className="ml-8">
              <label className="text-sm text-gray-600">Diepte (mm)</label>
              <input
                type="number"
                value={inspectie.putcorrosieDiepte}
                onChange={e => setInspectie(prev => ({ 
                  ...prev, 
                  putcorrosieDiepte: parseFloat(e.target.value) || 0 
                }))}
                className="mt-1 w-24 px-3 py-2 border rounded-lg"
                min="0"
                step="0.1"
              />
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={inspectie.vervormingen}
              onChange={e => setInspectie(prev => ({ ...prev, vervormingen: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="font-medium">Vervormingen zichtbaar</span>
          </label>
          
          {inspectie.vervormingen && (
            <div className="ml-8">
              <input
                type="text"
                value={inspectie.vervormingsType}
                onChange={e => setInspectie(prev => ({ ...prev, vervormingsType: e.target.value }))}
                placeholder="Beschrijf vervorming..."
                className="mt-1 w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Schade beoordeling */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Hammer className="w-5 h-5 text-gray-400" />
          Schade beoordeling
        </h3>
        <div className="flex gap-3">
          {(['geen', 'licht', 'matig', 'zwaar'] as const).map(niveau => (
            <button
              key={niveau}
              onClick={() => setInspectie(prev => ({ ...prev, schade: niveau }))}
              className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all ${
                inspectie.schade === niveau
                  ? niveau === 'geen' ? 'bg-green-600 text-white'
                    : niveau === 'licht' ? 'bg-blue-600 text-white'
                    : niveau === 'matig' ? 'bg-yellow-600 text-white'
                    : 'bg-red-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {niveau.charAt(0).toUpperCase() + niveau.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {/* Lassen */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={inspectie.lassenAanwezig}
              onChange={e => setInspectie(prev => ({ ...prev, lassenAanwezig: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="font-medium">Lassen aanwezig</span>
          </label>
          
          {inspectie.lassenAanwezig && (
            <div className="ml-8 flex gap-2">
              {(['goed', 'matig', 'slecht'] as const).map(conditie => (
                <button
                  key={conditie}
                  onClick={() => setInspectie(prev => ({ ...prev, lassenConditie: conditie }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    inspectie.lassenConditie === conditie
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {conditie.charAt(0).toUpperCase() + conditie.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={inspectie.coatingAanwezig}
              onChange={e => setInspectie(prev => ({ ...prev, coatingAanwezig: e.target.checked }))}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <span className="font-medium">Coating/verf aanwezig</span>
          </label>
          
          {inspectie.coatingAanwezig && (
            <div className="ml-8 flex gap-2">
              {(['intact', 'beschadigd', 'afwezig'] as const).map(conditie => (
                <button
                  key={conditie}
                  onClick={() => setInspectie(prev => ({ ...prev, coatingConditie: conditie }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    inspectie.coatingConditie === conditie
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {conditie.charAt(0).toUpperCase() + conditie.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Afmetingen */}
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Ruler className="w-5 h-5 text-gray-400" />
          Maatvoering (gemeten)
        </h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-gray-600">Hoogte (mm)</label>
            <input
              type="number"
              value={afmetingen.hoogte || ''}
              onChange={e => setAfmetingen(prev => ({ ...prev, hoogte: parseFloat(e.target.value) || 0 }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Breedte (mm)</label>
            <input
              type="number"
              value={afmetingen.breedte || ''}
              onChange={e => setAfmetingen(prev => ({ ...prev, breedte: parseFloat(e.target.value) || 0 }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Flensdikte (mm)</label>
            <input
              type="number"
              value={afmetingen.flensDikte || ''}
              onChange={e => setAfmetingen(prev => ({ ...prev, flensDikte: parseFloat(e.target.value) || 0 }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Lijfdikte (mm)</label>
            <input
              type="number"
              value={afmetingen.lijfDikte || ''}
              onChange={e => setAfmetingen(prev => ({ ...prev, lijfDikte: parseFloat(e.target.value) || 0 }))}
              className="mt-1 w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={afmetingen.tolerantieOK}
            onChange={e => setAfmetingen(prev => ({ ...prev, tolerantieOK: e.target.checked }))}
            className="w-5 h-5 text-blue-600 rounded"
          />
          <span className="font-medium">Afmetingen binnen tolerantie (EN 1090-2 Tabel B.1-B.4)</span>
        </label>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onTerug}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          ← Terug
        </button>
        <button
          onClick={onVolgende}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Beoordeling Uitvoeren →
        </button>
      </div>
    </div>
  )
}

// ============================================
// BEOORDELING RESULTAAT
// ============================================

interface BeoordelingResultaatProps {
  beoordeling: NTA8713BeoordelingResultaat
  element: { id: string; profielType: string; gewicht: number }
  expanded: string[]
  toggleExpand: (key: string) => void
  onTerug: () => void
}

function BeoordelingResultaat({ 
  beoordeling, 
  element,
  expanded, 
  toggleExpand,
  onTerug 
}: BeoordelingResultaatProps) {
  const routeInfo = HERGEBRUIK_ROUTES[beoordeling.route]
  const conditieInfo = CONDITIE_KLASSEN[beoordeling.conditieKlasse]
  const excInfo = UITVOERINGSKLASSE_INFO[beoordeling.maximaleUitvoeringsKlasse]
  const ccInfo = GEVOLGKLASSE_INFO[beoordeling.maximaleGevolgKlasse]
  
  return (
    <div className="space-y-6">
      {/* Status badge */}
      <div className={`p-6 rounded-xl ${
        beoordeling.certificeerbaar 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center gap-4">
          {beoordeling.certificeerbaar ? (
            <div className="p-3 bg-green-500 rounded-full">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          ) : (
            <div className="p-3 bg-red-500 rounded-full">
              <XCircle className="w-8 h-8 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-xl font-bold">
              {beoordeling.certificeerbaar 
                ? 'Geschikt voor NTA 8713 Certificering' 
                : 'Niet Geschikt voor Constructief Hergebruik'}
            </h3>
            <p className="text-gray-600 mt-1">{beoordeling.certificeerbaarToelichting}</p>
          </div>
        </div>
      </div>
      
      {/* Classificatie overzicht */}
      <div className="grid grid-cols-4 gap-4">
        {/* Route */}
        <div className={`p-4 rounded-xl border ${
          beoordeling.route === 'ROUTE_A' ? 'bg-green-50 border-green-200' :
          beoordeling.route === 'ROUTE_B' ? 'bg-yellow-50 border-yellow-200' :
          'bg-orange-50 border-orange-200'
        }`}>
          <p className="text-sm text-gray-600">Hergebruik Route</p>
          <p className="text-xl font-bold mt-1">{beoordeling.route.replace('_', ' ')}</p>
          <p className="text-xs mt-2">{routeInfo.kostenIndicatie} kosten</p>
        </div>
        
        {/* Conditie */}
        <div className={`p-4 rounded-xl border ${
          beoordeling.conditieKlasse === 'A' ? 'bg-green-50 border-green-200' :
          beoordeling.conditieKlasse === 'B' ? 'bg-blue-50 border-blue-200' :
          beoordeling.conditieKlasse === 'C' ? 'bg-yellow-50 border-yellow-200' :
          'bg-red-50 border-red-200'
        }`}>
          <p className="text-sm text-gray-600">Conditie Klasse</p>
          <p className="text-xl font-bold mt-1">Klasse {beoordeling.conditieKlasse}</p>
          <p className="text-xs mt-2">{conditieInfo.naam}</p>
        </div>
        
        {/* EXC */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-gray-600">Max. Uitvoeringsklasse</p>
          <p className="text-xl font-bold mt-1">{beoordeling.maximaleUitvoeringsKlasse}</p>
          <p className="text-xs mt-2">{excInfo.eisenNiveau}</p>
        </div>
        
        {/* CC */}
        <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
          <p className="text-sm text-gray-600">Max. Gevolgklasse</p>
          <p className="text-xl font-bold mt-1">{beoordeling.maximaleGevolgKlasse}</p>
          <p className="text-xs mt-2">{ccInfo.mensenrisico} risico</p>
        </div>
      </div>
      
      {/* Route details - Expandable */}
      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => toggleExpand('route')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-gray-400" />
            <span className="font-semibold">Route Details & Toelichting</span>
          </div>
          {expanded.includes('route') ? <ChevronUp /> : <ChevronDown />}
        </button>
        
        {expanded.includes('route') && (
          <div className="p-6 space-y-4">
            <p className="text-gray-700">{beoordeling.routeToelichting}</p>
            <p className="text-gray-700">{beoordeling.conditieToelichting}</p>
            
            {beoordeling.beperkingen.length > 0 && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  Beperkingen
                </h4>
                <ul className="mt-2 space-y-1">
                  {beoordeling.beperkingen.map((b, i) => (
                    <li key={i} className="text-sm text-gray-700">• {b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Vereiste testen */}
      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => toggleExpand('testen')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Beaker className="w-5 h-5 text-gray-400" />
            <span className="font-semibold">
              Vereiste Testen ({beoordeling.vereisteTests.length})
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              €{beoordeling.geschatteTestKosten} • {Math.round(beoordeling.geschatteTestTijd / 60)}u
            </span>
            {expanded.includes('testen') ? <ChevronUp /> : <ChevronDown />}
          </div>
        </button>
        
        {expanded.includes('testen') && (
          <div className="p-6">
            <div className="space-y-3">
              {beoordeling.vereisteTests.map(testType => {
                const spec = TEST_SPECIFICATIES[testType]
                return (
                  <div key={testType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${spec.destructief ? 'bg-red-500' : 'bg-green-500'}`} />
                      <div>
                        <p className="font-medium">{spec.naam}</p>
                        <p className="text-xs text-gray-500">{spec.norm}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-medium">€{spec.kostenIndicatie}</p>
                      <p className="text-xs text-gray-500">{spec.tijdIndicatie} min</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      
      {/* Kosten & Opbrengsten */}
      <div className="border rounded-xl overflow-hidden">
        <button
          onClick={() => toggleExpand('kosten')}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Euro className="w-5 h-5 text-gray-400" />
            <span className="font-semibold">Kosten & Waardebepaling</span>
          </div>
          {expanded.includes('kosten') ? <ChevronUp /> : <ChevronDown />}
        </button>
        
        {expanded.includes('kosten') && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Kosten */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">Certificeringskosten</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Testen</span>
                    <span>€{beoordeling.geschatteTestKosten}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Beoordeling & documentatie</span>
                    <span>€{beoordeling.certificeringsKosten - beoordeling.geschatteTestKosten}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Totaal kosten</span>
                    <span>€{beoordeling.certificeringsKosten}</span>
                  </div>
                </div>
              </div>
              
              {/* Waarde */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700">Waardebepaling</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gewicht</span>
                    <span>{element.gewicht} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Prijsmultiplier</span>
                    <span>{(beoordeling.prijsMultiplier * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2 text-green-600">
                    <span>Geschatte waarde</span>
                    <span>€{beoordeling.geschatteVerkoopwaarde}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Netto resultaat */}
            <div className={`mt-6 p-4 rounded-xl ${
              beoordeling.geschatteVerkoopwaarde - beoordeling.certificeringsKosten > 0
                ? 'bg-green-100'
                : 'bg-red-100'
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Netto resultaat (waarde - kosten)</span>
                <span className={`text-xl font-bold ${
                  beoordeling.geschatteVerkoopwaarde - beoordeling.certificeringsKosten > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}>
                  €{beoordeling.geschatteVerkoopwaarde - beoordeling.certificeringsKosten}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Materiaal informatie */}
      <div className="p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Geschatte staalsoort</p>
            <p className="font-semibold">{beoordeling.geschatteStaalsoort}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm ${
            beoordeling.staalsoortBetrouwbaarheid === 'hoog' 
              ? 'bg-green-100 text-green-700' 
              : beoordeling.staalsoortBetrouwbaarheid === 'middel'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-orange-100 text-orange-700'
          }`}>
            Betrouwbaarheid: {beoordeling.staalsoortBetrouwbaarheid}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onTerug}
          className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          ← Terug naar Inspectie
        </button>
        {beoordeling.certificeerbaar && (
          <button
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FileCheck className="w-5 h-5" />
            Certificaat Genereren
          </button>
        )}
      </div>
    </div>
  )
}

export default NTA8713Certificering
