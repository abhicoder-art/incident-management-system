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
}

export default function IncidentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incident, setIncident] = useState<Incident | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

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
            <select
              value={incident.assigned_to || ''}
              onChange={(e) => handleTeamMemberChange(e.target.value ? Number(e.target.value) : null)}
              disabled={updating}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Unassigned</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name} ({member.role} - {member.department})
                </option>
              ))}
            </select>
          </div>

          {incident.resolution && (
            <div>
              <h2 className="text-xl font-semibold mb-2">Resolution</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{incident.resolution}</p>
            </div>
          )}

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Incident Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium">{incident.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Priority</p>
                <p className="font-medium">{incident.priority}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="font-medium">{new Date(incident.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="font-medium">{new Date(incident.updated_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Source</p>
                <p className="font-medium">{incident.source || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Client</p>
                <p className="font-medium">{incident.client || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 