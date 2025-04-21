import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import DataDisplay from './components/DataDisplay'
import IncidentList from './components/IncidentList'
import IncidentDetail from './components/IncidentDetail'

function App() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <div>
                  <nav className="bg-white shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="flex justify-between h-16">
                        <div className="flex items-center space-x-4">
                          <Link to="/" className="text-xl font-semibold">
                            My App
                          </Link>
                          <Link to="/incidents" className="text-gray-600 hover:text-gray-900">
                            Incidents
                          </Link>
                        </div>
                        <div className="flex items-center">
                          <button
                            onClick={() => supabase.auth.signOut()}
                            className="ml-4 px-4 py-2 text-sm text-red-600 hover:text-red-800"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </div>
                  </nav>
                  <DataDisplay />
                </div>
              ) : (
                <Navigate to="/auth" replace />
              )
            }
          />
          <Route
            path="/auth"
            element={
              session ? <Navigate to="/" replace /> : <Auth />
            }
          />
          <Route
            path="/incidents"
            element={
              session ? <IncidentList /> : <Navigate to="/auth" replace />
            }
          />
          <Route
            path="/incidents/:id"
            element={
              session ? <IncidentDetail /> : <Navigate to="/auth" replace />
            }
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App 