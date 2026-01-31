import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppWrapper from './App.tsx'
import { seedExercises } from './data/seed'

// Seed the exercise catalog on app startup (idempotent — no-op if already populated)
seedExercises()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWrapper />
  </StrictMode>,
)
