import type { Group, Special } from '@/types'

/** Weeks start on Monday. */
export const WDN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const MONTHS = [
  { y: 2027, m: 1, label: 'February 2027' },
  { y: 2027, m: 2, label: 'March 2027' },
  { y: 2027, m: 3, label: 'April 2027' },
  { y: 2027, m: 4, label: 'May 2027' },
]
export const GROUP_LABEL: Record<Group, string> = { bog: 'Year 12', tz: 'Year 11' }
export const GROUP_CLS: Record<Group, '12' | '11'> = { bog: '12', tz: '11' }

export const pad = (n: number) => (n < 10 ? '0' : '') + n
const parts = (iso: string) => iso.split('-').map(Number)
/** Day of the week, Monday = 0. */
export const dow = (iso: string) => {
  const [y, m, d] = parts(iso)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}
export const ddmm = (iso: string) => {
  const p = iso.split('-')
  return p[2] + '/' + p[1]
}
export const full = (iso: string) => {
  const p = iso.split('-')
  return p[2] + '/' + p[1] + '/' + p[0]
}
export const dayLabel = (iso: string) => WDN[dow(iso)] + ' ' + ddmm(iso)
export const dayName = (iso: string) => WDN[dow(iso)]

export const specialMap = (specials: Special[]) => {
  const m: Record<string, Special> = {}
  specials.forEach(s => (m[s.d] = s))
  return m
}

export const nowStamp = () => {
  const d = new Date()
  return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}
