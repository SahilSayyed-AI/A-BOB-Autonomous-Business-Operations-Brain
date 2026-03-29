import React, { useState, useRef, useEffect } from 'react'

const DEMO_PROMPTS = [
  {
    label: 'JS: undefined is not a function',
    code: `// Fix this JavaScript error\nconst users = null;\nconsole.log(users.map(u => u.name)); // TypeError: Cannot read properties of null`,
    answer: {
      problem: "The variable `users` is null, and you cannot call .map() on null. This causes a TypeError at runtime because null has no methods.",
      language: "javascript",
      fixed: `// Fixed: Add a null/undefined check\nconst users = null;\n\n// Option 1: Optional chaining (modern JS)\nconsole.log(users?.map(u => u.name) ?? 'No users found');\n\n// Option 2: Traditional guard\nif (Array.isArray(users) && users.length > 0) {\n  console.log(users.map(u => u.name));\n} else {\n  console.log('No users found');\n}`,
      explanation: "Always check if an array is null before calling methods on it. Use optional chaining (?.) for a clean one-liner. The ?? operator provides a fallback value when the result is null or undefined.",
    },
  },
  {
    label: 'CSS not applying',
    code: `/* Why is my CSS not working? */\n.button {\n  color: white\n  background: blue;\n  padding: 10px;\n}`,
    answer: {
      problem: "Missing semicolon after `color: white`. CSS rules must end with a semicolon. Without it, the browser fails to parse the entire rule block and ignores all properties.",
      language: "css",
      fixed: `.button {\n  color: white;       /* Added missing semicolon */\n  background: blue;\n  padding: 10px;\n}`,
      explanation: "Every CSS property-value pair must end with a semicolon (;). A missing semicolon causes the browser to treat the next line as continuation of the broken rule, silently dropping all styles.",
    },
  },
  {
    label: 'Python loop bug',
    code: `# Debug this Python loop\nnumbers = [1, 2, 3, 4, 5]\nfor i in range(len(numbers)):\n    numbers.remove(numbers[i])\nprint(numbers)  # Expected: [], Got: [2, 4]`,
    answer: {
      problem: "You are modifying a list while iterating over it by index. As items are removed the list shrinks and indices shift, causing some elements to be skipped entirely.",
      language: "python",
      fixed: `# Option 1: Clear the list directly (simplest)\nnumbers = [1, 2, 3, 4, 5]\nnumbers.clear()\nprint(numbers)  # Output: []\n\n# Option 2: Iterate over a copy\nnumbers = [1, 2, 3, 4, 5]\nfor item in numbers.copy():\n    numbers.remove(item)\nprint(numbers)  # Output: []`,
      explanation: "Never modify a list while iterating over it by index. Use list.clear() to empty it instantly, or iterate over a copy with numbers.copy() to safely remove each element.",
    },
  },
  {
    label: 'Login form validation',
    code: `// Fix login form validation\nfunction validateForm() {\n  const email = document.getElementById('email').value;\n  const pass = document.getElementById('pass').value;\n  if (email = '') return false;  // bug here\n  if (pass.length = 6) return false;  // bug here\n  return true;\n}`,
    answer: {
      problem: "Two bugs: (1) `email = ''` uses assignment (=) instead of equality (===), always evaluating to empty string which is falsy. (2) `pass.length = 6` also uses assignment, trying to set the length property instead of comparing it.",
      language: "javascript",
      fixed: `function validateForm() {\n  const email = document.getElementById('email').value;\n  const pass = document.getElementById('pass').value;\n\n  if (email === '') {\n    alert('Email cannot be empty');\n    return false;\n  }\n  if (!email.includes('@')) {\n    alert('Please enter a valid email');\n    return false;\n  }\n  if (pass.length < 6) {  // use < for minimum length\n    alert('Password must be at least 6 characters');\n    return false;\n  }\n  return true;\n}`,
      explanation: "Always use === for comparison, never = (that is assignment). For length checks, use < or > not =. Added email format validation and user-friendly alert messages.",
    },
  },
  {
    label: 'Optimize React component',
    code: `// Optimize this React component\nimport React from 'react';\nfunction UserList({ users }) {\n  return (\n    <div>\n      {users.map((user, index) => (\n        <div key={index}>\n          <img src={fetchAvatar(user.id)} />\n          <span>{user.name}</span>\n        </div>\n      ))}\n    </div>\n  );\n}`,
    answer: {
      problem: "Three issues: (1) Array index as key causes React reconciliation bugs when the list order changes. (2) fetchAvatar() is called on every render for every user — expensive. (3) No memoization means the whole list re-renders even if data did not change.",
      language: "jsx",
      fixed: `import React, { useMemo } from 'react';\n\nconst UserCard = React.memo(({ user }) => {\n  const avatarUrl = useMemo(() => fetchAvatar(user.id), [user.id]);\n  return (\n    <div className="user-card">\n      <img src={avatarUrl} alt={user.name} loading="lazy" />\n      <span>{user.name}</span>\n    </div>\n  );\n});\n\nconst UserList = React.memo(({ users }) => (\n  <div>\n    {users.map(user => (\n      <UserCard key={user.id} user={user} />\n    ))}\n  </div>\n));\n\nexport default UserList;`,
      explanation: "Use user.id as key (not index). Wrap components in React.memo to skip unnecessary re-renders. Use useMemo to cache the avatar URL. Add loading='lazy' to images for better performance.",
    },
  },
  {
    label: 'Find bug in API call',
    code: `// Find the bug in this API call\nasync function fetchData() {\n  const response = fetch('https://api.example.com/data');\n  const data = response.json();\n  return data;\n}`,
    answer: {
      problem: "Both fetch() and .json() return Promises but await is missing before both of them. Without await, response is a Promise object not the actual response, so calling .json() on it will fail.",
      language: "javascript",
      fixed: `async function fetchData() {\n  try {\n    const response = await fetch('https://api.example.com/data'); // await #1\n    if (!response.ok) {\n      throw new Error('HTTP error! Status: ' + response.status);\n    }\n    const data = await response.json(); // await #2\n    return data;\n  } catch (error) {\n    console.error('Fetch failed:', error);\n    throw error;\n  }\n}`,
      explanation: "In async functions, always await fetch() to get the HTTP response, then await .json() to parse the body. Also added an error check for non-2xx status codes and a try/catch for network failures.",
    },
  },
  {
    label: 'Fix async/await issue',
    code: `// Fix the async/await issue\nconst getData = async () => {\n  try {\n    const res = await fetch('/api/data');\n    const json = res.json(); // missing await\n    console.log(json.users);\n  } catch(e) {\n    console.log('error', e);\n  }\n}`,
    answer: {
      problem: "res.json() returns a Promise but await is missing. So json holds a Promise object instead of the parsed data. Accessing json.users returns undefined silently.",
      language: "javascript",
      fixed: `const getData = async () => {\n  try {\n    const res = await fetch('/api/data');\n    if (!res.ok) throw new Error('Server error: ' + res.status);\n    const json = await res.json(); // added await\n    console.log(json.users);\n  } catch (e) {\n    console.error('Error fetching data:', e.message);\n  }\n};`,
      explanation: "Response.json() is async and must be awaited. Without await you get a Promise instead of real data. Always await both fetch() and .json() in sequence.",
    },
  },
  {
    label: 'SQL query error',
    code: `-- Correct this SQL query error\nSELECT name, COUNT(*) as total\nFROM orders\nWHERE status = 'active'\nGROUP BY id  -- wrong column\nHAVING total > 5\nORDER status;  -- syntax error`,
    answer: {
      problem: "Two errors: (1) GROUP BY uses id but SELECT has name — group by must match the non-aggregated selected column. (2) ORDER status is invalid SQL syntax; the correct keyword is ORDER BY.",
      language: "sql",
      fixed: `SELECT name, COUNT(*) AS total\nFROM orders\nWHERE status = 'active'\nGROUP BY name          -- group by the selected column\nHAVING COUNT(*) > 5    -- use COUNT(*) directly in HAVING\nORDER BY total DESC;   -- ORDER BY (not ORDER)`,
      explanation: "GROUP BY must match the non-aggregated columns in your SELECT. ORDER BY is the correct keyword. Using COUNT(*) directly in HAVING is more portable across different databases.",
    },
  },
  {
    label: 'Resolve CORS issue',
    code: `// Fix CORS issue in Express\nconst express = require('express');\nconst app = express();\n// Users get: Access-Control-Allow-Origin error\napp.get('/api/data', (req, res) => {\n  res.json({ data: 'hello' });\n});`,
    answer: {
      problem: "The Express server does not set CORS headers so browsers block cross-origin requests. Browsers require the server to explicitly allow requests from other origins via Access-Control-Allow-Origin headers.",
      language: "javascript",
      fixed: `const express = require('express');\nconst cors = require('cors');  // npm install cors\n\nconst app = express();\n\n// Development: allow all origins\napp.use(cors());\n\n// Production: allow specific origin only\napp.use(cors({\n  origin: 'https://yourfrontend.com',\n  methods: ['GET', 'POST', 'PUT', 'DELETE'],\n  credentials: true,\n}));\n\napp.get('/api/data', (req, res) => {\n  res.json({ data: 'hello' });\n});\n\napp.listen(3000);`,
      explanation: "Install the cors npm package and add it as middleware with app.use(cors()). For development allow all origins. For production specify your exact frontend URL to keep your API secure.",
    },
  },
  {
    label: 'Fix JSON parsing error',
    code: `// Fix JSON parsing error\nconst raw = \"{ name: 'John', age: 30 }\";\nconst user = JSON.parse(raw);\nconsole.log(user.name);`,
    answer: {
      problem: "The string is not valid JSON. JSON requires all keys and string values to use double quotes. Single quotes and unquoted keys are JavaScript object syntax but not valid JSON.",
      language: "javascript",
      fixed: `// Option 1: Fix the JSON string to use double quotes\nconst raw = '{\"name\": \"John\", \"age\": 30}';\nconst user = JSON.parse(raw);\nconsole.log(user.name); // John\n\n// Option 2: Use a JS object if data is from your code\nconst user2 = { name: 'John', age: 30 };\n\n// Option 3: Always parse with try/catch\ntry {\n  const user3 = JSON.parse(raw);\n  console.log(user3.name);\n} catch (e) {\n  console.error('Invalid JSON:', e.message);\n}`,
      explanation: "Valid JSON requires double quotes for all keys and string values. Single quotes are not allowed. If you control the data source, use a plain JS object instead. Always wrap JSON.parse in try/catch.",
    },
  },
  {
    label: 'Improve function performance',
    code: `// Improve this function's performance\nfunction findDuplicates(arr) {\n  const duplicates = [];\n  for (let i = 0; i < arr.length; i++) {\n    for (let j = i + 1; j < arr.length; j++) {\n      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {\n        duplicates.push(arr[i]);\n      }\n    }\n  }\n  return duplicates;\n}`,
    answer: {
      problem: "The nested loop makes this O(n squared) time complexity. For 1000 items that is 1 million iterations. duplicates.includes() inside the loop adds another O(n) per check making worst case O(n cubed).",
      language: "javascript",
      fixed: `// O(n) solution using a Map\nfunction findDuplicates(arr) {\n  const seen = new Map();\n  const duplicates = [];\n\n  for (const item of arr) {\n    const count = (seen.get(item) || 0) + 1;\n    seen.set(item, count);\n    if (count === 2) {\n      duplicates.push(item); // Add only when seen the 2nd time\n    }\n  }\n\n  return duplicates;\n}\n\nconsole.log(findDuplicates([1, 2, 3, 2, 4, 1])); // [2, 1]`,
      explanation: "Use a Map to count occurrences in a single O(n) pass. Map lookup is O(1) so the whole function runs in linear time. For large arrays this is hundreds of times faster than the nested loop approach.",
    },
  },
  {
    label: 'HTML alignment issue',
    code: `<!-- Fix HTML alignment issue -->\n<div style="display: flex">\n  <img src="logo.png" style="vertical-align: middle">\n  <h1 style="vertical-align: middle">My App</h1>\n  <button style="float: right">Login</button>\n</div>`,
    answer: {
      problem: "Three issues: (1) vertical-align has no effect on flex children — use align-items on the container instead. (2) float: right is ignored inside flexbox. (3) The container needs justify-content: space-between to push the button to the right.",
      language: "html",
      fixed: `<div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 20px;">\n  <div style="display: flex; align-items: center; gap: 12px;">\n    <img src="logo.png" style="width: 40px; height: 40px;" alt="Logo">\n    <h1 style="margin: 0; font-size: 1.25rem;">My App</h1>\n  </div>\n  <button style="padding: 8px 16px; cursor: pointer;">Login</button>\n</div>`,
      explanation: "In flexbox use align-items: center on the container to center children vertically. Use justify-content: space-between to push the button to the right. Float does not work inside flex containers.",
    },
  },
  {
    label: 'Null pointer error',
    code: `// Debug null pointer error\nfunction getUserCity(user) {\n  return user.address.city.toUpperCase();\n}\nconst user1 = { name: 'Alice', address: null };\nconsole.log(getUserCity(user1));`,
    answer: {
      problem: "The function tries to access .city on user.address which is null, then calls .toUpperCase() on the result. Both accesses throw a TypeError because you cannot read properties of null.",
      language: "javascript",
      fixed: `// Option 1: Optional chaining (cleanest)\nfunction getUserCity(user) {\n  return user?.address?.city?.toUpperCase() ?? 'City not available';\n}\n\n// Option 2: Traditional null checks\nfunction getUserCity(user) {\n  if (!user || !user.address || !user.address.city) {\n    return 'City not available';\n  }\n  return user.address.city.toUpperCase();\n}\n\nconst user1 = { name: 'Alice', address: null };\nconsole.log(getUserCity(user1)); // City not available`,
      explanation: "Use optional chaining (?.) to safely navigate nested properties. If any value in the chain is null or undefined, it returns undefined instead of throwing. Use ?? to provide a default fallback value.",
    },
  },
  {
    label: 'Infinite loop problem',
    code: `// Fix infinite loop\nlet count = 0;\nwhile (count !== 10) {\n  count += 3;  // Will never equal 10!\n  console.log(count);\n}`,
    answer: {
      problem: "count increments by 3 each time (0, 3, 6, 9, 12...) and will never exactly equal 10. The condition count !== 10 stays true forever, creating an infinite loop that freezes the program.",
      language: "javascript",
      fixed: `// Option 1: Use < instead of !==\nlet count = 0;\nwhile (count < 10) {    // stops when count reaches or passes 10\n  count += 3;\n  console.log(count);   // 3, 6, 9, 12\n}\n\n// Option 2: Use a step that divides evenly into 10\nlet count2 = 0;\nwhile (count2 !== 10) {\n  count2 += 2;           // 2 divides evenly into 10\n  console.log(count2);   // 2, 4, 6, 8, 10\n}\n\n// Option 3: for loop (clearest intent)\nfor (let i = 0; i <= 9; i += 3) {\n  console.log(i);        // 0, 3, 6, 9\n}`,
      explanation: "When using step values in while loops, use < or <= instead of !== to avoid skipping the target value. A for loop is often clearer for counting. Always make sure your loop condition can actually become false.",
    },
  },
  {
    label: 'Explain this error',
    code: `// Explain this error message:\n// UnhandledPromiseRejectionWarning: TypeError:\n// Cannot destructure property 'data' of undefined\nconst fetchUser = async (id) => {\n  const { data } = await axios.get('/users/' + id);\n  return data;\n};`,
    answer: {
      problem: "The axios call is failing (network error or 4xx/5xx response) and the Promise is rejecting. When you try to destructure { data } from the rejected result (undefined), JavaScript throws a TypeError.",
      language: "javascript",
      fixed: `const fetchUser = async (id) => {\n  try {\n    if (!id) throw new Error('User ID is required');\n\n    const response = await axios.get('/users/' + id);\n    const { data } = response; // safe to destructure\n    return data;\n\n  } catch (error) {\n    if (error.response) {\n      // Server responded with 4xx or 5xx\n      console.error('Server error:', error.response.status);\n    } else if (error.request) {\n      // No response received (network down)\n      console.error('Network error - no response');\n    } else {\n      console.error('Request error:', error.message);\n    }\n    return null;\n  }\n};`,
      explanation: "Always wrap async axios calls in try/catch. Axios errors have three types: server errors (error.response exists), network failures (error.request exists), and setup errors (error.message). Return null on failure to prevent crashes.",
    },
  },
]

function CodeBlock({ code, language }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative mt-2 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <span className="text-zinc-400 text-xs font-mono">{language || 'code'}</span>
        <button onClick={copy} className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5">
          {copied ? <><span className="text-emerald-400">✓</span> Copied!</> : <>⧉ Copy Code</>}
        </button>
      </div>
      <pre className="p-4 text-sm text-zinc-200 overflow-x-auto font-mono leading-relaxed whitespace-pre-wrap">{code}</pre>
    </div>
  )
}

function AIMessage({ msg }) {
  if (!msg.parsed) {
    return <div className="whitespace-pre-wrap text-sm text-zinc-800 leading-relaxed">{msg.text}</div>
  }
  const { problem, fixed, explanation, language } = msg.parsed
  return (
    <div className="space-y-4 w-full">
      {problem && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold shrink-0">!</span>
            <span className="text-sm font-semibold text-zinc-900">Problem Found</span>
          </div>
          <div className="text-sm text-zinc-700 leading-relaxed bg-red-50 border border-red-100 rounded-xl px-4 py-3">{problem}</div>
        </div>
      )}
      {fixed && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">✓</span>
            <span className="text-sm font-semibold text-zinc-900">Fixed Code</span>
          </div>
          <CodeBlock code={fixed} language={language} />
        </div>
      )}
      {explanation && (
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">💡</span>
            <span className="text-sm font-semibold text-zinc-900">Explanation</span>
          </div>
          <div className="text-sm text-zinc-700 leading-relaxed bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">{explanation}</div>
        </div>
      )}
    </div>
  )
}

async function callAI(code) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `You are an expert code assistant. Respond ONLY with a valid JSON object (no markdown, no backticks):
{"problem":"...","language":"...","fixed":"...","explanation":"..."}`,
        messages: [{ role: 'user', content: 'Analyze and fix this code:\n\n' + code }],
      }),
    })
    if (!response.ok) throw new Error('API error')
    const data = await response.json()
    const text = data.content?.map(b => b.text || '').join('')
    return { parsed: JSON.parse(text.replace(/```json|```/g, '').trim()), text }
  } catch {
    return null
  }
}

export default function AICodeAssistant() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I am your AI Code Assistant. Paste any code below and I will find the bug, fix it, and explain what went wrong in plain English.\n\nOr click any demo prompt above for an instant answer!",
      parsed: null,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text, prebuilt) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', text: msg, parsed: null }])
    setLoading(true)

    if (prebuilt) {
      await new Promise(r => setTimeout(r, 700))
      setMessages(m => [...m, { role: 'assistant', parsed: prebuilt, text: '' }])
      setLoading(false)
      return
    }

    const result = await callAI(msg)
    if (result) {
      setMessages(m => [...m, { role: 'assistant', ...result }])
    } else {
      setMessages(m => [...m, {
        role: 'assistant',
        parsed: {
          problem: "Could not connect to the AI service right now.",
          language: "info",
          fixed: "",
          explanation: "Try clicking one of the demo prompts above for instant answers. Or check your internet connection and try again.",
        },
        text: '',
      }])
    }
    setLoading(false)
  }

  const visible = showAll ? DEMO_PROMPTS : DEMO_PROMPTS.slice(0, 8)

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-lg shrink-0">⚡</div>
          <div>
            <h1 className="text-base font-semibold text-zinc-900">AI Code Assistant</h1>
            <p className="text-xs text-zinc-400">Paste code and get instant bug analysis, fix and explanation</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs text-zinc-400">Claude AI</span>
          </div>
        </div>
      </div>

      {/* Demo Prompts */}
      <div className="px-6 py-3 border-b border-zinc-100 bg-zinc-50/80 shrink-0">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Click a demo for an instant answer</p>
        <div className="flex flex-wrap gap-1.5">
          {visible.map(p => (
            <button key={p.label} onClick={() => send(p.code, p.answer)} disabled={loading}
              className="text-xs border border-zinc-200 bg-white text-zinc-600 hover:border-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 px-2.5 py-1 rounded-full transition-all disabled:opacity-40">
              {p.label}
            </button>
          ))}
          <button onClick={() => setShowAll(s => !s)} className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-1 font-medium">
            {showAll ? '▲ Less' : '+' + (DEMO_PROMPTS.length - 8) + ' more'}
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
        {messages.map((m, i) => (
          <div key={i} className={'flex gap-3 ' + (m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            <div className={'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ' + (m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white')}>
              {m.role === 'user' ? 'U' : '⚡'}
            </div>
            <div className={'flex-1 max-w-2xl ' + (m.role === 'user' ? 'flex justify-end' : '')}>
              {m.role === 'user' ? (
                <div className="bg-indigo-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm text-sm font-mono whitespace-pre-wrap max-w-xl leading-relaxed">{m.text}</div>
              ) : (
                <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm">
                  <AIMessage msg={m} />
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">⚡</div>
            <div className="bg-white border border-zinc-200 rounded-2xl rounded-tl-sm px-4 py-4 shadow-sm">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <div className="flex gap-1">
                  {[0,200,400].map(d => <span key={d} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: d+'ms'}} />)}
                </div>
                <span>Analyzing your code...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-zinc-200 bg-white shrink-0">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) send() }}
              placeholder="Paste your code here... (Ctrl+Enter to send)"
              rows={3}
              className="w-full border border-zinc-300 rounded-xl px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none font-mono" />
            <div className="absolute bottom-2 right-3 text-xs text-zinc-300">Ctrl+Enter</div>
          </div>
          <button onClick={() => send()} disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-medium px-5 py-3 rounded-xl transition-colors shrink-0">
            {loading ? '...' : 'Analyze'}
          </button>
        </div>
        <p className="text-xs text-zinc-400 mt-2">Supports HTML, CSS, JavaScript, Python, SQL, React and more</p>
      </div>
    </div>
  )
}
