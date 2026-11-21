<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import Icon from './Icon.vue'
import { closeModal } from '@/store'

defineOptions({ inheritAttrs: false })
defineProps<{ title: string; sub?: string; width: number }>()
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>
<template>
  <div class="scrim" @click.self="closeModal">
    <div class="modal" role="dialog" aria-modal="true" :aria-label="title" :style="{ width: width + 'px' }">
      <div class="modal-h">
        <div style="display: flex; flex-direction: column; gap: 4px">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700">{{ title }}</h2>
          <span v-if="sub" style="font-size: 14px; color: #6D6E8D">{{ sub }}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0">
          <slot name="actions" />
          <button class="icon-btn" aria-label="Close" @click="closeModal"><Icon name="close" :size="20" :sw="2" /></button>
        </div>
      </div>
      <div class="modal-b" v-bind="$attrs"><slot /></div>
      <div v-if="$slots.footer" class="modal-f"><slot name="footer" /></div>
    </div>
  </div>
</template>
