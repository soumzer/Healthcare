import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import OnboardingPage from './pages/OnboardingPage'
import SessionPage from './pages/SessionPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import RestDayPage from './pages/RestDayPage'

function App() {
  const user = useLiveQuery(async () => (await db.userProfiles.toCollection().first()) ?? null)

  // Loading state
  if (user === undefined) return null

  // No user profile — show onboarding
  if (!user) return <OnboardingPage />

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-16">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/session" element={<SessionPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/rest-day" element={<RestDayPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BottomNav />
    </div>
  )
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  )
}
