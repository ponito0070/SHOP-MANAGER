"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  Download,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import {
  formatCurrency,
  formatDateFR,
  exportFinanceToExcel,
} from "@/lib/financeHelpers";
import { ExpensesPieChart } from "@/components/FinanceCharts";

interface Expense {
  id: string;
  date: string;
  description: string;
  montant: number;
  category: string;
}

const CATEGORIES = [
  { value: "salaire", label: "Salaires" },
  { value: "loyer", label: "Loyer" },
  { value: "utilities", label: "Services" },
  { value: "transport", label: "Transport" },
  { value: "fournitures", label: "Fournitures" },
  { value: "services", label: "Services externes" },
  { value: "marketing", label: "Marketing" },
  { value: "maintenance", label: "Maintenance" },
  { value: "assurance", label: "Assurance" },
  { value: "impots", label: "Impôts" },
  { value: "autre", label: "Autre" },
];

const CATEGORY_COLORS: Record<string, string> = {
  salaire: "bg-red-100 text-red-700",
  loyer: "bg-orange-100 text-orange-700",
  utilities: "bg-yellow-100 text-yellow-700",
  transport: "bg-green-100 text-green-700",
  fournitures: "bg-blue-100 text-blue-700",
  services: "bg-purple-100 text-purple-700",
  marketing: "bg-pink-100 text-pink-700",
  maintenance: "bg-indigo-100 text-indigo-700",
  assurance: "bg-cyan-100 text-cyan-700",
  impots: "bg-gray-100 text-gray-700",
  autre: "bg-slate-100 text-slate-700",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    description: "",
    montant: 0,
    category: "autre",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false });

    if (data) setExpenses(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.description || formData.montant <= 0) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    try {
      if (editingId) {
        await supabase
          .from("expenses")
          .update(formData)
          .eq("id", editingId);
        setEditingId(null);
      } else {
        await supabase.from("expenses").insert([formData]);
      }

      setFormData({
        description: "",
        montant: 0,
        category: "autre",
        date: new Date().toISOString().split("T")[0],
      });
      setShowForm(false);
      fetchExpenses();
    } catch (error) {
      alert("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Confirmer la suppression?")) return;
    await supabase.from("expenses").delete().eq("id", id);
    fetchExpenses();
  };

  const handleEdit = (expense: Expense) => {
    setFormData({
      description: expense.description,
      montant: expense.montant,
      category: expense.category,
      date: expense.date.split("T")[0],
    });
    setEditingId(expense.id);
    setShowForm(true);
  };

  // Filtrer les dépenses
  const filteredExpenses =
    selectedCategory === "all"
      ? expenses
      : expenses.filter((e) => e.category === selectedCategory);

  // Calculs
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.montant, 0);
  const expensesByCategory = CATEGORIES.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat.value)
      .reduce((sum, e) => sum + e.montant, 0);
    return { name: cat.label, value: total };
  }).filter((c) => c.value > 0);

  const avgExpense =
    filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;

  // Projection du mois
  const currentMonth = new Date().getMonth();
  const thisMonthExpenses = expenses.filter(
    (e) => new Date(e.date).getMonth() === currentMonth
  );
  const projectedMonthlyExpense = thisMonthExpenses.reduce(
    (sum, e) => sum + e.montant,
    0
  );

  const handleExportExcel = () => {
    exportFinanceToExcel("Dépenses", [
      {
        name: "Résumé",
        data: [
          { Catégorie: "Salaires", Montant: 0 },
          { Catégorie: "Loyer", Montant: 0 },
          { Catégorie: "Services", Montant: 0 },
          { Catégorie: "Total", Montant: totalExpenses },
        ],
      },
      {
        name: "Détails",
        data: expenses.map((e) => ({
          Date: formatDateFR(e.date),
          Description: e.description,
          Catégorie: CATEGORIES.find((c) => c.value === e.category)?.label || e.category,
          Montant: e.montant,
        })),
      },
    ]);
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link
            href="/finance"
            className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="text-red-600" /> Gestion des Dépenses
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            <Download size={18} /> Excel
          </button>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({
                description: "",
                montant: 0,
                category: "autre",
                date: new Date().toISOString().split("T")[0],
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} /> Nouvelle dépense
          </button>
        </div>
      </div>

      {/* FORMULAIRE */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white">
            {editingId ? "Éditer" : "Ajouter"} une dépense
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
            <input
              type="text"
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Montant"
              value={formData.montant || ""}
              onChange={(e) =>
                setFormData({ ...formData, montant: parseFloat(e.target.value) || 0 })
              }
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium"
            >
              Enregistrer
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-900 dark:text-white rounded font-medium"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <StatBox
          label="Total dépenses"
          value={formatCurrency(totalExpenses)}
          color="red"
        />
        <StatBox
          label="Dépense moyenne"
          value={formatCurrency(avgExpense)}
          color="orange"
        />
        <StatBox
          label="Nombre de lignes"
          value={filteredExpenses.length}
          color="blue"
        />
        <StatBox
          label="Projection mois"
          value={formatCurrency(projectedMonthlyExpense)}
          color="purple"
        />
      </div>

      {/* GRAPHIQUE + TABLEAU */}
      <div className="grid grid-cols-3 gap-6">
        {/* Graphique camembert */}
        <div className="col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">
            Dépenses par catégorie
          </h2>
          {expensesByCategory.length > 0 ? (
            <ExpensesPieChart data={expensesByCategory} />
          ) : (
            <div className="text-center text-gray-500 py-8">Aucune dépense</div>
          )}
        </div>

        {/* Filtre + Tableau */}
        <div className="col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="mb-4 flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white"
              }`}
            >
              Toutes
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-slate-700 text-gray-900 dark:text-white"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-2 text-left font-bold text-gray-700 dark:text-gray-200">
                    Date
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-gray-700 dark:text-gray-200">
                    Description
                  </th>
                  <th className="px-4 py-2 text-left font-bold text-gray-700 dark:text-gray-200">
                    Catégorie
                  </th>
                  <th className="px-4 py-2 text-right font-bold text-gray-700 dark:text-gray-200">
                    Montant
                  </th>
                  <th className="px-4 py-2 text-center font-bold text-gray-700 dark:text-gray-200">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredExpenses.map((exp) => {
                  const catLabel = CATEGORIES.find(
                    (c) => c.value === exp.category
                  )?.label;
                  const colorClass = CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.autre;

                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                        {formatDateFR(exp.date)}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                        {exp.description}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${colorClass}`}>
                          {catLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                        -{formatCurrency(exp.montant)} DA
                      </td>
                      <td className="px-4 py-3 text-center space-x-2">
                        <button
                          onClick={() => handleEdit(exp)}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded transition-colors"
                          title="Éditer"
                        >
                          <Edit2 size={16} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} className="text-red-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "red" | "orange" | "blue" | "purple";
}) {
  const colorClasses = {
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className={`${colorClasses[color]} p-4 rounded-lg border border-current/20`}>
      <div className="text-xs uppercase font-bold tracking-wide opacity-75">
        {label}
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}
