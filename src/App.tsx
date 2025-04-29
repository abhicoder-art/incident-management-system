import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import DataDisplay from './components/DataDisplay'
import IncidentList from './components/IncidentList'
import IncidentDetail from './components/IncidentDetail'
import Layout from './components/Layout'
import CategoryAnalytics from './components/CategoryAnalytics'

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

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!session) {
      return <Navigate to="/auth" replace />
    }
    return <Layout>{children}</Layout>
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DataDisplay />
            </ProtectedRoute>
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
            <ProtectedRoute>
              <IncidentList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/incidents/:id"
          element={
            <ProtectedRoute>
              <IncidentDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <CategoryAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div className="p-8">
                <h1 className="text-2xl font-semibold mb-6">Settings</h1>
                <div className="bg-white rounded-lg shadow p-6">
                  <p className="text-gray-600">Settings page coming soon...</p>
                </div>
              </div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App 