import React, { useState } from 'react'
import { runDemo, resetDemo } from '../services/api'

const STEP_STYLE = {
  OK:        { border: 'border-emerald-200', bg: 'bg-emerald-50', label: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  FAIL:      { border: 'border-red-200',     bg: 'bg-red-50',     label: 'text-red-700',     badge: 'bg-red-50 text-red-700 border border-red-200' },
  RETRY:     { border: 'border-amber-200',   bg: 'bg-amber-50',   label: 'text-amber-700',   badge: 'bg-amber-50 text-amber-700 border border-amber-200' },
  ESCALATED: { border: 'border-orange-200',  bg: 'bg-orange-50',  label: 'text-orange-700',  badge: 'bg-orange-50 text-orange-700 border border-orange-200' },
}

const STEPS_INFO = [
  ['New employee Jordan Taylor is added to the system'],
  ['7-step onboarding workflow starts automatically'],
  ['JIRA API fails — system detects the error instantly'],
  ['Recovery Agent retries JIRA (attempt 1 of 2)'],
  ['Recovery Agent retries JIRA (attempt 2 of 2)'],
  ['After 3 failures, escalates to IT Operations Lead'],
  ['All actions logged in the immutable audit trail'],
  ['System health score updated in real time'],
]

export default function Demo() {
  const [result, setResult]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [resetting, setResetting]     = useState(false)
  const [visibleSteps, setVisibleSteps] = useState([])

  const runIt = async () => {
    setLoading(true)
    setResult(null)
    setVisibleSteps([])
    try {
      const res = await runDemo()
      setResult(res)
      res.steps.forEach((_, i) => {
        setTimeout(() => setVisibleSteps(v => [...v, i]), i * 600)
      })
    } catch (e) { alert('Demo error: ' + e.message) }
    setLoading(false)
  }

  const reset = async () => {
    setResetting(true)
    await resetDemo()
    setResult(null)
    setVisibleSteps([])
    setResetting(false)
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Live Demo</h1>
        <p className="text-zinc-400 text-sm mt-0.5">
          Runs the full autonomous workflow — onboarding, failure detection, recovery, escalation, and audit
        </p>
      </div>

      {/* What happens */}
      <div className="border border-zinc-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">What this demo shows</h2>
        <div className="space-y-2">
          {STEPS_INFO.map(([desc], i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xs font-mono text-zinc-400 mt-0.5 w-6 shrink-0">{i + 1}.</span>
              <span className="text-sm text-zinc-600">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={runIt}
          disabled={loading}
          className="bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-sm font-semibold px-6 py-2.5 rounded transition-colors"
        >
          {loading ? 'Running demo...' : 'Run Full Demo'}
        </button>
        <button
          onClick={reset}
          disabled={resetting}
          className="border border-zinc-300 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 text-sm font-medium px-5 py-2.5 rounded transition-colors"
        >
          {resetting ? 'Resetting...' : 'Reset Data'}
        </button>
      </div>

      {/* Animated steps */}
      {result && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700">Execution Trace</h2>
          {result.steps.map((step, i) => {
            const s = STEP_STYLE[step.status] || STEP_STYLE.OK
            if (!visibleSteps.includes(i)) return null
            return (
              <div
                key={i}
                className={`border ${s.border} ${s.bg} rounded-lg p-4 flex items-start gap-4`}
                style={{ animation: 'fadeIn 0.3s ease-in' }}
              >
                <div className="shrink-0 mt-0.5">
                  <span className={`text-xs font-mono font-semibold ${s.label}`}>
                    Step {step.step}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-zinc-900">{step.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium border ${s.badge}`}>
                      {step.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">{step.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Summary */}
      {result && visibleSteps.length === result.steps.length && (
        <div className="border border-zinc-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-zinc-700 mb-4">Demo Complete</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Total Tasks',   value: result.total_tasks },
              { label: 'Audit Entries', value: result.total_logs },
              { label: 'Health Score',  value: result.health?.health_score },
            ].map(m => (
              <div key={m.label} className="border border-zinc-100 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-zinc-900">{m.value}</div>
                <div className="text-xs text-zinc-400 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-4">
            <p className="text-xs text-zinc-400 mb-1">Employee Onboarded</p>
            <p className="text-sm font-medium text-zinc-900">{result.employee?.name} — {result.employee?.role}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{result.employee?.department} · {result.employee?.email}</p>
          </div>
          <p className="text-xs text-zinc-400 mt-4">
            Navigate to Employees, Task Board, or Audit Logs to see the full output.
          </p>
        </div>
      )}
    </div>
  )
}
