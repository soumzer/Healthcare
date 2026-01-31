import type { Exercise } from '../../db/types'

interface ActiveWaitProps {
  fillerExercises: Exercise[]
  onMachineFree: () => void
}

export default function ActiveWait({
  fillerExercises,
  onMachineFree,
}: ActiveWaitProps) {
  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-zinc-400 text-sm uppercase tracking-wider mb-2">
          Machine occupee
        </p>
        <h2 className="text-lg font-bold mb-8 text-center">En attendant :</h2>

        {fillerExercises.length > 0 ? (
          <div className="w-full space-y-3">
            {fillerExercises.map((ex) => (
              <div
                key={ex.id ?? ex.name}
                className="bg-zinc-900 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{ex.name}</p>
                  {ex.rehabTarget && (
                    <p className="text-zinc-400 text-sm">
                      rehab {ex.rehabTarget.replace('_', ' ')}
                    </p>
                  )}
                </div>
                <p className="text-zinc-400 text-sm">2 min</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-zinc-500 text-center">
            Pas d&apos;exercice de remplissage disponible.
            <br />
            Profitez-en pour vous etirer !
          </p>
        )}
      </div>

      <div className="pb-4">
        <button
          onClick={onMachineFree}
          className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
        >
          Machine libre
        </button>
      </div>
    </div>
  )
}
