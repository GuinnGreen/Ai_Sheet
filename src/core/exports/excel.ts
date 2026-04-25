import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { Batch, Essay, Student } from '@/types'

export async function exportToExcel(
  batch: Batch,
  essays: Essay[],
  roster: Student[],
) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(batch.title.slice(0, 30))
  const dims = batch.rubric.dimensions.map(d => d.name)
  ws.columns = [
    { header: '座號', key: 'seatNo', width: 6 },
    { header: '姓名', key: 'name', width: 10 },
    ...dims.map(d => ({ header: d, key: d, width: 10 })),
    { header: '錯字扣分', key: 'typo', width: 8 },
    { header: '字數扣分', key: 'length', width: 8 },
    { header: '總分', key: 'total', width: 6 },
    { header: '評語', key: 'comment', width: 60 },
    { header: '已老師確認', key: 'reviewed', width: 10 },
  ]
  const map = new Map(roster.map(s => [s.id, s]))
  const sorted = [...essays].sort(
    (a, b) =>
      (map.get(a.studentId ?? '')?.seatNo ?? 9999) -
      (map.get(b.studentId ?? '')?.seatNo ?? 9999),
  )
  for (const e of sorted) {
    const s = e.studentId ? map.get(e.studentId) : undefined
    const f = e.teacherScores ?? e.aiScores
    const row: Record<string, unknown> = {
      seatNo: s?.seatNo ?? '',
      name: s?.name ?? e.ocrName ?? '未指派',
      typo: f?.typoDeduction ?? 0,
      length: f?.lengthDeduction ?? 0,
      total: f?.total ?? '',
      comment: e.teacherComment ?? e.aiComment ?? '',
      reviewed: e.status === 'reviewed' ? '✓' : '',
    }
    for (const d of dims) row[d] = f?.dimensionScores[d] ?? ''
    ws.addRow(row)
  }
  const buf = await wb.xlsx.writeBuffer()
  saveAs(new Blob([buf]), `${batch.title}.xlsx`)
}
