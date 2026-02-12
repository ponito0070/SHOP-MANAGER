'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'

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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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

  return (
    // AJOUT: dark:bg-gray-900 pour le fond global
    <div className="p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      
      <div className="flex justify-between items-center">
        <div>
          {/* AJOUT: dark:text-white */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clients</h1>
          {/* AJOUT: dark:text-gray-400 */}
          <p className="text-gray-500 dark:text-gray-400">Gérez votre base de clients</p>
        </div>
        <Link 
          href="/clients/nouveau" 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Nouveau Client
        </Link>
      </div>

      {/* AJOUT: dark:bg-gray-800 dark:border-gray-700 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement des clients...</div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 mb-4">Aucun client trouvé.</p>
            <Link 
              href="/clients/nouveau" 
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Commencez par en créer un !
            </Link>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              {/* AJOUT: dark:bg-gray-700/50 dark:text-gray-400 dark:border-gray-700 */}
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 font-semibold">Nom complet</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Ville</th>
                <th className="px-6 py-4 font-semibold text-right">Solde</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  {/* AJOUT: dark:text-white */}
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {client.nom} {client.prenom}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                    <div className="flex flex-col">
                      <span>{client.email}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{client.telephone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{client.ville || '-'}</td>
                  <td className={`px-6 py-4 text-right font-medium ${client.solde < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {client.solde?.toFixed(2)} DZD
                  </td>
                  <td className="px-6 py-4 text-right">
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
    </div>
  )
}
