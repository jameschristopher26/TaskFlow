import { useEffect, useState } from 'react'
import { LoginForm, RegisterForm } from './components/AuthForms'
import { TaskDashboard } from './components/TaskDashboard'
import { useAuth } from './hooks/useAuth'
import './App.css'

function App() {
  const { session, isLoading, logout } = useAuth()
  const [route, setRoute] = useState(window.location.hash.replace('#', '') || 'login')

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash.replace('#', '') || 'login')
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  useEffect(() => {
    if (!isLoading && !session?.user && route === 'dashboard') {
      window.location.hash = 'login'
    }
  }, [isLoading, route, session])

  if (isLoading) {
    return <main className="auth-layout"><p role="status">Loading...</p></main>
  }

  if (route === 'register') {
    return (
      <main className="auth-layout">
        <section className="auth-card">
          <h1>TaskFlow</h1>
          <RegisterForm />
          <button className="text-button" type="button" onClick={() => window.location.hash = 'login'}>
            Already have an account? Sign in
          </button>
        </section>
      </main>
    )
  }

  if (route === 'dashboard') {
    if (!session?.user) return null
    return (
      <TaskDashboard
        userName={session.user.name || session.user.email || 'User'}
        onLogout={logout}
      />
    )
  }

  return (
    <main className="auth-layout">
      <section className="auth-card">
        <h1>TaskFlow</h1>
        <LoginForm />
        <button className="text-button" type="button" onClick={() => window.location.hash = 'register'}>
          Need an account? Register
        </button>
      </section>
    </main>
  )
}

export default App
