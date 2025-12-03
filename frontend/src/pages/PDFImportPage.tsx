import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  FileText, 
  Box, 
  Loader2,
  ArrowRight,
  Layers,
  RefreshCw,
  Eye,
  Download,
  FolderOpen,
  Columns,
  Upload,
  FileSearch,
  Square,
  Grip,
  XCircle,
  CheckSquare,
  Trash2,
  Puzzle,
  AlertTriangle,
  CheckCircle,
  Link2,
  Grid3X3,
  Database
} from 'lucide-react'
import { analyserenPDFTekeningen, analyserenPDFBestanden, genereerStandaardHal, type PDFAnalyseResult } from '../utils/pdfToModel'
import { 
  saveModel, 
  savePuzzel, 
  loadPuzzel, 
  saveSettings, 
  loadSettings,
  type StoredPuzzel
} from '../utils/modelStorage'
import { 
  losStructuurPuzzelOp, 
  genereerPuzzelSamenvatting, 
  type StructuurPuzzel
} from '../utils/structuurPuzzel'
import { 
  bouwProfielDatabase, 
  analyseerDakconstructie,
  type ProfielDatabase,
  type DakconstructieInfo
} from '../utils/profielKoppeling'
import {
  bouwRobuusteProfielDatabase,
  converteerNaarLegacyFormaat,
  valideerProfiel,
  type RobuusteProfielDatabase
} from '../utils/robuusteProfielKoppeling'
import {
  bouwIntegraalModel,
  type IntegraalModelResult
} from '../utils/integraalModel'
import {
  analyseerMeerderePDFs,
  type SlimPDFResultaat
} from '../utils/slimPdfReader'
import {
  analyseerVisueel,
  type VisueleAnalyseResultaat
} from '../utils/geavanceerdeVisueleAnalyzer'

// Tekening aanzicht types - 4 hoofdcategorieën + uitgesloten
export type TekeningAanzicht = 
  | 'overzicht'        // Bovenaanzicht, plattegrond, daktekening (BELANGRIJKST - dak/spanten)
  | 'fundering'        // Fundering, vloer, palen, kolomposities (BASIS - waar staan de kolommen)
  | 'doorsnede'        // Zijkanten, gevels, doorsneden (AANVULLEND)
  | 'detail'           // Detailtekeningen, profielen, verbindingen (EXTRA)
  | 'onbekend'         // Nog niet gecategoriseerd
  | 'uitgesloten'      // Niet gebruiken bij analyse

export interface TekeningMetAanzicht {
  bestandsnaam: string
  aanzicht: TekeningAanzicht
  prioriteit: number
}

// Aanzicht configuratie met iconen en kleuren - 4 niveau's
const AANZICHT_CONFIG: Record<TekeningAanzicht, { 
  label: string
  kleur: string
  bgKleur: string
  icon: React.ReactNode
  beschrijving: string
  prioriteit: number
  voorbeelden: string[]
}> = {
  'overzicht': {
    label: '① Dak / Overzicht',
    kleur: 'text-amber-700',
    bgKleur: 'bg-amber-100 border-amber-400',
    icon: <Square className="w-5 h-5" />,
    beschrijving: 'Dakconstructie, spanten, liggers, bovenaanzicht',
    prioriteit: 1,
    voorbeelden: ['daktekening', 'dakconstructie', 'overzicht', 'bovenaanzicht', 'spanten']
  },
  'fundering': {
    label: '② Fundering / Vloer',
    kleur: 'text-orange-700',
    bgKleur: 'bg-orange-100 border-orange-400',
    icon: <Columns className="w-5 h-5" />,
    beschrijving: 'Funderingsplan, vloertekening, kolomposities, palen, raster',
    prioriteit: 2,
    voorbeelden: ['fundering', 'vloer', 'palen', 'kolompositie', 'raster', '-02']
  },
  'doorsnede': {
    label: '③ Zijkant / Doorsnede',
    kleur: 'text-blue-700',
    bgKleur: 'bg-blue-100 border-blue-400',
    icon: <Layers className="w-5 h-5" />,
    beschrijving: 'Gevels, langsdoorsneden, dwarsdoorsneden, windverbanden',
    prioriteit: 3,
    voorbeelden: ['gevel', 'doorsnede', 'zijkant', 'langsdoorsnede', 'dwarsdoorsnede']
  },
  'detail': {
    label: '④ Detailtekening',
    kleur: 'text-gray-700',
    bgKleur: 'bg-gray-100 border-gray-400',
    icon: <FileSearch className="w-5 h-5" />,
    beschrijving: 'Kolom-, ligger-, spantdetails, profielen, verbindingen',
    prioriteit: 4,
    voorbeelden: ['kolom', 'ligger', 'spant', 'detail', 'profiel']
  },
  'onbekend': {
    label: 'Niet gecategoriseerd',
    kleur: 'text-gray-500',
    bgKleur: 'bg-gray-50 border-gray-200',
    icon: <FileText className="w-5 h-5" />,
    beschrijving: 'Sleep naar een categorie hierboven',
    prioriteit: 99,
    voorbeelden: []
  },
  'uitgesloten': {
    label: 'Niet gebruiken',
    kleur: 'text-red-500',
    bgKleur: 'bg-red-50 border-red-300',
    icon: <XCircle className="w-5 h-5" />,
    beschrijving: 'Deze bestanden worden niet meegenomen in de analyse',
    prioriteit: 100,
    voorbeelden: []
  }
}

// De bekende PDF bestanden uit de 2D Drawings folder
const BESCHIKBARE_PDFS = [
  '110.1.27-2659-02.pdf',
  '110.1.27-2659-03.pdf',
  '110.1.27-2659-04.pdf',
  '110.1.27-2659-05.pdf',
  '110.1.27-2659-06.pdf',
  '110.1.27-2659-07.pdf',
  'dakconstructie hal en overkapping.pdf',
  'hal en overkapping- gevels en doorsneden.pdf',
  'kolommen hal div nrs.pdf',
  'kolommen hal k14 tm 24.pdf',
  'kolommen hal K25 tm K35.pdf',
  'kolommen hal K39 tm K66.pdf',
  'kolommen hal k51 tm k68.pdf',
  'liggers en spanten - overzicht dossier nog niet gescand.pdf',
  'liggers hal L1 tm L4.pdf',
  'liggers hal L5 tm L9.pdf',
  'liggers spanten.pdf',
  'statische berekening staalconstructie luifel.pdf',
  'statische berekening staalconstructie.pdf',
]

// === AANZICHT DETECTIE FUNCTIE ===
// Automatisch aanzicht bepalen op basis van bestandsnaam - 4 categorieën
function detecteerAanzicht(bestandsnaam: string): TekeningAanzicht {
  const naam = bestandsnaam.toLowerCase()
  
  // ① OVERZICHT - Daktekening, spanten bovenaanzicht (PRIORITEIT 1)
  if (naam.includes('dak') || 
      naam.includes('bovenaanzicht') ||
      naam.includes('overzicht')) {
    return 'overzicht'
  }
  
  // ② FUNDERING - Vloer, palen, kolomposities (PRIORITEIT 2)
  // -02 bestanden zijn vaak funderingstekeningen met kolomraster
  if (naam.includes('fundering') || 
      naam.includes('vloer') ||
      naam.includes('palen') ||
      naam.includes('paal') ||
      naam.includes('plattegrond') ||
      naam.includes('raster') ||
      naam.includes('-02')) {
    return 'fundering'
  }
  
  // ③ DOORSNEDE - Gevels, zijkanten, doorsneden (PRIORITEIT 3)
  if (naam.includes('gevel') || 
      naam.includes('doorsnede') || 
      naam.includes('doorsneden') ||
      naam.includes('zijkant') ||
      naam.includes('langsdoorsnede') ||
      naam.includes('dwarsdoorsnede')) {
    return 'doorsnede'
  }
  
  // -06 en -07 bestanden zijn vaak gevel/doorsnede tekeningen
  if (naam.includes('-06') || naam.includes('-07')) {
    return 'doorsnede'
  }
  
  // ④ DETAIL - Kolommen, liggers, spanten details, profielen (PRIORITEIT 4)
  if (naam.includes('kolom') || 
      naam.includes('ligger') || 
      naam.includes('spant') ||
      naam.includes('profiel') ||
      naam.includes('verbinding') ||
      naam.includes('detail') ||
      naam.includes('berekening') || 
      naam.includes('statisch')) {
    return 'detail'
  }
  
  return 'onbekend'
}

// Herbruikbare component voor aanzicht drop zones
interface AanzichtDropZoneProps {
  aanzicht: TekeningAanzicht
  bestanden: string[]
  config: typeof AANZICHT_CONFIG[TekeningAanzicht]
  draggedFile: string | null
  onDrop: (aanzicht: TekeningAanzicht) => void
  onDragStart: (bestand: string) => void
  onDragEnd: () => void
  onAanzichtChange: (bestand: string, aanzicht: TekeningAanzicht) => void
  onPreview?: (bestand: string) => void
  className?: string
  richting?: 'horizontaal' | 'verticaal'
}

function AanzichtDropZone({ 
  aanzicht, 
  bestanden, 
  config, 
  draggedFile, 
  onDrop, 
  onDragStart, 
  onDragEnd,
  onPreview,
  className = '',
  richting = 'horizontaal'
}: AanzichtDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  
  return (
    <div
      className={`border-2 rounded-xl p-2 transition-all ${config.bgKleur} ${
        isDragOver ? 'ring-2 ring-blue-500 scale-[1.02]' : ''
      } ${draggedFile ? 'cursor-copy' : ''} ${className}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => { 
        e.preventDefault()
        setIsDragOver(false)
        onDrop(aanzicht) 
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className={config.kleur}>{config.icon}</span>
        <span className={`font-medium text-xs ${config.kleur}`}>{config.label}</span>
        {bestanden.length > 0 && (
          <span className="ml-auto bg-white/80 text-gray-700 text-xs px-1.5 py-0.5 rounded-full">
            {bestanden.length}
          </span>
        )}
      </div>
      
      {/* Bestanden */}
      <div className={`space-y-1 ${richting === 'verticaal' ? 'min-h-[100px]' : 'min-h-[40px]'} max-h-32 overflow-y-auto`}>
        {bestanden.map(bestand => (
          <div
            key={bestand}
            draggable
            onDragStart={() => onDragStart(bestand)}
            onDragEnd={onDragEnd}
            className="flex items-center gap-1 text-xs bg-white/70 rounded px-2 py-1 cursor-move hover:bg-white transition-colors group"
          >
            <Grip className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <FileText className="w-3 h-3 text-red-500 flex-shrink-0" />
            <span className="truncate flex-1">{bestand.replace('.pdf', '')}</span>
            {onPreview && (
              <button
                onClick={(e) => { e.stopPropagation(); onPreview(bestand) }}
                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-blue-100 rounded transition-all"
                title="Bekijk PDF"
              >
                <Eye className="w-3 h-3 text-blue-500" />
              </button>
            )}
          </div>
        ))}
        {bestanden.length === 0 && (
          <div className="text-xs text-gray-400 italic text-center py-2">
            Sleep tekening
          </div>
        )}
      </div>
    </div>
  )
}

export default function PDFImportPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [geselecteerdeBestanden, setGeselecteerdeBestanden] = useState<string[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isAnalysing, setIsAnalysing] = useState(false)
  const [result, setResult] = useState<PDFAnalyseResult | null>(null)
  const [activeTab, setActiveTab] = useState<'select' | 'upload' | 'config' | 'preview'>('select')
  const [extractionLogs, setExtractionLogs] = useState<string[]>([])
  const [useRealPDFParsing, setUseRealPDFParsing] = useState(true)
  
  // === AANZICHT TOEWIJZINGEN ===
  // Map van bestandsnaam naar aanzicht type
  const [aanzichtToewijzingen, setAanzichtToewijzingen] = useState<Record<string, TekeningAanzicht>>(() => {
    // Initiële automatische detectie op basis van bestandsnaam
    const initial: Record<string, TekeningAanzicht> = {}
    BESCHIKBARE_PDFS.forEach(bestand => {
      initial[bestand] = detecteerAanzicht(bestand)
    })
    return initial
  })
  
  // Drag state voor drag & drop
  const [draggedFile, setDraggedFile] = useState<string | null>(null)
  
  // PDF Preview state
  const [previewPdf, setPreviewPdf] = useState<string | null>(null)
  
  // Structuur Puzzel state
  const [structuurPuzzel, setStructuurPuzzel] = useState<StructuurPuzzel | null>(null)
  const [isAnalysingStructuur, setIsAnalysingStructuur] = useState(false)
  
  // Profiel Koppeling state (gekoppelde profielen uit PDF analyse)
  const [profielDatabase, setProfielDatabase] = useState<ProfielDatabase | null>(null)
  const [robuusteDatabase, setRobuusteDatabase] = useState<RobuusteProfielDatabase | null>(null)
  const [dakconstructieInfo, setDakconstructieInfo] = useState<DakconstructieInfo | null>(null)
  const [isAnalysingProfielen, setIsAnalysingProfielen] = useState(false)
  const [useRobuusteAnalyse, setUseRobuusteAnalyse] = useState(true) // Nieuwe robuuste analyse
  
  // Integraal Model state (nieuwe complete model builder)
  const [integraalModel, setIntegraalModel] = useState<IntegraalModelResult | null>(null)
  const [isAnalysingIntegraal, setIsAnalysingIntegraal] = useState(false)
  const [useIntegraalModel, setUseIntegraalModel] = useState(true) // Nieuwe integraal model analyse
  
  // Slimme PDF Reader state (verbeterde extractie)
  const [slimPdfResultaat, setSlimPdfResultaat] = useState<Map<string, SlimPDFResultaat> | null>(null)
  const [visueleAnalyse, setVisueleAnalyse] = useState<VisueleAnalyseResultaat | null>(null)
  const [isSlimAnalysing, setIsSlimAnalysing] = useState(false)
  const [useSlimReader, setUseSlimReader] = useState(true) // Nieuwe slimme PDF reader
  
  // Custom configuratie voor hal generatie
  const [halConfig, setHalConfig] = useState({
    aantalKolommen: 6,
    aantalRijen: 4,
    rasterX: 6000,
    rasterY: 7500,
    hoogte: 8000,
    naam: 'Geïmporteerde Hal',
    kolomProfiel: 'HEB 300',
    liggerProfiel: 'IPE 400',
    spantProfiel: 'HEA 300'
  })
  
  // Data opslag status
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  
  // === DATA LADEN BIJ OPSTARTEN ===
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        // Laad opgeslagen tekening toewijzingen
        const savedToewijzingen = await loadSettings<Record<string, TekeningAanzicht>>('tekeningToewijzingen')
        if (savedToewijzingen) {
          setAanzichtToewijzingen(savedToewijzingen)
          console.log('📂 Tekening toewijzingen geladen')
        }
        
        // Laad opgeslagen hal configuratie
        const savedHalConfig = await loadSettings<typeof halConfig>('halConfig')
        if (savedHalConfig) {
          setHalConfig(savedHalConfig)
          console.log('⚙️ Hal configuratie geladen')
        }
        
        // Laad opgeslagen structuur puzzel
        const savedPuzzel = await loadPuzzel('current')
        if (savedPuzzel) {
          setStructuurPuzzel(savedPuzzel.puzzel)
          console.log('🧩 Structuur puzzel geladen')
        }
        
        setIsDataLoaded(true)
      } catch (error) {
        console.error('Fout bij laden data:', error)
        setIsDataLoaded(true)
      }
    }
    
    loadSavedData()
  }, [])
  
  // === AUTOMATISCH OPSLAAN BIJ WIJZIGINGEN ===
  // Sla tekening toewijzingen op bij wijzigingen
  useEffect(() => {
    if (!isDataLoaded) return // Wacht tot initiele data geladen is
    
    const saveData = async () => {
      setIsSaving(true)
      try {
        await saveSettings('tekeningToewijzingen', aanzichtToewijzingen)
        setLastSaved(new Date())
        console.log('💾 Tekening toewijzingen opgeslagen')
      } catch (error) {
        console.error('Fout bij opslaan:', error)
      }
      setIsSaving(false)
    }
    
    // Debounce: wacht 500ms na laatste wijziging
    const timeout = setTimeout(saveData, 500)
    return () => clearTimeout(timeout)
  }, [aanzichtToewijzingen, isDataLoaded])
  
  // Sla hal configuratie op bij wijzigingen
  useEffect(() => {
    if (!isDataLoaded) return
    
    const saveData = async () => {
      try {
        await saveSettings('halConfig', halConfig)
        console.log('💾 Hal configuratie opgeslagen')
      } catch (error) {
        console.error('Fout bij opslaan hal config:', error)
      }
    }
    
    const timeout = setTimeout(saveData, 500)
    return () => clearTimeout(timeout)
  }, [halConfig, isDataLoaded])
  
  // Sla structuur puzzel op bij wijzigingen
  useEffect(() => {
    if (!isDataLoaded || !structuurPuzzel) return
    
    const saveData = async () => {
      try {
        const storedPuzzel: StoredPuzzel = {
          id: 'current',
          naam: halConfig.naam,
          puzzel: structuurPuzzel,
          tekeningToewijzingen: aanzichtToewijzingen,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        await savePuzzel(storedPuzzel)
        setLastSaved(new Date())
        console.log('💾 Structuur puzzel opgeslagen')
      } catch (error) {
        console.error('Fout bij opslaan puzzel:', error)
      }
    }
    
    const timeout = setTimeout(saveData, 500)
    return () => clearTimeout(timeout)
  }, [structuurPuzzel, isDataLoaded, halConfig.naam, aanzichtToewijzingen])
  
  // Beschikbare profielen
  const PROFIELEN = {
    HEB: ['HEB 100', 'HEB 120', 'HEB 140', 'HEB 160', 'HEB 180', 'HEB 200', 'HEB 220', 'HEB 240', 'HEB 260', 'HEB 280', 'HEB 300', 'HEB 320', 'HEB 340', 'HEB 360', 'HEB 400', 'HEB 450', 'HEB 500'],
    HEA: ['HEA 100', 'HEA 120', 'HEA 140', 'HEA 160', 'HEA 180', 'HEA 200', 'HEA 220', 'HEA 240', 'HEA 260', 'HEA 280', 'HEA 300', 'HEA 320', 'HEA 340', 'HEA 360', 'HEA 400', 'HEA 450', 'HEA 500'],
    IPE: ['IPE 100', 'IPE 120', 'IPE 140', 'IPE 160', 'IPE 180', 'IPE 200', 'IPE 220', 'IPE 240', 'IPE 270', 'IPE 300', 'IPE 330', 'IPE 360', 'IPE 400', 'IPE 450', 'IPE 500', 'IPE 550', 'IPE 600']
  }
  
  // === DRAG & DROP HANDLERS ===
  const handleDragStart = useCallback((bestand: string) => {
    setDraggedFile(bestand)
  }, [])
  
  const handleDragEnd = useCallback(() => {
    setDraggedFile(null)
  }, [])
  
  const handleDropOnAanzicht = useCallback((aanzicht: TekeningAanzicht) => {
    if (draggedFile) {
      setAanzichtToewijzingen(prev => ({
        ...prev,
        [draggedFile]: aanzicht
      }))
      // Voeg ook toe aan geselecteerde bestanden als nog niet geselecteerd
      if (!geselecteerdeBestanden.includes(draggedFile)) {
        setGeselecteerdeBestanden(prev => [...prev, draggedFile])
      }
      setDraggedFile(null)
    }
  }, [draggedFile, geselecteerdeBestanden])
  
  const handleAanzichtChange = useCallback((bestand: string, aanzicht: TekeningAanzicht) => {
    setAanzichtToewijzingen(prev => ({
      ...prev,
      [bestand]: aanzicht
    }))
  }, [])
  
  // Groepeer bestanden per aanzicht - 4 categorieën + uitgesloten
  const bestandenPerAanzicht = useMemo(() => {
    const groepen: Record<TekeningAanzicht, string[]> = {
      'overzicht': [],
      'fundering': [],
      'doorsnede': [],
      'detail': [],
      'onbekend': [],
      'uitgesloten': []
    }
    
    BESCHIKBARE_PDFS.forEach(bestand => {
      const aanzicht = aanzichtToewijzingen[bestand] || 'onbekend'
      groepen[aanzicht].push(bestand)
    })
    
    return groepen
  }, [aanzichtToewijzingen])
  
  // Alle gecategoriseerde bestanden (niet 'onbekend' en niet 'uitgesloten') - dit zijn de bestanden die geanalyseerd worden
  const gecategoriseerdeBestanden = useMemo(() => {
    return BESCHIKBARE_PDFS.filter(bestand => {
      const aanzicht = aanzichtToewijzingen[bestand]
      return aanzicht && aanzicht !== 'onbekend' && aanzicht !== 'uitgesloten'
    })
  }, [aanzichtToewijzingen])
  
  // === SELECTIE HULP FUNCTIES ===
  const handleAllesSelecteren = useCallback(() => {
    const nieuweToewijzingen: Record<string, TekeningAanzicht> = {}
    BESCHIKBARE_PDFS.forEach(bestand => {
      nieuweToewijzingen[bestand] = detecteerAanzicht(bestand)
    })
    setAanzichtToewijzingen(nieuweToewijzingen)
  }, [])
  
  const handleAllesLegen = useCallback(() => {
    const nieuweToewijzingen: Record<string, TekeningAanzicht> = {}
    BESCHIKBARE_PDFS.forEach(bestand => {
      nieuweToewijzingen[bestand] = 'onbekend'
    })
    setAanzichtToewijzingen(nieuweToewijzingen)
  }, [])
  
  const handleAllesUitsluiten = useCallback(() => {
    const nieuweToewijzingen: Record<string, TekeningAanzicht> = {}
    BESCHIKBARE_PDFS.forEach(bestand => {
      nieuweToewijzingen[bestand] = 'uitgesloten'
    })
    setAanzichtToewijzingen(nieuweToewijzingen)
  }, [])
  
  // === STRUCTUUR PUZZEL ANALYSE ===
  const handleAnalyseerStructuur = useCallback(async () => {
    setIsAnalysingStructuur(true)
    setIsAnalysingProfielen(true)
    
    // Converteer aanzicht toewijzingen naar tekeningen voor de puzzel analyse
    const tekeningen: { bestand: string; categorie: string }[] = []
    
    Object.entries(aanzichtToewijzingen).forEach(([bestand, aanzicht]) => {
      if (aanzicht !== 'onbekend' && aanzicht !== 'uitgesloten') {
        // Map TekeningAanzicht naar puzzel categorie
        let categorie = 'onbekend'
        if (aanzicht === 'overzicht') categorie = 'overzicht'
        else if (aanzicht === 'fundering') categorie = 'fundering'
        else if (aanzicht === 'doorsnede') categorie = 'doorsnede'
        else if (aanzicht === 'detail') categorie = 'detail'
        
        tekeningen.push({ bestand, categorie })
      }
    })
    
    // === PROFIEL ANALYSE UIT PDF'S ===
    // Laad de echte PDF bestanden en analyseer profiel-element koppelingen
    let localProfielDatabase: ProfielDatabase | undefined = undefined
    let localDakInfo: DakconstructieInfo | undefined = undefined
    let pdfFiles: File[] = []  // Declareer buiten try block voor later gebruik
    
    try {
      // Probeer de PDF bestanden te laden vanuit public folder
      for (const tekening of tekeningen) {
        try {
          const response = await fetch(`/2D Drawings/${tekening.bestand}`)
          if (response.ok) {
            const blob = await response.blob()
            const file = new File([blob], tekening.bestand, { type: 'application/pdf' })
            pdfFiles.push(file)
          }
        } catch {
          console.warn(`Kon ${tekening.bestand} niet laden`)
        }
      }
      
      if (pdfFiles.length > 0) {
        console.log(`📄 ${pdfFiles.length} PDF's geladen voor profiel analyse`)
        
        if (useRobuusteAnalyse) {
          // === ROBUUSTE ANALYSE (nieuw) ===
          console.log('🔧 Robuuste profiel analyse gestart...')
          
          const robuust = await bouwRobuusteProfielDatabase(pdfFiles)
          setRobuusteDatabase(robuust)
          
          // Converteer naar legacy formaat voor backwards compatibility
          localProfielDatabase = converteerNaarLegacyFormaat(robuust)
          setProfielDatabase(localProfielDatabase)
          
          // Dak info uit robuuste database
          if (robuust.dak) {
            localDakInfo = robuust.dak
            setDakconstructieInfo(localDakInfo)
          }
          
          console.log(`✅ Robuuste analyse voltooid:`)
          console.log(`   ${robuust.validatie.totaalElementen} elementen gevonden`)
          console.log(`   ${robuust.validatie.metProfiel} met profiel`)
          console.log(`   ${robuust.validatie.gevalideerd} gevalideerd`)
          console.log(`   ${robuust.validatie.conflicten.length} conflicten`)
          
        } else {
          // === LEGACY ANALYSE ===
          localProfielDatabase = await bouwProfielDatabase(pdfFiles)
          setProfielDatabase(localProfielDatabase)
          
          localDakInfo = await analyseerDakconstructie(pdfFiles)
          setDakconstructieInfo(localDakInfo)
          
          console.log('✅ Profiel analyse voltooid (legacy)')
        }
      }
    } catch (error) {
      console.error('Fout bij profiel analyse:', error)
    }
    
    setIsAnalysingProfielen(false)
    
    // Simuleer analyse delay
    await new Promise(r => setTimeout(r, 300))
    
    // === INTEGRAAL MODEL BOUWEN (nieuw) ===
    if (useIntegraalModel && pdfFiles.length > 0) {
      setIsAnalysingIntegraal(true)
      console.log('🔧 Integraal model analyse gestart...')
      
      try {
        const integraal = await bouwIntegraalModel(pdfFiles)
        setIntegraalModel(integraal)
        
        console.log(`✅ Integraal model voltooid:`)
        console.log(`   ${integraal.model.elementen.length} elementen`)
        console.log(`   ${integraal.tracking.size} getrackte elementen`)
        console.log(`   Validatie: ${integraal.validatie.score}%`)
        console.log(`   Geometrie: ${integraal.model.geometrie.type}`)
      } catch (error) {
        console.error('Fout bij integraal model:', error)
      }
      
      setIsAnalysingIntegraal(false)
    }
    
    // === SLIMME PDF READER (nieuw - verbeterde extractie) ===
    if (useSlimReader && pdfFiles.length > 0) {
      setIsSlimAnalysing(true)
      console.log('📖 Slimme PDF reader gestart...')
      
      try {
        const slimResultaat = await analyseerMeerderePDFs(pdfFiles)
        setSlimPdfResultaat(slimResultaat.perBestand)
        
        // Als er ook visuele analyse nodig is, doe voor eerste bestand
        if (pdfFiles.length > 0) {
          const visueel = await analyseerVisueel(pdfFiles[0])
          setVisueleAnalyse(visueel)
        }
        
        console.log(`✅ Slimme PDF analyse voltooid:`)
        console.log(`   ${slimResultaat.gecombineerd.alleProfielen.size} unieke profielen`)
        console.log(`   ${slimResultaat.gecombineerd.alleKoppelingen.size} element koppelingen`)
        console.log(`   ${slimResultaat.gecombineerd.alleMaten.length} maten gevonden`)
        console.log(`   Kwaliteit: ${slimResultaat.gecombineerd.gemiddeldeKwaliteit}%`)
      } catch (error) {
        console.error('Fout bij slimme PDF analyse:', error)
      }
      
      setIsSlimAnalysing(false)
    }
    
    // Voer de structuur puzzel analyse uit met de profiel database
    // Gebruik de lokale variabelen die net zijn opgebouwd
    const puzzel = losStructuurPuzzelOp(
      tekeningen, 
      undefined, 
      localProfielDatabase || profielDatabase || undefined, 
      localDakInfo || dakconstructieInfo || undefined
    )
    setStructuurPuzzel(puzzel)
    setIsAnalysingStructuur(false)
  }, [aanzichtToewijzingen, profielDatabase, dakconstructieInfo, useRobuusteAnalyse, useIntegraalModel, useSlimReader])
  
  // Handle file upload voor echte PDF parsing
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const pdfFiles = Array.from(files).filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      setUploadedFiles(prev => [...prev, ...pdfFiles])
      console.log(`📁 ${pdfFiles.length} PDF bestanden toegevoegd`)
    }
  }
  
  const handleRemoveUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }
  
  const handleAnalyseer = async () => {
    setIsAnalysing(true)
    setResult(null)
    setExtractionLogs([])
    
    try {
      let analyseResult: PDFAnalyseResult
      
      if (activeTab === 'upload' && uploadedFiles.length > 0 && useRealPDFParsing) {
        // Gebruik echte PDF parsing met pdf.js
        setExtractionLogs(prev => [...prev, `🔍 Start analyse van ${uploadedFiles.length} PDF bestanden...`])
        
        analyseResult = await analyserenPDFBestanden(uploadedFiles)
        
        setExtractionLogs(prev => [
          ...prev, 
          `✅ Analyse voltooid`,
          `📊 ${analyseResult.elementen.length} elementen gevonden`,
          `🔧 Profielen: ${analyseResult.metadata.detectedProfiles?.join(', ') || 'standaard'}`,
          `📐 Dimensies gedetecteerd: ${analyseResult.metadata.detectedDimensions ? 'Ja' : 'Nee'}`
        ])
      } else {
        // Fallback: gebruik bestandsnaam analyse
        await new Promise(r => setTimeout(r, 1500))
        const bestandsnamen = activeTab === 'upload' 
          ? uploadedFiles.map(f => f.name)
          : gecategoriseerdeBestanden
        analyseResult = analyserenPDFTekeningen(bestandsnamen)
      }
      
      setResult(analyseResult)
      setActiveTab('preview')
    } catch (error) {
      console.error('Analyse fout:', error)
      setExtractionLogs(prev => [...prev, `❌ Fout: ${error}`])
    }
    
    setIsAnalysing(false)
  }
  
  const handleGenereerStandaard = async () => {
    setIsAnalysing(true)
    setResult(null)
    
    await new Promise(r => setTimeout(r, 1000))
    
    console.log('Genereren hal met config:', halConfig)
    const standaardResult = genereerStandaardHal(halConfig)
    console.log('Gegenereerd resultaat:', standaardResult.elementen.length, 'elementen')
    console.log('Eerste element:', standaardResult.elementen[0])
    
    setResult(standaardResult)
    setActiveTab('preview')
    
    setIsAnalysing(false)
  }
  
  const handleExportJSON = () => {
    if (!result) return
    
    const exportData = {
      gebouwNaam: result.gebouwNaam,
      exportDatum: new Date().toISOString(),
      bronbestanden: result.bronbestanden,
      aantalElementen: result.elementen.length,
      metadata: result.metadata,
      elementen: result.elementen
    }
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${result.gebouwNaam.replace(/\s+/g, '_')}_3D_model.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  const handleBekijkIn3D = async () => {
    if (!result) return
    
    try {
      console.log('Opslaan model met', result.elementen.length, 'elementen')
      
      // Sla het model op in IndexedDB (ondersteunt grote bestanden)
      await saveModel({
        id: 'imported',
        naam: result.gebouwNaam,
        elementen: result.elementen,
        metadata: result.metadata,
        createdAt: new Date().toISOString()
      })
      
      console.log('Model opgeslagen, navigeren naar 3D viewer')
      
      // Navigeer naar de 3D viewer
      navigate('/gebouw-3d/imported')
    } catch (error) {
      console.error('Fout bij opslaan model:', error)
      alert('Er is een fout opgetreden bij het opslaan van het model.')
    }
  }
  
  // Statistieken van het resultaat
  const stats = useMemo(() => {
    if (!result) return null
    
    const types: Record<string, number> = {}
    const profielen: Record<string, number> = {}
    let totaalGewicht = 0
    let totaalLengte = 0
    
    result.elementen.forEach(el => {
      types[el.type] = (types[el.type] || 0) + 1
      profielen[el.profielNaam] = (profielen[el.profielNaam] || 0) + 1
      totaalGewicht += el.gewicht
      totaalLengte += el.lengte
    })
    
    return { types, profielen, totaalGewicht, totaalLengte }
  }, [result])
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
            <FileText className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">2D Tekeningen → 3D Model</h1>
            <p className="text-blue-100">
              Converteer PDF constructietekeningen naar een 3D ontmantelingsmodel
            </p>
          </div>
          
          {/* Opslag Status Indicator */}
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Opslaan...</span>
              </>
            ) : lastSaved ? (
              <>
                <Database className="w-4 h-4 text-green-300" />
                <span className="text-sm text-green-200">
                  Opgeslagen {lastSaved.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4 opacity-50" />
                <span className="text-sm opacity-70">Niet opgeslagen</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('select')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'select' 
              ? 'bg-white text-blue-600 shadow' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Bekende Bestanden
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'upload' 
              ? 'bg-white text-blue-600 shadow' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Upload className="w-4 h-4" />
          Upload PDF's
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'config' 
              ? 'bg-white text-blue-600 shadow' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Columns className="w-4 h-4" />
          Hal Configuratie
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          disabled={!result}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium transition-all ${
            activeTab === 'preview' 
              ? 'bg-white text-blue-600 shadow' 
              : result 
                ? 'text-gray-600 hover:text-gray-900' 
                : 'text-gray-400 cursor-not-allowed'
          }`}
        >
          <Eye className="w-4 h-4" />
          Preview Resultaat
        </button>
      </div>
      
      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Linker paneel - Bestand selectie of Config */}
        <div className="lg:col-span-2">
          {activeTab === 'select' && (
            <div className="space-y-6">
              {/* Instructie header */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Layers className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-900">Tekeningen categoriseren</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Sleep tekeningen naar het juiste aanzicht. Het <strong>bovenaanzicht (daktekening)</strong> is 
                      de basis - hieraan worden zijkanten en gevels gekoppeld voor 3D reconstructie.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Visuele aanzicht-layout met centrale plattegrond */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Constructie Aanzichten
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleAllesSelecteren}
                      className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                      title="Auto-detectie op alle bestanden"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Alles inladen
                    </button>
                    <button
                      onClick={handleAllesLegen}
                      className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                      title="Verplaats alles naar 'Niet gecategoriseerd'"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </button>
                    <button
                      onClick={handleAllesUitsluiten}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center gap-2"
                      title="Sluit alle bestanden uit"
                    >
                      <Trash2 className="w-4 h-4" />
                      Alles legen
                    </button>
                  </div>
                </div>
                
                {/* Hiërarchische layout - 4 categorieën */}
                <div className="space-y-4">
                  
                  {/* CATEGORIE 1: OVERZICHT - Dak/Spanten bovenaanzicht */}
                  <AanzichtDropZone
                    aanzicht="overzicht"
                    bestanden={bestandenPerAanzicht['overzicht']}
                    config={AANZICHT_CONFIG['overzicht']}
                    draggedFile={draggedFile}
                    onDrop={handleDropOnAanzicht}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onAanzichtChange={handleAanzichtChange}
                    onPreview={setPreviewPdf}
                    richting="horizontaal"
                  />
                  
                  {/* CATEGORIE 2: FUNDERING - Vloer, palen, kolomposities */}
                  <AanzichtDropZone
                    aanzicht="fundering"
                    bestanden={bestandenPerAanzicht['fundering']}
                    config={AANZICHT_CONFIG['fundering']}
                    draggedFile={draggedFile}
                    onDrop={handleDropOnAanzicht}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onAanzichtChange={handleAanzichtChange}
                    onPreview={setPreviewPdf}
                    richting="horizontaal"
                  />
                  
                  {/* CATEGORIE 3: DOORSNEDE - Zijkanten en doorsneden */}
                  <AanzichtDropZone
                    aanzicht="doorsnede"
                    bestanden={bestandenPerAanzicht['doorsnede']}
                    config={AANZICHT_CONFIG['doorsnede']}
                    draggedFile={draggedFile}
                    onDrop={handleDropOnAanzicht}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onAanzichtChange={handleAanzichtChange}
                    onPreview={setPreviewPdf}
                    richting="horizontaal"
                  />
                  
                  {/* CATEGORIE 4: DETAIL - Detailtekeningen */}
                  <AanzichtDropZone
                    aanzicht="detail"
                    bestanden={bestandenPerAanzicht['detail']}
                    config={AANZICHT_CONFIG['detail']}
                    draggedFile={draggedFile}
                    onDrop={handleDropOnAanzicht}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onAanzichtChange={handleAanzichtChange}
                    onPreview={setPreviewPdf}
                    richting="horizontaal"
                  />
                  
                  {/* NIET GEBRUIKEN - Uitgesloten bestanden */}
                  <AanzichtDropZone
                    aanzicht="uitgesloten"
                    bestanden={bestandenPerAanzicht['uitgesloten']}
                    config={AANZICHT_CONFIG['uitgesloten']}
                    draggedFile={draggedFile}
                    onDrop={handleDropOnAanzicht}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onAanzichtChange={handleAanzichtChange}
                    onPreview={setPreviewPdf}
                    richting="horizontaal"
                  />
                </div>
              </div>
              
              {/* Onbekende / niet-gecategoriseerde bestanden */}
              {bestandenPerAanzicht['onbekend'].length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-400" />
                    Niet gecategoriseerd ({bestandenPerAanzicht['onbekend'].length})
                    <span className="text-sm font-normal text-gray-500">— sleep naar een aanzicht hierboven</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {bestandenPerAanzicht['onbekend'].map(bestand => (
                      <div
                        key={bestand}
                        draggable
                        onDragStart={() => handleDragStart(bestand)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2 cursor-move hover:shadow-md hover:bg-white transition-all ${
                          draggedFile === bestand ? 'opacity-50 ring-2 ring-blue-400' : ''
                        }`}
                      >
                        <Grip className="w-4 h-4 text-gray-400" />
                        <FileText className="w-4 h-4 text-red-500" />
                        <span className="text-sm">{bestand}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* =========================================== */}
              {/* STRUCTUUR PUZZEL - Bouwpuzzel Analyse */}
              {/* =========================================== */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Puzzle className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Bouwpuzzel Analyse</h2>
                      <p className="text-sm text-gray-500">Hoe passen de constructie-onderdelen in elkaar?</p>
                    </div>
                  </div>
                  <button
                    onClick={handleAnalyseerStructuur}
                    disabled={gecategoriseerdeBestanden.length === 0 || isAnalysingStructuur}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      gecategoriseerdeBestanden.length === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    {isAnalysingStructuur ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyseren...
                      </>
                    ) : (
                      <>
                        <Grid3X3 className="w-4 h-4" />
                        Analyseer Structuur
                      </>
                    )}
                  </button>
                </div>
                
                {/* Puzzel Resultaat */}
                {structuurPuzzel && (
                  <div className="space-y-4">
                    {/* Betrouwbaarheid Status */}
                    {(() => {
                      const samenvatting = genereerPuzzelSamenvatting(structuurPuzzel)
                      const isGoed = samenvatting.betrouwbaarheidScore >= 70
                      
                      return (
                        <div className={`p-4 rounded-xl ${
                          isGoed 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-amber-50 border border-amber-200'
                        }`}>
                          <div className="flex items-center gap-3">
                            {isGoed ? (
                              <CheckCircle className="w-6 h-6 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-6 h-6 text-amber-600" />
                            )}
                            <div className="flex-1">
                              <p className={`font-semibold ${
                                isGoed ? 'text-green-800' : 'text-amber-800'
                              }`}>
                                {samenvatting.structuurBeschrijving}
                              </p>
                              <p className="text-sm text-gray-600">
                                {samenvatting.rasterBeschrijving} • {samenvatting.verbindingsBeschrijving}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-bold text-gray-800">
                                {samenvatting.betrouwbaarheidScore}%
                              </span>
                              <p className="text-xs text-gray-500">betrouwbaarheid</p>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                    
                    {/* Raster Grid Visualisatie */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Grid3X3 className="w-4 h-4 text-gray-600" />
                        Kolomraster ({structuurPuzzel.raster.assenX.length} × {structuurPuzzel.raster.assenY.length} assen)
                      </h3>
                      
                      {/* Raster weergave */}
                      <div className="overflow-x-auto">
                        <div className="inline-block min-w-max">
                          {/* Header rij met kolomnummers (Y-assen) */}
                          <div className="flex gap-1">
                            <div className="w-10 h-8" /> {/* Lege hoek */}
                            {structuurPuzzel.raster.assenY.map((num: number) => (
                              <div 
                                key={num} 
                                className="w-12 h-8 flex items-center justify-center text-xs font-bold text-gray-600"
                              >
                                {num}
                              </div>
                            ))}
                          </div>
                          
                          {/* Raster rijen (X-assen) */}
                          {structuurPuzzel.raster.assenX.map((as: string) => (
                            <div key={as} className="flex gap-1">
                              {/* As label */}
                              <div className="w-10 h-12 flex items-center justify-center text-xs font-bold text-gray-600">
                                {as}
                              </div>
                              
                              {/* Cellen */}
                              {structuurPuzzel.raster.assenY.map((rij: number) => {
                                const positie = `${as}-${rij}`
                                const kolom = structuurPuzzel.kolommen.find((k) => k.as === as && k.rij === rij)
                                const heeftLigger = structuurPuzzel.liggers.some(
                                  (l) => l.vanKolom === positie || l.naarKolom === positie
                                )
                                
                                return (
                                  <div 
                                    key={positie}
                                    className={`w-12 h-12 rounded flex items-center justify-center text-xs ${
                                      kolom 
                                        ? 'bg-blue-500 text-white font-bold' 
                                        : heeftLigger
                                          ? 'bg-blue-200 text-blue-800'
                                          : 'bg-gray-200 text-gray-400'
                                    }`}
                                    title={kolom ? `Kolom ${kolom.id}: ${kolom.profiel || 'onbekend'}` : `Positie ${positie}`}
                                  >
                                    {kolom ? 'K' : heeftLigger ? '·' : ''}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Legenda */}
                      <div className="flex gap-4 mt-3 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 bg-blue-500 rounded" /> Kolom
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 bg-blue-200 rounded" /> Ligger verbinding
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 bg-gray-200 rounded" /> Leeg
                        </div>
                      </div>
                    </div>
                    
                    {/* Elementen Overzicht */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Kolommen ({structuurPuzzel.kolommen.length})
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {structuurPuzzel.kolommen.slice(0, 8).map((kolom, i) => (
                            <div key={i} className="text-xs flex items-center gap-2">
                              <span className="bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded">
                                {kolom.id}
                              </span>
                              <span className="text-gray-600">{kolom.as}-{kolom.rij}</span>
                              {kolom.profiel && (
                                <span className="text-gray-400">{kolom.profiel}</span>
                              )}
                            </div>
                          ))}
                          {structuurPuzzel.kolommen.length > 8 && (
                            <p className="text-xs text-gray-400 italic">
                              +{structuurPuzzel.kolommen.length - 8} meer...
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-xl p-4">
                        <h4 className="font-semibold text-green-900 mb-2">
                          Liggers ({structuurPuzzel.liggers.length})
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {structuurPuzzel.liggers.slice(0, 8).map((ligger, i) => (
                            <div key={i} className="text-xs flex items-center gap-2">
                              <span className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                                {ligger.id}
                              </span>
                              <span className="text-gray-600">{ligger.vanKolom} → {ligger.naarKolom}</span>
                            </div>
                          ))}
                          {structuurPuzzel.liggers.length > 8 && (
                            <p className="text-xs text-gray-400 italic">
                              +{structuurPuzzel.liggers.length - 8} meer...
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-amber-50 rounded-xl p-4">
                        <h4 className="font-semibold text-amber-900 mb-2">
                          Vakwerkspanten ({structuurPuzzel.spanten.length})
                        </h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {structuurPuzzel.spanten.slice(0, 6).map((spant, i) => (
                            <div key={i} className="text-xs bg-amber-100/50 rounded-lg p-2">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-amber-300 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                                  {spant.id}
                                </span>
                                <span className="text-amber-800">As {spant.asPositie}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                  spant.type === 'gevel' ? 'bg-blue-100 text-blue-700' : 'bg-amber-200 text-amber-700'
                                }`}>
                                  {spant.type}
                                </span>
                              </div>
                              <div className="text-[10px] text-gray-600 space-y-0.5 ml-2">
                                <div>↗ <span className="text-amber-700">Bovenrand:</span> {spant.bovenrand?.profiel || spant.profiel || '-'}</div>
                                <div>↘ <span className="text-amber-700">Onderrand:</span> {spant.onderrand?.profiel || '-'}</div>
                                <div>╱ <span className="text-amber-700">Diagonalen:</span> {spant.diagonalen?.length || 0}× {spant.diagonalen?.[0]?.profiel || '-'}</div>
                              </div>
                            </div>
                          ))}
                          {structuurPuzzel.spanten.length > 6 && (
                            <p className="text-xs text-amber-600 italic text-center">
                              +{structuurPuzzel.spanten.length - 6} meer spanten...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Verbindingen */}
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-1">
                        <Link2 className="w-4 h-4" />
                        Verbindingen ({structuurPuzzel.verbindingen.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {structuurPuzzel.verbindingen.slice(0, 12).map((verb, i) => (
                          <span 
                            key={i} 
                            className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded"
                            title={`${verb.element1} ↔ ${verb.element2}`}
                          >
                            {verb.type}
                          </span>
                        ))}
                        {structuurPuzzel.verbindingen.length > 12 && (
                          <span className="text-xs text-purple-600 italic">
                            +{structuurPuzzel.verbindingen.length - 12} meer
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Vakwerkspant Visualisatie */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        🏗️ Vakwerkspant Doorsnede
                        <span className="text-xs text-slate-400 font-normal">
                          (typisch spant - {structuurPuzzel.spanten[0]?.id || 'SP1'})
                        </span>
                      </h4>
                      
                      {/* SVG Vakwerk visualisatie */}
                      <svg viewBox="0 0 400 180" className="w-full h-40 bg-slate-900/50 rounded-lg">
                        {/* Grid lijnen */}
                        <defs>
                          <pattern id="spantGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#spantGrid)" />
                        
                        {/* Kolommen */}
                        <rect x="30" y="60" width="12" height="100" fill="#ef4444" stroke="#fca5a5" strokeWidth="1"/>
                        <rect x="358" y="60" width="12" height="100" fill="#ef4444" stroke="#fca5a5" strokeWidth="1"/>
                        
                        {/* Labels kolommen */}
                        <text x="36" y="170" fill="#fca5a5" fontSize="8" textAnchor="middle">K</text>
                        <text x="364" y="170" fill="#fca5a5" fontSize="8" textAnchor="middle">K</text>
                        
                        {/* Onderrand */}
                        <line x1="42" y1="60" x2="358" y2="60" stroke="#22c55e" strokeWidth="4"/>
                        <text x="200" y="55" fill="#86efac" fontSize="8" textAnchor="middle">
                          {structuurPuzzel.spanten[0]?.onderrand?.profiel || 'HE 120 A'} (onderrand)
                        </text>
                        
                        {/* Bovenrand - links */}
                        <line x1="36" y1="60" x2="200" y2="15" stroke="#3b82f6" strokeWidth="4"/>
                        {/* Bovenrand - rechts */}
                        <line x1="200" y1="15" x2="364" y2="60" stroke="#3b82f6" strokeWidth="4"/>
                        <text x="200" y="10" fill="#93c5fd" fontSize="8" textAnchor="middle">
                          {structuurPuzzel.spanten[0]?.bovenrand?.profiel || 'HE 200 A'} (bovenrand)
                        </text>
                        
                        {/* Nok punt */}
                        <circle cx="200" cy="15" r="4" fill="#fbbf24"/>
                        
                        {/* Diagonalen */}
                        <line x1="80" y1="60" x2="120" y2="42" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,2"/>
                        <line x1="120" y1="42" x2="120" y2="60" stroke="#64748b" strokeWidth="2"/>
                        <line x1="120" y1="60" x2="160" y2="28" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,2"/>
                        <line x1="160" y1="28" x2="160" y2="60" stroke="#64748b" strokeWidth="2"/>
                        
                        <line x1="320" y1="60" x2="280" y2="42" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,2"/>
                        <line x1="280" y1="42" x2="280" y2="60" stroke="#64748b" strokeWidth="2"/>
                        <line x1="280" y1="60" x2="240" y2="28" stroke="#a855f7" strokeWidth="2" strokeDasharray="4,2"/>
                        <line x1="240" y1="28" x2="240" y2="60" stroke="#64748b" strokeWidth="2"/>
                        
                        {/* Legenda */}
                        <g transform="translate(10, 100)">
                          <rect x="0" y="0" width="10" height="3" fill="#3b82f6"/>
                          <text x="14" y="4" fill="#94a3b8" fontSize="6">Bovenrand</text>
                          
                          <rect x="0" y="10" width="10" height="3" fill="#22c55e"/>
                          <text x="14" y="14" fill="#94a3b8" fontSize="6">Onderrand</text>
                          
                          <line x1="0" y1="23" x2="10" y2="23" stroke="#a855f7" strokeWidth="2" strokeDasharray="2,1"/>
                          <text x="14" y="25" fill="#94a3b8" fontSize="6">Diagonalen</text>
                          
                          <line x1="0" y1="33" x2="10" y2="33" stroke="#64748b" strokeWidth="2"/>
                          <text x="14" y="35" fill="#94a3b8" fontSize="6">Verticalen</text>
                        </g>
                        
                        {/* Profielen legenda rechts */}
                        <g transform="translate(320, 100)">
                          <text x="0" y="0" fill="#94a3b8" fontSize="7" fontWeight="bold">Profielen:</text>
                          <text x="0" y="12" fill="#93c5fd" fontSize="6">{structuurPuzzel.spanten[0]?.bovenrand?.profiel || 'HE 200 A'}</text>
                          <text x="0" y="22" fill="#86efac" fontSize="6">{structuurPuzzel.spanten[0]?.onderrand?.profiel || 'HE 120 A'}</text>
                          <text x="0" y="32" fill="#c4b5fd" fontSize="6">{structuurPuzzel.spanten[0]?.diagonalen?.[0]?.profiel || 'L 40.40.4'}</text>
                        </g>
                        
                        {/* Afmetingen */}
                        <line x1="36" y1="165" x2="364" y2="165" stroke="#64748b" strokeWidth="1"/>
                        <text x="200" y="178" fill="#94a3b8" fontSize="8" textAnchor="middle">
                          Overspanning: {(structuurPuzzel.spanten[0]?.overspanning || 22500) / 1000}m
                        </text>
                      </svg>
                      
                      {/* Spant details */}
                      <div className="grid grid-cols-4 gap-3 mt-3">
                        <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-amber-400">
                            {structuurPuzzel.spanten.length}
                          </div>
                          <div className="text-[10px] text-slate-400">Spanten</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-blue-400">
                            {(structuurPuzzel.spanten[0]?.nokHoogte || 8000) / 1000}m
                          </div>
                          <div className="text-[10px] text-slate-400">Nokhoogte</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-green-400">
                            {(structuurPuzzel.spanten[0]?.gootHoogte || 6000) / 1000}m
                          </div>
                          <div className="text-[10px] text-slate-400">Goothoogte</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-purple-400">
                            {structuurPuzzel.spanten[0]?.helling?.toFixed(1) || '5.0'}°
                          </div>
                          <div className="text-[10px] text-slate-400">Dakhelling</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Gordingen overzicht */}
                    {structuurPuzzel.gordingen && structuurPuzzel.gordingen.length > 0 && (
                    <div className="bg-cyan-50 rounded-xl p-4">
                      <h4 className="font-semibold text-cyan-900 mb-2">
                        Gordingen ({structuurPuzzel.gordingen.length})
                        <span className="text-xs text-cyan-600 font-normal ml-2">
                          verbinden de spanten in lengterichting
                        </span>
                      </h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-cyan-100 rounded-lg p-2 text-center">
                          <div className="font-bold text-cyan-800">
                            {structuurPuzzel.gordingen[0]?.profiel || 'IPE 160'}
                          </div>
                          <div className="text-cyan-600">Profiel</div>
                        </div>
                        <div className="bg-cyan-100 rounded-lg p-2 text-center">
                          <div className="font-bold text-cyan-800">
                            {((structuurPuzzel.gordingen[0]?.lengte || 6000) / 1000).toFixed(1)}m
                          </div>
                          <div className="text-cyan-600">Lengte</div>
                        </div>
                        <div className="bg-cyan-100 rounded-lg p-2 text-center">
                          <div className="font-bold text-cyan-800">
                            {structuurPuzzel.spanten.length > 1 ? structuurPuzzel.spanten.length - 1 : 0}
                          </div>
                          <div className="text-cyan-600">Velden</div>
                        </div>
                      </div>
                    </div>
                    )}
                    
                    {/* Windverbanden Visualisatie */}
                    {structuurPuzzel.windverbanden && structuurPuzzel.windverbanden.length > 0 && (
                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl p-4">
                      <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                        💨 Windverbanden ({structuurPuzzel.windverbanden.length})
                        <span className="text-xs text-indigo-300 font-normal">
                          X-kruisverbanden voor stabiliteit
                        </span>
                      </h4>
                      
                      {/* SVG Bovenaanzicht met X-verbanden */}
                      <svg viewBox="0 0 400 200" className="w-full h-48 bg-slate-900/50 rounded-lg">
                        <defs>
                          <pattern id="windGrid" width="25" height="25" patternUnits="userSpaceOnUse">
                            <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#334155" strokeWidth="0.5"/>
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#windGrid)" />
                        
                        {/* Hal contour */}
                        <rect x="30" y="30" width="340" height="140" fill="none" stroke="#64748b" strokeWidth="2"/>
                        
                        {/* Spantlijnen (verticaal in bovenaanzicht) */}
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                          <line key={`spant-${i}`} 
                            x1={30 + i * (340/12)} y1="30" 
                            x2={30 + i * (340/12)} y2="170" 
                            stroke="#475569" strokeWidth="1" strokeDasharray="4,2"
                          />
                        ))}
                        
                        {/* Noklijn */}
                        <line x1="30" y1="100" x2="370" y2="100" stroke="#fbbf24" strokeWidth="2"/>
                        <text x="380" y="103" fill="#fbbf24" fontSize="8">nok</text>
                        
                        {/* X-verbanden vooraan (eerste 3 vakken) */}
                        <g stroke="#22c55e" strokeWidth="2">
                          {/* Vak 1 - linker dakvlak */}
                          <line x1="30" y1="30" x2={30 + 340/12} y2="100"/>
                          <line x1={30 + 340/12} y1="30" x2="30" y2="100"/>
                          {/* Vak 1 - rechter dakvlak */}
                          <line x1="30" y1="100" x2={30 + 340/12} y2="170"/>
                          <line x1={30 + 340/12} y1="100" x2="30" y2="170"/>
                          
                          {/* Vak 2 */}
                          <line x1={30 + 340/12} y1="30" x2={30 + 2*340/12} y2="100"/>
                          <line x1={30 + 2*340/12} y1="30" x2={30 + 340/12} y2="100"/>
                          <line x1={30 + 340/12} y1="100" x2={30 + 2*340/12} y2="170"/>
                          <line x1={30 + 2*340/12} y1="100" x2={30 + 340/12} y2="170"/>
                        </g>
                        
                        {/* X-verbanden achteraan (laatste 3 vakken) */}
                        <g stroke="#f97316" strokeWidth="2">
                          {/* Vak -2 */}
                          <line x1={30 + 10*340/12} y1="30" x2={30 + 11*340/12} y2="100"/>
                          <line x1={30 + 11*340/12} y1="30" x2={30 + 10*340/12} y2="100"/>
                          <line x1={30 + 10*340/12} y1="100" x2={30 + 11*340/12} y2="170"/>
                          <line x1={30 + 11*340/12} y1="100" x2={30 + 10*340/12} y2="170"/>
                          
                          {/* Vak -1 */}
                          <line x1={30 + 11*340/12} y1="30" x2="370" y2="100"/>
                          <line x1="370" y1="30" x2={30 + 11*340/12} y2="100"/>
                          <line x1={30 + 11*340/12} y1="100" x2="370" y2="170"/>
                          <line x1="370" y1="100" x2={30 + 11*340/12} y2="170"/>
                        </g>
                        
                        {/* Legenda */}
                        <g transform="translate(30, 180)">
                          <line x1="0" y1="5" x2="15" y2="5" stroke="#22c55e" strokeWidth="2"/>
                          <text x="20" y="8" fill="#94a3b8" fontSize="7">Windverband voor</text>
                          
                          <line x1="100" y1="5" x2="115" y2="5" stroke="#f97316" strokeWidth="2"/>
                          <text x="120" y="8" fill="#94a3b8" fontSize="7">Windverband achter</text>
                          
                          <line x1="210" y1="5" x2="225" y2="5" stroke="#fbbf24" strokeWidth="2"/>
                          <text x="230" y="8" fill="#94a3b8" fontSize="7">Noklijn</text>
                        </g>
                      </svg>
                      
                      {/* Windverband details */}
                      <div className="grid grid-cols-4 gap-2 mt-3">
                        <div className="bg-indigo-800/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-green-400">
                            {structuurPuzzel.windverbanden.filter(w => w?.vlak === 'dak').length}
                          </div>
                          <div className="text-[10px] text-indigo-300">Dakvlak</div>
                        </div>
                        <div className="bg-indigo-800/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-blue-400">
                            {structuurPuzzel.windverbanden.filter(w => w?.vlak?.includes('gevel')).length}
                          </div>
                          <div className="text-[10px] text-indigo-300">Gevels</div>
                        </div>
                        <div className="bg-indigo-800/50 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-amber-400">
                            {[...new Set(structuurPuzzel.windverbanden.filter(w => w?.profiel).map(w => w.profiel))].length}
                          </div>
                          <div className="text-[10px] text-indigo-300">Profielen</div>
                        </div>
                        <div className="bg-indigo-800/50 rounded-lg p-2 text-center">
                          <div className="text-[10px] font-mono text-purple-300">
                            {[...new Set(structuurPuzzel.windverbanden.filter(w => w?.profiel).map(w => w.profiel))].slice(0, 2).join(', ') || '-'}
                          </div>
                          <div className="text-[10px] text-indigo-300">Hoekstaal</div>
                        </div>
                      </div>
                    </div>
                    )}
                    
                    {/* Betrouwbaarheid Details */}
                    <div className="bg-gray-100 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Betrouwbaarheid per categorie</h4>
                      <div className="grid grid-cols-4 gap-3">
                        {Object.entries(structuurPuzzel.betrouwbaarheid).map(([key, value]) => (
                          <div key={key} className="text-center">
                            <div className={`text-lg font-bold ${
                              value >= 70 ? 'text-green-600' : value >= 40 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {Math.round(value)}%
                            </div>
                            <div className="text-xs text-gray-500 capitalize">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* PROFIEL KOPPELING SECTIE - Toont gevonden profielen uit PDF */}
                    {profielDatabase && (
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-emerald-900 flex items-center gap-2">
                          🔗 Gekoppelde Profielen uit PDF
                          <span className="text-xs font-normal text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {profielDatabase.gevondenProfielen.size} uniek
                          </span>
                        </h4>
                        
                        {/* Toggles voor analyse methodes */}
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={useRobuusteAnalyse} 
                              onChange={(e) => setUseRobuusteAnalyse(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                            />
                            <span className="text-emerald-700">Robuust v2.0</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={useIntegraalModel} 
                              onChange={(e) => setUseIntegraalModel(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-indigo-700">Integraal Model v1.0</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={useSlimReader} 
                              onChange={(e) => setUseSlimReader(e.target.checked)}
                              className="w-3.5 h-3.5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span className="text-cyan-700">Slim Uitlezen v1.0</span>
                          </label>
                        </div>
                      </div>
                      
                      {/* SLIMME PDF READER RESULTAAT */}
                      {slimPdfResultaat && (
                        <div className="mb-4 p-3 bg-gradient-to-br from-cyan-50 to-sky-50 rounded-lg border border-cyan-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-cyan-800">📖 Slimme PDF Reader</span>
                            {isSlimAnalysing && <Loader2 className="w-3 h-3 animate-spin text-cyan-600" />}
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 text-center mb-3">
                            <div className="bg-cyan-50 rounded p-2">
                              <div className="text-xl font-bold text-cyan-700">
                                {Array.from(slimPdfResultaat.values()).reduce((sum, r) => sum + r.profielen.size, 0)}
                              </div>
                              <div className="text-[10px] text-cyan-600">Profielen</div>
                            </div>
                            <div className="bg-sky-50 rounded p-2">
                              <div className="text-xl font-bold text-sky-700">
                                {Array.from(slimPdfResultaat.values()).reduce((sum, r) => sum + r.elementKoppelingen.size, 0)}
                              </div>
                              <div className="text-[10px] text-sky-600">Koppelingen</div>
                            </div>
                            <div className="bg-blue-50 rounded p-2">
                              <div className="text-xl font-bold text-blue-700">
                                {Array.from(slimPdfResultaat.values()).reduce((sum, r) => sum + r.tabellen.length, 0)}
                              </div>
                              <div className="text-[10px] text-blue-600">Tabellen</div>
                            </div>
                            <div className="bg-indigo-50 rounded p-2">
                              <div className="text-xl font-bold text-indigo-700">
                                {Math.round(Array.from(slimPdfResultaat.values()).reduce((sum, r) => sum + r.extractieKwaliteit, 0) / slimPdfResultaat.size)}%
                              </div>
                              <div className="text-[10px] text-indigo-600">Kwaliteit</div>
                            </div>
                          </div>
                          
                          {/* Gevonden profielen */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {Array.from(new Set(
                              Array.from(slimPdfResultaat.values())
                                .flatMap(r => Array.from(r.profielen))
                            )).slice(0, 12).map(profiel => (
                              <span 
                                key={profiel}
                                className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded text-xs font-medium"
                              >
                                {profiel}
                              </span>
                            ))}
                          </div>
                          
                          {/* Raster info als aanwezig */}
                          {Array.from(slimPdfResultaat.values()).some(r => r.assenX.length > 0) && (
                            <div className="text-[10px] text-cyan-700 bg-cyan-50/50 rounded px-2 py-1">
                              📐 Raster: {Array.from(slimPdfResultaat.values())
                                .filter(r => r.assenX.length > 0)
                                .map(r => `${r.assenX.map(a => a.label).join('-')} × ${r.assenY.map(a => a.label).join('-')}`)
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* VISUELE ANALYSE RESULTAAT */}
                      {visueleAnalyse && (
                        <div className="mb-4 p-3 bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg border border-rose-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-rose-800">🎨 Visuele Analyse</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              visueleAnalyse.detectieKwaliteit >= 60 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {visueleAnalyse.detectieKwaliteit}%
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-5 gap-2 text-center text-[10px]">
                            <div className="bg-rose-50 rounded p-1.5">
                              <div className="text-sm font-bold text-rose-700">{visueleAnalyse.lijnen.length}</div>
                              <div className="text-rose-600">Lijnen</div>
                            </div>
                            <div className="bg-pink-50 rounded p-1.5">
                              <div className="text-sm font-bold text-pink-700">{visueleAnalyse.rechthoeken.length}</div>
                              <div className="text-pink-600">Rechthoeken</div>
                            </div>
                            <div className="bg-fuchsia-50 rounded p-1.5">
                              <div className="text-sm font-bold text-fuchsia-700">{visueleAnalyse.cirkels.length}</div>
                              <div className="text-fuchsia-600">Cirkels</div>
                            </div>
                            <div className="bg-purple-50 rounded p-1.5">
                              <div className="text-sm font-bold text-purple-700">{visueleAnalyse.profielContouren.length}</div>
                              <div className="text-purple-600">Profielen</div>
                            </div>
                            <div className="bg-violet-50 rounded p-1.5">
                              <div className="text-sm font-bold text-violet-700">{visueleAnalyse.rasterLijnenX.length}×{visueleAnalyse.rasterLijnenY.length}</div>
                              <div className="text-violet-600">Raster</div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* INTEGRAAL MODEL RESULTAAT */}
                      {integraalModel && (
                        <div className="mb-4 p-3 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-lg border border-indigo-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-indigo-800">🔧 Integraal Model</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              integraalModel.validatie.score >= 80 
                                ? 'bg-green-100 text-green-700' 
                                : integraalModel.validatie.score >= 50 
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {integraalModel.validatie.score}% validatie
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 text-center mb-3">
                            <div className="bg-indigo-50 rounded p-2">
                              <div className="text-xl font-bold text-indigo-700">{integraalModel.model.elementen.length}</div>
                              <div className="text-[10px] text-indigo-600">Elementen</div>
                            </div>
                            <div className="bg-violet-50 rounded p-2">
                              <div className="text-xl font-bold text-violet-700">{integraalModel.tracking.size}</div>
                              <div className="text-[10px] text-violet-600">Getrackt</div>
                            </div>
                            <div className="bg-purple-50 rounded p-2">
                              <div className="text-lg font-bold text-purple-700">{integraalModel.model.geometrie.type}</div>
                              <div className="text-[10px] text-purple-600">Geometrie</div>
                            </div>
                            <div className="bg-fuchsia-50 rounded p-2">
                              <div className="text-lg font-bold text-fuchsia-700">{(integraalModel.model.metadata.totaalGewicht / 1000).toFixed(1)}t</div>
                              <div className="text-[10px] text-fuchsia-600">Gewicht</div>
                            </div>
                          </div>
                          
                          {/* Element tracking details */}
                          <div className="bg-white/60 rounded-lg p-2 mb-2">
                            <div className="text-xs text-indigo-700 font-medium mb-1">🎯 Element Tracking</div>
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                              {[...integraalModel.tracking.entries()].slice(0, 15).map(([id, track]) => (
                                <span 
                                  key={id} 
                                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    track.conflicten.length > 0 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : track.tekeningen.length > 1 
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-600'
                                  }`}
                                  title={`${track.tekeningen.length} tekening(en), ${track.conflicten.length} conflict(en)`}
                                >
                                  {id}
                                  {track.tekeningen.length > 1 && <span className="ml-0.5">✓</span>}
                                  {track.conflicten.length > 0 && <span className="ml-0.5">⚠</span>}
                                </span>
                              ))}
                              {integraalModel.tracking.size > 15 && (
                                <span className="text-[10px] text-indigo-500">+{integraalModel.tracking.size - 15} meer</span>
                              )}
                            </div>
                          </div>
                          
                          {/* Validatie checks */}
                          {integraalModel.validatie.checks.filter(c => c.status !== 'ok').length > 0 && (
                            <div className="bg-white/60 rounded-lg p-2">
                              <div className="text-xs text-amber-700 font-medium mb-1">⚠️ Aandachtspunten</div>
                              <div className="space-y-1 max-h-16 overflow-y-auto">
                                {integraalModel.validatie.checks
                                  .filter(c => c.status !== 'ok')
                                  .slice(0, 3)
                                  .map((check, idx) => (
                                    <div key={idx} className={`text-[10px] px-2 py-1 rounded ${
                                      check.status === 'fout' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      {check.status === 'fout' ? '❌' : '⚠️'} {check.bericht}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Raster info */}
                          <div className="mt-2 pt-2 border-t border-indigo-100 text-xs text-indigo-600">
                            📐 Raster: {integraalModel.model.raster.assenX.join('-')} × {integraalModel.model.raster.assenY.join('-')} 
                            ({integraalModel.model.raster.totaalX/1000}m × {integraalModel.model.raster.totaalY/1000}m)
                          </div>
                        </div>
                      )}
                      
                      {/* Laden indicator voor integraal model */}
                      {isAnalysingIntegraal && (
                        <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                          <span className="text-sm text-indigo-700">Integraal model wordt gebouwd...</span>
                        </div>
                      )}
                      
                      {/* VALIDATIE STATUS (alleen bij robuuste analyse) */}
                      {robuusteDatabase && (
                        <div className="mb-4 p-3 bg-white/80 rounded-lg border border-emerald-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-emerald-800">📊 Validatie Status</span>
                            {robuusteDatabase.validatie.conflicten.length === 0 ? (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Geen conflicten</span>
                            ) : (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                ⚠ {robuusteDatabase.validatie.conflicten.length} conflicten
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-emerald-50 rounded p-2">
                              <div className="text-xl font-bold text-emerald-700">{robuusteDatabase.validatie.totaalElementen}</div>
                              <div className="text-[10px] text-emerald-600">Elementen</div>
                            </div>
                            <div className="bg-blue-50 rounded p-2">
                              <div className="text-xl font-bold text-blue-700">{robuusteDatabase.validatie.metProfiel}</div>
                              <div className="text-[10px] text-blue-600">Met profiel</div>
                            </div>
                            <div className="bg-purple-50 rounded p-2">
                              <div className="text-xl font-bold text-purple-700">{robuusteDatabase.validatie.metPositie}</div>
                              <div className="text-[10px] text-purple-600">Met positie</div>
                            </div>
                            <div className="bg-green-50 rounded p-2">
                              <div className="text-xl font-bold text-green-700">{robuusteDatabase.validatie.gevalideerd}</div>
                              <div className="text-[10px] text-green-600">Gevalideerd ✓</div>
                            </div>
                          </div>
                          
                          {/* Stuklijst info */}
                          {robuusteDatabase.stuklijst.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-emerald-100">
                              <div className="text-xs text-emerald-700">
                                📋 Stuklijst: {robuusteDatabase.stuklijst.length} items gevonden
                              </div>
                            </div>
                          )}
                          
                          {/* Raster info */}
                          {(robuusteDatabase.assen.x.length > 0 || robuusteDatabase.assen.y.length > 0) && (
                            <div className="mt-2 pt-2 border-t border-emerald-100">
                              <div className="text-xs text-emerald-700">
                                📐 Raster: {robuusteDatabase.assen.x.map(a => a.as).join('-')} × {robuusteDatabase.assen.y.map(a => a.as).join('-')}
                              </div>
                            </div>
                          )}
                          
                          {/* Conflicten */}
                          {robuusteDatabase.validatie.conflicten.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-amber-100">
                              <div className="text-xs text-amber-700 font-medium mb-1">⚠️ Conflicten:</div>
                              <div className="space-y-1 max-h-20 overflow-y-auto">
                                {robuusteDatabase.validatie.conflicten.slice(0, 3).map((conflict, idx) => (
                                  <div key={idx} className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">
                                    <span className="font-mono font-medium">{conflict.elementId}:</span> {conflict.conflict}
                                  </div>
                                ))}
                                {robuusteDatabase.validatie.conflicten.length > 3 && (
                                  <div className="text-[10px] text-amber-500">
                                    ... en {robuusteDatabase.validatie.conflicten.length - 3} meer
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Gevonden profielen overzicht */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {/* Kolom profielen */}
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="text-xs text-emerald-700 font-medium mb-2">
                            Kolommen ({profielDatabase.kolommen.size} gekoppeld)
                          </div>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {[...profielDatabase.kolommen.entries()].slice(0, 6).map(([id, koppeling]) => {
                              const validatie = valideerProfiel(koppeling.profiel)
                              return (
                                <div key={id} className="text-xs flex items-center gap-2">
                                  <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-mono">{id}</span>
                                  <span className="text-gray-600">→</span>
                                  <span className={`font-medium ${validatie.geldig ? 'text-gray-800' : 'text-red-600'}`}>
                                    {koppeling.profiel}
                                    {!validatie.geldig && <span className="text-red-400 text-[10px] ml-1">(?)</span>}
                                  </span>
                                  <span className="text-gray-400">({Math.round(koppeling.betrouwbaarheid * 100)}%)</span>
                                </div>
                              )
                            })}
                            {profielDatabase.kolommen.size === 0 && (
                              <div className="text-xs text-gray-400 italic">Geen specifieke kolom profielen gevonden</div>
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-600 mt-2">
                            Default: {profielDatabase.defaults.kolom}
                          </div>
                        </div>
                        
                        {/* Ligger profielen */}
                        <div className="bg-white/60 rounded-lg p-3">
                          <div className="text-xs text-emerald-700 font-medium mb-2">
                            Liggers ({profielDatabase.liggers.size} gekoppeld)
                          </div>
                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {[...profielDatabase.liggers.entries()].slice(0, 6).map(([id, koppeling]) => {
                              const validatie = valideerProfiel(koppeling.profiel)
                              return (
                                <div key={id} className="text-xs flex items-center gap-2">
                                  <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded font-mono">{id}</span>
                                  <span className="text-gray-600">→</span>
                                  <span className={`font-medium ${validatie.geldig ? 'text-gray-800' : 'text-red-600'}`}>
                                    {koppeling.profiel}
                                  </span>
                                </div>
                              )
                            })}
                            {profielDatabase.liggers.size === 0 && (
                              <div className="text-xs text-gray-400 italic">Geen specifieke ligger profielen gevonden</div>
                            )}
                          </div>
                          <div className="text-[10px] text-emerald-600 mt-2">
                            Default: {profielDatabase.defaults.ligger}
                          </div>
                        </div>
                      </div>
                      
                      {/* Alle gevonden profielen */}
                      <div className="bg-white/60 rounded-lg p-3">
                        <div className="text-xs text-emerald-700 font-medium mb-2">
                          Alle gevonden profielen in tekeningen:
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {[...profielDatabase.gevondenProfielen].map(profiel => {
                            const validatie = valideerProfiel(profiel)
                            return (
                              <span 
                                key={profiel} 
                                className={`text-xs px-2 py-1 rounded ${
                                  validatie.geldig 
                                    ? 'bg-emerald-100 text-emerald-800' 
                                    : 'bg-red-100 text-red-700 line-through'
                                }`}
                                title={validatie.geldig ? `${validatie.eigenschappen?.gewicht || '?'} kg/m` : 'Onbekend profiel'}
                              >
                                {profiel}
                                {validatie.geldig && validatie.eigenschappen && (
                                  <span className="text-emerald-500 ml-1 text-[9px]">
                                    {validatie.eigenschappen.gewicht}kg/m
                                  </span>
                                )}
                              </span>
                            )
                          })}
                          {profielDatabase.gevondenProfielen.size === 0 && (
                            <span className="text-xs text-gray-400 italic">Geen profielen gedetecteerd in PDF tekst</span>
                          )}
                        </div>
                      </div>
                    </div>
                    )}
                    
                    {/* Dakconstructie Info */}
                    {dakconstructieInfo && (
                    <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 border border-sky-200">
                      <h4 className="font-semibold text-sky-900 mb-3 flex items-center gap-2">
                        🏗️ Dakconstructie Details
                        <span className="text-xs font-normal text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
                          {dakconstructieInfo.spantType}
                        </span>
                      </h4>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/60 rounded-lg p-2 text-center">
                          <div className="text-lg font-bold text-sky-700">{dakconstructieInfo.gordingAfstand}</div>
                          <div className="text-[10px] text-sky-600">mm h.o.h. gordingen</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-sky-700">{dakconstructieInfo.gordingProfiel}</div>
                          <div className="text-[10px] text-sky-600">Gording profiel</div>
                        </div>
                        <div className="bg-white/60 rounded-lg p-2 text-center">
                          <div className="text-sm font-bold text-sky-700">{dakconstructieInfo.windverbandProfiel}</div>
                          <div className="text-[10px] text-sky-600">Windverband</div>
                        </div>
                      </div>
                      
                      {dakconstructieInfo.spantProfiel && (
                        <div className="mt-3 bg-white/60 rounded-lg p-2">
                          <div className="text-xs text-sky-700 font-medium mb-1">Spant profielen:</div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>Bovenrand: <span className="font-medium">{dakconstructieInfo.spantProfiel.bovenrand}</span></div>
                            <div>Onderrand: <span className="font-medium">{dakconstructieInfo.spantProfiel.onderrand}</span></div>
                            <div>Diagonaal: <span className="font-medium">{dakconstructieInfo.spantProfiel.diagonaal}</span></div>
                          </div>
                        </div>
                      )}
                      
                      {(dakconstructieInfo.gootHoogte || dakconstructieInfo.nokHoogte) && (
                        <div className="mt-2 flex gap-4 text-xs text-sky-600">
                          {dakconstructieInfo.gootHoogte && <span>Goothoogte: {dakconstructieInfo.gootHoogte}mm</span>}
                          {dakconstructieInfo.nokHoogte && <span>Nokhoogte: {dakconstructieInfo.nokHoogte}mm</span>}
                        </div>
                      )}
                    </div>
                    )}
                    
                    {/* Loading state voor profiel analyse */}
                    {isAnalysingProfielen && (
                      <div className="bg-blue-50 rounded-xl p-4 flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-blue-700">Profielen koppelen uit PDF tekst...</span>
                      </div>
                    )}
                    
                    {/* Bron tekeningen */}
                    <details className="bg-white border rounded-xl overflow-hidden">
                      <summary className="px-4 py-3 text-gray-700 cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium">
                        📄 Bron tekeningen
                      </summary>
                      <div className="px-4 pb-4 text-sm space-y-1">
                        {structuurPuzzel.bronTekeningen.fundering && (
                          <p><span className="text-gray-500">Fundering:</span> {structuurPuzzel.bronTekeningen.fundering}</p>
                        )}
                        {structuurPuzzel.bronTekeningen.dak && (
                          <p><span className="text-gray-500">Dak:</span> {structuurPuzzel.bronTekeningen.dak}</p>
                        )}
                        {structuurPuzzel.bronTekeningen.gevels && structuurPuzzel.bronTekeningen.gevels.length > 0 && (
                          <p><span className="text-gray-500">Gevels:</span> {structuurPuzzel.bronTekeningen.gevels.join(', ')}</p>
                        )}
                        {structuurPuzzel.bronTekeningen.details && structuurPuzzel.bronTekeningen.details.length > 0 && (
                          <p><span className="text-gray-500">Details:</span> {structuurPuzzel.bronTekeningen.details.join(', ')}</p>
                        )}
                      </div>
                    </details>
                  </div>
                )}
                
                {/* Lege staat */}
                {!structuurPuzzel && !isAnalysingStructuur && (
                  <div className="text-center py-8 text-gray-400">
                    <Puzzle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      Categoriseer tekeningen en klik op "Analyseer Structuur" om te zien hoe de bouwonderdelen in elkaar passen
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'upload' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">
                  PDF Bestanden Uploaden
                </h2>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useRealPDFParsing}
                    onChange={(e) => setUseRealPDFParsing(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span className="text-gray-600">Geavanceerde PDF analyse</span>
                </label>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                Upload PDF constructietekeningen voor {useRealPDFParsing ? 'echte tekst extractie' : 'bestandsnaam analyse'}
              </p>
              
              {/* Upload zone */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">
                  Klik om PDF's te selecteren
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  of sleep bestanden hierheen
                </p>
              </div>
              
              {/* Geavanceerde parsing info */}
              {useRealPDFParsing && (
                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <FileSearch className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-800">Geavanceerde PDF Analyse</p>
                      <p className="text-sm text-blue-600 mt-1">
                        Gebruikt pdf.js om tekst te extraheren en automatisch te detecteren:
                      </p>
                      <ul className="text-sm text-blue-600 mt-2 space-y-1 list-disc list-inside">
                        <li>Staalprofielen (HEA, HEB, IPE, UNP)</li>
                        <li>Dimensies en maten (mm/m)</li>
                        <li>Element referenties (K1, L2, SP3)</li>
                        <li>Positionele informatie</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Geüploade bestanden */}
              {uploadedFiles.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-700 mb-2">
                    Geüploade bestanden ({uploadedFiles.length})
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {uploadedFiles.map((file, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <FileText className="w-5 h-5 text-red-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveUploadedFile(idx)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Extraction logs */}
              {extractionLogs.length > 0 && (
                <div className="mt-4 p-4 bg-gray-900 rounded-xl text-sm font-mono">
                  <p className="text-gray-400 mb-2">Console output:</p>
                  {extractionLogs.map((log, idx) => (
                    <p key={idx} className="text-green-400">{log}</p>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'config' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Standaard Hal Configuratie
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Genereer een 3D model op basis van standaard hal parameters
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hal Naam
                  </label>
                  <input
                    type="text"
                    value={halConfig.naam}
                    onChange={(e) => setHalConfig(prev => ({ ...prev, naam: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kolom Hoogte (mm)
                  </label>
                  <input
                    type="number"
                    value={halConfig.hoogte}
                    onChange={(e) => setHalConfig(prev => ({ ...prev, hoogte: parseInt(e.target.value) || 8000 }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aantal Kolommen (X)
                  </label>
                  <input
                    type="number"
                    value={halConfig.aantalKolommen}
                    onChange={(e) => setHalConfig(prev => ({ ...prev, aantalKolommen: parseInt(e.target.value) || 6 }))}
                    min={2}
                    max={20}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Aantal Rijen (Y)
                  </label>
                  <input
                    type="number"
                    value={halConfig.aantalRijen}
                    onChange={(e) => setHalConfig(prev => ({ ...prev, aantalRijen: parseInt(e.target.value) || 4 }))}
                    min={1}
                    max={20}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raster X (mm)
                  </label>
                  <input
                    type="number"
                    value={halConfig.rasterX}
                    onChange={(e) => setHalConfig(prev => ({ ...prev, rasterX: parseInt(e.target.value) || 6000 }))}
                    step={500}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Raster Y (mm)
                  </label>
                  <input
                    type="number"
                    value={halConfig.rasterY}
                    onChange={(e) => setHalConfig(prev => ({ ...prev, rasterY: parseInt(e.target.value) || 7500 }))}
                    step={500}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Profiel Selectie */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-medium text-gray-700 mb-4">🔩 Profielen</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kolom Profiel
                    </label>
                    <select
                      value={halConfig.kolomProfiel}
                      onChange={(e) => setHalConfig(prev => ({ ...prev, kolomProfiel: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {PROFIELEN.HEB.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ligger Profiel
                    </label>
                    <select
                      value={halConfig.liggerProfiel}
                      onChange={(e) => setHalConfig(prev => ({ ...prev, liggerProfiel: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {PROFIELEN.IPE.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Spant Profiel
                    </label>
                    <select
                      value={halConfig.spantProfiel}
                      onChange={(e) => setHalConfig(prev => ({ ...prev, spantProfiel: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {PROFIELEN.HEA.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              {/* Statistieken */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="font-medium text-gray-700 mb-2">Statistieken:</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Kolommen:</span>
                    <span className="ml-2 font-medium">{(halConfig.aantalKolommen + 1) * (halConfig.aantalRijen + 1)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Afmeting X:</span>
                    <span className="ml-2 font-medium">{halConfig.aantalKolommen * halConfig.rasterX / 1000}m</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Afmeting Y:</span>
                    <span className="ml-2 font-medium">{halConfig.aantalRijen * halConfig.rasterY / 1000}m</span>
                  </div>
                </div>
              </div>
              
              {/* 2D Plattegrond Preview */}
              <div className="mt-6">
                <h3 className="font-medium text-gray-700 mb-3">📐 Plattegrond Preview</h3>
                <div className="bg-slate-800 rounded-xl p-4 overflow-auto">
                  <svg 
                    viewBox={`-20 -20 ${halConfig.aantalKolommen * 50 + 80} ${halConfig.aantalRijen * 50 + 80}`}
                    className="w-full h-64"
                  >
                    {/* Grid achtergrond */}
                    <defs>
                      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#334155" strokeWidth="0.5"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                    
                    {/* Liggers (horizontaal) */}
                    {Array.from({ length: halConfig.aantalRijen + 1 }).map((_, row) => (
                      Array.from({ length: halConfig.aantalKolommen }).map((_, col) => (
                        <line
                          key={`hx-${row}-${col}`}
                          x1={col * 50 + 10}
                          y1={row * 50 + 10}
                          x2={(col + 1) * 50 + 10}
                          y2={row * 50 + 10}
                          stroke="#3b82f6"
                          strokeWidth="3"
                        />
                      ))
                    ))}
                    
                    {/* Liggers (verticaal) */}
                    {Array.from({ length: halConfig.aantalKolommen + 1 }).map((_, col) => (
                      Array.from({ length: halConfig.aantalRijen }).map((_, row) => (
                        <line
                          key={`hy-${row}-${col}`}
                          x1={col * 50 + 10}
                          y1={row * 50 + 10}
                          x2={col * 50 + 10}
                          y2={(row + 1) * 50 + 10}
                          stroke="#22c55e"
                          strokeWidth="2"
                        />
                      ))
                    ))}
                    
                    {/* Kolommen */}
                    {Array.from({ length: halConfig.aantalKolommen + 1 }).map((_, col) => (
                      Array.from({ length: halConfig.aantalRijen + 1 }).map((_, row) => (
                        <g key={`k-${row}-${col}`}>
                          <rect
                            x={col * 50 + 4}
                            y={row * 50 + 4}
                            width="12"
                            height="12"
                            fill="#ef4444"
                            stroke="#fff"
                            strokeWidth="1"
                          />
                          <text
                            x={col * 50 + 10}
                            y={row * 50 + 25}
                            fill="#94a3b8"
                            fontSize="6"
                            textAnchor="middle"
                          >
                            K{row * (halConfig.aantalKolommen + 1) + col + 1}
                          </text>
                        </g>
                      ))
                    ))}
                    
                    {/* Maatlijnen X */}
                    <g transform={`translate(10, ${(halConfig.aantalRijen + 1) * 50 + 25})`}>
                      <line x1="0" y1="0" x2={halConfig.aantalKolommen * 50} y2="0" stroke="#94a3b8" strokeWidth="1" />
                      <text x={halConfig.aantalKolommen * 25} y="15" fill="#94a3b8" fontSize="10" textAnchor="middle">
                        {halConfig.aantalKolommen * halConfig.rasterX / 1000}m
                      </text>
                    </g>
                    
                    {/* Maatlijnen Y */}
                    <g transform={`translate(${(halConfig.aantalKolommen + 1) * 50 + 20}, 10)`}>
                      <line x1="0" y1="0" x2="0" y2={halConfig.aantalRijen * 50} stroke="#94a3b8" strokeWidth="1" />
                      <text x="15" y={halConfig.aantalRijen * 25} fill="#94a3b8" fontSize="10" textAnchor="middle" transform={`rotate(90, 15, ${halConfig.aantalRijen * 25})`}>
                        {halConfig.aantalRijen * halConfig.rasterY / 1000}m
                      </text>
                    </g>
                  </svg>
                  
                  {/* Legenda */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded-sm" />
                      <span>Kolommen</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-1 bg-blue-500" />
                      <span>Hoofdliggers (X)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1 h-3 bg-green-500" />
                      <span>Liggers (Y)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'preview' && result && (
            <div className="space-y-6">
              {/* Geëxtraheerde Data Debug Panel */}
              {result.metadata.extractedText && result.metadata.extractedText.length > 0 && (
                <div className="bg-gray-900 rounded-2xl shadow-sm border border-gray-700 p-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <FileSearch className="w-5 h-5 text-cyan-400" />
                    Geëxtraheerde PDF Data
                  </h2>
                  
                  {/* Gedetecteerde Dimensies */}
                  {result.metadata.detectedDimensions && (
                    <div className="mb-4 p-4 bg-gray-800 rounded-xl">
                      <h3 className="text-sm font-medium text-cyan-400 mb-2">📐 Gedetecteerde Afmetingen</h3>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Lengte:</span>
                          <span className="text-white ml-2 font-mono">{result.metadata.detectedDimensions.lengte || '?'} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Breedte:</span>
                          <span className="text-white ml-2 font-mono">{result.metadata.detectedDimensions.breedte || '?'} mm</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Hoogte:</span>
                          <span className="text-white ml-2 font-mono">{result.metadata.detectedDimensions.hoogte || '?'} mm</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Raster info */}
                  {result.metadata.raster && (
                    <div className="mb-4 p-4 bg-gray-800 rounded-xl">
                      <h3 className="text-sm font-medium text-cyan-400 mb-2">📏 Raster Afstanden</h3>
                      <div className="text-sm">
                        <span className="text-gray-400">X:</span>
                        <span className="text-white ml-2 font-mono">{result.metadata.raster.x} mm</span>
                        <span className="text-gray-400 ml-6">Y:</span>
                        <span className="text-white ml-2 font-mono">{result.metadata.raster.y} mm</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Overzicht info */}
                  {result.metadata.overzichtInfo && (
                    <div className="mb-4 p-4 bg-gray-800 rounded-xl">
                      <h3 className="text-sm font-medium text-cyan-400 mb-2">🏗️ Stramien Informatie</h3>
                      <div className="text-sm space-y-1">
                        {result.metadata.overzichtInfo.stramien.assen.length > 0 && (
                          <div>
                            <span className="text-gray-400">Assen:</span>
                            <span className="text-green-400 ml-2 font-mono">
                              {result.metadata.overzichtInfo.stramien.assen.join(', ')}
                            </span>
                          </div>
                        )}
                        {result.metadata.overzichtInfo.stramien.nummers.length > 0 && (
                          <div>
                            <span className="text-gray-400">Nummers:</span>
                            <span className="text-green-400 ml-2 font-mono">
                              {result.metadata.overzichtInfo.stramien.nummers.join(', ')}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">Kolom hoogte:</span>
                          <span className="text-white ml-2 font-mono">
                            {result.metadata.overzichtInfo.afmetingen.kolomHoogte} mm
                          </span>
                        </div>
                        {result.metadata.overzichtInfo.afmetingen.nokHoogte && (
                          <div>
                            <span className="text-gray-400">Nok hoogte:</span>
                            <span className="text-white ml-2 font-mono">
                              {result.metadata.overzichtInfo.afmetingen.nokHoogte} mm
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Gedetecteerde profielen */}
                  {result.metadata.detectedProfiles && result.metadata.detectedProfiles.length > 0 && (
                    <div className="mb-4 p-4 bg-gray-800 rounded-xl">
                      <h3 className="text-sm font-medium text-cyan-400 mb-2">🔧 Gevonden Profielen in PDF's</h3>
                      <div className="flex flex-wrap gap-2">
                        {result.metadata.detectedProfiles.map((profiel, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs font-mono">
                            {profiel}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Raw extracted text */}
                  <div className="p-4 bg-gray-800 rounded-xl">
                    <h3 className="text-sm font-medium text-cyan-400 mb-2">📝 Ruwe Geëxtraheerde Tekst</h3>
                    <div className="max-h-64 overflow-y-auto text-xs font-mono text-gray-300 space-y-2">
                      {result.metadata.extractedText.map((text, idx) => (
                        <div key={idx} className="p-2 bg-gray-900 rounded border border-gray-700">
                          {text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Element tabel */}
              <div className="bg-white rounded-2xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    Geëxtraheerde Elementen
                  </h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    result.success 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {result.success ? 'Succesvol' : 'Fout'}
                  </span>
                </div>
              
                {/* Element tabel */}
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 font-medium text-gray-600">ID</th>
                      <th className="text-left p-3 font-medium text-gray-600">Type</th>
                      <th className="text-left p-3 font-medium text-gray-600">Profiel</th>
                      <th className="text-right p-3 font-medium text-gray-600">Lengte</th>
                      <th className="text-right p-3 font-medium text-gray-600">Gewicht</th>
                      <th className="text-center p-3 font-medium text-gray-600">Conditie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {result.elementen.slice(0, 20).map(el => (
                      <tr key={el.id} className="hover:bg-gray-50">
                        <td className="p-3 font-mono text-xs">{el.id}</td>
                        <td className="p-3 capitalize">{el.type}</td>
                        <td className="p-3 font-medium">{el.profielNaam}</td>
                        <td className="p-3 text-right">{el.lengte} mm</td>
                        <td className="p-3 text-right">{el.gewicht} kg</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            el.conditie === 'goed' ? 'bg-green-100 text-green-700' :
                            el.conditie === 'matig' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {el.conditie}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {result.elementen.length > 20 && (
                  <p className="text-center text-gray-500 text-sm mt-4">
                    ... en {result.elementen.length - 20} meer elementen
                  </p>
                )}
              </div>
            </div>
          </div>
          )}
        </div>
        
        {/* Rechter paneel - Acties & Stats */}
        <div className="space-y-6">
          {/* Actie panel */}
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h3 className="font-bold text-gray-900 mb-4">Acties</h3>
            
            {activeTab === 'select' && (
              <button
                onClick={handleAnalyseer}
                disabled={gecategoriseerdeBestanden.length === 0 || isAnalysing}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                  gecategoriseerdeBestanden.length === 0 || isAnalysing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isAnalysing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyseren...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Analyseer {gecategoriseerdeBestanden.length} Tekeningen
                  </>
                )}
              </button>
            )}
            
            {activeTab === 'upload' && (
              <button
                onClick={handleAnalyseer}
                disabled={uploadedFiles.length === 0 || isAnalysing}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                  uploadedFiles.length === 0 || isAnalysing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-cyan-600 text-white hover:bg-cyan-700'
                }`}
              >
                {isAnalysing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    PDF's analyseren...
                  </>
                ) : (
                  <>
                    <FileSearch className="w-5 h-5" />
                    Analyseer {uploadedFiles.length} PDF's
                  </>
                )}
              </button>
            )}
            
            {activeTab === 'config' && (
              <button
                onClick={handleGenereerStandaard}
                disabled={isAnalysing}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                  isAnalysing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isAnalysing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <Box className="w-5 h-5" />
                    Genereer 3D Model
                  </>
                )}
              </button>
            )}
            
            {result && (
              <div className="space-y-3 mt-4">
                <button
                  onClick={handleBekijkIn3D}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                >
                  <Layers className="w-5 h-5" />
                  Bekijk in 3D Viewer
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={handleExportJSON}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Download JSON
                </button>
              </div>
            )}
          </div>
          
          {/* Selectie stats */}
          {activeTab === 'select' && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-900 mb-4">Aanzichten Overzicht</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Te analyseren:</span>
                  <span className="font-medium text-green-600">
                    {gecategoriseerdeBestanden.length} / {BESCHIKBARE_PDFS.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${(gecategoriseerdeBestanden.length / BESCHIKBARE_PDFS.length) * 100}%` }}
                  />
                </div>
                
                {/* Aanzichten breakdown - 4 categorieën + uitgesloten */}
                <div className="pt-3 border-t space-y-2">
                  {(['overzicht', 'fundering', 'doorsnede', 'detail', 'uitgesloten'] as TekeningAanzicht[]).map(aanzicht => {
                    const config = AANZICHT_CONFIG[aanzicht]
                    const count = bestandenPerAanzicht[aanzicht]?.length || 0
                    return (
                      <div key={aanzicht} className="flex justify-between text-sm items-center">
                        <span className={`${config.kleur} flex items-center gap-1`}>
                          {config.icon}
                          <span className="text-xs">{config.label}</span>
                        </span>
                        <span className={count > 0 ? `${config.kleur} font-medium` : 'text-gray-400'}>
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
                
                {bestandenPerAanzicht['onbekend'].length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>Niet gecategoriseerd</span>
                      <span>{bestandenPerAanzicht['onbekend'].length}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Resultaat stats */}
          {result && stats && (
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                {result.gebouwNaam}
              </h3>
              
              <div className="space-y-4">
                {/* Totalen */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{result.elementen.length}</p>
                    <p className="text-xs text-blue-600">Elementen</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{(stats.totaalGewicht / 1000).toFixed(1)}</p>
                    <p className="text-xs text-purple-600">Ton staal</p>
                  </div>
                </div>
                
                {/* Per type */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Per type:</p>
                  <div className="space-y-1">
                    {Object.entries(stats.types).map(([type, count]) => (
                      <div key={type} className="flex justify-between text-sm">
                        <span className="text-gray-600 capitalize">{type}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Per profiel */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Profielen:</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {Object.entries(stats.profielen)
                      .sort((a, b) => b[1] - a[1])
                      .map(([profiel, count]) => (
                        <div key={profiel} className="flex justify-between text-sm">
                          <span className="text-gray-600">{profiel}</span>
                          <span className="font-medium">{count}×</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* PDF Preview Modal */}
      {previewPdf && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewPdf(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-red-500" />
                <div>
                  <h3 className="font-bold text-gray-900">{previewPdf}</h3>
                  <p className="text-sm text-gray-500">
                    Categorie: {AANZICHT_CONFIG[aanzichtToewijzingen[previewPdf] || 'onbekend'].label}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Categorie wijzigen dropdown */}
                <select
                  value={aanzichtToewijzingen[previewPdf] || 'onbekend'}
                  onChange={(e) => {
                    handleAanzichtChange(previewPdf, e.target.value as TekeningAanzicht)
                  }}
                  className="text-sm border rounded-lg px-3 py-1.5 bg-gray-50"
                >
                  <option value="overzicht">① Dak / Overzicht</option>
                  <option value="fundering">② Fundering / Vloer</option>
                  <option value="doorsnede">③ Zijkant / Doorsnede</option>
                  <option value="detail">④ Detailtekening</option>
                  <option value="uitgesloten">✖ Niet gebruiken</option>
                  <option value="onbekend">Niet gecategoriseerd</option>
                </select>
                <button
                  onClick={() => setPreviewPdf(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* PDF Viewer */}
            <div className="flex-1 overflow-hidden bg-gray-100 p-4">
              <iframe
                src={`/2D Drawings/${previewPdf}`}
                className="w-full h-full min-h-[500px] bg-white rounded-lg shadow-inner"
                title={`Preview: ${previewPdf}`}
              />
            </div>
            
            {/* Footer met navigatie */}
            <div className="p-4 border-t flex items-center justify-between">
              <div className="flex gap-2">
                {/* Vorige/Volgende knoppen */}
                {(() => {
                  const allFiles = BESCHIKBARE_PDFS
                  const currentIndex = allFiles.indexOf(previewPdf)
                  const prevFile = currentIndex > 0 ? allFiles[currentIndex - 1] : null
                  const nextFile = currentIndex < allFiles.length - 1 ? allFiles[currentIndex + 1] : null
                  
                  return (
                    <>
                      <button
                        onClick={() => prevFile && setPreviewPdf(prevFile)}
                        disabled={!prevFile}
                        className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                          prevFile 
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        ← Vorige
                      </button>
                      <button
                        onClick={() => nextFile && setPreviewPdf(nextFile)}
                        disabled={!nextFile}
                        className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
                          nextFile 
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                            : 'bg-gray-50 text-gray-300 cursor-not-allowed'
                        }`}
                      >
                        Volgende →
                      </button>
                    </>
                  )
                })()}
              </div>
              <span className="text-sm text-gray-500">
                {BESCHIKBARE_PDFS.indexOf(previewPdf) + 1} / {BESCHIKBARE_PDFS.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
