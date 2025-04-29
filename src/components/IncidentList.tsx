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
  source?: string
  client?: string
  category?: string
}

const priorities = ['Critical','High', 'Medium', 'Low']
const categories = ['Hardware', 'Software', 'Services']

export default function IncidentList() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'Open',
    priority: 'Medium',
    source: '',
    client: '',
    category: 'Software',
  })
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (!form.title.trim() || !form.description.trim()) {
      setFormError('Title and Description are required.')
      return
    }
    setSubmitting(true)
    try {
      const response = await axios.post('http://localhost:3001/api/incidents', form)
      setIncidents([response.data, ...incidents])
      setShowModal(false)
      setForm({
        title: '',
        description: '',
        status: 'Open',
        priority: 'Medium',
        source: '',
        client: '',
        category: 'Software',
      })
    } catch (err) {
      setFormError('Failed to create incident. Please try again.')
    } finally {
      setSubmitting(false)
    }
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
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Create New Incident
        </button>
      </div>
      {/* Modal for creating incident */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              &times;
            </button>
            <h2 className="text-2xl font-bold mb-4">Create New Incident</h2>
            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Status</label>
                <input
                  type="text"
                  name="status"
                  value={form.status}
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Priority</label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                >
                  {priorities.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Source</label>
                <input
                  type="text"
                  name="source"
                  value={form.source}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Client</label>
                <input
                  type="text"
                  name="client"
                  value={form.client}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleInputChange}
                  className="w-full border rounded px-3 py-2"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {formError && <div className="text-red-600 text-sm">{formError}</div>}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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