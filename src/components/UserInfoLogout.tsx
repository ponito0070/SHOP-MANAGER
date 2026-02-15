"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { LogOut, User, Loader2 } from "lucide-react";

export default function UserInfoLogout() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        setEmail(data.user.email);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="space-y-2">
      {/* Informations utilisateur - Version compacte */}
      <div className="flex items-center gap-2 px-2.5 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
          <User size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-slate-400">Connecté</div>
          <div className="text-[11px] text-white font-mono truncate">{email || "..."}</div>
        </div>
      </div>

      {/* Bouton de déconnexion compact */}
      <button
        onClick={handleLogout}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white rounded-lg transition-all text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Déconnexion...
          </>
        ) : (
          <>
            <LogOut size={14} className="group-hover:rotate-12 transition-transform" />
            Se déconnecter
          </>
        )}
      </button>
    </div>
  );
}