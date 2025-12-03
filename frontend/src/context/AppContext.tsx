/**
 * App Context - Globale State Management
 * Centrale state voor het hele systeem
 */

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { CADElement } from '../types'
import { MOCK_GEBOUWEN, type MockGebouw } from '../data/mockBuildings'

// Winkelwagen item
export interface WinkelwagenItem {
  elementId: string
  profielNaam: string
  lengte: number
  gewicht: number
  prijs: number
  aantal: number
  gecertificeerd: boolean
}

// Notificatie
export interface Notificatie {
  id: string
  type: 'success' | 'warning' | 'error' | 'info'
  titel: string
  bericht: string
  timestamp: Date
  gelezen: boolean
}

// Flow fase voor navigatie
export type FlowFase = 'oogsten' | 'verwerken' | 'verkopen'

// Context state
interface AppState {
  // Actieve gebouw selectie
  actieveGebouwId: string | null
  actieveElementId: string | null
  
  // Winkelwagen
  winkelwagen: WinkelwagenItem[]
  
  // Favorieten
  favorieten: string[]
  
  // Notificaties
  notificaties: Notificatie[]
  ongelezen: number
  
  // Flow tracking
  huidigeCase: FlowFase
  
  // UI state
  sidebarOpen: boolean
  darkMode: boolean
}

// Context actions
interface AppActions {
  // Gebouw selectie
  selecteerGebouw: (id: string | null) => void
  selecteerElement: (id: string | null) => void
  
  // Winkelwagen
  voegToeAanWinkelwagen: (item: Omit<WinkelwagenItem, 'aantal'>) => void
  verwijderVanWinkelwagen: (elementId: string) => void
  updateAantal: (elementId: string, aantal: number) => void
  leegWinkelwagen: () => void
  
  // Favorieten
  toggleFavoriet: (elementId: string) => void
  
  // Notificaties
  voegNotificatieToe: (notificatie: Omit<Notificatie, 'id' | 'timestamp' | 'gelezen'>) => void
  markeerGelezen: (id: string) => void
  markeerAllesGelezen: () => void
  
  // Flow
  setFlowFase: (fase: FlowFase) => void
  
  // UI
  toggleSidebar: () => void
  toggleDarkMode: () => void
  
  // Helpers
  getGebouwById: (id: string) => MockGebouw | undefined
  getElementById: (gebouwId: string, elementId: string) => CADElement | undefined
  
  // Berekeningen
  winkelwagenTotaal: number
  winkelwagenAantal: number
}

type AppContextType = AppState & AppActions

const AppContext = createContext<AppContextType | null>(null)

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  // State
  const [actieveGebouwId, setActieveGebouwId] = useState<string | null>(null)
  const [actieveElementId, setActieveElementId] = useState<string | null>(null)
  const [winkelwagen, setWinkelwagen] = useState<WinkelwagenItem[]>([])
  const [favorieten, setFavorieten] = useState<string[]>([])
  const [notificaties, setNotificaties] = useState<Notificatie[]>([
    {
      id: 'n1',
      type: 'success',
      titel: 'Welkom!',
      bericht: 'Welkom bij het Staal Hergebruik Systeem',
      timestamp: new Date(),
      gelezen: false
    }
  ])
  const [huidigeCase, setHuidigeCase] = useState<FlowFase>('oogsten')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  
  // Actions
  const selecteerGebouw = useCallback((id: string | null) => {
    setActieveGebouwId(id)
    setActieveElementId(null)
  }, [])
  
  const selecteerElement = useCallback((id: string | null) => {
    setActieveElementId(id)
  }, [])
  
  const voegToeAanWinkelwagen = useCallback((item: Omit<WinkelwagenItem, 'aantal'>) => {
    setWinkelwagen(prev => {
      const bestaand = prev.find(i => i.elementId === item.elementId)
      if (bestaand) {
        return prev.map(i => 
          i.elementId === item.elementId 
            ? { ...i, aantal: i.aantal + 1 }
            : i
        )
      }
      return [...prev, { ...item, aantal: 1 }]
    })
    
    // Notificatie
    setNotificaties(prev => [...prev, {
      id: `n-${Date.now()}`,
      type: 'success',
      titel: 'Toegevoegd aan winkelwagen',
      bericht: `${item.profielNaam} (${item.lengte}mm) toegevoegd`,
      timestamp: new Date(),
      gelezen: false
    }])
  }, [])
  
  const verwijderVanWinkelwagen = useCallback((elementId: string) => {
    setWinkelwagen(prev => prev.filter(i => i.elementId !== elementId))
  }, [])
  
  const updateAantal = useCallback((elementId: string, aantal: number) => {
    if (aantal <= 0) {
      verwijderVanWinkelwagen(elementId)
      return
    }
    setWinkelwagen(prev => prev.map(i => 
      i.elementId === elementId ? { ...i, aantal } : i
    ))
  }, [verwijderVanWinkelwagen])
  
  const leegWinkelwagen = useCallback(() => {
    setWinkelwagen([])
  }, [])
  
  const toggleFavoriet = useCallback((elementId: string) => {
    setFavorieten(prev => 
      prev.includes(elementId) 
        ? prev.filter(id => id !== elementId)
        : [...prev, elementId]
    )
  }, [])
  
  const voegNotificatieToe = useCallback((notificatie: Omit<Notificatie, 'id' | 'timestamp' | 'gelezen'>) => {
    setNotificaties(prev => [...prev, {
      ...notificatie,
      id: `n-${Date.now()}`,
      timestamp: new Date(),
      gelezen: false
    }])
  }, [])
  
  const markeerGelezen = useCallback((id: string) => {
    setNotificaties(prev => prev.map(n => 
      n.id === id ? { ...n, gelezen: true } : n
    ))
  }, [])
  
  const markeerAllesGelezen = useCallback(() => {
    setNotificaties(prev => prev.map(n => ({ ...n, gelezen: true })))
  }, [])
  
  const setFlowFase = useCallback((fase: FlowFase) => {
    setHuidigeCase(fase)
  }, [])
  
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev)
  }, [])
  
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev)
  }, [])
  
  // Helpers
  const getGebouwById = useCallback((id: string) => {
    return MOCK_GEBOUWEN.find(g => g.id === id)
  }, [])
  
  const getElementById = useCallback((gebouwId: string, elementId: string) => {
    const gebouw = getGebouwById(gebouwId)
    return gebouw?.elementen.find(e => e.id === elementId)
  }, [getGebouwById])
  
  // Computed values
  const ongelezen = useMemo(() => 
    notificaties.filter(n => !n.gelezen).length
  , [notificaties])
  
  const winkelwagenTotaal = useMemo(() =>
    winkelwagen.reduce((sum, item) => sum + (item.prijs * item.aantal), 0)
  , [winkelwagen])
  
  const winkelwagenAantal = useMemo(() =>
    winkelwagen.reduce((sum, item) => sum + item.aantal, 0)
  , [winkelwagen])
  
  // Context value
  const value: AppContextType = {
    // State
    actieveGebouwId,
    actieveElementId,
    winkelwagen,
    favorieten,
    notificaties,
    ongelezen,
    huidigeCase,
    sidebarOpen,
    darkMode,
    
    // Actions
    selecteerGebouw,
    selecteerElement,
    voegToeAanWinkelwagen,
    verwijderVanWinkelwagen,
    updateAantal,
    leegWinkelwagen,
    toggleFavoriet,
    voegNotificatieToe,
    markeerGelezen,
    markeerAllesGelezen,
    setFlowFase,
    toggleSidebar,
    toggleDarkMode,
    getGebouwById,
    getElementById,
    
    // Computed
    winkelwagenTotaal,
    winkelwagenAantal
  }
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

// Hook om context te gebruiken
export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

// Specifieke hooks voor onderdelen
export function useWinkelwagen() {
  const { 
    winkelwagen, 
    voegToeAanWinkelwagen, 
    verwijderVanWinkelwagen, 
    updateAantal, 
    leegWinkelwagen,
    winkelwagenTotaal,
    winkelwagenAantal
  } = useApp()
  
  return {
    items: winkelwagen,
    voegToe: voegToeAanWinkelwagen,
    verwijder: verwijderVanWinkelwagen,
    updateAantal,
    leegmaken: leegWinkelwagen,
    totaal: winkelwagenTotaal,
    aantal: winkelwagenAantal
  }
}

export function useNotificaties() {
  const { 
    notificaties, 
    ongelezen, 
    voegNotificatieToe, 
    markeerGelezen, 
    markeerAllesGelezen 
  } = useApp()
  
  return {
    items: notificaties,
    ongelezen,
    voegToe: voegNotificatieToe,
    markeerGelezen,
    markeerAllesGelezen
  }
}

export function useFavorieten() {
  const { favorieten, toggleFavoriet } = useApp()
  
  return {
    items: favorieten,
    toggle: toggleFavoriet,
    isFavoriet: (id: string) => favorieten.includes(id)
  }
}
