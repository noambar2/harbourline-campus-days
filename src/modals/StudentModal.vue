<script setup lang="ts">
import { computed } from 'vue'
import { closeModal, flash, partInsts, state, type Modal } from '@/store'
import ModalBox from '@/components/Modal.vue'

const m = computed(() => state.modal as Extract<Modal, { type: 'student' }>)
const save = () => {
  const d = m.value.draft
  if (!d.tz || !d.fn || !d.ln || !d.inst || !d.cls || !d.num || !d.phone) return (m.value.err = 'Fill in all required fields')
  if (!/^\d{9}$/.test(d.tz)) return (m.value.err = 'Student number must be 9 digits')
  const key = m.value.key
  if (key) state.students = state.students.map(s => (s.key === key ? { ...d } : s))
  else state.students = [{ ...d, key: 'n' + Date.now(), dq: null }, ...state.students]
  closeModal()
  flash(key ? 'Student details updated' : 'Student added')
}
</script>
<template>
  <ModalBox :title="m.key ? 'Edit student' : 'Add student'" :width="640">
    <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 20px" @input="m.err = ''">
      <div class="field"><label class="lbl" for="m-tz">Student number *</label><input id="m-tz" v-model="m.draft.tz" class="input num" inputmode="numeric" /></div>
      <div class="field"><label class="lbl" for="m-inst">School *</label><select id="m-inst" v-model="m.draft.inst" class="select"><option v-for="o in partInsts" :key="o.id" :value="o.id">{{ o.name }}</option></select></div>
      <div class="field"><label class="lbl" for="m-fn">First name *</label><input id="m-fn" v-model="m.draft.fn" class="input" /></div>
      <div class="field"><label class="lbl" for="m-ln">Last name *</label><input id="m-ln" v-model="m.draft.ln" class="input" /></div>
      <div class="field"><label class="lbl" for="m-cls">Year *</label><select id="m-cls" v-model="m.draft.cls" class="select"><option value="11">Year 11</option><option value="12">Year 12</option></select></div>
      <div class="field"><label class="lbl" for="m-num">Class *</label><input id="m-num" v-model="m.draft.num" class="input num" inputmode="numeric" /></div>
      <div class="field"><label class="lbl" for="m-ph">Phone *</label><input id="m-ph" v-model="m.draft.phone" class="input num" /></div>
      <div class="field"><label class="lbl" for="m-note">Notes</label><input id="m-note" v-model="m.draft.note" class="input" /></div>
    </div>
    <span v-if="m.err" role="alert" style="font-size: 13.5px; color: #FF1D47">{{ m.err }}</span>
    <template #footer><button class="btn btn-primary" @click="save">Save</button><button class="btn btn-ghost" @click="closeModal">Cancel</button></template>
  </ModalBox>
</template>
