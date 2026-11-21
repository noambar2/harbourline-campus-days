<script setup lang="ts">
import { computed } from 'vue'
import { OFFICE_NAME, closeModal, flash, instById, state, type Modal } from '@/store'
import ModalBox from '@/components/Modal.vue'

const m = computed(() => state.modal as Extract<Modal, { type: 'dq' }>)
const stu = computed(() => state.students.find(s => s.key === m.value.key))
const confirm = () => {
  if (!m.value.reason || !stu.value) return
  stu.value.dq = { reason: m.value.reason, note: m.value.note, by: 'office', byName: OFFICE_NAME, at: '09/02/2027' }
  closeModal()
  flash('Student excluded')
}
</script>
<template>
  <ModalBox title="Exclude student" :sub="stu ? stu.fn + ' ' + stu.ln + ' · Student no. ' + stu.tz + ' · ' + instById[stu.inst]?.name : ''" :width="520">
    <span style="font-size: 14px; line-height: 1.6">The student stays on the list, marked “Excluded by Harbourline”. The school sees the mark and the reason, and can’t edit the student. You can undo an exclusion at any time.</span>
    <div class="field"><label class="lbl" for="dq-r">Reason *</label>
      <select id="dq-r" v-model="m.reason" class="select"><option value="">Choose a reason</option><option>Not in Year 11 or 12</option><option>Registered by another school (duplicate)</option><option>Details are wrong and can’t be verified</option><option>Other</option></select></div>
    <div class="field"><label class="lbl" for="dq-n">Details</label><textarea id="dq-n" v-model="m.note" class="textarea" rows="3"></textarea></div>
    <template #footer><button class="btn btn-danger" :disabled="!m.reason" :style="!m.reason ? 'opacity: .45; cursor: not-allowed' : ''" @click="confirm">Exclude student</button><button class="btn btn-ghost" @click="closeModal">Cancel</button></template>
  </ModalBox>
</template>
