import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

/**
 * Export des données financières en PDF
 */
export const exportFinanceToPDF = (
  title: string,
  kpis: Record<string, number>,
  tableData: any[],
  columns: Array<{ header: string; dataKey: string; align?: 'left' | 'center' | 'right' }>
) => {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 10

  // Titre
  doc.setFontSize(18)
  doc.text(title, margin, 15)

  // KPIs summary
  doc.setFontSize(11)
  let yPos = 25
  Object.entries(kpis).forEach(([key, value]) => {
    const text = `${key}: ${value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DA`
    doc.text(text, margin, yPos)
    yPos += 7
  })

  // Tableau
  yPos += 5
  autoTable(doc, {
    head: [columns.map(c => c.header)],
    body: tableData.map(row =>
      columns.map(col => {
        const value = row[col.dataKey]
        if (typeof value === 'number') return value.toLocaleString('fr-FR', { minimumFractionDigits: 2 })
        if (value instanceof Date) return value.toLocaleDateString('fr-FR')
        return String(value)
      })
    ),
    startY: yPos,
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.getHeight()
      const pageCount = (doc as any).internal.pages.length - 1
      doc.setFontSize(10)
      doc.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
    },
  })

  const filename = `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(filename)
}

/**
 * Export des données financières en Excel
 */
export const exportFinanceToExcel = (
  filename: string,
  sheets: Array<{
    name: string
    data: any[]
    columns?: Array<{ header: string; key: string }>
  }>
) => {
  const workbook = XLSX.utils.book_new()

  sheets.forEach(({ name, data, columns }) => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    
    // Set column widths
    if (columns) {
      const wscols = columns.map(col => ({ wch: 18 }))
      worksheet['!cols'] = wscols
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, name)
  })

  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

/**
 * Formate une date en format français
 */
export const formatDateFR = (date: string | Date) => {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Formate une devise en DA
 */
export const formatCurrency = (amount: number) => {
  return amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/**
 * Calcule la différence de pourcentage
 */
export const calculatePercentChange = (current: number, previous: number) => {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Formate la différence en pourcentage avec couleur
 */
export const formatPercentChange = (percent: number, isNegativeGood = false) => {
  const isPositive = percent >= 0
  const color = isNegativeGood ? (isPositive ? 'text-red-600' : 'text-green-600') : (isPositive ? 'text-green-600' : 'text-red-600')
  const arrow = isPositive ? '↑' : '↓'
  return { text: `${arrow} ${Math.abs(percent).toFixed(1)}%`, color }
}
