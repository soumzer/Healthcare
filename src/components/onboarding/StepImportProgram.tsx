import { useState } from 'react'
import type { useOnboarding } from '../../hooks/useOnboarding'

type Props = ReturnType<typeof useOnboarding>

export default function StepImportProgram({ state, updateProgramText, prevStep, submit }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await submit()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    updateProgramText('')
    setSubmitting(true)
    setError(null)
    try {
      await submit()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'enregistrement")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Importer un programme</h2>
      <p className="text-sm text-zinc-400">
        Si vous avez déjà un programme, collez-le ci-dessous.
        Sinon, passez cette étape.
      </p>

      <textarea
        value={state.programText}
        onChange={e => updateProgramText(e.target.value)}
        rows={8}
        placeholder="Collez votre programme ici..."
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
      />

      <div className="flex gap-3">
        <button
          type="button"
          onClick={prevStep}
          disabled={submitting}
          className="flex-1 bg-zinc-800 text-white font-semibold py-3 rounded-lg disabled:opacity-40"
        >
          Retour
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="flex-1 bg-white text-black font-semibold py-3 rounded-lg disabled:opacity-40"
        >
          {submitting ? 'Enregistrement...' : 'Terminer'}
        </button>
      </div>

      <button
        type="button"
        onClick={handleSkip}
        disabled={submitting}
        className="w-full text-center text-sm text-zinc-400 py-2 disabled:opacity-40"
      >
        Passer
      </button>

      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
