import { useState, useRef } from 'react'
import { exportData, importData } from '../../utils/backup'

export default function BackupSection({ userId }: { userId: number }) {
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function clearMessages() {
    setStatus(null)
    setError(null)
  }

  async function handleExport() {
    clearMessages()
    try {
      const json = await exportData(userId)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `healthcare-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setStatus('Backup exporté avec succès')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'export')
    }
  }

  async function handleImport(file: File) {
    clearMessages()
    try {
      const json = await file.text()
      await importData(json)
      setStatus('Données restaurées avec succès')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors de l\'import')
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleImport(file)
    // Reset so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-4 space-y-3">
      <h3 className="text-lg font-semibold text-white">Sauvegarde des données</h3>

      <button
        onClick={handleExport}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
      >
        Exporter mes données
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full py-3 bg-zinc-700 hover:bg-zinc-600 text-white font-medium rounded-lg transition-colors"
      >
        Importer un backup
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={onFileChange}
        className="hidden"
      />

      {status && (
        <p className="text-sm text-emerald-400">{status}</p>
      )}
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}
