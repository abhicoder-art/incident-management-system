import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

interface TeamMember {
  id: number
  full_name: string
  email: string
  role: string
  department: string
}

interface Incident {
  id: number
  title: string
  description: string
  status: string
  priority: string
  created_at: string
  updated_at: string
  assigned_to: number | null
  resolution: string
  source: string
  client: string
  category: string
}

interface AISolution {
  possible_cause: string
  suggested_solution: string
}

interface OpenAIError {
  error?: {
    message?: string
  }
  response?: {
    status?: number
    data?: {
      error?: {
        message?: string
      }
    }
  }
}

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [aiSolution, setAiSolution] = useState<AISolution | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  const analyzeIncident = async (title: string, description: string) => {
    console.log('Starting incident analysis...', { title, description })
    setAiLoading(true)
    setAiError(null)
    
    try {
      const response = await axios.post(
        `http://localhost:3001/api/incidents/${id}/analyze`
      )

      if (response.data.error) {
        throw new Error(response.data.error)
      }

      const { possible_cause, suggested_solution } = response.data
      setAiSolution({ possible_cause, suggested_solution })
    } catch (err) {
      console.error('Error analyzing incident:', err)
      let errorMessage = 'Failed to analyze incident. Please try again later.'
      
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 429) {
          errorMessage = 'Too many requests. Please try again in a few minutes.'
        } else if (err.response?.data?.error) {
          errorMessage = err.response.data.error
        }
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      
      setAiError(errorMessage)
    } finally {
      setAiLoading(false)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Fetching incident and team members...');
        const [incidentResponse, teamMembersResponse] = await Promise.all([
          axios.get(`http://localhost:3001/api/incidents/${id}`),
          axios.get('http://localhost:3001/api/team-members')
        ]);
        
        console.log('Incident response:', incidentResponse.data);
        console.log('Team members response:', teamMembersResponse.data);
        
        setIncident(incidentResponse.data);
        setTeamMembers(teamMembersResponse.data);
        
        // Analyze the incident after it's loaded
        if (incidentResponse.data) {
          analyzeIncident(incidentResponse.data.title, incidentResponse.data.description);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (axios.isAxiosError(err)) {
          setError(`Failed to fetch data: ${err.response?.data?.error || err.message}`);
          console.error('Error details:', err.response?.data);
        } else {
          setError('Failed to fetch data: Unknown error');
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

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

  const handleStatusChange = async (newStatus: string) => {
    if (!incident || newStatus === incident.status) return

    setUpdating(true)
    try {
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

  const handleTeamMemberChange = async (teamMemberId: number | null) => {
    if (!incident) return

    setUpdating(true)
    try {
      const response = await axios.put(
        `http://localhost:3001/api/incidents/${id}/assign`,
        { assigned_to: teamMemberId },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (response.data) {
        setIncident(prev => prev ? { ...prev, assigned_to: teamMemberId, updated_at: new Date().toISOString() } : null)
      }
    } catch (err) {
      console.error('Error updating team member assignment:', err)
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || 'Failed to update team member assignment'
        setError(errorMessage)
      } else {
        setError('Failed to update team member assignment')
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleCategoryChange = async (newCategory: string) => {
    if (!incident) return

    setUpdating(true)
    try {
      const response = await axios.put(
        `http://localhost:3001/api/incidents/${id}/category`,
        { category: newCategory },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      )
      
      if (response.data) {
        setIncident(prev => prev ? { ...prev, category: newCategory, updated_at: new Date().toISOString() } : null)
      }
    } catch (err) {
      console.error('Error updating incident category:', err)
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.error || 'Failed to update incident category'
        setError(errorMessage)
      } else {
        setError('Failed to update incident category')
      }
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-36 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    )
  }

  if (!incident) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open':
        return 'bg-red-100 text-red-800'
      case 'in progress':
        return 'bg-yellow-100 text-yellow-800'
      case 'closed':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-3 mb-4">
            <button
              onClick={() => navigate('/incidents')}
              className="text-gray-600 hover:text-gray-900 flex items-center"
            >
              <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to incidents
            </button>
          </div>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                Incident #{id}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Created on {formatDate(incident.created_at)}
              </p>
            </div>
            <button
              onClick={() => analyzeIncident(incident.title, incident.description)}
              disabled={aiLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {aiLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI-Powered Resolution
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left column */}
          <div className="flex-1">
            {/* Title and description */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{incident.title}</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{incident.description}</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {['Overview', 'Timeline', 'Logs', 'Metrics', 'Affected Services'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab.toLowerCase())}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab.toLowerCase()
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            {/* AI Analysis */}
            {activeTab === 'overview' && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Analysis
                  <span className="text-sm text-gray-500 ml-2">Machine learning analysis of incident patterns</span>
                </h3>

                {aiError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                    {aiError}
                  </div>
                )}

                {aiLoading ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ) : aiSolution && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Probable Root Cause
                      </h4>
                      <p className="text-gray-600">{aiSolution.possible_cause}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Recommended Action
                      </h4>
                      <p className="text-gray-600">{aiSolution.suggested_solution}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right column - Incident Details */}
          <div className="lg:w-80">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Incident Details</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">ID</label>
                  <span className="text-gray-900">#{incident.id}</span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Source</label>
                  <span className="text-gray-900">{incident.source || 'Security Monitoring'}</span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Created</label>
                  <span className="text-gray-900">{formatDate(incident.created_at)}</span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Severity</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(incident.priority)}`}>
                    {incident.priority}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Status</label>
                  <div className="relative">
                    <select
                      value={incident.status}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={updating}
                      className={`mt-1 block w-full pl-3 pr-10 py-2 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                        incident.status.toLowerCase() === 'open' ? 'bg-red-50 border-red-300 text-red-800' :
                        incident.status.toLowerCase() === 'in progress' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
                        'bg-green-50 border-green-300 text-green-800'
                      }`}
                    >
                      <option value="Open" className="bg-red-50 text-red-800">Open</option>
                      <option value="In Progress" className="bg-yellow-50 text-yellow-800">In Progress</option>
                      <option value="Closed" className="bg-green-50 text-green-800">Closed</option>
                    </select>
                    {updating && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="animate-spin h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 block mb-1">Assigned To</label>
                  <select
                    value={incident.assigned_to || ''}
                    onChange={(e) => handleTeamMemberChange(e.target.value ? Number(e.target.value) : null)}
                    disabled={updating}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                {incident.category && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 block mb-1">Category</label>
                    <select
                      value={incident.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      disabled={updating}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      {['Hardware', 'Software', 'Services'].map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 