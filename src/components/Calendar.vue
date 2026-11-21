<script setup lang="ts">
import { computed } from 'vue'
import { state } from '@/store'
import { MONTHS, WDN, pad, specialMap } from '@/lib/dates'
import Icon from './Icon.vue'

const props = defineProps<{ mi: number; picked: string[]; max: number; small?: boolean }>()
const emit = defineEmits<{ toggle: [iso: string]; 'update:mi': [mi: number] }>()

const cal = computed(() => {
  const M = MONTHS[props.mi]
  const sp = specialMap(state.specials)
  // weeks start on Monday
  const first = (new Date(M.y, M.m, 1).getDay() + 6) % 7
  const n = new Date(M.y, M.m + 1, 0).getDate()
  const days: ({ real: false } | { real: true; n: number; iso: string; cls: string; disabled: boolean; on: boolean; limited: boolean; title: string; aria: string })[] = []
  for (let i = 0; i < first; i++) days.push({ real: false })
  for (let d = 1; d <= n; d++) {
    const iso = M.y + '-' + pad(M.m + 1) + '-' + pad(d)
    const wd = (first + d - 1) % 7
    const s = sp[iso]
    const off = wd >= 5
    const blocked = !!s && s.quota === 0
    const limited = !!s && s.quota > 0
    const on = props.picked.includes(iso)
    const isFull = !on && props.picked.length >= props.max
    let cls = 'cal-day'
    if (on && blocked) cls += ' is-conflict'
    else if (on) cls += ' is-picked'
    else if (blocked) cls += ' is-blocked'
    else if (off) cls += ' is-off'
    else if (isFull) cls += ' is-full'
    const title = s ? s.desc + (blocked ? ' · blocked' : ' · quota ' + s.quota + ' students') : off ? 'No campus days on weekends' : isFull ? 'Maximum number of dates chosen' : ''
    days.push({ real: true, n: d, iso, cls, disabled: !on && (off || blocked || isFull), on, limited, title, aria: WDN[wd] + ' ' + d + ' ' + M.label + (on ? ', selected' : '') + (blocked ? ', blocked' : '') })
  }
  return { title: M.label, days }
})
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 12px">
    <div style="display: flex; align-items: center; justify-content: space-between">
      <button class="icon-btn" aria-label="Previous month" :disabled="mi === 0" @click="emit('update:mi', mi - 1)"><Icon name="left" :size="20" :sw="2" /></button>
      <strong :style="{ fontSize: small ? '15px' : '16px' }">{{ cal.title }}</strong>
      <button class="icon-btn" aria-label="Next month" :disabled="mi === MONTHS.length - 1" @click="emit('update:mi', mi + 1)"><Icon name="right" :size="20" :sw="2" /></button>
    </div>
    <div class="cal-grid"><span v-for="w in WDN" :key="w" class="cal-wd">{{ w }}</span></div>
    <div class="cal-grid">
      <div v-for="(d, k) in cal.days" :key="k" class="cal-cell">
        <button v-if="d.real" :class="d.cls" :disabled="d.disabled" :aria-pressed="d.on" :aria-label="d.aria" :title="d.title" @click="emit('toggle', d.iso)">
          {{ d.n }}<span v-if="d.limited" class="cal-dot" aria-hidden="true"></span>
        </button>
      </div>
    </div>
  </div>
</template>
