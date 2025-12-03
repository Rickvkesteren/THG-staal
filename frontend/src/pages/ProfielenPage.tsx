import { useState, useMemo } from 'react'
import { Search, Filter, ArrowUpDown, Info } from 'lucide-react'
import type { StaalProfiel, ProfielType } from '../types'

// Complete profielen database
const PROFIELEN_DATA: StaalProfiel[] = [
  // HEA Profielen
  { id: 'hea-100', type: 'HEA', naam: 'HEA 100', afmetingen: { hoogte: 100, breedte: 100, lijfDikte: 5, flensDikte: 8, radius: 12, oppervlakte: 2124, gewichtPerM: 16.7, Iy: 3490000, Iz: 1340000, Wy: 69800, Wz: 26800 }},
  { id: 'hea-120', type: 'HEA', naam: 'HEA 120', afmetingen: { hoogte: 120, breedte: 120, lijfDikte: 5, flensDikte: 8, radius: 12, oppervlakte: 2534, gewichtPerM: 19.9, Iy: 6060000, Iz: 2310000, Wy: 101000, Wz: 38500 }},
  { id: 'hea-140', type: 'HEA', naam: 'HEA 140', afmetingen: { hoogte: 140, breedte: 140, lijfDikte: 5.5, flensDikte: 8.5, radius: 12, oppervlakte: 3142, gewichtPerM: 24.7, Iy: 10300000, Iz: 3890000, Wy: 147000, Wz: 55600 }},
  { id: 'hea-160', type: 'HEA', naam: 'HEA 160', afmetingen: { hoogte: 160, breedte: 160, lijfDikte: 6, flensDikte: 9, radius: 15, oppervlakte: 3877, gewichtPerM: 30.4, Iy: 16700000, Iz: 6160000, Wy: 209000, Wz: 77000 }},
  { id: 'hea-180', type: 'HEA', naam: 'HEA 180', afmetingen: { hoogte: 180, breedte: 180, lijfDikte: 6, flensDikte: 9.5, radius: 15, oppervlakte: 4525, gewichtPerM: 35.5, Iy: 25100000, Iz: 9250000, Wy: 279000, Wz: 103000 }},
  { id: 'hea-200', type: 'HEA', naam: 'HEA 200', afmetingen: { hoogte: 200, breedte: 200, lijfDikte: 6.5, flensDikte: 10, radius: 18, oppervlakte: 5383, gewichtPerM: 42.3, Iy: 36900000, Iz: 13400000, Wy: 369000, Wz: 134000 }},
  { id: 'hea-220', type: 'HEA', naam: 'HEA 220', afmetingen: { hoogte: 220, breedte: 220, lijfDikte: 7, flensDikte: 11, radius: 18, oppervlakte: 6434, gewichtPerM: 50.5, Iy: 54100000, Iz: 19500000, Wy: 492000, Wz: 177000 }},
  { id: 'hea-240', type: 'HEA', naam: 'HEA 240', afmetingen: { hoogte: 240, breedte: 240, lijfDikte: 7.5, flensDikte: 12, radius: 21, oppervlakte: 7684, gewichtPerM: 60.3, Iy: 77600000, Iz: 27700000, Wy: 647000, Wz: 231000 }},
  { id: 'hea-260', type: 'HEA', naam: 'HEA 260', afmetingen: { hoogte: 260, breedte: 260, lijfDikte: 7.5, flensDikte: 12.5, radius: 24, oppervlakte: 8682, gewichtPerM: 68.2, Iy: 104500000, Iz: 36700000, Wy: 804000, Wz: 282000 }},
  { id: 'hea-280', type: 'HEA', naam: 'HEA 280', afmetingen: { hoogte: 280, breedte: 280, lijfDikte: 8, flensDikte: 13, radius: 24, oppervlakte: 9726, gewichtPerM: 76.4, Iy: 136700000, Iz: 47600000, Wy: 976000, Wz: 340000 }},
  { id: 'hea-300', type: 'HEA', naam: 'HEA 300', afmetingen: { hoogte: 300, breedte: 300, lijfDikte: 8.5, flensDikte: 14, radius: 27, oppervlakte: 11253, gewichtPerM: 88.3, Iy: 182600000, Iz: 63100000, Wy: 1217000, Wz: 421000 }},
  { id: 'hea-320', type: 'HEA', naam: 'HEA 320', afmetingen: { hoogte: 320, breedte: 310, lijfDikte: 9, flensDikte: 15.5, radius: 27, oppervlakte: 12440, gewichtPerM: 97.6, Iy: 229300000, Iz: 69900000, Wy: 1433000, Wz: 451000 }},
  { id: 'hea-340', type: 'HEA', naam: 'HEA 340', afmetingen: { hoogte: 340, breedte: 300, lijfDikte: 9.5, flensDikte: 16.5, radius: 27, oppervlakte: 13340, gewichtPerM: 105, Iy: 276900000, Iz: 72000000, Wy: 1628000, Wz: 480000 }},
  { id: 'hea-360', type: 'HEA', naam: 'HEA 360', afmetingen: { hoogte: 360, breedte: 300, lijfDikte: 10, flensDikte: 17.5, radius: 27, oppervlakte: 14280, gewichtPerM: 112, Iy: 330900000, Iz: 78900000, Wy: 1838000, Wz: 526000 }},
  { id: 'hea-400', type: 'HEA', naam: 'HEA 400', afmetingen: { hoogte: 400, breedte: 300, lijfDikte: 11, flensDikte: 19, radius: 27, oppervlakte: 15900, gewichtPerM: 125, Iy: 450700000, Iz: 85600000, Wy: 2253000, Wz: 571000 }},
  
  // HEB Profielen
  { id: 'heb-100', type: 'HEB', naam: 'HEB 100', afmetingen: { hoogte: 100, breedte: 100, lijfDikte: 6, flensDikte: 10, radius: 12, oppervlakte: 2604, gewichtPerM: 20.4, Iy: 4500000, Iz: 1670000, Wy: 90000, Wz: 33500 }},
  { id: 'heb-120', type: 'HEB', naam: 'HEB 120', afmetingen: { hoogte: 120, breedte: 120, lijfDikte: 6.5, flensDikte: 11, radius: 12, oppervlakte: 3401, gewichtPerM: 26.7, Iy: 8640000, Iz: 3180000, Wy: 144000, Wz: 53000 }},
  { id: 'heb-140', type: 'HEB', naam: 'HEB 140', afmetingen: { hoogte: 140, breedte: 140, lijfDikte: 7, flensDikte: 12, radius: 12, oppervlakte: 4296, gewichtPerM: 33.7, Iy: 15100000, Iz: 5500000, Wy: 216000, Wz: 78600 }},
  { id: 'heb-160', type: 'HEB', naam: 'HEB 160', afmetingen: { hoogte: 160, breedte: 160, lijfDikte: 8, flensDikte: 13, radius: 15, oppervlakte: 5425, gewichtPerM: 42.6, Iy: 24900000, Iz: 8890000, Wy: 311000, Wz: 111000 }},
  { id: 'heb-180', type: 'HEB', naam: 'HEB 180', afmetingen: { hoogte: 180, breedte: 180, lijfDikte: 8.5, flensDikte: 14, radius: 15, oppervlakte: 6525, gewichtPerM: 51.2, Iy: 38300000, Iz: 13600000, Wy: 426000, Wz: 151000 }},
  { id: 'heb-200', type: 'HEB', naam: 'HEB 200', afmetingen: { hoogte: 200, breedte: 200, lijfDikte: 9, flensDikte: 15, radius: 18, oppervlakte: 7808, gewichtPerM: 61.3, Iy: 57000000, Iz: 20000000, Wy: 570000, Wz: 200000 }},
  { id: 'heb-220', type: 'HEB', naam: 'HEB 220', afmetingen: { hoogte: 220, breedte: 220, lijfDikte: 9.5, flensDikte: 16, radius: 18, oppervlakte: 9104, gewichtPerM: 71.5, Iy: 80900000, Iz: 28400000, Wy: 736000, Wz: 258000 }},
  { id: 'heb-240', type: 'HEB', naam: 'HEB 240', afmetingen: { hoogte: 240, breedte: 240, lijfDikte: 10, flensDikte: 17, radius: 21, oppervlakte: 10600, gewichtPerM: 83.2, Iy: 112600000, Iz: 39200000, Wy: 938000, Wz: 327000 }},
  { id: 'heb-260', type: 'HEB', naam: 'HEB 260', afmetingen: { hoogte: 260, breedte: 260, lijfDikte: 10, flensDikte: 17.5, radius: 24, oppervlakte: 11840, gewichtPerM: 93, Iy: 149200000, Iz: 51300000, Wy: 1148000, Wz: 395000 }},
  { id: 'heb-280', type: 'HEB', naam: 'HEB 280', afmetingen: { hoogte: 280, breedte: 280, lijfDikte: 10.5, flensDikte: 18, radius: 24, oppervlakte: 13140, gewichtPerM: 103, Iy: 192700000, Iz: 65400000, Wy: 1376000, Wz: 467000 }},
  { id: 'heb-300', type: 'HEB', naam: 'HEB 300', afmetingen: { hoogte: 300, breedte: 300, lijfDikte: 11, flensDikte: 19, radius: 27, oppervlakte: 14910, gewichtPerM: 117, Iy: 251700000, Iz: 85600000, Wy: 1678000, Wz: 571000 }},
  { id: 'heb-320', type: 'HEB', naam: 'HEB 320', afmetingen: { hoogte: 320, breedte: 300, lijfDikte: 11.5, flensDikte: 20.5, radius: 27, oppervlakte: 16130, gewichtPerM: 127, Iy: 308200000, Iz: 94300000, Wy: 1926000, Wz: 629000 }},
  { id: 'heb-340', type: 'HEB', naam: 'HEB 340', afmetingen: { hoogte: 340, breedte: 300, lijfDikte: 12, flensDikte: 21.5, radius: 27, oppervlakte: 17090, gewichtPerM: 134, Iy: 366600000, Iz: 96900000, Wy: 2156000, Wz: 646000 }},
  { id: 'heb-360', type: 'HEB', naam: 'HEB 360', afmetingen: { hoogte: 360, breedte: 300, lijfDikte: 12.5, flensDikte: 22.5, radius: 27, oppervlakte: 18100, gewichtPerM: 142, Iy: 431900000, Iz: 101400000, Wy: 2400000, Wz: 676000 }},
  { id: 'heb-400', type: 'HEB', naam: 'HEB 400', afmetingen: { hoogte: 400, breedte: 300, lijfDikte: 13.5, flensDikte: 24, radius: 27, oppervlakte: 19780, gewichtPerM: 155, Iy: 576800000, Iz: 108200000, Wy: 2884000, Wz: 721000 }},
  
  // IPE Profielen
  { id: 'ipe-80', type: 'IPE', naam: 'IPE 80', afmetingen: { hoogte: 80, breedte: 46, lijfDikte: 3.8, flensDikte: 5.2, radius: 5, oppervlakte: 764, gewichtPerM: 6.0, Iy: 801000, Iz: 84900, Wy: 20000, Wz: 3690 }},
  { id: 'ipe-100', type: 'IPE', naam: 'IPE 100', afmetingen: { hoogte: 100, breedte: 55, lijfDikte: 4.1, flensDikte: 5.7, radius: 7, oppervlakte: 1032, gewichtPerM: 8.1, Iy: 1710000, Iz: 159000, Wy: 34200, Wz: 5790 }},
  { id: 'ipe-120', type: 'IPE', naam: 'IPE 120', afmetingen: { hoogte: 120, breedte: 64, lijfDikte: 4.4, flensDikte: 6.3, radius: 7, oppervlakte: 1321, gewichtPerM: 10.4, Iy: 3180000, Iz: 277000, Wy: 53000, Wz: 8650 }},
  { id: 'ipe-140', type: 'IPE', naam: 'IPE 140', afmetingen: { hoogte: 140, breedte: 73, lijfDikte: 4.7, flensDikte: 6.9, radius: 7, oppervlakte: 1643, gewichtPerM: 12.9, Iy: 5410000, Iz: 449000, Wy: 77300, Wz: 12300 }},
  { id: 'ipe-160', type: 'IPE', naam: 'IPE 160', afmetingen: { hoogte: 160, breedte: 82, lijfDikte: 5.0, flensDikte: 7.4, radius: 9, oppervlakte: 2009, gewichtPerM: 15.8, Iy: 8690000, Iz: 683000, Wy: 109000, Wz: 16700 }},
  { id: 'ipe-180', type: 'IPE', naam: 'IPE 180', afmetingen: { hoogte: 180, breedte: 91, lijfDikte: 5.3, flensDikte: 8.0, radius: 9, oppervlakte: 2395, gewichtPerM: 18.8, Iy: 13170000, Iz: 1010000, Wy: 146000, Wz: 22200 }},
  { id: 'ipe-200', type: 'IPE', naam: 'IPE 200', afmetingen: { hoogte: 200, breedte: 100, lijfDikte: 5.6, flensDikte: 8.5, radius: 12, oppervlakte: 2848, gewichtPerM: 22.4, Iy: 19430000, Iz: 1420000, Wy: 194000, Wz: 28500 }},
  { id: 'ipe-220', type: 'IPE', naam: 'IPE 220', afmetingen: { hoogte: 220, breedte: 110, lijfDikte: 5.9, flensDikte: 9.2, radius: 12, oppervlakte: 3337, gewichtPerM: 26.2, Iy: 27720000, Iz: 2050000, Wy: 252000, Wz: 37300 }},
  { id: 'ipe-240', type: 'IPE', naam: 'IPE 240', afmetingen: { hoogte: 240, breedte: 120, lijfDikte: 6.2, flensDikte: 9.8, radius: 15, oppervlakte: 3912, gewichtPerM: 30.7, Iy: 38920000, Iz: 2840000, Wy: 324000, Wz: 47300 }},
  { id: 'ipe-270', type: 'IPE', naam: 'IPE 270', afmetingen: { hoogte: 270, breedte: 135, lijfDikte: 6.6, flensDikte: 10.2, radius: 15, oppervlakte: 4594, gewichtPerM: 36.1, Iy: 57900000, Iz: 4200000, Wy: 429000, Wz: 62200 }},
  { id: 'ipe-300', type: 'IPE', naam: 'IPE 300', afmetingen: { hoogte: 300, breedte: 150, lijfDikte: 7.1, flensDikte: 10.7, radius: 15, oppervlakte: 5381, gewichtPerM: 42.2, Iy: 83560000, Iz: 6040000, Wy: 557000, Wz: 80500 }},
  { id: 'ipe-330', type: 'IPE', naam: 'IPE 330', afmetingen: { hoogte: 330, breedte: 160, lijfDikte: 7.5, flensDikte: 11.5, radius: 18, oppervlakte: 6261, gewichtPerM: 49.1, Iy: 117700000, Iz: 7880000, Wy: 713000, Wz: 98500 }},
  { id: 'ipe-360', type: 'IPE', naam: 'IPE 360', afmetingen: { hoogte: 360, breedte: 170, lijfDikte: 8.0, flensDikte: 12.7, radius: 18, oppervlakte: 7273, gewichtPerM: 57.1, Iy: 162700000, Iz: 10400000, Wy: 904000, Wz: 123000 }},
  { id: 'ipe-400', type: 'IPE', naam: 'IPE 400', afmetingen: { hoogte: 400, breedte: 180, lijfDikte: 8.6, flensDikte: 13.5, radius: 21, oppervlakte: 8446, gewichtPerM: 66.3, Iy: 231300000, Iz: 13200000, Wy: 1156000, Wz: 146000 }},
  { id: 'ipe-450', type: 'IPE', naam: 'IPE 450', afmetingen: { hoogte: 450, breedte: 190, lijfDikte: 9.4, flensDikte: 14.6, radius: 21, oppervlakte: 9882, gewichtPerM: 77.6, Iy: 337400000, Iz: 16800000, Wy: 1500000, Wz: 176000 }},
  { id: 'ipe-500', type: 'IPE', naam: 'IPE 500', afmetingen: { hoogte: 500, breedte: 200, lijfDikte: 10.2, flensDikte: 16.0, radius: 21, oppervlakte: 11550, gewichtPerM: 90.7, Iy: 482000000, Iz: 21400000, Wy: 1928000, Wz: 214000 }},
  { id: 'ipe-550', type: 'IPE', naam: 'IPE 550', afmetingen: { hoogte: 550, breedte: 210, lijfDikte: 11.1, flensDikte: 17.2, radius: 24, oppervlakte: 13440, gewichtPerM: 106, Iy: 671200000, Iz: 26700000, Wy: 2441000, Wz: 254000 }},
  { id: 'ipe-600', type: 'IPE', naam: 'IPE 600', afmetingen: { hoogte: 600, breedte: 220, lijfDikte: 12.0, flensDikte: 19.0, radius: 24, oppervlakte: 15600, gewichtPerM: 122, Iy: 920800000, Iz: 33900000, Wy: 3069000, Wz: 308000 }},
]

const PROFIEL_TYPES: ProfielType[] = ['HEA', 'HEB', 'IPE', 'UNP', 'RHS', 'SHS', 'CHS']

export default function ProfielenPage() {
  const [zoekterm, setZoekterm] = useState('')
  const [filterType, setFilterType] = useState<ProfielType | ''>('')
  const [sorteerOp, setSorteerOp] = useState<'naam' | 'gewicht' | 'hoogte'>('naam')
  const [sorteerRichting, setSorteerRichting] = useState<'asc' | 'desc'>('asc')
  const [geselecteerdProfiel, setGeselecteerdProfiel] = useState<StaalProfiel | null>(null)

  const gefilterdeProfielen = useMemo(() => {
    let result = [...PROFIELEN_DATA]

    // Filter op zoekterm
    if (zoekterm) {
      result = result.filter(p => 
        p.naam.toLowerCase().includes(zoekterm.toLowerCase())
      )
    }

    // Filter op type
    if (filterType) {
      result = result.filter(p => p.type === filterType)
    }

    // Sorteer
    result.sort((a, b) => {
      let vergelijk = 0
      if (sorteerOp === 'naam') {
        vergelijk = a.naam.localeCompare(b.naam)
      } else if (sorteerOp === 'gewicht') {
        vergelijk = a.afmetingen.gewichtPerM - b.afmetingen.gewichtPerM
      } else if (sorteerOp === 'hoogte') {
        vergelijk = a.afmetingen.hoogte - b.afmetingen.hoogte
      }
      return sorteerRichting === 'asc' ? vergelijk : -vergelijk
    })

    return result
  }, [zoekterm, filterType, sorteerOp, sorteerRichting])

  const toggleSorteer = (veld: 'naam' | 'gewicht' | 'hoogte') => {
    if (sorteerOp === veld) {
      setSorteerRichting(sorteerRichting === 'asc' ? 'desc' : 'asc')
    } else {
      setSorteerOp(veld)
      setSorteerRichting('asc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Staal Profielen</h1>
        <p className="text-gray-500 mt-1">
          Database van {PROFIELEN_DATA.length} standaard Europese staalprofielen
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Zoeken */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Zoek profiel..."
              value={zoekterm}
              onChange={(e) => setZoekterm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as ProfielType | '')}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Alle types</option>
              {PROFIEL_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSorteer('naam')}
                  >
                    <div className="flex items-center gap-1">
                      Profiel
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSorteer('hoogte')}
                  >
                    <div className="flex items-center gap-1">
                      h (mm)
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">b (mm)</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">tw (mm)</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">tf (mm)</th>
                  <th 
                    className="text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                    onClick={() => toggleSorteer('gewicht')}
                  >
                    <div className="flex items-center gap-1">
                      kg/m
                      <ArrowUpDown className="w-4 h-4" />
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {gefilterdeProfielen.map((profiel) => (
                  <tr
                    key={profiel.id}
                    className={`hover:bg-blue-50 cursor-pointer transition-colors ${
                      geselecteerdProfiel?.id === profiel.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setGeselecteerdProfiel(profiel)}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{profiel.naam}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{profiel.afmetingen.hoogte}</td>
                    <td className="px-4 py-3 text-gray-600">{profiel.afmetingen.breedte}</td>
                    <td className="px-4 py-3 text-gray-600">{profiel.afmetingen.lijfDikte}</td>
                    <td className="px-4 py-3 text-gray-600">{profiel.afmetingen.flensDikte}</td>
                    <td className="px-4 py-3 text-gray-600">{profiel.afmetingen.gewichtPerM}</td>
                    <td className="px-4 py-3">
                      <button
                        className="p-1 hover:bg-blue-100 rounded"
                        onClick={(e) => {
                          e.stopPropagation()
                          setGeselecteerdProfiel(profiel)
                        }}
                      >
                        <Info className="w-4 h-4 text-blue-600" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
            {gefilterdeProfielen.length} profielen gevonden
          </div>
        </div>

        {/* Detail panel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {geselecteerdProfiel ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{geselecteerdProfiel.naam}</h3>
                <p className="text-gray-500">Europees {geselecteerdProfiel.type} profiel</p>
              </div>

              {/* Profiel tekening (SVG) */}
              <div className="bg-gray-50 rounded-lg p-4">
                <svg viewBox="0 0 200 200" className="w-full h-48">
                  {/* I-profiel schets */}
                  <rect x="60" y="20" width="80" height="15" fill="#374151" />
                  <rect x="92" y="35" width="16" height="130" fill="#374151" />
                  <rect x="60" y="165" width="80" height="15" fill="#374151" />
                  
                  {/* Afmetingen */}
                  <line x1="45" y1="20" x2="45" y2="180" stroke="#3b82f6" strokeWidth="1" />
                  <text x="30" y="100" fill="#3b82f6" fontSize="10">h</text>
                  
                  <line x1="60" y1="190" x2="140" y2="190" stroke="#3b82f6" strokeWidth="1" />
                  <text x="97" y="198" fill="#3b82f6" fontSize="10">b</text>
                </svg>
              </div>

              {/* Afmetingen */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Afmetingen</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hoogte (h)</span>
                    <span className="font-medium">{geselecteerdProfiel.afmetingen.hoogte} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Breedte (b)</span>
                    <span className="font-medium">{geselecteerdProfiel.afmetingen.breedte} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lijf (tw)</span>
                    <span className="font-medium">{geselecteerdProfiel.afmetingen.lijfDikte} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Flens (tf)</span>
                    <span className="font-medium">{geselecteerdProfiel.afmetingen.flensDikte} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Radius (r)</span>
                    <span className="font-medium">{geselecteerdProfiel.afmetingen.radius} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Gewicht</span>
                    <span className="font-medium">{geselecteerdProfiel.afmetingen.gewichtPerM} kg/m</span>
                  </div>
                </div>
              </div>

              {/* Doorsnede eigenschappen */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Doorsnede Eigenschappen</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Oppervlakte (A)</span>
                    <span className="font-medium">{geselecteerdProfiel.afmetingen.oppervlakte} mm²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Iy</span>
                    <span className="font-medium">{(geselecteerdProfiel.afmetingen.Iy / 10000).toFixed(0)} cm⁴</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Iz</span>
                    <span className="font-medium">{(geselecteerdProfiel.afmetingen.Iz / 10000).toFixed(0)} cm⁴</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Wy</span>
                    <span className="font-medium">{(geselecteerdProfiel.afmetingen.Wy / 1000).toFixed(0)} cm³</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Wz</span>
                    <span className="font-medium">{(geselecteerdProfiel.afmetingen.Wz / 1000).toFixed(0)} cm³</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Info className="w-12 h-12 mx-auto mb-3" />
                <p>Selecteer een profiel voor details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
