"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, Plus, Package, AlertCircle, TrendingDown, DollarSign, Boxes } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  code_barre: string;
  nom: string;
  stock_actuel: number;
  prix_vente: number;
  prix_achat_moyen: number;
  seuil_alerte?: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("nom");

    if (!error && data) setProducts(data);
    setLoading(false);
  };

  const filteredProducts = products.filter(p =>
    p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.code_barre && p.code_barre.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Stats
  const totalProducts = filteredProducts.length;
  const lowStockProducts = filteredProducts.filter(p => p.stock_actuel <= (p.seuil_alerte || 5)).length;
  const outOfStockProducts = filteredProducts.filter(p => p.stock_actuel === 0).length;
  const totalStockValue = filteredProducts.reduce((sum, p) => sum + (p.stock_actuel * p.prix_achat_moyen), 0);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 dark:bg-orange-900 p-2.5 rounded-lg">
              <Package className="text-orange-600 dark:text-orange-300" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Inventaire Global
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Vue d'ensemble du stock
              </p>
            </div>
          </div>
          <Link
            href="/inventory/articles"
            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium min-h-[48px]"
          >
            <Boxes size={18} />
            Gérer Articles
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Articles</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalProducts}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <div className="text-xs text-red-600 dark:text-red-400 mb-1">Stock Bas</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{lowStockProducts}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Rupture</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{outOfStockProducts}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg col-span-2 lg:col-span-1">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1">Valeur Stock</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalStockValue.toFixed(0)} DA</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou code-barre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[48px] text-base"
          />
        </div>
      </div>

      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-600 border-t-transparent"></div>
        </div>
      )}

      {!loading && (
        <>
          <div className="lg:hidden space-y-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 border-l-4 ${
                product.stock_actuel === 0 
                  ? 'border-red-500'
                  : product.stock_actuel <= (product.seuil_alerte || 5)
                  ? 'border-orange-500'
                  : 'border-green-500'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white text-base">{product.nom}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{product.code_barre || 'Sans code'}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    product.stock_actuel === 0
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : product.stock_actuel <= (product.seuil_alerte || 5)
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {product.stock_actuel === 0 ? 'Rupture' : product.stock_actuel <= (product.seuil_alerte || 5) ? 'Bas' : 'OK'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Stock</div>
                    <div className="font-bold text-gray-900 dark:text-white">{product.stock_actuel}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Achat</div>
                    <div className="text-sm text-gray-900 dark:text-white">{product.prix_achat_moyen.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Vente</div>
                    <div className="text-sm font-medium text-green-600 dark:text-green-400">{product.prix_vente.toFixed(2)}</div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-slate-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Valeur:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {(product.stock_actuel * product.prix_achat).toFixed(2)} DA
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code Barre</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">P.U.M.P</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix Vente</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valeur</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{product.nom}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{product.code_barre || '-'}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`font-semibold ${
                        product.stock_actuel === 0 ? 'text-red-600' : 
                        product.stock_actuel <= (product.seuil_alerte || 5) ? 'text-orange-600' : 
                        'text-gray-900 dark:text-white'
                      }`}>
                        {product.stock_actuel}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm">{product.prix_achat_moyen.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-green-600">{product.prix_vente.toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-right font-semibold text-blue-600">{(product.stock_actuel * product.prix_achat_moyen).toFixed(2)} DA</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.stock_actuel === 0
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          : product.stock_actuel <= (product.seuil_alerte || 5)
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {product.stock_actuel === 0 ? 'Rupture' : product.stock_actuel <= (product.seuil_alerte || 5) ? 'Bas' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
              <Package size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">Aucun article trouvé</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
