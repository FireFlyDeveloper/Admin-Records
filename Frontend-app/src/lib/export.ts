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
