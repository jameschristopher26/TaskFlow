import { apiRequest } from './apiClient'

export type TaskPriority = 'Low' | 'Medium' | 'High'
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed'

export type Task = {
  id: string
  title: string
  description?: string | null
  assignee?: string | null
  category?: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string | null
  createdAt?: string
  updatedAt?: string
  ownerId?: string
}

export type TaskInput = {
  title: string
  description?: string
  assignee?: string
  category?: string
  priority: TaskPriority
  status: TaskStatus
  dueDate?: string
}

export type TaskUpdate = Partial<TaskInput>

export type TaskPage = {
  tasks: Task[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export type TaskQuery = {
  search?: string
  status?: TaskStatus
  priority?: TaskPriority
  category?: string
  assignee?: string
  dueBefore?: string
  dueAfter?: string
  sortBy?: 'title' | 'category' | 'priority' | 'status' | 'dueDate' | 'createdAt' | 'updatedAt'
  order?: 'asc' | 'desc'
  page?: number
  limit?: number
}

function cleanTaskInput(input: TaskInput | TaskUpdate): TaskInput | TaskUpdate {
  const cleaned: TaskInput | TaskUpdate = { ...input }
  if ('description' in cleaned && cleaned.description === '') delete cleaned.description
  if ('assignee' in cleaned && cleaned.assignee === '') delete cleaned.assignee
  if ('category' in cleaned && cleaned.category === '') delete cleaned.category
  if ('dueDate' in cleaned && cleaned.dueDate === '') cleaned.dueDate = ''
  return cleaned
}

export async function getTasks(
  query: TaskQuery = {},
  signal?: AbortSignal,
): Promise<Task[] | TaskPage> {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const path = params.size ? `/api/tasks?${params.toString()}` : '/api/tasks'
  return apiRequest<Task[] | TaskPage>(path, { signal })
}

export async function getTaskById(id: string, signal?: AbortSignal): Promise<Task> {
  return apiRequest<Task>(`/api/tasks/${encodeURIComponent(id)}`, { signal })
}

export async function createTask(input: TaskInput, signal?: AbortSignal): Promise<Task> {
  return apiRequest<Task>('/api/tasks', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanTaskInput(input)),
  })
}

export async function updateTask(
  id: string,
  input: TaskUpdate,
  signal?: AbortSignal,
): Promise<Task> {
  return apiRequest<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanTaskInput(input)),
  })
}

export async function deleteTask(id: string, signal?: AbortSignal): Promise<void> {
  return apiRequest<void>(`/api/tasks/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    signal,
  })
}
