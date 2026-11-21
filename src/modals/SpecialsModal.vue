<script setup lang="ts">
import { computed } from 'vue'
import { deleteSpecial, openSpecial, state } from '@/store'
import { dayName, full } from '@/lib/dates'
import ModalBox from '@/components/Modal.vue'
import Icon from '@/components/Icon.vue'

const rows = computed(() =>
  state.specials
    .slice()
    .sort((a, b) => (a.d < b.d ? -1 : 1))
    .map(s => ({ ...s, insts: state.insts.filter(i => i.part && [...i.dates.bog, ...i.dates.tz].some(x => x.d === s.d)).map(i => i.name) })),
)
const blockedN = computed(() => state.specials.filter(s => s.quota === 0).length)
</script>

<template>
  <ModalBox title="Special dates" :sub="rows.length + ' dates · ' + blockedN + ' blocked · ' + (rows.length - blockedN) + ' with a reduced quota'" :width="860" style="padding-top: 0; padding-bottom: 24px">
    <div class="mini-tbl" role="table" aria-label="Special dates">
      <div class="tbl-head cols-spl" role="row"><span role="columnheader">Date</span><span role="columnheader">Description</span><span role="columnheader">Limit</span><span role="columnheader">Schools that chose the day</span><span role="columnheader" class="sr-only">Actions</span></div>
      <div v-for="sp in rows" :key="sp.d" class="tbl-row cols-spl" role="row">
        <span role="cell" style="display: flex; flex-direction: column"><span class="num" style="font-weight: 600">{{ full(sp.d) }}</span><span style="font-size: 12px; color: #6D6E8D">{{ dayName(sp.d) }}</span></span>
        <span role="cell">{{ sp.desc }}</span>
        <span role="cell"><span :class="sp.quota === 0 ? 'chip chip-none' : 'chip chip-yellow'">{{ sp.quota === 0 ? 'Blocked' : 'Quota ' + sp.quota }}</span></span>
        <span role="cell" :style="{ fontSize: '13px', color: sp.insts.length && sp.quota === 0 ? '#FF1D47' : '#6D6E8D' }">{{ sp.insts.length ? sp.insts.join(', ') : '—' }}</span>
        <span role="cell" style="display: flex; justify-content: flex-end">
          <button class="icon-btn" :aria-label="'Edit ' + full(sp.d)" @click="openSpecial(sp.d, true)"><Icon name="edit" :size="17" /></button>
          <button class="icon-btn is-danger" :aria-label="'Delete ' + full(sp.d)" @click="deleteSpecial(sp.d)"><Icon name="trash" :size="17" /></button>
        </span>
      </div>
      <div v-if="!rows.length" class="empty">No special dates yet</div>
    </div>
    <template #actions>
      <button class="btn btn-primary btn-sm" @click="openSpecial(null, true)"><Icon name="plus" :size="16" :sw="2.2" />Add special date</button>
    </template>
  </ModalBox>
</template>
