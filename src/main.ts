import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './style.css'

// Theme: explicit choice first, then the system preference.
let theme: string | null = null
try {
  theme = localStorage.getItem('guildhall.theme')
} catch {
  /* ignore */
}
const dark = theme ? theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.classList.toggle('dark', dark)

createApp(App).use(router).mount('#app')
