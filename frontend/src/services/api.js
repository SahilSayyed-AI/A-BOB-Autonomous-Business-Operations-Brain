import axios from 'axios'

const api = axios.create({ baseURL: 'http://localhost:8000' })

export const getEmployees = () => api.get('/employees').then(r => r.data)
export const getEmployee = (id) => api.get(`/employees/${id}`).then(r => r.data)
export const addEmployee = (data) => api.post('/employees', data).then(r => r.data)
export const getTasks = () => api.get('/tasks').then(r => r.data)
export const createTask = (data) => api.post('/tasks', data).then(r => r.data)
export const updateTaskStatus = (id, status) => api.patch(`/tasks/${id}/status`, { status }).then(r => r.data)
export const simulateFailure = (id) => api.post(`/tasks/${id}/simulate-failure`).then(r => r.data)
export const processMeeting = (data) => api.post('/meetings', data).then(r => r.data)
export const getHealth = () => api.get('/health').then(r => r.data)
export const getAgents = () => api.get('/agents').then(r => r.data)
export const getLogs = () => api.get('/logs').then(r => r.data)
export const getEvents = () => api.get('/events').then(r => r.data)
export const predictDelays = () => api.get('/intelligence/predict').then(r => r.data)
export const smartAssign = (task_id) => api.post('/intelligence/assign', { task_id }).then(r => r.data)
export const sendChat = (message) => api.post('/chat', { message }).then(r => r.data)
export const runDemo = () => api.post('/demo/run').then(r => r.data)
export const resetDemo = () => api.post('/demo/reset').then(r => r.data)

export const codeAssistant = (code) => api.post('/code-assistant', { code }).then(r => r.data)
export const getBuddies = () => api.get('/buddies').then(r => r.data)
