"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { Search, Plus, Save, X, PackagePlus, AlertCircle, ShoppingCart, Trash2 } from "lucide-react";
import CreateClientModal from '@/components/CreateClientModal';
import CreateProductModal from '@/components/CreateProductModal';

interface Product {
  id: string;
  code_barre: string;
  nom: string;
  prix_vente: number;
  prix_achat: number;
  stock_actuel: number;
}

interface Client {
  id: string;
  nom: string;
  solde: number;
}

interface SaleLine {
  product_id: string;
  nom: string;
  qty: number;
  price: number;
  discount: number;
  remise_flat: number;
  prix_achat: number;
}

export default function NewSalePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [remiseGenerale, setRemiseGenerale] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string>("");

  const [prodSearch, setProdSearch] = useState("");
  const [showProdResults, setShowProdResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const prodInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: pData } = await supabase.from('products').select('id, code_barre, nom, prix_vente, prix_achat, stock_actuel');
      const { data: cData } = await supabase.from('clients').select('id, nom, solde').order('nom');
      if (pData) setProducts(pData);
      if (cData) setClients(cData);
    };
    loadData();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const filteredProds = products.filter(p => {
    const search = prodSearch.toLowerCase();
    if (!search) return false;
    return (
      (p.nom && p.nom.toLowerCase().includes(search)) || 
      (p.code_barre && p.code_barre.toLowerCase().includes(search))
    );
  }).slice(0, 50);

  const addLine = (product: Product) => {
    const existingLine = lines.find(l => l.product_id === product.id);
    if (product.stock_actuel <= 0) {
      showToast(`❌ ${product.nom}: Stock insuffisant (0 disponible)`);
      return;
    }
    
    setLines(prev => {
      const exists = prev.find(l => l.product_id === product.id);
      if (exists) {
        if (exists.qty + 1 > product.stock_actuel) {
          showToast(`❌ ${product.nom}: Seulement ${product.stock_actuel} disponible`);
          return prev;
        }
        if (product.stock_actuel - exists.qty === 1) {
          showToast(`⚠️ ${product.nom}: Il ne reste que 1 en stock après cette vente`);
        }
        return prev.map(l => l.product_id === product.id ? { ...l, qty: l.qty + 1 } : l);
      }
      
      if (product.stock_actuel <= 1) {
        showToast(`⚠️ ${product.nom}: Il ne reste que ${product.stock_actuel} en stock`);
      }
      
      return [...prev, { 
        product_id: product.id, 
        nom: product.nom, 
        qty: 1, 
        price: product.prix_vente, 
        discount: 0,
        remise_flat: 0,
        prix_achat: product.prix_achat
      }];
    });
    setProdSearch("");
    setShowProdResults(false);
    setHighlightedIndex(0);
    prodInputRef.current?.focus();
  };

  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
    addLine(newProduct);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showProdResults) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredProds.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProds.length > 0) addLine(filteredProds[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowProdResults(false);
    }
  };

  const updateLine = (index: number, field: keyof SaleLine, value: number) => {
  const newLines = [...lines];
  const line = newLines[index];
  
  // 🔥 FIX: Validation quantité
  if (field === 'qty') {
    const product = products.find(p => p.id === line.product_id);
    if (product) {
      if (value < 1) {
        showToast(`❌ Minimum: 1`);
        return;
      }
      if (value > product.stock_actuel) {
        showToast(`❌ ${line.nom}: Max ${product.stock_actuel}`);
        return;
      }
    }
  }
  
  // @ts-ignore
  newLines[index][field] = value;
  setLines(newLines);
};

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const calculateLineTotal = (line: SaleLine) => {
    const subtotal = line.price * line.qty;
    const afterDiscount = subtotal - (subtotal * line.discount / 100);
    return Math.max(0, afterDiscount - line.remise_flat);
  };

  const calculateSubtotal = () => {
    return lines.reduce((acc, l) => acc + calculateLineTotal(l), 0);
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - remiseGenerale);
  };

  const handleSubmit = async () => {
    if (lines.length === 0) {
      showToast("❌ Le bon est vide !");
      return;
    }

    const linesWithLoss = lines.filter(l => l.prix_achat > l.price);
    if (linesWithLoss.length > 0) {
      const lossList = linesWithLoss.map(l => `${l.nom} (Achat: ${l.prix_achat} DA > Vente: ${l.price} DA)`).join(", ");
      if (!confirm(`⚠️ ALERTE PERTE DE MARGE:\n${lossList}\n\nVoulez-vous continuer?`)) {
        return;
      }
    }
    // 🔥 FIX #7: VALIDATION STOCK STRICTE
const stockErrors: string[] = [];

for (const line of lines) {
  const product = products.find(p => p.id === line.product_id);
  
  if (!product) {
    stockErrors.push(`❌ ${line.nom}: Produit introuvable`);
    continue;
  }

  // Vérifier quantité demandée vs stock disponible
  if (line.qty > product.stock_actuel) {
    stockErrors.push(
      `❌ ${line.nom}: Demandé ${line.qty}, Disponible ${product.stock_actuel}`
    );
  }

  // Vérifier que stock actuel est positif
  if (product.stock_actuel <= 0) {
    stockErrors.push(`❌ ${line.nom}: Stock épuisé`);
  }
}

// Si erreurs, BLOQUER
if (stockErrors.length > 0) {
  alert(
    "🚫 IMPOSSIBLE DE CRÉER LE BON\n\n" +
    "Problèmes de stock:\n" +
    stockErrors.join("\n") +
    "\n\nCorrigez les quantités."
  );
  showToast("❌ Stock insuffisant");
  return; // ⛔ STOPPER ICI
}
    setIsSubmitting(true);

    const payload = lines.map(l => ({
      product_id: l.product_id,
      quantite: Number(l.qty),
      prix_unitaire: Number(l.price),
      remise: Number(l.discount),
      remise_flat: Number(l.remise_flat),
      total: Number(calculateLineTotal(l).toFixed(2))
    }));

    const { data: userData } = await supabase.auth.getUser();
    const clientIdToSend = selectedClient && selectedClient !== "" ? selectedClient : null;
    const finalTotal = calculateTotal();

    const { data: rpcResult, error } = await supabase.rpc('create_sale_transaction', {
      p_client_id: clientIdToSend,
      p_user_id: userData.user?.id || null,
      p_total: Number(finalTotal.toFixed(2)),
      p_items: payload
    });

    if (error) {
      console.error("Erreur RPC:", error);
      showToast("❌ Erreur lors de la vente : " + error.message);
      setIsSubmitting(false);
      return;
    }

    if (remiseGenerale > 0 && rpcResult) {
      const saleId = rpcResult.id || rpcResult;
      await supabase
        .from('sales')
        .update({ remise_flat: remiseGenerale })
        .eq('id', saleId);
    }

    setLines([]);
    setSelectedClient("");
    setProdSearch("");
    setRemiseGenerale(0);
    showToast("✅ Vente validée avec succès!");
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto">
      
      {/* TOAST */}
      {toastMessage && (
        <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 bg-slate-900 text-white px-4 py-3 rounded-lg shadow-2xl z-50 animate-slide-up">
          {toastMessage}
        </div>
      )}

      {/* HEADER RESPONSIVE */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2.5 rounded-lg">
              <ShoppingCart className="text-blue-600 dark:text-blue-300" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Nouveau Bon de Livraison
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </div>

        {/* SÉLECTION CLIENT - Stack sur mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
              Client
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white min-h-[48px] text-base"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">-- Client Comptoir --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
              <button
                onClick={() => setIsClientModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
                title="Nouveau client"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2">
              Référence externe (optionnel)
            </label>
            <input
              type="text"
              placeholder="Ex: BON-123"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white min-h-[48px] text-base"
            />
          </div>
        </div>
      </div>

      {/* GRID PRINCIPAL - 2 colonnes sur desktop, stack sur mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        
        {/* COLONNE GAUCHE - Formulaire */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* RECHERCHE PRODUIT - Touch friendly */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              <input
                ref={prodInputRef}
                type="text"
                placeholder="Scanner code-barre ou chercher un produit..."
                className="w-full pl-12 pr-16 py-3 bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[52px] text-base"
                value={prodSearch}
                onChange={(e) => {
                  setProdSearch(e.target.value);
                  setShowProdResults(e.target.value.length > 0);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (prodSearch) setShowProdResults(true); }}
                onBlur={() => setTimeout(() => setShowProdResults(false), 200)}
                autoFocus
              />
              <button
                onClick={() => setIsProductModalOpen(true)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                title="Créer un nouvel article"
              >
                <PackagePlus size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* RÉSULTATS - Dropdown responsive */}
            {showProdResults && filteredProds.length > 0 && (
              <div ref={resultsRef} className="mt-2 max-h-60 md:max-h-96 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                {filteredProds.map((p, idx) => (
                  <button
                    key={p.id}
                    onClick={() => addLine(p)}
                    className={`w-full px-4 py-3 flex items-center justify-between transition-colors border-b border-gray-100 dark:border-slate-800 last:border-0 text-left min-h-[56px] ${
                      idx === highlightedIndex
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-white text-sm md:text-base truncate">
                        {p.nom}
                      </div>
                      <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                        <span>{p.code_barre}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          p.stock_actuel <= 0
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : p.stock_actuel <= 5
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        }`}>
                          Stock: {p.stock_actuel}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-3">
                      <div className="font-bold text-blue-600 dark:text-blue-400 text-sm md:text-base whitespace-nowrap">
                        {p.prix_vente.toFixed(2)} DA
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {showProdResults && filteredProds.length === 0 && prodSearch && (
              <div className="mt-2 p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Aucun produit trouvé
              </div>
            )}
          </div>

          {/* LIGNES DE VENTE - Cards sur mobile, table sur desktop */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            {lines.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <PackagePlus size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-sm">Aucun article ajouté</p>
                <p className="text-xs mt-1">Recherchez un produit pour commencer</p>
              </div>
            ) : (
              <>
                {/* MOBILE: Cards */}
                <div className="lg:hidden divide-y divide-gray-200 dark:divide-slate-700">
                  {lines.map((line, idx) => (
                    <div key={idx} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {line.nom}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Prix unitaire: {line.price.toFixed(2)} DA
                          </div>
                        </div>
                        <button
                          onClick={() => removeLine(idx)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Quantité</label>
                          <input
                            type="number"
                            min="1"
                            value={line.qty}
                            onChange={(e) => updateLine(idx, 'qty', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-center bg-gray-50 dark:bg-slate-900 min-h-[44px] text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Remise %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={line.discount}
                            onChange={(e) => updateLine(idx, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-center bg-gray-50 dark:bg-slate-900 min-h-[44px] text-base"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Remise DA</label>
                          <input
                            type="number"
                            min="0"
                            value={line.remise_flat}
                            onChange={(e) => updateLine(idx, 'remise_flat', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-center bg-gray-50 dark:bg-slate-900 min-h-[44px] text-base"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-slate-700">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Total ligne:</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-base">
                          {calculateLineTotal(line).toFixed(2)} DA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* DESKTOP: Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-slate-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Article</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Qté</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prix Unit.</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remise %</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Remise DA</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {lines.map((line, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white text-sm">{line.nom}</div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              value={line.qty}
                              onChange={(e) => updateLine(idx, 'qty', parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded text-center bg-gray-50 dark:bg-slate-900"
                            />
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                            {line.price.toFixed(2)} DA
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={line.discount}
                              onChange={(e) => updateLine(idx, 'discount', parseFloat(e.target.value) || 0)}
                              className="w-20 px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded text-center bg-gray-50 dark:bg-slate-900"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              value={line.remise_flat}
                              onChange={(e) => updateLine(idx, 'remise_flat', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1.5 border border-gray-200 dark:border-slate-700 rounded text-center bg-gray-50 dark:bg-slate-900"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {calculateLineTotal(line).toFixed(2)} DA
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => removeLine(idx)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        {/* COLONNE DROITE - Résumé (Sticky sur desktop, en bas sur mobile) */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 md:p-6 lg:sticky lg:top-6 space-y-4">
            <div className="flex items-center gap-2 pb-4 border-b border-gray-200 dark:border-slate-700">
              <Save className="text-blue-600 dark:text-blue-400" size={20} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Résumé
              </h3>
            </div>

            {/* Remise générale */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Remise générale (DA)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={remiseGenerale}
                onChange={(e) => setRemiseGenerale(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg text-center text-lg font-medium bg-gray-50 dark:bg-slate-900 min-h-[52px] text-base"
                placeholder="0.00"
              />
            </div>

            {/* Totaux */}
            <div className="space-y-3 py-4 border-t border-b border-gray-200 dark:border-slate-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Articles:</span>
                <span className="font-medium text-gray-900 dark:text-white">{lines.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Sous-total:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {calculateSubtotal().toFixed(2)} DA
                </span>
              </div>
              {remiseGenerale > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Remise générale:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{remiseGenerale.toFixed(2)} DA
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xl pt-2">
                <span className="font-bold text-gray-900 dark:text-white">Total:</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {calculateTotal().toFixed(2)} DA
                </span>
              </div>
            </div>

            {/* Bouton validation */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || lines.length === 0 || !selectedClient}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg flex items-center justify-center gap-3 transition-colors font-semibold text-base min-h-[56px] shadow-lg"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Valider la vente
                </>
              )}
            </button>

            {(!selectedClient && lines.length > 0) && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <AlertCircle size={16} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  Veuillez sélectionner un client avant de valider
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/*MODALS*/}
{isClientModalOpen && (
  <CreateClientModal
    isOpen={isClientModalOpen}              // Change isOpen à open
    onClose={() => setIsClientModalOpen(false)}  // Corrige la faute de frappe
    onSuccess={(newClient: Client)=>{      // Corrige onclientCreated à onClientCreated
      setClients(prev => [newClient, ...prev]);
      setSelectedClient(newClient.id);      // Corrige setSelectedclient à setSelectedClient
    }}
  />
)}

{isProductModalOpen && (
  <CreateProductModal
    isOpen={isProductModalOpen}              // Change isOpen à open
    onClose={() => setIsProductModalOpen(false)}  // Corrige la faute de frappe
    onSuccess={handleProductCreated}  // Corrige la parenthèse fermante
  />
)}
    </div>
  );
}
