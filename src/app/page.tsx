import { redirect } from "next/navigation";

export default function Home() {
  // Rediriger vers l'historique des ventes (La "Tour de Contrôle")
  redirect("/sales/history");
}
