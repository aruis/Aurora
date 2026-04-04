type ExportCell = string | number | null | undefined

type CsvColumn<Row> = {
  title: string
  render: (row: Row) => ExportCell
}

export function downloadCsv<Row>(options: {
  filename: string
  columns: CsvColumn<Row>[]
  rows: Row[]
}) {
  const header = options.columns.map((column) => escapeCsvCell(column.title)).join(',')
  const body = options.rows
    .map((row) => options.columns.map((column) => escapeCsvCell(column.render(row))).join(','))
    .join('\n')

  const csv = `\uFEFF${header}${body ? `\n${body}` : ''}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = options.filename
  link.click()

  URL.revokeObjectURL(url)
}

function escapeCsvCell(value: ExportCell) {
  const resolved = value === null || value === undefined ? '' : String(value)
  const escaped = resolved.replaceAll('"', '""')

  return `"${escaped}"`
}
