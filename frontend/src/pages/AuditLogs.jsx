import React, { useState, useEffect } from 'react'
import { getLogs } from '../services/api'

const STATUS_BADGE = {
  OK:              'bg-emerald-50 text-emerald-700 border border-emerald-200',
  FAIL:            'bg-red-50 text-red-700 border border-red-200',
  BLOCKED:         'bg-red-50 text-red-700 border border-red-200',
  ESCALATED:       'bg-orange-50 text-orange-700 border border-orange-200',
  TIER_1_RETRY:    'bg-amber-50 text-amber-700 border border-amber-200',
  TIER_2_REASSIGN: 'bg-sky-50 text-sky-700 border border-sky-200',
  TIER_3_ESCALATE: 'bg-red-50 text-red-700 border border-red-200',
  FALLBACK:        'bg-amber-50 text-amber-700 border border-amber-200',
}

const AGENT_COLOR = {
  audit_agent:        'text-violet-600',
  execution_agent:    'text-sky-600',
  monitoring_agent:   'text-cyan-600',
  recovery_agent:     'text-red-600',
  decision_agent:     'text-amber-600',
  intelligence_agent: 'text-emerald-600',
  planner_agent:      'text-orange-600',
  onboarding:         'text-pink-600',
  meeting_service:    'text-teal-600',
  system:             'text-zinc-400',
}

export default function AuditLogs() {
  const [logs, setLogs]             = useState([])
  const [filter, setFilter]         = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [expanded, setExpanded]     = useState(null)

  const load = async () => { try { setLogs(await getLogs()) } catch {} }
  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id) }, [])

  const agents   = [...new Set(logs.map(l => l.agent))]
  const filtered = logs.filter(l =>
    (!filter || l.action.toLowerCase().includes(filter.toLowerCase()) || l.status.toLowerCase().includes(filter.toLowerCase())) &&
    (!agentFilter || l.agent === agentFilter)
  )

  const exportCSV = () => {
    const rows = [
      ['ID', 'Timestamp', 'Agent', 'Action', 'Status', 'Entity', 'Reason'],
      ...filtered.map(l => [
        l.id,
        l.timestamp,
        l.agent,
        l.action,
        l.status,
        `${l.entity_type} ${l.entity_id}`.trim(),
        l.reason || '',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `abob_audit_${Date.now()}.csv`
    a.click()
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Audit Logs</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Immutable record of every agent decision · auto-refreshes every 5s</p>
        </div>
        <button
          onClick={exportCSV}
          className="border border-zinc-300 text-zinc-600 hover:bg-zinc-50 text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search action or status..."
          className="border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 w-56"
        />
        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
        >
          <option value="">All Agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(filter || agentFilter) && (
          <button
            onClick={() => { setFilter(''); setAgentFilter('') }}
            className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-sm text-zinc-400">{filtered.length} entries</span>
      </div>

      {/* Log table */}
      <div className="border border-zinc-200 rounded-lg">
        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-400 text-sm">
            No log entries yet. Perform actions to generate an audit trail.
          </div>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Agent</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Action</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Entity</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => (
                  <React.Fragment key={log.id}>
                    <tr
                      className="border-b border-zinc-50 hover:bg-zinc-50 cursor-pointer transition-colors"
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    >
                      <td className="px-5 py-3 text-zinc-400 text-xs font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className={`px-5 py-3 text-xs font-semibold ${AGENT_COLOR[log.agent] || 'text-zinc-500'}`}>
                        {log.agent}
                      </td>
                      <td className="px-5 py-3 text-zinc-800">{log.action}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE[log.status] || 'bg-zinc-50 text-zinc-500 border border-zinc-200'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-zinc-400 font-mono">
                        {log.entity_type} {log.entity_id}
                      </td>
                      <td className="px-3 py-3 text-zinc-300 text-xs">
                        {expanded === log.id ? '▲' : '▼'}
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr className="bg-zinc-50 border-b border-zinc-100">
                        <td colSpan={6} className="px-5 py-4">
                          <div className="space-y-2">
                            {log.reason && (
                              <p className="text-sm text-zinc-600">
                                <span className="font-medium text-zinc-500">Reason: </span>{log.reason}
                              </p>
                            )}
                            {Object.keys(log.after_state || {}).length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">After State</p>
                                <pre className="text-xs text-zinc-600 bg-white border border-zinc-200 rounded p-3 overflow-x-auto font-mono">
                                  {JSON.stringify(log.after_state, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
