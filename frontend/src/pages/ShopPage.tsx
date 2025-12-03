import { useState } from 'react'
import {
  ShoppingCart,
  Search,
  Filter,
  Grid,
  List,
  Heart,
  Plus,
  ArrowUpDown,
  Download,
  FileText,
  Check
} from 'lucide-react'
import type { Conditie } from '../types'
import { useWinkelwagen, useFavorieten } from '../context/AppContext'

interface ShopItem {
  id: string
  profielNaam: string
  lengte: number
  gewicht: number
  conditie: Conditie
  prijs: number
  herkomst: string
  locatie: string
  beschikbaar: boolean
  gecertificeerd: boolean
  afbeelding?: string
}

// Demo shop data
const SHOP_ITEMS: ShopItem[] = [
  { id: 'sh-001', profielNaam: 'HEA 300', lengte: 5850, gewicht: 516.5, conditie: 'goed', prijs: 285, herkomst: 'Fabriekshal Oost', locatie: 'Hal A-12', beschikbaar: true, gecertificeerd: true },
  { id: 'sh-002', profielNaam: 'HEA 300', lengte: 5850, gewicht: 516.5, conditie: 'goed', prijs: 285, herkomst: 'Fabriekshal Oost', locatie: 'Hal A-13', beschikbaar: true, gecertificeerd: true },
  { id: 'sh-003', profielNaam: 'HEB 300', lengte: 3950, gewicht: 461.5, conditie: 'goed', prijs: 245, herkomst: 'Fabriekshal Oost', locatie: 'Hal A-15', beschikbaar: false, gecertificeerd: true },
  { id: 'sh-004', profielNaam: 'HEB 300', lengte: 3800, gewicht: 444, conditie: 'matig', prijs: 185, herkomst: 'Fabriekshal Oost', locatie: 'Hal A-16', beschikbaar: true, gecertificeerd: false },
  { id: 'sh-005', profielNaam: 'IPE 400', lengte: 7800, gewicht: 517, prijs: 320, conditie: 'goed', herkomst: 'Sporthal De Meerkamp', locatie: 'Hal B-03', beschikbaar: true, gecertificeerd: true },
  { id: 'sh-006', profielNaam: 'IPE 300', lengte: 5500, gewicht: 232.1, conditie: 'goed', prijs: 145, herkomst: 'Kantoorpand Centrum', locatie: 'Hal B-08', beschikbaar: true, gecertificeerd: true },
  { id: 'sh-007', profielNaam: 'HEA 200', lengte: 4200, gewicht: 177.7, conditie: 'slecht', prijs: 65, herkomst: 'Parkeergarage Zuid', locatie: 'Hal C-08', beschikbaar: true, gecertificeerd: false },
  { id: 'sh-008', profielNaam: 'HEB 240', lengte: 6000, gewicht: 499.2, conditie: 'goed', prijs: 295, herkomst: 'Distributiecentrum West', locatie: 'Hal D-02', beschikbaar: true, gecertificeerd: true },
]

const conditiePrijzen: Record<Conditie, { color: string; discount: number }> = {
  goed: { color: 'bg-green-100 text-green-700', discount: 10 },
  matig: { color: 'bg-yellow-100 text-yellow-700', discount: 25 },
  slecht: { color: 'bg-red-100 text-red-700', discount: 40 },
  onbekend: { color: 'bg-gray-100 text-gray-700', discount: 50 },
}

export default function ShopPage() {
  const [zoekterm, setZoekterm] = useState('')
  const [conditieFilter, setConditieFilter] = useState<Conditie | ''>('')
  const [sorteerOp, setSorteerOp] = useState<'prijs' | 'lengte' | 'gewicht'>('prijs')
  const [weergave, setWeergave] = useState<'grid' | 'list'>('grid')
  
  // Globale context
  const { items: winkelwagenItems, voegToe: voegToeAanWinkelwagen, totaal: totaalPrijs, aantal: winkelwagenAantal } = useWinkelwagen()
  const { toggle: toggleFavoriet, isFavoriet } = useFavorieten()
  
  // Check of item in winkelwagen zit
  const isInWinkelwagen = (id: string) => winkelwagenItems.some(item => item.elementId === id)

  const gefilterdeItems = SHOP_ITEMS.filter(item => {
    const matchZoek = item.profielNaam.toLowerCase().includes(zoekterm.toLowerCase()) ||
                      item.herkomst.toLowerCase().includes(zoekterm.toLowerCase())
    const matchConditie = !conditieFilter || item.conditie === conditieFilter
    return matchZoek && matchConditie && item.beschikbaar
  }).sort((a, b) => {
    if (sorteerOp === 'prijs') return a.prijs - b.prijs
    if (sorteerOp === 'lengte') return b.lengte - a.lengte
    return b.gewicht - a.gewicht
  })

  const handleVoegToe = (item: ShopItem) => {
    voegToeAanWinkelwagen({
      elementId: item.id,
      profielNaam: item.profielNaam,
      lengte: item.lengte,
      gewicht: item.gewicht,
      prijs: item.prijs,
      gecertificeerd: item.gecertificeerd
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Webshop</h1>
          <p className="text-gray-500 mt-1">Koop hergebruikt staal met certificering</p>
        </div>
        <div className="flex gap-3">
          <button className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Exporteer Catalogus
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 relative">
            <ShoppingCart className="w-4 h-4" />
            Winkelwagen
            {winkelwagenAantal > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                {winkelwagenAantal}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Winkelwagen samenvatting */}
      {winkelwagenAantal > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            <div>
              <span className="font-medium text-blue-900">{winkelwagenAantal} items in winkelwagen</span>
              <span className="text-blue-700 ml-2">
                Totaal: €{totaalPrijs.toLocaleString('nl-NL')}
              </span>
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            Naar Checkout
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek op profiel of herkomst..."
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={conditieFilter}
                onChange={(e) => setConditieFilter(e.target.value as Conditie | '')}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Alle condities</option>
                <option value="goed">Goed</option>
                <option value="matig">Matig (-25%)</option>
                <option value="slecht">Slecht (-50%)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-5 h-5 text-gray-400" />
              <select
                value={sorteerOp}
                onChange={(e) => setSorteerOp(e.target.value as 'prijs' | 'lengte' | 'gewicht')}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="prijs">Prijs (laag-hoog)</option>
                <option value="lengte">Lengte (lang-kort)</option>
                <option value="gewicht">Gewicht (zwaar-licht)</option>
              </select>
            </div>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setWeergave('grid')}
                className={`p-2 ${weergave === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setWeergave('list')}
                className={`p-2 ${weergave === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      {weergave === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gefilterdeItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Image placeholder */}
              <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-gray-400">{item.profielNaam}</div>
                    <div className="text-sm text-gray-400">{item.lengte} mm</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleFavoriet(item.id)}
                  className="absolute top-2 right-2 p-2 bg-white rounded-full shadow hover:bg-gray-50"
                >
                  <Heart className={`w-4 h-4 ${isFavoriet(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </button>
                {item.gecertificeerd && (
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" /> Gecertificeerd
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.profielNaam}</h3>
                    <p className="text-sm text-gray-500">{item.lengte} mm • {item.gewicht} kg</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${conditiePrijzen[item.conditie].color}`}>
                    {item.conditie}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">{item.herkomst}</p>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold text-gray-900">€{item.prijs}</div>
                    {conditiePrijzen[item.conditie].discount > 0 && (
                      <div className="text-xs text-green-600">
                        -{conditiePrijzen[item.conditie].discount}% korting
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleVoegToe(item)}
                    disabled={isInWinkelwagen(item.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      isInWinkelwagen(item.id)
                        ? 'bg-green-100 text-green-600 cursor-default'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    }`}
                  >
                    {isInWinkelwagen(item.id) ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <Plus className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Profiel</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Lengte</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Gewicht</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Conditie</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Herkomst</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Prijs</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {gefilterdeItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{item.profielNaam}</span>
                      {item.gecertificeerd && (
                        <span className="bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded">
                          ✓
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.lengte} mm</td>
                  <td className="px-4 py-3">{item.gewicht} kg</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${conditiePrijzen[item.conditie].color}`}>
                      {item.conditie}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.herkomst}</td>
                  <td className="px-4 py-3 font-bold">€{item.prijs}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button className="p-1.5 hover:bg-gray-100 rounded">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </button>
                      <button
                        onClick={() => handleVoegToe(item)}
                        disabled={isInWinkelwagen(item.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          isInWinkelwagen(item.id)
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {isInWinkelwagen(item.id) ? 'Toegevoegd' : 'Toevoegen'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {gefilterdeItems.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Geen producten gevonden</h3>
          <p className="text-gray-500">Pas je zoekopdracht of filters aan.</p>
        </div>
      )}
    </div>
  )
}
