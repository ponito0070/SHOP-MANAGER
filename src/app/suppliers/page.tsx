"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { Search, Plus, Truck, Phone, Mail, MapPin, Eye, CreditCard } from "lucide-react";
import PaymentModal from "@/components/PaymentModal";

const getSupplierBalance = (solde?: number | null) => {
  if (typeof solde === "number" && Number.isFinite(solde)) {
    return solde;
  }
  return 0;
};

type Supplier = {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  ville: string;
  solde?: number | null;
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchSuppliers() {
      setLoading(true); // S'assurer que loading est true au début
      
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSuppliers(data.map((supplier) => ({ 
          ...supplier, 
          solde: getSupplierBalance(supplier.solde) 
        })));
      }
      
      setLoading(false); // ← TRÈS IMPORTANT : mettre à false après chargement
    }
    
    fetchSuppliers();
  }, []); // Dépendances vides = exécuté une seule fois

  const filteredSuppliers = suppliers.filter((supplier) => {
    const name = supplier.nom?.toLowerCase() || "";
    const phone = supplier.telephone?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  const handlePaymentSave = async (amount: number, note?: string) => {
    if (!selectedSupplier) return;
    
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_type: "supplier",
          party_id: selectedSupplier.id,
          amount,
          note: note || "",
        }),
      });

      if (!response.ok) {
        alert("Erreur paiement");
        return;
      }

      const result = await response.json();
      
      // Mettre à jour le solde local
      setSuppliers(suppliers.map((s) =>
        s.id === selectedSupplier.id
          ? { ...s, solde: getSupplierBalance(result.new_balance) }
          : s
      ));
      
      setPaymentOpen(false);
      setSelectedSupplier(null);
    } catch (error) {
      console.error(error);
      alert("Erreur");
    }
  };

  const totalSuppliers = suppliers.length;
  const suppliersWithDebt = suppliers.filter((supplier) => getSupplierBalance(supplier.solde) > 0).length;
  const totalDebt = suppliers.reduce((sum, supplier) => {
    const balance = getSupplierBalance(supplier.solde);
    return sum + (balance > 0 ? balance : 0);
  }, 0);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* HEADER */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-teal-100 dark:bg-teal-900 p-2.5 rounded-lg">
              <Truck className="text-teal-600 dark:text-teal-300" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Fournisseurs</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Gérez vos fournisseurs</p>
            </div>
          </div>
          <Link
            href="/suppliers/nouveau"
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium min-h-[48px]"
          >
            <Plus size={18} />
            Nouveau Fournisseur
          </Link>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Fournisseurs</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalSuppliers}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">À Payer</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{suppliersWithDebt}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg col-span-2 lg:col-span-1">
            <div className="text-xs text-red-600 dark:text-red-400 mb-1">Montant Dû</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalDebt.toFixed(2)} DA</div>
          </div>
        </div>
      </div>

      {/* RECHERCHE */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 min-h-[48px] text-base"
          />
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-teal-600 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Chargement...</p>
        </div>
      )}

      {/* LISTE */}
      {!loading && (
        <>
          {/* MOBILE CARDS */}
          <div className="lg:hidden space-y-3">
            {filteredSuppliers.map((supplier) => (
              <div key={supplier.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 border-l-4 border-teal-500">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white text-base">{supplier.nom}</div>
                    {supplier.telephone && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <Phone size={14} />
                        {supplier.telephone}
                      </div>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    getSupplierBalance(supplier.solde) > 0
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : getSupplierBalance(supplier.solde) < 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {getSupplierBalance(supplier.solde) > 0 ? 'À payer' : getSupplierBalance(supplier.solde) < 0 ? 'Avance' : 'OK'}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  {supplier.email && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <Mail size={14} />
                      <span className="truncate">{supplier.email}</span>
                    </div>
                  )}
                  {supplier.ville && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin size={14} />
                      {supplier.ville}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-slate-700 mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Solde:</span>
                  <span className={`text-lg font-bold ${
                    getSupplierBalance(supplier.solde) > 0 ? 'text-red-600 dark:text-red-400' : 
                    getSupplierBalance(supplier.solde) < 0 ? 'text-green-600 dark:text-green-400' : 
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {getSupplierBalance(supplier.solde).toFixed(2)} DA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/suppliers/${supplier.id}`}
                    className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm min-h-[44px]"
                  >
                    <Eye size={16} />
                    Détails
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setPaymentOpen(true);
                    }}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm min-h-[44px]"
                  >
                    <CreditCard size={16} />
                    Paiement
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden lg:block bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fournisseur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ville</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Solde</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredSuppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{supplier.nom}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        {supplier.telephone && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <Phone size={14} />
                            {supplier.telephone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                            <Mail size={14} />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{supplier.ville || "-"}</td>
                    <td className="px-6 py-4 text-right">
                      <span className={`font-semibold ${
                        getSupplierBalance(supplier.solde) > 0 ? 'text-red-600 dark:text-red-400' : 
                        getSupplierBalance(supplier.solde) < 0 ? 'text-green-600 dark:text-green-400' : 
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {getSupplierBalance(supplier.solde).toFixed(2)} DA
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
                          title="Détails"
                        >
                          <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setPaymentOpen(true);
                          }}
                          className="p-2 hover:bg-teal-100 dark:hover:bg-teal-900/20 rounded-lg"
                          title="Paiement"
                        >
                          <CreditCard size={18} className="text-teal-600 dark:text-teal-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* EMPTY STATE */}
          {filteredSuppliers.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
              <Truck size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">Aucun fournisseur trouvé</p>
            </div>
          )}
        </>
      )}

      {/* PAYMENT MODAL */}
      {paymentOpen && selectedSupplier && (
        <PaymentModal
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false);
            setSelectedSupplier(null);
          }}
          onSave={handlePaymentSave}
          partyType="supplier"
          partyId={selectedSupplier.id}
          partyName={selectedSupplier.nom}
        />
      )}
    </div>
  );
}