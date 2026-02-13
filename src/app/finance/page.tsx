"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TrendingUp, TrendingDown, DollarSign, Package } from "lucide-react";

interface Sale {
  id: string;
  created_at: string;
  total_vente: number;
  sale_items: {
    quantite: number;
    product: { prix_achat: number } | null
  }[];
}

interface Expense {
  id: string;
  date: string;
  description: string;
  montant: number;
}

export default function FinancePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire Nouvelle Dépense
  const [newExpense, setNewExpense] = useState({ description: "", montant: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // 1. Récupérer les ventes avec les détails
    const { data: salesData } = await supabase
      .from("sales")
      .select("*, sale_items(quantite, product:products(prix_achat))")
      .order("created_at", { ascending: false });

    // 2. Récupérer les dépenses
    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (salesData) setSales(salesData as any);
    if (expensesData) setExpenses(expensesData);
    setLoading(false);
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.montant <= 0) return;
    
    await supabase.from("expenses").insert([{
      description: newExpense.description,
      montant: newExpense.montant,
      date: new Date().toISOString()
    }]);

    setNewExpense({ description: "", montant: 0 });
    fetchData(); // Recharger
  };

  // --- CALCULS DU DASHBOARD ---
  
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_vente, 0);

  const totalCostOfGoods = sales.reduce((sum, sale) => {
    const costForSale = sale.sale_items.reduce((sItem, item) => {
      const buyPrice = item.product?.prix_achat || 0; 
      return sItem + (buyPrice * item.quantite);
    }, 0);
    return sum + costForSale;
  }, 0);

  const grossMargin = totalRevenue - totalCostOfGoods;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.montant, 0);
  const netProfit = grossMargin - totalExpenses;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Rapports Financiers</h1>

      {/* 1. CARTE KPI */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard title="Chiffre d'Affaires" amount={totalRevenue} color="text-blue-600 dark:text-blue-400" icon={<DollarSign />} />
        <KpiCard title="Coût Marchandise" amount={totalCostOfGoods} color="text-gray-500 dark:text-gray-400" icon={<Package />} />
        <KpiCard title="Total Dépenses" amount={totalExpenses} color="text-red-500 dark:text-red-400" icon={<TrendingDown />} />
        <KpiCard 
          title="Bénéfice Net" 
          amount={netProfit} 
          color={netProfit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"} 
          icon={<TrendingUp />} 
          isBold 
        />
      </div>

      <div className="grid grid-cols-2 gap-8">
        
        {/* 2. GESTION DES DÉPENSES (CORRIGÉ POUR LISIBILITÉ) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
          <h2 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
            <TrendingDown size={20} className="text-red-500"/> Ajouter une dépense (Frais)
          </h2>
          
          <div className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Ex: Loyer, Electricité..." 
              className="flex-1 p-2 border border-gray-300 dark:border-slate-600 rounded 
                bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400"
              value={newExpense.description}
              onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
            />
            <input 
              type="number" 
              placeholder="Montant" 
              className="w-32 p-2 border border-gray-300 dark:border-slate-600 rounded 
                bg-white dark:bg-slate-900 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400"
              value={newExpense.montant || ""}
              onChange={(e) => setNewExpense({...newExpense, montant: parseFloat(e.target.value)})}
            />
            <button 
              onClick={handleAddExpense}
              className="bg-red-500 text-white px-4 rounded hover:bg-red-600 font-bold transition-colors"
            >
              Ajouter
            </button>
          </div>

          <div className="overflow-y-auto max-h-60">
            <table className="w-full text-sm">
              <thead className="text-gray-400 dark:text-gray-500 text-left bg-gray-50 dark:bg-slate-900">
                <tr><th className="p-2">Date</th><th className="p-2">Motif</th><th className="p-2 text-right">Montant</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {expenses.map(exp => (
                  <tr key={exp.id} className="border-b last:border-0 border-gray-100 dark:border-slate-700">
                    <td className="p-2 text-gray-500 dark:text-gray-400">{new Date(exp.date).toLocaleDateString('fr-FR')}</td>
                    <td className="p-2 font-medium text-gray-800 dark:text-gray-200">{exp.description}</td>
                    <td className="p-2 text-right text-red-500 font-mono">-{exp.montant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. DERNIÈRES VENTES (CORRIGÉ POUR LISIBILITÉ) */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 transition-colors">
          <h2 className="font-bold text-gray-700 dark:text-gray-200 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-blue-500"/> Dernières Ventes
          </h2>
          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="text-gray-400 dark:text-gray-500 text-left bg-gray-50 dark:bg-slate-900">
                <tr><th className="p-2">Date</th><th className="p-2">Client</th><th className="p-2 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                {sales.map(sale => (
                  <tr key={sale.id} className="border-b last:border-0 border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="p-2 text-gray-500 dark:text-gray-400">{new Date(sale.created_at).toLocaleDateString('fr-FR')} {new Date(sale.created_at).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</td>
                  //  <td className="p-2 text-gray-800 dark:text-gray-200">{sale.nom_client || "-"}</td>
					<td className="p-2 text-gray-800 dark:text-gray-200">-</td>
             
                    <td className="p-2 text-right font-bold text-gray-800 dark:text-white">+{sale.total_vente}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

// Composant Helper pour les cartes
function KpiCard({ title, amount, color, icon, isBold = false }: any) {
  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col justify-between h-32 transition-colors">
      <div className="flex justify-between items-start text-gray-500 dark:text-gray-400 mb-2">
        <span className="text-sm font-medium uppercase tracking-wide">{title}</span>
        {icon}
      </div>
      <div className={`text-3xl ${color} ${isBold ? "font-black" : "font-bold"}`}>
        {amount.toLocaleString()} <span className="text-sm text-gray-400">DA</span>
      </div>
    </div>
  );
}
