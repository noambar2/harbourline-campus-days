import type { Group, Inst, Special, Student } from '@/types'
import { GROUP_CLS, specialMap } from './dates'

/**
 * Placement algorithm.
 *
 * Input: every participating institution, the dates each one picked per group
 * (Year 12 / Year 11), its active students, the default daily quota and the
 * special days (blocked or limited quota).
 *
 * Goal: as few arrival days as possible, with as many students as possible on
 * each day. Greedy, in the spirit of set cover:
 *   1. Every institution+group is a "unit" (its students + the dates it picked,
 *      minus blocked days).
 *   2. Repeatedly open the date that can take the most still-unplaced students
 *      (capped by that day's quota). Ties: more units that fit whole, then the
 *      earlier date.
 *   3. Fill the day: first units that have no other date left (as many of
 *      their students as fit), then whole units (fewest other options first,
 *      then the bigger ones), then split a unit if seats are left, so a school
 *      may end up on more than one date.
 *   4. Stop when no open date can take anyone. Whoever is left goes on the waitlist.
 */

export type CollectReason = 'not-done' | 'no-dates' | 'all-blocked' | 'no-room'

export const REASON_LABEL: Record<CollectReason, string> = {
  'not-done': 'School has not finished registering',
  'no-dates': 'No dates chosen',
  'all-blocked': 'All chosen dates are blocked',
  'no-room': 'No room on the chosen dates',
}

export interface UnitAssignment {
  inst: string
  group: Group
  students: Student[]
}

export interface DayResult {
  d: string
  capacity: number
  limited: boolean
  units: UnitAssignment[]
  total: number
}

export interface Collected {
  student: Student
  group: Group
  reason: CollectReason
}

export interface PlacementResult {
  runAt: string
  signature: string
  days: DayResult[]
  collected: Collected[]
  placedCount: number
  totalCount: number
  /** inst id → group → [{ d, count }] */
  byInst: Record<string, Record<Group, { d: string; count: number }[]>>
}

interface Unit {
  inst: string
  group: Group
  remaining: Student[]
  dates: string[]
  reason: CollectReason | null
}

/** Stable fingerprint of everything the algorithm reads, to tell when results are stale. */
export function placementSignature(insts: Inst[], students: Student[], specials: Special[], quota: number) {
  return JSON.stringify({
    q: quota,
    sp: specials.map(s => [s.d, s.quota]).sort(),
    i: insts.map(i => [i.id, i.part, i.status, i.dates.bog.map(x => x.d).sort(), i.dates.tz.map(x => x.d).sort()]),
    s: students.map(s => [s.key, s.inst, s.cls, !!s.dq]),
  })
}

export function runPlacement(insts: Inst[], students: Student[], specials: Special[], quota: number, runAt: string): PlacementResult {
  const sp = specialMap(specials)
  const capOf = (d: string) => (sp[d] ? sp[d].quota : quota)
  const order = (a: Student, b: Student) => +a.num - +b.num || a.ln.localeCompare(b.ln, 'en-AU') || a.fn.localeCompare(b.fn, 'en-AU')

  // 1. build units
  const units: Unit[] = []
  insts
    .filter(i => i.part)
    .forEach(i => {
      ;(['bog', 'tz'] as Group[]).forEach(g => {
        const list = students.filter(s => s.inst === i.id && !s.dq && s.cls === GROUP_CLS[g]).sort(order)
        if (!list.length) return
        const picked = Array.from(new Set(i.dates[g].map(x => x.d)))
        const usable = picked.filter(d => capOf(d) > 0)
        let reason: CollectReason | null = null
        if (i.status !== 'done') reason = 'not-done'
        else if (!picked.length) reason = 'no-dates'
        else if (!usable.length) reason = 'all-blocked'
        units.push({ inst: i.id, group: g, remaining: list, dates: reason ? [] : usable, reason })
      })
    })

  const live = () => units.filter(u => !u.reason && u.remaining.length)
  const used = new Set<string>()
  const days: DayResult[] = []

  // 2–3. greedily open days
  for (;;) {
    const cands = new Map<string, Unit[]>()
    live().forEach(u => u.dates.forEach(d => {
      if (used.has(d)) return
      if (!cands.has(d)) cands.set(d, [])
      cands.get(d)!.push(u)
    }))
    if (!cands.size) break

    let best: { d: string; score: number; whole: number } | null = null
    cands.forEach((us, d) => {
      const cap = capOf(d)
      const demand = us.reduce((a, u) => a + u.remaining.length, 0)
      const score = Math.min(cap, demand)
      // how many units fit whole, smallest first
      let left = cap
      let whole = 0
      us.map(u => u.remaining.length).sort((a, b) => a - b).forEach(n => { if (n <= left) { left -= n; whole++ } })
      if (!best || score > best.score || (score === best.score && (whole > best.whole || (whole === best.whole && d < best.d)))) best = { d, score, whole }
    })
    const pick = best as { d: string; score: number; whole: number } | null
    if (!pick || pick.score <= 0) break

    const d = pick.d
    used.add(d)
    let left = capOf(d)
    const alts = (u: Unit) => u.dates.filter(x => !used.has(x)).length
    const queue = cands.get(d)!.slice().sort((a, b) => alts(a) - alts(b) || b.remaining.length - a.remaining.length)
    const day: DayResult = { d, capacity: capOf(d), limited: !!sp[d], units: [], total: 0 }
    const take = (u: Unit, n: number) => {
      const got = u.remaining.slice(0, n)
      u.remaining = u.remaining.slice(n)
      day.units.push({ inst: u.inst, group: u.group, students: got })
      day.total += got.length
      left -= got.length
    }
    // units with no other date left come first, even if only part of them fits
    queue.forEach(u => { if (!alts(u) && left > 0) take(u, Math.min(left, u.remaining.length)) })
    // then whole units that fit, then split one to use up the leftover seats
    queue.forEach(u => { if (u.remaining.length && u.remaining.length <= left) take(u, u.remaining.length) })
    queue.forEach(u => { if (left > 0 && u.remaining.length) take(u, Math.min(left, u.remaining.length)) })
    if (day.total) days.push(day)
  }

  // 4. whoever is left goes on the waitlist
  const collected: Collected[] = []
  units.forEach(u => u.remaining.forEach(s => collected.push({ student: s, group: u.group, reason: u.reason || 'no-room' })))

  days.sort((a, b) => (a.d < b.d ? -1 : 1))
  const byInst: PlacementResult['byInst'] = {}
  days.forEach(day => day.units.forEach(ua => {
    byInst[ua.inst] ??= { bog: [], tz: [] }
    byInst[ua.inst][ua.group].push({ d: day.d, count: ua.students.length })
  }))

  const placedCount = days.reduce((a, d) => a + d.total, 0)
  const totalCount = placedCount + collected.length

  return {
    runAt,
    signature: placementSignature(insts, students, specials, quota),
    days,
    collected,
    placedCount,
    totalCount,
    byInst,
  }
}
