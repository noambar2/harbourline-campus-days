<script setup lang="ts">
import { computed } from 'vue'
import { closeModal, flash, state, type Modal } from '@/store'
import ModalBox from '@/components/Modal.vue'

const m = computed(() => state.modal as Extract<Modal, { type: 'special' }>)
const d = computed(() => m.value.draft)
const affected = computed(() => d.value.d && d.value.mode === 'block' ? state.insts.filter(i => [...i.dates.bog, ...i.dates.tz].some(x => x.d === d.value.d)).map(i => i.name) : [])
const save = () => {
  const x = d.value
  const err = (msg: string) => (m.value.err = msg)
  if (!x.d) return err('Choose a date')
  if (!x.desc.trim()) return err('Add a description')
  if (state.specials.some(s => s.d === x.d && s.d !== m.value.orig)) return err('This date already has a limit')
  let qv = 0
  if (x.mode === 'limit') {
    qv = parseInt(x.q, 10)
    if (!(qv > 0)) return err('Enter a quota above 0')
    if (qv >= state.quota) return err('The quota must be lower than the usual quota (' + state.quota + ')')
  }
  const orig = m.value.orig
  state.specials = [...state.specials.filter(s => s.d !== orig), { d: x.d, desc: x.desc.trim(), quota: qv }]
  closeModal()
  flash(orig ? 'Special date updated' : 'Special date added')
}
</script>
<template>
  <ModalBox :title="m.orig ? 'Edit special date' : 'Add special date'" :width="540" @input="m.err = ''">
    <div style="display: grid; grid-template-columns: 180px minmax(0, 1fr); gap: 16px">
      <div class="field"><label class="lbl" for="sp-d">Date *</label><input id="sp-d" v-model="d.d" class="input num" type="date" /></div>
      <div class="field"><label class="lbl" for="sp-desc">Description *</label><input id="sp-desc" v-model="d.desc" class="input" placeholder="e.g. Staff training day" /></div>
    </div>
    <div class="field">
      <span class="lbl">Type of limit</span>
      <div style="display: flex; gap: 10px">
        <button class="mode-btn" :aria-pressed="d.mode === 'block'" @click="d.mode = 'block'"><span style="font-size: 14.5px; font-weight: 700">Block the day</span><span style="font-size: 12.5px; color: #6D6E8D">No students can visit</span></button>
        <button class="mode-btn" :aria-pressed="d.mode === 'limit'" @click="d.mode = 'limit'"><span style="font-size: 14.5px; font-weight: 700">Reduce the quota</span><span class="num" style="font-size: 12.5px; color: #6D6E8D">Fewer than {{ state.quota }} students</span></button>
      </div>
    </div>
    <div v-if="d.mode === 'limit'" class="field" style="width: 220px"><label class="lbl" for="sp-q">Quota for that day *</label><input id="sp-q" v-model="d.q" class="input num" type="number" min="1" /></div>
    <div v-if="affected.length" class="banner banner-err" style="font-size: 13.5px; padding: 10px 14px"><svg width="16" height="16" viewBox="0 0 24 24" fill="#FF1D47" aria-hidden="true" style="flex-shrink: 0; margin-top: 2px"><path d="M12 3l10 18H2z" /></svg><span>Schools that already chose this date: {{ affected.join(', ') }}. After you save, they’ll show as an alert on the Dates tab.</span></div>
    <span v-if="m.err" role="alert" style="font-size: 13.5px; color: #FF1D47">{{ m.err }}</span>
    <template #footer><button class="btn btn-primary" @click="save">Save</button><button class="btn btn-ghost" @click="closeModal">Cancel</button></template>
  </ModalBox>
</template>
