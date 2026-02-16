"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { Search, Plus, Users, Phone, Mail, MapPin, DollarSign, Eye, CreditCard } from "lucide-react";
import PaymentModal from "@/components/PaymentModal";

type Client = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  ville: string;
  solde: number;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const filteredClients = clients.filter((client) => {
    const fullName = `${client.nom} ${client.prenom}`.toLowerCase();
    const phone = client.telephone?.toLowerCase() || "";
    const term = searchTerm.toLowerCase();
    return fullName.includes(term) || phone.includes(term);
  });

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur:", error);
      } else {
        setClients(data || []);
      }
      setLoading(false);
    }

    fetchClients();
  }, []);

  const handlePaymentSave = async (amount: number, note?: string) => {
    if (!selectedClient) return;

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_type: "client",
          party_id: selectedClient.id,
          amount,
          note: note || "",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(`Erreur: ${error.message}`);
        return;
      }

      const result = await response.json();
      setClients(clients.map((c) =>
        c.id === selectedClient.id ? { ...c, solde: result.new_balance } : c
      ));
      
      setPaymentOpen(false);
      setSelectedClient(null);
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors du traitement du paiement");
    }
  };

  // Stats rapides
  const totalClients = clients.length;
  const clientsWithDebt = clients.filter(c => c.solde < 0).length;
  const clientsWithCredit = clients.filter(c => c.solde > 0).length;
  const totalDebt = clients.reduce((sum, c) => sum + (c.solde < 0 ? Math.abs(c.solde) : 0), 0);

  return (
    <div className="space-y-4 md:space-y-6">
      
      {/* HEADER RESPONSIVE */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 dark:bg-purple-900 p-2.5 rounded-lg">
              <Users className="text-purple-600 dark:text-purple-300" size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Clients
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Gérez votre base clients
              </p>
            </div>
          </div>
          <Link
            href="/clients/nouveau"
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium min-h-[48px]"
          >
            <Plus size={18} />
            Nouveau Client
          </Link>
        </div>

        {/* STATS RAPIDES */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">Total Clients</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{totalClients}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <div className="text-xs text-red-600 dark:text-red-400 mb-1">Avec Dette</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{clientsWithDebt}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="text-xs text-green-600 dark:text-green-400 mb-1">Avec Crédit</div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">{clientsWithCredit}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg col-span-2 lg:col-span-1">
            <div className="text-xs text-orange-600 dark:text-orange-400 mb-1">Dette Totale</div>
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
            placeholder="Rechercher par nom, prénom ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[48px] text-base"
          />
        </div>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-gray-500 dark:text-gray-400 mt-4">Chargement...</p>
        </div>
      )}

      {/* LISTE CLIENTS */}
      {!loading && (
        <>
          {/* MOBILE: Cards */}
          <div className="lg:hidden space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 border-l-4 border-purple-500"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white text-base">
                      {client.nom} {client.prenom}
                    </div>
                    {client.telephone && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <Phone size={14} />
                        {client.telephone}
                      </div>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    client.solde < 0
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      : client.solde > 0
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                  }`}>
                    {client.solde < 0 ? 'Dette' : client.solde > 0 ? 'Crédit' : 'OK'}
                  </span>
                </div>

                <div className="space-y-1.5 mb-3">
                  {client.email && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <Mail size={14} />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.ville && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                      <MapPin size={14} />
                      {client.ville}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-slate-700 mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Solde:</span>
                  <span className={`text-lg font-bold ${
                    client.solde < 0
                      ? 'text-red-600 dark:text-red-400'
                      : client.solde > 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {client.solde.toFixed(2)} DA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/clients/${client.id}`}
                    className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm min-h-[44px]"
                  >
                    <Eye size={16} />
                    Détails
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedClient(client);
                      setPaymentOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors text-sm min-h-[44px]"
                  >
                    <CreditCard size={16} />
                    Paiement
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ville</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Solde</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {client.nom} {client.prenom}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {client.telephone && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                              <Phone size={14} />
                              {client.telephone}
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                              <Mail size={14} />
                              {client.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {client.ville || "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-semibold ${
                          client.solde < 0
                            ? 'text-red-600 dark:text-red-400'
                            : client.solde > 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {client.solde.toFixed(2)} DA
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/clients/${client.id}`}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                            title="Détails"
                          >
                            <Eye size={18} className="text-gray-600 dark:text-gray-400" />
                          </Link>
                          <button
                            onClick={() => {
                              setSelectedClient(client);
                              setPaymentOpen(true);
                            }}
                            className="p-2 hover:bg-purple-100 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Paiement"
                          >
                            <CreditCard size={18} className="text-purple-600 dark:text-purple-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredClients.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-8 text-center">
              <Users size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500 dark:text-gray-400">Aucun client trouvé</p>
            </div>
          )}
        </>
      )}

      {/* MODAL PAIEMENT */}
      {paymentOpen && selectedClient && (
        <PaymentModal
          open={paymentOpen}
          onClose={() => {
            setPaymentOpen(false);
            setSelectedClient(null);
          }}
          partyType="client"
          partyId={selectedClient.id}
          partyName={`${selectedClient.nom} ${selectedClient.prenom}`}
          currentBalance={selectedClient.solde}
          onPaymentSave={handlePaymentSave}
        />
      )}
    </div>
  );
}
