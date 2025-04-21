import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

interface Incident {
  id: number
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  assigned_to: string
  resolution: string
}

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const fetchIncident = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/incidents/${id}`)
        setIncident(response.data)
      } catch (err) {
        setError('Failed to fetch incident details')
        console.error('Error fetching incident:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchIncident()
  }, [id])

  const getNextStatus = (currentStatus: string): string => {
    switch (currentStatus) {
      case 'Open':
        return 'In Progress'
      case 'In Progress':
        return 'Closed'
      case 'Closed':
        return 'Open'
      default:
        return 'Open'
    }
  }

  const handleStatusChange = async () => {
    if (!incident) return

    setUpdating(true)
    try {
      const newStatus = getNextStatus(incident.status)
      console.log('Attempting to update status:', { id, newStatus })
      
      const response = await axios.put(
        `http://localhost:3001/api/incidents/${id}/status`,
        { status: newStatus },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          validateStatus: (status) => status < 500 // Don't throw for 4xx errors
        }
      )
      
      console.log('Update response:', response.data)
      
      if (response.data) {
        setIncident(prev => prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null)
      }
    } catch (err) {
      console.error('Error updating incident status:', err)
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || 'Failed to update incident status'
        console.error('Error details:', err.response?.data)
        setError(errorMessage)
      } else {
        setError('Failed to update incident status')
      }
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error || 'Incident not found'}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <button
          onClick={() => navigate('/incidents')}
          className="text-indigo-600 hover:text-indigo-800 mb-4 inline-flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Incidents
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold">{incident.title}</h1>
            <div className="mt-2 flex space-x-4">
              <button
                onClick={handleStatusChange}
                disabled={updating}
                className={`px-3 py-1 rounded-full text-sm ${
                  incident.status === 'Open' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                  incident.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                  'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                {updating ? 'Updating...' : incident.status}
              </button>
              <span className={`px-3 py-1 rounded-full text-sm ${
                incident.priority === 'High' ? 'bg-red-100 text-red-800' :
                incident.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {incident.priority}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Created: {new Date(incident.created_at).toLocaleString()}</div>
            <div className="text-sm text-gray-500">Last Updated: {new Date(incident.updated_at).toLocaleString()}</div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{incident.description}</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-2">Assigned To</h2>
            <p className="text-gray-600">{incident.assigned_to || 'Unassigned'}</p>
          </div>

          {incident.resolution && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Resolution</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{incident.resolution}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 