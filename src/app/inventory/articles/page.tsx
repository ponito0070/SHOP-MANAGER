'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Package, 
  TrendingUp,
  AlertCircle,
  X,
  Save
} from 'lucide-react'
import CreateProductModal from '@/components/CreateProductModal'

type Product = {
  id: string
  code_barre: string
  nom: string
  prix_achat: number
  prix_achat_moyen?: number
  prix_vente: number
  stock_actuel: number
  stock_minimum: number
  created_at: string
}

export default function ArticlesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchProducts()
  }, [])

  useEffect(() => {
    const filtered = products.filter(p =>
      p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code_barre?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredProducts(filtered)
  }, [searchTerm, products])

  const fetchProducts = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erreur chargement produits:', error)
    } else {
      setProducts(data || [])
      setFilteredProducts(data || [])
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet article ? Cette action est irréversible.')) return

    const { error } = await supabase.from('products').delete().eq('id', id)

    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      fetchProducts()
    }
  }

  const handleProductCreated = (newProduct: Product) => {
    fetchProducts()
  }

  const handleProductUpdated = () => {
    setEditingProduct(null)
    fetchProducts()
  }

  // Statistiques
  const totalProducts = products.length
  const lowStockCount = products.filter(p => p.stock_actuel <= p.stock_minimum).length
  const totalValue = products.reduce((sum, p) => sum + (p.stock_actuel * p.prix_achat), 0)

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-gray-200 dark:border-slate-600">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Package className="text-blue-600" size={32} />
              Gestion des Articles
            </h1>
            <p className="text-gray-500 dark:text-gray-400">Catalogue complet des produits</p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-md"
          >
            <Plus size={20} />
            Nouvel Article
          </button>
        </div>

        {/* STATISTIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Articles</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalProducts}</p>
              </div>
              <Package className="text-blue-600 dark:text-blue-400" size={32} />
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Stock Faible</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{lowStockCount}</p>
              </div>
              <AlertCircle className="text-orange-600 dark:text-orange-400" size={32} />
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Valeur Stock</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {totalValue.toLocaleString()} DA
                </p>
              </div>
              <TrendingUp className="text-green-600 dark:text-green-400" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* RECHERCHE */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow border border-gray-200 dark:border-slate-600">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher par nom ou code-barre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-600 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">Chargement...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm ? `Aucun article trouvé pour "${searchTerm}"` : 'Aucun article dans le catalogue'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Créer le premier article
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700">
                  <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Réf</th>
                  <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300">Désignation</th>
                  <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 text-right">P.A</th>
                  <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 text-right">P.A Moy</th>
                  <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 text-right">P.V</th>
                  <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 text-center">Stock</th>
                  <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 text-center">Marge</th>
                  <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {filteredProducts.map((product) => {
                  const marge = product.prix_vente - product.prix_achat
                  const margePercent = product.prix_achat > 0 ? ((marge / product.prix_achat) * 100).toFixed(1) : '0'
                  const isLowStock = product.stock_actuel <= product.stock_minimum

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="p-3 font-mono text-sm text-gray-600 dark:text-gray-400">
                        {product.code_barre || '-'}
                      </td>
                      <td className="p-3 font-medium text-gray-900 dark:text-white">
                        {product.nom}
                      </td>
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                        {product.prix_achat?.toLocaleString?.() ?? 0} DA
                      </td>
                      <td className="p-3 text-right text-gray-700 dark:text-gray-300">
                        {(product.prix_achat_moyen ?? 0).toLocaleString()} DA
                      </td>
                      <td className="p-3 text-right font-medium text-gray-900 dark:text-white">
                        {product.prix_vente.toLocaleString()} DA
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          isLowStock 
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          {product.stock_actuel}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-sm font-medium ${
                          marge > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {margePercent}%
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      <CreateProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleProductCreated}
      />

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleProductUpdated}
        />
      )}
    </div>
  )
}

// MODAL D'ÉDITION
function EditProductModal({ 
  product, 
  onClose, 
  onSuccess 
}: { 
  product: Product
  onClose: () => void
  onSuccess: () => void 
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nom: product.nom,
    code_barre: product.code_barre,
    prix_achat: product.prix_achat,
    prix_vente: product.prix_vente,
    stock_actuel: product.stock_actuel,
    stock_minimum: product.stock_minimum
  })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('products')
      .update(formData)
      .eq('id', product.id)

    if (error) {
      alert('Erreur: ' + error.message)
    } else {
      onSuccess()
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 m-4 border border-gray-200 dark:border-slate-700">
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Edit className="w-6 h-6 text-blue-600" />
            Modifier l'Article
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
                type="text"
                required
                value={formData.nom}
                onChange={e => setFormData({ ...formData, nom: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code-barre</label>
              <input
                type="text"
                value={formData.code_barre}
                onChange={e => setFormData({ ...formData, code_barre: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Actuel</label>
              <input
                type="number"
                value={formData.stock_actuel}
                onChange={e => setFormData({ ...formData, stock_actuel: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Achat (DA)</label>
              <input
                type="number"
                step="0.01"
                value={formData.prix_achat}
                onChange={e => setFormData({ ...formData, prix_achat: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Vente (DA)</label>
              <input
                type="number"
                step="0.01"
                value={formData.prix_vente}
                onChange={e => setFormData({ ...formData, prix_vente: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Minimum</label>
              <input
                type="number"
                value={formData.stock_minimum}
                onChange={e => setFormData({ ...formData, stock_minimum: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 rounded-lg border bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}