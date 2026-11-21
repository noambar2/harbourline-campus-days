<script setup lang="ts">
import { computed, ref } from 'vue'
import { OFFICE_NAME, flash, instById, matches, resetSchoolStudents, sendSchoolRegistration, state, today } from '@/store'
import { GROUP_LABEL, dayName, full } from '@/lib/dates'
import { REASON_LABEL } from '@/lib/placement'
import Icon from '@/components/Icon.vue'
import WarnIcon from '@/components/WarnIcon.vue'
import Calendar from '@/components/Calendar.vue'
import DateChip from '@/components/DateChip.vue'
import type { Group, Student } from '@/types'

// App keys this view by schoolId, so it's fixed for the component's life
const sid = state.schoolId
const sc = state.schools[sid]
const sq = ref('')
const sCls = ref('')
const errOnly = ref(false)
const edit = ref<{ key: string; draft: Student; isNew: boolean } | null>(null)
const group = ref<Group>('bog')
const mi = ref(0)

/** Before the first send the school edits its own draft; after it, the office data. */
const sent = computed(() => !!sc.sentAt)
const mode = ref<'overview' | 'students' | 'dates'>('overview')
const inst = computed(() => instById.value[sid])
const list = computed<Student[]>({
  get: () => (sent.value ? state.students.filter(s => s.inst === sid) : sc.students),
  set: v => {
    if (sent.value) state.students = [...state.students.filter(s => s.inst !== sid), ...v]
    else sc.students = v
  },
})
const showStudents = computed(() => (sent.value ? mode.value === 'students' : sc.step === 2))
const showDates = computed(() => (sent.value ? mode.value === 'dates' : sc.step === 3))

const errsOf = (r: Student) => {
  const e: Partial<Record<'tz' | 'phone' | 'fn' | 'ln', string>> = {}
  if (!/^\d{9}$/.test(r.tz || '')) e.tz = 'Student number must be 9 digits'
  if (!r.phone) e.phone = 'Phone number missing'
  if (!r.fn) e.fn = 'First name missing'
  if (!r.ln) e.ln = 'Last name missing'
  return e
}
const hasErr = (r: Student) => Object.keys(errsOf(r)).length > 0
const errN = computed(() => list.value.filter(hasErr).length)
const dqN = computed(() => list.value.filter(r => r.dq).length)
const bogN = computed(() => list.value.filter(r => r.cls === '12' && !r.dq).length)
const tzN = computed(() => list.value.filter(r => r.cls === '11' && !r.dq).length)

const rows = computed(() => {
  const q = sq.value.trim()
  return list.value.filter(r => {
    if (edit.value?.key === r.key) return true
    if (sCls.value && r.cls !== sCls.value) return false
    if (errOnly.value && !hasErr(r)) return false
    if (q && !matches(r.tz + ' ' + r.fn + ' ' + r.ln + ' ' + r.phone, q)) return false
    return true
  })
})
const dqTitle = (r: Student) => r.dq ? 'Excluded by ' + r.dq.byName + ' on ' + r.dq.at + ' · Reason: ' + r.dq.reason + (r.dq.note ? ' — ' + r.dq.note : '') : ''
const savedMsg = (m: string) => flash(sent.value ? m + ' and sent to Harbourline' : m)
const touch = () => { if (sent.value) inst.value.upd = { by: 'school', at: today() } }

const startEdit = (r: Student) => (edit.value = { key: r.key, draft: { ...r }, isNew: false })
const saveEdit = () => {
  const e = edit.value!
  list.value = list.value.map(y => (y.key === e.key ? { ...e.draft } : y))
  edit.value = null
  touch()
  savedMsg('Changes saved')
}
const cancelEdit = () => {
  if (edit.value?.isNew) list.value = list.value.filter(y => y.key !== edit.value!.key)
  edit.value = null
}
const del = (r: Student) => { list.value = list.value.filter(y => y.key !== r.key); edit.value = null; touch(); savedMsg('Student removed from the list') }
const addStudent = () => {
  if (edit.value?.isNew) list.value = list.value.filter(y => y.key !== edit.value!.key)
  const blank: Student = { key: 'sn' + Date.now(), tz: '', fn: '', ln: '', cls: '12', num: '1', phone: '', note: '', inst: sent.value ? sid : 's', dq: null }
  list.value = [blank, ...list.value]
  edit.value = { key: blank.key, draft: { ...blank }, isNew: true }
  sq.value = ''; sCls.value = ''; errOnly.value = false
}

// ---- wizard ----
const go = (n: number) => { sc.step = n; edit.value = null }
const stepDefs = [['Upload student list', 'Excel file of your students'], ['Check students', 'Fix, add and remove'], ['Choose dates', 'Year 12 and Year 11 · note to us']]
const steps = computed(() => stepDefs.map(([label, sub], k) => {
  const n = k + 1
  const done = sc.step > n
  const on = sc.step === n
  const reach = n === 1 || (n === 2 && sc.uploaded) || (n === 3 && sc.uploaded && errN.value === 0)
  return { n, label, sub, done, on, locked: !(done && reach) }
}))

// sc.dates is the calendar's working copy: the wizard's picks, or a draft while editing after sending
const toggleDate = (iso: string) => {
  const cur = sc.dates[group.value]
  sc.dates[group.value] = cur.includes(iso) ? cur.filter(x => x !== iso) : [...cur, iso]
}
const removeDate = (g: Group, d: string) => (sc.dates[g] = sc.dates[g].filter(x => x !== d))
const sortedDates = (g: Group) => sc.dates[g].slice().sort()
const byOf = (g: Group, d: string) => (sent.value ? inst.value.dates[g].find(x => x.d === d)?.by : 'school')
const cantSend = computed(() => !sc.dates.bog.length || !sc.dates.tz.length)

const doUpload = () => {
  sc.uploaded = true
  if (inst.value.status === 'none') inst.value.status = 'progress'
  flash('File uploaded: ' + sc.students.length + ' students')
}
const fileName = computed(() => 'student_list_' + inst.value.name.replace(/ /g, '_') + '_2027.xlsx')
const replaceFile = () => { sc.uploaded = false; resetSchoolStudents(sid); edit.value = null }
const send = () => { sendSchoolRegistration(sid); mode.value = 'overview'; flash('Registration sent to Harbourline') }

// ---- management (after sending) ----
const openStudents = () => { mode.value = 'students'; edit.value = null; sq.value = ''; sCls.value = ''; errOnly.value = false }
const openDates = () => {
  sc.dates = { bog: inst.value.dates.bog.map(x => x.d), tz: inst.value.dates.tz.map(x => x.d) }
  group.value = 'bog'
  mode.value = 'dates'
}
const saveDates = () => {
  const keep = (g: Group) => sc.dates[g].map(d => inst.value.dates[g].find(x => x.d === d) || { d, by: 'school' as const })
  inst.value.dates = { bog: keep('bog'), tz: keep('tz') }
  touch()
  mode.value = 'overview'
  flash('Dates saved and sent to Harbourline')
}
const backToOverview = () => { edit.value = null; mode.value = 'overview' }

const noteDraft = ref('')
const noteEditing = ref(false)
const editNote = () => { noteDraft.value = inst.value.note; noteEditing.value = true }
const saveNote = () => {
  inst.value.note = noteDraft.value.trim()
  inst.value.noteAt = inst.value.note ? today() : undefined
  noteEditing.value = false
  touch()
  flash('Note sent to Harbourline')
}

const officeEdited = computed(() => (['bog', 'tz'] as Group[]).filter(g => inst.value.dates[g].some(x => x.by === 'office')))
const blockedPicked = computed(() => [...inst.value.dates.bog, ...inst.value.dates.tz].filter(x => state.specials.some(s => s.d === x.d && s.quota === 0)))

/** The placement result for this school, once the office has run it and included the school. */
const placed = computed(() => {
  const r = state.placement
  if (!r || !sent.value) return null
  const by = r.byInst[sid]
  const col = r.collected.filter(c => c.student.inst === sid)
  if (!by && !col.length) return null
  const groups = (['bog', 'tz'] as Group[]).map(g => ({ g, picks: by?.[g] || [], col: col.filter(c => c.group === g) }))
  return { runAt: r.runAt, groups, colN: col.length }
})
const requestChange = () => flash('Date change request sent to Harbourline')
</script>

<template>
  <div :class="'s-page' + (showStudents ? ' is-fit' : '')">
    <div style="display: flex; flex-direction: column; gap: 6px">
      <h1 style="margin: 0; font-size: 30px; font-weight: 700">Hello, {{ inst.name }}</h1>
      <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; color: #6D6E8D"><span>Campus Days registration · {{ OFFICE_NAME }} · Active year</span><span class="chip" style="background: #5D87FF; color: #fff; border-radius: 6px">2027</span></div>
    </div>

    <nav v-if="!sent && sc.step > 0" class="card" aria-label="Registration steps" style="display: flex; align-items: stretch; gap: 8px; padding: 6px 10px">
      <template v-for="(st, k) in steps" :key="st.n">
        <span v-if="k > 0" :class="'step-line' + (sc.step > k ? ' is-done' : '')" aria-hidden="true"></span>
        <button :class="'step' + (st.on ? ' is-on' : st.done ? ' is-done' : '')" :aria-current="st.on ? 'step' : undefined" :disabled="st.locked" @click="go(st.n)">
          <span class="step-n"><Icon v-if="st.done" name="check" :size="13" :sw="3" /><template v-else>{{ st.n }}</template></span>
          <span style="display: flex; flex-direction: column; gap: 1px; min-width: 0"><span class="step-l">{{ st.label }}</span><span class="step-s">{{ st.sub }}</span></span>
        </button>
      </template>
    </nav>

    <!-- step 0: a school that hasn't done anything yet -->
    <section v-if="!sent && sc.step === 0" class="card" style="padding: 36px 40px; display: flex; flex-direction: column; gap: 24px">
      <div style="display: flex; flex-direction: column; gap: 8px; max-width: 720px">
        <span class="chip chip-blue" style="align-self: flex-start">New registration · 2027</span>
        <h2 style="margin: 0; font-size: 24px; font-weight: 700">Welcome to Campus Days registration</h2>
        <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #6D6E8D">Harbourline University invites Year 11 and Year 12 students from {{ inst.name }} to a Campus Day. Registering takes a few minutes: upload your student list, check it and choose your preferred dates. After you send it, you can come back and update it at any time.</p>
      </div>
      <ol style="list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px">
        <li v-for="(st, k) in stepDefs" :key="k" style="display: flex; gap: 12px; padding: 16px 18px; border: 1px solid #EAEDEF; border-radius: 12px; background: #FCFDFF">
          <span class="step-n" style="border-color: #5D87FF; color: #5D87FF">{{ k + 1 }}</span>
          <span style="display: flex; flex-direction: column; gap: 3px"><strong style="font-size: 15px">{{ st[0] }}</strong><span style="font-size: 13px; color: #6D6E8D">{{ st[1] }}</span></span>
        </li>
      </ol>
      <div class="banner banner-info"><Icon name="info" :size="20" :sw="2" style="color: #5D87FF; flex-shrink: 0; margin-top: 1px" /><span>Have an Excel file of your students ready, using the template: student number, first name, last name, year, class, phone number.</span></div>
      <div style="display: flex; align-items: center; gap: 10px">
        <button class="btn btn-primary" @click="go(1)">Start registration</button>
        <button class="btn btn-ghost"><Icon name="download" :size="16" />Download template</button>
      </div>
    </section>

    <!-- step 1 -->
    <section v-if="!sent && sc.step === 1" class="card" aria-labelledby="s1-t">
      <div class="card-h"><h2 id="s1-t" class="card-t">Upload student list</h2><button class="link-btn" style="display: inline-flex; align-items: center; gap: 6px; font-size: 14px"><Icon name="download" :size="16" />Download template</button></div>
      <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px">
        <div v-if="!sc.uploaded" class="drop">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #EFF3FF; color: #5D87FF; display: flex; align-items: center; justify-content: center"><Icon name="upload" :size="26" /></div>
          <strong style="font-size: 17px">Drag your student list here</strong>
          <span style="font-size: 14px; color: #6D6E8D">or</span>
          <button class="btn btn-primary" @click="doUpload">Choose a file</button>
          <span style="font-size: 13px; color: #6D6E8D; max-width: 560px; line-height: 1.6">An Excel file (.xlsx) with the columns: student number, first name, last name, year, class, phone number, notes. We recommend using the template.</span>
        </div>
        <template v-else>
          <div style="display: flex; align-items: center; gap: 16px; padding: 16px 18px; border: 1px solid #EAEDEF; border-radius: 12px">
            <div style="width: 44px; height: 52px; border-radius: 6px; background: #E0F2E5; color: #2EAB50; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0">XLSX</div>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px">
              <strong style="font-size: 15px">{{ fileName }}</strong>
              <span style="font-size: 13.5px; color: #6D6E8D">{{ sc.students.length }} students · Year 12: {{ bogN }} · Year 11: {{ tzN }}</span>
            </div>
            <span v-if="errN" class="chip chip-none">{{ errN }} rows to fix</span>
            <span v-else class="chip chip-ok">All rows are valid</span>
            <button class="btn btn-ghost btn-sm" @click="replaceFile">Replace file</button>
          </div>
          <div class="banner banner-info"><Icon name="info" :size="20" :sw="2" style="color: #5D87FF; flex-shrink: 0; margin-top: 1px" /><span>Replacing the file removes every change made in the student table.</span></div>
        </template>
      </div>
      <div style="display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid #EAEDEF">
        <button class="btn btn-primary" :disabled="!sc.uploaded" @click="go(2)">Continue to check students</button>
      </div>
    </section>

    <!-- step 2 -->
    <div v-if="showStudents" class="s-fill">
      <button v-if="sent" class="link-btn" style="align-self: flex-start; display: inline-flex; align-items: center; gap: 4px" @click="backToOverview"><Icon name="left" :size="16" :sw="2" />Back to registration summary</button>
      <div v-if="sent && placed" class="banner banner-info" role="status"><Icon name="info" :size="20" :sw="2" style="color: #5D87FF; flex-shrink: 0; margin-top: 1px" /><span>Placement is already done. Changes to the list go to Harbourline, and we'll let you know if they affect your campus day.</span></div>
      <div v-if="errN || dqN" class="banner-row">
        <div v-if="errN" class="banner banner-err" role="alert" style="flex: 1 1 0; min-width: 0">
          <WarnIcon />
          <div style="flex: 1; display: flex; flex-direction: column; gap: 4px">
            <span>{{ errN === 1 ? 'One row has' : errN + ' rows have' }} missing or invalid details. {{ sent ? 'Fix them so your changes can be sent to Harbourline.' : 'Fix them before choosing dates.' }}</span>
            <button class="link-btn" style="align-self: flex-start" @click="errOnly = !errOnly">{{ errOnly ? 'Show all students' : 'Show only rows to fix' }}</button>
          </div>
        </div>
        <div v-if="dqN" class="banner banner-office" role="status" style="flex: 1 1 0; min-width: 0">
          <Icon name="building" :size="20" :sw="1.9" style="color: #AF52DE; flex-shrink: 0; margin-top: 1px" />
          <span style="flex: 1">{{ dqN === 1 ? 'One student was' : dqN + ' students were' }} excluded by Harbourline. Excluded students won't be invited and can't be edited. Contact us if you have questions.</span>
        </div>
      </div>
      <div class="toolbar">
        <div class="search">
          <Icon name="search" :size="18" :sw="2" />
          <input v-model="sq" type="search" aria-label="Search students" placeholder="Search by name, student no. or phone…" />
        </div>
        <select v-model="sCls" class="select" aria-label="Filter by year" style="width: 170px; height: 44px; border-color: transparent; box-shadow: 0 1px 2px rgba(0,0,0,.04); font-size: 15px"><option value="">All years</option><option value="11">Year 11</option><option value="12">Year 12</option></select>
        <button class="btn btn-primary" style="height: 44px" @click="addStudent"><Icon name="plus" :size="16" :sw="2.2" />Add student</button>
      </div>
      <div class="card fill-card">
        <div class="card-h" style="flex-shrink: 0"><h3 class="card-t">Students <span class="num" style="font-weight: 400; color: #6D6E8D">· {{ rows.length === list.length ? list.length + ' students' : rows.length + ' of ' + list.length }}</span></h3></div>
        <div class="fill-body scroll" role="table" aria-label="School students">
        <div class="tbl-head cols-ss" role="row"><span role="columnheader">Student no.</span><span role="columnheader">First name</span><span role="columnheader">Last name</span><span role="columnheader">Year</span><span role="columnheader">Class</span><span role="columnheader">Phone</span><span role="columnheader">Notes</span><span role="columnheader" style="text-align: right">Actions</span></div>
        <template v-for="r in rows" :key="r.key">
          <div v-if="edit?.key === r.key" class="tbl-row cols-ss is-edit" role="row">
            <input v-model="edit.draft.tz" :class="'input sm num' + (errsOf(edit.draft).tz ? ' is-err' : '')" aria-label="Student number" inputmode="numeric" />
            <input v-model="edit.draft.fn" class="input sm" aria-label="First name" />
            <input v-model="edit.draft.ln" class="input sm" aria-label="Last name" />
            <select v-model="edit.draft.cls" class="select sm" aria-label="Year"><option value="11">11</option><option value="12">12</option></select>
            <input v-model="edit.draft.num" class="input sm" aria-label="Class" inputmode="numeric" />
            <input v-model="edit.draft.phone" :class="'input sm num' + (errsOf(edit.draft).phone ? ' is-err' : '')" aria-label="Phone number" />
            <input v-model="edit.draft.note" class="input sm" aria-label="Notes" />
            <span style="display: flex; justify-content: flex-end; gap: 2px">
              <button class="icon-btn" aria-label="Save" style="color: #2EAB50" @click="saveEdit"><Icon name="check" :size="18" :sw="2.4" /></button>
              <button class="icon-btn" aria-label="Cancel" @click="cancelEdit"><Icon name="close" :size="18" :sw="2" /></button>
            </span>
          </div>
          <div v-else :class="'tbl-row cols-ss' + (r.dq ? ' is-dq' : hasErr(r) ? ' is-err' : '')" role="row">
            <span role="cell" class="num" :style="{ display: 'flex', alignItems: 'center', gap: '6px', color: errsOf(r).tz ? '#FF1D47' : 'inherit' }" :title="errsOf(r).tz"><svg v-if="errsOf(r).tz" width="14" height="14" viewBox="0 0 24 24" fill="#FF1D47" aria-label="Error"><path d="M12 3l10 18H2z" /></svg>{{ r.tz || '—' }}</span>
            <span role="cell" class="ell">{{ r.fn }}</span>
            <span role="cell" class="ell">{{ r.ln }}</span>
            <span role="cell">{{ r.cls }}</span>
            <span role="cell" class="num">{{ r.num }}</span>
            <span role="cell" class="num" :style="{ display: 'flex', alignItems: 'center', gap: '6px', color: errsOf(r).phone ? '#FF1D47' : 'inherit' }" :title="errsOf(r).phone"><svg v-if="errsOf(r).phone" width="14" height="14" viewBox="0 0 24 24" fill="#FF1D47" aria-label="Error"><path d="M12 3l10 18H2z" /></svg><span>{{ r.phone || 'Missing' }}</span></span>
            <span role="cell" style="min-width: 0">
              <span v-if="!r.dq" class="ell" style="display: block; color: #6D6E8D" :title="r.note">{{ r.note }}</span>
              <span v-else class="chip chip-none" :title="dqTitle(r)"><Icon name="ban" :size="12" :sw="2.4" />Excluded by Harbourline</span>
            </span>
            <span role="cell" style="display: flex; justify-content: flex-end">
              <template v-if="!r.dq">
                <button class="icon-btn" aria-label="Edit student" @click="startEdit(r)"><Icon name="edit" :size="17" /></button>
                <button class="icon-btn is-danger" aria-label="Remove student" @click="del(r)"><Icon name="trash" :size="17" /></button>
              </template>
              <span v-else style="width: 72px; display: inline-flex; justify-content: center; color: #ACACBE" role="img" aria-label="Excluded by Harbourline, can't be edited" title="Excluded by Harbourline, can't be edited"><Icon name="lock" :size="17" /></span>
            </span>
          </div>
        </template>
        <div v-if="!rows.length" class="empty">No students match your search</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px">
        <template v-if="sent">
          <button class="btn btn-primary" :disabled="errN > 0 || !!edit" @click="backToOverview">Done editing</button>
          <span style="font-size: 13.5px; color: #6D6E8D">{{ errN ? 'Fix the highlighted rows' : 'Every change is saved and sent to Harbourline straight away' }}</span>
        </template>
        <template v-else>
          <button class="btn btn-primary" :disabled="errN > 0" @click="go(3)">Continue to choose dates</button>
          <button class="btn btn-ghost" @click="go(1)">Back</button>
          <span v-if="errN" style="font-size: 13.5px; color: #6D6E8D">Fix the highlighted rows to continue</span>
        </template>
      </div>
    </div>

    <!-- step 3 -->
    <div v-if="showDates" style="display: flex; flex-direction: column; gap: 16px">
      <button v-if="sent" class="link-btn" style="align-self: flex-start; display: inline-flex; align-items: center; gap: 4px" @click="backToOverview"><Icon name="left" :size="16" :sw="2" />Back to registration summary (without saving)</button>
      <div class="s-cols">
        <section class="card" aria-labelledby="cal-t">
          <div class="card-h"><h2 id="cal-t" class="card-t">Choose campus day dates</h2></div>
          <div style="padding: 18px 24px 22px; display: flex; flex-direction: column; gap: 16px">
            <div style="display: flex; gap: 10px">
              <button v-for="g in (['bog', 'tz'] as const)" :key="g" class="grp-tab" :aria-pressed="group === g" @click="group = g"><span style="font-size: 15px; font-weight: 700">{{ g === 'bog' ? 'Year 12' : 'Year 11' }}</span><span class="num" style="font-size: 13px; color: #6D6E8D">{{ sc.dates[g].length }} of 4 chosen</span></button>
            </div>
            <Calendar v-model:mi="mi" :picked="sc.dates[group]" :max="4" @toggle="toggleDate" />
            <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12.5px; color: #6D6E8D; padding-top: 4px; border-top: 1px solid #EAEDEF">
              <span style="display: inline-flex; align-items: center; gap: 6px; padding-top: 10px"><span class="legend-dot" style="border-radius: 3px; background: #5D87FF"></span>Chosen</span>
              <span style="display: inline-flex; align-items: center; gap: 6px; padding-top: 10px"><span class="legend-dot" style="width: 6px; height: 6px; background: #FF8D28"></span>Reduced quota</span>
              <span style="display: inline-flex; align-items: center; gap: 6px; padding-top: 10px"><span style="color: #FF1D47; text-decoration: line-through">12</span>Blocked by Harbourline</span>
              <span style="display: inline-flex; align-items: center; gap: 6px; padding-top: 10px"><span style="color: #ACACBE">12</span>Weekend (no visits)</span>
            </div>
          </div>
        </section>
        <div style="display: flex; flex-direction: column; gap: 20px">
          <section class="card" aria-labelledby="sum-t">
            <div class="card-h"><h2 id="sum-t" class="card-t">Chosen dates</h2><span style="font-size: 13px; color: #6D6E8D">1–4 dates per year group, 3–4 recommended</span></div>
            <div style="padding: 16px 24px 20px; display: flex; flex-direction: column; gap: 16px">
              <div v-for="(g, k) in (['bog', 'tz'] as const)" :key="g" :style="'display: flex; flex-direction: column; gap: 8px' + (k ? '; padding-top: 14px; border-top: 1px solid #EAEDEF' : '')">
                <span style="font-size: 14px; font-weight: 600">{{ g === 'bog' ? 'Year 12' : 'Year 11' }} <span class="num" style="font-weight: 400; color: #6D6E8D">({{ g === 'bog' ? bogN : tzN }} students)</span></span>
                <div class="dates-wrap">
                  <DateChip v-for="d in sortedDates(g)" :key="d" :d="d" :by="byOf(g, d)" show-by removable @remove="removeDate(g, d)" />
                  <span v-if="!sc.dates[g].length" style="font-size: 13.5px; color: #ACACBE">No dates chosen yet</span>
                </div>
              </div>
            </div>
          </section>
          <section v-if="!sent" class="card" aria-labelledby="note-t">
            <div class="card-h"><h2 id="note-t" class="card-t">Note to Harbourline</h2><span style="font-size: 13px; color: #6D6E8D">Optional</span></div>
            <div style="padding: 16px 24px 20px">
              <textarea v-model="sc.note" class="textarea" rows="4" aria-labelledby="note-t" placeholder="e.g. We'd like students to visit in the morning only"></textarea>
            </div>
          </section>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px">
        <button v-if="sent" class="btn btn-primary" :disabled="cantSend" @click="saveDates">Save dates</button>
        <button v-if="sent" class="btn btn-ghost" @click="backToOverview">Cancel</button>
        <button v-if="!sent" class="btn btn-primary" :disabled="cantSend" @click="send">Send to Harbourline</button>
        <button v-if="!sent" class="btn btn-ghost" @click="go(2)">Back</button>
        <span v-if="cantSend" style="font-size: 13.5px; color: #6D6E8D">Choose at least one date for each year group</span>
      </div>
    </div>

    <!-- after sending: management page -->
    <template v-if="sent && mode === 'overview'">
      <section class="card" style="display: flex; align-items: center; gap: 16px; padding: 18px 24px">
        <div :style="{ width: '44px', height: '44px', borderRadius: '50%', background: placed ? '#F0F9E5' : '#EFF3FF', color: placed ? '#69C600' : '#5D87FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }"><Icon :name="placed ? 'check' : 'chat'" :size="22" :sw="2.2" /></div>
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px">
          <strong style="font-size: 17px">{{ placed ? 'Your campus days are confirmed' : 'Registration sent to Harbourline' }}</strong>
          <span style="font-size: 13.5px; color: #6D6E8D">Sent {{ sc.sentAt }}<template v-if="inst.upd"> · Last updated {{ inst.upd.at }} by {{ inst.upd.by === 'office' ? 'Harbourline' : 'your school' }}</template></span>
        </div>
        <span :class="placed ? 'chip chip-ok' : 'chip chip-prog'">{{ placed ? 'Placed' : 'Awaiting placement' }}</span>
      </section>

      <div v-if="officeEdited.length || dqN || blockedPicked.length" class="banner-row">
        <div v-if="blockedPicked.length" class="banner banner-err" role="alert">
          <WarnIcon />
          <span style="flex: 1">{{ blockedPicked.length === 1 ? 'One date you chose was' : blockedPicked.length + ' dates you chose were' }} blocked by Harbourline ({{ blockedPicked.map(x => full(x.d)).join(', ') }}). Please choose another date.</span>
          <button v-if="!placed" class="link-btn" @click="openDates">Edit dates</button>
        </div>
        <div v-if="officeEdited.length" class="banner banner-office" role="status">
          <Icon name="building" :size="20" :sw="1.9" style="color: #AF52DE; flex-shrink: 0; margin-top: 1px" />
          <span style="flex: 1">Harbourline updated the {{ officeEdited.map(g => g === 'bog' ? 'Year 12' : 'Year 11').join(' and ') }} dates. Edited dates are shown in purple.</span>
        </div>
        <div v-if="dqN" class="banner banner-office" role="status">
          <Icon name="ban" :size="20" :sw="1.9" style="color: #AF52DE; flex-shrink: 0; margin-top: 1px" />
          <span style="flex: 1">{{ dqN === 1 ? 'One student was excluded by Harbourline and won’t be invited.' : dqN + ' students were excluded by Harbourline and won’t be invited.' }}</span>
          <button class="link-btn" @click="openStudents">View</button>
        </div>
      </div>

      <!-- placement result -->
      <section v-if="placed" class="card" aria-labelledby="pl-t">
        <div class="card-h"><h2 id="pl-t" class="card-t">Confirmed campus days</h2><span class="num" style="font-size: 13px; color: #6D6E8D">Placement from {{ placed.runAt }}</span></div>
        <div style="padding: 16px 24px 20px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px">
          <div v-for="g in placed.groups" :key="g.g" style="display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border: 1px solid #EAEDEF; border-radius: 10px">
            <span style="font-size: 14px; font-weight: 600">{{ GROUP_LABEL[g.g] }}</span>
            <div v-for="p in g.picks" :key="p.d" style="display: flex; align-items: center; justify-content: space-between; gap: 10px">
              <span style="font-size: 18px; font-weight: 700">{{ dayName(p.d) }} {{ full(p.d) }}</span>
              <span class="chip chip-ok num">{{ p.count }} students</span>
            </div>
            <span v-if="!g.picks.length && !g.col.length" style="font-size: 13.5px; color: #ACACBE">No students in this year group</span>
            <div v-if="g.col.length" style="display: flex; align-items: center; justify-content: space-between; gap: 10px">
              <span style="font-size: 14px; color: #B85A00">{{ g.picks.length ? "Didn't fit on the date" : 'No date found' }}</span>
              <span class="chip chip-orange num" :title="REASON_LABEL[g.col[0].reason]">{{ g.col.length }} waitlisted</span>
            </div>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px; padding: 14px 24px; border-top: 1px solid #EAEDEF; font-size: 13.5px; color: #6D6E8D">
          <Icon name="lock" :size="16" />
          <span style="flex: 1">Harbourline set these dates and they can't be changed here.<template v-if="placed.colN"> We'll be in touch about a date for waitlisted students.</template></span>
          <button class="btn btn-ghost btn-sm" @click="requestChange">Request a change</button>
        </div>
      </section>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; align-items: start">
        <section class="card" aria-labelledby="ms-t">
          <div class="card-h"><h2 id="ms-t" class="card-t">Students</h2><button class="btn btn-ghost btn-sm" @click="openStudents"><Icon name="edit" :size="15" />Edit list</button></div>
          <div style="padding: 16px 24px 20px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
            <div style="display: flex; flex-direction: column; gap: 2px"><span class="lbl">Total active</span><strong class="num" style="font-size: 24px">{{ bogN + tzN }}</strong></div>
            <div style="display: flex; flex-direction: column; gap: 2px"><span class="lbl">Year 12</span><strong class="num" style="font-size: 24px">{{ bogN }}</strong></div>
            <div style="display: flex; flex-direction: column; gap: 2px"><span class="lbl">Year 11</span><strong class="num" style="font-size: 24px">{{ tzN }}</strong></div>
          </div>
          <div v-if="dqN" style="padding: 0 24px 18px; font-size: 13px; color: #AF52DE">+ {{ dqN }} excluded by Harbourline</div>
        </section>

        <section class="card" aria-labelledby="md-t">
          <div class="card-h">
            <h2 id="md-t" class="card-t">{{ placed ? 'Dates you chose' : 'Requested dates' }}</h2>
            <button v-if="!placed" class="btn btn-ghost btn-sm" @click="openDates"><Icon name="edit" :size="15" />Edit dates</button>
            <span v-else style="display: inline-flex; align-items: center; gap: 4px; font-size: 12.5px; color: #6D6E8D"><Icon name="lock" :size="14" />Locked after placement</span>
          </div>
          <div style="padding: 16px 24px 20px; display: flex; flex-direction: column; gap: 14px">
            <div v-for="(g, k) in (['bog', 'tz'] as const)" :key="g" :style="'display: flex; flex-direction: column; gap: 8px' + (k ? '; padding-top: 12px; border-top: 1px solid #EAEDEF' : '')">
              <span style="font-size: 13.5px; font-weight: 600">{{ GROUP_LABEL[g] }}</span>
              <div class="dates-wrap">
                <DateChip v-for="x in inst.dates[g].slice().sort((a, b) => (a.d < b.d ? -1 : 1))" :key="x.d" :d="x.d" :by="x.by" show-by />
                <span v-if="!inst.dates[g].length" style="font-size: 13px; color: #ACACBE">No dates</span>
              </div>
            </div>
          </div>
        </section>

        <section class="card" aria-labelledby="mn-t">
          <div class="card-h">
            <h2 id="mn-t" class="card-t">Note to Harbourline</h2>
            <button v-if="!noteEditing" class="btn btn-ghost btn-sm" @click="editNote"><Icon name="edit" :size="15" />{{ inst.note ? 'Edit' : 'Add note' }}</button>
          </div>
          <div style="padding: 16px 24px 20px; display: flex; flex-direction: column; gap: 10px">
            <template v-if="noteEditing">
              <textarea v-model="noteDraft" class="textarea" rows="4" aria-labelledby="mn-t" placeholder="e.g. We'd like students to visit in the morning only"></textarea>
              <div style="display: flex; gap: 8px"><button class="btn btn-primary btn-sm" @click="saveNote">Send</button><button class="btn btn-ghost btn-sm" @click="noteEditing = false">Cancel</button></div>
            </template>
            <template v-else>
              <p v-if="inst.note" style="margin: 0; font-size: 14px; line-height: 1.7">{{ inst.note }}</p>
              <span v-else style="font-size: 13.5px; color: #ACACBE">No note yet</span>
              <span v-if="inst.noteAt" class="num" style="font-size: 12px; color: #6D6E8D">Sent {{ inst.noteAt }}</span>
            </template>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
