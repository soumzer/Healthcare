import type { AttendanceData } from '../../hooks/useDashboardData'

interface AttendanceTrackerProps {
  attendance: AttendanceData
}

export default function AttendanceTracker({ attendance }: AttendanceTrackerProps) {
  const { thisWeek, target } = attendance
  const dots = Array.from({ length: target }, (_, i) => i < thisWeek)

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Assiduité</h2>

      <p className="text-zinc-300 text-sm mb-3">
        Cette semaine : {thisWeek}/{target} séance{target > 1 ? 's' : ''}
      </p>

      <div className="flex gap-2">
        {dots.map((filled, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full ${
              filled ? 'bg-green-500' : 'bg-zinc-700'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
