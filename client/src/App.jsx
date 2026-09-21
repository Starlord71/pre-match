import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Header from './components/Header.jsx'
import ExplorerPage from './pages/ExplorerPage.jsx'
import AnalysisPage from './pages/AnalysisPage.jsx'
import FavoriteTeamModal from './components/FavoriteTeamModal.jsx'
import FavoriteLiveWatcher from './components/FavoriteLiveWatcher.jsx'
import DemoDataBanner from './components/DemoDataBanner.jsx'
import { FavoriteTeamProvider, useFavoriteTeam } from './hooks/useFavoriteTeam.js'
import './App.css'

/**
 * App shell: header, active route, footer, the favorite-team modal and its
 * live watcher.
 *
 * Routing lives in the URL so a refresh keeps the current view. The favorite
 * team is an optional extra layered on top of that, not a route: it opens as
 * a modal from the header and never changes what `/` shows.
 * `FavoriteLiveWatcher` renders nothing but is mounted here (not inside a
 * specific page) so the favorite team's match is auto-followed regardless of
 * which route is active. A separate component from `App` only so it can read
 * `useFavoriteTeam()` from inside the provider that wraps it.
 * @returns {JSX.Element} The app shell.
 */
function AppShell() {
  const { t } = useTranslation()
  const { modalOpen, closeModal } = useFavoriteTeam()

  return (
    <div className="app-shell">
      <DemoDataBanner />
      <Header />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<ExplorerPage />} />
          <Route path="/match/:league/:homeId/:awayId" element={<AnalysisPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer">{t('app.footer')}</footer>

      {modalOpen ? <FavoriteTeamModal onClose={closeModal} /> : null}
      <FavoriteLiveWatcher />
    </div>
  )
}

/**
 * Wraps the app shell with the favorite-team provider.
 * @returns {JSX.Element} The application.
 */
function App() {
  return (
    <FavoriteTeamProvider>
      <AppShell />
    </FavoriteTeamProvider>
  )
}

export default App
