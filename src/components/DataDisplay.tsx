import React, { useEffect, useState } from 'react'
import axios from 'axios'
import CategoryAnalytics from './CategoryAnalytics'

interface ApiData {
  id: number
  name: string
  comment: string
}

export default function DataDisplay() {
  const [data, setData] = useState<ApiData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:3001/api/comments')
        setData(response.data)
      } catch (err) {
        setError('Failed to fetch data')
        console.error('Error fetching data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Dashboard</h1>
        <p className="text-gray-600">Welcome to your incident management dashboard</p>
      </div>

      <CategoryAnalytics />

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Comments</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {data.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{item.name}</h2>
                <span className="text-gray-500 text-sm">ID: {item.id}</span>
              </div>
              <p className="text-gray-600">{item.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
} 