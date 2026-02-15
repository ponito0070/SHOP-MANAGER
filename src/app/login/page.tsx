"use client";
import { useState, useEffect } from "react";
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

  // Vérifier les erreurs dans l'URL (token expiré, etc.)
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');
    
    if (error) {
      if (error === 'access_denied' && errorDescription?.includes('expired')) {
        setErrorMsg("Le lien de réinitialisation a expiré. Veuillez en demander un nouveau.");
        setShowReset(true);
      }
      // Nettoyer l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetMsg("");
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (resetError) {
      setResetMsg(resetError.message);
    } else {
      setResetMsg("✓ Un email de réinitialisation a été envoyé. Vérifiez votre boîte de réception.");
    }
    setResetLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setShowReset(false);

    const { error } = await supabase.auth.signInWithPassword({
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

  const isInvalidCredentials = errorMsg === "Invalid login credentials";

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-900">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">
            Shop Manager
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Connectez-vous pour accéder à l'ERP
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {/* Champ Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email
            </label>
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

          {/* Champ Mot de passe */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Mot de passe
            </label>
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

          {/* Message d'erreur avec lien "Oublié ?" */}
          {errorMsg && (
            <div className="space-y-2">
              <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-sm flex-wrap">
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {isInvalidCredentials ? "Email ou mot de passe incorrect" : errorMsg}
                  </span>
                  {(isInvalidCredentials || errorMsg.includes("expiré")) && (
                    <>
                      <span className="text-red-400">•</span>
                      <button
                        type="button"
                        className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        onClick={() => setShowReset(!showReset)}
                      >
                        Oublié ?
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formulaire de réinitialisation */}
          {showReset && (
            <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                Entrez votre email pour recevoir un lien de réinitialisation
              </p>
              <input
                type="email"
                required
                placeholder="Votre email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm dark:text-white outline-none focus:border-blue-500 transition-colors"
              />
              <button
                type="button"
                disabled={resetLoading}
                onClick={handleResetPassword}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {resetLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Envoi...
                  </>
                ) : (
                  "Envoyer le lien"
                )}
              </button>
              {resetMsg && (
                <div className={`text-sm text-center font-medium ${
                  resetMsg.includes("✓") 
                    ? "text-green-600 dark:text-green-400" 
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {resetMsg}
                </div>
              )}
            </div>
          )}

          {/* Bouton de connexion */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg transition-all flex justify-center items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Connexion...
              </>
            ) : (
              "Se connecter"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}