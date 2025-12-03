/**
 * Winkelwagen Sidebar Component
 * Slide-out winkelwagen met checkout flow
 */

import { Link } from 'react-router-dom'
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  FileCheck,
  Truck,
  Package,
  ArrowRight
} from 'lucide-react'
import { useWinkelwagen } from '../context/AppContext'

interface WinkelwagenSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function WinkelwagenSidebar({ isOpen, onClose }: WinkelwagenSidebarProps) {
  const { items, verwijder, updateAantal, totaal, aantal, leegmaken } = useWinkelwagen()
  
  const verzendkosten = totaal > 1000 ? 0 : 75
  const btw = (totaal + verzendkosten) * 0.21
  const eindTotaal = totaal + verzendkosten + btw
  
  if (!isOpen) return null
  
  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900">Winkelwagen</h2>
            {aantal > 0 && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
                {aantal} items
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Je winkelwagen is leeg</h3>
            <p className="text-gray-500 mb-6">Voeg stalen balken toe om te bestellen</p>
            <Link
              to="/shop"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Naar webshop
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div 
                  key={item.elementId}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.profielNaam}</h4>
                      <p className="text-sm text-gray-500">
                        {item.lengte}mm • {item.gewicht}kg
                      </p>
                    </div>
                    <button 
                      onClick={() => verwijder(item.elementId)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {/* Aantal selector */}
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200">
                      <button 
                        onClick={() => updateAantal(item.elementId, item.aantal - 1)}
                        className="p-2 hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.aantal}</span>
                      <button 
                        onClick={() => updateAantal(item.elementId, item.aantal + 1)}
                        className="p-2 hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-bold text-gray-900">€{(item.prijs * item.aantal).toFixed(2)}</p>
                      <p className="text-xs text-gray-500">€{item.prijs.toFixed(2)} per stuk</p>
                    </div>
                  </div>
                  
                  {/* Certificaat badge */}
                  {item.gecertificeerd && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                      <FileCheck className="w-3.5 h-3.5" />
                      CE gecertificeerd
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {/* Summary */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotaal</span>
                  <span className="font-medium">€{totaal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Verzendkosten</span>
                  <span className={verzendkosten === 0 ? 'text-green-600 font-medium' : ''}>
                    {verzendkosten === 0 ? 'Gratis' : `€${verzendkosten.toFixed(2)}`}
                  </span>
                </div>
                {verzendkosten > 0 && (
                  <p className="text-xs text-gray-500">
                    Nog €{(1000 - totaal).toFixed(2)} voor gratis verzending
                  </p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">BTW (21%)</span>
                  <span>€{btw.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span>Totaal</span>
                  <span className="text-blue-600">€{eindTotaal.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  <CreditCard className="w-5 h-5" />
                  Afrekenen
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={leegmaken}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                  >
                    Leegmaken
                  </button>
                  <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-1.5">
                    <Truck className="w-4 h-4" />
                    Ophalen
                  </button>
                </div>
              </div>
              
              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <FileCheck className="w-4 h-4 text-green-500" />
                  CE Gecertificeerd
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Truck className="w-4 h-4 text-blue-500" />
                  Track & Trace
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
