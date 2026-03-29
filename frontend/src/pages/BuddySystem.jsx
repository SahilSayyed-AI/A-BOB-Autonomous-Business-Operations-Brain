/**
 * BuddySystem.jsx
 *
 * Two roles use this component:
 *  - employee  → sees buddy list, picks a buddy, sends messages
 *  - buddy     → sees left sidebar with assigned employees + messages, can reply
 *
 * A shared in-memory store (window.__buddyStore) lets both sides see the
 * same messages within the same browser session (simulating real-time).
 */
import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../AuthContext'

// ── Shared message store ──────────────────────────────────────────────────
if (!window.__buddyStore) {
  window.__buddyStore = {
    b1: [
      { id: 1, from: 'buddy', fromName: 'Arjun Mehta', text: "Hey! Welcome to the team! I am Arjun, your primary buddy. Feel free to reach out anytime about code, team culture, or anything else.", time: '9:00 AM', read: true },
    ],
    b2: [
      { id: 1, from: 'buddy', fromName: 'Sneha Iyer', text: "Hi! I am Sneha from HR. Your benefits enrollment is due in 30 days. Let me know if you have any questions!", time: 'Yesterday', read: true },
    ],
    b3: [],
    b4: [],
  }
  window.__buddyStoreListeners = []
}

function subscribeStore(fn) {
  window.__buddyStoreListeners.push(fn)
  return () => {
    window.__buddyStoreListeners = window.__buddyStoreListeners.filter(l => l !== fn)
  }
}
function notifyStore() {
  window.__buddyStoreListeners.forEach(fn => fn())
}
function addMessage(buddyId, msg) {
  if (!window.__buddyStore[buddyId]) window.__buddyStore[buddyId] = []
  window.__buddyStore[buddyId] = [...window.__buddyStore[buddyId], msg]
  notifyStore()
}
function markRead(buddyId) {
  if (window.__buddyStore[buddyId]) {
    window.__buddyStore[buddyId] = window.__buddyStore[buddyId].map(m => ({ ...m, read: true }))
    notifyStore()
  }
}
function getStore() { return window.__buddyStore }

// ── Buddy/Employee definitions ────────────────────────────────────────────
const BUDDIES = [
  { id: 'b1', name: 'Arjun Mehta',  avatar: 'AM', color: 'from-violet-500 to-indigo-500', role: 'Senior Software Engineer', dept: 'Engineering',     email: 'arjun.mehta@company.com',  phone: '+91 98765 43210', skills: ['React','Node.js','System Design','Mentoring'],        status: 'online', lastSeen: 'now',         bio: "Your primary buddy! Happy to help with codebase questions, team culture, and career growth." },
  { id: 'b2', name: 'Sneha Iyer',   avatar: 'SI', color: 'from-pink-500 to-rose-500',     role: 'HR Business Partner',      dept: 'Human Resources', email: 'sneha.iyer@company.com',  phone: '+91 97654 32109', skills: ['HR Policies','Benefits','Onboarding','Conflict Resolution'], status: 'online', lastSeen: 'now',         bio: "Reach out for HR policies, benefits questions, or any workplace concerns." },
  { id: 'b3', name: 'Vikram Nair',  avatar: 'VN', color: 'from-emerald-500 to-teal-500', role: 'DevOps Engineer',           dept: 'Infrastructure', email: 'vikram.nair@company.com',  phone: '+91 96543 21098', skills: ['Kubernetes','AWS','CI/CD','Docker'],                   status: 'away',   lastSeen: '15 min ago',  bio: "Infrastructure and deployment questions? I have got you covered." },
  { id: 'b4', name: 'Priya Joshi',  avatar: 'PJ', color: 'from-amber-500 to-orange-500', role: 'Product Manager',           dept: 'Product',         email: 'priya.joshi@company.com', phone: '+91 95432 10987', skills: ['Roadmapping','Agile','User Research','Jira'],          status: 'offline', lastSeen: '2 hours ago', bio: "For product questions, sprint planning, or understanding how we work with customers." },
]

// Assigned employees per buddy (simulated)
const ASSIGNED_EMPLOYEES = {
  b1: [
    { id: 'e1', name: 'Rahul Sharma',  avatar: 'RS', dept: 'Engineering',  joinDate: '2 days ago',  color: 'from-blue-500 to-cyan-500' },
    { id: 'e2', name: 'Meera Patel',   avatar: 'MP', dept: 'Design',        joinDate: '1 week ago',  color: 'from-purple-500 to-pink-500' },
    { id: 'e3', name: 'Karan Singh',   avatar: 'KS', dept: 'Engineering',  joinDate: '3 days ago',  color: 'from-orange-500 to-red-500' },
  ],
  b2: [
    { id: 'e4', name: 'Divya Reddy',   avatar: 'DR', dept: 'Marketing',    joinDate: '5 days ago',  color: 'from-emerald-500 to-teal-500' },
    { id: 'e5', name: 'Amit Kumar',    avatar: 'AK', dept: 'Sales',         joinDate: '2 weeks ago', color: 'from-violet-500 to-indigo-500' },
  ],
  b3: [
    { id: 'e6', name: 'Pooja Verma',   avatar: 'PV', dept: 'DevOps',       joinDate: '1 day ago',   color: 'from-amber-500 to-yellow-500' },
  ],
  b4: [],
}

const getBuddy = id => BUDDIES.find(b => b.id === id)

// ── Helpers ───────────────────────────────────────────────────────────────
function StatusDot({ status, size = 'sm' }) {
  const c = { online: 'bg-emerald-400', away: 'bg-amber-400', offline: 'bg-zinc-300' }
  const s = size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5'
  return <span className={`${s} rounded-full ${c[status]} shrink-0 inline-block`} />
}

function Avatar({ buddy, size = 'md', showStatus = false }) {
  const sz = { sm: 'w-8 h-8 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' }
  return (
    <div className="relative shrink-0">
      <div className={`${sz[size]} rounded-full bg-gradient-to-br ${buddy.color} flex items-center justify-center text-white font-bold`}>
        {buddy.avatar}
      </div>
      {showStatus && (
        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
          buddy.status === 'online' ? 'bg-emerald-400' : buddy.status === 'away' ? 'bg-amber-400' : 'bg-zinc-300'
        }`} />
      )}
    </div>
  )
}

function EmpAvatar({ emp, size = 'sm' }) {
  const sz = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm' }
  return (
    <div className={`${sz[size]} rounded-full bg-gradient-to-br ${emp.color} flex items-center justify-center text-white font-bold shrink-0`}>
      {emp.avatar}
    </div>
  )
}

function timeStr() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ── Profile Modal ─────────────────────────────────────────────────────────
function ProfileModal({ buddy, onClose, onChat }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-5">
          <div className="flex items-center gap-4">
            <Avatar buddy={buddy} size="lg" showStatus />
            <div>
              <h2 className="text-lg font-bold text-zinc-900">{buddy.name}</h2>
              <p className="text-sm text-zinc-500">{buddy.role}</p>
              <p className="text-xs text-zinc-400">{buddy.dept}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">×</button>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <StatusDot status={buddy.status} />
          <span className="text-sm text-zinc-500">{buddy.status === 'online' ? 'Online now' : 'Last seen ' + buddy.lastSeen}</span>
        </div>
        <p className="text-sm text-zinc-600 leading-relaxed mb-4 bg-zinc-50 rounded-xl p-3">{buddy.bio}</p>
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-zinc-600"><span>✉️</span>{buddy.email}</div>
          <div className="flex items-center gap-2 text-sm text-zinc-600"><span>📱</span>{buddy.phone}</div>
        </div>
        <div className="mb-5">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {buddy.skills.map(s => (
              <span key={s} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { onChat(buddy); onClose() }} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
            💬 Start Chat
          </button>
          <button onClick={onClose} className="flex-1 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-sm font-medium py-2.5 rounded-xl transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Chat Window (employee side) ────────────────────────────────────────────
function EmployeeChatWindow({ buddy, onBack, userName }) {
  const [msgs, setMsgs] = useState(getStore()[buddy.id] || [])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    markRead(buddy.id)
    const unsub = subscribeStore(() => {
      setMsgs([...(getStore()[buddy.id] || [])])
    })
    return unsub
  }, [buddy.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs])

  const send = () => {
    if (!input.trim()) return
    const msg = { id: Date.now(), from: 'user', fromName: userName, text: input.trim(), time: timeStr(), read: false }
    addMessage(buddy.id, msg)
    setInput('')
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-200 shrink-0">
        <button onClick={onBack} className="text-zinc-400 hover:text-zinc-700 text-xl mr-1">‹</button>
        <Avatar buddy={buddy} size="sm" showStatus />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-zinc-900">{buddy.name}</p>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5">
            <StatusDot status={buddy.status} />
            {buddy.status === 'online' ? 'Online' : buddy.status === 'away' ? 'Away' : 'Offline'}
          </p>
        </div>
        <span className="text-xs text-zinc-400">{buddy.role}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-zinc-50 min-h-0">
        {msgs.length === 0 && (
          <div className="text-center py-10">
            <Avatar buddy={buddy} size="lg" />
            <p className="text-sm text-zinc-400 mt-3">Start a conversation with {buddy.name.split(' ')[0]}</p>
          </div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={'flex gap-2 ' + (m.from === 'user' ? 'justify-end' : 'justify-start')}>
            {m.from !== 'user' && <Avatar buddy={buddy} size="sm" />}
            <div className={'flex flex-col ' + (m.from === 'user' ? 'items-end' : 'items-start')}>
              <div className={'px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-xs lg:max-w-sm ' +
                (m.from === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm')}>
                {m.text}
              </div>
              <span className="text-xs text-zinc-400 mt-1 px-1">{m.time}</span>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-zinc-200 bg-white shrink-0">
        <div className="flex gap-2 items-center">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder={'Message ' + buddy.name.split(' ')[0] + '...'}
            className="flex-1 border border-zinc-200 rounded-full px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <button onClick={send} disabled={!input.trim()}
            className="w-9 h-9 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 text-white rounded-full flex items-center justify-center transition-colors shrink-0">
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Buddy Dashboard (buddy-side view) ─────────────────────────────────────
function BuddyDashboard({ buddyUser }) {
  const [store, setStore] = useState(getStore())
  const [activeConv, setActiveConv] = useState(null)
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState('messages') // 'messages' | 'assigned'
  const bottomRef = useRef(null)

  // Determine which buddy this user is (match by name)
  const myBuddy = BUDDIES.find(b => b.name === buddyUser.name) || BUDDIES[0]
  const assignedEmployees = ASSIGNED_EMPLOYEES[myBuddy.id] || []

  useEffect(() => {
    const unsub = subscribeStore(() => setStore({ ...getStore() }))
    return unsub
  }, [])

  useEffect(() => {
    if (activeConv) {
      markRead(activeConv)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConv, store])

  const conversations = BUDDIES.map(b => {
    const msgs = store[b.id] || []
    const unread = msgs.filter(m => m.from === 'user' && !m.read).length
    const last = msgs[msgs.length - 1]
    return { buddy: b, msgs, unread, last }
  })

  const totalUnread = conversations.reduce((a, c) => a + c.unread, 0)

  const sendReply = () => {
    if (!input.trim() || !activeConv) return
    const buddy = getBuddy(activeConv)
    const msg = {
      id: Date.now(),
      from: 'buddy',
      fromName: buddy.name,
      text: input.trim(),
      time: timeStr(),
      read: true,
    }
    addMessage(activeConv, msg)
    setInput('')
  }

  const activeMsgs = activeConv ? (store[activeConv] || []) : []
  const activeBuddy = activeConv ? getBuddy(activeConv) : null
  const employeeName = activeMsgs.find(m => m.from === 'user')?.fromName || 'Employee'

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── LEFT SIDEBAR ── */}
      <div className="w-72 border-r border-zinc-200 flex flex-col shrink-0 bg-white">
        {/* Sidebar Header */}
        <div className="px-4 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3 mb-3">
            <Avatar buddy={myBuddy} size="sm" showStatus />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 truncate">{myBuddy.name}</p>
              <p className="text-xs text-zinc-400">{myBuddy.role}</p>
            </div>
          </div>
          {/* Tab switcher */}
          <div className="flex rounded-lg border border-zinc-200 overflow-hidden bg-white">
            <button
              onClick={() => setActiveTab('messages')}
              className={'flex-1 py-1.5 text-xs font-medium transition-colors ' +
                (activeTab === 'messages' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-800')}
            >
              💬 Messages
              {totalUnread > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{totalUnread}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('assigned')}
              className={'flex-1 py-1.5 text-xs font-medium transition-colors ' +
                (activeTab === 'assigned' ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-800')}
            >
              👥 Assigned
              <span className="ml-1 bg-zinc-200 text-zinc-600 text-xs px-1.5 py-0.5 rounded-full">{assignedEmployees.length}</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'messages' ? (
            <>
              {conversations.length === 0 && (
                <div className="px-4 py-8 text-center text-xs text-zinc-400">No conversations yet</div>
              )}
              {conversations.map(({ buddy, msgs, unread, last }) => (
                <button key={buddy.id} onClick={() => setActiveConv(buddy.id)}
                  className={'w-full text-left px-4 py-3 border-b border-zinc-100 hover:bg-zinc-50 transition-colors ' +
                    (activeConv === buddy.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : '')}>
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 flex items-center justify-center text-white text-xs font-bold">
                        {msgs.find(m => m.from === 'user')?.fromName?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'}
                      </div>
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">{unread}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-zinc-900 truncate">
                          {msgs.find(m => m.from === 'user')?.fromName || 'No messages yet'}
                        </span>
                        {last && <span className="text-xs text-zinc-400 shrink-0 ml-1">{last.time}</span>}
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        via {buddy.name.split(' ')[0]} · {last ? last.text : <em>No messages</em>}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </>
          ) : (
            // Assigned Employees Tab
            <div className="px-3 py-3 space-y-2">
              {assignedEmployees.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-400">No employees assigned yet</div>
              ) : (
                <>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide px-1 mb-2">
                    Your onboarding buddees
                  </p>
                  {assignedEmployees.map(emp => (
                    <div key={emp.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 hover:border-indigo-200 transition-colors">
                      <div className="flex items-center gap-3">
                        <EmpAvatar emp={emp} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-900 truncate">{emp.name}</p>
                          <p className="text-xs text-zinc-500">{emp.dept}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Joined {emp.joinDate}</span>
                        <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full">Active</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-3 px-1">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <p className="text-xs font-medium text-indigo-700 mb-1">📊 Summary</p>
                      <p className="text-xs text-indigo-600">{assignedEmployees.length} employees assigned to you</p>
                      <p className="text-xs text-indigo-500 mt-0.5">Check messages tab for their questions</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── CHAT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="text-5xl mb-4">💬</div>
            <h3 className="text-base font-semibold text-zinc-700 mb-1">Select a conversation</h3>
            <p className="text-sm text-zinc-400">Pick a message from the left sidebar to view and reply</p>
            {totalUnread > 0 && (
              <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-indigo-700">{totalUnread} unread message{totalUnread > 1 ? 's' : ''} waiting for your reply</p>
              </div>
            )}
            {assignedEmployees.length > 0 && (
              <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-emerald-700">{assignedEmployees.length} employees assigned to you</p>
                <p className="text-xs text-emerald-600 mt-0.5">Check the "Assigned" tab in the sidebar</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="px-5 py-3 border-b border-zinc-200 bg-white shrink-0 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {employeeName.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{employeeName}</p>
                <p className="text-xs text-zinc-400">Replying as {activeBuddy.name}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusDot status={activeBuddy.status} />
                <span className="text-xs text-zinc-500">{activeBuddy.status === 'online' ? 'Online' : activeBuddy.status === 'away' ? 'Away' : 'Offline'}</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-zinc-50 min-h-0">
              {activeMsgs.length === 0 && (
                <div className="text-center py-10 text-zinc-400 text-sm">No messages yet. The employee will see your replies instantly.</div>
              )}
              {activeMsgs.map(m => {
                const isUser = m.from === 'user'
                return (
                  <div key={m.id} className={'flex gap-2 ' + (isUser ? 'justify-start' : 'justify-end')}>
                    {isUser && (
                      <div className="w-8 h-8 rounded-full bg-zinc-300 flex items-center justify-center text-xs font-bold text-zinc-600 shrink-0">
                        {employeeName.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                    )}
                    <div className={'flex flex-col ' + (isUser ? 'items-start' : 'items-end')}>
                      <div className={'px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-xs lg:max-w-md ' +
                        (isUser ? 'bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm shadow-sm' : 'bg-indigo-600 text-white rounded-br-sm')}>
                        {m.text}
                      </div>
                      <span className="text-xs text-zinc-400 mt-1 px-1">
                        {isUser ? employeeName.split(' ')[0] : 'You'} · {m.time}
                      </span>
                    </div>
                    {!isUser && (
                      <Avatar buddy={activeBuddy} size="sm" />
                    )}
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Reply input */}
            <div className="px-5 py-3 border-t border-zinc-200 bg-white shrink-0">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
                    placeholder={'Reply to ' + employeeName.split(' ')[0] + '... (Enter to send)'}
                    rows={2}
                    className="w-full border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none"
                  />
                </div>
                <button onClick={sendReply} disabled={!input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors shrink-0">
                  Send ➤
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Employee buddy list ────────────────────────────────────────────────────
function BuddyCard({ buddy, onChat, onProfile, unread }) {
  return (
    <div className="bg-white border border-zinc-200 rounded-2xl p-4 hover:border-indigo-200 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <Avatar buddy={buddy} size="md" showStatus />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-zinc-900 truncate">{buddy.name}</h3>
            {buddy.status === 'online' && <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full">Online</span>}
            {unread > 0 && <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">{unread}</span>}
          </div>
          <p className="text-xs text-zinc-500">{buddy.role}</p>
          <p className="text-xs text-zinc-400">{buddy.dept}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {buddy.skills.slice(0, 3).map(s => (
          <span key={s} className="text-xs bg-zinc-50 text-zinc-500 border border-zinc-100 px-2 py-0.5 rounded-full">{s}</span>
        ))}
        {buddy.skills.length > 3 && <span className="text-xs text-zinc-400">+{buddy.skills.length - 3}</span>}
      </div>
      <div className="mt-3 pt-3 border-t border-zinc-100 flex gap-2">
        <button onClick={() => onChat(buddy)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 rounded-lg transition-colors">
          💬 Chat
        </button>
        <button onClick={() => onProfile(buddy)} className="flex-1 border border-zinc-200 text-zinc-600 hover:bg-zinc-50 text-xs font-medium py-2 rounded-lg transition-colors">
          View Profile
        </button>
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────
export default function BuddySystem() {
  const { user } = useAuth()
  const [store, setStore] = useState(getStore())
  const [view, setView] = useState('list')
  const [activeBuddy, setActiveBuddy] = useState(null)
  const [profileBuddy, setProfileBuddy] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const unsub = subscribeStore(() => setStore({ ...getStore() }))
    return unsub
  }, [])

  // Buddy role → show full buddy dashboard
  if (user.roleKey === 'buddy') {
    return (
      <div className="flex flex-col h-screen overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-zinc-200 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg">🤝</div>
            <div>
              <h1 className="text-base font-semibold text-zinc-900">Buddy Dashboard</h1>
              <p className="text-xs text-zinc-400">Manage your assigned employees and messages</p>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <BuddyDashboard buddyUser={user} />
        </div>
      </div>
    )
  }

  // Employee role → buddy list + chat
  const filtered = BUDDIES.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.role.toLowerCase().includes(search.toLowerCase()) ||
    b.skills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  if (view === 'chat' && activeBuddy) {
    return (
      <div className="h-screen overflow-hidden">
        <EmployeeChatWindow buddy={activeBuddy} userName={user.name} onBack={() => setView('list')} />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white">
      {profileBuddy && (
        <ProfileModal buddy={profileBuddy} onClose={() => setProfileBuddy(null)}
          onChat={b => { setActiveBuddy(b); setView('chat'); setProfileBuddy(null) }} />
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-lg">🤝</div>
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Connect with Buddy</h1>
            <p className="text-xs text-zinc-400">{BUDDIES.filter(b => b.status === 'online').length} buddies online · Your support network</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-zinc-100 shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, role or skill..."
            className="w-full border border-zinc-200 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 bg-white focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        </div>
      </div>

      {/* Status pills */}
      <div className="px-6 py-3 flex gap-3 shrink-0">
        {['online','away','offline'].map(s => {
          const count = BUDDIES.filter(b => b.status === s).length
          const cls = { online: 'text-emerald-600 bg-emerald-50', away: 'text-amber-600 bg-amber-50', offline: 'text-zinc-500 bg-zinc-50' }
          return (
            <span key={s} className={'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full capitalize ' + cls[s]}>
              <StatusDot status={s} /> {count} {s}
            </span>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-zinc-400 text-sm">No buddies found matching "{search}"</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(buddy => {
              const msgs = store[buddy.id] || []
              const unread = msgs.filter(m => m.from === 'buddy' && !m.read).length
              return (
                <BuddyCard key={buddy.id} buddy={buddy} unread={unread}
                  onChat={b => { setActiveBuddy(b); setView('chat') }}
                  onProfile={setProfileBuddy} />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
