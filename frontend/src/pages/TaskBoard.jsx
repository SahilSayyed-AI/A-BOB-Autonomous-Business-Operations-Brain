import React, { useState, useEffect } from 'react'
import { getTasks, createTask, updateTaskStatus, simulateFailure, getEmployees } from '../services/api'

const COLUMNS = ['TODO', 'ACTIVE', 'DONE', 'BLOCKED']

const COL_STYLE = {
  TODO:    { header: 'text-zinc-500',    border: 'border-zinc-200',   bg: 'bg-zinc-50'    },
  ACTIVE:  { header: 'text-sky-600',     border: 'border-sky-100',    bg: 'bg-sky-50'     },
  DONE:    { header: 'text-emerald-600', border: 'border-emerald-100',bg: 'bg-emerald-50' },
  BLOCKED: { header: 'text-red-600',     border: 'border-red-100',    bg: 'bg-red-50'     },
}

const PRIORITY_LEFT = {
  CRITICAL: 'border-l-red-500',
  HIGH:     'border-l-orange-400',
  MEDIUM:   'border-l-amber-400',
  LOW:      'border-l-zinc-300',
}

const PRIORITY_LABEL = {
  CRITICAL: 'text-red-600',
  HIGH:     'text-orange-500',
  MEDIUM:   'text-amber-500',
  LOW:      'text-zinc-400',
}

const DEFAULT_TASKS = [
  { id: 'task_001', title: 'Set up CI/CD pipeline',        description: 'Configure GitHub Actions', owner_name: 'Priya Sharma', owner_id: 'emp_001', priority: 'HIGH',     status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+86400000).toISOString() },
  { id: 'task_002', title: 'Write Q2 product roadmap',     description: 'Define features for Q2',   owner_name: 'Rahul Verma',  owner_id: 'emp_002', priority: 'HIGH',     status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+172800000).toISOString() },
  { id: 'task_003', title: 'Design new dashboard mockups', description: 'Figma designs for v2',     owner_name: 'Anita Desai',  owner_id: 'emp_003', priority: 'MEDIUM',   status: 'TODO',   source: 'MANUAL', sla_deadline: new Date(Date.now()+259200000).toISOString() },
  { id: 'task_004', title: 'Fix login page bug',           description: 'Auth token expiry issue',  owner_name: 'Priya Sharma', owner_id: 'emp_001', priority: 'CRITICAL', status: 'ACTIVE', source: 'MANUAL', sla_deadline: new Date(Date.now()+28800000).toISOString() },
  { id: 'task_005', title: 'Prepare investor deck',        description: 'Slides for Series A',      owner_name: 'Rahul Verma',  owner_id: 'emp_002', priority: 'HIGH',     status: 'TODO',   source: 'MANUAL', sla_deadline: new Date(Date.now()+345600000).toISOString() },
]

const DEFAULT_EMPLOYEES = [
  { id: 'emp_001', name: 'Priya Sharma', role: 'Software Engineer' },
  { id: 'emp_002', name: 'Rahul Verma',  role: 'Product Manager'   },
  { id: 'emp_003', name: 'Anita Desai',  role: 'UI Designer'       },
]

export default function TaskBoard() {
  const [tasks, setTasks]         = useState(DEFAULT_TASKS)
  const [employees, setEmployees] = useState(DEFAULT_EMPLOYEES)
  const [form, setForm]           = useState({ title: '', priority: 'MEDIUM', owner_id: '', sla_hours: 48 })
  const [showForm, setShowForm]   = useState(false)
  const [loading, setLoading]     = useState({})

  const load = async () => {
    try {
      const [t, e] = await Promise.all([getTasks(), getEmployees()])
      setTasks(t); setEmployees(e)
    } catch {
      // Backend not reachable — keep showing default seed data
    }
  }

  useEffect(() => { load(); const id = setInterval(load, 4000); return () => clearInterval(id) }, [])

  const byStatus = s => tasks.filter(t => t.status === s)

  const handleStatus = async (id, status) => {
    setLoading(l => ({ ...l, [id]: true }))
    try { await updateTaskStatus(id, status); await load() } catch {}
    setLoading(l => ({ ...l, [id]: false }))
  }

  const handleFail = async (id) => {
    setLoading(l => ({ ...l, [id + 'f']: true }))
    try { await simulateFailure(id); await load() } catch {}
    setLoading(l => ({ ...l, [id + 'f']: false }))
  }

  const handleCreate = async () => {
    if (!form.title.trim()) return
    const emp = employees.find(e => e.id === form.owner_id)
    try {
      await createTask({ ...form, owner_name: emp?.name || 'Unassigned', sla_hours: Number(form.sla_hours) })
      setForm({ title: '', priority: 'MEDIUM', owner_id: '', sla_hours: 48 })
      setShowForm(false)
      await load()
    } catch {}
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Task Board</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Click to update task status or simulate failures</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="bg-black hover:bg-zinc-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          {showForm ? 'Cancel' : 'New Task'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="border border-zinc-200 rounded-lg p-5 bg-zinc-50">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Create Task</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <input
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Task title"
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
              >
                {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">Assign to</label>
              <select
                value={form.owner_id}
                onChange={e => setForm({ ...form, owner_id: e.target.value })}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
              >
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1.5">SLA (hours)</label>
              <input
                type="number"
                value={form.sla_hours}
                onChange={e => setForm({ ...form, sla_hours: e.target.value })}
                className="w-full border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleCreate}
              className="bg-black hover:bg-zinc-800 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
            >
              Create Task
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border border-zinc-300 text-zinc-600 hover:bg-white text-sm px-4 py-2 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colTasks = byStatus(col)
          const s = COL_STYLE[col]
          return (
            <div key={col} className={`border ${s.border} rounded-lg`}>
              <div className={`px-4 py-3 border-b ${s.border} ${s.bg} flex items-center justify-between`}>
                <span className={`text-xs font-semibold uppercase tracking-wide ${s.header}`}>{col}</span>
                <span className="text-xs text-zinc-400 bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-medium">
                  {colTasks.length}
                </span>
              </div>
              <div className="p-3 space-y-2 min-h-32">
                {colTasks.map(t => (
                  <div
                    key={t.id}
                    className={`bg-white border border-zinc-200 border-l-4 ${PRIORITY_LEFT[t.priority]} rounded-lg p-3`}
                  >
                    <p className="text-sm text-zinc-800 font-medium leading-snug mb-2">{t.title.slice(0, 65)}</p>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-zinc-400">{t.owner_name.split(' ')[0]}</span>
                      <span className={`text-xs font-semibold ${PRIORITY_LABEL[t.priority]}`}>{t.priority}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {col !== 'DONE' && (
                        <button
                          onClick={() => handleStatus(t.id, 'DONE')}
                          disabled={loading[t.id]}
                          className="text-xs border border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                        >
                          Mark Done
                        </button>
                      )}
                      {col !== 'ACTIVE' && col !== 'DONE' && (
                        <button
                          onClick={() => handleStatus(t.id, 'ACTIVE')}
                          disabled={loading[t.id]}
                          className="text-xs border border-sky-200 text-sky-700 hover:bg-sky-50 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                        >
                          Activate
                        </button>
                      )}
                      {col === 'ACTIVE' && (
                        <button
                          onClick={() => handleFail(t.id)}
                          disabled={loading[t.id + 'f']}
                          className="text-xs border border-red-200 text-red-600 hover:bg-red-50 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                        >
                          Simulate Fail
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="text-center py-6 text-zinc-300 text-xs">No tasks</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
