import type { Batch, Essay, Student } from '@/types'
import type { StatsResult } from '@/core/stats/classwide'

export async function exportToPdf(
  batch: Batch,
  essays: Essay[],
  roster: Student[],
  stats: StatsResult,
) {
  const map = new Map(roster.map(s => [s.id, s]))
  const win = window.open('', '_blank', 'width=900,height=1200')
  if (!win) throw new Error('瀏覽器阻擋新視窗，請允許彈出視窗後再試')

  const sorted = [...essays].sort(
    (a, b) =>
      (map.get(a.studentId ?? '')?.seatNo ?? 9999) -
      (map.get(b.studentId ?? '')?.seatNo ?? 9999),
  )
  const rows = sorted
    .map(e => {
      const s = e.studentId ? map.get(e.studentId) : undefined
      const f = e.teacherScores ?? e.aiScores
      const comment = (e.teacherComment ?? e.aiComment ?? '').replace(
        /[&<>]/g,
        ch =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch as '&' | '<' | '>'],
      )
      return `<tr>
      <td>${s?.seatNo ?? ''}</td>
      <td>${s?.name ?? e.ocrName ?? '未指派'}</td>
      <td>${f?.total?.toFixed(1) ?? ''}</td>
      <td>${comment}</td>
    </tr>`
    })
    .join('')

  win.document.write(`<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8">
<title>${batch.title} 班級報告</title>
<style>
  body{font-family:system-ui,"Noto Sans TC",sans-serif;padding:24px;color:#111;}
  h1{font-size:20px;margin:0 0 8px;}
  h2{font-size:16px;margin:16px 0 6px;}
  table{width:100%;border-collapse:collapse;font-size:12px;}
  th,td{border:1px solid #ccc;padding:4px 6px;text-align:left;vertical-align:top;}
  th{background:#f0f0f0;}
  .meta{margin:4px 0 12px;color:#555;font-size:13px;}
</style></head><body>
  <h1>${batch.title}</h1>
  <p class="meta">
    題目：${batch.topic}　人數：${stats.n}　平均總分：${stats.totalDistribution.mean.toFixed(2)}
  </p>
  <h2>個別分數與評語</h2>
  <table><thead><tr><th>座號</th><th>姓名</th><th>總分</th><th>評語</th></tr></thead><tbody>${rows}</tbody></table>
  <script>window.onload=()=>window.print();</script>
</body></html>`)
  win.document.close()
}
