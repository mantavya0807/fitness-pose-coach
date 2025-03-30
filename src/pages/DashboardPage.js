// src/pages/DashboardPage.js
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { supabase } from '../supabaseClient';
import { 
  fetchDashboardData, 
  formatDuration, 
  getMotivationalQuote 
} from '../utils/dashboardUtils';

// Dashboard components (to avoid import issues in artifacts)
import DashboardCharts from '../components/dashboard/DashboardCharts';
import WeeklyActivity from '../components/dashboard/WeeklyActivity';
import MuscleGroupChart from '../components/dashboard/MuscleGroupChart.js';
import RecentWorkoutsList from '../components/dashboard/RecentWorkoutsList';
import DashboardGoalsWidget from '../components/dashboard/DashboardGoalsWidget';

const DashboardPage = () => {
  const { user, profile: authProfile } = useAuthStore();
  const [quote, setQuote] = useState('');
  
  // Set a random motivational quote on component mount
  useEffect(() => {
    setQuote(getMotivationalQuote());
  }, []);

  // Fetch dashboard data using React Query
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboardData', user?.id],
    queryFn: () => fetchDashboardData(user?.id, supabase),
    enabled: !!user?.id,
    staleTime: 60000, // 1 minute
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading dashboard data...</p>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700">
        <h2 className="text-xl font-semibold mb-3">Error Loading Dashboard</h2>
        <p>{error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Get user name for display
  const profile = dashboardData?.profile || {};
  const userName = profile?.name || authProfile?.name || user?.email?.split('@')[0] || 'Athlete';
  
  return (
    <div className="space-y-6">
      {/* Header with Greeting and Quick Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {userName}!</h1>
        <p className="italic text-blue-100">{quote}</p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-blue-100">Workout Streak</p>
            <p className="text-3xl font-bold">{dashboardData?.streak || 0} days</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-blue-100">Total Workouts</p>
            <p className="text-3xl font-bold">{dashboardData?.monthWorkoutsData?.length || 0}</p>
            <p className="text-xs">Last 30 days</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-blue-100">Calories Burned</p>
            <p className="text-3xl font-bold">
              {dashboardData?.monthWorkoutsData?.reduce((sum, workout) => sum + (workout.calories_burned || 0), 0) || 0}
            </p>
            <p className="text-xs">Last 30 days</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg backdrop-blur-sm">
            <p className="text-xs uppercase tracking-wider text-blue-100">Latest BMI</p>
            <p className="text-3xl font-bold">{dashboardData?.latestStats?.bmi || 'N/A'}</p>
            {dashboardData?.latestStats?.bmi && (
              <p className="text-xs">
                {dashboardData.latestStats.bmi < 18.5 ? 'Underweight' : 
                dashboardData.latestStats.bmi < 25 ? 'Normal' :
                dashboardData.latestStats.bmi < 30 ? 'Overweight' : 'Obese'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Charts & Analytics */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Weight/BMI Tracker */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Weight & BMI Tracker</h2>
            {dashboardData?.statsHistory && dashboardData.statsHistory.length > 0 ? (
              <DashboardCharts statsHistory={dashboardData.statsHistory} />
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center">
                <p className="text-gray-500 mb-4">No weight or BMI data recorded yet.</p>
                <Link to="/settings" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  Add Stats
                </Link>
              </div>
            )}
          </div>
          
          {/* Workout Analytics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weekly Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Weekly Activity</h2>
              {dashboardData?.weeklyDistribution && (
                <WeeklyActivity weeklyDistribution={dashboardData.weeklyDistribution} />
              )}
            </div>
            
            {/* Muscle Groups Worked */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Muscle Groups Worked</h2>
              {dashboardData?.muscleGroupData && dashboardData.muscleGroupData.length > 0 ? (
                <MuscleGroupChart muscleGroupData={dashboardData.muscleGroupData} />
              ) : (
                <div className="h-64 flex items-center justify-center text-center">
                  <p className="text-gray-500">No exercise data available yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column - Actions & Summaries */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link 
                to="/explore" 
                className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition"
              >
                Find Exercise
              </Link>
              <Link 
                to="/goals" 
                className="block w-full py-3 px-4 bg-green-600 text-white text-center rounded-lg hover:bg-green-700 transition"
              >
                Manage Goals
              </Link>
              <Link 
                to="/history" 
                className="block w-full py-3 px-4 bg-emerald-600 text-white text-center rounded-lg hover:bg-emerald-700 transition"
              >
                View History
              </Link>
              <Link 
                to="/settings" 
                className="block w-full py-3 px-4 bg-gray-200 text-gray-800 text-center rounded-lg hover:bg-gray-300 transition"
              >
                Update Profile
              </Link>
            </div>
          </div>
          
          {/* Updated Goals Widget */}
          <DashboardGoalsWidget goals={dashboardData?.userGoals} />
          
          {/* Recent Workouts */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Recent Workouts</h2>
              <Link to="/history" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            
            <RecentWorkoutsList workouts={dashboardData?.recentWorkouts} />
          </div>
        </div>
      </div>
      
      {/* Workout of the Day Suggestion */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Workout of the Day</h2>
        <p className="mb-4">Based on your goals and recent activity:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Push Up', 'Squat', 'Plank'].map((exercise, index) => (
            <div key={index} className="bg-white bg-opacity-20 p-4 rounded">
              <h3 className="font-bold text-lg">{exercise}</h3>
              <p className="text-sm opacity-90">
                {index === 0 ? '3 sets x 10 reps' : 
                 index === 1 ? '3 sets x 12 reps' : 
                 '3 sets x 30 seconds'}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex space-x-4">
          <Link 
            to="/explore" 
            className="inline-block bg-white text-indigo-700 px-6 py-2 rounded font-semibold hover:bg-gray-100 transition"
          >
            Explore Exercises
          </Link>
          <Link 
            to="/goals/create" 
            className="inline-block bg-indigo-500 text-white px-6 py-2 rounded font-semibold hover:bg-indigo-600 transition border border-indigo-400"
          >
            Create Custom Goal
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;