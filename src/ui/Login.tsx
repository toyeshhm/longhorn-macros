import { useState } from 'preact/hooks'
import { log } from '../log'
import { supabase } from '../supabase/client'
import { BowlDoodle } from './icons/Doodles'
import { useT } from './i18n'

export function Login() {
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (create: boolean): Promise<void> => {
    setCreating(create)
    setBusy(true)
    setError(null)
    const creds = { email: email.trim(), password }
    const { error: e } = create ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds)
    setBusy(false)
    if (e) {
      log.warn('auth.failed', { action: create ? 'signUp' : 'signIn', reason: e.message })
      setError(e.message)
    }
    // Success arrives through onAuthStateChange in App.
  }

  return (
    <main class="login">
      <header class="login-mast">
        <BowlDoodle class="doodle-lg" />
        <h1><span>Longhorn</span> <span>Macros</span></h1>
        <p>{t.t('login.tagline')}</p>
      </header>
      <form onSubmit={(ev) => { ev.preventDefault(); void submit(false) }}>
        <label>
          {t.t('login.email')}
          <input type="email" autocomplete="email" required value={email}
            onInput={(ev) => { setEmail(ev.currentTarget.value) }} />
        </label>
        <label>
          {t.t('login.password')}
          <input type="password" autocomplete={creating ? 'new-password' : 'current-password'} required minLength={6}
            value={password} onInput={(ev) => { setPassword(ev.currentTarget.value) }} />
        </label>
        {error !== null && <p role="alert" class="error">{error}</p>}
        <button type="submit" class="primary" disabled={busy}>{t.t('login.signIn')}</button>
        <button type="button" disabled={busy}
          onClick={(ev) => { if (ev.currentTarget.form?.reportValidity()) void submit(true) }}>
          {t.t('login.createAccount')}
        </button>
      </form>
    </main>
  )
}
