/**
 * Notificatie Dropdown Component
 * Toont recente notificaties in een dropdown
 */

import { useState, useRef, useEffect } from 'react'
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useNotificaties } from '../context/AppContext'

export default function NotificatieDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { items, ongelezen, markeerGelezen, markeerAllesGelezen } = useNotificaties()
  
  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />
      default: return <Info className="w-5 h-5 text-blue-500" />
    }
  }
  
  const formatTijd = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minuten = Math.floor(diff / 60000)
    const uren = Math.floor(diff / 3600000)
    const dagen = Math.floor(diff / 86400000)
    
    if (minuten < 1) return 'Zojuist'
    if (minuten < 60) return `${minuten} min geleden`
    if (uren < 24) return `${uren} uur geleden`
    return `${dagen} dagen geleden`
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {ongelezen > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {ongelezen > 9 ? '9+' : ongelezen}
          </span>
        )}
      </button>
      
      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notificaties</h3>
            {ongelezen > 0 && (
              <button
                onClick={markeerAllesGelezen}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Alles gelezen
              </button>
            )}
          </div>
          
          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Geen notificaties</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.slice().reverse().slice(0, 10).map((notificatie) => (
                  <div
                    key={notificatie.id}
                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notificatie.gelezen ? 'bg-blue-50/50' : ''
                    }`}
                    onClick={() => markeerGelezen(notificatie.id)}
                  >
                    <div className="flex items-start gap-3">
                      {getIcon(notificatie.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {notificatie.titel}
                          </p>
                          {!notificatie.gelezen && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {notificatie.bericht}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTijd(notificatie.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Footer */}
          {items.length > 10 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
              <button className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium">
                Bekijk alle notificaties
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
