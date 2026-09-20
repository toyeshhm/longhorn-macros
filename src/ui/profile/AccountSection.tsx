import { useEffect, useState } from 'preact/hooks'
import { log } from '../../log'
import { supabase } from '../../supabase/client'
import { useApp } from '../context'

const MIN_PASSWORD = 6

export function AccountSection() {
  const { userId } = useApp()
  const [email, setEmail] = useState<string | null>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(
      ({ data }) => { setEmail(data.session?.user.email ?? null) },
      (e: unknown) => { log.error('auth.get_session_failed', { error: String(e) }) },
    )
  }, [])

  const change = async (): Promise<void> => {
    setError(null)
    setStatus(null)
    if (email === null) { setError('Not signed in.'); return }
    if (current === '') { setError('Enter your current password.'); return }
    if (next.length < MIN_PASSWORD) { setError(`New password must be at least ${String(MIN_PASSWORD)} characters.`); return }
    if (next === current) { setError('New password must be different from the current one.'); return }
    setBusy(true)
    // Supabase's updateUser does not check the old password, so prove it first by signing in with it. That also
    // means a wrong current password is reported as such instead of silently letting the change through.
    const check = await supabase.auth.signInWithPassword({ email, password: current })
    if (check.error) {
      log.warn('auth.reauth_failed', { userId, reason: check.error.message })
      setError('Current password is incorrect.')
      setBusy(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    if (updateError) {
      log.warn('auth.password_update_failed', { userId, reason: updateError.message })
      setError(updateError.message)
    } else {
      setCurrent('')
      setNext('')
      setStatus('Password changed.')
    }
    setBusy(false)
  }

  return (
    <>
      <dl class="account-id">
        <dt>Signed in as</dt>
        <dd>{email ?? '…'}</dd>
      </dl>

      <form class="goals-form" noValidate onSubmit={(ev) => {
        ev.preventDefault()
        change().then(undefined, (e: unknown) => { log.error('auth.password_change_failed', { userId, error: String(e) }); setError(String(e)); setBusy(false) })
      }}>
        <h3>Change password</h3>
        <label class="field">
          Current password
          <input type="password" autocomplete="current-password" value={current} aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : 'account-err'} onInput={(ev) => { setCurrent(ev.currentTarget.value) }} />
        </label>
        <label class="field">
          New password
          <input type="password" autocomplete="new-password" value={next} aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : 'account-err'} onInput={(ev) => { setNext(ev.currentTarget.value) }} />
        </label>
        {error !== null && <p id="account-err" role="alert" class="error">{error}</p>}
        <button type="submit" class="primary" disabled={busy}>Change password</button>
        {/* Mounted empty from the first paint so the confirmation is announced when it arrives. */}
        <p role="status" class="muted">{status}</p>
      </form>

      <p class="muted">Changing your email address and deleting your account are not available here: both need a
        confirmation email this app does not send. Ask for either by writing from the address above.</p>

      <button type="button" onClick={() => {
        supabase.auth.signOut().then(
          ({ error: signOutError }) => { if (signOutError) log.warn('auth.sign_out_failed', { userId, reason: signOutError.message }) },
          (e: unknown) => { log.error('auth.sign_out_failed', { userId, error: String(e) }) },
        )
      }}>Log out</button>
    </>
  )
}
