import type { ComponentChildren } from 'preact'
import { useEffect, useId, useRef } from 'preact/hooks'
import { CloseMark } from '../icons/Marks'

// Native modal <dialog>: showModal() makes the page inert (focus trap) and Esc fires `close`.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    // Read the opener before showModal(), which moves focus into the sheet. The dialog is unmounted on close (and on
    // Add/Save, which never call close()), so the browser's own focus restore doesn't always land; do it ourselves.
    const opener = document.activeElement
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      // Removing an open dialog drops focus on <body> after this cleanup runs, so claim it back next tick, and only
      // if nothing else has taken it in the meantime (deleting an entry hands focus to Undo instead).
      setTimeout(() => {
        if (document.activeElement !== document.body) return
        const back = opener instanceof HTMLElement && opener.isConnected ? opener : document.querySelector('main.screen')
        if (back instanceof HTMLElement) back.focus()
      }, 0)
    }
  }, [])
  return (
    <dialog ref={ref} class="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}
      onClose={onClose}
      // The dialog box itself only receives clicks on the backdrop; content sits in the inner div.
      onClick={(ev) => { if (ev.target === ev.currentTarget) ev.currentTarget.close() }}>
      <div class="sheet-body">
        <header class="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" class="icon-btn" aria-label="Close" onClick={() => { ref.current?.close() }}><CloseMark /></button>
        </header>
        {children}
      </div>
    </dialog>
  )
}
