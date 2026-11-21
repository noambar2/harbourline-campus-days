import * as XLSX from 'xlsx'
import type { Inst } from '@/types'
import type { PlacementResult } from './placement'
import { REASON_LABEL } from './placement'
import { GROUP_LABEL, dayName, full } from './dates'

/**
 * Two sheets:
 *  1. "Chosen dates": one row per school × year group × chosen date (and a row
 *     for every school year group that got no date at all).
 *  2. "Student lists": every student with the date they were placed on, and the
 *     waitlisted students at the bottom with the reason.
 */
export function exportPlacement(res: PlacementResult, insts: Inst[], fileName = 'campus_days_placement.xlsx') {
  const instById = Object.fromEntries(insts.map(i => [i.id, i]))

  // sheet 1
  const datesRows: (string | number)[][] = [['School', 'School code', 'Year group', 'Date', 'Day', 'Students', 'Daily quota', 'Day total']]
  const dayTotal = Object.fromEntries(res.days.map(d => [d.d, d]))
  insts.filter(i => i.part).forEach(i => {
    ;(['bog', 'tz'] as const).forEach(g => {
      const picks = res.byInst[i.id]?.[g] || []
      picks.forEach(p => datesRows.push([i.name, i.code, GROUP_LABEL[g], full(p.d), dayName(p.d), p.count, dayTotal[p.d].capacity, dayTotal[p.d].total]))
      const col = res.collected.filter(c => c.student.inst === i.id && c.group === g)
      if (col.length) datesRows.push([i.name, i.code, GROUP_LABEL[g], picks.length ? 'Waitlist' : 'No date found', REASON_LABEL[col[0].reason], col.length, '', ''])
    })
  })

  // sheet 2
  const head = ['Date', 'Day', 'School', 'School code', 'Year group', 'Student no.', 'First name', 'Last name', 'Year', 'Class', 'Phone', 'Note']
  const stuRows: (string | number)[][] = [head]
  res.days.forEach(day => day.units.forEach(u => {
    const inst = instById[u.inst]
    u.students.forEach(s => stuRows.push([full(day.d), dayName(day.d), inst.name, inst.code, GROUP_LABEL[u.group], s.tz, s.fn, s.ln, s.cls, s.num, s.phone, s.note]))
  }))
  res.collected.forEach(c => {
    const inst = instById[c.student.inst]
    const s = c.student
    stuRows.push(['Waitlist', '', inst.name, inst.code, GROUP_LABEL[c.group], s.tz, s.fn, s.ln, s.cls, s.num, s.phone, REASON_LABEL[c.reason]])
  })

  const wb = XLSX.utils.book_new()
  const ws1 = XLSX.utils.aoa_to_sheet(datesRows)
  ws1['!cols'] = [28, 12, 12, 14, 26, 10, 12, 12].map(wch => ({ wch }))
  const ws2 = XLSX.utils.aoa_to_sheet(stuRows)
  ws2['!cols'] = [12, 7, 28, 11, 11, 13, 12, 12, 6, 7, 14, 32].map(wch => ({ wch }))
  ws2['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: stuRows.length - 1, c: head.length - 1 } }) }
  XLSX.utils.book_append_sheet(wb, ws1, 'Chosen dates')
  XLSX.utils.book_append_sheet(wb, ws2, 'Student lists')
  XLSX.writeFile(wb, fileName)
}
