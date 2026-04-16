import { Routes, Route, Navigate } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'
import History from './pages/History'

function App() {
  const hasSeenWelcome = localStorage.getItem('medbuddy_welcomed')
  const isSetup = localStorage.getItem('medbuddy_setup')

  return (
    <Routes>
      <Route
        path="/"
        element={
          !hasSeenWelcome
            ? <Navigate to="/welcome" />
            : isSetup
              ? <Navigate to="/dashboard" />
              : <Navigate to="/onboarding" />
        }
      />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/history" element={<History />} />
    </Routes>
  )
}

export default App