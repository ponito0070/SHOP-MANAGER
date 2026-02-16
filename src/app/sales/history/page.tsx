"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Search,
  Plus,
  FileText,
  Eye,
  Printer,
  ChevronLeft,
  ChevronRight,
  XCircle,
  ShoppingCart
} from "lucide-react";
import Link from "next/link";
import { generateBLPDF } from "@/lib/pdfGenerator";
import VoidConfirm from '@/components/VoidConfirm';
import OrderDetailsModal from '@/components/OrderDetailsModal';

interface Sale {
  id: string;
  reference: string;
  total_vente: number;
  date_vente: string;
  statut: string;
  clients: { nom: string } | null;
  profiles: { full_name: string } | null;
  is_void?: boolean;
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [voidOpen, setVoidOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    fetchSales();
  }, [startDate, endDate, statusFilter]);

  const fetchSales = async () => {
    setLoading(true);
    let query = supabase
      .from("sales")
      .select(`*, clients (nom), profiles (full_name)`)
      .gte("date_vente", `${startDate}T00:00:00`)
      .lte("date_vente", `${endDate}T23:59:59`)
      .order("date_vente", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("statut", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erreur:", error);
    } else {
      setSales(data as any);
    }
    setLoading(false);
  };

  const handleToggleVoid = async (id: string, current: boolean) => {
    const { error } = await supabase.from('sales').update({ is_void: !current }).eq('id', id);
    if (!error) {
      await fetchSales();
      setVoidOpen(false);
      setSelectedId(null);
    }
  };

  const adjustDate = (days: number) => {
    const newStart = new Date(startDate);
    newStart.setDate(newStart.getDate() + days);
    const newEnd = new Date(endDate);
    newEnd.setDate(newEnd.getDate() + days);

    setStartDate(newStart.toISOString().split("T")[0]);
    setEndDate(newEnd.toISOString().split("T")[0]);
  };

  const filteredSales = sales.filter(s =>
    s.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.clients?.nom || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const displayedSales = filteredSales.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePrint = async (saleId: string) => {
    await generateBLPDF(saleId, supabase, "print");
  };

  const handleViewPDF = async (saleId: string) => {
    await generateBLPDF(saleId, supabase, "view");
  };

  const handleReferenceClick = (saleId: string) => {
    setOrderId(saleId);
    setOrderOpen(true);
  };

  const totalSales = filteredSales.reduce((sum, s) => sum + s.total_vente, 0);
  const paidSales = filteredSales.filter(s => s.statut === "payé").length;
  const unpaidSales = filteredSales.filter(s => s.statut === "non payé").length;
  const averageSale = filteredSales.length > 0 ? totalSales / filteredSales.length : 0;

  return (
    <div className="space-y-4 md:space-y-6">
      
      {/* HEADER RESPONSIVE */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2.5 rounded-lg">
              <ShoppingCart className="text-blue-600 dark:text-blue-300" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Historique des Ventes
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Bons de livraison (BL)
              </p>
            </div>
          </div>
          <Link
            href="/sales"
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium min-h-[48px]"
          >
            <Plus size={18} />
            Nouveau Bon
          </Link>
        </div>

        {/* STATS RAPIDES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Ventes</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{filteredSales.length}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1">Payées</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{paidSales}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Non payées</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{unpaidSales}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Montant Total</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalSales.toFixed(2)} DA</div>
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            <input
              type="text"
              placeholder="Rechercher par référence ou client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] text-base"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_auto_auto] gap-3 items-end">
            <button
              onClick={() => adjustDate(-1)}
              className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Jour précédent"
            >
              <ChevronLeft size={18} />
            </button>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 min-h-[48px] text-base"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 min-h-[48px] text-base"
            />
            <button
              onClick={() => adjustDate(1)}
              className="p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
              aria-label="Jour suivant"
            >
              <ChevronRight size={18} />
            </button>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 min-h-[48px] text-base"
            >
              <option value="all">Tous</option>
              <option value="payé">Payé</option>
              <option value="non payé">Non payé</option>
            </select>
          </div>
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-4">Chargement...</p>
        </div>
      )}

      {/* LISTE */}
      {!loading && (
        <>
          {/* MOBILE: Cards */}
          <div className="lg:hidden space-y-3">
            {displayedSales.map((sale) => (
              <div
                key={sale.id}
                className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 border-l-4 ${
                  sale.is_void ? 'border-red-500 opacity-60' : 
                  sale.statut === 'payé' ? 'border-green-500' : 'border-orange-500'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <button
                      onClick={() => handleReferenceClick(sale.id)}
                      className="font-semibold text-blue-600 dark:text-blue-400 text-base hover:underline"
                    >
                      {sale.reference}
                    </button>
                    {sale.is_void && (
                      <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-medium">
                        ANNULÉ
                      </span>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(sale.date_vente).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    sale.statut === 'payé' 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                  }`}>
                    {sale.statut}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Client:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {sale.clients?.nom || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Agent:</span>
                    <span className="text-gray-900 dark:text-white text-xs">
                      {sale.profiles?.full_name || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-slate-700 mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {sale.total_vente.toFixed(2)} DA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleViewPDF(sale.id)}
                    className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm min-h-[44px]"
                  >
                    <Eye size={16} />
                    Détails
                  </button>
                  <button 
                    onClick={() => handlePrint(sale.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm min-h-[44px]"
                  >
                    <Printer size={16} />
                    Imprimer
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP: Table */}
          <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Référence</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Agent</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {displayedSales.map((sale) => (
                    <tr key={sale.id} className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${sale.is_void ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleReferenceClick(sale.id)}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {sale.reference}
                        </button>
                        {sale.is_void && <XCircle size={16} className="inline ml-2 text-red-500" />}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(sale.date_vente).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {sale.clients?.nom || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {sale.profiles?.full_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {sale.total_vente.toFixed(2)} DA
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          sale.statut === 'payé' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                            : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                        }`}>
                          {sale.statut}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleViewPDF(sale.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors" 
                            title="Détails"
                          >
                            <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                          </button>
                          <button 
                            onClick={() => handlePrint(sale.id)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors" 
                            title="Imprimer"
                          >
                            <Printer size={18} className="text-blue-600 dark:text-blue-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredSales.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
              <ShoppingCart size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">Aucune vente trouvée</p>
            </div>
          )}

          {/* PAGINATION */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
              Affichage {((currentPage - 1) * itemsPerPage) + 1} à {Math.min(currentPage * itemsPerPage, filteredSales.length)} sur {filteredSales.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-center">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </>
      )}

      {voidOpen && selectedId && (
        <VoidConfirm
          isOpen={voidOpen}
          onClose={() => {
            setVoidOpen(false);
            setSelectedId(null);
          }}
          onConfirm={() => {
            const sale = sales.find(s => s.id === selectedId);
            if (sale) handleToggleVoid(selectedId, sale.is_void || false);
          }}
        />
      )}

      {orderOpen && orderId && (
        <OrderDetailsModal
          isOpen={orderOpen}
          onClose={() => {
            setOrderOpen(false);
            setOrderId(null);
          }}
          orderId={orderId}
          onPrint={() => handlePrint(orderId)}
        />
      )}
    </div>
  );
}
