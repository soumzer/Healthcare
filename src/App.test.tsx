import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AppWrapper from './App'

describe('App', () => {
  it('renders onboarding when no user exists', async () => {
    render(<AppWrapper />)
    expect(await screen.findByText('Votre profil')).toBeInTheDocument()
  })
})
