// Loads data for a page and reloads it on demand (after a transaction) or
// when its inputs change.
import { ref, shallowRef, watch, type WatchSource } from 'vue'

export function useQuery<T>(load: () => Promise<T>, deps: WatchSource[] = []) {
  const data = shallowRef<T | null>(null)
  const error = ref('')
  const loading = ref(true)
  let seq = 0

  async function run() {
    const mine = ++seq
    loading.value = true
    error.value = ''
    try {
      const v = await load()
      if (mine === seq) data.value = v
    } catch (e) {
      if (mine === seq) error.value = (e as Error).message
    } finally {
      if (mine === seq) loading.value = false
    }
  }

  watch(deps, run, { immediate: true })
  return { data, error, loading, reload: run }
}
