import { useEffect, useState } from 'preact/hooks'

export interface ToastMessage { text: string; onUndo: (() => void) | null }

const TOAST_MS = 3000
const UNDO_MS = 10000

// The live region is always in the DOM and only its content changes, so screen readers announce every toast.
export function Toast({ toast, onDone }: { toast: ToastMessage | null; onDone: () => void }) {
  return (
    <div role="status" aria-live="polite" class="toast-region">
      {toast !== null && <ToastBody toast={toast} onDone={onDone} />}
    </div>
  )
}

// The timer pauses while the toast is hovered or holds focus, so Undo stays reachable.
function ToastBody({ toast, onDone }: { toast: ToastMessage; onDone: () => void }) {
  const [held, setHeld] = useState(false)
  useEffect(() => {
    if (held) return
    const t = setTimeout(onDone, toast.onUndo === null ? TOAST_MS : UNDO_MS)
    return () => { clearTimeout(t) }
  }, [toast, held])
  const hold = (): void => { setHeld(true) }
  const release = (): void => { setHeld(false) }
  return (
    <div class="toast" onPointerEnter={hold} onPointerLeave={release} onFocusIn={hold} onFocusOut={release}>
      {toast.text}
      {toast.onUndo !== null && <button type="button" class="link" onClick={toast.onUndo}>Undo</button>}
    </div>
  )
}
