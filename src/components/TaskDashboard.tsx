import { useEffect, useState, type FormEvent } from 'react'
import { ApiError } from '../services/apiClient'
import {
  createTask,
  deleteTask,
  getTasks,
  updateTask,
  type Task,
  type TaskInput,
  type TaskPage,
  type TaskPriority,
  type TaskStatus,
  type TaskUpdate,
} from '../services/taskService'

type TaskFormState = {
  title: string
  description: string
  assignee: string
  category: string
  priority: TaskPriority
  status: TaskStatus
  dueDate: string
}

const emptyForm: TaskFormState = {
  title: '',
  description: '',
  assignee: '',
  category: '',
  priority: 'Medium',
  status: 'Pending',
  dueDate: '',
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.details.length) return error.details.map((detail) => detail.message).join(' ')
    return error.message
  }
  if (error instanceof DOMException && error.name === 'AbortError') return ''
  return 'Something went wrong. Please try again.'
}

function normalizeTaskPage(response: Task[] | TaskPage): TaskPage {
  if (!Array.isArray(response)) return response
  return {
    tasks: response,
    page: 1,
    limit: response.length || 10,
    total: response.length,
    totalPages: response.length ? 1 : 0,
  }
}

export function TaskDashboard({
  userName,
  onLogout,
}: {
  userName: string
  onLogout: () => Promise<void>
}) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState('')
  const [status, setStatus] = useState<TaskStatus | ''>('')
  const [priority, setPriority] = useState<TaskPriority | ''>('')
  const [assigneeInput, setAssigneeInput] = useState('')
  const [dueAfter, setDueAfter] = useState('')
  const [dueBefore, setDueBefore] = useState('')
  const [page, setPage] = useState(1)
  const [pageInfo, setPageInfo] = useState({ total: 0, totalPages: 0 })
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [form, setForm] = useState<TaskFormState>(emptyForm)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void getTasks({
        search: searchInput.trim() || undefined,
        status: status || undefined,
        priority: priority || undefined,
        assignee: assigneeInput.trim() || undefined,
        dueAfter: dueAfter || undefined,
        dueBefore: dueBefore || undefined,
        page,
        limit: 10,
      }, controller.signal)
        .then((response) => {
          if (controller.signal.aborted) return
          const result = normalizeTaskPage(response)
          setTasks(result.tasks)
          setPageInfo({ total: result.total, totalPages: result.totalPages })
          if (page > Math.max(result.totalPages, 1)) {
            setPage(Math.max(result.totalPages, 1))
          }
        })
        .catch((requestError) => {
          if (!controller.signal.aborted) setError(errorMessage(requestError))
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 300)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [searchInput, status, priority, assigneeInput, dueAfter, dueBefore, page, refreshVersion])

  function updateFilter<T>(setter: (value: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  function clearFilters() {
    setSearchInput('')
    setStatus('')
    setPriority('')
    setAssigneeInput('')
    setDueAfter('')
    setDueBefore('')
    setPage(1)
    setLoading(true)
    setError('')
  }

  function openCreate() {
    setEditingTask(null)
    setForm(emptyForm)
    setError('')
    setSuccess('')
    setFormOpen(true)
  }

  function openEdit(task: Task) {
    setEditingTask(task)
    setForm({
      title: task.title,
      description: task.description ?? '',
      assignee: task.assignee ?? '',
      category: task.category ?? '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ?? '',
    })
    setError('')
    setSuccess('')
    setFormOpen(true)
  }

  function closeForm() {
    if (submitting) return
    setFormOpen(false)
    setEditingTask(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      if (editingTask) {
        const update: TaskUpdate = {
          title: form.title.trim(),
          description: form.description,
          assignee: form.assignee,
          category: form.category,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate,
        }
        await updateTask(editingTask.id, update)
        setSuccess('Task updated successfully.')
      } else {
        const input: TaskInput = {
          title: form.title.trim(),
          description: form.description,
          assignee: form.assignee,
          category: form.category,
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate,
        }
        await createTask(input)
        setSuccess('Task created successfully.')
      }
      setFormOpen(false)
      setEditingTask(null)
      setForm(emptyForm)
      setLoading(true)
      setRefreshVersion((current) => current + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(task: Task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    setError('')
    setSuccess('')
    try {
      await deleteTask(task.id)
      setSuccess('Task deleted successfully.')
      setLoading(true)
      setRefreshVersion((current) => current + 1)
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  return (
    <main className="dashboard-layout">
      <header className="dashboard-header">
        <div>
          <h1>TaskFlow</h1>
          <p>Signed in as {userName}</p>
        </div>
        <div className="header-actions">
          <button className="primary-button" type="button" onClick={openCreate}>Add task</button>
          <button className="secondary-button" type="button" onClick={() => void onLogout()}>
            Sign out
          </button>
        </div>
      </header>

      {error && <div className="form-error dashboard-message" role="alert">{error}</div>}
      {success && <div className="form-success dashboard-message" role="status">{success}</div>}

      <section className="task-filters" aria-label="Search and filter tasks">
        <label className="search-field">
          Search tasks
          <input
            type="search"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              setPage(1)
              setLoading(true)
              setError('')
            }}
            placeholder="Search title or description"
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => {
            updateFilter(setStatus, event.target.value as TaskStatus | '')
            setLoading(true)
            setError('')
          }}>
            <option value="">All statuses</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Completed</option>
          </select>
        </label>
        <label>
          Priority
          <select value={priority} onChange={(event) => {
            updateFilter(setPriority, event.target.value as TaskPriority | '')
            setLoading(true)
            setError('')
          }}>
            <option value="">All priorities</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>
        <label>
          Assignee
          <input
            value={assigneeInput}
            onChange={(event) => {
              setAssigneeInput(event.target.value)
              setPage(1)
              setLoading(true)
              setError('')
            }}
            placeholder="Filter by assignee"
          />
        </label>
        <label>
          Due after
          <input
            type="date"
            value={dueAfter}
            onChange={(event) => {
              updateFilter(setDueAfter, event.target.value)
              setLoading(true)
              setError('')
            }}
          />
        </label>
        <label>
          Due before
          <input
            type="date"
            value={dueBefore}
            onChange={(event) => {
              updateFilter(setDueBefore, event.target.value)
              setLoading(true)
              setError('')
            }}
          />
        </label>
        <button className="secondary-button clear-filters" type="button" onClick={clearFilters}>
          Clear filters
        </button>
      </section>

      {formOpen && (
        <section className="task-panel" aria-label={editingTask ? 'Edit task' : 'Create task'}>
          <h2>{editingTask ? 'Edit task' : 'Add task'}</h2>
          <form className="task-form" onSubmit={handleSubmit}>
            <label>
              Title
              <input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                minLength={1}
                maxLength={200}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                maxLength={5000}
              />
            </label>
            <label>
              Assignee
              <input
                value={form.assignee}
                onChange={(event) => setForm({ ...form, assignee: event.target.value })}
                maxLength={120}
              />
            </label>
            <label>
              Category
              <input
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                maxLength={100}
              />
            </label>
            <label>
              Priority
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
              >
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </label>
            <label>
              Due date
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
              />
            </label>
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingTask ? 'Save changes' : 'Create task'}
              </button>
              <button className="secondary-button" type="button" onClick={closeForm} disabled={submitting}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="task-list-section">
        <h2>My tasks</h2>
        {loading && <p role="status">Loading tasks...</p>}
        {!loading && !error && tasks.length === 0 && (
          <div className="empty-state">
            {searchInput || status || priority || assigneeInput || dueAfter || dueBefore ? (
              <>
                <p>No tasks match your search or filters.</p>
                <button className="secondary-button" type="button" onClick={clearFilters}>Clear filters</button>
              </>
            ) : (
              <>
                <p>No tasks yet.</p>
                <button className="primary-button" type="button" onClick={openCreate}>Create your first task</button>
              </>
            )}
          </div>
        )}
        {!loading && !error && tasks.length > 0 && (
          <div className="task-list">
            {tasks.map((task) => (
              <article className="task-card" key={task.id}>
                <div className="task-card-heading">
                  <h3>{task.title}</h3>
                  <span className={`status-badge status-${task.status.toLowerCase().replaceAll(' ', '-')}`}>
                    {task.status}
                  </span>
                </div>
                {task.description && <p>{task.description}</p>}
                <dl>
                  <div><dt>Priority</dt><dd>{task.priority}</dd></div>
                  {task.category && <div><dt>Category</dt><dd>{task.category}</dd></div>}
                  {task.assignee && <div><dt>Assignee</dt><dd>{task.assignee}</dd></div>}
                  {task.dueDate && <div><dt>Due date</dt><dd>{task.dueDate}</dd></div>}
                </dl>
                <div className="task-actions">
                  <button className="secondary-button" type="button" onClick={() => openEdit(task)}>Edit</button>
                  <button className="danger-button" type="button" onClick={() => void handleDelete(task)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        )}
        {!loading && !error && pageInfo.totalPages > 0 && (
          <nav className="pagination" aria-label="Task pages">
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setPage((current) => Math.max(1, current - 1))
                setLoading(true)
              }}
              disabled={loading || page <= 1}
            >
              Previous
            </button>
            <span>Page {page} of {pageInfo.totalPages} · {pageInfo.total} tasks</span>
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setPage((current) => Math.min(pageInfo.totalPages, current + 1))
                setLoading(true)
              }}
              disabled={loading || page >= pageInfo.totalPages}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </main>
  )
}
