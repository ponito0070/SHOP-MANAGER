"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { Search, Trash2, Plus, Truck, Package, Check, X, PackagePlus } from "lucide-react";
import CreateSupplierModal from '@/components/CreateSupplierModal';
import CreateProductModal from '@/components/CreateProductModal';

interface Product {
  id: string;
  code_barre: string;
  nom: string;
  prix_achat: number;
  stock_actuel: number;
}

interface Supplier {
  id: string;
  nom: string;
}

interface PurchaseLine {
  product_id: string;
  nom: string;
  qty: number;
  price: number;
}

export default function NewPurchasePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // DONNÉES
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // UI & FORMULAIRE
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [lines, setLines] = useState<PurchaseLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // POPUPS
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  // RECHERCHE
  const [prodSearch, setProdSearch] = useState("");
  const [showProdResults, setShowProdResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const prodInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      // On charge TOUS les produits (limite par défaut de Supabase est souvent 1000, suffisant pour l'instant)
      const { data: pData } = await supabase.from('products').select('id, code_barre, nom, prix_achat, stock_actuel');
      const { data: sData } = await supabase.from('suppliers').select('id, nom').order('nom');
      
      if (pData) setProducts(pData);
      if (sData) setSuppliers(sData);
    };
    loadData();
  }, []);

  // FILTRAGE ROBUSTE
  const filteredProds = products.filter(p => {
    const search = prodSearch.toLowerCase().trim();
    if (!search) return true; // Si recherche vide, on retourne tout (limité par le slice)
    return (
      (p.nom && p.nom.toLowerCase().includes(search)) || 
      (p.code_barre && p.code_barre.toLowerCase().includes(search))
    );
  }).slice(0, 50); // Limite d'affichage pour performance

  // AJOUT LIGNE
  const addLine = (product: Product) => {
    setLines(prev => {
      const exists = prev.find(l => l.product_id === product.id);
      if (exists) {
        return prev.map(l => l.product_id === product.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, { product_id: product.id, nom: product.nom, qty: 1, price: product.prix_achat || 0 }];
    });
    // Reset après ajout
    setProdSearch("");
    setShowProdResults(false); 
    setHighlightedIndex(0);
    // On garde le focus pour enchainer
    prodInputRef.current?.focus();
  };

  // CALLBACK CREATION PRODUIT
  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]); 
    addLine(newProduct); 
  };

  // NAVIGATION CLAVIER
  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const updateLine = (index: number, field: keyof PurchaseLine, value: number) => {
    const newLines = [...lines];
    // @ts-ignore
    newLines[index][field] = value;
    setLines(newLines);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const totalHT = lines.reduce((acc, l) => acc + (l.qty * l.price), 0);

  const handleSubmit = async () => {
    if (lines.length === 0) return alert("Le bon est vide !");
    if (!selectedSupplier) return alert("Veuillez choisir un fournisseur !");
    setIsSubmitting(true);

    // PRÉPARATION STRICTE DES DONNÉES
    const payload = lines.map(l => ({ 
      product_id: l.product_id, 
      quantite: Number(l.qty), 
      prix_achat: Number(l.price), 
      total: Number((l.price * l.qty).toFixed(2)) 
    }));
    
    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.rpc('create_purchase_transaction', {
      p_supplier_id: selectedSupplier, 
      p_user_id: userData.user?.id || null, 
      p_total: Number(totalHT.toFixed(2)), 
      p_items: payload
    });

    if (error) {
      console.error("Erreur RPC:", error);
      alert("Erreur validation réception: " + error.message);
    } else {
      setLines([]); setSelectedSupplier(""); setProdSearch("");
      alert("Réception validée ! Stock mis à jour.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-gray-200 dark:border-slate-600">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded text-blue-600 dark:text-blue-300"><Truck size={24} /></div>
            Nouvelle Réception
          </h1>
          <div className="text-right"><div className="text-lg font-mono text-gray-900 dark:text-white">{new Date().toLocaleDateString('fr-FR')}</div></div>
        </div>

        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Fournisseur</label>
            <div className="flex gap-2">
              <select 
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-500 rounded text-gray-900 dark:text-white"
                value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">-- Sélectionner --</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>
              <button onClick={() => setIsSupplierModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded shadow"><Plus size={20} /></button>
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Ref. Bon</label>
            <input type="text" className="w-full p-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-500 rounded text-gray-900 dark:text-white" />
          </div>
        </div>
      </div>

      {/* RECHERCHE AVEC LISTE CORRECTE */}
      <div className="relative z-20">
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg shadow border-2 border-blue-500">
          <Search className="text-blue-500 ml-2" />
          <input 
            ref={prodInputRef}
            type="text" 
            placeholder="Code-barre ou nom article..." 
            className="w-full p-2 bg-transparent text-lg font-medium outline-none text-gray-900 dark:text-white"
            value={prodSearch}
            onChange={(e) => { 
                setProdSearch(e.target.value); 
                setShowProdResults(true); 
                setHighlightedIndex(0); 
            }}
            onFocus={() => setShowProdResults(true)} // AFFICHE LISTE AU CLIC
            onKeyDown={handleKeyDown}
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

        {/* LISTE DÉFILANTE QUI S'AFFICHE SI showProdResults EST VRAI */}
        {showProdResults && (
          <div ref={resultsRef} className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 shadow-xl rounded-lg mt-1 border border-gray-200 dark:border-slate-600 overflow-y-auto max-h-80 z-30">
            {filteredProds.length > 0 ? (
              filteredProds.map((p, idx) => (
                <div 
                  key={p.id}
                  onMouseDown={(e) => { e.preventDefault(); addLine(p); }} // CLIC ROBUSTE
                  className={`p-3 border-b border-gray-100 dark:border-slate-700 cursor-pointer flex justify-between items-center transition-colors
                    ${idx === highlightedIndex ? "bg-blue-100 dark:bg-blue-900/50 border-l-4 border-l-blue-500" : "hover:bg-gray-50 dark:hover:bg-slate-700"}
                  `}
                >
                  <div>
                    <div className="font-bold text-gray-800 dark:text-white">{p.nom}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">Ref: {p.code_barre || 'N/A'} • Stock: {p.stock_actuel}</div>
                  </div>
                  <div className="font-bold text-blue-600">{p.prix_achat} DA</div>
                </div>
              ))
            ) : (
              // Affichage "Aucun résultat" avec bouton création
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 italic">
                <p className="mb-2">{prodSearch ? `Pas de résultat pour "${prodSearch}"` : "Liste des articles"}</p>
                <button 
                    onClick={() => setIsProductModalOpen(true)}
                    className="text-blue-600 hover:underline text-sm font-bold"
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
              <th className="p-3 text-xs font-bold uppercase w-1/2">Article</th>
              <th className="p-3 text-xs font-bold uppercase text-center">Qté Reçue</th>
              <th className="p-3 text-xs font-bold uppercase text-right">Prix Achat</th>
              <th className="p-3 text-xs font-bold uppercase text-right">Total</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-900 dark:text-white">
            {lines.length === 0 ? (
              <tr><td colSpan={5} className="p-10 text-center text-gray-400"><Package size={48} className="mx-auto mb-2 opacity-20" />Aucun article</td></tr>
            ) : lines.map((line, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="p-3 font-medium">{line.nom}</td>
                <td className="p-2 text-center"><input type="number" min="1" className="w-16 p-1 text-center border rounded bg-transparent" value={line.qty} onChange={(e) => updateLine(i, 'qty', parseInt(e.target.value)||1)} /></td>
                <td className="p-3 text-right"><input type="number" className="w-24 p-1 text-right border rounded bg-transparent" value={line.price} onChange={(e) => updateLine(i, 'price', parseFloat(e.target.value)||0)} /></td>
                <td className="p-3 text-right font-bold">{(line.price * line.qty).toLocaleString()}</td>
                <td className="p-2 text-center"><button onClick={() => removeLine(i)} className="text-gray-400 hover:text-red-500"><X size={18} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER */}
      <div className="flex justify-end">
        <div className="w-1/3 bg-gray-50 dark:bg-slate-900 p-6 rounded-lg border border-gray-200 dark:border-slate-600">
          <div className="flex justify-between items-end mb-4">
            <span className="font-bold text-xl text-gray-900 dark:text-white">Total Achat</span>
            <span className="font-black text-3xl text-blue-600">{totalHT.toLocaleString()} <span className="text-sm">DA</span></span>
          </div>
          <button onClick={handleSubmit} disabled={isSubmitting || lines.length === 0} className={`w-full py-4 rounded-lg font-bold text-lg flex justify-center gap-2 shadow-lg text-white ${isSubmitting ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'}`}>
            {isSubmitting ? "..." : <><Check /> VALIDER RÉCEPTION</>}
          </button>
        </div>
      </div>

      {/* POPUPS */}
      <CreateSupplierModal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} onSuccess={(s) => { setSuppliers(prev => [s, ...prev]); setSelectedSupplier(s.id); }} />
      <CreateProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSuccess={handleProductCreated} />
    </div>
  );
}
