import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

const inputClass =
  'bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'signIn') await signIn(email, password)
      else await signUp(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="h-full flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col gap-4">
        <h1 className="text-lg font-bold text-center">{mode === 'signIn' ? 'Sign in' : 'Sign up'}</h1>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-500">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className={inputClass}
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg px-3 py-2 text-xs font-normal"
        >
          {mode === 'signIn' ? 'Sign in' : 'Sign up'}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null)
            setMode((m) => (m === 'signIn' ? 'signUp' : 'signIn'))
          }}
          className="text-[11px] text-slate-400 hover:text-slate-200"
        >
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}
