"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Users, 
  Truck, 
  FileText 
} from "lucide-react";
import { Providers } from "./providers";
import ThemeToggle from "@/components/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  // Fonction utilitaire pour styliser les liens actifs
  const getLinkClass = (path: string) => {
    // Vérifie si le chemin actuel commence par le lien (pour gérer les sous-pages)
    // Sauf pour la racine '/' sinon tout serait actif
    const isActive = path === '/' 
      ? pathname === '/' 
      : pathname.startsWith(path);
      
    return `flex items-center gap-3 px-4 py-2 rounded-lg transition text-sm ${
      isActive 
        ? 'bg-blue-600 text-white shadow-lg font-medium' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 flex h-screen overflow-hidden transition-colors duration-300`}>
        <Providers>
          
          {/* SIDEBAR (Masquée sur la page Login) */}
          {!isLoginPage && (
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl shrink-0 z-50 border-r border-slate-800">
              <div className="p-6 border-b border-slate-700 bg-slate-950/30">
                <h1 className="text-xl font-bold tracking-wider text-white">SHOP MANAGER</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-xs text-slate-400 font-mono">v2.1 • ERP System</span>
                </div>
              </div>
              
              <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
                
                {/* SECTION VENTES */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase px-4 mb-2 tracking-widest">Gestion Ventes</div>
                  <div className="space-y-1">
                    <Link href="/sales" className={getLinkClass('/sales')}>
                      <ShoppingCart size={18} /> Nouveau Bon (BL)
                    </Link>
                    <Link href="/sales/history" className={getLinkClass('/sales/history')}>
                      <FileText size={18} /> Historique Ventes
                    </Link>
                    {/* LIEN CLIENTS ACTIVÉ */}
                    <Link href="/clients" className={getLinkClass('/clients')}>
                      <Users size={18} /> Clients
                    </Link>
                  </div>
                </div>

                {/* SECTION STOCK / ACHATS */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase px-4 mb-2 tracking-widest">Stock & Logistique</div>
                  <div className="space-y-1">
                    <Link href="/purchases" className={getLinkClass('/purchases')}>
                      <Truck size={18} /> Réception (BR)
                    </Link>
                    <Link href="/inventory" className={getLinkClass('/inventory')}>
                      <Package size={18} /> Inventaire Global
                    </Link>
                  </div>
                </div>

                {/* SECTION GESTION */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase px-4 mb-2 tracking-widest">Pilotage</div>
                  <div className="space-y-1">
                    <Link href="/finance" className={getLinkClass('/finance')}>
                      <BarChart3 size={18} /> Finances & Stats
                    </Link>
                  </div>
                </div>

              </nav>

              {/* FOOTER SIDEBAR */}
              <div className="p-4 border-t border-slate-700 bg-slate-950/30 space-y-3">
                <ThemeToggle />
                <div className="text-[10px] text-center text-slate-600 font-mono">
                  Server Status: OK
                </div>
              </div>
            </aside>
          )}

          {/* ZONE PRINCIPALE */}
          <main className={`flex-1 overflow-auto relative bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-gray-100 ${isLoginPage ? 'p-0' : 'p-6'}`}>
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}
