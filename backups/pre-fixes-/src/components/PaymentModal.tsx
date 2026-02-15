import React, { useState } from 'react'

export default function PaymentModal({
  open,
  onClose,
  onSave,
  partyType,
  partyId,
  partyName,
}: {
  open: boolean
  onClose: () => void
  onSave: (amount: number, note?: string) => Promise<void>
  partyType: 'client' | 'supplier'
  partyId: string
  partyName?: string
}) {
  const [amount, setAmount] = useState<number>(0)
  const [note, setNote] = useState<string>('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Versement</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Enregistrer un versement pour <strong>{partyName || partyType}</strong></p>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300">Montant (DA)</label>
            <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value)||0)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300">Note (optionnel)</label>
            <input value={note} onChange={e=>setNote(e.target.value)} className="w-full px-3 py-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">Annuler</button>
          <button onClick={async ()=>{ if(amount<=0){ alert('Montant invalide'); return } await onSave(amount, note); setAmount(0); setNote(''); }} className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
