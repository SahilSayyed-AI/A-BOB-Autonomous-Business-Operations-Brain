import React, { useState, useEffect } from 'react'
import { processMeeting, getTasks } from '../services/api'

const SAMPLE = `Sarah will deploy the new authentication service by tomorrow.
John needs to update the API documentation before end of day.
Action item: Fix the mobile app crash on iOS 17.
We need to schedule a code review session for the new payment module.
Mark should prepare the Q3 performance report by Friday.
Todo: Update the staging environment with latest changes.
Emily will conduct user interviews for the new onboarding flow next week.`

const PRIORITY_BADGE = {
  CRITICAL: 'bg-red-50 text-red-700 border border-red-200',
  HIGH:     'bg-orange-50 text-orange-700 border border-orange-200',
  MEDIUM:   'bg-amber-50 text-amber-700 border border-amber-200',
  LOW:      'bg-zinc-50 text-zinc-500 border border-zinc-200',
}

function SLABar({ pct }) {
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className={`text-xs font-medium ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-zinc-400'}`}>
        {pct}%
      </span>
    </div>
  )
}

export default function WorkflowMonitor() {
  const [tab, setTab]             = useState('extract')
  const [transcript, setTranscript] = useState(SAMPLE)
  const [title, setTitle]         = useState('Sprint Planning Meeting')
  const [extractResult, setExtractResult] = useState(null)
  const [extracting, setExtracting] = useState(false)
  const [slaResult, setSlaResult] = useState(null)
  const [scanning, setScanning]   = useState(false)

  const handleExtract = async () => {
    if (!transcript.trim()) return
    setExtracting(true)
    try {
      const res = await processMeeting({ transcript, title, participants: [] })
      setExtractResult(res)
    } catch (e) { alert('Error: ' + e.message) }
    setExtracting(false)
  }

  const handleSLAScan = async () => {
    setScanning(true)
    try {
      const tasks = await getTasks()
      const now = new Date()
      const results = tasks
        .filter(t => t.status !== 'DONE')
        .map(t => {
          const deadline = new Date(t.sla_deadline)
          const created  = new Date(t.created_at)
          const total    = deadline - created
          const elapsed  = now - created
          const pct      = Math.round((elapsed / total) * 100)
          const hoursLeft = Math.round((deadline - now) / 3600000)
          return {
            ...t,
            sla_pct: Math.max(0, Math.min(110, pct)),
            hours_left: hoursLeft,
            sla_status: hoursLeft < 0 ? 'BREACHED' : pct >= 90 ? 'CRITICAL' : pct >= 70 ? 'WARNING' : 'OK',
          }
        })
        .sort((a, b) => b.sla_pct - a.sla_pct)
      setSlaResult(results)
    } catch (e) { alert('Error: ' + e.message) }
    setScanning(false)
  }

  const SLA_STATUS_BADGE = {
    BREACHED: 'bg-red-50 text-red-700 border border-red-200',
    CRITICAL: 'bg-orange-50 text-orange-700 border border-orange-200',
    WARNING:  'bg-amber-50 text-amber-700 border border-amber-200',
    OK:       'bg-emerald-50 text-emerald-700 border border-emerald-200',
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Workflow Monitor</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Extract tasks from meeting transcripts and scan SLA health</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {[['extract', 'Extract Tasks'], ['sla', 'SLA Scan']].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === k
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Extract Tasks tab */}
      {tab === 'extract' && (
        <div className="space-y-5">
          <div className="border border-zinc-200 rounded-lg p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Meeting Title</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Meeting Transcript</label>
              <textarea
                value={transcript}
                onChange={e => setTranscript(e.target.value)}
                rows={8}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 resize-none font-mono"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExtract}
                disabled={extracting}
                className="bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
              >
                {extracting ? 'Processing...' : 'Extract Tasks'}
              </button>
              <button
                onClick={() => setTranscript(SAMPLE)}
                className="border border-zinc-300 text-zinc-600 hover:bg-zinc-50 text-sm px-4 py-2 rounded transition-colors"
              >
                Load Sample
              </button>
            </div>
          </div>

          {extractResult && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="border border-zinc-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-zinc-700 mb-1">Extraction Summary</h3>
                <p className="text-sm text-zinc-500 mb-4">{extractResult.summary}</p>
                <div className="flex gap-6">
                  <div>
                    <div className="text-2xl font-bold text-zinc-900">{extractResult.tasks?.length || 0}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">Tasks Created</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-600">{extractResult.ambiguous?.length || 0}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">Need Clarification</div>
                  </div>
                </div>
              </div>

              {/* Created tasks */}
              {extractResult.tasks?.length > 0 && (
                <div className="border border-zinc-200 rounded-lg">
                  <div className="px-5 py-3 border-b border-zinc-100">
                    <h3 className="text-sm font-semibold text-zinc-700">Tasks Created ({extractResult.tasks.length})</h3>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Task</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Owner</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">SLA</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {extractResult.tasks.map(t => (
                        <tr key={t.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                          <td className="px-5 py-3 text-zinc-800">{t.title.slice(0, 55)}</td>
                          <td className="px-5 py-3 text-zinc-500">{t.owner_name}</td>
                          <td className="px-5 py-3 text-zinc-400">{t.sla_hours}h</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.LOW}`}>
                              {t.priority}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Ambiguous */}
              {extractResult.ambiguous?.length > 0 && (
                <div className="border border-amber-200 rounded-lg">
                  <div className="px-5 py-3 border-b border-amber-100 bg-amber-50">
                    <h3 className="text-sm font-semibold text-amber-800">Needs Clarification ({extractResult.ambiguous.length})</h3>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {extractResult.ambiguous.map((a, i) => (
                      <div key={i} className="px-5 py-4">
                        <p className="text-sm text-zinc-800 font-medium">{a.action}</p>
                        <p className="text-xs text-amber-600 mt-1">{a.reason}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Suggestion: {a.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SLA Scan tab */}
      {tab === 'sla' && (
        <div className="space-y-5">
          <div className="border border-zinc-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">SLA Health Scan</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Scans all active tasks, calculates how much of each SLA window has elapsed, and flags tasks at risk.
            </p>
            <button
              onClick={handleSLAScan}
              disabled={scanning}
              className="bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
            >
              {scanning ? 'Scanning...' : 'Run SLA Scan'}
            </button>
          </div>

          {slaResult && (
            <div className="space-y-4">
              {/* Counts */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Breached', count: slaResult.filter(t => t.sla_status === 'BREACHED').length, color: 'text-red-600' },
                  { label: 'Critical', count: slaResult.filter(t => t.sla_status === 'CRITICAL').length,  color: 'text-orange-600' },
                  { label: 'Warning',  count: slaResult.filter(t => t.sla_status === 'WARNING').length,   color: 'text-amber-600' },
                  { label: 'Healthy',  count: slaResult.filter(t => t.sla_status === 'OK').length,        color: 'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="border border-zinc-200 rounded-lg p-4 text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                    <div className="text-xs text-zinc-400 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="border border-zinc-200 rounded-lg">
                <div className="px-5 py-3 border-b border-zinc-100">
                  <h3 className="text-sm font-semibold text-zinc-700">Task SLA Report ({slaResult.length} active tasks)</h3>
                </div>
                {slaResult.length === 0 ? (
                  <div className="px-5 py-8 text-center text-zinc-400 text-sm">No active tasks to scan</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Task</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Owner</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">SLA Used</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Time Left</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slaResult.map(t => (
                        <tr key={t.id} className={`border-b border-zinc-50 last:border-0 hover:bg-zinc-50 ${t.sla_status === 'BREACHED' ? 'bg-red-50/50' : ''}`}>
                          <td className="px-5 py-3 text-zinc-800 font-medium">{t.title.slice(0, 45)}</td>
                          <td className="px-5 py-3 text-zinc-500">{t.owner_name}</td>
                          <td className="px-5 py-3"><SLABar pct={t.sla_pct} /></td>
                          <td className="px-5 py-3 text-sm">
                            {t.hours_left < 0
                              ? <span className="text-red-600 font-medium">{Math.abs(t.hours_left)}h overdue</span>
                              : <span className="text-zinc-500">{t.hours_left}h</span>
                            }
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${SLA_STATUS_BADGE[t.sla_status]}`}>
                              {t.sla_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
