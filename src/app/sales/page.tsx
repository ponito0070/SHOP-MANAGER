"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserClient } from '@supabase/ssr';
import { Search, Plus, Save, Package, Check, X, PackagePlus } from "lucide-react";
import CreateClientModal from '@/components/CreateClientModal';
import CreateProductModal from '@/components/CreateProductModal';

interface Product {
  id: string;
  code_barre: string;
  nom: string;
  prix_vente: number;
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

  // SEARCH LOGIC
  const [prodSearch, setProdSearch] = useState("");
  const [showProdResults, setShowProdResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0); 
  const prodInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      const { data: pData } = await supabase.from('products').select('id, code_barre, nom, prix_vente, stock_actuel');
      const { data: cData } = await supabase.from('clients').select('id, nom, solde').order('nom');
      if (pData) setProducts(pData);
      if (cData) setClients(cData);
    };
    loadData();
  }, []);

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
    setLines(prev => {
      const exists = prev.find(l => l.product_id === product.id);
      if (exists) {
        return prev.map(l => l.product_id === product.id ? { ...l, qty: l.qty + 1 } : l);
      }
      return [...prev, { 
        product_id: product.id, nom: product.nom, qty: 1, price: product.prix_vente, discount: 0 
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

  const totalNet = lines.reduce((acc, l) => acc + ((l.price * (1 - l.discount/100)) * l.qty), 0);

  const handleSubmit = async () => {
    if (lines.length === 0) return alert("Le bon est vide !");
    setIsSubmitting(true);

    const payload = lines.map(l => ({
      product_id: l.product_id, 
      quantite: Number(l.qty), 
      prix_unitaire: Number(l.price), 
      remise: Number(l.discount), 
      total: Number(((l.price * (1 - l.discount/100)) * l.qty).toFixed(2))
    }));

    const { data: userData } = await supabase.auth.getUser();
    const clientIdToSend = selectedClient && selectedClient !== "" ? selectedClient : null;

    const { error } = await supabase.rpc('create_sale_transaction', {
      p_client_id: clientIdToSend, 
      p_user_id: userData.user?.id || null, 
      p_total: Number(totalNet.toFixed(2)),
      p_items: payload
    });

    if (error) {
      console.error("Erreur RPC:", error);
      alert("Erreur lors de la vente : " + error.message);
    } else {
      setLines([]); setSelectedClient(""); setProdSearch("");
      alert("Vente validée avec succès !");
    }
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
              <th className="p-3 text-xs font-bold uppercase w-1/2">Article</th>
              <th className="p-3 text-xs font-bold uppercase text-center">Qté</th>
              <th className="p-3 text-xs font-bold uppercase text-right">Prix</th>
              <th className="p-3 text-xs font-bold uppercase text-center">Remise %</th>
              <th className="p-3 text-xs font-bold uppercase text-right">Total</th>
              <th className="p-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700 text-gray-900 dark:text-white">
            {lines.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400"><Package size={48} className="mx-auto mb-2 opacity-20" />Aucun article saisi</td></tr>
            ) : lines.map((line, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="p-3 font-medium">{line.nom}</td>
                <td className="p-2 text-center"><input type="number" min="1" className="w-16 p-1 text-center border rounded bg-transparent" value={line.qty} onChange={(e) => updateLine(i, 'qty', parseInt(e.target.value)||1)} /></td>
                <td className="p-3 text-right">{line.price.toLocaleString()}</td>
                <td className="p-2 text-center"><input type="number" min="0" max="100" className="w-14 p-1 text-center border rounded bg-transparent" value={line.discount} onChange={(e) => updateLine(i, 'discount', parseInt(e.target.value)||0)} /></td>
                <td className="p-3 text-right font-bold">{((line.price * (1 - line.discount/100)) * line.qty).toLocaleString()}</td>
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
            <span className="font-bold text-xl text-gray-900 dark:text-white">Net à Payer</span>
            <span className="font-black text-3xl text-blue-600">{totalNet.toLocaleString()} <span className="text-sm">DA</span></span>
          </div>
          <button onClick={handleSubmit} disabled={isSubmitting || lines.length === 0} className={`w-full py-4 rounded-lg font-bold text-lg flex justify-center gap-2 shadow-lg text-white ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-500'}`}>
            {isSubmitting ? "Validation..." : <><Check /> VALIDER VENTE</>}
          </button>
        </div>
      </div>

      <CreateClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onSuccess={(c) => { setClients(prev => [c, ...prev]); setSelectedClient(c.id); }} />
      <CreateProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSuccess={handleProductCreated} />
    </div>
  );
}