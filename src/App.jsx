import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import TabBar from './components/TabBar.jsx'
import Records from './pages/Records.jsx'
import History from './pages/History.jsx'
// 諮詢頁含整份皇家商品資料，點進去才載入，首頁開得比較快
const Consult = lazy(() => import('./pages/Consult.jsx'))
import Community from './pages/Community.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <div className="app">
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/records" replace />} />
          <Route path="/records" element={<Records />} />
          <Route path="/history" element={<History />} />
          <Route
            path="/consult"
            element={
              <Suspense fallback={null}>
                <Consult />
              </Suspense>
            }
          />
          <Route path="/community" element={<Community />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  )
}