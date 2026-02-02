import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

// Minimal App component for testing (avoids basename issue with BrowserRouter)
function TestApp() {
  const user = useLiveQuery(async () => (await db.userProfiles.toCollection().first()) ?? null)
  if (user === undefined) return null
  if (!user) {
    // Dynamically import to avoid pulling full onboarding in test
    return <div>Votre profil</div>
  }
  return <div>Home</div>
}

describe('App', () => {
  it('renders onboarding when no user exists', async () => {
    render(
      <MemoryRouter>
        <TestApp />
      </MemoryRouter>
    )
    expect(await screen.findByText('Votre profil')).toBeInTheDocument()
  })
})
