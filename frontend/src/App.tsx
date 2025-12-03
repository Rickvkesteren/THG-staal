import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProfielenPage from './pages/ProfielenPage'
import GebouwenPage from './pages/GebouwenPage'
import GebouwDetailPage from './pages/GebouwDetailPage'
import VoorraadPage from './pages/VoorraadPage'
import OogstPlanningPage from './pages/OogstPlanningPage'
import MatchingPage from './pages/MatchingPage'
import ShopPage from './pages/ShopPage'
import CertificeringPage from './pages/CertificeringPage'
import CADImportPage from './pages/CADImportPage'
import Demo3DPage from './pages/Demo3DPage'
import ProductieViewerPage from './pages/ProductieViewerPage'
import OogstViewer3DPage from './pages/OogstViewer3DPage'
// Nieuwe Flow Pagina's
import FlowDashboard from './pages/FlowDashboard'
import GebouwViewer3DPage from './pages/GebouwViewer3DPage'
import Matching3DPage from './pages/Matching3DPage'
import GebouwAnalysePage from './pages/GebouwAnalysePage'
import BewerkingsplanPage from './pages/BewerkingsplanPage'
import ConstructieAnalysePage from './pages/ConstructieAnalysePage'
import NTA8713Page from './pages/NTA8713Page'
import OperatorDemontagePage from './pages/OperatorDemontagePage'
import OogstplanPage from './pages/OogstplanPage'
import BusinessCasePage from './pages/BusinessCasePage'
import OogstAnalysePage from './pages/OogstAnalysePage'
import ProductieStroomPage from './pages/ProductieStroomPage'
import LeveringenPage from './pages/LeveringenPage'
import PDFImportPage from './pages/PDFImportPage'
import PDFDebugPage from './pages/PDFDebugPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Flow Dashboard is nu de hoofdpagina */}
        <Route index element={<FlowDashboard />} />
        <Route path="flow" element={<FlowDashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* FASE 1: Oogsten & Certificering */}
        <Route path="gebouwen" element={<GebouwenPage />} />
        <Route path="gebouwen/:id" element={<GebouwDetailPage />} />
        <Route path="gebouw-analyse/:gebouwId" element={<GebouwAnalysePage />} />
        <Route path="constructie-analyse/:gebouwId" element={<ConstructieAnalysePage />} />
        <Route path="nta8713" element={<NTA8713Page />} />
        <Route path="nta8713/:gebouwId" element={<NTA8713Page />} />
        <Route path="gebouw-3d" element={<GebouwViewer3DPage />} />
        <Route path="gebouw-3d/:gebouwId" element={<GebouwViewer3DPage />} />
        <Route path="oogst-planning" element={<OogstPlanningPage />} />
        <Route path="oogst-planning/:gebouwId" element={<OogstPlanningPage />} />
        <Route path="oogst-3d" element={<OogstViewer3DPage />} />
        <Route path="oogst-3d/:gebouwId" element={<OogstViewer3DPage />} />
        <Route path="oogstplan/:gebouwId" element={<OogstplanPage />} />
        <Route path="operator-demontage/:gebouwId" element={<OperatorDemontagePage />} />
        <Route path="certificering" element={<CertificeringPage />} />
        
        {/* FASE 2: Verwerking */}
        <Route path="voorraad" element={<VoorraadPage />} />
        <Route path="productie-3d" element={<ProductieViewerPage />} />
        <Route path="productie-3d/:elementId" element={<ProductieViewerPage />} />
        <Route path="matching" element={<MatchingPage />} />
        <Route path="matching-3d" element={<Matching3DPage />} />
        <Route path="matching-3d/:elementId" element={<Matching3DPage />} />
        <Route path="bewerkingsplan/:gebouwId" element={<BewerkingsplanPage />} />
        
        {/* FASE 3: Verkoop */}
        <Route path="shop" element={<ShopPage />} />
        <Route path="leveringen" element={<LeveringenPage />} />
        <Route path="business-case" element={<BusinessCasePage />} />
        
        {/* Productie & Analyse */}
        <Route path="oogst-analyse" element={<OogstAnalysePage />} />
        <Route path="oogst-analyse/:gebouwId" element={<OogstAnalysePage />} />
        <Route path="productie-stroom" element={<ProductieStroomPage />} />
        
        {/* Tools & Data */}
        <Route path="profielen" element={<ProfielenPage />} />
        <Route path="cad-import" element={<CADImportPage />} />
        <Route path="pdf-import" element={<PDFImportPage />} />
        <Route path="pdf-debug" element={<PDFDebugPage />} />
        <Route path="demo-3d" element={<Demo3DPage />} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
