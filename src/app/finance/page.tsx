"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  Download,
  Settings,
} from "lucide-react";
import Link from "next/link";
import {
  formatCurrency,
  formatDateFR,
  calculatePercentChange,
  formatPercentChange,
  exportFinanceToPDF,
  exportFinanceToExcel,
} from "@/lib/financeHelpers";
import {
  RevenueLineChart,
  ComparisonBarChart,
  StackedAreaChart,
} from "@/components/FinanceCharts";

interface Sale {
  id: string;
  date_vente: string;
  total_vente: number;
  remise_flat?: number;
  sale_items: {
    quantite: number;
    remise_pourcentage?: number;
    remise_flat?: number;
    prix_unitaire_vente?: number;
    product_id?: string;
    products: { prix_achat?: number; prix_achat_moyen?: number } | null;
  }[];
}

interface Expense {
  id: string;
  date: string;
  description: string;
  montant: number;
  category: string;
}

type PeriodType = "week" | "month" | "quarter" | "year";

export default function FinancePage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodType>("month");

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    const now = new Date();
    let startDate = new Date();

    // Déterminer la plage de date selon la période
    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    try {
      // Étape 1: Charger d'abord juste les ventes sans relations
      const { data: salesBaseData, error: salesBaseError } = await supabase
        .from("sales")
        .select("id, total_vente, date_vente")
        .gte("date_vente", startDate.toISOString())
        .order("date_vente", { ascending: false });

      if (salesBaseError) {
        console.error("❌ Erreur chargement ventes (étape 1):", salesBaseError.message);
        setSales([]);
      } else if (!salesBaseData || salesBaseData.length === 0) {
        console.log("ℹ️ Aucune vente trouvée pour cette période");
        setSales([]);
      } else {
        console.log("✅ Ventes de base chargées:", salesBaseData.length, "ventes");
        
        // Étape 2: Charger les articles de vente
        const { data: saleItemsData, error: itemsError } = await supabase
          .from("sale_items")
          .select("sale_id, quantite, prix_unitaire_vente, product_id")
          .in("sale_id", salesBaseData.map(s => s.id));

        if (itemsError) {
          console.warn("⚠️ Erreur chargement articles:", itemsError.message);
        }

        // Étape 3: Charger les infos produits
        const productIds = saleItemsData ? [...new Set(saleItemsData.map(item => item.product_id))] : [];
        const { data: productsData, error: productsError } = await supabase
          .from("products")
          .select("id, prix_achat, prix_achat_moyen")
          .in("id", productIds.length > 0 ? productIds : ['dummy']);

        if (productsError) {
          console.warn("⚠️ Erreur chargement produits:", productsError.message);
        }

        // Étape 4: Assembler les données complètes
        const enrichedSales = salesBaseData.map(sale => {
          const saleItems = (saleItemsData || [])
            .filter(item => item.sale_id === sale.id)
            .map(item => {
              const product = (productsData || []).find(p => p.id === item.product_id);
              return {
                ...item,
                quantite: item.quantite || 0,
                prix_unitaire_vente: item.prix_unitaire_vente || 0,
                remise_pourcentage: 0,
                remise_flat: 0,
                products: product ? {
                  prix_achat: product.prix_achat || 0,
                  prix_achat_moyen: product.prix_achat_moyen || 0
                } : null
              };
            });

          return {
            ...sale,
            remise_flat: 0,
            sale_items: saleItems
          };
        });

        setSales(enrichedSales as any);
        console.log("✅ Données de ventes enrichies:", enrichedSales.length, "ventes");
      }

      // Charger les dépenses
      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select("*")
        .gte("date", startDate.toISOString())
        .order("date", { ascending: false });

      if (expensesError) {
        console.error("❌ Erreur chargement dépenses:", expensesError.message);
      } else if (expensesData) {
        console.log("✅ Dépenses chargées:", expensesData.length, "dépenses");
        setExpenses(expensesData);
      }
    } catch (err) {
      console.error("❌ Erreur générale fetchData:", err);
      setSales([]);
    }
    
    setLoading(false);
  };

  // --- CALCULS ---

  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total_vente || 0), 0);

  const totalCostOfGoods = sales.reduce((sum, sale) => {
    const costForSale = sale.sale_items.reduce((sItem, item) => {
      const buyPrice = item.products?.prix_achat_moyen || item.products?.prix_achat || 0;
      const qty = item.quantite || 0;
      return sItem + (buyPrice * qty);
    }, 0);
    return sum + costForSale;
  }, 0);

  const grossMargin = totalRevenue - totalCostOfGoods;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.montant, 0);
  const netProfit = grossMargin - totalExpenses;

  const grossMarginPercent =
    totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
  const netProfitPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const saleCount = sales.length;
  const avgTicket = saleCount > 0 ? totalRevenue / saleCount : 0;

  // Datas pour graphiques
  const chartData = sales
    .sort(
      (a, b) =>
        new Date(a.date_vente).getTime() - new Date(b.date_vente).getTime()
    )
    .reduce((acc: any[], sale) => {
      const date = new Date(sale.date_vente).toLocaleDateString("fr-FR");
      const saleCost = sale.sale_items.reduce((sum, item) => {
        const buyPrice = item.products?.prix_achat_moyen || item.products?.prix_achat || 0;
        const qty = item.quantite || 0;
        return sum + (buyPrice * qty);
      }, 0);
      const saleProfit = sale.total_vente - saleCost;
      
      const existing = acc.find((d) => d.date === date);

      if (existing) {
        existing.revenue += sale.total_vente;
        existing.cost += saleCost;
        existing.netProfit += saleProfit;
      } else {
        acc.push({
          date,
          revenue: sale.total_vente,
          cost: saleCost,
          netProfit: saleProfit,
        });
      }
      return acc;
    }, []);

  const handleExportPDF = () => {
    exportFinanceToPDF(
      "Rapport Financier",
      {
        "Chiffre d'affaires": totalRevenue,
        "Marge brute": grossMargin,
        "Total dépenses": totalExpenses,
        "Bénéfice net": netProfit,
      },
      sales.map((s) => ({
        date: formatDateFR(s.date_vente),
        total: s.total_vente,
      })),
      [
        { header: "Date", dataKey: "date" },
        { header: "Montant", dataKey: "total", align: "right" },
      ]
    );
  };

  const handleExportExcel = () => {
    exportFinanceToExcel("Rapport_Financier", [
      {
        name: "Résumé",
        data: [
          { Métrique: "Chiffre d'affaires", Montant: totalRevenue },
          { Métrique: "Coût marchandises", Montant: totalCostOfGoods },
          { Métrique: "Marge brute", Montant: grossMargin },
          { Métrique: "Total dépenses", Montant: totalExpenses },
          { Métrique: "Bénéfice net", Montant: netProfit },
        ],
      },
      {
        name: "Ventes",
        data: sales.map((s) => ({
          Date: formatDateFR(s.date_vente),
          Total: s.total_vente,
        })),
      },
      {
        name: "Dépenses",
        data: expenses.map((e) => ({
          Date: formatDateFR(e.date),
          Description: e.description,
          Montant: e.montant,
        })),
      },
    ]);
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <DollarSign className="text-blue-600" /> Finances & Statistiques
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download size={18} /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download size={18} /> Excel
          </button>
          <Link
            href="/finance/expenses"
            className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            <Settings size={18} /> Dépenses
          </Link>
        </div>
      </div>

      {/* PÉRIODE SELECTOR */}
      <div className="flex gap-2 bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
        <Calendar size={20} className="text-gray-500" />
        {(["week", "month", "quarter", "year"] as PeriodType[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded font-medium transition-colors capitalize ${
              period === p
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200"
            }`}
          >
            {p === "week"
              ? "Semaine"
              : p === "month"
              ? "Mois"
              : p === "quarter"
              ? "Trimestre"
              : "Année"}
          </button>
        ))}
      </div>

      {/* KPIs - GRILLE */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Chiffre d'Affaires"
          amount={totalRevenue}
          color="blue"
          icon={<DollarSign size={24} />}
        />
        <KpiCard
          title="Marge Brute"
          amount={grossMargin}
          subtitle={`${grossMarginPercent.toFixed(1)}%`}
          color="green"
          icon={<TrendingUp size={24} />}
        />
        <KpiCard
          title="Dépenses"
          amount={totalExpenses}
          color="red"
          icon={<TrendingDown size={24} />}
        />
        <KpiCard
          title="Bénéfice Net"
          amount={netProfit}
          subtitle={`${netProfitPercent.toFixed(1)}%`}
          color={netProfit >= 0 ? "emerald" : "red"}
          icon={
            netProfit >= 0 ? (
              <TrendingUp size={24} />
            ) : (
              <TrendingDown size={24} />
            )
          }
          isBold
        />
      </div>

      {/* SOUS-KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Nombre de ventes"
          value={saleCount}
          unit="commandes"
        />
        <StatCard
          label="Ticket moyen"
          value={formatCurrency(avgTicket)}
          unit="DA"
        />
        <StatCard
          label="Coût marchandises"
          value={formatCurrency(totalCostOfGoods)}
          unit="DA"
        />
      </div>

      {/* GRAPHIQUES */}
      {!loading && (
        <div className="space-y-6">
          {/* Graphique revenus */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Évolution des Revenus & Bénéfice
            </h2>
            <RevenueLineChart data={chartData} />
          </div>

          {/* Graphique pour voir composition */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Marge Brute vs Dépenses
            </h2>
            <StackedAreaChart data={chartData} />
          </div>
        </div>
      )}

      {/* TABLEAU DERNIERES VENTES */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Dernières Ventes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900 border-b-2 border-gray-200 dark:border-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-gray-700 dark:text-gray-200">
                  Date
                </th>
                <th className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-200">
                  Montant
                </th>
                <th className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-200">
                  Marge Brute
                </th>
                <th className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-200">
                  Marge %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {sales.slice(0, 10).map((sale) => {
                const costForSale = sale.sale_items.reduce((sum, item) => {
                  const buyPrice = item.products?.prix_achat_moyen || item.products?.prix_achat || 0;
                  const qty = item.quantite || 0;
                  return sum + (buyPrice * qty);
                }, 0);
                const margin = sale.total_vente - costForSale;
                const marginPercent =
                  sale.total_vente > 0 ? (margin / sale.total_vente) * 100 : 0;

                return (
                  <tr
                    key={sale.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {formatDateFR(sale.date_vente)}{" "}
                      <span className="text-xs text-gray-400">
                        {new Date(sale.date_vente).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(sale.total_vente)} DA
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(margin)} DA
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                      {marginPercent.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  amount,
  subtitle,
  color,
  icon,
  isBold = false,
}: {
  title: string;
  amount: number;
  subtitle?: string;
  color: "blue" | "green" | "red" | "emerald";
  icon: React.ReactNode;
  isBold?: boolean;
}) {
  const colorClasses = {
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20",
    green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    emerald:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20",
  };

  return (
    <div className={`${colorClasses[color]} p-5 rounded-xl border border-current/20 shadow-sm`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300">
          {title}
        </span>
        <div className="opacity-70">{icon}</div>
      </div>
      <div className={`${isBold ? "text-3xl font-black" : "text-2xl font-bold"}`}>
        {formatCurrency(amount)}
      </div>
      {subtitle && (
        <div className="text-xs font-semibold mt-2 opacity-75">{subtitle}</div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 text-center">
      <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-1">{unit}</div>
    </div>
  );
}
