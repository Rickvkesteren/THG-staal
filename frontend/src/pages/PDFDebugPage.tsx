import { useState, useRef } from 'react'
import { 
  FileSearch, 
  Upload, 
  Loader2, 
  FileText,
  Grid3X3,
  Ruler,
  Box,
  Layers,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { analyzeFullPDF, type StructureAnalysisResult } from '../utils/pdfStructureAnalyzer'

export default function PDFDebugPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<{
    pages: StructureAnalysisResult[]
    combined: any
  } | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'profiles', 'dimensions']))
  
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files[0]) {
      const selectedFile = files[0]
      setFile(selectedFile)
      setResult(null)
      
      // Auto-start analyse
      await runAnalysis(selectedFile)
    }
  }
  
  const runAnalysis = async (fileToAnalyze: File) => {
    setIsAnalyzing(true)
    
    try {
      const analysisResult = await analyzeFullPDF(fileToAnalyze)
      setResult(analysisResult)
    } catch (error) {
      console.error('Analyse fout:', error)
    }
    
    setIsAnalyzing(false)
  }
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }
  
  const Section = ({ id, title, icon: Icon, count, children }: {
    id: string
    title: string
    icon: any
    count?: number
    children: React.ReactNode
  }) => {
    const isExpanded = expandedSections.has(id)
    
    return (
      <div className="border border-gray-700 rounded-xl overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Icon className="w-5 h-5 text-cyan-400" />
            <span className="font-medium text-white">{title}</span>
            {count !== undefined && (
              <span className="px-2 py-0.5 bg-cyan-900 text-cyan-300 text-xs rounded-full">
                {count}
              </span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-gray-900">
            {children}
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-cyan-600 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <FileSearch className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">PDF Structuur Analyzer</h1>
              <p className="text-purple-100">
                Analyseer staalprofielen, maatvoeringen en structuren met AI-patronen
              </p>
            </div>
          </div>
        </div>
        
        {/* Upload zone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            file 
              ? 'border-cyan-500 bg-cyan-950/30' 
              : 'border-gray-700 hover:border-gray-500 bg-gray-900'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isAnalyzing ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
              <p className="text-gray-300">Analyseren van structuren, profielen en maten...</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center gap-4">
              <FileText className="w-12 h-12 text-cyan-400" />
              <div>
                <p className="font-medium text-white">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <p className="text-sm text-gray-500">Klik om ander bestand te selecteren</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Upload className="w-12 h-12 text-gray-500" />
              <div>
                <p className="font-medium text-gray-300">Sleep een PDF hierheen</p>
                <p className="text-sm text-gray-500">of klik om te bladeren</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Resultaten */}
        {result && (
          <div className="space-y-4">
            {/* Summary Card */}
            <Section id="summary" title="Samenvatting" icon={Layers} count={undefined}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-cyan-400">
                    {result.combined.summary.uniqueProfiles.length}
                  </p>
                  <p className="text-sm text-gray-400">Profielen</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">
                    {result.combined.allDimensions.length}
                  </p>
                  <p className="text-sm text-gray-400">Maten</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-purple-400">
                    {result.combined.allElements.length}
                  </p>
                  <p className="text-sm text-gray-400">Elementen</p>
                </div>
                <div className="bg-gray-800 rounded-xl p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {result.combined.summary.avgConfidence > 0.5 ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-yellow-400" />
                    )}
                    <p className="text-3xl font-bold text-white">
                      {(result.combined.summary.avgConfidence * 100).toFixed(0)}%
                    </p>
                  </div>
                  <p className="text-sm text-gray-400">Confidence</p>
                </div>
              </div>
              
              {/* Element breakdown */}
              <div className="mt-4 grid grid-cols-3 gap-4">
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                  <p className="text-blue-300 font-medium">
                    {result.combined.summary.kolomCount} Kolommen
                  </p>
                </div>
                <div className="bg-orange-900/30 border border-orange-700 rounded-lg p-3">
                  <p className="text-orange-300 font-medium">
                    {result.combined.summary.liggerCount} Liggers
                  </p>
                </div>
                <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-3">
                  <p className="text-purple-300 font-medium">
                    {result.combined.summary.spantCount} Spanten
                  </p>
                </div>
              </div>
            </Section>
            
            {/* Profielen */}
            <Section 
              id="profiles" 
              title="Gedetecteerde Profielen" 
              icon={Box}
              count={result.combined.allProfiles.length}
            >
              {result.combined.summary.uniqueProfiles.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {result.combined.summary.uniqueProfiles.map((profile: string, idx: number) => (
                      <span 
                        key={idx}
                        className="px-3 py-2 bg-green-900 text-green-300 rounded-lg font-mono text-sm"
                      >
                        {profile}
                      </span>
                    ))}
                  </div>
                  
                  {/* Gedetailleerde profiel info */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left p-2 text-gray-400">Profiel</th>
                          <th className="text-left p-2 text-gray-400">Type</th>
                          <th className="text-right p-2 text-gray-400">H (mm)</th>
                          <th className="text-right p-2 text-gray-400">B (mm)</th>
                          <th className="text-right p-2 text-gray-400">Confidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.combined.allProfiles.map((p: any, idx: number) => (
                          <tr key={idx} className="border-b border-gray-800">
                            <td className="p-2 font-mono text-cyan-300">{p.suggestedProfile || '-'}</td>
                            <td className="p-2 text-gray-300">{p.type}</td>
                            <td className="p-2 text-right text-gray-300">{p.dimensions?.height || '-'}</td>
                            <td className="p-2 text-right text-gray-300">{p.dimensions?.width || '-'}</td>
                            <td className="p-2 text-right">
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                p.confidence > 0.8 ? 'bg-green-900 text-green-300' :
                                p.confidence > 0.5 ? 'bg-yellow-900 text-yellow-300' :
                                'bg-red-900 text-red-300'
                              }`}>
                                {(p.confidence * 100).toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 italic">Geen profielen gevonden in de tekst</p>
              )}
            </Section>
            
            {/* Maatvoeringen */}
            <Section 
              id="dimensions" 
              title="Maatvoeringen" 
              icon={Ruler}
              count={result.combined.allDimensions.length}
            >
              {result.combined.allDimensions.length > 0 ? (
                <div className="space-y-4">
                  {/* Gegroepeerd per context */}
                  {['spacing', 'height', 'length', 'unknown'].map(context => {
                    const dims = result.combined.allDimensions.filter((d: any) => d.context === context)
                    if (dims.length === 0) return null
                    
                    return (
                      <div key={context}>
                        <h4 className="text-sm font-medium text-gray-400 mb-2 capitalize">
                          {context === 'spacing' ? '📏 Raster/Afstanden' :
                           context === 'height' ? '📐 Hoogtes' :
                           context === 'length' ? '📏 Lengtes' :
                           '❓ Overig'}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {dims.map((dim: any, idx: number) => (
                            <span 
                              key={idx}
                              className={`px-3 py-1.5 rounded-lg font-mono text-sm ${
                                context === 'spacing' ? 'bg-blue-900 text-blue-300' :
                                context === 'height' ? 'bg-purple-900 text-purple-300' :
                                context === 'length' ? 'bg-green-900 text-green-300' :
                                'bg-gray-800 text-gray-300'
                              }`}
                            >
                              {dim.value} mm
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 italic">Geen maatvoeringen gevonden</p>
              )}
            </Section>
            
            {/* Grid/Stramien */}
            <Section 
              id="grid" 
              title="Stramien/Grid" 
              icon={Grid3X3}
              count={result.combined.grid?.axes.length || 0}
            >
              {result.combined.grid ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Verticale Assen (X)</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.combined.grid.axes
                          .filter((a: any) => a.orientation === 'vertical')
                          .map((axis: any, idx: number) => (
                            <span key={idx} className="px-3 py-1.5 bg-blue-900 text-blue-300 rounded-lg font-mono">
                              {axis.label}
                            </span>
                          ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Horizontale Assen (Y)</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.combined.grid.axes
                          .filter((a: any) => a.orientation === 'horizontal')
                          .map((axis: any, idx: number) => (
                            <span key={idx} className="px-3 py-1.5 bg-orange-900 text-orange-300 rounded-lg font-mono">
                              {axis.label}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                  
                  {(result.combined.grid.spacing.x.length > 0 || result.combined.grid.spacing.y.length > 0) && (
                    <div className="border-t border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Afstanden (pixels, niet geschaald)</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {result.combined.grid.spacing.x.length > 0 && (
                          <div>
                            <span className="text-gray-500">X: </span>
                            <span className="text-gray-300 font-mono">
                              {result.combined.grid.spacing.x.map((s: number) => s.toFixed(0)).join(', ')}
                            </span>
                          </div>
                        )}
                        {result.combined.grid.spacing.y.length > 0 && (
                          <div>
                            <span className="text-gray-500">Y: </span>
                            <span className="text-gray-300 font-mono">
                              {result.combined.grid.spacing.y.map((s: number) => s.toFixed(0)).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 italic">Geen stramien gevonden</p>
              )}
            </Section>
            
            {/* Elementen */}
            <Section 
              id="elements" 
              title="Geïdentificeerde Elementen" 
              icon={Layers}
              count={result.combined.allElements.length}
            >
              {result.combined.allElements.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-2 text-gray-400">ID</th>
                        <th className="text-left p-2 text-gray-400">Type</th>
                        <th className="text-left p-2 text-gray-400">Profiel</th>
                        <th className="text-right p-2 text-gray-400">Lengte (mm)</th>
                        <th className="text-right p-2 text-gray-400">Gekoppelde Maten</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.combined.allElements.map((el: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-800">
                          <td className="p-2 font-mono text-cyan-300">{el.id}</td>
                          <td className="p-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              el.type === 'kolom' ? 'bg-blue-900 text-blue-300' :
                              el.type === 'ligger' ? 'bg-orange-900 text-orange-300' :
                              el.type === 'spant' ? 'bg-purple-900 text-purple-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {el.type}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-gray-300">{el.profile || '-'}</td>
                          <td className="p-2 text-right text-gray-300">{el.length || '-'}</td>
                          <td className="p-2 text-right text-gray-400">{el.linkedDimensions.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">Geen elementen geïdentificeerd (K1, L2, SP1, etc.)</p>
              )}
            </Section>
            
            {/* Ruwe Tekst Blokken */}
            <Section 
              id="text" 
              title="Ruwe Tekstblokken" 
              icon={FileText}
              count={result.pages.reduce((sum, p) => sum + p.textBlocks.length, 0)}
            >
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {result.pages.map((page, pageIdx) => (
                  <div key={pageIdx}>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">
                      Pagina {pageIdx + 1} ({page.textBlocks.length} blokken)
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {page.textBlocks.map((block, idx) => (
                        <span 
                          key={idx}
                          className={`px-2 py-0.5 rounded text-xs font-mono ${
                            block.isProfileRef ? 'bg-green-900 text-green-300' :
                            block.isElementRef ? 'bg-cyan-900 text-cyan-300' :
                            block.isDimension ? 'bg-purple-900 text-purple-300' :
                            'bg-gray-800 text-gray-400'
                          }`}
                          title={`Pos: (${block.position.x.toFixed(0)}, ${block.position.y.toFixed(0)})`}
                        >
                          {block.text}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 flex gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-green-900 rounded"></span>
                  Profiel
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-cyan-900 rounded"></span>
                  Element ID
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-purple-900 rounded"></span>
                  Maat
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 bg-gray-800 rounded"></span>
                  Overig
                </span>
              </div>
            </Section>
            
            {/* Per Pagina Details */}
            <Section 
              id="pages" 
              title="Per Pagina Details" 
              icon={FileText}
              count={result.pages.length}
            >
              <div className="space-y-4">
                {result.pages.map((page, idx) => (
                  <div key={idx} className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-white">Pagina {idx + 1}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        page.confidence > 0.7 ? 'bg-green-900 text-green-300' :
                        page.confidence > 0.4 ? 'bg-yellow-900 text-yellow-300' :
                        'bg-red-900 text-red-300'
                      }`}>
                        {(page.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-2 text-sm">
                      <div className="bg-gray-800 rounded p-2 text-center">
                        <p className="text-lg font-bold text-cyan-400">{page.lines.length}</p>
                        <p className="text-xs text-gray-500">Lijnen</p>
                      </div>
                      <div className="bg-gray-800 rounded p-2 text-center">
                        <p className="text-lg font-bold text-purple-400">{page.rectangles.length}</p>
                        <p className="text-xs text-gray-500">Rechthoeken</p>
                      </div>
                      <div className="bg-gray-800 rounded p-2 text-center">
                        <p className="text-lg font-bold text-green-400">{page.profiles.length}</p>
                        <p className="text-xs text-gray-500">Profielen</p>
                      </div>
                      <div className="bg-gray-800 rounded p-2 text-center">
                        <p className="text-lg font-bold text-orange-400">{page.dimensions.length}</p>
                        <p className="text-xs text-gray-500">Maten</p>
                      </div>
                    </div>
                    
                    {page.scale && (
                      <p className="mt-2 text-sm text-gray-400">
                        Schaal: 1:{page.scale}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}
