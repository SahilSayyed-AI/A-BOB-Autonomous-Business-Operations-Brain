import React, { useState, useEffect } from 'react'
import { predictDelays, smartAssign, getTasks, getLogs, sendChat } from '../services/api'

const RISK_BADGE = {
  HIGH:   'bg-red-50 text-red-700 border border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-700 border border-amber-200',
  LOW:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

const NL_SUGGESTIONS = [
  'How many tasks are blocked?',
  'Which employee has the most tasks?',
  'What failed recently?',
  'Show me high priority tasks',
  'What is the system health status?',
]

export default function Intelligence() {
  const [tab, setTab]               = useState('predict')
  const [predictions, setPredictions] = useState(null)
  const [tasks, setTasks]           = useState([])
  const [logs, setLogs]             = useState([])
  const [assignResult, setAssignResult] = useState(null)
  const [selectedTask, setSelectedTask] = useState('')
  const [loading, setLoading]       = useState(false)
  const [nlInput, setNlInput]       = useState('')
  const [nlResult, setNlResult]     = useState(null)
  const [nlLoading, setNlLoading]   = useState(false)
  const [learnData, setLearnData]   = useState(null)

  useEffect(() => {
    getTasks().then(setTasks).catch(() => {})
    getLogs().then(setLogs).catch(() => {})
  }, [])

  const handlePredict = async () => {
    setLoading(true)
    try { setPredictions(await predictDelays()) } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const handleAssign = async () => {
    if (!selectedTask) return
    setLoading(true)
    try { setAssignResult(await smartAssign(selectedTask)) } catch (e) { alert(e.message) }
    setLoading(false)
  }

  const handleNL = async (query) => {
    const q = query || nlInput.trim()
    if (!q) return
    setNlInput(q)
    setNlLoading(true)
    setNlResult(null)
    try {
      const res = await sendChat(q)
      setNlResult(res.reply)
    } catch { setNlResult('Unable to process query. Check your API connection.') }
    setNlLoading(false)
  }

  const computeLearn = () => {
    const active  = tasks.filter(t => t.status !== 'DONE')
    const done    = tasks.filter(t => t.status === 'DONE')
    const blocked = tasks.filter(t => t.status === 'BLOCKED')

    // Avg SLA used on done tasks
    const slaUsed = done.map(t => {
      const c = new Date(t.created_at), u = new Date(t.updated_at)
      return (u - c) / 3600000
    })
    const avgCompletion = slaUsed.length ? Math.round(slaUsed.reduce((a, b) => a + b, 0) / slaUsed.length) : 0

    // Failure counts from logs
    const failLogs = logs.filter(l => l.status === 'FAIL' || l.status === 'BLOCKED')
    const agentFailMap = {}
    failLogs.forEach(l => { agentFailMap[l.agent] = (agentFailMap[l.agent] || 0) + 1 })
    const topFailAgent = Object.entries(agentFailMap).sort((a, b) => b[1] - a[1])[0]

    // Retry success
    const retries = logs.filter(l => l.action?.includes('RETRY') || l.status?.includes('RETRY'))
    const retryOK = logs.filter(l => l.action?.includes('RETRY') && l.status === 'OK')
    const retryRate = retries.length ? Math.round((retryOK.length / retries.length) * 100) : 0

    // Priority distribution
    const priorityMap = {}
    tasks.forEach(t => { priorityMap[t.priority] = (priorityMap[t.priority] || 0) + 1 })

    setLearnData({
      totalTasks: tasks.length,
      completionRate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
      blockRate: tasks.length ? Math.round((blocked.length / tasks.length) * 100) : 0,
      avgCompletion,
      topFailAgent: topFailAgent ? `${topFailAgent[0]} (${topFailAgent[1]} failures)` : 'None',
      retrySuccessRate: retryRate,
      totalLogs: logs.length,
      priorityMap,
    })
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Intelligence</h1>
        <p className="text-zinc-400 text-sm mt-0.5">AI-powered analysis, predictions, and natural language queries</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {[
          ['predict', 'Delay Prediction'],
          ['assign',  'Smart Assign'],
          ['nl',      'NL Commands'],
          ['learn',   'Learn'],
        ].map(([k, l]) => (
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

      {/* Delay Prediction */}
      {tab === 'predict' && (
        <div className="space-y-5">
          <div className="border border-zinc-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">Delay Prediction</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Analyses all active tasks, calculates SLA elapsed percentage, and flags tasks at risk of missing their deadline.
            </p>
            <button
              onClick={handlePredict}
              disabled={loading}
              className="bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
            >
              {loading ? 'Analysing...' : 'Run Delay Prediction'}
            </button>
          </div>

          {predictions && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-zinc-200 rounded-lg p-5 text-center">
                  <div className="text-3xl font-bold text-red-600">{predictions.high_risk}</div>
                  <div className="text-xs text-zinc-400 mt-1">High Risk Tasks</div>
                </div>
                <div className="border border-zinc-200 rounded-lg p-5 text-center">
                  <div className="text-3xl font-bold text-zinc-900">{predictions.predictions?.length || 0}</div>
                  <div className="text-xs text-zinc-400 mt-1">Tasks Analysed</div>
                </div>
              </div>

              <div className="border border-zinc-200 rounded-lg">
                <div className="px-5 py-3 border-b border-zinc-100">
                  <h3 className="text-sm font-semibold text-zinc-700">Risk Report</h3>
                </div>
                {predictions.predictions?.length === 0 ? (
                  <div className="px-5 py-6 text-center text-zinc-400 text-sm">No active tasks to analyse</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Task</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Owner</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">SLA Elapsed</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Risk</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.predictions?.map(p => (
                        <tr key={p.task_id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                          <td className="px-5 py-3 text-zinc-800">{p.title.slice(0, 45)}</td>
                          <td className="px-5 py-3 text-zinc-500">{p.owner}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${p.sla_pct >= 90 ? 'bg-red-500' : p.sla_pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, p.sla_pct)}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-400">{p.sla_pct}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${RISK_BADGE[p.risk] || RISK_BADGE.LOW}`}>
                              {p.risk}
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

      {/* Smart Assign */}
      {tab === 'assign' && (
        <div className="space-y-5">
          <div className="border border-zinc-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">Smart Assignment</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Select any task and A-BOB will score all employees by workload and assign the task to the best available person.
            </p>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Select Task</label>
                <select
                  value={selectedTask}
                  onChange={e => setSelectedTask(e.target.value)}
                  className="w-full border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
                >
                  <option value="">Choose a task...</option>
                  {tasks.filter(t => t.status !== 'DONE').map(t => (
                    <option key={t.id} value={t.id}>{t.title.slice(0, 55)} [{t.owner_name}]</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleAssign}
                disabled={loading || !selectedTask}
                className="bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-sm font-medium px-5 py-2 rounded transition-colors shrink-0"
              >
                {loading ? 'Assigning...' : 'Smart Assign'}
              </button>
            </div>
          </div>

          {assignResult && (
            <div className="space-y-4">
              {assignResult.assigned_to && (
                <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-5">
                  <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-1">Assigned</div>
                  <p className="text-zinc-900 font-medium">{assignResult.assigned_to.employee_name}</p>
                  <p className="text-zinc-500 text-sm">{assignResult.assigned_to.role}</p>
                  <p className="text-zinc-400 text-xs mt-1">{assignResult.assigned_to.reason}</p>
                </div>
              )}
              <div className="border border-zinc-200 rounded-lg">
                <div className="px-5 py-3 border-b border-zinc-100">
                  <h3 className="text-sm font-semibold text-zinc-700">Candidate Scores</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100">
                      <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Rank</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Employee</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Reason</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignResult.candidates?.map((c, i) => (
                      <tr key={c.employee_id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50">
                        <td className="px-5 py-3 text-zinc-400 text-xs font-medium">#{i + 1}</td>
                        <td className="px-5 py-3">
                          <div className="text-zinc-800 font-medium">{c.employee_name}</div>
                        </td>
                        <td className="px-5 py-3 text-zinc-400 text-xs">{c.reason}</td>
                        <td className="px-5 py-3 text-right font-bold text-zinc-900">{c.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NL Commands */}
      {tab === 'nl' && (
        <div className="space-y-5">
          <div className="border border-zinc-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">Natural Language Commands</h3>
            <p className="text-zinc-400 text-sm mb-4">
              Ask questions about your system in plain English. A-BOB will query live data and respond.
            </p>
            <div className="flex gap-3">
              <input
                value={nlInput}
                onChange={e => setNlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNL()}
                placeholder="e.g. How many tasks are blocked?"
                className="flex-1 border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
              <button
                onClick={() => handleNL()}
                disabled={nlLoading || !nlInput.trim()}
                className="bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
              >
                {nlLoading ? 'Querying...' : 'Ask'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {NL_SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleNL(s)}
                  className="text-xs border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 px-3 py-1.5 rounded transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {nlLoading && (
            <div className="border border-zinc-200 rounded-lg p-5">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
                Processing query...
              </div>
            </div>
          )}

          {nlResult && !nlLoading && (
            <div className="border border-zinc-200 rounded-lg p-5">
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Response</div>
              <p className="text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap">{nlResult}</p>
            </div>
          )}
        </div>
      )}

      {/* Learn */}
      {tab === 'learn' && (
        <div className="space-y-5">
          <div className="border border-zinc-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-zinc-700 mb-1">System Learning Report</h3>
            <p className="text-zinc-400 text-sm mb-4">
              A-BOB analyses your task and log history to surface patterns, failure trends, and efficiency metrics.
            </p>
            <button
              onClick={computeLearn}
              className="bg-black hover:bg-zinc-800 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
            >
              Generate Report
            </button>
          </div>

          {learnData && (
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Task Completion Rate', value: `${learnData.completionRate}%`, sub: `${learnData.totalTasks} total tasks` },
                  { label: 'Block Rate',            value: `${learnData.blockRate}%`,      sub: 'tasks that got blocked' },
                  { label: 'Retry Success Rate',    value: `${learnData.retrySuccessRate}%`, sub: 'retries that recovered' },
                ].map(m => (
                  <div key={m.label} className="border border-zinc-200 rounded-lg p-5">
                    <div className="text-3xl font-bold text-zinc-900">{m.value}</div>
                    <div className="text-sm font-medium text-zinc-600 mt-1">{m.label}</div>
                    <div className="text-xs text-zinc-400 mt-0.5">{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              <div className="border border-zinc-200 rounded-lg p-5 space-y-4">
                <h3 className="text-sm font-semibold text-zinc-700">Learned Patterns</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Avg task completion time', value: learnData.avgCompletion ? `${learnData.avgCompletion}h` : 'Insufficient data' },
                    { label: 'Most failure-prone agent',  value: learnData.topFailAgent },
                    { label: 'Total audit entries',       value: learnData.totalLogs },
                  ].map(p => (
                    <div key={p.label} className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0">
                      <span className="text-sm text-zinc-500">{p.label}</span>
                      <span className="text-sm font-medium text-zinc-900">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority distribution */}
              <div className="border border-zinc-200 rounded-lg p-5">
                <h3 className="text-sm font-semibold text-zinc-700 mb-4">Task Priority Distribution</h3>
                {Object.entries(learnData.priorityMap).map(([priority, count]) => {
                  const pct = Math.round((count / learnData.totalTasks) * 100)
                  return (
                    <div key={priority} className="flex items-center gap-3 mb-2.5">
                      <span className="text-xs font-medium text-zinc-500 w-16">{priority}</span>
                      <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-800 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 w-10 text-right">{count} ({pct}%)</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
