import type { Inst, PickedDate, Special, Student } from '@/types'

const FN = ['Olivia', 'Jack', 'Charlotte', 'Noah', 'Mia', 'William', 'Isla', 'Oliver', 'Ava', 'Thomas', 'Grace', 'Lucas', 'Chloe', 'Henry', 'Zoe', 'Liam', 'Ruby', 'Ethan', 'Sophie', 'Leo']
const LN = ['Smith', 'Nguyen', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Kelly', 'Chen', 'Martin', 'Anderson', 'Patel', 'Walker', 'Murphy', 'Thompson', 'Ryan', 'Singh', "O'Brien", 'Campbell']
const PRE = ['0412', '0423', '0438', '0401', '0455']

/** Fake but stable students: `bog` in Year 12 and `tz` in Year 11. */
function gen(inst: string, bog: number, tz: number, k: number): Student[] {
  const out: Student[] = []
  const n = bog + tz
  for (let i = 0; i < n; i++) {
    const sid = String(300000000 + (((k * 1000 + i + 1) * 48271) % 600000000))
    const ph = String(100000 + (((i + 3) * (k + 11) * 7331) % 900000))
    out.push({
      key: inst + '-' + i,
      tz: sid,
      fn: FN[(i * 7 + k) % 20],
      ln: LN[(i * 5 + k * 3) % 18],
      inst,
      cls: i < bog ? '12' : '11',
      num: String(1 + ((i + k) % 4)),
      phone: PRE[(i + k) % 5] + ' ' + ph.slice(0, 3) + ' ' + ph.slice(3),
      note: '',
      dq: null,
    })
  }
  return out
}

export function mockStudents(): Student[] {
  const s = ([] as Student[]).concat(
    gen('i1', 60, 60, 1),
    gen('i2', 45, 45, 2),
    gen('i3', 35, 35, 3),
    gen('i4', 70, 40, 4),
    gen('i5', 26, 24, 5),
    gen('i6', 18, 22, 6),
  )
  s[11].dq = { reason: 'Registered by another school (duplicate)', note: 'Also on the Hillcrest High School list', by: 'office', byName: 'Harbourline Future Students', at: '21/01/2027' }
  return s
}

export function mockSchoolStudents(seed = 9): Student[] {
  const s = gen('s' + seed, 6, 6, seed)
  s.forEach((x, i) => (x.cls = i % 2 ? '11' : '12'))
  s[3].tz = '31245678'
  s[7].phone = ''
  s[5].dq = { reason: 'Not in Year 11 or 12', note: '', by: 'office', byName: 'Harbourline Future Students', at: '02/02/2027' }
  s[2].note = 'Needs wheelchair access'
  s[9].note = 'Recently arrived, may need a Mandarin interpreter'
  return s
}

const S = (d: string): PickedDate => ({ d, by: 'school' })
const O = (d: string): PickedDate => ({ d, by: 'office' })

export function mockInsts(): Inst[] {
  return [
    { id: 'i1', name: 'Hillcrest High School', code: '440123', part: true, status: 'done', note: "We'd like students to visit in the morning only, as they have trial exams in the afternoons.", noteAt: '13/01/2027', upd: { by: 'office', at: '21/01/2027' }, dates: { bog: [S('2027-02-16'), S('2027-02-23'), O('2027-03-02')], tz: [S('2027-02-17'), S('2027-02-24'), S('2027-03-03')] } },
    { id: 'i2', name: 'Bayview Secondary College', code: '441087', part: true, status: 'done', note: '', upd: { by: 'school', at: '17/01/2027' }, dates: { bog: [S('2027-02-23'), S('2027-03-09'), S('2027-03-16')], tz: [S('2027-02-24'), S('2027-03-10'), S('2027-03-17')] } },
    { id: 'i3', name: "St Clare's College", code: '442310', part: true, status: 'done', note: 'Both year groups will travel together on one bus, so we would prefer the Year 11 and Year 12 dates to be in the same week.', noteAt: '19/01/2027', upd: { by: 'school', at: '19/01/2027' }, dates: { bog: [S('2027-02-18'), S('2027-02-23'), S('2027-03-11')], tz: [S('2027-02-24'), S('2027-03-10'), S('2027-03-17'), S('2027-03-24')] } },
    { id: 'i4', name: 'Seacliff High School', code: '443502', part: true, status: 'done', note: '', upd: { by: 'school', at: '20/01/2027' }, dates: { bog: [S('2027-03-25'), S('2027-03-09')], tz: [S('2027-02-24'), S('2027-03-30'), S('2027-04-07')] } },
    { id: 'i5', name: 'Ridgeway Secondary College', code: '444218', part: true, status: 'progress', note: '', upd: null, dates: { bog: [], tz: [] } },
    { id: 'i6', name: 'Kurrajong High School', code: '445731', part: true, status: 'progress', note: '', upd: null, dates: { bog: [], tz: [] } },
    { id: 'i7', name: "St Michael's College", code: '446095', part: false, status: 'none', note: '', upd: null, dates: { bog: [], tz: [] } },
    { id: 'i8', name: 'Greenvale High School', code: '447640', part: true, status: 'none', note: '', upd: null, dates: { bog: [], tz: [] } },
  ]
}

export function mockSpecials(): Special[] {
  return [
    { d: '2027-02-18', desc: 'Staff training day', quota: 0 },
    { d: '2027-03-09', desc: 'Open Day set-up — reduced activities', quota: 60 },
    { d: '2027-03-25', desc: 'Graduation ceremonies', quota: 0 },
    { d: '2027-04-13', desc: "Vice-Chancellor's campus visit", quota: 80 },
  ]
}
