import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper format monnaie - VERSION CORRIGÉE
const formatMoney = (value: number): string => {
  const num = Number(value || 0);
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  
  // Remplacer les espaces insécables par des espaces normaux si nécessaire
  return formatted.replace(/\s/g, " ") + " DA";
};

// ===========================
// 1. PDF BON DE LIVRAISON (BL)
// ===========================
export async function generateBLPDF(
  saleId: string,
  supabase: any,
  action: "print" | "view" = "print"
) {
  const { data: saleData, error } = await supabase
    .from("sales")
    .select(
      `
      *,
      clients (nom, telephone),
      sale_items (
        quantite,
        prix_unitaire_vente,
        remise_pourcentage,
        total_ligne,
        products (nom, code_barre)
      )
    `
    )
    .eq("id", saleId)
    .single();

  if (error || !saleData) {
    console.error("Erreur récupération vente:", error);
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // EN-TÊTE
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BON DE LIVRAISON", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SHOP MANAGER ERP", pageWidth / 2, 24, { align: "center" });

  doc.setDrawColor(200);
  doc.line(20, 28, pageWidth - 20, 28);

  // INFOS
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Référence: ${saleData.reference}`, 20, 36);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Date: ${new Date(saleData.date_vente).toLocaleDateString(
      "fr-FR"
    )} ${new Date(saleData.date_vente).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    20,
    42
  );
  doc.text(
    `Client: ${saleData.clients?.nom || "Client Comptoir"}`,
    20,
    48
  );
  if (saleData.clients?.telephone) {
    doc.text(`Tél: ${saleData.clients.telephone}`, 20, 54);
  }

  // TABLEAU - avec formatage corrigé
  const tableData = saleData.sale_items.map((item: any) => {
    const pu = Number(item.prix_unitaire_vente);
    const total = Number(item.total_ligne);

    return [
      item.products?.code_barre || "-",
      item.products?.nom || "Article",
      String(item.quantite),
      formatMoney(pu),
      item.remise_pourcentage ? `${item.remise_pourcentage}%` : "-",
      formatMoney(total),
    ];
  });

  autoTable(doc, {
    startY: 62,
    head: [["Réf", "Désignation", "Qté", "P.U", "Remise", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "left" },
      1: { cellWidth: 70, halign: "left" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 25, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 20, right: 20 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // TOTAL
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    `TOTAL: ${formatMoney(Number(saleData.total_vente))}`,
    pageWidth - 20,
    finalY + 10,
    { align: "right" }
  );

  // PIED
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text(
    "Merci pour votre confiance",
    pageWidth / 2,
    287,
    { align: "center" }
  );

  // ACTION
  const blobUrl = doc.output("bloburl");
  if (action === "print") {
    const printWindow = window.open(blobUrl, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
      });
    }
  } else {
    window.open(blobUrl, "_blank");
  }
}

// ===========================
// 2. PDF BON DE RÉCEPTION (BR)
// ===========================
export async function generateBRPDF(
  purchaseId: string,
  supabase: any,
  action: "print" | "view" = "print"
) {
  const { data: purchaseData, error } = await supabase
    .from("purchases")
    .select(
      `
      *,
      suppliers: suppliers!purchases_fournisseur_fkey (nom),
      purchase_items (
        quantite,
        prix_achat_unitaire,
        total_ligne,
        products (nom, code_barre)
      )
    `
    )
    .eq("id", purchaseId)
    .single();

  if (error || !purchaseData) {
    console.error("Erreur récupération achat:", error);
    return;
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // EN-TÊTE
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BON DE RÉCEPTION", pageWidth / 2, 18, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("SHOP MANAGER ERP", pageWidth / 2, 24, { align: "center" });

  doc.setDrawColor(200);
  doc.line(20, 28, pageWidth - 20, 28);

  // INFOS
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Référence: ${purchaseData.reference}`, 20, 36);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Date: ${new Date(purchaseData.date_achat).toLocaleDateString(
      "fr-FR"
    )} ${new Date(purchaseData.date_achat).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    20,
    42
  );
  doc.text(
    `Fournisseur: ${purchaseData.suppliers?.nom || "N/A"}`,
    20,
    48
  );

  // TABLEAU - avec formatage corrigé
  const tableData = purchaseData.purchase_items.map((item: any) => {
    const pu = Number(item.prix_achat_unitaire);
    const total = Number(item.total_ligne);

    return [
      item.products?.code_barre || "-",
      item.products?.nom || "Article",
      String(item.quantite),
      formatMoney(pu),
      formatMoney(total),
    ];
  });

  autoTable(doc, {
    startY: 58,
    head: [["Réf", "Désignation", "Qté", "P.A Unitaire", "Total"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
      halign: "left",
    },
    columnStyles: {
      0: { cellWidth: 20, halign: "left" },
      1: { cellWidth: 70, halign: "left" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right", fontStyle: "bold" },
    },
    margin: { left: 20, right: 20 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 120;

  // TOTAL
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(
    `TOTAL: ${formatMoney(Number(purchaseData.total_achat))}`,
    pageWidth - 20,
    finalY + 10,
    { align: "right" }
  );

  // PIED
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120);
  doc.text(
    "Document généré automatiquement",
    pageWidth / 2,
    287,
    { align: "center" }
  );

  // ACTION
  const blobUrl = doc.output("bloburl");
  if (action === "print") {
    const printWindow = window.open(blobUrl, "_blank");
    if (printWindow) {
      printWindow.addEventListener("load", () => {
        printWindow.focus();
        printWindow.print();
      });
    }
  } else {
    window.open(blobUrl, "_blank");
  }
}