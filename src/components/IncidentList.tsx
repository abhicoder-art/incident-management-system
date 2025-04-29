import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

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

interface IncidentForm {
  title: string
  description: string
  status: string
  priority: string
  source: string
  client: string
  category: string
}

const IncidentList: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [priorityFilter, setPriorityFilter] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<IncidentForm>({
    title: '',
    description: '',
    status: 'Open',
    priority: 'Medium',
    source: '',
    client: '',
    category: 'Software'
  })

  const statusOptions = ['Open', 'In Progress', 'Closed']
  const priorityOptions = ['Low', 'Medium', 'High', 'Critical']
  const categories = ['Hardware', 'Software', 'Services']

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('Fetching incidents...')
      const response = await fetch('http://localhost:3001/api/incidents')
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      console.log('Fetched incidents:', data)
      setIncidents(data)
    } catch (error) {
      console.error('Error fetching incidents:', error)
      setError(error instanceof Error ? error.message : 'Failed to fetch incidents')
    } finally {
      setIsLoading(false)
    }
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
      const response = await fetch('http://localhost:3001/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form)
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setIncidents([data, ...incidents])
      setShowModal(false)
      setForm({
        title: '',
        description: '',
        status: 'Open',
        priority: 'Medium',
        source: '',
        client: '',
        category: 'Software'
      })
    } catch (err) {
      setFormError('Failed to create incident. Please try again.')
      console.error('Error creating incident:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'border-red-200 bg-red-50 text-red-700'
      case 'In Progress': return 'border-yellow-200 bg-yellow-50 text-yellow-700'
      case 'Closed': return 'border-green-200 bg-green-50 text-green-700'
      default: return 'border-gray-200 bg-gray-50 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'border-red-200 bg-red-50 text-red-700'
      case 'High': return 'border-orange-200 bg-orange-50 text-orange-700'
      case 'Medium': return 'border-yellow-200 bg-yellow-50 text-yellow-700'
      case 'Low': return 'border-blue-200 bg-blue-50 text-blue-700'
      default: return 'border-gray-200 bg-gray-50 text-gray-700'
    }
  }

  const toggleFilter = (type: 'status' | 'priority', value: string) => {
    if (type === 'status') {
      setStatusFilter(prev => 
        prev.includes(value) 
          ? prev.filter(item => item !== value)
          : [...prev, value]
      )
    } else {
      setPriorityFilter(prev => 
        prev.includes(value) 
          ? prev.filter(item => item !== value)
          : [...prev, value]
      )
    }
  }

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter.length === 0 || statusFilter.includes(incident.status)
    const matchesPriority = priorityFilter.length === 0 || priorityFilter.includes(incident.priority)
    return matchesSearch && matchesStatus && matchesPriority
  })

  const formatTimeAgo = (timestamp: string) => {
    const minutes = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 60000)
    if (minutes < 60) return `${minutes} minutes ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `about ${hours} hours ago`
    const days = Math.floor(hours / 24)
    return `${days} days ago`
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <div className="text-red-600 mb-4">Error: {error}</div>
        <button 
          onClick={fetchIncidents}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold mb-6">Incidents</h1>
        
        {/* Search and Create Incident */}
        <div className="flex justify-between items-center mb-6">
          <div className="relative flex-1 max-w-2xl">
            <input
              type="text"
              placeholder="Search incidents..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="ml-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Incident
          </button>
        </div>

        {/* Create Incident Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-lg relative">
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-2xl font-bold mb-6">Create New Incident</h2>
              <form onSubmit={handleCreateIncident} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input
                    type="text"
                    name="source"
                    value={form.source}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <input
                    type="text"
                    name="client"
                    value={form.client}
                    onChange={handleInputChange}
                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                {formError && (
                  <div className="text-red-600 text-sm">{formError}</div>
                )}
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mr-4 px-4 py-2 text-gray-600 hover:text-gray-800"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    disabled={submitting}
                  >
                    {submitting ? 'Creating...' : 'Create Incident'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Status</h3>
              <div className="flex flex-wrap gap-3">
                {statusOptions.map(status => (
                  <button
                    key={status}
                    onClick={() => toggleFilter('status', status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 
                      ${statusFilter.includes(status)
                        ? getStatusColor(status)
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                    `}
                  >
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        status === 'Open' ? 'bg-red-600' :
                        status === 'In Progress' ? 'bg-yellow-600' :
                        'bg-green-600'
                      }`}></span>
                      {status}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Priority</h3>
              <div className="flex flex-wrap gap-3">
                {priorityOptions.map(priority => (
                  <button
                    key={priority}
                    onClick={() => toggleFilter('priority', priority)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200
                      ${priorityFilter.includes(priority)
                        ? getPriorityColor(priority)
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                    `}
                  >
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        priority === 'Critical' ? 'bg-red-600' :
                        priority === 'High' ? 'bg-orange-600' :
                        priority === 'Medium' ? 'bg-yellow-600' :
                        'bg-blue-600'
                      }`}></span>
                      {priority}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Incident Cards */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No incidents found matching your criteria
          </div>
        ) : (
          filteredIncidents.map(incident => (
            <Link
              key={incident.id}
              to={`/incidents/${incident.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{incident.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-sm font-medium ${getPriorityColor(incident.priority)}`}>
                        {incident.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{formatTimeAgo(incident.created_at)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(incident.status)}`}>
                    {incident.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{incident.description}</p>
                <div className="flex items-start gap-6">
                  <div className="flex gap-2">
                    {incident.category && (
                      <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {incident.category}
                      </span>
                    )}
                    {incident.source && (
                      <span className="px-2.5 py-0.5 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                        {incident.source}
                      </span>
                    )}
                  </div>
                  {incident.client && (
                    <div className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span className="text-sm">{incident.client}</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}

export default IncidentList 