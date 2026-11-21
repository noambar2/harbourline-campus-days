<script setup lang="ts">
import { computed } from 'vue'
import { flash, instById, matches, partInsts, state } from '@/store'
import Icon from '@/components/Icon.vue'
import type { Student } from '@/types'

const props = defineProps<{ q: string; fOpen: boolean; filters: { inst: string; cls: string; st: string } }>()
defineEmits<{ clear: [] }>()

const order = computed(() => Object.fromEntries(state.insts.map((i, k) => [i.id, k])))
const rows = computed(() => {
  const q = props.q.trim()
  const f = props.filters
  return state.students
    .filter(x => {
      if (f.inst && x.inst !== f.inst) return false
      if (f.cls && x.cls !== f.cls) return false
      if (f.st === 'ok' && x.dq) return false
      if (f.st === 'dq' && !x.dq) return false
      if (q && !matches(x.tz + ' ' + x.fn + ' ' + x.ln + ' ' + x.phone + ' ' + instById.value[x.inst]?.name, q)) return false
      return true
    })
    .sort((a, b) => order.value[a.inst] - order.value[b.inst] || a.ln.localeCompare(b.ln, 'en-AU'))
})
const total = computed(() => state.students.length)
const dqTitle = (x: Student) => x.dq ? 'Excluded by ' + x.dq.byName + ' on ' + x.dq.at + ' · Reason: ' + x.dq.reason + (x.dq.note ? ' — ' + x.dq.note : '') : ''
const add = () => {
  state.modal = { type: 'student', key: null, draft: { key: '', tz: '', fn: '', ln: '', inst: partInsts.value[0]?.id || '', cls: '12', num: '', phone: '', note: '', dq: null }, err: '' }
}
const edit = (x: Student) => (state.modal = { type: 'student', key: x.key, draft: { ...x }, err: '' })
const undq = (x: Student) => { x.dq = null; flash('Exclusion undone') }
</script>

<template>
  <div v-if="fOpen" class="card" style="flex-shrink: 0; display: flex; align-items: flex-end; gap: 14px; padding: 14px 20px">
    <div class="field" style="flex: 1.4"><label class="lbl" for="f-inst">School</label>
      <select id="f-inst" v-model="filters.inst" class="select"><option value="">All schools</option><option v-for="o in partInsts" :key="o.id" :value="o.id">{{ o.name }}</option></select></div>
    <div class="field" style="flex: 1"><label class="lbl" for="f-cls">Year</label>
      <select id="f-cls" v-model="filters.cls" class="select"><option value="">All years</option><option value="11">Year 11</option><option value="12">Year 12</option></select></div>
    <div class="field" style="flex: 1"><label class="lbl" for="f-st">Student status</label>
      <select id="f-st" v-model="filters.st" class="select"><option value="">All</option><option value="ok">Active</option><option value="dq">Excluded</option></select></div>
    <button class="btn btn-ghost" @click="$emit('clear')">Clear</button>
  </div>
  <div class="card fill-card">
    <div class="card-h" style="flex-shrink: 0">
      <h3 class="card-t">Students <span class="num" style="font-weight: 400; color: #6D6E8D">· {{ rows.length === total ? total + ' students' : rows.length + ' of ' + total }}</span></h3>
      <button class="btn btn-primary btn-sm" @click="add"><Icon name="plus" :size="16" :sw="2.2" />Add student</button>
    </div>
    <div class="fill-body scroll" role="table" aria-label="Students">
      <div class="tbl-head cols-ls" role="row"><span role="columnheader">Student no.</span><span role="columnheader">First name</span><span role="columnheader">Last name</span><span role="columnheader">School</span><span role="columnheader">Year</span><span role="columnheader">Class</span><span role="columnheader">Phone</span><span role="columnheader">Status</span><span role="columnheader" style="text-align: right">Actions</span></div>
      <div v-for="x in rows" :key="x.key" :class="'tbl-row cols-ls' + (x.dq ? ' is-dq' : '')" role="row">
        <span class="num" role="cell">{{ x.tz }}</span>
        <span class="ell" role="cell">{{ x.fn }}</span>
        <span class="ell" role="cell">{{ x.ln }}</span>
        <span class="ell" role="cell" :title="instById[x.inst]?.name">{{ instById[x.inst]?.name }}</span>
        <span role="cell">{{ x.cls }}</span>
        <span class="num" role="cell">{{ x.num }}</span>
        <span class="num" role="cell">{{ x.phone }}</span>
        <span role="cell"><span :class="x.dq ? 'chip chip-none' : 'chip chip-ok'" :title="dqTitle(x)"><Icon v-if="x.dq" name="ban" :size="12" :sw="2.4" />{{ x.dq ? 'Excluded' : 'Active' }}</span></span>
        <span role="cell" style="display: flex; justify-content: flex-end">
          <template v-if="!x.dq">
            <button class="icon-btn" aria-label="Edit student" @click="edit(x)"><Icon name="edit" :size="17" /></button>
            <button class="icon-btn is-danger" aria-label="Exclude student" title="Exclude" @click="state.modal = { type: 'dq', key: x.key, reason: '', note: '' }"><Icon name="ban" :size="17" /></button>
          </template>
          <button v-else class="icon-btn" aria-label="Undo exclusion" title="Undo exclusion" @click="undq(x)"><Icon name="undo" :size="17" /></button>
        </span>
      </div>
      <div v-if="!rows.length" class="empty">No students match your search or filters</div>
    </div>
  </div>
</template>
