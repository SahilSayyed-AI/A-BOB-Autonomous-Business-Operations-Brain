import React, { createContext, useContext, useState } from 'react'

export const DEMO_ACCOUNTS = [
  {
    id: 'hr_001',
    email: 'hr@company.com',
    password: 'hr123',
    name: 'Neha Kapoor',
    roleKey: 'hr',
    avatar: 'NK',
  },
  {
    id: 'buddy_001',
    email: 'buddy@company.com',
    password: 'buddy123',
    name: 'Arjun Mehta',
    roleKey: 'buddy',
    avatar: 'AM',
  },
  {
    id: 'emp_001',
    email: 'priya@company.com',
    password: 'emp123',
    name: 'Priya Sharma',
    roleKey: 'employee',
    avatar: 'PS',
  },
  {
    id: 'emp_002',
    email: 'rahul@company.com',
    password: 'emp123',
    name: 'Rahul Verma',
    roleKey: 'employee',
    avatar: 'RV',
  },
]

export const ROLE_CONFIG = {
  hr: {
    label: 'HR Manager',
    nav: ['/', '/employees', '/tasks', '/workflows', '/intelligence', '/logs', '/chat', '/demo'],
    canAddEmployee: true,
    canAssignTasks: true,
    canViewAllLogs: true,
    canEscalate: true,
  },
  buddy: {
    label: 'Buddy',
    nav: ['/', '/tasks', '/workflows', '/chat'],
    canAddEmployee: false,
    canAssignTasks: true,
    canViewAllLogs: false,
    canEscalate: false,
  },
  employee: {
    label: 'Employee',
    nav: ['/my-tasks', '/chat'],
    canAddEmployee: false,
    canAssignTasks: false,
    canViewAllLogs: false,
    canEscalate: false,
  },
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = (email, password) => {
    const found = DEMO_ACCOUNTS.find(a => a.email === email && a.password === password)
    if (found) { setUser(found); return { success: true } }
    return { success: false, error: 'Invalid email or password.' }
  }

  const logout = () => setUser(null)
  const config = user ? ROLE_CONFIG[user.roleKey] : null

  return (
    <AuthContext.Provider value={{ user, login, logout, config }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
