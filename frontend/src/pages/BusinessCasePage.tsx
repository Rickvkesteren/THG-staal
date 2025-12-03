import { useState, useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Truck,
  Factory,
  Recycle,
  Scale,
  Calculator,
  PieChart,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Leaf,
  Building2,
  Euro,
  Percent,
  Clock,
  Users
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================

interface KostenPost {
  id: string
  naam: string
  categorie: 'demontage' | 'transport' | 'opslag' | 'bewerking' | 'certificering' | 'overhead'
  bedragPerTon: number
  beschrijving: string
}

interface OpbrengstPost {
  id: string
  naam: string
  categorie: 'verkoop' | 'besparing' | 'subsidie'
  bedragPerTon: number
  beschrijving: string
}

interface GebouwProject {
  id: string
  naam: string
  locatie: string
  totaalGewichtTon: number
  aantalElementen: number
  geschatteHerbruikbaarheid: number // 0-100%
  conditieVerdeling: {
    goed: number
    matig: number
    slecht: number
  }
  geschatteDemontageWeken: number
}

// ============================================================
// MOCK DATA - Kosten en Opbrengsten per ton staal
// ============================================================

const KOSTEN_POSTEN: KostenPost[] = [
  // Demontage
  { id: 'k1', naam: 'Demontage arbeid', categorie: 'demontage', bedragPerTon: 120, beschrijving: 'Gekwalificeerde monteurs voor zorgvuldige demontage' },
  { id: 'k2', naam: 'Demontage materieel', categorie: 'demontage', bedragPerTon: 45, beschrijving: 'Kranen, hoogwerkers, gereedschap' },
  { id: 'k3', naam: 'Veiligheidsmaatregelen', categorie: 'demontage', bedragPerTon: 25, beschrijving: 'Steigers, netten, persoonlijke bescherming' },
  
  // Transport
  { id: 'k4', naam: 'Transport naar faciliteit', categorie: 'transport', bedragPerTon: 35, beschrijving: 'Vrachtwagen transport van slooplocatie' },
  { id: 'k5', naam: 'Laden/lossen', categorie: 'transport', bedragPerTon: 15, beschrijving: 'Kraanwerk bij laden en lossen' },
  
  // Opslag
  { id: 'k6', naam: 'Opslagkosten', categorie: 'opslag', bedragPerTon: 8, beschrijving: 'Per maand opslagkosten (gem. 3 maanden)' },
  { id: 'k7', naam: 'Voorraadadministratie', categorie: 'opslag', bedragPerTon: 5, beschrijving: 'Labelen, registreren, tracking' },
  
  // Bewerking
  { id: 'k8', naam: 'Reiniging & stralen', categorie: 'bewerking', bedragPerTon: 85, beschrijving: 'Shot blasting, roestverwijdering' },
  { id: 'k9', naam: 'Reparatie & aanpassing', categorie: 'bewerking', bedragPerTon: 150, beschrijving: 'Lassen, snijden, boren (gem.)' },
  { id: 'k10', naam: 'Conservering', categorie: 'bewerking', bedragPerTon: 40, beschrijving: 'Primer en coating aanbrengen' },
  
  // Certificering
  { id: 'k11', naam: 'NTA 8713 keuring', categorie: 'certificering', bedragPerTon: 65, beschrijving: 'Materiaalonderzoek en certificering' },
  { id: 'k12', naam: 'Documentatie', categorie: 'certificering', bedragPerTon: 15, beschrijving: 'Traceerbaarheid en rapportage' },
  
  // Overhead
  { id: 'k13', naam: 'Projectmanagement', categorie: 'overhead', bedragPerTon: 30, beschrijving: 'Coördinatie en planning' },
  { id: 'k14', naam: 'Verzekering', categorie: 'overhead', bedragPerTon: 12, beschrijving: 'Aansprakelijkheid en schade' },
  { id: 'k15', naam: 'Facilitair', categorie: 'overhead', bedragPerTon: 18, beschrijving: 'Huisvesting, energie, ICT' },
]

const OPBRENGST_POSTEN: OpbrengstPost[] = [
  // Verkoop
  { id: 'o1', naam: 'Verkoop gecertificeerd staal', categorie: 'verkoop', bedragPerTon: 800, beschrijving: 'NTA 8713 gecertificeerd constructiestaal' },
  { id: 'o2', naam: 'Premium projecten', categorie: 'verkoop', bedragPerTon: 150, beschrijving: 'Extra marge voor specifieke matches' },
  
  // Besparing
  { id: 'o3', naam: 'Besparing vs nieuw staal', categorie: 'besparing', bedragPerTon: 400, beschrijving: 'Klant besparing t.o.v. nieuw staal (~€1200/ton)' },
  { id: 'o4', naam: 'CO2 certificaten', categorie: 'besparing', bedragPerTon: 45, beschrijving: 'Carbon credits voor vermeden uitstoot' },
  
  // Subsidie
  { id: 'o5', naam: 'Circulaire subsidie', categorie: 'subsidie', bedragPerTon: 25, beschrijving: 'Overheidssubsidie circulaire economie' },
  { id: 'o6', naam: 'MIA/Vamil voordeel', categorie: 'subsidie', bedragPerTon: 35, beschrijving: 'Fiscale voordelen duurzame investering' },
]

const MOCK_GEBOUWEN: GebouwProject[] = [
  {
    id: 'g1',
    naam: 'Industriehal Westpoort',
    locatie: 'Amsterdam',
    totaalGewichtTon: 450,
    aantalElementen: 342,
    geschatteHerbruikbaarheid: 78,
    conditieVerdeling: { goed: 45, matig: 40, slecht: 15 },
    geschatteDemontageWeken: 6
  },
  {
    id: 'g2',
    naam: 'Kantoorpand Centrum',
    locatie: 'Rotterdam',
    totaalGewichtTon: 280,
    aantalElementen: 198,
    geschatteHerbruikbaarheid: 85,
    conditieVerdeling: { goed: 60, matig: 30, slecht: 10 },
    geschatteDemontageWeken: 4
  },
  {
    id: 'g3',
    naam: 'Sporthal De Boog',
    locatie: 'Utrecht',
    totaalGewichtTon: 180,
    aantalElementen: 156,
    geschatteHerbruikbaarheid: 65,
    conditieVerdeling: { goed: 30, matig: 45, slecht: 25 },
    geschatteDemontageWeken: 3
  },
]

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const formatCurrency = (bedrag: number) => {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(bedrag)
}

const formatTon = (gewicht: number) => {
  return `${gewicht.toLocaleString('nl-NL')} ton`
}

const categoriKleuren: Record<string, string> = {
  demontage: '#ef4444',
  transport: '#f59e0b',
  opslag: '#3b82f6',
  bewerking: '#8b5cf6',
  certificering: '#22c55e',
  overhead: '#6b7280',
  verkoop: '#22c55e',
  besparing: '#3b82f6',
  subsidie: '#f59e0b',
}

const categorieIcons: Record<string, any> = {
  demontage: Factory,
  transport: Truck,
  opslag: Package,
  bewerking: Recycle,
  certificering: CheckCircle2,
  overhead: Users,
  verkoop: Euro,
  besparing: TrendingDown,
  subsidie: Leaf,
}

// ============================================================
// COMPONENTS
// ============================================================

function KostenTabel({ 
  kosten, 
  gewichtTon 
}: { 
  kosten: KostenPost[]
  gewichtTon: number 
}) {
  const groepen = kosten.reduce((acc, k) => {
    if (!acc[k.categorie]) acc[k.categorie] = []
    acc[k.categorie].push(k)
    return acc
  }, {} as Record<string, KostenPost[]>)

  return (
    <div className="space-y-4">
      {Object.entries(groepen).map(([categorie, items]) => {
        const Icon = categorieIcons[categorie]
        const subtotaal = items.reduce((sum, k) => sum + k.bedragPerTon, 0)
        
        return (
          <div key={categorie} className="bg-gray-800/50 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${categoriKleuren[categorie]}30` }}
                >
                  <Icon className="w-4 h-4" style={{ color: categoriKleuren[categorie] }} />
                </div>
                <span className="font-medium text-white capitalize">{categorie}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">{formatCurrency(subtotaal)}/ton</p>
                <p className="font-bold" style={{ color: categoriKleuren[categorie] }}>
                  {formatCurrency(subtotaal * gewichtTon)}
                </p>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {items.map(k => (
                <div key={k.id} className="flex items-center justify-between px-2 py-1 text-sm hover:bg-gray-700/50 rounded">
                  <div>
                    <span className="text-gray-300">{k.naam}</span>
                    <p className="text-xs text-gray-500">{k.beschrijving}</p>
                  </div>
                  <span className="text-gray-400">{formatCurrency(k.bedragPerTon * gewichtTon)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function OpbrengstenTabel({ 
  opbrengsten, 
  gewichtTon,
  herbruikbaarheid
}: { 
  opbrengsten: OpbrengstPost[]
  gewichtTon: number 
  herbruikbaarheid: number
}) {
  const effectiefGewicht = gewichtTon * (herbruikbaarheid / 100)
  const groepen = opbrengsten.reduce((acc, o) => {
    if (!acc[o.categorie]) acc[o.categorie] = []
    acc[o.categorie].push(o)
    return acc
  }, {} as Record<string, OpbrengstPost[]>)

  return (
    <div className="space-y-4">
      {Object.entries(groepen).map(([categorie, items]) => {
        const Icon = categorieIcons[categorie]
        const subtotaal = items.reduce((sum, o) => sum + o.bedragPerTon, 0)
        
        return (
          <div key={categorie} className="bg-gray-800/50 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${categoriKleuren[categorie]}30` }}
                >
                  <Icon className="w-4 h-4" style={{ color: categoriKleuren[categorie] }} />
                </div>
                <span className="font-medium text-white capitalize">{categorie}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">{formatCurrency(subtotaal)}/ton</p>
                <p className="font-bold text-green-400">
                  {formatCurrency(subtotaal * effectiefGewicht)}
                </p>
              </div>
            </div>
            <div className="p-2 space-y-1">
              {items.map(o => (
                <div key={o.id} className="flex items-center justify-between px-2 py-1 text-sm hover:bg-gray-700/50 rounded">
                  <div>
                    <span className="text-gray-300">{o.naam}</span>
                    <p className="text-xs text-gray-500">{o.beschrijving}</p>
                  </div>
                  <span className="text-green-400">{formatCurrency(o.bedragPerTon * effectiefGewicht)}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BusinessSummaryCard({
  titel,
  bedrag,
  subtitle,
  icon: Icon,
  trend,
  kleur
}: {
  titel: string
  bedrag: number
  subtitle: string
  icon: any
  trend?: 'up' | 'down'
  kleur: string
}) {
  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${kleur}20` }}
        >
          <Icon className="w-6 h-6" style={{ color: kleur }} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </div>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-1">{titel}</p>
      <p className="text-2xl font-bold text-white mb-1">{formatCurrency(bedrag)}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  )
}

function ROIGauge({ roi }: { roi: number }) {
  const angle = Math.min(Math.max(roi, -50), 150) // Clamp between -50 and 150
  const rotation = (angle + 50) / 200 * 180 - 90 // Convert to degrees
  
  return (
    <div className="relative w-48 h-24 mx-auto">
      {/* Background arc */}
      <div className="absolute inset-0 border-[12px] border-gray-700 rounded-t-full border-b-0" />
      
      {/* Colored sections */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 border-[12px] border-transparent rounded-t-full border-b-0"
          style={{
            borderTopColor: roi > 0 ? '#22c55e' : '#ef4444',
            borderLeftColor: roi > 0 ? '#22c55e' : '#ef4444',
            borderRightColor: roi > 50 ? '#22c55e' : 'transparent',
          }}
        />
      </div>
      
      {/* Needle */}
      <div 
        className="absolute bottom-0 left-1/2 w-1 h-20 bg-white origin-bottom transition-transform duration-500"
        style={{ transform: `translateX(-50%) rotate(${rotation}deg)` }}
      />
      
      {/* Center point */}
      <div className="absolute bottom-0 left-1/2 w-4 h-4 bg-white rounded-full -translate-x-1/2 translate-y-1/2" />
      
      {/* Value */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
        <span className={`text-3xl font-bold ${roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {roi.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

function CO2Impact({ tonStaal, herbruikbaarheid }: { tonStaal: number; herbruikbaarheid: number }) {
  // ~1.85 ton CO2 per ton nieuw staal geproduceerd
  // Hergebruik bespaart ~95% daarvan
  const besparing = tonStaal * (herbruikbaarheid / 100) * 1.85 * 0.95
  const bomen = Math.round(besparing * 50) // ~50 bomen per ton CO2 per jaar
  
  return (
    <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-700/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
          <Leaf className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h3 className="font-bold text-white">CO2 Impact</h3>
          <p className="text-sm text-green-300">Milieuwinst door hergebruik</p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900/50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{besparing.toFixed(0)}</p>
          <p className="text-sm text-gray-400">ton CO2 bespaard</p>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{bomen.toLocaleString()}</p>
          <p className="text-sm text-gray-400">bomen equivalent</p>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-400">
        <p>• Nieuw staal: ~1.85 ton CO2/ton staal</p>
        <p>• Hergebruik bespaart: ~95% van uitstoot</p>
        <p>• Carbon credit waarde: ~€{(besparing * 25).toFixed(0)}</p>
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BusinessCasePage() {
  const [selectedGebouw, setSelectedGebouw] = useState<GebouwProject>(MOCK_GEBOUWEN[0])
  const [aanpassingen, setAanpassingen] = useState({
    herbruikbaarheid: selectedGebouw.geschatteHerbruikbaarheid,
    verkoopPrijsFactor: 1.0,
    bewerkingsKostenFactor: 1.0,
  })

  // Bereken financiële cijfers
  const financials = useMemo(() => {
    const effectiefGewicht = selectedGebouw.totaalGewichtTon * (aanpassingen.herbruikbaarheid / 100)
    const afvalGewicht = selectedGebouw.totaalGewichtTon - effectiefGewicht
    
    // Kosten
    const totaleKostenPerTon = KOSTEN_POSTEN.reduce((sum, k) => sum + k.bedragPerTon, 0)
    const bewerkingsKosten = totaleKostenPerTon * selectedGebouw.totaalGewichtTon * aanpassingen.bewerkingsKostenFactor
    const afvalKosten = afvalGewicht * 50 // €50/ton voor schroot verkoop (negatief)
    const totaleKosten = bewerkingsKosten - (afvalGewicht * 150) // Schroot opbrengst ~€150/ton
    
    // Opbrengsten
    const totaleOpbrengstenPerTon = OPBRENGST_POSTEN.reduce((sum, o) => sum + o.bedragPerTon, 0)
    const verkoopOpbrengsten = totaleOpbrengstenPerTon * effectiefGewicht * aanpassingen.verkoopPrijsFactor
    const schrootOpbrengst = afvalGewicht * 150
    const totaleOpbrengsten = verkoopOpbrengsten + schrootOpbrengst
    
    // Resultaat
    const brutoMarge = totaleOpbrengsten - totaleKosten
    const nettoMarge = brutoMarge * 0.75 // Na belasting etc
    const margePercentage = (brutoMarge / totaleOpbrengsten) * 100
    const roi = (brutoMarge / totaleKosten) * 100
    
    // Break-even
    const breakEvenHerbruikbaarheid = (totaleKosten / (totaleOpbrengstenPerTon * selectedGebouw.totaalGewichtTon)) * 100
    
    return {
      effectiefGewicht,
      afvalGewicht,
      totaleKosten,
      totaleOpbrengsten,
      brutoMarge,
      nettoMarge,
      margePercentage,
      roi,
      breakEvenHerbruikbaarheid,
      kostenPerTon: totaleKostenPerTon,
      opbrengstenPerTon: totaleOpbrengstenPerTon,
    }
  }, [selectedGebouw, aanpassingen])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
            <Calculator className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Business Case Calculator</h1>
            <p className="text-gray-400">Opbrengsten en kosten analyse voor staal hergebruik</p>
          </div>
        </div>
        
        {/* Gebouw selector */}
        <select
          value={selectedGebouw.id}
          onChange={(e) => {
            const g = MOCK_GEBOUWEN.find(g => g.id === e.target.value)
            if (g) {
              setSelectedGebouw(g)
              setAanpassingen(prev => ({ ...prev, herbruikbaarheid: g.geschatteHerbruikbaarheid }))
            }
          }}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700"
        >
          {MOCK_GEBOUWEN.map(g => (
            <option key={g.id} value={g.id}>{g.naam} - {formatTon(g.totaalGewichtTon)}</option>
          ))}
        </select>
      </div>

      {/* Project overview */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center gap-4 mb-4">
          <Building2 className="w-8 h-8 text-blue-400" />
          <div>
            <h2 className="text-xl font-bold text-white">{selectedGebouw.naam}</h2>
            <p className="text-gray-400">{selectedGebouw.locatie} • {selectedGebouw.aantalElementen} elementen</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Totaal Gewicht</p>
            <p className="text-2xl font-bold text-white">{formatTon(selectedGebouw.totaalGewichtTon)}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Geschatte Herbruikbaarheid</p>
            <p className="text-2xl font-bold text-green-400">{aanpassingen.herbruikbaarheid}%</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Herbruikbaar</p>
            <p className="text-2xl font-bold text-blue-400">{formatTon(financials.effectiefGewicht)}</p>
          </div>
          <div className="bg-gray-900/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Demontage Duur</p>
            <p className="text-2xl font-bold text-orange-400">{selectedGebouw.geschatteDemontageWeken} weken</p>
          </div>
        </div>
        
        {/* Aanpassingssliders */}
        <div className="mt-6 grid grid-cols-3 gap-6">
          <div>
            <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Herbruikbaarheid</span>
              <span className="text-white font-medium">{aanpassingen.herbruikbaarheid}%</span>
            </label>
            <input
              type="range"
              min="30"
              max="100"
              value={aanpassingen.herbruikbaarheid}
              onChange={(e) => setAanpassingen(prev => ({ ...prev, herbruikbaarheid: parseInt(e.target.value) }))}
              className="w-full accent-green-500"
            />
          </div>
          <div>
            <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Verkoopprijs Factor</span>
              <span className="text-white font-medium">{(aanpassingen.verkoopPrijsFactor * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="70"
              max="130"
              value={aanpassingen.verkoopPrijsFactor * 100}
              onChange={(e) => setAanpassingen(prev => ({ ...prev, verkoopPrijsFactor: parseInt(e.target.value) / 100 }))}
              className="w-full accent-blue-500"
            />
          </div>
          <div>
            <label className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>Bewerkingskosten Factor</span>
              <span className="text-white font-medium">{(aanpassingen.bewerkingsKostenFactor * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="70"
              max="150"
              value={aanpassingen.bewerkingsKostenFactor * 100}
              onChange={(e) => setAanpassingen(prev => ({ ...prev, bewerkingsKostenFactor: parseInt(e.target.value) / 100 }))}
              className="w-full accent-orange-500"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <BusinessSummaryCard
          titel="Totale Kosten"
          bedrag={financials.totaleKosten}
          subtitle={`${formatCurrency(financials.kostenPerTon)}/ton`}
          icon={TrendingDown}
          kleur="#ef4444"
        />
        <BusinessSummaryCard
          titel="Totale Opbrengsten"
          bedrag={financials.totaleOpbrengsten}
          subtitle={`${formatCurrency(financials.opbrengstenPerTon)}/ton herbruikbaar`}
          icon={TrendingUp}
          trend="up"
          kleur="#22c55e"
        />
        <BusinessSummaryCard
          titel="Bruto Marge"
          bedrag={financials.brutoMarge}
          subtitle={`${financials.margePercentage.toFixed(1)}% marge`}
          icon={DollarSign}
          trend={financials.brutoMarge > 0 ? 'up' : 'down'}
          kleur={financials.brutoMarge > 0 ? '#22c55e' : '#ef4444'}
        />
        <BusinessSummaryCard
          titel="Netto Resultaat"
          bedrag={financials.nettoMarge}
          subtitle="Na belasting (~25%)"
          icon={Euro}
          trend={financials.nettoMarge > 0 ? 'up' : 'down'}
          kleur={financials.nettoMarge > 0 ? '#22c55e' : '#ef4444'}
        />
      </div>

      {/* Main content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Kosten breakdown */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <TrendingDown className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-bold text-white">Kosten Breakdown</h3>
          </div>
          <KostenTabel kosten={KOSTEN_POSTEN} gewichtTon={selectedGebouw.totaalGewichtTon} />
          <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
            <span className="text-gray-400">Totaal Kosten:</span>
            <span className="text-xl font-bold text-red-400">{formatCurrency(financials.totaleKosten)}</span>
          </div>
        </div>

        {/* Opbrengsten breakdown */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-6 h-6 text-green-400" />
            <h3 className="text-lg font-bold text-white">Opbrengsten Breakdown</h3>
          </div>
          <OpbrengstenTabel 
            opbrengsten={OPBRENGST_POSTEN} 
            gewichtTon={selectedGebouw.totaalGewichtTon}
            herbruikbaarheid={aanpassingen.herbruikbaarheid}
          />
          
          {/* Schroot opbrengst */}
          <div className="mt-4 bg-gray-700/50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-300">Schroot verkoop</span>
                <p className="text-xs text-gray-500">{formatTon(financials.afvalGewicht)} @ €150/ton</p>
              </div>
              <span className="text-yellow-400">{formatCurrency(financials.afvalGewicht * 150)}</span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between items-center">
            <span className="text-gray-400">Totaal Opbrengsten:</span>
            <span className="text-xl font-bold text-green-400">{formatCurrency(financials.totaleOpbrengsten)}</span>
          </div>
        </div>

        {/* ROI & Summary */}
        <div className="space-y-4">
          {/* ROI Gauge */}
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4 text-center">Return on Investment</h3>
            <ROIGauge roi={financials.roi} />
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                Break-even bij <span className="text-yellow-400 font-medium">{financials.breakEvenHerbruikbaarheid.toFixed(0)}%</span> herbruikbaarheid
              </p>
            </div>
          </div>

          {/* CO2 Impact */}
          <CO2Impact 
            tonStaal={selectedGebouw.totaalGewichtTon} 
            herbruikbaarheid={aanpassingen.herbruikbaarheid} 
          />

          {/* Conclusie */}
          <div className={`rounded-xl p-6 border ${
            financials.brutoMarge > 0 
              ? 'bg-green-900/20 border-green-700/50' 
              : 'bg-red-900/20 border-red-700/50'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              {financials.brutoMarge > 0 ? (
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-red-400" />
              )}
              <h3 className="font-bold text-white">Conclusie</h3>
            </div>
            <p className="text-gray-300 text-sm">
              {financials.brutoMarge > 0 ? (
                <>
                  Dit project is <span className="text-green-400 font-medium">winstgevend</span> met een 
                  geschatte netto winst van <span className="text-green-400 font-medium">{formatCurrency(financials.nettoMarge)}</span>.
                  De ROI van {financials.roi.toFixed(1)}% is {financials.roi > 20 ? 'excellent' : 'acceptabel'}.
                </>
              ) : (
                <>
                  Dit project is <span className="text-red-400 font-medium">niet winstgevend</span> bij de huidige 
                  parameters. Verhoog herbruikbaarheid naar minimaal {financials.breakEvenHerbruikbaarheid.toFixed(0)}% 
                  of verlaag bewerkingskosten.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
