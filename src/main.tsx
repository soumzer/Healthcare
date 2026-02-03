import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppWrapper from './App.tsx'
import { seedExercises } from './data/seed'

// Seed the exercise catalog on app startup (idempotent — no-op if already populated)
;(async () => {
  try {
    await seedExercises()
  } catch (error) {
    console.error('Failed to seed exercises:', error)
  }
})()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>,
)
