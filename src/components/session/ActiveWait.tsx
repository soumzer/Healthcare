import type { FillerSuggestion } from '../../engine/filler'

interface ActiveWaitProps {
  fillerSuggestion: FillerSuggestion | null
  onMachineFree: () => void
}

export default function ActiveWait({
  fillerSuggestion,
  onMachineFree,
}: ActiveWaitProps) {
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] p-4 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-zinc-400 text-sm uppercase tracking-wider mb-2">
          Machine occupée
        </p>
        <h2 className="text-lg font-bold mb-8 text-center">En attendant :</h2>

        {fillerSuggestion ? (
          <div className="w-full space-y-3">
            <div className="bg-zinc-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-medium">{fillerSuggestion.name}</p>
                <p className="text-zinc-400 text-sm">{fillerSuggestion.duration}</p>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-zinc-300 text-sm">
                  {fillerSuggestion.sets} x {fillerSuggestion.reps}
                </span>
                {fillerSuggestion.isRehab && (
                  <span className="bg-emerald-900/40 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                    rehab
                  </span>
                )}
              </div>
              {fillerSuggestion.notes && (
                <p className="text-zinc-400 text-sm">{fillerSuggestion.notes}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-zinc-400 text-center">
            Pas d&apos;exercice de remplissage disponible.
            <br />
            Profitez-en pour vous étirer !
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
