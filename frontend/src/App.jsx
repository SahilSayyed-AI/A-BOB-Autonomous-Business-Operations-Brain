import React from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth, ROLE_CONFIG } from './AuthContext'
import Login          from './pages/Login'
import Dashboard      from './pages/Dashboard'
import Employees      from './pages/Employees'
import TaskBoard      from './pages/TaskBoard'
import WorkflowMonitor from './pages/WorkflowMonitor'
import Intelligence   from './pages/Intelligence'
import AuditLogs      from './pages/AuditLogs'
import ChatPanel      from './pages/ChatPanel'
import Demo           from './pages/Demo'
import MyTasks        from './pages/MyTasks'
import AICodeAssistant from './pages/AICodeAssistant'
import BuddySystem    from './pages/BuddySystem'

const ALL_NAV = [
  { to: '/',             label: 'Dashboard',          icon: '⊞', roles: ['hr', 'buddy'] },
  { to: '/employees',    label: 'Employees',          icon: '👥', roles: ['hr'] },
  { to: '/tasks',        label: 'Task Board',         icon: '📋', roles: ['hr', 'buddy'] },
  { to: '/workflows',    label: 'Workflows',          icon: '⚙',  roles: ['hr', 'buddy'] },
  { to: '/intelligence', label: 'Intelligence',       icon: '🧠', roles: ['hr'] },
  { to: '/logs',         label: 'Audit Logs',         icon: '📜', roles: ['hr'] },
  { to: '/chat',         label: 'AI Chat',            icon: '💬', roles: ['hr', 'buddy'] },
  { to: '/demo',         label: 'Live Demo',          icon: '▶',  roles: ['hr'] },
  // Employee-only nav items
  { to: '/my-tasks',     label: 'My Tasks',           icon: '✅', roles: ['employee'] },
  { to: '/my-tasks',     label: 'My Tasks',           icon: '✅', roles: ['buddy'] },
  { to: '/ai-assistant', label: 'AI Code Assistant',  icon: '⚡', roles: ['employee', 'buddy'] },
  { to: '/buddy',        label: 'Connect with Buddy', icon: '🤝', roles: ['employee'] },
  { to: '/buddy',        label: 'Buddy Dashboard',    icon: '🤝', roles: ['buddy'] },
]

function Sidebar() {
  const { user, logout, config } = useAuth()
  const navItems = ALL_NAV.filter(n => n.roles.includes(user.roleKey))
  // dedupe by 'to+label' for buddy role
  const seen = new Set()
  const uniqueNav = navItems.filter(n => {
    const key = n.to + n.label
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return (
    <aside className="w-56 bg-black flex flex-col shrink-0 h-screen">
      <div className="px-5 py-5 border-b border-zinc-800">
        <div className="text-white font-bold text-lg tracking-tight">A-BOB</div>
        <div className="text-zinc-500 text-xs mt-0.5">Autonomous Operations Brain</div>
      </div>

      {user.roleKey === 'employee' && (
        <div className="px-4 py-3 border-b border-zinc-800">
          <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">My Workspace</div>
        </div>
      )}

      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {uniqueNav.map(n => (
          <NavLink
            key={n.to + n.label}
            to={n.to}
            end={n.to === '/' || n.to === '/my-tasks'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-white text-black font-semibold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
          >
            <span className="text-base leading-none">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {user.avatar}
          </div>
          <div className="min-w-0">
            <div className="text-white text-xs font-medium truncate">{user.name}</div>
            <div className="text-zinc-500 text-xs">{config.label}</div>
          </div>
        </div>
        <button onClick={logout} className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors">
          Sign out
        </button>
      </div>
    </aside>
  )
}

function AppShell() {
  const { user } = useAuth()
  if (!user) return <Login />

  const defaultRoute = user.roleKey === 'employee' ? '/my-tasks' : '/'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-white">
        <Routes>
          <Route path="/"             element={<Dashboard />} />
          <Route path="/employees"    element={<Employees />} />
          <Route path="/tasks"        element={<TaskBoard />} />
          <Route path="/workflows"    element={<WorkflowMonitor />} />
          <Route path="/intelligence" element={<Intelligence />} />
          <Route path="/logs"         element={<AuditLogs />} />
          <Route path="/chat"         element={<ChatPanel />} />
          <Route path="/demo"         element={<Demo />} />
          <Route path="/my-tasks"     element={<MyTasks />} />
          <Route path="/ai-assistant" element={<AICodeAssistant />} />
          <Route path="/buddy"        element={<BuddySystem />} />
          <Route path="*"             element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
