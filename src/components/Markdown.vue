<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{ source: string }>()

// Posters write descriptions in markdown. Render it, then strip anything
// that could run code or restyle the page.
const html = computed(() => {
  const raw = marked.parse(props.source ?? '', { async: false, gfm: true, breaks: true }) as string
  const clean = DOMPurify.sanitize(raw, {
    FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'img'],
    FORBID_ATTR: ['style'],
  })
  const wrapper = document.createElement('div')
  wrapper.innerHTML = clean
  for (const block of wrapper.querySelectorAll('pre')) {
    block.tabIndex = 0
    block.setAttribute('role', 'region')
    block.setAttribute('aria-label', 'Code example')
  }
  return wrapper.innerHTML
})
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="prose-guild" v-html="html" />
</template>
