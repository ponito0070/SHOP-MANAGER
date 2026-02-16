import React, { useEffect, useState, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { X, Save, Package, Search, Trash2, Printer, Ban } from 'lucide-react';
import { generateBRPDF } from '@/lib/pdfGenerator';
import VoidConfirm from './VoidConfirm';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  nom: string;
  code_barre: string;
  prix_vente: number;
  prix_achat: number;
  stock_actuel: number;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onPrint?: () => void;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
}: OrderDetailsModalProps) {
  const [items, setItems] = useState<any[]>([]);
  const [originalItems, setOriginalItems] = useState<any[]>([]);
  const [remiseFlat, setRemiseFlat] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [orderType, setOrderType] = useState<'purchase' | 'sale'>('purchase');
  const [isVoid, setIsVoid] = useState(false);
  const [showVoidConfirm, setShowVoidConfirm] = useState(false);
  
  // Recherche produits
  const [products, setProducts] = useState<Product[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [showProdResults, setShowProdResults] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen || !orderId) return;
    fetchItems();
    fetchProducts();
  }, [isOpen, orderId]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, nom, code_barre, prix_vente, prix_achat, stock_actuel')
      .order('nom');
    if (data) setProducts(data);
  };

  const fetchItems = async () => {
    if (!orderId) return;
    setLoading(true);

    // Vérifier si c'est un achat ou une vente
    const { data: purchaseCheck } = await supabase
      .from('purchases')
      .select('id, is_void')
      .eq('id', orderId)
      .single();

    const type = purchaseCheck ? 'purchase' : 'sale';
    setOrderType(type);
    setIsVoid(purchaseCheck?.is_void || false);

    if (type === 'purchase') {
      const { data, error } = await supabase
        .from('purchase_items')
        .select('*, products(nom, code_barre)')
        .eq('purchase_id', orderId);
      if (error) console.error(error);
      else {
        setItems(data || []);
        setOriginalItems(JSON.parse(JSON.stringify(data || [])));
      }
      const { data: parent } = await supabase
        .from('purchases')
        .select('remise_flat, is_void')
        .eq('id', orderId)
        .single();
      setRemiseFlat(parent?.remise_flat || 0);
      setIsVoid(parent?.is_void || false);
    } else {
      const { data, error } = await supabase
        .from('sale_items')
        .select('*, products(nom, code_barre)')
        .eq('sale_id', orderId);
      if (error) console.error(error);
      else {
        setItems(data || []);
        setOriginalItems(JSON.parse(JSON.stringify(data || [])));
      }
      const { data: parent } = await supabase
        .from('sales')
        .select('remise_flat, is_void')
        .eq('id', orderId)
        .single();
      setRemiseFlat(parent?.remise_flat || 0);
      setIsVoid(parent?.is_void || false);
    }
    setLoading(false);
  };

  const handlePrint = async () => {
    if (!orderId) return;
    if (orderType === 'purchase') {
      await generateBRPDF(orderId, supabase, 'print');
    } else {
      // Pour les ventes, utiliser generateBLPDF (à importer)
      // await generateBLPDF(orderId, supabase, 'print');
      console.log('Impression vente pas encore implémentée');
    }
  };

  const handleVoid = async () => {
    if (!orderId) return;

    const table = orderType === 'purchase' ? 'purchases' : 'sales';
    
    // Mettre à jour is_void = true
    const { error } = await supabase
      .from(table)
      .update({ is_void: true })
      .eq('id', orderId);

    if (error) {
      console.error("Erreur lors de l'annulation:", error);
      alert("Erreur lors de l'annulation");
    } else {
      setIsVoid(true);
      setShowVoidConfirm(false);
      // Recharger pour voir l'état barré
      fetchItems();
    }
  };

  const filteredProds = products.filter(p => {
    const search = prodSearch.toLowerCase();
    if (!search) return false;
    const alreadyInOrder = items.some(it => it.product_id === p.id);
    if (alreadyInOrder) return false;
    return (
      (p.nom && p.nom.toLowerCase().includes(search)) ||
      (p.code_barre && p.code_barre.toLowerCase().includes(search))
    );
  }).slice(0, 20);

  const handleAddProduct = (product: Product) => {
    const newItem = {
      id: `new_${Date.now()}`,
      product_id: product.id,
      products: { nom: product.nom, code_barre: product.code_barre },
      quantite: 1,
      [orderType === 'purchase' ? 'prix_achat_unitaire' : 'prix_unitaire_vente']: 
        orderType === 'purchase' ? product.prix_achat : product.prix_vente,
      remise_pourcentage: 0,
      remise_flat: 0,
      isNew: true
    };
    setItems(prev => [...prev, newItem]);
    setProdSearch('');
    setShowProdResults(false);
    setHighlightedIndex(0);
    searchRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showProdResults || filteredProds.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredProds.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProds[highlightedIndex]) {
        handleAddProduct(filteredProds[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowProdResults(false);
    }
  };

  const handleRemoveItem = (index: number) => {
    if (!confirm('Supprimer cet article ?')) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    if (!orderId || isVoid) return; // Ne pas modifier si annulé

    for (const it of items) {
      if (it.isNew) {
        const table = orderType === 'purchase' ? 'purchase_items' : 'sale_items';
        const insertBody: any = {
          [orderType === 'purchase' ? 'purchase_id' : 'sale_id']: orderId,
          product_id: it.product_id,
          quantite: it.quantite
        };

        if (orderType === 'purchase') {
          insertBody.prix_achat_unitaire = it.prix_achat_unitaire;
          insertBody.remise_pourcentage = it.remise_pourcentage || 0;
          insertBody.remise_flat = it.remise_flat || 0;
          insertBody.total_ligne =
            it.quantite * (it.prix_achat_unitaire || 0) -
            (it.quantite * (it.prix_achat_unitaire || 0) * (it.remise_pourcentage || 0)) / 100 -
            (it.remise_flat || 0);
        } else {
          insertBody.prix_unitaire_vente = it.prix_unitaire_vente;
          insertBody.remise_pourcentage = it.remise_pourcentage || 0;
          insertBody.remise_flat = it.remise_flat || 0;
          insertBody.total_ligne =
            it.quantite * (it.prix_unitaire_vente || 0) -
            (it.quantite * (it.prix_unitaire_vente || 0) * (it.remise_pourcentage || 0)) / 100 -
            (it.remise_flat || 0);
        }

        const { error } = await supabase.from(table).insert([insertBody]);
        if (error) {
          console.error('Erreur insertion item:', error);
          continue;
        }

        const movementQty = orderType === 'purchase' ? it.quantite : -it.quantite;
        const { data: prod } = await supabase
          .from('products')
          .select('stock_actuel, prix_achat_moyen')
          .eq('id', it.product_id)
          .single();

        if (prod) {
          const newStock = (prod.stock_actuel || 0) + movementQty;
          await supabase.from('products').update({ stock_actuel: newStock }).eq('id', it.product_id);

          await supabase.from('stock_movements').insert([{
            product_id: it.product_id,
            type_mouvement: orderType === 'purchase' ? 'ACHAT_ADJUST' : 'VENTE_ADJUST',
            quantite: movementQty,
            reference_id: orderId,
            ancien_stock: prod.stock_actuel || 0,
            nouveau_stock: newStock
          }]);

          if (orderType === 'purchase') {
            const currentPump = prod.prix_achat_moyen || 0;
            const currentStock = prod.stock_actuel || 0;
            const unitCost = it.prix_achat_unitaire || 0;
            const denom = currentStock + it.quantite;
            const newPump = denom === 0 ? unitCost : (currentStock * currentPump + it.quantite * unitCost) / denom;
            await supabase.from('products').update({ prix_achat_moyen: newPump, prix_achat: unitCost }).eq('id', it.product_id);
          }
        }
        continue;
      }

      const table = orderType === 'purchase' ? 'purchase_items' : 'sale_items';
      const updateBody: any = {};

      if (orderType === 'purchase') {
        updateBody.quantite = it.quantite;
        updateBody.prix_achat_unitaire = it.prix_achat_unitaire;
        updateBody.remise_pourcentage = it.remise_pourcentage || 0;
        updateBody.remise_flat = it.remise_flat || 0;
        updateBody.total_ligne =
          it.quantite * (it.prix_achat_unitaire || 0) -
          (it.quantite * (it.prix_achat_unitaire || 0) * (it.remise_pourcentage || 0)) / 100 -
          (it.remise_flat || 0);
      } else {
        updateBody.quantite = it.quantite;
        updateBody.prix_unitaire_vente = it.prix_unitaire_vente;
        updateBody.remise_pourcentage = it.remise_pourcentage || 0;
        updateBody.remise_flat = it.remise_flat || 0;
        updateBody.total_ligne =
          it.quantite * (it.prix_unitaire_vente || 0) -
          (it.quantite * (it.prix_unitaire_vente || 0) * (it.remise_pourcentage || 0)) / 100 -
          (it.remise_flat || 0);
      }

      const { error } = await supabase.from(table).update(updateBody).eq('id', it.id);
      if (error) console.error('Erreur update item', error);

      const orig = originalItems.find((o) => o.id === it.id);
      const origQty = orig ? orig.quantite || 0 : 0;
      const qtyDiff = (it.quantite || 0) - origQty;

      if (qtyDiff !== 0) {
        const { data: prod, error: prodErr } = await supabase
          .from('products')
          .select('stock_actuel, prix_achat_moyen')
          .eq('id', it.product_id)
          .single();

        if (prodErr) {
          console.error('Erreur lecture produit:', prodErr);
        } else {
          const currentStock = prod?.stock_actuel || 0;
          const currentPump = prod?.prix_achat_moyen || 0;
          const movementQty = orderType === 'purchase' ? qtyDiff : -qtyDiff;
          const newStock = currentStock + movementQty;

          const mvType =
            orderType === 'purchase'
              ? qtyDiff > 0
                ? 'ACHAT_ADJUST'
                : 'ACHAT_ADJUST'
              : qtyDiff > 0
              ? 'VENTE_ADJUST'
              : 'VENTE_ADJUST';

          await supabase.from('stock_movements').insert([
            {
              product_id: it.product_id,
              type_mouvement: mvType,
              quantite: movementQty,
              reference_id: orderId,
              ancien_stock: currentStock,
              nouveau_stock: newStock
            }
          ]);

          await supabase.from('products').update({ stock_actuel: newStock }).eq('id', it.product_id);

          if (orderType === 'purchase' && qtyDiff > 0) {
            const addedQty = qtyDiff;
            const unitCost = it.prix_achat_unitaire || 0;
            const denom = currentStock + addedQty;
            const newPump =
              denom === 0 ? unitCost : (currentStock * currentPump + addedQty * unitCost) / denom;
            await supabase
              .from('products')
              .update({ prix_achat_moyen: newPump, prix_achat: unitCost })
              .eq('id', it.product_id);
          }
        }
      }
    }

    const sumLines = items.reduce((s, r) => {
      const qty = r.quantite || 0;
      const pu = orderType === 'purchase' ? r.prix_achat_unitaire : r.prix_unitaire_vente || 0;
      const remisePercent = r.remise_pourcentage || 0;
      const remiseFlatItem = r.remise_flat || 0;
      return s + (qty * pu - (qty * pu * remisePercent) / 100 - remiseFlatItem);
    }, 0);

    const totalAfterRemise = sumLines - (remiseFlat || 0);

    if (orderType === 'purchase') {
      await supabase
        .from('purchases')
        .update({ total_achat: totalAfterRemise, remise_flat: remiseFlat })
        .eq('id', orderId);
    } else {
      await supabase
        .from('sales')
        .update({ total_vente: totalAfterRemise, remise_flat: remiseFlat })
        .eq('id', orderId);
    }

    onClose();
  };

  const calculateTotal = () => {
    const sumLines = items.reduce((s, r) => {
      const qty = r.quantite || 0;
      const pu = orderType === 'purchase' ? r.prix_achat_unitaire : r.prix_unitaire_vente || 0;
      const remisePercent = r.remise_pourcentage || 0;
      const remiseFlatItem = r.remise_flat || 0;
      return s + (qty * pu - (qty * pu * remisePercent) / 100 - remiseFlatItem);
    }, 0);
    return sumLines - (remiseFlat || 0);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-slate-700">
          
          {/* HEADER */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-2.5 rounded-lg">
                <Package className="text-blue-600 dark:text-blue-300" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {isVoid ? 'BON ANNULÉ' : 'Modification rapide'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {orderType === 'sale' ? 'Bon de livraison' : 'Bon de réception'}
                  {isVoid && <span className="ml-2 text-red-500 font-bold">(Annulé)</span>}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* ACTIONS RAPIDES */}
          <div className="px-4 md:px-6 py-3 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 flex flex-wrap gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm transition-colors min-h-[44px]"
            >
              <Printer size={16} />
              Imprimer
            </button>
            {!isVoid && (
              <button
                onClick={() => setShowVoidConfirm(true)}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm transition-colors min-h-[44px]"
              >
                <Ban size={16} />
                Annuler le bon
              </button>
            )}
          </div>

          {/* BARRE RECHERCHE + REMISE - Désactivée si annulé */}
          <div className={`px-4 md:px-6 py-4 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700 space-y-3 ${isVoid ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Recherche produit */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Ajouter un article au bon..."
                value={prodSearch}
                onChange={(e) => {
                  setProdSearch(e.target.value);
                  setShowProdResults(e.target.value.length > 0);
                  setHighlightedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (prodSearch) setShowProdResults(true); }}
                disabled={isVoid}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 min-h-[48px] text-base disabled:opacity-50 disabled:cursor-not-allowed"
              />
              
              {/* DROPDOWN RÉSULTATS */}
              {showProdResults && filteredProds.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10">
                  {filteredProds.map((p, idx) => (
                    <button
                      key={p.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleAddProduct(p);
                      }}
                      className={`w-full px-4 py-3 flex items-center justify-between transition-colors border-b border-gray-100 dark:border-slate-800 last:border-0 text-left ${
                        idx === highlightedIndex
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{p.nom}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <span>{p.code_barre || 'N/A'}</span>
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
                        <div className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                          {(orderType === 'purchase' ? p.prix_achat : p.prix_vente).toFixed(2)} DA
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Remise flat */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Remise forfaitaire (DA)
              </label>
              <input
                type="number"
                value={remiseFlat}
                onChange={(e) => setRemiseFlat(parseFloat(e.target.value) || 0)}
                disabled={isVoid}
                className="w-full sm:w-40 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[44px] disabled:opacity-50"
              />
              <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                Total: <span className="font-bold text-blue-600 dark:text-blue-400">{calculateTotal().toFixed(2)} DA</span>
              </div>
            </div>
          </div>

          {/* CONTENT - Style barré si annulé */}
          <div className={`flex-1 overflow-auto p-4 md:p-6 ${isVoid ? 'opacity-60' : ''}`}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-4">Chargement...</p>
              </div>
            ) : (
              <>
                {/* MOBILE: Cards */}
                <div className="lg:hidden space-y-3">
                  {items.map((it, i) => {
                    const qty = it.quantite || 0;
                    const pu = orderType === 'purchase' ? it.prix_achat_unitaire : it.prix_unitaire_vente || 0;
                    const remisePercent = it.remise_pourcentage || 0;
                    const remiseFlatItem = it.remise_flat || 0;
                    const subtotal = qty * pu - (qty * pu * remisePercent) / 100 - remiseFlatItem;

                    return (
                      <div
                        key={it.id}
                        className={`rounded-lg p-4 border ${
                          it.isNew 
                            ? 'bg-green-50 dark:bg-green-900/10 border-green-500' 
                            : 'bg-gray-50 dark:bg-slate-900/50 border-gray-200 dark:border-slate-700'
                        } ${isVoid ? 'line-through' : ''}`}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {it.products?.nom || it.product_id}
                              {it.products?.code_barre && (
                                <span className="ml-2 text-xs text-gray-500">({it.products.code_barre})</span>
                              )}
                            </div>
                            {it.isNew && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                Nouvel article
                              </span>
                            )}
                          </div>
                          {!isVoid && (
                            <button
                              onClick={() => handleRemoveItem(i)}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Quantité</label>
                            <input
                              type="number"
                              value={qty}
                              onChange={(e) => handleItemChange(i, 'quantite', parseInt(e.target.value) || 0)}
                              disabled={isVoid}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-h-[44px] disabled:opacity-50"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Prix unitaire</label>
                            <input
                              type="number"
                              value={pu}
                              onChange={(e) =>
                                handleItemChange(
                                  i,
                                  orderType === 'purchase' ? 'prix_achat_unitaire' : 'prix_unitaire_vente',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              disabled={isVoid}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-h-[44px] disabled:opacity-50"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Remise %</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={remisePercent}
                                onChange={(e) =>
                                  handleItemChange(i, 'remise_pourcentage', parseFloat(e.target.value) || 0)
                                }
                                disabled={isVoid}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-h-[44px] disabled:opacity-50"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Remise DA</label>
                              <input
                                type="number"
                                min="0"
                                value={remiseFlatItem}
                                onChange={(e) => handleItemChange(i, 'remise_flat', parseFloat(e.target.value) || 0)}
                                disabled={isVoid}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white min-h-[44px] disabled:opacity-50"
                              />
                            </div>
                          </div>

                          <div className="pt-3 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Total ligne:</span>
                            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {subtotal.toFixed(2)} DA
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP: Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-slate-900/50 border-b-2 border-gray-200 dark:border-slate-700">
                        <th className="p-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                          Produit
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                          Quantité
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                          Prix Unit.
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                          Remise %
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                          Remise DA
                        </th>
                        <th className="p-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                          Total
                        </th>
                        {!isVoid && (
                          <th className="p-3 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                            <Trash2 size={16} />
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                      {items.map((it, i) => {
                        const qty = it.quantite || 0;
                        const pu = orderType === 'purchase' ? it.prix_achat_unitaire : it.prix_unitaire_vente || 0;
                        const remisePercent = it.remise_pourcentage || 0;
                        const remiseFlatItem = it.remise_flat || 0;
                        const subtotal = qty * pu - (qty * pu * remisePercent) / 100 - remiseFlatItem;

                        return (
                          <tr 
                            key={it.id} 
                            className={`transition-colors ${
                              it.isNew 
                                ? 'bg-green-50 dark:bg-green-900/10' 
                                : 'hover:bg-gray-50 dark:hover:bg-slate-700/30'
                            } ${isVoid ? 'line-through' : ''}`}
                          >
                            <td className="p-3 text-gray-900 dark:text-white font-medium">
                              {it.products?.nom || it.product_id}
                              {it.products?.code_barre && (
                                <span className="ml-2 text-xs text-gray-500">({it.products.code_barre})</span>
                              )}
                              {it.isNew && (
                                <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                                  Nouveau
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                value={qty}
                                onChange={(e) => handleItemChange(i, 'quantite', parseInt(e.target.value) || 0)}
                                disabled={isVoid}
                                className="w-24 px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-right disabled:opacity-50"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                value={pu}
                                onChange={(e) =>
                                  handleItemChange(
                                    i,
                                    orderType === 'purchase' ? 'prix_achat_unitaire' : 'prix_unitaire_vente',
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                disabled={isVoid}
                                className="w-28 px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-right disabled:opacity-50"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={remisePercent}
                                onChange={(e) =>
                                  handleItemChange(i, 'remise_pourcentage', parseFloat(e.target.value) || 0)
                                }
                                disabled={isVoid}
                                className="w-20 px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-right disabled:opacity-50"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={remiseFlatItem}
                                onChange={(e) => handleItemChange(i, 'remise_flat', parseFloat(e.target.value) || 0)}
                                disabled={isVoid}
                                                                className="w-24 px-2 py-1.5 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-right disabled:opacity-50"
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-blue-600 dark:text-blue-400">
                              {subtotal.toFixed(2)} DA
                            </td>
                            {!isVoid && (
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => handleRemoveItem(i)}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* FOOTER - Désactivé si annulé */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 md:p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors font-medium min-h-[48px]"
            >
              Fermer
            </button>
            {!isVoid && (
              <button
                onClick={handleSave}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center justify-center gap-2 transition-colors min-h-[48px]"
              >
                <Save size={18} />
                Enregistrer les modifications
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MODALE DE CONFIRMATION ANNULATION */}
      <VoidConfirm
        open={showVoidConfirm}
        onClose={() => setShowVoidConfirm(false)}
        onConfirm={handleVoid}
        message="Êtes-vous sûr de vouloir annuler ce bon ? Le stock sera ajusté automatiquement."
        confirmLabel="Oui, annuler le bon"
      />
    </>
  );
}