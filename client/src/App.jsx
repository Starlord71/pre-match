import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Header from './components/Header.jsx'
import ExplorerPage from './pages/ExplorerPage.jsx'
import AnalysisPage from './pages/AnalysisPage.jsx'
import './App.css'

/**
 * App shell: header, active page and footer.
 * Holds only the navigation state between the explorer and the analysis view.
 * @returns {JSX.Element} The application.
 */
function App() {
  const { t } = useTranslation()
  const [selection, setSelection] = useState(null)

  return (
    <div className="app-shell">
      <Header />

      <main className="app-main">
        {selection ? (
          <AnalysisPage selection={selection} onBack={() => setSelection(null)} />
        ) : (
          <ExplorerPage onAnalyze={setSelection} />
        )}
      </main>

      <footer className="app-footer">{t('app.footer')}</footer>
    </div>
  )
}

export default App
