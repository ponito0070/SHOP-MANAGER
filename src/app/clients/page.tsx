'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Search } from 'lucide-react'
import PaymentModal from '@/components/PaymentModal'

type Client = {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string
  ville: string
  solde: number
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const filteredClients = clients.filter((client) => {
    const fullName = `${client.nom} ${client.prenom}`.toLowerCase()
    const phone = client.telephone?.toLowerCase() || ''
    const term = searchTerm.toLowerCase()
    return fullName.includes(term) || phone.includes(term)
  })

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erreur chargement clients:', error)
      } else {
        setClients(data || [])
      }
      setLoading(false)
    }

    fetchClients()
  }, [])

  const handlePaymentSave = async (amount: number, note?: string) => {
    if (!selectedClient) return

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          party_type: 'client',
          party_id: selectedClient.id,
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
      
      // Update client solde
      setClients(clients.map((c) =>
        c.id === selectedClient.id ? { ...c, solde: result.new_balance } : c
      ))
      
      setPaymentOpen(false)
      setSelectedClient(null)
    } catch (error) {
      console.error('Erreur lors du paiement:', error)
      alert('Erreur lors du traitement du paiement')
    }
  }

  return (
    <div className="p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clients</h1>
          <p className="text-gray-500 dark:text-gray-400">Gérez votre base de clients</p>
        </div>
        <Link 
          href="/clients/nouveau" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Nouveau Client
        </Link>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher par nom ou numéro de téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement des clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {clients.length === 0 ? 'Aucun client trouvé.' : 'Aucun résultat pour cette recherche.'}
            </p>
            {clients.length === 0 && (
              <Link 
                href="/clients/nouveau" 
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Commencez par en créer un !
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-2 font-semibold">Nom complet</th>
                <th className="px-6 py-2 font-semibold">Contact</th>
                <th className="px-6 py-2 font-semibold">Ville</th>
                <th className="px-6 py-2 font-semibold text-right">Solde</th>
                <th className="px-6 py-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-2 font-medium text-gray-900 dark:text-white">
                    {client.nom} {client.prenom}
                  </td>
                  <td className="px-6 py-2 text-gray-600 dark:text-gray-300 text-sm">
                    <div className="flex flex-col">
                      <span>{client.email}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{client.telephone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-2 text-gray-600 dark:text-gray-300">{client.ville || '-'}</td>
                  <td className={`px-6 py-2 text-right font-medium ${client.solde < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {client.solde?.toFixed(2)} DZD
                  </td>
                  <td className="px-6 py-2 text-right space-x-2">
                    <button
                      onClick={() => {
                        setSelectedClient(client)
                        setPaymentOpen(true)
                      }}
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 text-sm font-medium"
                    >
                      Recevoir
                    </button>
                    <Link 
                      href={`/clients/${client.id}`}
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
      {selectedClient && (
        <PaymentModal
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false)
            setSelectedClient(null)
          }}
          onSave={handlePaymentSave}
          partyType="client"
          partyId={selectedClient.id}
          partyName={`${selectedClient.nom} ${selectedClient.prenom}`}
        />
      )}
    </div>
  )
}
