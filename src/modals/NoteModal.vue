<script setup lang="ts">
import { computed } from 'vue'
import { closeModal, instById, state, type Modal } from '@/store'
import ModalBox from '@/components/Modal.vue'

const inst = computed(() => instById.value[(state.modal as Extract<Modal, { type: 'note' }>).inst])
</script>
<template>
  <ModalBox title="Note from the school" :sub="inst.name + ' · Code ' + inst.code" :width="480">
    <p style="margin: 0; font-size: 15px; line-height: 1.7; padding: 14px 16px; border-radius: 10px; background: #FCFDFF; border: 1px solid #EAEDEF">{{ inst.note }}</p>
    <span v-if="inst.noteAt" class="num" style="font-size: 12.5px; color: #6D6E8D">Sent {{ inst.noteAt }}</span>
    <template #footer><button class="btn btn-ghost" @click="closeModal">Close</button></template>
  </ModalBox>
</template>
