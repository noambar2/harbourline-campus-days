<script setup lang="ts">
import { computed } from 'vue'
import { partInsts, runPlacementWithFeedback, state } from '@/store'
import Icon from './Icon.vue'

defineEmits<{ export: [] }>()
const notDone = computed(() => partInsts.value.filter(i => i.status !== 'done'))
const doneN = computed(() => partInsts.value.length - notDone.value.length)
const res = computed(() => state.placement)
</script>

<template>
  <section class="card" style="display: flex; align-items: center; gap: 16px; padding: 12px 16px; max-width: 640px; min-width: 0">
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px">
      <strong style="font-size: 14.5px">{{ doneN }} of {{ partInsts.length }} schools have finished registering</strong>
      <span v-if="!notDone.length" style="font-size: 12.5px; color: #6D6E8D">All schools have finished. You can run the placement.</span>
      <span v-else class="ell" style="font-size: 12.5px; color: #6D6E8D" :title="'Not finished: ' + notDone.map(i => i.name).join(', ')">Not finished: {{ notDone.map(i => i.name).join(', ') }} · their students will go on the waitlist</span>
      <span v-if="res" class="num" style="font-size: 12px; color: #6D6E8D">Last run: {{ res.runAt }}</span>
    </div>
    <div style="display: flex; gap: 8px; flex-shrink: 0">
      <button v-if="res" class="btn btn-ghost btn-sm" @click="$emit('export')"><Icon name="download" :size="16" />Export to Excel</button>
      <button class="btn btn-primary btn-sm" :disabled="state.placementRunning" @click="runPlacementWithFeedback"><Icon :name="res ? 'refresh' : 'play'" :size="16" :sw="2" />{{ state.placementRunning ? 'Running placement…' : res ? 'Run again' : notDone.length ? 'Run placement anyway' : 'Run placement' }}</button>
    </div>
  </section>
</template>
