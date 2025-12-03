import { Link } from 'react-router-dom'
import {
  Building2,
  Scissors,
  Wrench,
  ShoppingCart,
  FileCheck,
  ArrowRight,
  Database,
  Layers,
  TrendingUp,
  Package,
  Weight,
  Recycle,
  Euro,
  Activity,
  Calculator,
  Cpu,
  Workflow
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

// Mock data
const FLOW_STATS = {
  gebouwen: {
    actief: 3,
    gepland: 5,
    voltooid: 12
  },
  oogst: {
    inBewerking: 156,
    geoogst: 2340,
    totaalGewicht: 185000 // kg
  },
  verwerking: {
    wachtend: 89,
    inBewerking: 34,
    klaar: 1890
  },
  verkoop: {
    beschikbaar: 1650,
    verkocht: 890,
    omzet: 425000
  }
}

const RECENTE_ACTIVITEIT = [
  { id: 1, type: 'oogst', tekst: 'HEB 300 geoogst uit Industriehal Westpoort', tijd: '5 min geleden', status: 'success' },
  { id: 2, type: 'verwerking', tekst: 'IPE 360 schoonmaak voltooid', tijd: '12 min geleden', status: 'success' },
  { id: 3, type: 'verkoop', tekst: 'Order #2847 - 5x HEA 200 verzonden', tijd: '25 min geleden', status: 'success' },
  { id: 4, type: 'oogst', tekst: 'Demontage fase 3 gestart - Kantoorpand', tijd: '1 uur geleden', status: 'warning' },
  { id: 5, type: 'certificering', tekst: 'Certificaat gegenereerd: CERT-2024-1847', tijd: '2 uur geleden', status: 'success' },
]

const WEEKDATA = [
  { dag: 'Ma', geoogst: 45, verwerkt: 38, verkocht: 22 },
  { dag: 'Di', geoogst: 52, verwerkt: 45, verkocht: 35 },
  { dag: 'Wo', geoogst: 38, verwerkt: 42, verkocht: 28 },
  { dag: 'Do', geoogst: 65, verwerkt: 55, verkocht: 42 },
  { dag: 'Vr', geoogst: 48, verwerkt: 52, verkocht: 38 },
  { dag: 'Za', geoogst: 20, verwerkt: 25, verkocht: 15 },
  { dag: 'Zo', geoogst: 0, verwerkt: 12, verkocht: 8 },
]

const CONDITIE_VERDELING = [
  { name: 'Goed', value: 65, color: '#22c55e' },
  { name: 'Matig', value: 28, color: '#f59e0b' },
  { name: 'Slecht', value: 7, color: '#ef4444' },
]

// Flow Step Component
function FlowStep({ 
  nummer, 
  titel, 
  beschrijving, 
  icon: Icon, 
  kleur, 
  stats, 
  link,
  actief 
}: { 
  nummer: number
  titel: string
  beschrijving: string
  icon: any
  kleur: string
  stats: { label: string; waarde: string | number }[]
  link: string
  actief?: boolean
}) {
  return (
    <Link 
      to={link}
      className={`relative bg-gray-800 rounded-2xl p-6 border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${
        actief ? `border-${kleur}-500 shadow-lg shadow-${kleur}-500/20` : 'border-gray-700 hover:border-gray-600'
      }`}
      style={{ borderColor: actief ? kleur : undefined }}
    >
      {/* Nummer badge */}
      <div 
        className="absolute -top-3 -left-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
        style={{ backgroundColor: kleur }}
      >
        {nummer}
      </div>
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div 
          className="w-14 h-14 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${kleur}20` }}
        >
          <Icon className="w-7 h-7" style={{ color: kleur }} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white">{titel}</h3>
          <p className="text-sm text-gray-400">{beschrijving}</p>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, i) => (
          <div key={i} className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-gray-400">{stat.label}</p>
            <p className="text-lg font-bold text-white">{stat.waarde}</p>
          </div>
        ))}
      </div>
      
      {/* Arrow indicator */}
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 hidden xl:block">
        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </Link>
  )
}

// Stat Card
function StatCard({ label, waarde, icon: Icon, kleur, trend }: { 
  label: string
  waarde: string | number
  icon: any
  kleur: string
  trend?: { waarde: number; richting: 'up' | 'down' }
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${kleur}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: kleur }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${
            trend.richting === 'up' ? 'text-green-400' : 'text-red-400'
          }`}>
            <TrendingUp className={`w-4 h-4 ${trend.richting === 'down' ? 'rotate-180' : ''}`} />
            {trend.waarde}%
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-white">{waarde}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}

export default function FlowDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Recycle className="w-8 h-8 text-green-600" />
            Staal Hergebruik Systeem
          </h1>
          <p className="text-gray-500 mt-1">Circulaire staalverwerking van sloop tot verkoop</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/profielen"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Database className="w-4 h-4" />
            Profiel Database
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          label="Totaal Geoogst" 
          waarde={`${(FLOW_STATS.oogst.totaalGewicht / 1000).toFixed(0)} ton`}
          icon={Weight}
          kleur="#22c55e"
          trend={{ waarde: 12, richting: 'up' }}
        />
        <StatCard 
          label="In Verwerking" 
          waarde={FLOW_STATS.verwerking.inBewerking}
          icon={Wrench}
          kleur="#f59e0b"
        />
        <StatCard 
          label="Beschikbaar" 
          waarde={FLOW_STATS.verkoop.beschikbaar}
          icon={Package}
          kleur="#3b82f6"
          trend={{ waarde: 8, richting: 'up' }}
        />
        <StatCard 
          label="Maand Omzet" 
          waarde={`€${(FLOW_STATS.verkoop.omzet / 1000).toFixed(0)}k`}
          icon={Euro}
          kleur="#8b5cf6"
          trend={{ waarde: 15, richting: 'up' }}
        />
      </div>

      {/* Main Flow */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white">Productie Flow</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <FlowStep
            nummer={1}
            titel="Oogsten"
            beschrijving="Staal demontage uit gebouwen"
            icon={Scissors}
            kleur="#22c55e"
            link="/oogst-3d"
            actief
            stats={[
              { label: 'Actieve Gebouwen', waarde: FLOW_STATS.gebouwen.actief },
              { label: 'Elementen Geoogst', waarde: FLOW_STATS.oogst.geoogst },
              { label: 'In Demontage', waarde: FLOW_STATS.oogst.inBewerking },
              { label: 'Gewicht (ton)', waarde: (FLOW_STATS.oogst.totaalGewicht / 1000).toFixed(0) }
            ]}
          />
          
          <FlowStep
            nummer={2}
            titel="Verwerken"
            beschrijving="Schoonmaken & bewerken"
            icon={Wrench}
            kleur="#f59e0b"
            link="/productie-3d"
            stats={[
              { label: 'Wachtend', waarde: FLOW_STATS.verwerking.wachtend },
              { label: 'In Bewerking', waarde: FLOW_STATS.verwerking.inBewerking },
              { label: 'Voltooid', waarde: FLOW_STATS.verwerking.klaar },
              { label: 'Klaar voor Match', waarde: 245 }
            ]}
          />
          
          <FlowStep
            nummer={3}
            titel="Matching"
            beschrijving="Koppelen aan standaard profielen"
            icon={Layers}
            kleur="#3b82f6"
            link="/matching-3d"
            stats={[
              { label: 'Te Matchen', waarde: 156 },
              { label: 'Gematcht', waarde: 1420 },
              { label: 'Match Rate', waarde: '94%' },
              { label: 'Afval', waarde: '6%' }
            ]}
          />
          
          <FlowStep
            nummer={4}
            titel="Verkopen"
            beschrijving="Webshop & certificering"
            icon={ShoppingCart}
            kleur="#8b5cf6"
            link="/shop"
            stats={[
              { label: 'In Voorraad', waarde: FLOW_STATS.verkoop.beschikbaar },
              { label: 'Verkocht', waarde: FLOW_STATS.verkoop.verkocht },
              { label: 'Gecertificeerd', waarde: 1580 },
              { label: 'Omzet', waarde: `€${(FLOW_STATS.verkoop.omzet / 1000).toFixed(0)}k` }
            ]}
          />
        </div>
      </div>

      {/* Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Week Overview Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Week Overzicht</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={WEEKDATA}>
              <defs>
                <linearGradient id="colorGeoogst" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVerwerkt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVerkocht" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dag" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff'
                }}
              />
              <Area type="monotone" dataKey="geoogst" stroke="#22c55e" fillOpacity={1} fill="url(#colorGeoogst)" strokeWidth={2} />
              <Area type="monotone" dataKey="verwerkt" stroke="#f59e0b" fillOpacity={1} fill="url(#colorVerwerkt)" strokeWidth={2} />
              <Area type="monotone" dataKey="verkocht" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVerkocht)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Geoogst</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600">Verwerkt</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span className="text-sm text-gray-600">Verkocht</span>
            </div>
          </div>
        </div>

        {/* Conditie Verdeling */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conditie Verdeling</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={CONDITIE_VERDELING}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
              >
                {CONDITIE_VERDELING.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {CONDITIE_VERDELING.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recente Activiteit</h3>
          <div className="space-y-3">
            {RECENTE_ACTIVITEIT.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  item.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{item.tekst}</p>
                  <p className="text-xs text-gray-500">{item.tijd}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  item.type === 'oogst' ? 'bg-green-100 text-green-700' :
                  item.type === 'verwerking' ? 'bg-yellow-100 text-yellow-700' :
                  item.type === 'verkoop' ? 'bg-purple-100 text-purple-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {item.type}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Access */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Snelle Toegang</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to="/gebouwen"
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Gebouwen</p>
                <p className="text-xs text-gray-500">{FLOW_STATS.gebouwen.actief} actief</p>
              </div>
            </Link>
            <Link 
              to="/business-case"
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-green-50 rounded-xl transition-colors"
            >
              <Calculator className="w-8 h-8 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Business Case</p>
                <p className="text-xs text-gray-500">Kosten & opbrengsten</p>
              </div>
            </Link>
            <Link 
              to="/oogst-analyse"
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-purple-50 rounded-xl transition-colors"
            >
              <Cpu className="w-8 h-8 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Oogst Analyse</p>
                <p className="text-xs text-gray-500">AI demontage planning</p>
              </div>
            </Link>
            <Link 
              to="/productie-stroom"
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-blue-50 rounded-xl transition-colors"
            >
              <Workflow className="w-8 h-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Productie Stroom</p>
                <p className="text-xs text-gray-500">Faciliteit overzicht</p>
              </div>
            </Link>
            <Link 
              to="/voorraad"
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Package className="w-8 h-8 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900">Voorraad</p>
                <p className="text-xs text-gray-500">{FLOW_STATS.verkoop.beschikbaar} items</p>
              </div>
            </Link>
            <Link 
              to="/certificering"
              className="flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <FileCheck className="w-8 h-8 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Certificering</p>
                <p className="text-xs text-gray-500">Herkomst tracking</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
