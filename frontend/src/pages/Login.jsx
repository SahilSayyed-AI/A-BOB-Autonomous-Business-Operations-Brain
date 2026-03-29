import React, { useState } from 'react'
import { useAuth, DEMO_ACCOUNTS, ROLE_CONFIG } from '../AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async () => {
    setError('')
    if (!email || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    const result = login(email, password)
    if (!result.success) setError(result.error)
    setLoading(false)
  }

  const quickFill = (acc) => { setEmail(acc.email); setPassword(acc.password); setError('') }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-black flex-col justify-between p-12">
        <div>
          <div className="text-white text-2xl font-bold tracking-tight">A-BOB</div>
          <div className="text-zinc-500 text-sm mt-1">Autonomous Operations Brain</div>
        </div>
        <div>
          <p className="text-zinc-400 text-sm leading-relaxed max-w-sm">
            A multi-agent system that takes ownership of complex enterprise workflows — detecting failures, self-correcting, and maintaining a full audit trail.
          </p>
          <div className="mt-8 space-y-3">
            {['7-step automated onboarding', 'Real-time failure detection & recovery', 'Immutable audit trail', 'AI-powered task extraction'].map(f => (
              <div key={f} className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-white" />
                <span className="text-zinc-400 text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="text-zinc-600 text-xs">ET AI Hackathon 2026 · Track 2 — Enterprise Workflows</div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900">Sign in</h1>
            <p className="text-zinc-500 text-sm mt-1">Enter your credentials to continue</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="you@company.com"
                className="w-full border border-zinc-300 rounded px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full border border-zinc-300 rounded px-3 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white font-medium py-2.5 rounded text-sm transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          {/* Demo accounts */}
          <div className="mt-8">
            <p className="text-xs text-zinc-400 mb-3 uppercase tracking-wide font-medium">Demo accounts</p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.id}
                  onClick={() => quickFill(acc)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border border-zinc-200 rounded hover:border-zinc-400 hover:bg-zinc-50 transition-colors group text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-semibold">
                      {acc.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-800">{acc.name}</div>
                      <div className="text-xs text-zinc-400">{acc.email}</div>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded font-medium">
                    {ROLE_CONFIG[acc.roleKey].label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
