import * as XLSX from 'xlsx'

export function exportToCSV(
  data: Record<string, string | number | null | undefined>[],
  filename: string,
  headers?: Record<string, string>
) {
  if (data.length === 0) return

  const keys = Object.keys(data[0])
  const headerRow = keys.map((k) => (headers ? headers[k] || k : k)).join(',')

  const rows = data.map((row) =>
    keys
      .map((k) => {
        const val = row[k]
        if (val === null || val === undefined) return ''
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      .join(',')
  )

  const csv = [headerRow, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToJSON(data: unknown[], filename: string) {
  if (data.length === 0) return
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToExcel(
  data: Record<string, string | number | null | undefined>[],
  filename: string,
  headers?: Record<string, string>,
  sheetName: string = 'Sheet1'
) {
  if (data.length === 0) return

  // Convert data to worksheet format
  const wsData = data.map((row) => {
    const newRow: Record<string, string | number | null> = {}
    Object.keys(row).forEach((key) => {
      const headerLabel = headers?.[key] || key
      // Format dates nicely
      let value = row[key]
      if (value && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        value = new Date(value).toLocaleString()
      }
      newRow[headerLabel] = value as string | number | null
    })
    return newRow
  })

  // Get headers from first row or provided headers
  const headerKeys = headers ? Object.keys(headers) : (data.length > 0 ? Object.keys(data[0]) : [])
  const headerLabels = headerKeys.map((k) => headers?.[k] || k)

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(wsData, { header: headerLabels })

  // Set column widths
  ws['!cols'] = headerLabels.map(() => ({ wch: 20 }))

  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, filename)
}
