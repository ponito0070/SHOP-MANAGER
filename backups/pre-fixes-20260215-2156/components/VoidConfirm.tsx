import React from 'react'

export default function VoidConfirm({
  open,
  message,
  onConfirm,
  onClose,
  confirmLabel = 'Annuler la commande'
}: {
  open: boolean
  message?: string
  onConfirm: () => void
  onClose: () => void
  confirmLabel?: string
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Confirmer</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{message || "Voulez-vous vraiment annuler cette commande ?"}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-100 dark:bg-slate-700">Annuler</button>
          <button onClick={onConfirm} className="px-3 py-2 rounded bg-red-600 text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
