"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Gestion mot de passe oublié
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMsg("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + "/login"
    });
    if (resetError) {
      setResetMsg(resetError.message);
    } else {
      setResetMsg("Un email de réinitialisation a été envoyé.");
    }
    setResetLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push("/"); 
      router.refresh();
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Shop Manager</h1>
          <p className="text-slate-500 dark:text-slate-400">Connectez-vous pour accéder à l'ERP</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Lien mot de passe oublié */}
          <div className="text-right">
            <button
              type="button"
              className="text-xs text-blue-600 hover:underline font-medium"
              onClick={() => setShowReset(!showReset)}
            >
              Mot de passe oublié ?
            </button>
          </div>

          {showReset && (
            <div className="mt-2 space-y-2">
              <input
                type="email"
                required
                placeholder="Votre email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm"
              />
              <button
                type="button"
                disabled={resetLoading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded text-sm font-medium"
                onClick={handleResetPassword}
              >
                {resetLoading ? "Envoi..." : "Envoyer le lien de réinitialisation"}
              </button>
              {resetMsg && <div className="text-xs text-center text-blue-600 mt-1">{resetMsg}</div>}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                type="email" 
                required
                className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 dark:text-white transition-colors"
                placeholder="admin@shop.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
              <input 
                type="password" 
                required
                className="w-full pl-10 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-blue-500 dark:text-white transition-colors"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-100 text-red-600 text-sm rounded-lg text-center font-medium">
              {errorMsg === "Invalid login credentials" ? "Email ou mot de passe incorrect" : errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
