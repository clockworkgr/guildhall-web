// Runs a transaction from a button and tracks its progress for the UI.
import { ref } from 'vue'
import type { Call } from '../lib/adena'
import { useWallet } from './wallet'

export function useTx() {
  const { send } = useWallet()
  const busy = ref(false)
  const error = ref('')
  const done = ref('')

  async function run(calls: Call[], opts: { success?: string; then?: () => unknown; gasWanted?: number } = {}) {
    if (busy.value) return false
    busy.value = true
    error.value = ''
    done.value = ''
    try {
      await send(calls, opts.gasWanted)
      done.value = opts.success ?? 'Done.'
      await opts.then?.()
      return true
    } catch (e) {
      error.value = (e as Error).message
      return false
    } finally {
      busy.value = false
    }
  }

  return { busy, error, done, run }
}
