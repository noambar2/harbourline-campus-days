<script setup lang="ts">
import { computed } from 'vue'
import { closeModal, flash, instById, state, type Modal } from '@/store'
import ModalBox from '@/components/Modal.vue'
import Calendar from '@/components/Calendar.vue'
import DateChip from '@/components/DateChip.vue'
import type { Group } from '@/types'

const m = computed(() => state.modal as Extract<Modal, { type: 'dates' }>)
const inst = computed(() => instById.value[m.value.inst])
const sorted = (g: Group) => m.value.draft[g].slice().sort((a, b) => (a.d < b.d ? -1 : 1))
const toggle = (iso: string) => {
  const cur = m.value.draft[m.value.group]
  m.value.draft[m.value.group] = cur.some(x => x.d === iso) ? cur.filter(x => x.d !== iso) : [...cur, { d: iso, by: 'office' }]
}
const remove = (g: Group, d: string) => (m.value.draft[g] = m.value.draft[g].filter(x => x.d !== d))
const hasConflict = computed(() => [...m.value.draft.bog, ...m.value.draft.tz].some(x => state.specials.some(s => s.d === x.d && s.quota === 0)))
const save = () => {
  inst.value.dates = { bog: m.value.draft.bog, tz: m.value.draft.tz }
  inst.value.upd = { by: 'office', at: '09/02/2027' }
  closeModal()
  flash('Dates updated. The school will be notified.')
}
</script>
<template>
  <ModalBox :title="'Edit dates · ' + inst.name" sub="Dates you add are marked “Edited by Harbourline”, and the school gets an update." :width="760" style="display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 24px; align-items: start">
    <div style="display: flex; flex-direction: column; gap: 12px">
      <div style="display: flex; gap: 8px">
        <button v-for="g in (['bog', 'tz'] as const)" :key="g" class="grp-tab" :aria-pressed="m.group === g" @click="m.group = g"><span style="font-size: 14.5px; font-weight: 700">{{ g === 'bog' ? 'Year 12' : 'Year 11' }}</span><span class="num" style="font-size: 12.5px; color: #6D6E8D">{{ m.draft[g].length }} dates</span></button>
      </div>
      <Calendar v-model:mi="m.mi" :picked="m.draft[m.group].map(x => x.d)" :max="6" small @toggle="toggle" />
    </div>
    <div style="display: flex; flex-direction: column; gap: 16px">
      <div v-for="(g, k) in (['bog', 'tz'] as const)" :key="g" :style="'display: flex; flex-direction: column; gap: 8px' + (k ? '; padding-top: 14px; border-top: 1px solid #EAEDEF' : '')">
        <span style="font-size: 14px; font-weight: 600">{{ g === 'bog' ? 'Year 12' : 'Year 11' }}</span>
        <div class="dates-wrap">
          <DateChip v-for="x in sorted(g)" :key="x.d" :d="x.d" :by="x.by" show-by removable @remove="remove(g, x.d)" />
          <span v-if="!m.draft[g].length" style="font-size: 13px; color: #ACACBE">No dates</span>
        </div>
      </div>
      <div v-if="hasConflict" class="banner banner-err" style="font-size: 13.5px; padding: 10px 14px"><svg width="16" height="16" viewBox="0 0 24 24" fill="#FF1D47" aria-hidden="true" style="flex-shrink: 0; margin-top: 2px"><path d="M12 3l10 18H2z" /></svg><span>Some dates fall on a blocked day. Remove them and choose another date.</span></div>
      <div v-if="inst.note" style="display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 10px; background: #FCFDFF; border: 1px solid #EAEDEF"><span class="lbl">Note from the school</span><span style="font-size: 13.5px; line-height: 1.6">{{ inst.note }}</span></div>
    </div>
    <template #footer><button class="btn btn-primary" @click="save">Save dates</button><button class="btn btn-ghost" @click="closeModal">Cancel</button></template>
  </ModalBox>
</template>
