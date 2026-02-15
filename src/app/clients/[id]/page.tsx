'use client'

import { useEffect, useState, use } from 'react'
import PaymentModal from '@/components/PaymentModal'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

export default function DetailClientPage({ params }: { params: Promise<{ id: string }> }) {
  // CORRECTION ICI : On utilise use() pour lire les params
  const { id } = use(params)
  
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    code_postal: '',
    solde: 0,
    notes: ''
  })
  const [paymentOpen, setPaymentOpen] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchClient() {
      // On s'assure que l'ID est bien là
      if (!id) return

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Erreur:', error)
        setMessage({ type: 'error', text: 'Client introuvable.' })
      } else if (data) {
        setFormData({
            nom: data.nom || '',
            prenom: data.prenom || '',
            email: data.email || '',
            telephone: data.telephone || '',
            adresse: data.adresse || '',
            ville: data.ville || '',
            code_postal: data.code_postal || '',
            solde: data.solde || 0,
            notes: data.notes || ''
        })
      }
      setLoading(false)
    }

    fetchClient()
  }, [id]) // Dépendance correcte

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('clients')
      .update({
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        ville: formData.ville,
        code_postal: formData.code_postal,
        solde: formData.solde,
        notes: formData.notes
      })
      .eq('id', id)

    if (error) {
        setMessage({ type: 'error', text: 'Erreur lors de la mise à jour.' })
    } else {
        setMessage({ type: 'success', text: 'Client mis à jour avec succès !' })
    }
    setSaving(false)
  }

  const handlePaymentSave = async (amount: number, note?: string) => {
    // Insert payment and update client solde
    const { error: e1 } = await supabase.from('payments').insert([{ party_type: 'client', party_id: id, amount, note }])
    if (e1) { alert('Erreur enregistrement paiement: '+e1.message); return }
    const { error: e2 } = await supabase.from('clients').update({ solde: formData.solde - amount }).eq('id', id)
    if (e2) { alert('Erreur mise à jour solde: '+e2.message); return }
    // refresh
    const { data } = await supabase.from('clients').select('*').eq('id', id).single()
    setFormData(prev=>({ ...prev, solde: data?.solde || 0 }))
    setPaymentOpen(false)
  }

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.')) return

    setDeleting(true)
    const { error } = await supabase.from('clients').delete().eq('id', id)

    if (error) {
        setMessage({ type: 'error', text: 'Impossible de supprimer (peut-être lié à des ventes ?).' })
        setDeleting(false)
    } else {
        router.push('/clients')
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

  if (loading) return <div className="p-8 text-center text-gray-500">Chargement...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
            <Link href="/clients" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition">
            <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modifier Client</h1>
            <p className="text-gray-500 dark:text-gray-400">ID: {id}</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={()=>setPaymentOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg">Recevoir</button>
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
          <div className={`p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} border`}>
            {message.text}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
                <input type="text" name="nom" value={formData.nom} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prénom</label>
                <input type="text" name="prenom" value={formData.prenom} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
             <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input type="text" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone</label>
                <input type="text" name="telephone" value={formData.telephone} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Solde (DZD)</label>
                <input type="number" name="solde" value={formData.solde} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
             <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
              <textarea name="notes" rows={3} value={formData.notes} onChange={handleChange} className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white" />
            </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-slate-700">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Enregistrement...' : 'Mettre à jour'}
          </button>
        </div>

      </form>
      <PaymentModal open={paymentOpen} onClose={()=>setPaymentOpen(false)} onSave={handlePaymentSave} partyType="client" partyId={id} partyName={formData.nom} />

    </div>
  )
}
