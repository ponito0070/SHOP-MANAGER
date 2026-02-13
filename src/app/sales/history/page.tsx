"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  Calendar,
  Filter,
  Plus,
  FileText,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { generateBLPDF } from "@/lib/pdfGenerator";

interface Sale {
  id: string;
  reference: string;
  total_vente: number;
  date_vente: string;
  statut: string;
  clients: { nom: string } | null;
  profiles: { full_name: string } | null;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate, statusFilter]);

  const fetchSales = async () => {
    setLoading(true);

    let query = supabase
      .from("sales")
      .select(
        `
        *,
        clients (nom),
        profiles (full_name)
      `
      )
      .gte("date_vente", `${startDate}T00:00:00`)
      .lte("date_vente", `${endDate}T23:59:59`)
      .order("date_vente", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("statut", statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erreur Supabase Critique:", error.message, error.details);
    } else {
      setSales(data as any);
    }

    setLoading(false);
  };

  const adjustDate = (days: number) => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + days);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + days);

    setStartDate(newStart.toISOString().split("T")[0]);
    setEndDate(newEnd.toISOString().split("T")[0]);
  };

  const filteredSales = sales.filter(
    (s) =>
      s.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.clients?.nom.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = async (saleId: string) => {
    await generateBLPDF(saleId, supabase, "print");
  };

  const handleView = async (saleId: string) => {
    await generateBLPDF(saleId, supabase, "view");
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-300 dark:border-slate-600 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600" /> Historique des Ventes
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Consultez et gérez les bons de livraison.
          </p>
        </div>
        <Link
          href="/sales"
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
        >
          <Plus size={20} /> Nouvelle Vente
        </Link>
      </div>

      {/* FILTRES */}
      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_0.8fr] gap-4 bg-gray-100 dark:bg-slate-900 p-4 rounded-lg border border-gray-300 dark:border-slate-600">
        {/* Période avec flèches */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase text-gray-500">
            Période
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustDate(-1)}
              className="p-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              title="Jour précédent"
            >
              <ChevronLeft
                size={20}
                className="text-gray-600 dark:text-gray-300"
              />
            </button>

            <div className="flex-1 grid grid-cols-2 gap-2">
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-2 top-2.5 text-gray-500"
                />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-8 p-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
              <div className="relative">
                <Calendar
                  size={14}
                  className="absolute left-2 top-2.5 text-gray-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-8 p-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={() => adjustDate(1)}
              className="p-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              title="Jour suivant"
            >
              <ChevronRight
                size={20}
                className="text-gray-600 dark:text-gray-300"
              />
            </button>
          </div>
        </div>

        {/* Recherche */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase text-gray-500">
            Recherche Rapide
          </label>
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-3 text-gray-500"
            />
            <input
              type="text"
              placeholder="N° Bon, Client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 p-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Statut */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase text-gray-500">
            Statut
          </label>
          <div className="relative">
            <Filter
              size={16}
              className="absolute left-3 top-3 text-gray-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 p-2 bg-white dark:bg-slate-800 border-2 border-gray-300 dark:border-slate-500 rounded font-medium text-gray-900 dark:text-white outline-none focus:border-blue-500 appearance-none"
            >
              <option value="all">Tout voir</option>
              <option value="valide">Validés</option>
              <option value="brouillon">Brouillons</option>
              <option value="annule">Annulés</option>
            </select>
          </div>
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100 dark:bg-slate-900 border-b-2 border-gray-300 dark:border-slate-500">
            <tr>
              <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 tracking-wider">
                Référence
              </th>
              <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 tracking-wider">
                Date
              </th>
              <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 tracking-wider">
                Client
              </th>
              <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 tracking-wider text-right">
                Montant Total
              </th>
              <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 tracking-wider text-center">
                Statut
              </th>
              <th className="p-3 text-xs font-bold uppercase text-gray-600 dark:text-gray-300 tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-500"
                >
                  Chargement des données...
                </td>
              </tr>
            ) : filteredSales.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-gray-400 italic"
                >
                  Aucune vente trouvée sur cette période.
                </td>
              </tr>
            ) : (
              filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors group"
                >
                  <td className="p-3 font-mono text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:underline">
                    {sale.reference}
                  </td>
                  <td className="p-3 text-sm text-gray-700 dark:text-gray-300">
                    {new Date(sale.date_vente).toLocaleDateString("fr-FR")}{" "}
                    <span className="text-xs text-gray-400">
                      {new Date(
                        sale.date_vente
                      ).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </td>
                  <td className="p-3 text-sm font-medium text-gray-900 dark:text-white">
                    {sale.clients?.nom || "Client Comptoir"}
                  </td>
                  <td className="p-3 text-sm font-bold text-right text-gray-900 dark:text-white tabular-nums">
                    {sale.total_vente.toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    <span className="text-xs font-normal text-gray-500">
                      DA
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase border
                      ${
                        sale.statut === "valide"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : sale.statut === "annule"
                          ? "bg-red-100 text-red-700 border-red-200"
                          : "bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      {sale.statut}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <button
                      onClick={() => handleView(sale.id)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                      title="Voir le BL (PDF)"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => handlePrint(sale.id)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-100 rounded transition-colors"
                      title="Imprimer le BL"
                    >
                      <Printer size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}