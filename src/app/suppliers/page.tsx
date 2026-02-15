'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Truck, Plus, Search } from 'lucide-react'
import PaymentModal from '@/components/PaymentModal'

type Supplier = {
  id: string
  nom: string
  email: string
  telephone: string
  adresse: string
  solde: number
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const filteredSuppliers = suppliers.filter((supplier) => {
    const name = supplier.nom?.toLowerCase() || ''
    const email = supplier.email?.toLowerCase() || ''
    const phone = supplier.telephone?.toLowerCase() || ''
    const term = searchTerm.toLowerCase()
    return name.includes(term) || email.includes(term) || phone.includes(term)
  })

  useEffect(() => {
    async function fetchSuppliers() {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur chargement fournisseurs:', error)
      } else {
        setSuppliers(data || [])
      }
      setLoading(false)
    }

    fetchSuppliers()
  }, [])

  const handlePaymentSave = async (amount: number, note?: string) => {
    if (!selectedSupplier) return

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_type: 'supplier',
          party_id: selectedSupplier.id,
          amount,
          note: note || '',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        alert(`Erreur: ${error.message}`)
        return
      }

      const result = await response.json()
      
      // Update supplier solde
      setSuppliers(suppliers.map((s) =>
        s.id === selectedSupplier.id ? { ...s, solde: result.new_balance } : s
      ))
      
      setPaymentOpen(false)
      setSelectedSupplier(null)
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
      alert('Erreur lors du traitement du paiement')
    }
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Truck className="text-blue-600" size={32} />
            Fournisseurs
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Gérez vos fournisseurs et partenaires</p>
        </div>
        <Link 
          href="/suppliers/nouveau" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
        >
          <Plus size={20} />
          Nouveau Fournisseur
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher par nom, email ou téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement des fournisseurs...</div>
        ) : suppliers.length === 0 ? (
          <div className="p-12 text-center">
            <Truck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Aucun fournisseur trouvé.</p>
            <Link 
              href="/suppliers/nouveau" 
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Créer le premier fournisseur
            </Link>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Aucun résultat pour cette recherche.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-2 font-semibold">Nom</th>
                <th className="px-6 py-2 font-semibold">Contact</th>
                <th className="px-6 py-2 font-semibold">Adresse</th>
                <th className="px-6 py-2 font-semibold text-right">Solde</th>
                <th className="px-6 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-2 font-medium text-gray-900 dark:text-white">
                    {supplier.nom}
                  </td>
                  <td className="px-6 py-2 text-gray-600 dark:text-gray-300 text-sm">
                    <div className="flex flex-col">
                      <span>{supplier.email || '-'}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{supplier.telephone || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-2 text-gray-600 dark:text-gray-300 text-sm">
                    {supplier.adresse || '-'}
                  </td>
                  <td className={`px-6 py-2 text-right font-medium ${supplier.solde < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {supplier.solde?.toFixed(2)} DA
                  </td>
                  <td className="px-6 py-2 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedSupplier(supplier)
                        setPaymentOpen(true)
                      }}
                      className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 text-sm font-medium"
                    >
                      Payer
                    </button>
                    <Link 
                      href={`/suppliers/${supplier.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                    >
                      Détails
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Modal */}
      {selectedSupplier && (
        <PaymentModal
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false)
            setSelectedSupplier(null)
          }}
          onSave={handlePaymentSave}
          partyType="supplier"
          partyId={selectedSupplier.id}
          partyName={selectedSupplier.nom}
        />
      )}
    </div>
  )
}
