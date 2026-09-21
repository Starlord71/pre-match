import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from './components/Header.jsx'
import ExplorerPage from './pages/ExplorerPage.jsx'
import AnalysisPage from './pages/AnalysisPage.jsx'
import './App.css'

/**
 * App shell: header, active route and footer.
 * Routing lives in the URL so a refresh keeps the current view.
 * @returns {JSX.Element} The application.
 */
function App() {
  const { t } = useTranslation()

  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<ExplorerPage />} />
          <Route path="/match/:league/:homeId/:awayId" element={<AnalysisPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">{t('app.footer')}</footer>
    </div>
  )
}

export default App
