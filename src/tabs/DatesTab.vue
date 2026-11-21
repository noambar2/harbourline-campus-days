<script setup lang="ts">
import { computed } from 'vue'
import { countOf, matches, partInsts, state } from '@/store'
import { full } from '@/lib/dates'
import Icon from '@/components/Icon.vue'
import WarnIcon from '@/components/WarnIcon.vue'
import DateChip from '@/components/DateChip.vue'
import type { Inst, PickedDate } from '@/types'

const props = defineProps<{ q: string }>()
const sortD = (a: PickedDate[]) => a.slice().sort((x, y) => (x.d < y.d ? -1 : 1))
const openEdit = (i: Inst) => (state.modal = { type: 'dates', inst: i.id, group: 'bog', mi: 0, draft: { bog: i.dates.bog.slice(), tz: i.dates.tz.slice() } })

const rows = computed(() => partInsts.value.filter(i => !props.q.trim() || matches(i.name + ' ' + i.code, props.q.trim())))
const conflicts = computed(() => {
  const out: { text: string; inst: Inst }[] = []
  partInsts.value.forEach(i => (['bog', 'tz'] as const).forEach(g => i.dates[g].forEach(x => {
    const sp = state.specials.find(s => s.d === x.d)
    if (sp && sp.quota === 0) out.push({ text: i.name + ' · ' + (g === 'bog' ? 'Year 12' : 'Year 11') + ' · ' + full(x.d) + ' (' + sp.desc + ')', inst: i })
  })))
  return out
})
</script>

<template>
  <div v-if="conflicts.length" class="banner banner-err" role="alert">
    <WarnIcon />
    <div style="flex: 1; display: flex; flex-direction: column; gap: 6px">
      <strong style="font-size: 14.5px">{{ conflicts.length === 1 ? 'One chosen date falls on a blocked day' : conflicts.length + ' chosen dates fall on blocked days' }}</strong>
      <div v-for="(c, k) in conflicts" :key="k" style="display: flex; align-items: center; gap: 10px; font-size: 14px"><span>{{ c.text }}</span><button class="link-btn" @click="openEdit(c.inst)">Edit dates</button></div>
    </div>
  </div>
  <div class="card fill-card">
    <div class="card-h" style="flex-shrink: 0">
      <h3 class="card-t">Dates chosen by schools <span class="num" style="font-weight: 400; color: #6D6E8D">· {{ partInsts.length }} participating schools</span></h3>
      <div style="display: flex; align-items: center; gap: 14px; font-size: 12.5px; color: #6D6E8D">
        <span style="display: inline-flex; align-items: center; gap: 6px"><span class="legend-dot" style="border-radius: 3px; background: #E7E9FD; border: 1px solid #5C6BF3"></span>Chosen by the school</span>
        <span style="display: inline-flex; align-items: center; gap: 6px"><span class="legend-dot" style="border-radius: 3px; background: #F3E5FA; border: 1px solid #AF52DE"></span>Edited by Harbourline</span>
        <span style="display: inline-flex; align-items: center; gap: 6px"><span class="legend-dot" style="border-radius: 3px; background: #FFDDE3; border: 1px solid #FF1D47"></span>Blocked date</span>
      </div>
    </div>
    <div class="fill-body scroll" role="table" aria-label="Dates by school">
      <div class="tbl-head cols-dt" role="row"><span role="columnheader">School</span><span role="columnheader">Year 12</span><span role="columnheader">Year 11</span><span role="columnheader">Last update</span><span role="columnheader" class="sr-only">Actions</span></div>
      <div v-for="i in rows" :key="i.id" class="tbl-row cols-dt" role="row" style="padding-top: 12px; padding-bottom: 12px; align-items: start">
        <div role="cell" style="display: flex; flex-direction: column; gap: 2px; padding-top: 3px"><span style="font-weight: 600">{{ i.name }}</span><span class="num" style="font-size: 12.5px; color: #6D6E8D">Code {{ i.code }} · {{ countOf(i.id) }} students</span></div>
        <div v-for="g in (['bog', 'tz'] as const)" :key="g" role="cell" class="dates-wrap">
          <DateChip v-for="x in sortD(i.dates[g])" :key="x.d" :d="x.d" :by="x.by" show-by />
          <span v-if="!i.dates[g].length" style="font-size: 13px; color: #ACACBE; padding-top: 4px">Not chosen yet</span>
        </div>
        <div role="cell" style="padding-top: 2px">
          <span :class="i.upd ? (i.upd.by === 'office' ? 'chip chip-purple' : 'chip chip-blue') : 'chip chip-gray'">{{ i.upd ? (i.upd.by === 'office' ? 'Harbourline' : 'School') : 'No updates' }}</span>
          <div class="num" style="font-size: 12px; color: #6D6E8D; margin-top: 4px">{{ i.upd?.at }}</div>
        </div>
        <div role="cell" style="display: flex; justify-content: flex-end"><button class="icon-btn" :aria-label="'Edit dates for ' + i.name" @click="openEdit(i)"><Icon name="edit" :size="17" /></button></div>
      </div>
      <div v-if="!rows.length" class="empty">No schools match your search</div>
    </div>
  </div>
</template>
