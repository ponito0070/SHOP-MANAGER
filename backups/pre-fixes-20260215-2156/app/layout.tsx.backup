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
  FileText,
  Boxes,
  Moon,
  Sun,
  Menu,
  X
} from "lucide-react";
import { Providers } from "./providers";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import UserInfoLogout from "@/components/UserInfoLogout";

const inter = Inter({ subsets: ["latin"] });

function ThemeToggleIcon() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-5 h-5" />;
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun size={18} className="text-yellow-400" />
      ) : (
        <Moon size={18} className="text-slate-400" />
      )}
    </button>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Pages sans sidebar (pages publiques)
  const isPublicPage = pathname === "/login" || pathname === "/reset-password";

  // Fermer le menu mobile lors du changement de route
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Bloquer le scroll du body quand le menu mobile est ouvert
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const getLinkClass = (path: string) => {
    const isActive = path === '/' 
      ? pathname === '/' 
      : pathname.startsWith(path);
      
    return `flex items-center gap-2.5 px-3 py-2 rounded-lg transition text-sm ${
      isActive 
        ? 'bg-blue-600 text-white shadow-lg font-medium' 
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;
  };

  // Contenu de la navigation (réutilisé pour desktop et mobile)
  const NavigationContent = () => (
    <>
      {/* SECTION VENTES */}
      <div>
        <div className="text-[9px] font-bold text-slate-500 uppercase px-3 mb-1.5 tracking-widest">Gestion Ventes</div>
        <div className="space-y-0.5">
          <Link href="/sales" className={getLinkClass('/sales')}>
            <ShoppingCart size={16} /> Nouveau Bon (BL)
          </Link>
          <Link href="/sales/history" className={getLinkClass('/sales/history')}>
            <FileText size={16} /> Historique Ventes
          </Link>
          <Link href="/clients" className={getLinkClass('/clients')}>
            <Users size={16} /> Clients
          </Link>
        </div>
      </div>

      {/* SECTION STOCK / ACHATS */}
      <div>
        <div className="text-[9px] font-bold text-slate-500 uppercase px-3 mb-1.5 tracking-widest">Stock & Logistique</div>
        <div className="space-y-0.5">
          <Link href="/purchases" className={getLinkClass('/purchases')}>
            <Truck size={16} /> Réception (BR)
          </Link>
          <Link href="/purchases/history" className={getLinkClass('/purchases/history')}>
            <FileText size={16} /> Historique Achats
          </Link>
          <Link href="/suppliers" className={getLinkClass('/suppliers')}>
            <Truck size={16} /> Fournisseurs
          </Link>
        </div>
      </div>

      {/* SECTION INVENTAIRE */}
      <div>
        <div className="text-[9px] font-bold text-slate-500 uppercase px-3 mb-1.5 tracking-widest">Inventaire</div>
        <div className="space-y-0.5">
          <Link href="/inventory" className={getLinkClass('/inventory')}>
            <Package size={16} /> Inventaire Global
          </Link>
          <Link href="/inventory/articles" className={getLinkClass('/inventory/articles')}>
            <Boxes size={16} /> Articles
          </Link>
        </div>
      </div>

      {/* SECTION GESTION */}
      <div>
        <div className="text-[9px] font-bold text-slate-500 uppercase px-3 mb-1.5 tracking-widest">Pilotage</div>
        <div className="space-y-0.5">
          <Link href="/finance" className={getLinkClass('/finance')}>
            <BarChart3 size={16} /> Finances & Stats
          </Link>
          <Link href="/finance/expenses" className={getLinkClass('/finance/expenses')}>
            <FileText size={16} /> Gestion Dépenses
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${inter.className} bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 flex h-screen overflow-hidden transition-colors duration-300`}>
        <Providers>
          
          {!isPublicPage && (
            <>
              {/* MOBILE HEADER - Visible uniquement sur mobile */}
              <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900 border-b border-slate-800 z-50 flex items-center justify-between px-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                  aria-label="Toggle menu"
                >
                  {isMobileMenuOpen ? (
                    <X size={24} className="text-white" />
                  ) : (
                    <Menu size={24} className="text-white" />
                  )}
                </button>
                
                <h1 className="text-sm font-bold tracking-wider text-white">SHOP MANAGER</h1>
                
                <ThemeToggleIcon />
              </header>

              {/* OVERLAY pour mobile menu */}
              {isMobileMenuOpen && (
                <div 
                  className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
              )}

              {/* SIDEBAR DESKTOP - Caché sur mobile */}
              <aside className="hidden lg:flex w-60 bg-slate-900 text-white flex-col shadow-xl shrink-0 z-50 border-r border-slate-800">
                {/* HEADER COMPACT AVEC THEME TOGGLE */}
                <div className="p-4 border-b border-slate-700 bg-slate-950/30">
                  <div className="flex items-center justify-between mb-2">
                    <h1 className="text-lg font-bold tracking-wider text-white">SHOP MANAGER</h1>
                    <ThemeToggleIcon />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] text-slate-400 font-mono">v2.1 • ERP System</span>
                  </div>
                </div>
                
                {/* NAVIGATION COMPACTE */}
                <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
                  <NavigationContent />
                </nav>

                {/* FOOTER SIDEBAR COMPACT */}
                <div className="p-3 border-t border-slate-700 bg-slate-950/30">
                  <UserInfoLogout />
                  <div className="text-[9px] text-center text-slate-600 font-mono mt-2">
                    Server Status: OK
                  </div>
                </div>
              </aside>

              {/* MOBILE SIDEBAR - Slide-in depuis la gauche */}
              <aside 
                className={`lg:hidden fixed top-14 left-0 bottom-0 w-72 bg-slate-900 text-white flex flex-col shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
                  isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
              >
                {/* NAVIGATION MOBILE */}
                <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
                  <NavigationContent />
                </nav>

                {/* FOOTER MOBILE */}
                <div className="p-4 border-t border-slate-700 bg-slate-950/30">
                  <UserInfoLogout />
                  <div className="text-[9px] text-center text-slate-600 font-mono mt-2">
                    v2.1 • Server: OK
                  </div>
                </div>
              </aside>
            </>
          )}

          {/* MAIN CONTENT - Ajusté pour mobile */}
          <main className={`flex-1 overflow-auto relative bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-gray-100 ${
            isPublicPage 
              ? 'p-0' 
              : 'p-3 sm:p-4 md:p-6 pt-16 lg:pt-6'
          }`}>
            {children}
          </main>

        </Providers>
      </body>
    </html>
  );
}
