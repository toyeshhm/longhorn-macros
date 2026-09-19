import { useState } from 'preact/hooks'
import { log } from '../log'
import { supabase } from '../supabase/client'

export function Login() {
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
      <img class="mark" src="/logo.svg" alt="" width={44} height={44} />
      <h1>Longhorn Macros</h1>
      <p class="lede">Log UT dining meals against your daily targets.</p>
      <form onSubmit={(ev) => { ev.preventDefault(); void submit(false) }}>
        <label class="field">
          Email
          <input type="email" autocomplete="email" required value={email}
            onInput={(ev) => { setEmail(ev.currentTarget.value) }} />
        </label>
        <label class="field">
          Password
          <input type="password" autocomplete={creating ? 'new-password' : 'current-password'} required minLength={6}
            value={password} onInput={(ev) => { setPassword(ev.currentTarget.value) }} />
        </label>
        {error !== null && <p role="alert" class="error">{error}</p>}
        <button type="submit" class="primary" disabled={busy}>Sign in</button>
        <button type="button" disabled={busy}
          onClick={(ev) => { if (ev.currentTarget.form?.reportValidity()) void submit(true) }}>
          Create account
        </button>
      </form>
    </main>
  )
}
