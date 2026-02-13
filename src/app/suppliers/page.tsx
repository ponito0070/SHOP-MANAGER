'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import Link from 'next/link'
import { Truck, Plus } from 'lucide-react'

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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

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
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 font-semibold">Nom</th>
                <th className="px-6 py-4 font-semibold">Contact</th>
                <th className="px-6 py-4 font-semibold">Adresse</th>
                <th className="px-6 py-4 font-semibold text-right">Solde</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {supplier.nom}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                    <div className="flex flex-col">
                      <span>{supplier.email || '-'}</span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">{supplier.telephone || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                    {supplier.adresse || '-'}
                  </td>
                  <td className={`px-6 py-4 text-right font-medium ${supplier.solde < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {supplier.solde?.toFixed(2)} DA
                  </td>
                  <td className="px-6 py-4 text-right">
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
    </div>
  )
}