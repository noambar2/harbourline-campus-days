<script setup lang="ts">
import { computed } from 'vue'
import { state } from '@/store'
import { dayLabel, full } from '@/lib/dates'

const props = defineProps<{ d: string; by?: 'school' | 'office'; showBy?: boolean; removable?: boolean }>()
defineEmits<{ remove: [] }>()

const info = computed(() => {
  const sp = state.specials.find(s => s.d === props.d)
  const blocked = !!sp && sp.quota === 0
  const isO = props.by === 'office' && !!props.showBy
  let title = full(props.d)
  if (blocked) title += ' · Blocked: ' + sp!.desc
  else if (sp) title += ' · Reduced quota (' + sp.quota + '): ' + sp.desc
  if (isO) title += ' · Edited by Harbourline'
  return { blocked, isO: isO && !blocked, title, cls: 'date-chip' + (blocked ? ' is-blocked' : isO ? ' is-office' : '') }
})
</script>
<template>
  <span :class="info.cls" :title="info.title">
    <svg v-if="info.blocked" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-label="Blocked"><path d="M12 3l10 18H2z" /></svg>
    <svg v-if="info.isO" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-label="Edited by Harbourline"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>
    {{ dayLabel(d) }}
    <button v-if="removable" class="x" :aria-label="'Remove ' + full(d)" @click="$emit('remove')">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  </span>
</template>
