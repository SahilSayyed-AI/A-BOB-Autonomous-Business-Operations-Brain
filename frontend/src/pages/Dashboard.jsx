import React, { useState, useEffect } from 'react'
import { getHealth, getAgents, getTasks, getEmployees, getEvents } from '../services/api'

const STATUS_COLOR = {
  HEALTHY:  'text-emerald-600',
  AT_RISK:  'text-amber-600',
  CRITICAL: 'text-red-600',
}

const AGENT_DOT = {
  IDLE:    'bg-zinc-300',
  RUNNING: 'bg-sky-500',
  DONE:    'bg-emerald-500',
  ERROR:   'bg-red-500',
}

const PRIORITY_COLOR = {
  CRITICAL: 'text-red-600',
  HIGH:     'text-orange-500',
  MEDIUM:   'text-amber-500',
  LOW:      'text-zinc-400',
}

const STATUS_BADGE = {
  DONE:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  BLOCKED: 'bg-red-50 text-red-700 border border-red-200',
  ACTIVE:  'bg-sky-50 text-sky-700 border border-sky-200',
  TODO:    'bg-zinc-50 text-zinc-500 border border-zinc-200',
}

const DEFAULT_EMPLOYEES = [
  { id: 'emp_001', name: 'Priya Sharma',  role: 'Software Engineer', department: 'Engineering', email: 'priya@company.com', status: 'ACTIVE', task_ids: ['task_001','task_004'] },
  { id: 'emp_002', name: 'Rahul Verma',   role: 'Product Manager',   department: 'Product',     email: 'rahul@company.com', status: 'ACTIVE', task_ids: ['task_002','task_005'] },
  { id: 'emp_003', name: 'Anita Desai',   role: 'UI Designer',       department: 'Design',      email: 'anita@company.com', status: 'ACTIVE', task_ids: ['task_003'] },
]

const DEFAULT_TASKS = [
  { id: 'task_001', title: 'Set up CI/CD pipeline',        description: 'Configure GitHub Actions', owner_name: 'Priya Sharma', owner_id: 'emp_001', priority: 'HIGH',     status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+86400000).toISOString() },
  { id: 'task_002', title: 'Write Q2 product roadmap',     description: 'Define features for Q2',   owner_name: 'Rahul Verma',  owner_id: 'emp_002', priority: 'HIGH',     status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+172800000).toISOString() },
  { id: 'task_003', title: 'Design new dashboard mockups', description: 'Figma designs for v2',     owner_name: 'Anita Desai',  owner_id: 'emp_003', priority: 'MEDIUM',   status: 'TODO',   source: 'MANUAL', sla_deadline: new Date(Date.now()+259200000).toISOString() },
  { id: 'task_004', title: 'Fix login page bug',           description: 'Auth token expiry issue',  owner_name: 'Priya Sharma', owner_id: 'emp_001', priority: 'CRITICAL', status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+28800000).toISOString() },
  { id: 'task_005', title: 'Prepare investor deck',        description: 'Slides for Series A',      owner_name: 'Rahul Verma',  owner_id: 'emp_002', priority: 'HIGH',     status: 'TODO',   source: 'MANUAL', sla_deadline: new Date(Date.now()+345600000).toISOString() },
]

const DEFAULT_HEALTH = { health_score: 82, health_status: 'HEALTHY', healthy: 3, warnings: 1, critical: 0, breached: 0 }

export default function Dashboard() {
  const [health, setHealth]       = useState(DEFAULT_HEALTH)
  const [agents, setAgents]       = useState([])
  const [tasks, setTasks]         = useState(DEFAULT_TASKS)
  const [employees, setEmployees] = useState(DEFAULT_EMPLOYEES)
  const [events, setEvents]       = useState([])

  const load = async () => {
    try {
      const [h, a, t, e, ev] = await Promise.all([
        getHealth(), getAgents(), getTasks(), getEmployees(), getEvents()
      ])
      setHealth(h); setAgents(a); setTasks(t); setEmployees(e)
      setEvents(ev.slice(0, 8))
    } catch {
      // Backend not reachable — keep showing default seed data
    }
  }

  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id) }, [])

  const active  = tasks.filter(t => t.status === 'ACTIVE').length
  const blocked = tasks.filter(t => t.status === 'BLOCKED').length
  const done    = tasks.filter(t => t.status === 'DONE').length

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Live operational overview · auto-refreshes every 5s</p>
        </div>
        {health && (
          <div className="text-right">
            <div className={`text-3xl font-bold ${STATUS_COLOR[health.health_status] || 'text-zinc-900'}`}>
              {health.health_score}
            </div>
            <div className={`text-xs font-medium ${STATUS_COLOR[health.health_status]}`}>
              {health.health_status}
            </div>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Employees',   value: employees.length, sub: 'registered' },
          { label: 'Active Tasks', value: active,          sub: 'in progress' },
          { label: 'Blocked',     value: blocked,          sub: 'need attention', alert: blocked > 0 },
          { label: 'Completed',   value: done,             sub: 'tasks done' },
        ].map(s => (
          <div key={s.label} className={`border rounded-lg p-5 ${s.alert ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white'}`}>
            <div className={`text-3xl font-bold ${s.alert ? 'text-red-600' : 'text-zinc-900'}`}>{s.value}</div>
            <div className="text-sm font-medium text-zinc-600 mt-1">{s.label}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Health breakdown */}
      {health && (
        <div className="border border-zinc-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Health Breakdown</h2>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Healthy',  value: health.healthy,  color: 'text-emerald-600' },
              { label: 'Warnings', value: health.warnings, color: 'text-amber-600' },
              { label: 'Critical', value: health.critical, color: 'text-orange-600' },
              { label: 'Breached', value: health.breached, color: 'text-red-600' },
            ].map(m => (
              <div key={m.label} className="text-center">
                <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-xs text-zinc-400 mt-1">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Agents */}
        <div className="border border-zinc-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Agent Status</h2>
          <div className="space-y-2">
            {agents.length === 0 && <p className="text-zinc-400 text-sm">No agents registered</p>}
            {agents.map(a => (
              <div key={a.agent_id} className="flex items-center justify-between py-1.5 border-b border-zinc-100 last:border-0">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${AGENT_DOT[a.status] || 'bg-zinc-300'}`} />
                  <span className="text-sm text-zinc-700">{a.agent_name}</span>
                </div>
                <span className="text-xs text-zinc-400 font-medium">{a.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        <div className="border border-zinc-200 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Recent Events</h2>
          <div className="space-y-2">
            {events.length === 0 && <p className="text-zinc-400 text-sm">No events yet</p>}
            {events.map(e => (
              <div key={e.id} className="py-1.5 border-b border-zinc-100 last:border-0">
                <div className="text-xs font-medium text-zinc-800">{e.event_type}</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {e.agent_id} · {new Date(e.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent tasks */}
      <div className="border border-zinc-200 rounded-lg">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-700">Recent Tasks</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Task</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Owner</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Priority</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wide">Status</th>
            </tr>
          </thead>
          <tbody>
            {tasks.slice(0, 7).map(t => (
              <tr key={t.id} className="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                <td className="px-5 py-3 text-zinc-800 font-medium">{t.title.slice(0, 50)}</td>
                <td className="px-5 py-3 text-zinc-500">{t.owner_name}</td>
                <td className={`px-5 py-3 text-xs font-semibold ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE[t.status] || STATUS_BADGE.TODO}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tasks.length === 0 && (
          <div className="px-5 py-6 text-center text-zinc-400 text-sm">No tasks yet</div>
        )}
      </div>
    </div>
  )
}
