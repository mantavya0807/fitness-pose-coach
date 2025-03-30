// src/pages/WorkoutHistoryPage.js
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { supabase } from '../supabaseClient';
import { formatDuration } from '../utils/dashboardUtils';

// Import components
import WorkoutHistoryCharts from '../components/workout/WorkoutHistoryCharts';
import WorkoutCalendar from '../components/workout/WorkoutCalendar';

// Fetch workout history with related exercise details
const fetchWorkoutHistory = async (userId, timeRange = '30d') => {
  if (!userId) return { workouts: [], summary: {} };
  
  // Calculate the date range
  const endDate = new Date();
  let startDate = new Date();
  
  switch (timeRange) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '365d':
      startDate.setDate(startDate.getDate() - 365);
      break;
    case 'all':
      startDate = new Date(0); // Beginning of time
      break;
    default:
      startDate.setDate(startDate.getDate() - 30); // Default to 30 days
  }
  
  const startDateStr = startDate.toISOString();
  
  try {
    // Fetch detailed workouts
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select(`
        id,
        date,
        duration_seconds,
        calories_burned,
        notes,
        workout_exercises (
          id,
          sets,
          reps,
          time_seconds,
          form_score,
          exercises ( id, name, type, muscle_group )
        )
      `)
      .eq('user_id', userId)
      .gte('date', startDateStr)
      .order('date', { ascending: false });

    if (workoutError) throw workoutError;
    
    // Calculate summary statistics
    const summary = calculateWorkoutSummary(workouts || []);
    
    return { 
      workouts: workouts || [], 
      summary,
      timeRange
    };
  } catch (error) {
    console.error("Error fetching workout history:", error);
    throw new Error(error.message);
  }
};

// Helper function to calculate summary statistics
const calculateWorkoutSummary = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return {
      totalWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      averageDuration: 0,
      mostWorkedMuscle: 'N/A',
      frequentExercise: 'N/A'
    };
  }
  
  // Basic stats
  const totalWorkouts = workouts.length;
  const totalDuration = workouts.reduce((sum, workout) => sum + (workout.duration_seconds || 0), 0);
  const totalCalories = workouts.reduce((sum, workout) => sum + (workout.calories_burned || 0), 0);
  const averageDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;
  
  // Most worked muscle groups
  const muscleGroupCounts = {};
  const exerciseCounts = {};
  
  workouts.forEach(workout => {
    if (workout.workout_exercises) {
      workout.workout_exercises.forEach(we => {
        if (we.exercises) {
          // Count muscle groups
          if (we.exercises.muscle_group) {
            const muscleGroups = we.exercises.muscle_group.split(',').map(group => group.trim());
            muscleGroups.forEach(group => {
              muscleGroupCounts[group] = (muscleGroupCounts[group] || 0) + 1;
            });
          }
          
          // Count exercises
          const exerciseName = we.exercises.name;
          exerciseCounts[exerciseName] = (exerciseCounts[exerciseName] || 0) + 1;
        }
      });
    }
  });
  
  // Find most frequent
  const mostWorkedMuscle = Object.entries(muscleGroupCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])[0] || 'N/A';
    
  const frequentExercise = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0])[0] || 'N/A';
  
  return {
    totalWorkouts,
    totalDuration,
    totalCalories,
    averageDuration,
    mostWorkedMuscle,
    frequentExercise
  };
};

const WorkoutHistoryPage = () => {
  const { user } = useAuthStore();
  const [timeRange, setTimeRange] = useState('30d');
  const [viewMode, setViewMode] = useState('list'); // 'list', 'calendar', or 'charts'
  
  // Fetch workout history data
  const { 
    data: historyData = { workouts: [], summary: {} }, 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['workoutHistory', user?.id, timeRange],
    queryFn: () => fetchWorkoutHistory(user?.id, timeRange),
    enabled: !!user?.id,
  });
  
  const { workouts, summary } = historyData;
  
  // Handle time range change
  const handleTimeRangeChange = (range) => {
    setTimeRange(range);
  };
  
  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Workout History</h1>
          <p className="text-gray-600">Track your progress and view past workouts</p>
        </div>
        
        <Link 
          to="/explore" 
          className="mt-2 md:mt-0 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Start New Workout
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Workouts</p>
          <p className="text-2xl font-bold">{summary.totalWorkouts}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Duration</p>
          <p className="text-2xl font-bold">{formatDuration(summary.totalDuration)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Calories Burned</p>
          <p className="text-2xl font-bold">{summary.totalCalories}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Most Worked</p>
          <p className="text-2xl font-bold truncate">{summary.mostWorkedMuscle}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row justify-between">
        {/* Time Range Selector */}
        <div className="flex space-x-2 mb-3 sm:mb-0">
          <button
            onClick={() => handleTimeRangeChange('7d')}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === '7d' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => handleTimeRangeChange('30d')}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === '30d' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => handleTimeRangeChange('90d')}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === '90d' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            90 Days
          </button>
          <button
            onClick={() => handleTimeRangeChange('all')}
            className={`px-3 py-1 rounded text-sm ${
              timeRange === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Time
          </button>
        </div>
        
        {/* View Mode Selector */}
        <div className="flex space-x-2">
          <button
            onClick={() => handleViewModeChange('list')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            List
          </button>
          <button
            onClick={() => handleViewModeChange('calendar')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => handleViewModeChange('charts')}
            className={`px-3 py-1 rounded text-sm ${
              viewMode === 'charts' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Charts
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading workout history...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-medium">Error loading history:</p>
          <p>{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* View content based on selected mode */}
      {!isLoading && !error && (
        viewMode === 'list' ? (
          // List View
          <WorkoutListView workouts={workouts} />
        ) : viewMode === 'calendar' ? (
          // Calendar View
          <WorkoutCalendar workouts={workouts} />
        ) : (
          // Charts View
          <WorkoutHistoryCharts workouts={workouts} timeRange={timeRange} />
        )
      )}
    </div>
  );
};

// Workout List View Component
const WorkoutListView = ({ workouts = [] }) => {
  if (workouts.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <p className="text-gray-600 mb-4">You haven't recorded any workouts yet.</p>
        <Link to="/explore" className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow hover:bg-blue-600 transition">
          Start Exercising!
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {workouts.map(workout => (
        <li key={workout.id} className="bg-white p-5 rounded-lg shadow hover:shadow-md transition">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-3 pb-3 border-b">
            <div>
              <h2 className="text-lg font-semibold">{workout.notes || 'Workout Session'}</h2>
              <p className="text-sm text-gray-500">
                {new Date(workout.date).toLocaleDateString()} • {formatDuration(workout.duration_seconds)}
              </p>
            </div>
            <div className="mt-2 md:mt-0 flex items-center space-x-4">
              <div className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
                </svg>
                {workout.calories_burned || 0} cal
              </div>
            </div>
          </div>
          
          {/* Exercises List */}
          {workout.workout_exercises && workout.workout_exercises.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-600">Exercises Performed:</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {workout.workout_exercises.map((we, index) => (
                  <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        we.form_score > 0.7 ? 'bg-green-500' : 
                        we.form_score > 0.4 ? 'bg-yellow-500' : 
                        we.form_score ? 'bg-red-500' : 'bg-gray-300'
                      }`}></div>
                      <Link
                        to={we.exercises ? `/exercise/${we.exercises.id}` : '#'}
                        className={`font-medium ${we.exercises ? 'text-blue-600 hover:underline' : 'text-gray-500 italic'}`}
                      >
                        {we.exercises?.name || 'Exercise Deleted'}
                      </Link>
                    </div>
                    <div className="text-xs text-gray-500">
                      {we.sets && `${we.sets} set(s)`}
                      {we.reps && ` × ${we.reps} reps`}
                      {we.time_seconds && ` for ${formatDuration(we.time_seconds)}`}
                      {we.form_score && ` (Form: ${(we.form_score * 10).toFixed(1)}/10)`}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default WorkoutHistoryPage;