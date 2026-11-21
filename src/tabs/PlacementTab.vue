<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { instById, matches, partInsts, placementStale, runPlacementWithFeedback as run, state } from '@/store'
import { GROUP_LABEL, dayLabel, full, dayName } from '@/lib/dates'
import { REASON_LABEL, type CollectReason } from '@/lib/placement'
import Icon from '@/components/Icon.vue'
import type { Group, Student } from '@/types'

const props = defineProps<{ q: string }>()

const view = ref<'inst' | 'date' | 'collect'>('inst')
const open = ref<Record<string, boolean>>({})
const toggle = (k: string) => (open.value[k] = !open.value[k])

const res = computed(() => state.placement)
watch(res, () => (open.value = {}))

const q = computed(() => props.q.trim())
const stuMatch = (s: Student) => !q.value || matches(s.tz + ' ' + s.fn + ' ' + s.ln, q.value)
const instMatch = (id: string) => !q.value || matches(instById.value[id].name + ' ' + instById.value[id].code, q.value)

const pickedDateCount = computed(() => new Set(partInsts.value.filter(i => i.status === 'done').flatMap(i => [...i.dates.bog, ...i.dates.tz].map(x => x.d))).size)
const kpi = computed(() => {
  const r = res.value!
  return {
    days: r.days.length,
    placed: r.placedCount,
    total: r.totalCount,
    avg: r.days.length ? Math.round(r.placedCount / r.days.length) : 0,
    collected: r.collected.length,
  }
})

// --- by institution ---
const instRows = computed(() => {
  const r = res.value
  if (!r) return []
  return partInsts.value
    .map(i => {
      const groups = (['bog', 'tz'] as Group[]).map(g => {
        const picks = r.byInst[i.id]?.[g] || []
        const col = r.collected.filter(c => c.student.inst === i.id && c.group === g)
        const lists = picks.map(p => {
          const day = r.days.find(d => d.d === p.d)!
          const students = day.units.filter(u => u.inst === i.id && u.group === g).flatMap(u => u.students)
          return { d: p.d, count: p.count, students }
        })
        return { g, picks, col, lists }
      })
      const colN = groups.reduce((a, g) => a + g.col.length, 0)
      const hasStudents = groups.some(g => g.picks.length || g.col.length)
      const matchStu = q.value && groups.some(g => g.lists.some(l => l.students.some(stuMatch)) || g.col.some(c => stuMatch(c.student)))
      return { i, groups, colN, hasStudents, show: instMatch(i.id) || matchStu }
    })
    .filter(x => x.hasStudents && x.show)
})

// --- by date ---
const dateRows = computed(() => {
  const r = res.value
  if (!r) return []
  return r.days
    .map(d => {
      const insts = d.units.map(u => ({ ...u, name: instById.value[u.inst].name }))
      const show = !q.value || insts.some(u => instMatch(u.inst) || u.students.some(stuMatch)) || full(d.d).includes(q.value)
      return { ...d, insts, pct: Math.min(100, Math.round((d.total * 100) / d.capacity)), show }
    })
    .filter(d => d.show)
})

// --- waitlist ---
const reasonCounts = computed(() => {
  const m: Partial<Record<CollectReason, number>> = {}
  res.value?.collected.forEach(c => (m[c.reason] = (m[c.reason] || 0) + 1))
  return Object.entries(m) as [CollectReason, number][]
})
const reasonFilter = ref<CollectReason | ''>('')
const collectRows = computed(() =>
  (res.value?.collected || []).filter(c => (!reasonFilter.value || c.reason === reasonFilter.value) && (stuMatch(c.student) || instMatch(c.student.inst))),
)
const reasonCls = (r: CollectReason) => (r === 'no-room' ? 'chip chip-orange' : r === 'not-done' ? 'chip chip-gray' : 'chip chip-none')
</script>

<template>
  <div v-if="res && placementStale" class="banner banner-err" role="alert" style="flex-shrink: 0">
    <Icon name="info" :size="20" :sw="2" style="color: #FF1D47; flex-shrink: 0; margin-top: 1px" />
    <span style="flex: 1">Data has changed since the last run (students, dates or quotas). These results are out of date.</span>
    <button class="link-btn" @click="run">Run again</button>
  </div>

  <!-- empty -->
  <section v-if="!res" class="card fill-card" style="align-items: center; justify-content: center; padding: 40px; text-align: center; gap: 12px">
    <strong style="font-size: 18px">The placement hasn't been run yet</strong>
    <p style="margin: 0; max-width: 560px; font-size: 14.5px; line-height: 1.7; color: #6D6E8D">
      The algorithm takes every student and the dates each school chose, and gives each school the date that means as few campus days as possible with as many students as possible on each day, without going over the daily quota.
      A school can get more than one date if there isn't room for everyone on one day. Students without a date go on the waitlist.
    </p>
  </section>

  <template v-else>
    <div class="kpis">
      <div class="kpi"><span class="lbl">Campus days</span><span class="kpi-v">{{ kpi.days }}</span><span class="kpi-s">of {{ pickedDateCount }} dates schools chose</span></div>
      <div class="kpi"><span class="lbl">Students placed</span><span class="kpi-v">{{ kpi.placed }}</span><span class="kpi-s">of {{ kpi.total }} active students</span></div>
      <div class="kpi"><span class="lbl">Average students per day</span><span class="kpi-v">{{ kpi.avg }}</span><span class="kpi-s">Daily quota {{ state.quota }}</span></div>
      <button class="kpi is-warn" @click="view = 'collect'"><span class="lbl">Waitlist</span><span class="kpi-v">{{ kpi.collected }}</span><span class="kpi-s">Students with no date →</span></button>
    </div>

    <div class="card fill-card">
      <div class="card-h" style="flex-shrink: 0">
        <div class="seg-tabs" role="tablist" aria-label="Results view" style="box-shadow: none; background: #F5F5F7">
          <button class="seg-tab" role="tab" :aria-pressed="view === 'inst'" :aria-selected="view === 'inst'" @click="view = 'inst'">By school</button>
          <button class="seg-tab" role="tab" :aria-pressed="view === 'date'" :aria-selected="view === 'date'" @click="view = 'date'">By date <span class="cnt">({{ kpi.days }})</span></button>
          <button class="seg-tab" role="tab" :aria-pressed="view === 'collect'" :aria-selected="view === 'collect'" @click="view = 'collect'">Waitlist <span class="cnt">({{ kpi.collected }})</span></button>
        </div>
        <div v-if="view === 'collect'" style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end">
          <button :class="'chip ' + (reasonFilter === '' ? 'chip-blue' : 'chip-gray')" style="border: none; cursor: pointer" @click="reasonFilter = ''">All · {{ kpi.collected }}</button>
          <button v-for="[r, n] in reasonCounts" :key="r" :class="'chip ' + (reasonFilter === r ? 'chip-blue' : 'chip-gray')" style="border: none; cursor: pointer" @click="reasonFilter = reasonFilter === r ? '' : r">{{ REASON_LABEL[r] }} · {{ n }}</button>
        </div>
      </div>

      <!-- by institution -->
      <div v-if="view === 'inst'" class="fill-body scroll" role="table" aria-label="Results by school">
        <div class="tbl-head cols-pi" role="row"><span role="columnheader">School</span><span role="columnheader">Year 12</span><span role="columnheader">Year 11</span><span role="columnheader">Waitlist</span><span role="columnheader" class="sr-only">Details</span></div>
        <template v-for="row in instRows" :key="row.i.id">
          <div class="tbl-row cols-pi" role="row" style="padding-top: 12px; padding-bottom: 12px; align-items: start">
            <div role="cell" style="display: flex; flex-direction: column; gap: 2px; padding-top: 3px"><span style="font-weight: 600">{{ row.i.name }}</span><span class="num" style="font-size: 12.5px; color: #6D6E8D">Code {{ row.i.code }}</span></div>
            <div v-for="g in row.groups" :key="g.g" role="cell" class="dates-wrap">
              <span v-for="p in g.picks" :key="p.d" class="res-chip" :title="full(p.d) + ' · ' + p.count + ' students'">{{ dayLabel(p.d) }}<span class="n">{{ p.count }}</span></span>
              <span v-if="!g.picks.length && g.col.length" class="res-chip is-none" :title="REASON_LABEL[g.col[0].reason]">No date found</span>
              <span v-if="!g.picks.length && !g.col.length" style="font-size: 13px; color: #ACACBE; padding-top: 4px">No students</span>
            </div>
            <div role="cell" style="padding-top: 3px"><span v-if="row.colN" class="chip chip-orange num">{{ row.colN }}</span><span v-else style="color: #ACACBE">—</span></div>
            <div role="cell" style="display: flex; justify-content: flex-end"><button class="icon-btn" :aria-expanded="!!open['i' + row.i.id]" :aria-label="'Student lists for ' + row.i.name" @click="toggle('i' + row.i.id)"><Icon name="down" :size="18" :sw="2" :class="'chev' + (open['i' + row.i.id] ? ' is-open' : '')" /></button></div>
          </div>
          <div v-if="open['i' + row.i.id]" class="sub-panel">
            <template v-for="g in row.groups" :key="g.g">
              <div v-for="l in g.lists" :key="l.d" style="display: flex; flex-direction: column; gap: 8px">
                <strong style="font-size: 14px">{{ GROUP_LABEL[g.g] }} · {{ dayName(l.d) }} {{ full(l.d) }} <span class="num" style="font-weight: 400; color: #6D6E8D">({{ l.count }} students)</span></strong>
                <div class="mini-tbl">
                  <div class="tbl-head cols-pst"><span>Student no.</span><span>First name</span><span>Last name</span><span>Year</span><span>Class</span><span>Phone</span></div>
                  <div v-for="s in l.students" :key="s.key" class="tbl-row cols-pst"><span class="num">{{ s.tz }}</span><span class="ell">{{ s.fn }}</span><span class="ell">{{ s.ln }}</span><span>{{ s.cls }}</span><span class="num">{{ s.num }}</span><span class="num">{{ s.phone }}</span></div>
                </div>
              </div>
              <div v-if="g.col.length" style="display: flex; flex-direction: column; gap: 8px">
                <strong style="font-size: 14px; color: #B85A00">{{ GROUP_LABEL[g.g] }} · Waitlist <span class="num" style="font-weight: 400">({{ g.col.length }} students · {{ REASON_LABEL[g.col[0].reason] }})</span></strong>
                <div class="mini-tbl">
                  <div class="tbl-head cols-pst"><span>Student no.</span><span>First name</span><span>Last name</span><span>Year</span><span>Class</span><span>Phone</span></div>
                  <div v-for="c in g.col" :key="c.student.key" class="tbl-row cols-pst"><span class="num">{{ c.student.tz }}</span><span class="ell">{{ c.student.fn }}</span><span class="ell">{{ c.student.ln }}</span><span>{{ c.student.cls }}</span><span class="num">{{ c.student.num }}</span><span class="num">{{ c.student.phone }}</span></div>
                </div>
              </div>
            </template>
          </div>
        </template>
        <div v-if="!instRows.length" class="empty">No schools match your search</div>
      </div>

      <!-- by date -->
      <div v-else-if="view === 'date'" class="fill-body scroll" role="table" aria-label="Results by date">
        <div class="tbl-head cols-pd" role="row"><span role="columnheader">Date</span><span role="columnheader">Students</span><span role="columnheader">Quota used</span><span role="columnheader">Schools</span><span role="columnheader" class="sr-only">Details</span></div>
        <template v-for="d in dateRows" :key="d.d">
          <div class="tbl-row cols-pd" role="row" style="padding-top: 12px; padding-bottom: 12px">
            <div role="cell" style="display: flex; flex-direction: column; gap: 2px"><span style="font-weight: 600">{{ dayName(d.d) }} {{ full(d.d) }}</span><span v-if="d.limited" style="font-size: 12.5px; color: #A38700">Reduced quota · {{ state.specials.find(s => s.d === d.d)?.desc }}</span></div>
            <span role="cell" class="num" style="font-size: 16px; font-weight: 700">{{ d.total }}</span>
            <div role="cell" style="display: flex; flex-direction: column; gap: 6px"><div class="bar"><span :class="d.pct >= 100 ? 'is-full' : ''" :style="{ width: d.pct + '%' }"></span></div><span class="num" style="font-size: 12px; color: #6D6E8D">{{ d.total }} / {{ d.capacity }}</span></div>
            <div role="cell" class="dates-wrap"><span v-for="u in d.insts" :key="u.inst + u.group" class="chip chip-blue">{{ u.name }} · {{ u.group === 'bog' ? 'Y12' : 'Y11' }} · {{ u.students.length }}</span></div>
            <div role="cell" style="display: flex; justify-content: flex-end"><button class="icon-btn" :aria-expanded="!!open['d' + d.d]" :aria-label="'Students on ' + full(d.d)" @click="toggle('d' + d.d)"><Icon name="down" :size="18" :sw="2" :class="'chev' + (open['d' + d.d] ? ' is-open' : '')" /></button></div>
          </div>
          <div v-if="open['d' + d.d]" class="sub-panel">
            <div v-for="u in d.insts" :key="u.inst + u.group" style="display: flex; flex-direction: column; gap: 8px">
              <strong style="font-size: 14px">{{ u.name }} · {{ GROUP_LABEL[u.group] }} <span class="num" style="font-weight: 400; color: #6D6E8D">({{ u.students.length }} students)</span></strong>
              <div class="mini-tbl">
                <div class="tbl-head cols-pst"><span>Student no.</span><span>First name</span><span>Last name</span><span>Year</span><span>Class</span><span>Phone</span></div>
                <div v-for="s in u.students" :key="s.key" class="tbl-row cols-pst"><span class="num">{{ s.tz }}</span><span class="ell">{{ s.fn }}</span><span class="ell">{{ s.ln }}</span><span>{{ s.cls }}</span><span class="num">{{ s.num }}</span><span class="num">{{ s.phone }}</span></div>
              </div>
            </div>
          </div>
        </template>
        <div v-if="!dateRows.length" class="empty">No dates match your search</div>
      </div>

      <!-- waitlist -->
      <div v-else class="fill-body scroll" role="table" aria-label="Waitlisted students">
        <div class="tbl-head cols-pm" role="row"><span role="columnheader">Student no.</span><span role="columnheader">First name</span><span role="columnheader">Last name</span><span role="columnheader">School</span><span role="columnheader">Year</span><span role="columnheader">Reason</span></div>
        <div v-for="c in collectRows" :key="c.student.key" class="tbl-row cols-pm" role="row">
          <span role="cell" class="num">{{ c.student.tz }}</span>
          <span role="cell" class="ell">{{ c.student.fn }}</span>
          <span role="cell" class="ell">{{ c.student.ln }}</span>
          <span role="cell" class="ell">{{ instById[c.student.inst].name }}</span>
          <span role="cell">{{ c.student.cls }}</span>
          <span role="cell"><span :class="reasonCls(c.reason)">{{ REASON_LABEL[c.reason] }}</span></span>
        </div>
        <div v-if="!collectRows.length" class="empty">{{ res.collected.length ? 'No students match your search' : 'Every student was placed. The waitlist is empty.' }}</div>
      </div>
    </div>
  </template>
</template>
