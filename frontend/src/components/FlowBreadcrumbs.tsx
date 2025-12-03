/**
 * Flow Breadcrumbs Component
 * Toont waar je bent in de flow en maakt navigatie makkelijker
 */

import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home, Building2, Scissors, Factory, ShoppingCart, FileCheck, Wrench, Package, Layers, Calculator, Cpu, Workflow, Truck, Warehouse } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  path: string
  icon?: any
  fase?: number
}

// Route naar breadcrumb mapping
const ROUTE_CONFIG: Record<string, BreadcrumbItem> = {
  '/': { label: 'Dashboard', path: '/', icon: Home },
  '/dashboard': { label: 'Statistieken', path: '/dashboard', icon: Home },
  '/gebouwen': { label: 'Gebouwen', path: '/gebouwen', icon: Building2, fase: 1 },
  '/constructie-analyse': { label: 'Constructie Analyse', path: '/constructie-analyse', icon: Calculator, fase: 1 },
  '/nta8713': { label: 'NTA 8713 Certificering', path: '/nta8713', icon: FileCheck, fase: 1 },
  '/gebouw-analyse': { label: 'Business Case', path: '/gebouw-analyse', icon: Calculator, fase: 1 },
  '/gebouw-3d': { label: '3D Viewer', path: '/gebouw-3d', icon: Layers, fase: 1 },
  '/oogst-planning': { label: 'Oogst Planning', path: '/oogst-planning', icon: Scissors, fase: 1 },
  '/oogst-analyse': { label: 'Oogst Analyse', path: '/oogst-analyse', icon: Cpu, fase: 1 },
  '/operator-demontage': { label: 'Operator Demontage', path: '/operator-demontage', icon: Scissors, fase: 1 },
  '/voorraad': { label: 'Voorraad', path: '/voorraad', icon: Warehouse, fase: 2 },
  '/bewerkingsplan': { label: 'Bewerkingsplan', path: '/bewerkingsplan', icon: Wrench, fase: 2 },
  '/productie-3d': { label: 'Productie 3D', path: '/productie-3d', icon: Factory, fase: 2 },
  '/productie-stroom': { label: 'Productie Stroom', path: '/productie-stroom', icon: Workflow, fase: 2 },
  '/matching': { label: 'Matching', path: '/matching', icon: Package, fase: 2 },
  '/matching-3d': { label: 'Matching 3D', path: '/matching-3d', icon: Layers, fase: 2 },
  '/shop': { label: 'Webshop', path: '/shop', icon: ShoppingCart, fase: 3 },
  '/business-case': { label: 'Business Case', path: '/business-case', icon: Calculator, fase: 3 },
  '/certificering': { label: 'Certificering', path: '/certificering', icon: FileCheck, fase: 3 },
  '/leveringen': { label: 'Leveringen', path: '/leveringen', icon: Truck, fase: 3 },
}

const FASE_KLEUREN = {
  1: 'text-green-600 bg-green-50',
  2: 'text-amber-600 bg-amber-50',
  3: 'text-purple-600 bg-purple-50',
}

const FASE_NAMEN = {
  1: 'Oogsten',
  2: 'Verwerken',
  3: 'Verkopen',
}

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { label: 'Home', path: '/', icon: Home }
  ]
  
  // Parse het pad
  const segments = pathname.split('/').filter(Boolean)
  
  if (segments.length === 0) return breadcrumbs
  
  // Check voor bekende routes
  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`
    
    // Check of het een bekende route is (zonder ID)
    const basePath = Object.keys(ROUTE_CONFIG).find(route => 
      currentPath.startsWith(route) && route !== '/'
    )
    
    if (basePath && ROUTE_CONFIG[basePath]) {
      const config = ROUTE_CONFIG[basePath]
      breadcrumbs.push({
        ...config,
        path: currentPath
      })
      break // We voegen maar één niveau toe voor nu
    }
  }
  
  // Als er een ID in het pad zit, voeg die toe als specifiek item
  if (segments.length > 1 && segments[1]) {
    const id = segments[1]
    // Converteer ID naar leesbare naam
    const readableId = id
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
    
    if (!readableId.match(/^\d+$/)) { // Niet als het puur een nummer is
      breadcrumbs.push({
        label: readableId,
        path: pathname
      })
    }
  }
  
  return breadcrumbs
}

export default function FlowBreadcrumbs() {
  const location = useLocation()
  const breadcrumbs = getBreadcrumbs(location.pathname)
  
  // Bepaal huidige fase
  const currentConfig = Object.values(ROUTE_CONFIG).find(config => 
    location.pathname.startsWith(config.path) && config.path !== '/'
  )
  const currentFase = currentConfig?.fase
  
  if (breadcrumbs.length <= 1) return null
  
  return (
    <div className="bg-white border-b border-gray-200 px-4 lg:px-6 py-2">
      <div className="flex items-center justify-between">
        <nav className="flex items-center gap-1 text-sm overflow-x-auto">
          {breadcrumbs.map((item, index) => (
            <div key={item.path} className="flex items-center gap-1 whitespace-nowrap">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              {index === breadcrumbs.length - 1 ? (
                <span className="flex items-center gap-1.5 font-medium text-gray-900">
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>
        
        {/* Fase badge */}
        {currentFase && (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${FASE_KLEUREN[currentFase as keyof typeof FASE_KLEUREN]}`}>
            <span className="w-2 h-2 rounded-full bg-current" />
            Fase {currentFase}: {FASE_NAMEN[currentFase as keyof typeof FASE_NAMEN]}
          </div>
        )}
      </div>
    </div>
  )
}
