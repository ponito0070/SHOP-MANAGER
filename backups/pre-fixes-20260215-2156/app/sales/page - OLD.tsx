"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Search, Trash2, Plus, Minus, ShoppingCart, CheckCircle } from "lucide-react";

// Types
interface Product {
  id: string;
  nom: string;
  code_barre: string;
  prix_vente: number;
  stock_actuel: number;
}

interface CartItem extends Product {
  qty: number;
  discount: number; // Pourcentage
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [clientName, setClientName] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("nom");
    if (data) setProducts(data);
  };

  const addToCart = (product: Product) => {
    if (product.stock_actuel <= 0) return alert("Stock épuisé !");
    
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1, discount: 0 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: "qty" | "discount", value: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const newValue = value < 0 ? 0 : value;
        return { ...item, [field]: newValue };
      })
    );
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => {
      const price = item.prix_vente * (1 - item.discount / 100);
      return acc + price * item.qty;
    }, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);

    const total = calculateTotal();
    
    const itemsPayload = cart.map(item => ({
      product_id: item.id,
      quantite: item.qty,
      prix_unitaire: item.prix_vente,
      remise_pourcentage: item.discount,
      total_ligne: (item.prix_vente * (1 - item.discount / 100)) * item.qty
    }));

    const { error } = await supabase.rpc("complete_sale", {
      p_nom_client: clientName || "Client Comptoir",
      p_total_vente: total,
      p_items: itemsPayload
    });

    if (error) {
      alert("Erreur lors de la vente : " + error.message);
    } else {
      setSuccessMsg("Vente validée !");
      setCart([]);
      setClientName("");
      fetchProducts();
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(p => 
    p.nom.toLowerCase().includes(search.toLowerCase()) || 
    p.code_barre.includes(search)
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6 p-2">
      
      {/* COLONNE GAUCHE : CATALOGUE */}
      <div className="w-3/5 flex flex-col gap-4">
        {/* Barre de recherche */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md border-2 border-gray-300 dark:border-slate-500 flex items-center gap-3">
          <Search className="text-gray-500 dark:text-gray-300" />
          <input 
            type="text" 
            placeholder="Scanner ou chercher un article..." 
            className="w-full outline-none text-lg bg-transparent text-gray-900 dark:text-white placeholder-gray-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Grille Produits */}
        <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-3 content-start pb-4 pr-2">
          {filteredProducts.map((product) => (
            <div 
              key={product.id}
              onClick={() => addToCart(product)}
              className={`p-4 rounded-xl border-2 cursor-pointer shadow-sm hover:shadow-lg transition-all active:scale-95 select-none
                bg-white dark:bg-slate-800 
                ${product.stock_actuel <= 0 
                  ? "opacity-60 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20" 
                  : "border-gray-300 dark:border-slate-600 hover:border-blue-600 dark:hover:border-blue-400"}
              `}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <span className="font-bold text-gray-900 dark:text-gray-100 leading-tight line-clamp-2 text-sm">{product.nom}</span>
                <span className={`text-[10px] font-bold px-2 py-1 rounded flex-shrink-0 border
                  ${product.stock_actuel > 5 
                    ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-800' 
                    : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-800'}`}>
                  {product.stock_actuel}
                </span>
              </div>
              <div className="text-blue-700 dark:text-blue-300 font-black text-xl">{product.prix_vente} <span className="text-xs font-normal text-gray-500">DA</span></div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-mono truncate bg-gray-100 dark:bg-slate-700 inline-block px-1 rounded">{product.code_barre}</div>
            </div>
          ))}
        </div>
      </div>

      {/* COLONNE DROITE : PANIER (Modifié pour fort contraste) */}
      <div className="w-2/5 bg-gray-50 dark:bg-slate-900 rounded-xl shadow-2xl border-2 border-gray-400 dark:border-slate-500 flex flex-col overflow-hidden h-full">
        
        {/* Header Panier Coloré */}
        <div className="p-4 bg-slate-800 text-white border-b border-slate-600 shadow-md z-10">
          <h2 className="font-bold text-lg flex items-center gap-2 mb-3">
            <ShoppingCart size={20} className="text-blue-400" /> Bon de Livraison
          </h2>
          <input 
            type="text" 
            placeholder="Nom du client (Optionnel)" 
            className="w-full p-2.5 border border-slate-500 rounded-lg text-sm 
              bg-slate-700 text-white placeholder-slate-400
              focus:ring-2 focus:ring-blue-400 outline-none transition-colors"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
        </div>

        {/* Liste Articles */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-slate-900 relative">
          {cart.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-slate-600 pointer-events-none">
              <ShoppingCart size={80} className="mb-4 opacity-25" />
              <p className="font-bold text-lg opacity-50">PANIER VIDE</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex flex-col bg-white dark:bg-slate-800 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-slate-600">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-800 dark:text-gray-200 text-sm w-3/4">{item.nom}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 transition p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                    <Trash2 size={18} />
                  </button>
                </div>
                
                <div className="flex items-center justify-between gap-3">
                  {/* Selecteur Quantité */}
                  <div className="flex items-center bg-gray-100 dark:bg-slate-700 rounded border border-gray-300 dark:border-slate-500">
                    <button onClick={() => updateItem(item.id, 'qty', item.qty - 1)} className="p-1 px-3 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 font-bold border-r border-gray-300 dark:border-slate-500"><Minus size={14} /></button>
                    <span className="w-10 text-center font-bold text-gray-900 dark:text-white tabular-nums">{item.qty}</span>
                    <button onClick={() => updateItem(item.id, 'qty', item.qty + 1)} className="p-1 px-3 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 font-bold border-l border-gray-300 dark:border-slate-500"><Plus size={14} /></button>
                  </div>

                  {/* Input Remise */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-300 dark:border-slate-500">
                    <span className="text-[10px] uppercase text-gray-500 font-bold">Remise</span>
                    <input 
                      type="number" 
                      min="0" max="100" 
                      className="w-8 p-0 bg-transparent text-center text-sm font-bold text-blue-600 dark:text-blue-400 outline-none"
                      value={item.discount}
                      onChange={(e) => updateItem(item.id, 'discount', parseInt(e.target.value) || 0)}
                    />
                    <span className="text-[10px] text-gray-500">%</span>
                  </div>

                  <div className="font-black text-right flex-1 text-gray-900 dark:text-white text-lg tabular-nums">
                    {Math.round((item.prix_vente * (1 - item.discount / 100)) * item.qty).toLocaleString()} <span className="text-xs text-gray-400 font-normal">DA</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Totaux */}
        <div className="p-5 bg-blue-900 text-white border-t-2 border-blue-800 shadow-[0_-5px_20px_rgba(0,0,0,0.4)] z-20">
          <div className="flex justify-between items-end mb-4">
            <span className="text-blue-200 text-sm font-bold uppercase tracking-widest">Total à payer</span>
            <span className="text-4xl font-black tracking-tight">{calculateTotal().toLocaleString()} <span className="text-xl font-medium text-blue-300">DA</span></span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={loading || cart.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-xl flex items-center justify-center gap-3 transition-all transform active:scale-[0.98] shadow-lg
              ${loading 
                ? "bg-slate-700 cursor-not-allowed text-slate-400" 
                : "bg-green-500 hover:bg-green-400 text-white shadow-green-900/50"}
            `}
          >
            {loading ? "Traitement..." : (successMsg ? <><CheckCircle className="w-6 h-6" /> {successMsg}</> : "VALIDER")}
          </button>
        </div>
      </div>
    </div>
  );
}
