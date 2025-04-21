import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

interface Incident {
  id: number
  title: string
  description: string
  status: string
  priority: string
  created_at: string
}

export default function IncidentList() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/incidents')
        setIncidents(response.data)
      } catch (err) {
        setError('Failed to fetch incidents')
        console.error('Error fetching incidents:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchIncidents()
  }, [])

  const handleIncidentClick = (incidentId: number) => {
    navigate(`/incidents/${incidentId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Incidents</h1>
        <button
          onClick={() => navigate('/incidents/new')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Create New Incident
        </button>
      </div>
      <div className="grid gap-6">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            onClick={() => handleIncidentClick(incident.id)}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{incident.title}</h2>
                <p className="text-gray-600 mt-2 line-clamp-2">{incident.description}</p>
              </div>
              <div className="flex flex-col items-end">
                <span className={`px-3 py-1 rounded-full text-sm ${
                  incident.status === 'Open' ? 'bg-green-100 text-green-800' :
                  incident.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {incident.status}
                </span>
                <span className={`mt-2 px-3 py-1 rounded-full text-sm ${
                  incident.priority === 'High' ? 'bg-red-100 text-red-800' :
                  incident.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {incident.priority}
                </span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Created: {new Date(incident.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 