/**
 * Flow Voortgang Component
 * Toont de voortgang van een gebouw door alle fases
 */

import { Link } from 'react-router-dom'
import {
  Building2,
  Calculator,
  FileCheck,
  Scissors,
  Package,
  Wrench,
  Factory,
  ShoppingCart,
  Truck,
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronRight,
  Play
} from 'lucide-react'

export type StapStatus = 'voltooid' | 'actief' | 'wachtend' | 'geblokkeerd'

export interface FlowStap {
  id: string
  naam: string
  beschrijving: string
  icon: any
  status: StapStatus
  fase: 1 | 2 | 3
  link?: string
  progress?: number // 0-100
  metadata?: {
    label: string
    waarde: string
  }[]
}

interface Props {
  gebouwId: string
  gebouwNaam: string
  stappen: FlowStap[]
  compact?: boolean
}

const STATUS_CONFIG = {
  voltooid: { icon: CheckCircle, kleur: 'text-green-500', bgKleur: 'bg-green-100', borderKleur: 'border-green-500' },
  actief: { icon: Play, kleur: 'text-blue-500', bgKleur: 'bg-blue-100', borderKleur: 'border-blue-500' },
  wachtend: { icon: Circle, kleur: 'text-gray-400', bgKleur: 'bg-gray-100', borderKleur: 'border-gray-300' },
  geblokkeerd: { icon: AlertCircle, kleur: 'text-red-500', bgKleur: 'bg-red-100', borderKleur: 'border-red-300' },
}

const FASE_KLEUREN = {
  1: { text: 'text-green-600', bg: 'bg-green-500', light: 'bg-green-50', border: 'border-green-200' },
  2: { text: 'text-amber-600', bg: 'bg-amber-500', light: 'bg-amber-50', border: 'border-amber-200' },
  3: { text: 'text-purple-600', bg: 'bg-purple-500', light: 'bg-purple-50', border: 'border-purple-200' },
}

export default function FlowVoortgang({ gebouwNaam, stappen, compact = false }: Props) {
  const voltooideStappen = stappen.filter(s => s.status === 'voltooid').length
  const totaalStappen = stappen.length
  const voortgangPercentage = Math.round((voltooideStappen / totaalStappen) * 100)
  
  // Groepeer stappen per fase
  const fases = [
    { nummer: 1, naam: 'Oogsten', stappen: stappen.filter(s => s.fase === 1) },
    { nummer: 2, naam: 'Verwerken', stappen: stappen.filter(s => s.fase === 2) },
    { nummer: 3, naam: 'Verkopen', stappen: stappen.filter(s => s.fase === 3) },
  ]
  
  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-gray-900">{gebouwNaam}</h4>
              <p className="text-sm text-gray-500">{voltooideStappen}/{totaalStappen} stappen voltooid</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-indigo-600">{voortgangPercentage}%</p>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
          {fases.map(fase => {
            const faseVoltooid = fase.stappen.filter(s => s.status === 'voltooid').length
            const faseWidth = (fase.stappen.length / totaalStappen) * 100
            const completedWidth = (faseVoltooid / fase.stappen.length) * 100
            
            return (
              <div 
                key={fase.nummer}
                className="relative h-full"
                style={{ width: `${faseWidth}%` }}
              >
                <div 
                  className={`h-full ${FASE_KLEUREN[fase.nummer as keyof typeof FASE_KLEUREN].bg} transition-all duration-500`}
                  style={{ width: `${completedWidth}%` }}
                />
              </div>
            )
          })}
        </div>
        
        {/* Fase indicators */}
        <div className="flex justify-between mt-2">
          {fases.map(fase => {
            const faseVoltooid = fase.stappen.filter(s => s.status === 'voltooid').length
            const faseActief = fase.stappen.some(s => s.status === 'actief')
            
            return (
              <div key={fase.nummer} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${
                  faseVoltooid === fase.stappen.length 
                    ? FASE_KLEUREN[fase.nummer as keyof typeof FASE_KLEUREN].bg
                    : faseActief 
                      ? 'bg-blue-500 animate-pulse'
                      : 'bg-gray-300'
                }`} />
                <span className={`text-xs ${
                  faseActief 
                    ? FASE_KLEUREN[fase.nummer as keyof typeof FASE_KLEUREN].text + ' font-medium'
                    : 'text-gray-500'
                }`}>
                  {fase.naam}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{gebouwNaam}</h3>
              <p className="text-gray-400">Flow Voortgang</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold">{voortgangPercentage}%</p>
            <p className="text-gray-400 text-sm">{voltooideStappen} van {totaalStappen} stappen</p>
          </div>
        </div>
        
        {/* Overall progress */}
        <div className="mt-4 h-3 bg-gray-700 rounded-full overflow-hidden flex">
          {fases.map(fase => {
            const faseVoltooid = fase.stappen.filter(s => s.status === 'voltooid').length
            const faseWidth = (fase.stappen.length / totaalStappen) * 100
            const completedWidth = (faseVoltooid / fase.stappen.length) * 100
            
            return (
              <div 
                key={fase.nummer}
                className="relative h-full"
                style={{ width: `${faseWidth}%` }}
              >
                <div 
                  className={`h-full ${FASE_KLEUREN[fase.nummer as keyof typeof FASE_KLEUREN].bg} transition-all duration-500`}
                  style={{ width: `${completedWidth}%` }}
                />
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Stappen per fase */}
      <div className="p-6 space-y-6">
        {fases.map(fase => (
          <div key={fase.nummer}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-6 h-6 rounded-full ${FASE_KLEUREN[fase.nummer as keyof typeof FASE_KLEUREN].bg} text-white text-sm font-bold flex items-center justify-center`}>
                {fase.nummer}
              </span>
              <h4 className={`font-bold ${FASE_KLEUREN[fase.nummer as keyof typeof FASE_KLEUREN].text}`}>
                Fase {fase.nummer}: {fase.naam}
              </h4>
              <span className="text-sm text-gray-500">
                ({fase.stappen.filter(s => s.status === 'voltooid').length}/{fase.stappen.length})
              </span>
            </div>
            
            <div className={`rounded-xl p-3 ${FASE_KLEUREN[fase.nummer as keyof typeof FASE_KLEUREN].light} ${FASE_KLEUREN[fase.nummer as keyof typeof FASE_KLEUREN].border} border`}>
              <div className="grid gap-2">
                {fase.stappen.map((stap) => {
                  const StatusIcon = STATUS_CONFIG[stap.status].icon
                  
                  return (
                    <Link
                      key={stap.id}
                      to={stap.link || '#'}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-white border transition-all ${
                        stap.status === 'actief' 
                          ? 'border-blue-300 shadow-md' 
                          : stap.status === 'voltooid'
                            ? 'border-green-200'
                            : 'border-gray-200 opacity-75'
                      } ${stap.link ? 'hover:shadow-lg hover:scale-[1.01]' : 'cursor-default'}`}
                    >
                      {/* Status icon */}
                      <div className={`w-8 h-8 rounded-full ${STATUS_CONFIG[stap.status].bgKleur} flex items-center justify-center`}>
                        <StatusIcon className={`w-4 h-4 ${STATUS_CONFIG[stap.status].kleur}`} />
                      </div>
                      
                      {/* Stap icon */}
                      <div className={`w-10 h-10 rounded-lg ${
                        stap.status === 'voltooid' 
                          ? 'bg-gray-100' 
                          : stap.status === 'actief'
                            ? FASE_KLEUREN[stap.fase].bg + ' text-white'
                            : 'bg-gray-100'
                      } flex items-center justify-center`}>
                        <stap.icon className={`w-5 h-5 ${
                          stap.status === 'actief' ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1">
                        <p className={`font-medium ${stap.status === 'wachtend' ? 'text-gray-500' : 'text-gray-900'}`}>
                          {stap.naam}
                        </p>
                        <p className="text-xs text-gray-500">{stap.beschrijving}</p>
                      </div>
                      
                      {/* Progress of metadata */}
                      {stap.status === 'actief' && stap.progress !== undefined && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600">{stap.progress}%</p>
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full mt-1">
                            <div 
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${stap.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {stap.status === 'voltooid' && stap.metadata && (
                        <div className="text-right">
                          {stap.metadata.map((m, i) => (
                            <p key={i} className="text-xs text-gray-500">
                              <span className="font-medium">{m.waarde}</span> {m.label}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      {stap.link && (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Helper functie om mock stappen te genereren
export function genereerMockStappen(gebouwId: string): FlowStap[] {
  return [
    { id: '1', naam: 'Gebouw Selectie', beschrijving: 'Gebouw geselecteerd voor ontmanteling', icon: Building2, status: 'voltooid', fase: 1, link: `/gebouwen`, metadata: [{ label: 'elementen', waarde: '53' }] },
    { id: '2', naam: 'Constructie Analyse', beschrijving: 'Analyse van constructie elementen', icon: Calculator, status: 'voltooid', fase: 1, link: `/constructie-analyse/${gebouwId}`, metadata: [{ label: 'ton staal', waarde: '41.5' }] },
    { id: '3', naam: 'NTA 8713 Certificering', beschrijving: 'Europese certificering gestart', icon: FileCheck, status: 'actief', fase: 1, link: `/nta8713/${gebouwId}`, progress: 65 },
    { id: '4', naam: 'Demontage Planning', beschrijving: 'Plan demontage volgorde', icon: Scissors, status: 'wachtend', fase: 1, link: `/oogst-analyse/${gebouwId}` },
    { id: '5', naam: 'Voorraad Opname', beschrijving: 'Registreer gedemonteerde elementen', icon: Package, status: 'wachtend', fase: 2, link: '/voorraad' },
    { id: '6', naam: 'Bewerking', beschrijving: 'Stralen, zagen, schoonmaken', icon: Wrench, status: 'wachtend', fase: 2, link: `/bewerkingsplan/${gebouwId}` },
    { id: '7', naam: 'Productie', beschrijving: 'Productie en keuring', icon: Factory, status: 'wachtend', fase: 2, link: '/productie-3d' },
    { id: '8', naam: 'Webshop', beschrijving: 'Publiceer in webshop', icon: ShoppingCart, status: 'wachtend', fase: 3, link: '/shop' },
    { id: '9', naam: 'Levering', beschrijving: 'Verzend naar klant', icon: Truck, status: 'wachtend', fase: 3, link: '/leveringen' },
  ]
}
