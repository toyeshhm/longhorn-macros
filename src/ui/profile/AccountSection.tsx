import { useEffect, useState } from 'preact/hooks'
import { log } from '../../log'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from '../../supabase/client'
import { useApp } from '../context'
import { useT } from '../i18n'

const MIN_PASSWORD = 6

// The message is marked on the field it is about, exactly as CustomFoodForm does it: a wrong current password used
// to put the red border and the description on the new-password box as well, which said nothing true about it.
interface FieldError { readonly field: 'current' | 'next' | 'form'; readonly text: string }

export function AccountSection() {
  const t = useT()
  const { userId } = useApp()
  const [email, setEmail] = useState<string | null>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState<FieldError | null>(null)
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
    if (email === null) { setError({ field: 'form', text: t.t('account.notSignedIn') }); return }
    if (current === '') { setError({ field: 'current', text: t.t('account.enterCurrent') }); return }
    if (next.length < MIN_PASSWORD) { setError({ field: 'next', text: t.t('account.tooShort', { min: MIN_PASSWORD }) }); return }
    if (next === current) { setError({ field: 'next', text: t.t('account.mustDiffer') }); return }
    setBusy(true)
    // Supabase's updateUser does not check the old password, so prove it first by signing in with it. That also
    // means a wrong current password is reported as such instead of silently letting the change through.
    const check = await supabase.auth.signInWithPassword({ email, password: current })
    if (check.error) {
      log.warn('auth.reauth_failed', { userId, reason: check.error.message, code: check.error.code ?? null })
      // Only the server saying "wrong credentials" is a wrong password. Offline is normal here, and the old code
      // told a user with a perfectly good password that they had typed it wrong.
      setError(check.error.code === 'invalid_credentials'
        ? { field: 'current', text: t.t('account.wrongCurrent') }
        : {
            field: 'form',
            // The server's own words are the only honest thing to print for anything but these two cases.
            text: isAuthRetryableFetchError(check.error)
              ? t.t('account.offline')
              : t.t('account.checkFailed', { reason: check.error.message }),
          })
      setBusy(false)
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: next })
    if (updateError) {
      log.warn('auth.password_update_failed', { userId, reason: updateError.message })
      setError({ field: 'form', text: updateError.message })
    } else {
      setCurrent('')
      setNext('')
      setStatus(t.t('account.changed'))
    }
    setBusy(false)
  }

  return (
    <>
      <dl class="account-id">
        <dt>{t.t('account.signedInAs')}</dt>
        <dd>{email ?? '…'}</dd>
      </dl>

      <form class="goals-form" noValidate onSubmit={(ev) => {
        ev.preventDefault()
        change().then(undefined, (e: unknown) => { log.error('auth.password_change_failed', { userId, error: String(e) }); setError({ field: 'form', text: String(e) }); setBusy(false) })
      }}>
        <h3>{t.t('account.changePassword')}</h3>
        {/* Password managers key a change-password form on an adjacent identifier: without one, iOS Keychain and
            1Password either skip the update prompt or save an orphan entry. The email is read-only and off-screen. */}
        <input type="text" autocomplete="username" value={email ?? ''} readOnly tabIndex={-1} aria-hidden="true" class="visually-hidden" />
        <label class="field">
          {t.t('account.currentPassword')}
          <input type="password" autocomplete="current-password" value={current} aria-invalid={error?.field === 'current'}
            aria-describedby={error?.field === 'current' ? 'account-err' : undefined} onInput={(ev) => { setCurrent(ev.currentTarget.value) }} />
        </label>
        <label class="field">
          {t.t('account.newPassword')}
          <input type="password" autocomplete="new-password" value={next} aria-invalid={error?.field === 'next'}
            aria-describedby={error?.field === 'next' ? 'account-err' : undefined} onInput={(ev) => { setNext(ev.currentTarget.value) }} />
        </label>
        {error !== null && <p id="account-err" role="alert" class="error">{error.text}</p>}
        <button type="submit" class="primary" disabled={busy}>{t.t('account.changePassword')}</button>
        {/* Mounted empty from the first paint so the confirmation is announced when it arrives. */}
        <p role="status" class="muted">{status}</p>
      </form>

      <p class="muted">{t.t('account.note')}</p>

      <button type="button" onClick={() => {
        supabase.auth.signOut().then(
          ({ error: signOutError }) => { if (signOutError) log.warn('auth.sign_out_failed', { userId, reason: signOutError.message }) },
          (e: unknown) => { log.error('auth.sign_out_failed', { userId, error: String(e) }) },
        )
      }}>{t.t('account.logOut')}</button>
    </>
  )
}
