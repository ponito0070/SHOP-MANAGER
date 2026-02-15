import React, { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function OrderDetailsModal({ open, onClose, id, type }: { open: boolean, onClose: () => void, id: string | null, type: 'purchase' | 'sale' }) {
  const [items, setItems] = useState<any[]>([])
  const [originalItems, setOriginalItems] = useState<any[]>([])
  const [remiseFlat, setRemiseFlat] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !id) return
    fetchItems()
  }, [open, id])

  const fetchItems = async () => {
    setLoading(true)
    if (type === 'purchase') {
      const { data, error } = await supabase.from('purchase_items').select('*, products(nom)').eq('purchase_id', id)
      if (error) console.error(error)
      else {
        setItems(data || [])
        setOriginalItems(JSON.parse(JSON.stringify(data || [])))
      }
      // fetch parent remise_flat
      const { data: parent } = await supabase.from('purchases').select('remise_flat').eq('id', id).single()
      setRemiseFlat(parent?.remise_flat || 0)
    } else {
      const { data, error } = await supabase.from('sale_items').select('*, products(nom)').eq('sale_id', id)
      if (error) console.error(error)
      else {
        setItems(data || [])
        setOriginalItems(JSON.parse(JSON.stringify(data || [])))
      }
      const { data: parent } = await supabase.from('sales').select('remise_flat').eq('id', id).single()
      setRemiseFlat(parent?.remise_flat || 0)
    }
    setLoading(false)
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleSave = async () => {
    if (!id) return
    // update items one by one (and handle stock movements & PUMP adjustments)
    for (const it of items) {
      const table = type === 'purchase' ? 'purchase_items' : 'sale_items'
      const updateBody: any = {}
      if (type === 'purchase') {
        updateBody.quantite = it.quantite
        updateBody.prix_achat_unitaire = it.prix_achat_unitaire
        updateBody.remise_pourcentage = it.remise_pourcentage || 0
        updateBody.remise_flat = it.remise_flat || 0
        updateBody.total_ligne = (it.quantite * (it.prix_achat_unitaire || 0)) - ((it.quantite * (it.prix_achat_unitaire || 0) * (it.remise_pourcentage || 0) / 100)) - (it.remise_flat || 0)
      } else {
        updateBody.quantite = it.quantite
        updateBody.prix_unitaire_vente = it.prix_unitaire_vente
        updateBody.remise_pourcentage = it.remise_pourcentage || 0
        updateBody.remise_flat = it.remise_flat || 0
        updateBody.total_ligne = (it.quantite * (it.prix_unitaire_vente || 0)) - ((it.quantite * (it.prix_unitaire_vente || 0) * (it.remise_pourcentage || 0) / 100)) - (it.remise_flat || 0)
      }
      const { error } = await supabase.from(table).update(updateBody).eq('id', it.id)
      if (error) console.error('Erreur update item', error)

      // find original
      const orig = originalItems.find(o => o.id === it.id)
      const origQty = orig ? (orig.quantite || 0) : 0
      const qtyDiff = (it.quantite || 0) - origQty
      if (qtyDiff !== 0) {
        // adjust stock and possibly PUMP
        const { data: prod, error: prodErr } = await supabase.from('products').select('stock_actuel, prix_achat_moyen').eq('id', it.product_id).single()
        if (prodErr) {
          console.error('Erreur lecture produit:', prodErr)
        } else {
          const currentStock = prod?.stock_actuel || 0
          const currentPump = prod?.prix_achat_moyen || 0
          // movement quantity: for purchases, qtyDiff increases stock; for sales, stock decreases by qtyDiff
          const movementQty = type === 'purchase' ? qtyDiff : -qtyDiff
          const newStock = currentStock + movementQty
          // insert movement
          const mvType = type === 'purchase' ? (qtyDiff > 0 ? 'ACHAT_ADJUST' : 'ACHAT_ADJUST') : (qtyDiff > 0 ? 'VENTE_ADJUST' : 'VENTE_ADJUST')
          const { error: mvErr } = await supabase.from('stock_movements').insert([{ product_id: it.product_id, type_mouvement: mvType, quantite: movementQty, reference_id: id, ancien_stock: currentStock, nouveau_stock: newStock }])
          if (mvErr) console.error('Erreur insertion mouvement:', mvErr)
          // update product stock
          const { error: updProdErr } = await supabase.from('products').update({ stock_actuel: newStock }).eq('id', it.product_id)
          if (updProdErr) console.error('Erreur update produit stock:', updProdErr)

          // update PUMP for purchases when qty added
          if (type === 'purchase' && qtyDiff > 0) {
            const addedQty = qtyDiff
            const unitCost = it.prix_achat_unitaire || 0
            const denom = (currentStock + addedQty)
            const newPump = denom === 0 ? unitCost : ((currentStock * currentPump) + (addedQty * unitCost)) / denom
            const { error: pumpErr } = await supabase.from('products').update({ prix_achat_moyen: newPump, prix_achat: unitCost }).eq('id', it.product_id)
            if (pumpErr) console.error('Erreur mise à jour PUMP:', pumpErr)
          }
        }
      }
    }
    // Recompute parent total with remises
    const sumLines = items.reduce((s, r) => {
      const qty = r.quantite || 0;
      const pu = type === 'purchase' ? r.prix_achat_unitaire : r.prix_unitaire_vente || 0;
      const remisePercent = r.remise_pourcentage || 0;
      const remiseFlat = r.remise_flat || 0;
      return s + ((qty * pu) - (qty * pu * remisePercent / 100) - remiseFlat);
    }, 0);
    const totalAfterRemise = (sumLines || 0) - (remiseFlat || 0)
    if (type === 'purchase') {
      await supabase.from('purchases').update({ total_achat: totalAfterRemise, remise_flat: remiseFlat }).eq('id', id)
    } else {
      await supabase.from('sales').update({ total_vente: totalAfterRemise, remise_flat: remiseFlat }).eq('id', id)
    }
    onClose()
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-lg w-full max-w-3xl max-h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Détails de la commande</h3>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-2 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200">Fermer</button>
            <button onClick={handleSave} className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white dark:disabled:opacity-60">Enregistrer</button>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300">Remise forfaitaire (DA)</label>
            <input type="number" value={remiseFlat} onChange={e=>setRemiseFlat(parseFloat(e.target.value)||0)} className="ml-2 w-32 px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-700">
                <th className="p-2 text-xs font-bold uppercase text-gray-600">Produit</th>
                <th className="p-2 text-xs font-bold uppercase text-gray-600 text-right">Quantité</th>
                <th className="p-2 text-xs font-bold uppercase text-gray-600 text-right">PU</th>
                <th className="p-2 text-xs font-bold uppercase text-gray-600 text-right">Remise %</th>
                <th className="p-2 text-xs font-bold uppercase text-gray-600 text-right">Remise DA</th>
                <th className="p-2 text-xs font-bold uppercase text-gray-600 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const qty = it.quantite || 0;
                const pu = type === 'purchase' ? it.prix_achat_unitaire : it.prix_unitaire_vente || 0;
                const remisePercent = it.remise_pourcentage || 0;
                const remiseFlat = it.remise_flat || 0;
                const subtotal = (qty * pu) - (qty * pu * remisePercent / 100) - remiseFlat;
                return (
                  <tr key={it.id} className="border-b">
                    <td className="p-2 text-gray-900 dark:text-white">{it.products?.nom || it.product_id}</td>
                    <td className="p-2 text-right">
                      <input type="number" value={qty} onChange={e=>handleItemChange(i,'quantite', parseInt(e.target.value)||0)} className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-right" />
                    </td>
                    <td className="p-2 text-right">
                      <input type="number" value={pu} onChange={e=>handleItemChange(i, type==='purchase' ? 'prix_achat_unitaire' : 'prix_unitaire_vente', parseFloat(e.target.value)||0)} className="w-28 px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-right" />
                    </td>
                    <td className="p-2 text-right">
                      <input type="number" min="0" max="100" value={remisePercent} onChange={e=>handleItemChange(i, 'remise_pourcentage', parseFloat(e.target.value)||0)} className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-right" />
                    </td>
                    <td className="p-2 text-right">
                      <input type="number" min="0" value={remiseFlat} onChange={e=>handleItemChange(i, 'remise_flat', parseFloat(e.target.value)||0)} className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-right" />
                    </td>
                    <td className="p-2 text-right font-bold text-blue-600 dark:text-blue-400">{subtotal.toLocaleString()} DA</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
