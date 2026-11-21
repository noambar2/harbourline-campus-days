export type Group = 'bog' | 'tz'
/** School year level. `bog` = Year 12, `tz` = Year 11. */
export type Cls = '11' | '12'
export type InstStatus = 'done' | 'progress' | 'none'

export interface Disqualify {
  reason: string
  note: string
  by: 'office'
  byName: string
  at: string
}

export interface Student {
  key: string
  /** student number */
  tz: string
  fn: string
  ln: string
  inst: string
  cls: Cls
  num: string
  phone: string
  note: string
  dq: Disqualify | null
}

export interface PickedDate {
  d: string // ISO yyyy-mm-dd
  by: 'school' | 'office'
}

export interface Inst {
  id: string
  name: string
  code: string
  part: boolean
  status: InstStatus
  note: string
  noteAt?: string
  upd: { by: 'school' | 'office'; at: string } | null
  dates: Record<Group, PickedDate[]>
}

export interface Special {
  d: string
  desc: string
  quota: number // 0 = blocked
}
