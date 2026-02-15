"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { Search, Plus, Save, Package, Check, X, PackagePlus, AlertCircle } from "lucide-react";
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

  // DATA
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // UI & FORM
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [remiseGenerale, setRemiseGenerale] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // SEARCH LOGIC
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

  // Toast notification
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // FILTRAGE (NOM + CODE BARRE)
  const filteredProds = products.filter(p => {
    const search = prodSearch.toLowerCase();
    if (!search) return false; // NE RIEN AFFICHER SI VIDE
    return (
      (p.nom && p.nom.toLowerCase().includes(search)) || 
      (p.code_barre && p.code_barre.toLowerCase().includes(search))
    );
  }).slice(0, 50);

  // AJOUT LIGNE
  const addLine = (product: Product) => {
    // Validation stock
    const existingLine = lines.find(l => l.product_id === product.id);
    if (product.stock_actuel <= 0) {
      showToast(`❌ ${product.nom}: Stock insuffisant (0 disponible)`);
      return;
    }
    
    setLines(prev => {
      const exists = prev.find(l => l.product_id === product.id);
      if (exists) {
        // Vérifier si on peut augmenter la quantité
        if (exists.qty + 1 > product.stock_actuel) {
          showToast(`❌ ${product.nom}: Seulement ${product.stock_actuel} disponible`);
          return prev;
        }
        // Alerte stock bas
        if (product.stock_actuel - exists.qty === 1) {
          showToast(`⚠️ ${product.nom}: Il ne reste que 1 en stock après cette vente`);
        }
        return prev.map(l => l.product_id === product.id ? { ...l, qty: l.qty + 1 } : l);
      }
      
      // Alerte stock bas à l'ajout
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

  // CALLBACK CREATION PRODUIT
  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]); 
    addLine(newProduct); 
  };

  // GESTION CLAVIER
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showProdResults) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredProds.length - 1 ? prev + 1 : prev));
      resultsRef.current?.children[highlightedIndex + 1]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
      resultsRef.current?.children[highlightedIndex - 1]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProds.length > 0) addLine(filteredProds[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowProdResults(false);
    }
  };

  const updateLine = (index: number, field: keyof SaleLine, value: number) => {
    const newLines = [...lines];
    // @ts-ignore
    newLines[index][field] = value;
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  // Calcul total avec remises
  const totalNet = lines.reduce((acc, l) => {
    // (quantité × prix_unitaire) - (pourcentage%) - remise_flat
    const subtotal = (l.price * l.qty) - (l.price * l.qty * l.discount / 100) - l.remise_flat;
    return acc + subtotal;
  }, 0) - remiseGenerale;

  const handleSubmit = async () => {
    if (lines.length === 0) return alert("Le bon est vide !");
    
    // Vérifier si prix d'achat > prix de vente
    const linesWithLoss = lines.filter(l => l.prix_achat > l.price);
    if (linesWithLoss.length > 0) {
      const lossList = linesWithLoss.map(l => `${l.nom} (Achat: ${l.prix_achat} DA > Vente: ${l.price} DA)`).join(", ");
      if (!confirm(`⚠️ ALERTE PERTE DE MARGE:\n${lossList}\n\nVoulez-vous continuer?\nCliquez OK pour confirmer la vente à perte.`)) {
        return;
      }
    }
    
    setIsSubmitting(true);

    const payload = lines.map(l => ({
      product_id: l.product_id, 
      quantite: Number(l.qty), 
      prix_unitaire: Number(l.price), 
      remise: Number(l.discount),
      remise_flat: Number(l.remise_flat),
      total: Number(((l.price * l.qty) - (l.price * l.qty * l.discount / 100) - l.remise_flat).toFixed(2))
    }));

    const { data: userData } = await supabase.auth.getUser();
    const clientIdToSend = selectedClient && selectedClient !== "" ? selectedClient : null;
    const finalTotal = Math.max(0, totalNet);

    // Appel RPC pour créer la vente
    const { data: rpcResult, error } = await supabase.rpc('create_sale_transaction', {
      p_client_id: clientIdToSend, 
      p_user_id: userData.user?.id || null, 
      p_total: Number(finalTotal.toFixed(2)),
      p_items: payload
    });

    if (error) {
      console.error("Erreur RPC:", error);
      alert("Erreur lors de la vente : " + error.message);
      setIsSubmitting(false);
      return;
    }

    // Si remise_general existe, on met à jour la vente créée
    if (remiseGenerale > 0 && rpcResult) {
      const saleId = rpcResult.id || rpcResult;
      const { error: updateErr } = await supabase
        .from('sales')
        .update({ remise_flat: remiseGenerale })
        .eq('id', saleId);
      
      if (updateErr) {
        console.error("Erreur mise à jour remise générale:", updateErr);
        // Non bloquant - la vente est déjà créée
      }
    }

    setLines([]); 
    setSelectedClient(""); 
    setProdSearch("");
    setRemiseGenerale(0);
    showToast("✅ Vente validée avec succès!");
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-gray-200 dark:border-slate-600">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded text-blue-600 dark:text-blue-300"><Save size={24} /></div>
            Nouveau Bon de Livraison
          </h1>
          <div className="text-right"><div className="text-lg font-mono text-gray-900 dark:text-white">{new Date().toLocaleDateString('fr-FR')}</div></div>
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Client</label>
            <div className="flex gap-2">
              <select 
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-500 rounded text-gray-900 dark:text-white"
                value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}
              >
                <option value="">-- Client Comptoir --</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
              <button onClick={() => setIsClientModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded shadow"><Plus size={20} /></button>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Réf. Externe</label>
            <input type="text" className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-500 rounded text-gray-900 dark:text-white" />
          </div>
        </div>
      </div>

      {/* RECHERCHE COMPACTE */}
      <div className="relative z-20">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-3 rounded-lg shadow border-2 border-blue-500">
          <Search className="text-blue-500" size={20} />
          <input 
            ref={prodInputRef}
            type="text" 
            placeholder="Scanner code-barre ou taper nom..." 
            className="flex-1 p-2 bg-transparent text-base font-medium outline-none text-gray-900 dark:text-white placeholder-gray-400"
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
            className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-gray-600 dark:text-gray-300 transition"
            title="Créer un nouvel article"
          >
            <PackagePlus size={20} />
          </button>
        </div>

        {/* LISTE DÉROULANTE COMPACTE */}
        {showProdResults && prodSearch && (
          <div ref={resultsRef} className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 shadow-2xl rounded-lg mt-2 border border-gray-200 dark:border-slate-600 overflow-hidden z-30 max-h-[400px] overflow-y-auto">
            {filteredProds.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                  <tr className="border-b border-gray-200 dark:border-slate-700">
                    <th className="text-left p-2 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Article</th>
                    <th className="text-left p-2 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Réf</th>
                    <th className="text-center p-2 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Stock</th>
                    <th className="text-right p-2 font-semibold text-gray-600 dark:text-gray-400 text-xs uppercase">Prix</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProds.map((p, idx) => (
                    <tr 
                      key={p.id}
                      onMouseDown={(e) => { e.preventDefault(); addLine(p); }}
                      className={`cursor-pointer border-b border-gray-100 dark:border-slate-700 transition-colors
                        ${idx === highlightedIndex 
                          ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500" 
                          : "hover:bg-gray-50 dark:hover:bg-slate-700/50"}
                      `}
                    >
                      <td className="p-2 font-medium text-gray-900 dark:text-white">{p.nom}</td>
                      <td className="p-2 text-gray-500 dark:text-gray-400 font-mono text-xs">{p.code_barre || '-'}</td>
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          p.stock_actuel > 10 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                            : p.stock_actuel > 0
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {p.stock_actuel}
                        </span>
                      </td>
                      <td className="p-2 text-right font-bold text-blue-600 dark:text-blue-400">{p.prix_vente.toLocaleString()} DA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                <p className="mb-2">Aucun article trouvé pour "{prodSearch}"</p>
                <button 
                  onClick={() => setIsProductModalOpen(true)}
                  className="text-blue-600 hover:underline font-bold"
                >
                  + Créer un nouvel article
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TABLEAU */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-gray-200 dark:border-slate-600 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 dark:bg-slate-900 border-b border-gray-300 dark:border-slate-500 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="p-3 text-xs font-bold uppercase w-1/4">Article</th>
              <th className="p-3 text-xs font-bold uppercase text-center">Qté</th>
              <th className="p-3 text-xs font-bold uppercase text-right">Prix U.</th>
              <th className="p-3 text-xs font-bold uppercase text-center">Remise %</th>
              <th className="p-3 text-xs font-bold uppercase text-center">Remise DA</th>
              <th className="p-3 text-xs font-bold uppercase text-right">Total</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-900 dark:text-white">
            {lines.length === 0 ? (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400"><Package size={48} className="mx-auto mb-2 opacity-20" />Aucun article saisi</td></tr>
            ) : lines.map((line, i) => {
              const subtotal = (line.price * line.qty) - (line.price * line.qty * line.discount / 100) - line.remise_flat;
              return (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="p-3 font-medium">{line.nom}</td>
                  <td className="p-2 text-center"><input type="number" min="1" max={products.find(p => p.id === line.product_id)?.stock_actuel} className="w-16 p-1 text-center border rounded bg-transparent" value={line.qty} onChange={(e) => updateLine(i, 'qty', parseInt(e.target.value)||1)} /></td>
                  <td className="p-3 text-right">{line.price.toLocaleString()}</td>
                  <td className="p-2 text-center"><input type="number" min="0" max="100" className="w-14 p-1 text-center border rounded bg-transparent" value={line.discount} onChange={(e) => updateLine(i, 'discount', parseInt(e.target.value)||0)} /></td>
                  <td className="p-2 text-center"><input type="number" min="0" className="w-16 p-1 text-center border rounded bg-transparent" value={line.remise_flat} onChange={(e) => updateLine(i, 'remise_flat', parseInt(e.target.value)||0)} /></td>
                  <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">{subtotal.toLocaleString()}</td>
                  <td className="p-2 text-center"><button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500"><X size={18} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SECTION REMISES & TOTAL */}
      <div className="space-y-4">
        {/* Remise générale */}
        <div className="flex justify-end">
          <div className="w-80 bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-600">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Remise Générale (DA)</label>
            <input 
              type="number" 
              min="0" 
              value={remiseGenerale} 
              onChange={(e) => setRemiseGenerale(Number(e.target.value)||0)}
              className="w-full p-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-500 rounded text-gray-900 dark:text-white text-right font-bold"
              placeholder="0"
            />
          </div>
        </div>

        {/* Total final */}
        <div className="flex justify-end">
          <div className="w-80 bg-gray-50 dark:bg-slate-900 p-6 rounded-lg border border-gray-200 dark:border-slate-600">
            <div className="flex justify-between items-end mb-4">
              <span className="font-bold text-xl text-gray-900 dark:text-white">Net à Payer</span>
              <span className="font-black text-3xl text-blue-600">{Math.max(0, totalNet).toLocaleString()} <span className="text-sm">DA</span></span>
            </div>
            <button onClick={handleSubmit} disabled={isSubmitting || lines.length === 0} className={`w-full py-4 rounded-lg font-bold text-lg flex justify-center gap-2 shadow-lg text-white ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-500'}`}>
              {isSubmitting ? "Validation..." : <><Check /> VALIDER VENTE</>}
            </button>
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 z-50">
          <AlertCircle size={20} />
          <span className="font-medium">{toastMessage}</span>
        </div>
      )}

      <CreateClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSuccess={(c) => { setClients(prev => [c, ...prev]); setSelectedClient(c.id); }} />
      <CreateProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSuccess={handleProductCreated} />
    </div>
  );
}