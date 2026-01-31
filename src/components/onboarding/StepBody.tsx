import type { useOnboarding } from '../../hooks/useOnboarding'

type Props = ReturnType<typeof useOnboarding>

export default function StepBody({ state, updateBody, nextStep }: Props) {
  const { body } = state

  const setField = <K extends keyof typeof body>(key: K, value: (typeof body)[K]) => {
    updateBody({ ...body, [key]: value })
  }

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold">Votre profil</h2>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Nom / Prenom</label>
        <input
          type="text"
          value={body.name}
          onChange={e => setField('name', e.target.value)}
          placeholder="Votre nom"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Taille (cm)</label>
        <input
          type="number"
          value={body.height}
          onChange={e => setField('height', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Poids (kg)</label>
        <input
          type="number"
          value={body.weight}
          onChange={e => setField('weight', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-1">Age</label>
        <input
          type="number"
          value={body.age}
          onChange={e => setField('age', Number(e.target.value))}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-zinc-500"
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-2">Sexe</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setField('sex', 'male')}
            className={`py-3 rounded-lg text-center font-medium transition-colors ${
              body.sex === 'male'
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-white'
            }`}
          >
            Homme
          </button>
          <button
            type="button"
            onClick={() => setField('sex', 'female')}
            className={`py-3 rounded-lg text-center font-medium transition-colors ${
              body.sex === 'female'
                ? 'bg-white text-black'
                : 'bg-zinc-800 text-white'
            }`}
          >
            Femme
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={nextStep}
        disabled={!body.name.trim()}
        className="w-full bg-white text-black font-semibold py-3 rounded-lg mt-4 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Suivant
      </button>
    </div>
  )
}
