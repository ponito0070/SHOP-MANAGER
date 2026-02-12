"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Edit, Trash2, Plus, X, Save } from "lucide-react";

interface Product {
  id: string;
  nom: string;
  code_barre: string;
  prix_achat_moyen: number; // CORRIGÉ
  prix_vente: number;
  stock_actuel: number;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // État formulaire (pour Ajout ET Edition)
  const [formData, setFormData] = useState<Partial<Product>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("nom");
    if (data) setProducts(data);
    setLoading(false);
  };

  // --- ACTIONS ---

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cet article définitivement ?")) return;
    await supabase.from("products").delete().eq("id", id);
    fetchProducts();
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingId(product.id);
      setFormData(product);
    } else {
      setEditingId(null);
      setFormData({ stock_actuel: 0, prix_achat_moyen: 0, prix_vente: 0 }); // CORRIGÉ
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.nom) return alert("Le nom est requis");

    // Construction du Payload (Objet à envoyer)
    const payload = {
      nom: formData.nom,
      code_barre: formData.code_barre || null, // Peut être vide
      prix_achat_moyen: formData.prix_achat_moyen || 0, // CORRIGÉ (Mappe vers la colonne BDD)
      prix_vente: formData.prix_vente || 0,
      stock_actuel: formData.stock_actuel || 0
    };

    console.log("Envoi Supabase :", payload);

    let error;
    if (editingId) {
      // UPDATE
      const { error: err } = await supabase.from("products").update(payload).eq("id", editingId);
      error = err;
    } else {
      // INSERT
      const { error: err } = await supabase.from("products").insert([payload]);
      error = err;
    }

    if (error) {
      console.error("Erreur Supabase :", error);
      alert("Erreur lors de l'enregistrement : " + error.message);
    } else {
      setIsModalOpen(false);
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Inventaire ({products.length})</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={20} /> Nouvel Article
        </button>
      </div>

      {/* TABLEAU */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-gray-400 text-sm uppercase">
            <tr>
              <th className="p-4">Réf / Code</th>
              <th className="p-4">Désignation</th>
              <th className="p-4 text-right">P.A.M.P</th>
              <th className="p-4 text-right">Prix Vente</th>
              <th className="p-4 text-center">Stock</th>
              <th className="p-4 text-center">Marge Est.</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-700 transition text-gray-800 dark:text-gray-200">
                <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.code_barre || "-"}</td>
                <td className="p-4 font-medium">{p.nom}</td>
                <td className="p-4 text-right text-gray-600 dark:text-gray-400">{p.prix_achat_moyen} DA</td>
                <td className="p-4 text-right font-bold text-gray-800 dark:text-white">{p.prix_vente} DA</td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold 
                    ${p.stock_actuel <= 5 ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"}`}>
                    {p.stock_actuel}
                  </span>
                </td>
                <td className="p-4 text-center text-xs text-gray-400">
                  {p.prix_vente - p.prix_achat_moyen > 0 ? 
                    <span className="text-green-600 dark:text-green-400">+{p.prix_vente - p.prix_achat_moyen}</span> : 
                    "-"
                  }
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => handleOpenModal(p)} className="text-blue-500 hover:text-blue-400 p-1">
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300 p-1">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && !loading && (
          <div className="p-8 text-center text-gray-400">Aucun article. Commencez par en ajouter un.</div>
        )}
      </div>

      {/* MODAL (POPUP) AJOUT/EDITION */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-slate-700 transition-colors">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingId ? "Modifier l'article" : "Nouvel Article"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                <X />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Code Barre (Ref)</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.code_barre || ""}
                  onChange={e => setFormData({...formData, code_barre: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du produit</label>
                <input 
                  type="text" 
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.nom || ""}
                  onChange={e => setFormData({...formData, nom: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Achat (PUMP)</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.prix_achat_moyen || 0}
                    onChange={e => setFormData({...formData, prix_achat_moyen: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix Vente</label>
                  <input 
                    type="number" 
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={formData.prix_vente || 0}
                    onChange={e => setFormData({...formData, prix_vente: parseFloat(e.target.value)})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock Initial</label>
                <input 
                  type="number" 
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.stock_actuel || 0}
                  onChange={e => setFormData({...formData, stock_actuel: parseInt(e.target.value)})}
                />
              </div>

              <button 
                onClick={handleSave}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 flex justify-center gap-2"
              >
                <Save size={20} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
