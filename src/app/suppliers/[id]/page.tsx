'use client'

import { useEffect, useState, use } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Truck } from 'lucide-react'
import PaymentModal from '@/components/PaymentModal'

export default function DetailSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    solde: 0,
    notes: ''
  })
  const [paymentOpen, setPaymentOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchSupplier() {
      if (!id) return

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Erreur:', error)
        setMessage({ type: 'error', text: 'Fournisseur introuvable.' })
      } else if (data) {
        setFormData({
          nom: data.nom || '',
          email: data.email || '',
          telephone: data.telephone || '',
          adresse: data.adresse || '',
          solde: data.solde || 0,
          notes: data.notes || ''
        })
      }
      setLoading(false)
    }

    fetchSupplier()
  }, [id])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('suppliers')
      .update({
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        solde: formData.solde,
        notes: formData.notes
      })
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour.' })
    } else {
      setMessage({ type: 'success', text: 'Fournisseur mis à jour avec succès !' })
    }
    setSaving(false)
  }

  const handlePaymentSave = async (amount: number, note?: string) => {
    const { error: e1 } = await supabase.from('payments').insert([{ party_type: 'supplier', party_id: id, amount, note }])
    if (e1) { alert('Erreur enregistrement paiement: '+e1.message); return }
    const { error: e2 } = await supabase.from('suppliers').update({ solde: formData.solde - amount }).eq('id', id)
    if (e2) { alert('Erreur mise à jour solde: '+e2.message); return }
    const { data } = await supabase.from('suppliers').select('*').eq('id', id).single()
    setFormData(prev=>({ ...prev, solde: data?.solde || 0 }))
    setPaymentOpen(false)
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce fournisseur ? Cette action est irréversible.')) return

    setDeleting(true)
    const { error } = await supabase.from('suppliers').delete().eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: 'Impossible de supprimer (peut-être lié à des achats ?).' })
      setDeleting(false)
    } else {
      router.push('/suppliers')
      router.refresh()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'solde' ? parseFloat(value) || 0 : value
    }))
  }

  if (loading) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/suppliers" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition">
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Truck className="text-blue-600" />
              Modifier Fournisseur
            </h1>
            <p className="text-gray-500 dark:text-gray-400">ID: {id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setPaymentOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg">Payer</button>
          <button 
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
          >
            <Trash2 className="w-5 h-5" />
            {deleting ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 space-y-8">
        
        {message && (
          <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200'} border`}>
            {message.text}
          </div>
        )}

        {/* Section Principale */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-slate-700">
            Informations Principales
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom *</label>
              <input 
                type="text" 
                name="nom" 
                required
                value={formData.nom} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone</label>
              <input 
                type="tel" 
                name="telephone" 
                value={formData.telephone} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Adresse</label>
              <input 
                type="text" 
                name="adresse" 
                value={formData.adresse} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Section Financière */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-slate-700">
            Informations Financières
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Solde (DA)</label>
              <input 
                type="number" 
                step="0.01"
                name="solde" 
                value={formData.solde} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" 
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Positif = Nous devons / Négatif = Le fournisseur nous doit</p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea 
                name="notes" 
                rows={3} 
                value={formData.notes} 
                onChange={handleChange} 
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Mettre à jour'}
          </button>
        </div>

      </form>
      <PaymentModal open={paymentOpen} onClose={()=>setPaymentOpen(false)} onSave={handlePaymentSave} partyType="supplier" partyId={id} partyName={formData.nom} />
    </div>
  )
}