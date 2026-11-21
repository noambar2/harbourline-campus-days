<script setup lang="ts">
import { computed } from 'vue'
import { partInsts, placementStale, state } from '@/store'
import Icon from './Icon.vue'

defineEmits<{ open: [] }>()
const doneN = computed(() => partInsts.value.filter(i => i.status === 'done').length)
const sub = computed(() => {
  const r = state.placement
  if (!r) return doneN.value + ' of ' + partInsts.value.length + ' schools finished · not run yet'
  return r.days.length + ' campus days · ' + r.placedCount + ' placed · ' + r.collected.length + ' on the waitlist'
})
</script>

<template>
  <button class="place-entry" @click="$emit('open')">
    <span class="place-entry-ic"><Icon name="bus" :size="22" /></span>
    <span style="display: flex; flex-direction: column; gap: 2px; min-width: 0; text-align: left">
      <span style="display: flex; align-items: center; gap: 8px">
        <strong style="font-size: 16px">Place schools on campus days</strong>
        <span v-if="placementStale" class="place-entry-tag">Out of date</span>
        <span v-else-if="state.placement" class="place-entry-tag">Run {{ state.placement.runAt.split(' ')[0] }}</span>
      </span>
      <span class="ell" style="font-size: 13px; opacity: .9">{{ sub }}</span>
    </span>
    <Icon name="right" :size="20" :sw="2.2" style="margin-left: auto; flex-shrink: 0" />
  </button>
</template>
