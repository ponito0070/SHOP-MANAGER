'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { X, Save, PackagePlus } from 'lucide-react'

type CreateProductModalProps = {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newProduct: any) => void
}

export default function CreateProductModal({ isOpen, onClose, onSuccess }: CreateProductModalProps) {
  const [loading, setLoading] = useState(false)
  
  // Champs essentiels pour création rapide
  const [formData, setFormData] = useState({
    nom: '',
    code_barre: '',
    prix_achat: 0,
    prix_vente: 0,
    stock_actuel: 0 // Souvent 0 à la création, on l'augmente via le BR ensuite
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nom) return
    setLoading(true)

    const { data, error } = await supabase
      .from('products')
      .insert([formData])
      .select()
      .single()

    if (error) {
      alert('Erreur création produit: ' + error.message)
    } else {
      onSuccess(data)
      setFormData({ nom: '', code_barre: '', prix_achat: 0, prix_vente: 0, stock_actuel: 0 })
      onClose()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PackagePlus className="w-6 h-6 text-blue-600" />
            Nouveau Produit Rapide
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Désignation *</label>
              <input
                type="text" required autoFocus
                value={formData.nom}
                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Clavier Sans Fil"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code Barre (Ref)</label>
              <input
                type="text"
                value={formData.code_barre}
                onChange={e => setFormData({ ...formData, code_barre: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Scanner ou taper..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Achat</label>
              <input
                type="number" min="0"
                value={formData.prix_achat || ''}
                onChange={e => setFormData({ ...formData, prix_achat: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Vente</label>
              <input
                type="number" min="0"
                value={formData.prix_vente || ''}
                onChange={e => setFormData({ ...formData, prix_vente: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition">Annuler</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50">
              <Save className="w-4 h-4" /> {loading ? '...' : 'Créer Produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
