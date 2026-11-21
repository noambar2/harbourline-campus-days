<script setup lang="ts">
import { computed } from 'vue'
import { countOf, flash, matches, partInsts, state } from '@/store'
import Icon from '@/components/Icon.vue'
import type { Inst } from '@/types'

const props = defineProps<{ q: string }>()
const ST = { done: ['Finished', 'chip chip-ok'], progress: ['In progress', 'chip chip-prog'], none: ['Not started', 'chip chip-none'] } as const
const rows = computed(() => state.insts.filter(i => !props.q.trim() || matches(i.name + ' ' + i.code, props.q.trim())))
const toggle = (i: Inst) => { i.part = !i.part; flash(i.part ? i.name + ' marked as participating' : i.name + ' marked as not participating') }
</script>

<template>
  <div class="card fill-card">
    <div class="card-h" style="flex-shrink: 0"><h3 class="card-t">Partner schools</h3><span style="font-size: 13.5px; color: #6D6E8D">{{ partInsts.length }} of {{ state.insts.length }} participating</span></div>
    <div class="fill-body scroll" role="table" aria-label="Partner schools">
      <div class="tbl-head cols-in" role="row"><span role="columnheader">School</span><span role="columnheader">School code</span><span role="columnheader">Students</span><span role="columnheader">Status</span><span role="columnheader">In Campus Days</span><span role="columnheader">School note</span></div>
      <div v-for="i in rows" :key="i.id" class="tbl-row cols-in" role="row">
        <span role="cell" class="ell" style="font-weight: 600">{{ i.name }}</span>
        <span role="cell" class="num">{{ i.code }}</span>
        <span role="cell" class="num">{{ countOf(i.id) }}</span>
        <span role="cell"><span :class="i.part ? ST[i.status][1] : 'chip chip-gray'">{{ i.part ? ST[i.status][0] : 'Not participating' }}</span></span>
        <span role="cell" style="display: flex; align-items: center; gap: 10px"><button class="switch" :aria-pressed="i.part" :aria-label="'In Campus Days: ' + i.name" @click="toggle(i)"><span class="knob"></span></button><span style="font-size: 13.5px; color: #6D6E8D">{{ i.part ? 'Participating' : 'Not participating' }}</span></span>
        <span role="cell">
          <button v-if="i.note" class="link-btn" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px" @click="state.modal = { type: 'note', inst: i.id }"><Icon name="chat" :size="16" />View</button>
          <span v-else style="color: #ACACBE">—</span>
        </span>
      </div>
      <div v-if="!rows.length" class="empty">No schools match your search</div>
    </div>
  </div>
</template>
