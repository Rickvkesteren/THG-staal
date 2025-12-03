import {
  Building2,
  Warehouse,
  FileCheck,
  TrendingUp,
  Package,
  Recycle,
  ArrowRight,
  Scale
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

// Demo data
const voorraadData = [
  { maand: 'Jun', nieuw: 4200, geoogst: 1800 },
  { maand: 'Jul', nieuw: 3800, geoogst: 2400 },
  { maand: 'Aug', nieuw: 4100, geoogst: 3200 },
  { maand: 'Sep', nieuw: 3600, geoogst: 4100 },
  { maand: 'Okt', nieuw: 3900, geoogst: 4800 },
  { maand: 'Nov', nieuw: 4500, geoogst: 5200 },
]

const profielVerdeling = [
  { name: 'HEA', value: 35, color: '#3b82f6' },
  { name: 'HEB', value: 28, color: '#10b981' },
  { name: 'IPE', value: 22, color: '#f59e0b' },
  { name: 'UNP', value: 10, color: '#6366f1' },
  { name: 'Overig', value: 5, color: '#94a3b8' },
]

const recenteActiviteit = [
  { type: 'oogst', text: 'Fabriekshal Oost - 24 balken geoogst', tijd: '2 uur geleden' },
  { type: 'order', text: 'Order #2024-156 - HEA 300 verzonden', tijd: '4 uur geleden' },
  { type: 'cert', text: 'Certificaat uitgegeven - HEB 200 (6m)', tijd: '6 uur geleden' },
  { type: 'match', text: '12 balken gematcht met vraag', tijd: '8 uur geleden' },
]

export default function Dashboard() {
  const stats = [
    {
      name: 'Totale Voorraad',
      value: '48.500 kg',
      change: '+12%',
      icon: Warehouse,
      color: 'blue',
    },
    {
      name: 'Geoogst Staal',
      value: '21.200 kg',
      change: '+24%',
      icon: Recycle,
      color: 'green',
    },
    {
      name: 'Actieve Gebouwen',
      value: '8',
      change: '+2',
      icon: Building2,
      color: 'purple',
    },
    {
      name: 'Certificaten',
      value: '156',
      change: '+18',
      icon: FileCheck,
      color: 'amber',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overzicht van het staal hergebruik systeem</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/gebouwen"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Building2 className="w-4 h-4" />
            Nieuw Gebouw
          </Link>
          <Link
            to="/matching"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700"
          >
            <Scale className="w-4 h-4" />
            Start Matching
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change} deze maand
                </p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Voorraad Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Voorraad Ontwikkeling</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={voorraadData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="maand" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="nieuw"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  name="Nieuw staal"
                />
                <Area
                  type="monotone"
                  dataKey="geoogst"
                  stackId="1"
                  stroke="#10b981"
                  fill="#6ee7b7"
                  name="Geoogst staal"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profiel Verdeling */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Profiel Verdeling</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={profielVerdeling}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {profielVerdeling.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {profielVerdeling.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-gray-600">{item.name}</span>
                <span className="text-gray-900 font-medium ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recente Activiteit */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recente Activiteit</h3>
            <button className="text-sm text-blue-600 hover:text-blue-700">
              Bekijk alles
            </button>
          </div>
          <div className="space-y-3">
            {recenteActiviteit.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50"
              >
                <div
                  className={`p-2 rounded-lg ${
                    item.type === 'oogst'
                      ? 'bg-green-100'
                      : item.type === 'order'
                      ? 'bg-blue-100'
                      : item.type === 'cert'
                      ? 'bg-amber-100'
                      : 'bg-purple-100'
                  }`}
                >
                  {item.type === 'oogst' && <Recycle className="w-4 h-4 text-green-600" />}
                  {item.type === 'order' && <Package className="w-4 h-4 text-blue-600" />}
                  {item.type === 'cert' && <FileCheck className="w-4 h-4 text-amber-600" />}
                  {item.type === 'match' && <Scale className="w-4 h-4 text-purple-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{item.text}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.tijd}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Snelle Acties</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Gebouw Toevoegen', to: '/gebouwen', icon: Building2, color: 'blue' },
              { name: 'Oogst Plannen', to: '/oogst-planning', icon: Recycle, color: 'green' },
              { name: 'Voorraad Beheren', to: '/voorraad', icon: Warehouse, color: 'purple' },
              { name: 'Certificaat Maken', to: '/certificering', icon: FileCheck, color: 'amber' },
            ].map((action) => (
              <Link
                key={action.name}
                to={action.to}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className={`p-2 rounded-lg bg-${action.color}-100`}>
                  <action.icon className={`w-5 h-5 text-${action.color}-600`} />
                </div>
                <span className="font-medium text-gray-700 group-hover:text-blue-700">
                  {action.name}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-blue-600" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
