import { useEffect, useState } from 'react'
import axios from 'axios'
import api from '../lib/api'

interface CategoryStats {
  category: string
  total: number
  open: number
  inProgress: number
  closed: number
}

export default function CategoryAnalytics() {
  const [stats, setStats] = useState<CategoryStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorDetails, setErrorDetails] = useState<string | null>(null)
  const [teamStats, setTeamStats] = useState<any[]>([])

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        console.log('Fetching category analytics...')
        const response = await api.get('/incidents/analytics/category')
        console.log('Category analytics response:', response.data)
        setStats(response.data)
      } catch (err) {
        console.error('Error fetching category analytics:', err)
        let errorMessage = 'Failed to load category analytics'
        let errorDetail = ''

        if (axios.isAxiosError(err)) {
          if (err.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            errorMessage = `Server Error: ${err.response.status}`
            errorDetail = err.response.data?.error || err.response.data?.details || 'No additional details available'
          } else if (err.request) {
            // The request was made but no response was received
            errorMessage = 'Network Error'
            errorDetail = 'Could not connect to the server. Please check if the server is running.'
          } else {
            // Something happened in setting up the request that triggered an Error
            errorMessage = 'Request Error'
            errorDetail = err.message
          }
        } else if (err instanceof Error) {
          errorDetail = err.message
        }

        setError(errorMessage)
        setErrorDetails(errorDetail)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  useEffect(() => {
    const fetchTeamStats = async () => {
      try {
        const response = await api.get('/incidents/analytics/team-member')
        setTeamStats(response.data)
      } catch (err) {
        // Optionally handle error
      }
    }
    fetchTeamStats()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-red-600 text-center">
          <h3 className="text-xl font-semibold mb-2">{error}</h3>
          {errorDetails && (
            <p className="text-sm text-gray-600 mb-4">{errorDetails}</p>
          )}
          <div className="mt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Incident Category Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const completionRate = stat.total > 0 ? (stat.closed / stat.total) * 100 : 0
          
          return (
            <div 
              key={stat.category}
              className="border border-gray-100 rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-br from-white to-gray-50"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800">
                  {stat.category}
                </h3>
                <span className="text-sm font-medium text-gray-500">
                  Total: {stat.total}
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-green-600 font-medium">Open</span>
                    <span className="text-gray-600">{stat.open}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ width: `${(stat.open / stat.total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-yellow-600 font-medium">In Progress</span>
                    <span className="text-gray-600">{stat.inProgress}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full" 
                      style={{ width: `${(stat.inProgress / stat.total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-blue-600 font-medium">Closed</span>
                    <span className="text-gray-600">{stat.closed}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(stat.closed / stat.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Completion Rate</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {Math.round(completionRate)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {/* Team Member Analytics Section */}
      <h2 className="text-2xl font-bold text-gray-800 mt-10 mb-6">Team Member Analytics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {teamStats.map((member) => (
          <div key={member.id} className="border border-gray-100 rounded-lg p-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-800">{member.name}</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Assigned</span>
                <span className="font-medium">{member.assignedCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-blue-600">Resolved</span>
                <span className="font-medium">{member.resolvedCount}</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-sm text-gray-500">Resolved / Assigned</span>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full"
                  style={{ width: `${member.assignedCount > 0 ? (member.resolvedCount / member.assignedCount) * 100 : 0}%` }}
                ></div>
              </div>
              <div className="flex justify-end mt-1">
                <span className="text-indigo-600 font-bold text-sm">
                  {member.assignedCount > 0 ? `${Math.round((member.resolvedCount / member.assignedCount) * 100)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
