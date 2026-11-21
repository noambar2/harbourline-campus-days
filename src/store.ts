import { computed, reactive } from 'vue'
import type { Group, Inst, PickedDate, Special, Student } from '@/types'
import { mockInsts, mockSchoolStudents, mockSpecials, mockStudents } from '@/data/mock'
import { nowStamp } from '@/lib/dates'
import { placementSignature, runPlacement, type PlacementResult } from '@/lib/placement'

export type Modal =
  | { type: 'student'; key: string | null; draft: Student; err: string }
  | { type: 'dq'; key: string; reason: string; note: string }
  | { type: 'dates'; inst: string; group: Group; mi: number; draft: Record<Group, PickedDate[]> }
  | { type: 'special'; orig: string | null; draft: { d: string; desc: string; mode: 'block' | 'limit'; q: string }; err: string; back?: boolean }
  | { type: 'specials' }
  | { type: 'note'; inst: string }
  | null

export type OfficeTab = 'students' | 'dates' | 'insts' | 'placement'

export const OFFICE_NAME = 'Harbourline Future Students'
export const ACTIVE_YEAR = '2027'
/** Schools the "View as" toggle can show: one mid-registration, one that hasn't started. */
export const SCHOOL_ACTIVE = 'i5'
export const SCHOOL_NEW = 'i8'

/**
 * A school's own registration. step 0 = welcome screen (nothing done yet), 1–3 = wizard;
 * once sentAt is set the office data is the source of truth (see sendSchoolRegistration).
 */
export interface SchoolDraft {
  step: number
  uploaded: boolean
  students: Student[]
  dates: Record<Group, string[]>
  note: string
  sentAt: string
}
const draft = (step: number, uploaded: boolean, seed: number): SchoolDraft =>
  ({ step, uploaded, students: mockSchoolStudents(seed), dates: { bog: [], tz: [] }, note: '', sentAt: '' })

export const state = reactive({
  role: 'office' as 'office' | 'school',
  /** which school the school view shows */
  schoolId: SCHOOL_ACTIVE,
  tab: 'students' as OfficeTab,
  year: ACTIVE_YEAR,
  quota: 130,
  specials: mockSpecials() as Special[],
  insts: mockInsts() as Inst[],
  students: mockStudents() as Student[],
  modal: null as Modal,
  toast: '',
  placement: null as PlacementResult | null,
  placementRunning: false,
  // school view
  schools: {
    [SCHOOL_ACTIVE]: draft(2, true, 9),
    [SCHOOL_NEW]: draft(0, false, 13),
  } as Record<string, SchoolDraft>,
})

let toastTimer: ReturnType<typeof setTimeout> | undefined
export function flash(msg: string) {
  state.toast = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (state.toast = ''), 2600)
}

/** Closing a special-day form opened from the full list returns to that list. */
export const closeModal = () => {
  const m = state.modal
  state.modal = m && m.type === 'special' && m.back ? { type: 'specials' } : null
}

export function openSpecial(d: string | null, back = false) {
  const x = d ? state.specials.find(s => s.d === d)! : null
  state.modal = {
    type: 'special',
    orig: x ? x.d : null,
    draft: x ? { d: x.d, desc: x.desc, mode: x.quota === 0 ? 'block' : 'limit', q: x.quota === 0 ? '' : String(x.quota) } : { d: '', desc: '', mode: 'block', q: '' },
    err: '',
    back,
  }
}
export function deleteSpecial(d: string) {
  state.specials = state.specials.filter(s => s.d !== d)
  flash('Special date deleted')
}

export const instById = computed(() => Object.fromEntries(state.insts.map(i => [i.id, i])) as Record<string, Inst>)
export const partInsts = computed(() => state.insts.filter(i => i.part))
export const countOf = (id: string) => state.students.filter(s => s.inst === id && !s.dq).length

export const placementStale = computed(() =>
  !!state.placement && state.placement.signature !== placementSignature(state.insts, state.students, state.specials, state.quota),
)

export function runPlacementNow() {
  state.placement = runPlacement(state.insts, state.students, state.specials, state.quota, nowStamp())
}

/** Run with a short pause so it reads as an action, then report the outcome. */
export function runPlacementWithFeedback() {
  if (state.placementRunning) return
  state.placementRunning = true
  setTimeout(() => {
    runPlacementNow()
    state.placementRunning = false
    const r = state.placement!
    flash('Placement finished: ' + r.days.length + ' campus days, ' + r.collected.length + ' on the waitlist')
  }, 450)
}

export function resetSchoolStudents(id: string) {
  state.schools[id].students = mockSchoolStudents(id === SCHOOL_NEW ? 13 : 9)
}

export const today = () => nowStamp().split(' ')[0]

/**
 * First send of the school's registration: from now on the office data
 * (that institution's students, dates and note) is the
 * single source of truth for both views.
 */
export function sendSchoolRegistration(id: string) {
  const sc = state.schools[id]
  const inst = state.insts.find(i => i.id === id)!
  const at = today()
  state.students = [...state.students.filter(s => s.inst !== id), ...sc.students.map(s => ({ ...s, inst: id }))]
  inst.status = 'done'
  inst.dates = { bog: sc.dates.bog.map(d => ({ d, by: 'school' as const })), tz: sc.dates.tz.map(d => ({ d, by: 'school' as const })) }
  inst.note = sc.note.trim()
  inst.noteAt = inst.note ? at : undefined
  inst.upd = { by: 'school', at }
  sc.sentAt = at
}

/** Case-insensitive search. */
export const matches = (hay: string, q: string) => hay.toLowerCase().includes(q.toLowerCase())
