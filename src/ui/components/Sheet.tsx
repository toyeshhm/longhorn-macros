import type { ComponentChildren } from 'preact'
import { useEffect, useId, useRef } from 'preact/hooks'
import { CloseMark } from '../icons/Marks'

// Native modal <dialog>: showModal() makes the page inert (focus trap) and Esc fires `close`.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
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
