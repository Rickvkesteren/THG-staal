import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Warehouse,
  GitCompare,
  ShoppingCart,
  FileCheck,
  Ruler,
  Menu,
  X,
  Recycle,
  FileBox,
  Box,
  ArrowRightLeft,
  Factory,
  Truck,
  Layers,
  ChevronRight,
  Play,
  Calculator,
  Wrench,
  Workflow
} from 'lucide-react'
import { useState } from 'react'
import NotificatieDropdown from './NotificatieDropdown'
import WinkelwagenSidebar from './WinkelwagenSidebar'
import FlowBreadcrumbs from './FlowBreadcrumbs'
import FlowActies from './FlowActies'
import { useWinkelwagen } from '../context/AppContext'

// Fase kleuren
const FASE_KLEUREN = {
  1: { bg: 'bg-green-600', text: 'text-green-400', light: 'bg-green-500/10' },
  2: { bg: 'bg-amber-600', text: 'text-amber-400', light: 'bg-amber-500/10' },
  3: { bg: 'bg-purple-600', text: 'text-purple-400', light: 'bg-purple-500/10' },
}

// Gegroepeerde navigatie per fase
interface NavItem {
  name: string
  to: string
  icon: typeof LayoutDashboard
  accent?: boolean
}

interface NavGroup {
  title: string
  fase: number
  beschrijving?: string
  items: NavItem[]
}

const navigationGroups: NavGroup[] = [
  {
    title: 'OVERZICHT',
    fase: 0,
    items: [
      { name: 'Flow Dashboard', to: '/', icon: ArrowRightLeft, accent: true },
      { name: 'Statistieken', to: '/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'FASE 1: OOGSTEN',
    fase: 1,
    beschrijving: 'Gebouw → Analyse → Ontmanteling',
    items: [
      { name: '1. Gebouwen', to: '/gebouwen', icon: Building2 },
      { name: '2. Constructie Analyse', to: '/constructie-analyse/industriehal-001', icon: Calculator },
      { name: '3. NTA 8713 Certificering', to: '/nta8713/industriehal-001', icon: FileCheck },
      { name: '4. 3D Viewer + Oogstplan', to: '/gebouw-3d', icon: Layers },
    ]
  },
  {
    title: 'FASE 2: VERWERKEN',
    fase: 2,
    beschrijving: 'Fabriek → Bewerken → Matchen',
    items: [
      { name: '1. Voorraad', to: '/voorraad', icon: Warehouse },
      { name: '2. Bewerkingsplan', to: '/bewerkingsplan/industriehal-001', icon: Wrench },
      { name: '3. Productie Stroom', to: '/productie-stroom', icon: Workflow },
      { name: '4. Productie 3D', to: '/productie-3d', icon: Factory },
      { name: '5. Matching 3D', to: '/matching-3d', icon: GitCompare },
    ]
  },
  {
    title: 'FASE 3: VERKOPEN',
    fase: 3,
    beschrijving: 'Schone balken → Webshop → Levering',
    items: [
      { name: '1. Catalogus', to: '/matching', icon: GitCompare },
      { name: '2. Webshop', to: '/shop', icon: ShoppingCart },
      { name: '3. Leveringen', to: '/leveringen', icon: Truck },
    ]
  },
  {
    title: 'TOOLS & DATA',
    fase: 0,
    items: [
      { name: 'Profielen DB', to: '/profielen', icon: Ruler },
      { name: 'CAD Import', to: '/cad-import', icon: FileBox },
      { name: '2D → 3D Import', to: '/pdf-import', icon: Layers },
      { name: '3D Demo', to: '/demo-3d', icon: Box },
    ]
  }
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [winkelwagenOpen, setWinkelwagenOpen] = useState(false)
  const location = useLocation()
  const { aantal: winkelwagenAantal } = useWinkelwagen()
  
  // Bepaal huidige fase
  const getCurrentFase = () => {
    for (const group of navigationGroups) {
      if (group.items.some(item => location.pathname === item.to || location.pathname.startsWith(item.to + '/'))) {
        return group.fase
      }
    }
    return 0
  }
  const currentFase = getCurrentFase()

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 transform transition-transform duration-200
          lg:relative lg:translate-x-0 overflow-y-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <NavLink 
          to="/"
          className="flex items-center gap-3 px-6 py-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10 hover:bg-gray-800/50 transition-colors"
        >
          <div className="w-11 h-11 bg-gradient-to-br from-green-500 via-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Recycle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">Staal Hergebruik</h1>
            <p className="text-gray-400 text-xs">Circulair Ontmantelingsplan</p>
          </div>
        </NavLink>
        
        {/* Flow Progress Indicator */}
        <div className="px-4 py-3 border-b border-gray-800">
          <div className="flex items-center justify-between gap-1">
            {[1, 2, 3].map((fase) => (
              <div 
                key={fase}
                className={`flex-1 h-2 rounded-full transition-all ${
                  currentFase === fase 
                    ? FASE_KLEUREN[fase as keyof typeof FASE_KLEUREN].bg
                    : currentFase > fase 
                      ? 'bg-green-500'
                      : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span className={currentFase === 1 ? 'text-green-400 font-medium' : 'text-gray-500'}>Oogsten</span>
            <span className={currentFase === 2 ? 'text-amber-400 font-medium' : 'text-gray-500'}>Verwerken</span>
            <span className={currentFase === 3 ? 'text-purple-400 font-medium' : 'text-gray-500'}>Verkopen</span>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="mt-2 px-3 pb-20">
          {navigationGroups.map((group) => {
            const faseKleur = group.fase > 0 ? FASE_KLEUREN[group.fase as keyof typeof FASE_KLEUREN] : null
            
            return (
              <div key={group.title} className="mb-3">
                <div className="px-3 mb-1.5">
                  <h3 className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-2 ${
                    faseKleur ? faseKleur.text : 'text-gray-500'
                  }`}>
                    {group.fase > 0 && (
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-white text-xs ${faseKleur?.bg}`}>
                        {group.fase}
                      </span>
                    )}
                    {group.title}
                  </h3>
                  {group.beschrijving && (
                    <p className="text-gray-600 text-xs mt-0.5">{group.beschrijving}</p>
                  )}
                </div>
                
                <div className={`rounded-lg ${faseKleur ? faseKleur.light : ''} p-1`}>
                  {group.items.map((item, idx) => (
                    <NavLink
                      key={item.name}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 transition-all ${
                          isActive
                            ? faseKleur 
                              ? `${faseKleur.bg} text-white shadow-lg` 
                              : 'bg-blue-600 text-white shadow-lg'
                            : item.accent
                              ? 'text-white bg-gray-800 hover:bg-gray-700'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="font-medium text-sm flex-1">{item.name}</span>
                      {idx < group.items.length - 1 && group.fase > 0 && (
                        <ChevronRight className="w-3 h-3 opacity-40" />
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="fixed bottom-0 left-0 w-72 p-3 border-t border-gray-800 bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-xs">v0.3.0 - Flow Edition</p>
            <div className="flex items-center gap-1 text-xs text-green-400">
              <Play className="w-3 h-3" />
              Live
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:px-6 sticky top-0 z-30">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          {/* Current Fase Badge */}
          {currentFase > 0 && (
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full ${
              FASE_KLEUREN[currentFase as keyof typeof FASE_KLEUREN].light
            }`}>
              <div className={`w-2 h-2 rounded-full ${FASE_KLEUREN[currentFase as keyof typeof FASE_KLEUREN].bg}`} />
              <span className={`text-sm font-medium ${FASE_KLEUREN[currentFase as keyof typeof FASE_KLEUREN].text.replace('text-', 'text-').replace('-400', '-700')}`}>
                Fase {currentFase}: {currentFase === 1 ? 'Oogsten' : currentFase === 2 ? 'Verwerken' : 'Verkopen'}
              </span>
            </div>
          )}
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-3">
            {/* Leveringen indicator */}
            <span className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm">
              <Truck className="w-4 h-4" />
              3 leveringen
            </span>
            
            {/* Notificaties */}
            <NotificatieDropdown />
            
            {/* Winkelwagen */}
            <button
              onClick={() => setWinkelwagenOpen(true)}
              className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {winkelwagenAantal > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {winkelwagenAantal > 9 ? '9+' : winkelwagenAantal}
                </span>
              )}
            </button>
            
            {/* Status */}
            <span className="hidden sm:flex items-center gap-2 text-sm text-gray-600">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Online
            </span>
          </div>
        </header>

        {/* Breadcrumbs */}
        <FlowBreadcrumbs />

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-gray-50">
          <Outlet />
        </main>
        
        {/* Floating Action Button */}
        <FlowActies />
      </div>
      
      {/* Winkelwagen Sidebar */}
      <WinkelwagenSidebar 
        isOpen={winkelwagenOpen} 
        onClose={() => setWinkelwagenOpen(false)} 
      />
    </div>
  )
}
