import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface AnalyticsData {
  activeIncidents: {
    count: number;
    changePercentage: number;
  };
  meanTimeToResolve: {
    time: string;
    changePercentage: number;
  };
  serviceHealth: {
    count: string;
    description: string;
  };
  aiResolutions: {
    count: number;
    changePercentage: number;
  };
}

const AnalyticsCards: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:3001/api/analytics/dashboard');
        setAnalyticsData(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // Refresh data every 5 minutes
    const interval = setInterval(fetchAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const renderChangeIndicator = (percentage: number) => {
    const isPositive = percentage >= 0;
    const color = isPositive ? 'text-red-600' : 'text-green-600';
    const sign = isPositive ? '+' : '';

    return (
      <span className={`text-sm ${color}`}>
        {sign}{percentage}% from last week
      </span>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mb-8">
        {error}
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Active Incidents Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <h3 className="text-gray-600 font-medium">Active Incidents</h3>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-gray-900">{analyticsData.activeIncidents.count}</p>
          <p className="text-sm text-gray-500 mt-1">Current open incidents</p>
          <div className="mt-2">
            {renderChangeIndicator(analyticsData.activeIncidents.changePercentage)}
          </div>
        </div>
      </div>

      {/* Mean Time to Resolve Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <h3 className="text-gray-600 font-medium">Mean Time to Resolve</h3>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-gray-900">{analyticsData.meanTimeToResolve.time}</p>
          <p className="text-sm text-gray-500 mt-1">Average resolution time</p>
          <div className="mt-2">
            {renderChangeIndicator(analyticsData.meanTimeToResolve.changePercentage)}
          </div>
        </div>
      </div>

      {/* Service Health Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <h3 className="text-gray-600 font-medium">Service Health</h3>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-gray-900">{analyticsData.serviceHealth.count}</p>
          <p className="text-sm text-gray-500 mt-1">{analyticsData.serviceHealth.description}</p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              analyticsData.serviceHealth.description === 'All services operational'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {analyticsData.serviceHealth.description === 'All services operational' ? 'Healthy' : 'Degraded'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Resolutions Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <h3 className="text-gray-600 font-medium">AI Resolutions</h3>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-gray-900">{analyticsData.aiResolutions.count}</p>
          <p className="text-sm text-gray-500 mt-1">Incidents auto-resolved this week</p>
          <div className="mt-2">
            {renderChangeIndicator(analyticsData.aiResolutions.changePercentage)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsCards; 