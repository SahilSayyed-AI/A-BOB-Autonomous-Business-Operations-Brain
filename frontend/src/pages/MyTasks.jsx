import React, { useState, useEffect } from 'react'
import { getTasks } from '../services/api'
import { useAuth } from '../AuthContext'

const STATUS_BADGE = {
  TODO:    'bg-zinc-50 text-zinc-500 border border-zinc-200',
  ACTIVE:  'bg-sky-50 text-sky-700 border border-sky-200',
  DONE:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  BLOCKED: 'bg-red-50 text-red-700 border border-red-200',
}
const PRIORITY_LEFT = {
  CRITICAL: 'border-l-red-500',
  HIGH:     'border-l-orange-400',
  MEDIUM:   'border-l-amber-400',
  LOW:      'border-l-zinc-200',
}
const PRIORITY_LABEL = {
  CRITICAL: 'text-red-600',
  HIGH:     'text-orange-500',
  MEDIUM:   'text-amber-500',
  LOW:      'text-zinc-400',
}

const ALL_DEFAULT_TASKS = [
  { id: 'task_001', title: 'Set up CI/CD pipeline',        description: 'Configure GitHub Actions', owner_name: 'Priya Sharma', owner_id: 'emp_001', priority: 'HIGH',     status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+86400000).toISOString() },
  { id: 'task_002', title: 'Write Q2 product roadmap',     description: 'Define features for Q2',   owner_name: 'Rahul Verma',  owner_id: 'emp_002', priority: 'HIGH',     status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+172800000).toISOString() },
  { id: 'task_003', title: 'Design new dashboard mockups', description: 'Figma designs for v2',     owner_name: 'Anita Desai',  owner_id: 'emp_003', priority: 'MEDIUM',   status: 'TODO',   source: 'MANUAL', sla_deadline: new Date(Date.now()+259200000).toISOString() },
  { id: 'task_004', title: 'Fix login page bug',           description: 'Auth token expiry issue',  owner_name: 'Priya Sharma', owner_id: 'emp_001', priority: 'CRITICAL', status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+28800000).toISOString() },
  { id: 'task_005', title: 'Prepare investor deck',        description: 'Slides for Series A',      owner_name: 'Rahul Verma',  owner_id: 'emp_002', priority: 'HIGH',     status: 'TODO',   source: 'MANUAL', sla_deadline: new Date(Date.now()+345600000).toISOString() },
]

function SLALabel({ deadline }) {
  const now = new Date()
  const due = new Date(deadline)
  const diffH = Math.round((due - now) / 3600000)
  if (diffH < 0)  return <span className="text-xs text-red-600 font-medium">{Math.abs(diffH)}h overdue</span>
  if (diffH < 4)  return <span className="text-xs text-orange-500 font-medium">{diffH}h left</span>
  if (diffH < 24) return <span className="text-xs text-amber-500">{diffH}h left</span>
  return <span className="text-xs text-zinc-400">{Math.floor(diffH / 24)}d left</span>
}

function OnboardingProgress({ tasks }) {
  const ob = tasks.filter(t => t.source === 'ONBOARDING' || t.source === 'AGENT')
  if (ob.length === 0) return null
  const done = ob.filter(t => t.status === 'DONE').length
  const pct  = Math.round((done / ob.length) * 100)
  return (
    <div className="border border-zinc-200 rounded-xl p-5 mb-2">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-800">Onboarding Progress</h3>
          <p className="text-xs text-zinc-400 mt-0.5">{done} of {ob.length} steps complete</p>
        </div>
        <div className="text-2xl font-bold text-zinc-900">{pct}%</div>
      </div>
      <div className="w-full bg-zinc-100 rounded-full h-1.5 mb-4">
        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-1.5">
        {ob.map(t => (
          <div key={t.id} className="flex items-center gap-2.5 text-sm">
            <span className={`text-xs font-mono ${t.status === 'DONE' ? 'text-emerald-500' : t.status === 'BLOCKED' ? 'text-red-500' : 'text-zinc-300'}`}>
              {t.status === 'DONE' ? '[x]' : t.status === 'BLOCKED' ? '[!]' : t.status === 'ACTIVE' ? '[~]' : '[ ]'}
            </span>
            <span className={t.status === 'DONE' ? 'text-zinc-400 line-through' : 'text-zinc-700'}>{t.title.slice(0, 60)}</span>
            {t.status === 'BLOCKED' && <span className="text-xs text-red-500 ml-auto">Retrying...</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MyTasks() {
  const { user } = useAuth()
  const [allTasks, setAllTasks] = useState(ALL_DEFAULT_TASKS)
  const [loading, setLoading]   = useState(false)
  const [filter, setFilter]     = useState('ALL')

  const load = async () => {
    try {
      const t = await getTasks()
      setAllTasks(t)
    } catch {
      // Backend not reachable — keep showing default seed data
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 10000)
    return () => clearInterval(id)
  }, [])

  const myTasks = allTasks.filter(t =>
    t.owner_id === user.id ||
    t.owner_name?.toLowerCase().includes(user.name.split(' ')[0].toLowerCase())
  )
  const filtered = filter === 'ALL' ? myTasks : myTasks.filter(t => t.status === filter)
  const counts = { ALL: myTasks.length, ACTIVE: 0, TODO: 0, DONE: 0, BLOCKED: 0 }
  myTasks.forEach(t => { if (counts[t.status] !== undefined) counts[t.status]++ })

  if (loading) return <div className="p-8 text-zinc-400 text-sm">Loading tasks...</div>

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">My Tasks</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{user.name} · Employee</p>
        </div>
        <button onClick={load} className="text-xs text-zinc-400 hover:text-zinc-700 transition-colors border border-zinc-200 px-3 py-1.5 rounded">
          Refresh
        </button>
      </div>

      <OnboardingProgress tasks={myTasks} />

      {counts.BLOCKED > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-red-700">{counts.BLOCKED} task{counts.BLOCKED > 1 ? 's' : ''} blocked</span>
          <span className="text-red-400 text-sm"> · A-BOB is attempting recovery</span>
        </div>
      )}

      <div className="flex gap-1.5 border-b border-zinc-200">
        {['ALL', 'ACTIVE', 'TODO', 'DONE', 'BLOCKED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${filter === s ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-700'}`}>
            {s} <span className="text-xs opacity-60 ml-1">{counts[s]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-zinc-400 text-sm">
          {filter === 'ALL' ? 'No tasks assigned yet.' : `No ${filter.toLowerCase()} tasks.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <div key={task.id} className={`bg-white border border-zinc-200 border-l-4 ${PRIORITY_LEFT[task.priority]} rounded-lg p-4`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 leading-snug">{task.title}</p>
                  {task.description && <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`text-xs font-medium ${PRIORITY_LABEL[task.priority]}`}>{task.priority}</span>
                    <span className="text-zinc-200">·</span>
                    <span className="text-xs text-zinc-400">{task.source}</span>
                    <span className="text-zinc-200">·</span>
                    <SLALabel deadline={task.sla_deadline} />
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${STATUS_BADGE[task.status] || STATUS_BADGE.TODO}`}>{task.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
