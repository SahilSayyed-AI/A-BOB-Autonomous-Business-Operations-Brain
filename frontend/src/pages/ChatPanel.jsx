import React, { useState, useRef, useEffect } from 'react'
import { sendChat } from '../services/api'

const SUGGESTIONS = [
  'How many tasks are active?',
  'Show me blocked tasks',
  'What is the system health?',
  'List all employees',
  'What did the Recovery Agent do recently?',
  'Which tasks are high priority?',
]

export default function ChatPanel() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hello. I'm A-BOB's AI assistant. Ask me anything about your workflows, tasks, employees, or system health." }
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: msg }])
    setLoading(true)
    try {
      const res = await sendChat(msg)
      setMessages(m => [...m, { role: 'assistant', text: res.reply }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Unable to reach the AI service. Please check your API configuration.' }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-8 py-5 border-b border-zinc-200">
        <h1 className="text-xl font-semibold text-zinc-900">AI Chat</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Powered by Claude · Ask anything about your enterprise operations</p>
      </div>

      {/* Suggestions */}
      <div className="px-8 py-3 border-b border-zinc-100 flex flex-wrap gap-2">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-xs border border-zinc-200 text-zinc-500 hover:border-zinc-400 hover:text-zinc-800 px-3 py-1.5 rounded transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-semibold mr-3 mt-0.5 shrink-0">
                A
              </div>
            )}
            <div className={`max-w-2xl px-4 py-3 rounded-lg text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-black text-white'
                : 'bg-zinc-50 border border-zinc-200 text-zinc-800'
            }`}>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center text-white text-xs font-semibold mr-3 shrink-0">
              A
            </div>
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3">
              <div className="flex gap-1 items-center">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-8 py-5 border-t border-zinc-200">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Ask about tasks, employees, system health..."
            className="flex-1 border border-zinc-300 rounded px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-black hover:bg-zinc-800 disabled:bg-zinc-300 text-white text-sm font-medium px-5 py-2.5 rounded transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
