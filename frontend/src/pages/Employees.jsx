import React, { useState, useEffect } from 'react'
import { getEmployees, addEmployee } from '../services/api'
import { useAuth } from '../AuthContext'

const STATUS_BADGE = {
  ACTIVE:     'bg-emerald-50 text-emerald-700 border border-emerald-200',
  ONBOARDING: 'bg-sky-50 text-sky-700 border border-sky-200',
  INACTIVE:   'bg-zinc-50 text-zinc-500 border border-zinc-200',
}
const TASK_STATUS_BADGE = {
  ACTIVE:  'bg-sky-50 text-sky-700 border border-sky-200',
  TODO:    'bg-zinc-50 text-zinc-500 border border-zinc-200',
  DONE:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
  BLOCKED: 'bg-red-50 text-red-700 border border-red-200',
}
const PRIORITY_COLOR = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-400',
  MEDIUM:   'bg-amber-400',
  LOW:      'bg-zinc-300',
}

export default function Employees() {
  const { config } = useAuth()
  const [employees, setEmployees] = useState([])
  const [expanded, setExpanded]   = useState(null)
  const [form, setForm]           = useState({ name: '', role: '', department: '', email: '', inject_jira_failure: false })
  const [result, setResult]       = useState(null)
  const [adding, setAdding]       = useState(false)
  const [showForm, setShowForm]   = useState(false)

  const load = async () => { try { setEmployees(await getEmployees()) } catch {} }
  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!form.name || !form.role || !form.department || !form.email) return alert('Fill all fields')
    setAdding(true); setResult(null)
    try {
      const res = await addEmployee(form)
      setResult(res)
      await load()
      setForm({ name: '', role: '', department: '', email: '', inject_jira_failure: false })
      setShowForm(false)
    } catch (e) { alert('Error: ' + e.message) }
    setAdding(false)
  }

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Employees</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Add an employee to trigger the automated onboarding workflow</p>
        </div>
        {config?.canAddEmployee && (
          <button
            onClick={() => setShowForm(s => !s)}
            className="bg-black hover:bg-zinc-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {showForm ? 'Cancel' : 'Add Employee'}
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && config?.canAddEmployee && (
        <div className="border border-zinc-200 rounded-lg p-6 bg-zinc-50">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">New Employee</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['name', 'Full Name', 'Rahul Sharma'],
              ['role', 'Job Title', 'Software Engineer'],
              ['department', 'Department', 'Engineering'],
              ['email', 'Email Address', 'rahul@company.com'],
            ].map(([k, l, p]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">{l}</label>
                <input
                  value={form[k]}
                  onChange={e => setForm({ ...form, [k]: e.target.value })}
                  placeholder={p}
                  className="w-full border border-zinc-300 rounded px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.inject_jira_failure}
                onChange={e => setForm({ ...form, inject_jira_failure: e.target.checked })}
                className="rounded border-zinc-300"
              />
              <span className="text-sm text-zinc-600">Simulate JIRA failure (demo mode)</span>
            </label>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={submit}
              disabled={adding}
              className="bg-black hover:bg-zinc-800 disabled:bg-zinc-400 text-white text-sm font-medium px-5 py-2 rounded transition-colors"
            >
              {adding ? 'Starting onboarding...' : 'Add Employee & Start Onboarding'}
            </button>
            <button onClick={() => setShowForm(false)} className="border border-zinc-300 text-zinc-600 hover:bg-zinc-100 text-sm px-4 py-2 rounded transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Onboarding result */}
      {result && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-lg p-5">
          <h3 className="text-emerald-800 font-semibold text-sm mb-3">Onboarding started — {result.employee?.name}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded border border-emerald-100 p-3 text-center">
              <div className="text-2xl font-bold text-zinc-900">{result.onboarding?.tasks_created || 0}</div>
              <div className="text-xs text-zinc-500 mt-1">Tasks Created</div>
            </div>
            <div className="bg-white rounded border border-emerald-100 p-3 text-center">
              <div className="text-sm font-semibold text-zinc-900">{result.onboarding?.steps?.step3?.buddy?.split('(')[0] || '—'}</div>
              <div className="text-xs text-zinc-500 mt-1">Buddy Assigned</div>
            </div>
            <div className="bg-white rounded border border-emerald-100 p-3 text-center">
              <div className="text-sm font-semibold text-zinc-900">{result.onboarding?.status}</div>
              <div className="text-xs text-zinc-500 mt-1">Status</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(result.onboarding?.steps?.step2?.accounts || {}).map(([k, v]) => (
              <span key={k} className={`text-xs px-2 py-1 rounded border font-medium ${v?.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                {k.toUpperCase()} {v?.ok ? 'OK' : 'FAILED'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Employee table */}
      <div className="border border-zinc-200 rounded-lg">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700">All Employees ({employees.length})</h2>
        </div>
        {employees.length === 0 ? (
          <div className="px-5 py-10 text-center text-zinc-400 text-sm">No employees yet. Add one above.</div>
        ) : (
          <div>
            {employees.map(emp => (
              <div key={emp.id} className="border-b border-zinc-100 last:border-0">
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-zinc-50 transition-colors"
                  onClick={() => setExpanded(expanded === emp.id ? null : emp.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-sm font-semibold shrink-0">
                      {emp.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{emp.name}</div>
                      <div className="text-xs text-zinc-400">{emp.role} · {emp.department}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-zinc-700">{emp.tasks?.length || 0} tasks</div>
                      <div className="text-xs text-zinc-400">{emp.email}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE[emp.status] || STATUS_BADGE.ACTIVE}`}>
                      {emp.status}
                    </span>
                    <span className="text-zinc-300 text-xs">{expanded === emp.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === emp.id && (
                  <div className="px-5 pb-4 bg-zinc-50 border-t border-zinc-100">
                    <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wide my-3">Assigned Tasks</h4>
                    {(!emp.tasks || emp.tasks.length === 0) ? (
                      <p className="text-zinc-400 text-sm">No tasks assigned yet.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <tbody>
                          {emp.tasks.map(t => (
                            <tr key={t.id} className="border-b border-zinc-100 last:border-0">
                              <td className="py-2 pr-4">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLOR[t.priority] || 'bg-zinc-300'}`} />
                                  <span className="text-zinc-800">{t.title.slice(0, 60)}</span>
                                </div>
                              </td>
                              <td className="py-2 pr-4">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${TASK_STATUS_BADGE[t.status] || TASK_STATUS_BADGE.TODO}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-2 text-xs text-zinc-400">{t.source}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
