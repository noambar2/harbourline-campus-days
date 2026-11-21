<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 20 })
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="#FF1D47" aria-hidden="true" style="flex-shrink: 0; margin-top: 1px"><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" stroke="#fff" stroke-width="2" stroke-linecap="round" /></svg>
</template>
