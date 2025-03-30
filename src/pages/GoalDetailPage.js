// src/pages/GoalDetailPage.js
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getGoalInsights } from '../services/geminiService';

const GoalDetailPage = () => {
  const { goalId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState(null);
  
  // Fetch goal details
  const { 
    data: goal, 
    isLoading: goalLoading, 
    error: goalError
  } = useQuery({
    queryKey: ['goalDetail', goalId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_goals')
        .select(`
          *,
          goal_workout_plans (
            template_id,
            is_primary,
            workout_templates (
              id,
              name,
              description,
              difficulty,
              estimated_duration_minutes,
              workout_template_exercises (
                exercise_id,
                sets,
                reps,
                time_seconds,
                exercises (
                  id,
                  name,
                  type,
                  muscle_group,
                  equipment,
                  difficulty
                )
              )
            )
          )
        `)
        .eq('id', goalId)
        .single();
      
      if (error) throw error;
      
      // Validate ownership
      if (data.user_id !== user?.id) {
        throw new Error("You don't have permission to view this goal");
      }
      
      return data;
    },
    enabled: !!goalId && !!user?.id,
  });
  
  // Fetch progress data (physical stats over time)
  const { 
    data: progressData = [],
    isLoading: progressLoading
  } = useQuery({
    queryKey: ['goalProgress', goalId, goal?.metric_type],
    queryFn: async () => {
      if (!goal?.metric_type) return [];
      
      const startDate = new Date(goal.start_date);
      
      const { data, error } = await supabase
        .from('physical_stats')
        .select('*')
        .eq('user_id', user.id)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });
      
      if (error) throw error;
      
      // Format data for chart based on metric type
      return (data || []).map(stat => {
        const date = new Date(stat.recorded_at);
        
        // Get the value based on metric type
        let value = null;
        switch (goal.metric_type) {
          case 'weight':
            value = stat.weight_kg;
            break;
          case 'bmi':
            value = stat.bmi;
            break;
          case 'body_fat':
            value = stat.body_fat;
            break;
          default:
            value = null;
        }
        
        return {
          date: date.toLocaleDateString(),
          timestamp: date.getTime(),
          value
        };
      }).filter(item => item.value !== null);
    },
    enabled: !!goal?.metric_type && !!user?.id,
  });
  
  // Fetch related workouts
  const { 
    data: relatedWorkouts = [],
    isLoading: workoutsLoading
  } = useQuery({
    queryKey: ['goalWorkouts', goalId],
    queryFn: async () => {
      if (!goal) return [];
      
      const startDate = new Date(goal.start_date);
      
      const { data, error } = await supabase
        .from('workouts')
        .select(`
          id,
          date,
          duration_seconds,
          calories_burned,
          notes,
          workout_exercises (
            id,
            exercise_id,
            sets,
            reps,
            time_seconds
          )
        `)
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .order('date', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!goal && !!user?.id,
  });
  
  // Calculate current progress percentage
  const calculateProgress = () => {
    if (!goal || progressData.length === 0) return 0;
    
    const current = parseFloat(goal.current_value);
    const target = parseFloat(goal.target_value);
    
    // Get the most recent value
    const latestValue = progressData[progressData.length - 1]?.value || current;
    
    // Calculate progress based on goal type
    if (goal.goal_type === 'weight_loss' || target < current) {
      // For weight loss or any goal where target is lower than start
      const totalChange = current - target;
      const currentChange = current - latestValue;
      
      if (totalChange <= 0) return 0; // Invalid goal
      return Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
    } else {
      // For weight gain or any goal where target is higher than start
      const totalChange = target - current;
      const currentChange = latestValue - current;
      
      if (totalChange <= 0) return 0; // Invalid goal
      return Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
    }
  };
  
  // Calculate days remaining
  const calculateDaysRemaining = () => {
    if (!goal?.target_date) return 0;
    
    const targetDate = new Date(goal.target_date);
    const today = new Date();
    
    // Reset time components
    targetDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };
  
  // Format dates for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Format duration from seconds
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  // Update goal status mutation
  const updateGoalStatusMutation = useMutation({
    mutationFn: async (status) => {
      const { data, error } = await supabase
        .from('user_goals')
        .update({ status })
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goalDetail']);
      queryClient.invalidateQueries(['userGoals']);
    },
    onError: (error) => {
      console.error('Error updating goal status:', error);
      alert(`Failed to update goal: ${error.message}`);
    }
  });
  
  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async (updates) => {
      const { data, error } = await supabase
        .from('user_goals')
        .update(updates)
        .eq('id', goalId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['goalDetail']);
      queryClient.invalidateQueries(['userGoals']);
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      alert(`Failed to update goal: ${error.message}`);
    }
  });
  
  // Handle status change
  const handleStatusChange = (newStatus) => {
    if (window.confirm(`Are you sure you want to mark this goal as ${newStatus}?`)) {
      updateGoalStatusMutation.mutate(newStatus);
    }
  };
  
  // Generate insights using Gemini
  const generateInsights = async () => {
    if (!goal) return;
    
    setIsGeneratingInsights(true);
    
    try {
      // Prepare data for Gemini
      const insightData = {
        goal,
        progressData,
        workouts: relatedWorkouts,
        daysRemaining: calculateDaysRemaining(),
        currentProgress: calculateProgress()
      };
      
      // Get insights from Gemini
      const generatedInsights = await getGoalInsights(insightData);
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error generating insights:', error);
      alert(`Failed to generate insights: ${error.message}`);
    } finally {
      setIsGeneratingInsights(false);
    }
  };
  
  // Loading states
  if (goalLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading goal details...</p>
      </div>
    );
  }
  
  // Error state
  if (goalError) {
    return (
      <div className="max-w-3xl mx-auto bg-red-50 p-6 rounded-lg border border-red-200">
        <h2 className="text-xl font-bold text-red-700 mb-2">Error</h2>
        <p className="text-red-600 mb-4">{goalError.message}</p>
        <button
          onClick={() => navigate('/goals')}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Back to Goals
        </button>
      </div>
    );
  }
  
  // Not found state
  if (!goal) {
    return (
      <div className="max-w-3xl mx-auto bg-yellow-50 p-6 rounded-lg border border-yellow-200">
        <h2 className="text-xl font-bold text-yellow-700 mb-2">Goal Not Found</h2>
        <p className="text-yellow-600 mb-4">The requested goal could not be found.</p>
        <button
          onClick={() => navigate('/goals')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to Goals
        </button>
      </div>
    );
  }
  
  // Get progress percentage and format for display
  const progressPercentage = calculateProgress();
  const progressFormatted = progressPercentage.toFixed(1);
  
  // Get workout plan if available
  const workoutPlan = goal.goal_workout_plans?.find(p => p.is_primary)?.workout_templates;
  
  return (
    <div className="max-w-5xl mx-auto">
      {/* Goal Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center mb-1">
            <h1 className="text-3xl font-bold">{goal.goal_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Goal</h1>
            <span className={`ml-3 text-sm px-3 py-1 rounded-full ${
              goal.status === 'active' ? 'bg-blue-100 text-blue-800' :
              goal.status === 'completed' ? 'bg-green-100 text-green-800' :
              goal.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </span>
          </div>
          <p className="text-gray-600">
            Created on {formatDate(goal.created_at)} • 
            {calculateDaysRemaining() > 0 
              ? ` ${calculateDaysRemaining()} days remaining` 
              : ' Target date reached'}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex space-x-3">
          {goal.status === 'active' && (
            <>
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Mark Completed
              </button>
              <button
                onClick={() => handleStatusChange('cancelled')}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel Goal
              </button>
            </>
          )}
          {goal.status !== 'active' && (
            <button
              onClick={() => handleStatusChange('active')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Reactivate Goal
            </button>
          )}
        </div>
      </div>
      
      {/* Goal Summary Card */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Target Values */}
          <div className="col-span-2">
            <h2 className="text-lg font-semibold mb-4">Goal Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Starting Value</p>
                <p className="text-xl font-semibold">{goal.current_value} {goal.metric_type === 'weight' ? 'kg' : ''}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Target Value</p>
                <p className="text-xl font-semibold">{goal.target_value} {goal.metric_type === 'weight' ? 'kg' : ''}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Target Date</p>
                <p className="text-xl font-semibold">{formatDate(goal.target_date)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-500">Workout Frequency</p>
                <p className="text-xl font-semibold">{goal.frequency || 3} days/week</p>
              </div>
            </div>
            
            {goal.notes && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-1">Notes:</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{goal.notes}</p>
              </div>
            )}
          </div>
          
          {/* Progress Circle */}
          <div className="flex flex-col items-center justify-center bg-gray-50 p-6 rounded-lg">
            <div className="w-32 h-32 relative">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="3"
                  strokeDasharray="100, 100"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={progressPercentage >= 100 ? "#059669" : "#3B82F6"}
                  strokeWidth="3"
                  strokeDasharray={`${progressPercentage}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <p className="text-3xl font-bold">{progressFormatted}%</p>
                <p className="text-xs text-gray-500">Complete</p>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <p className="font-medium">
                {progressPercentage >= 100 
                  ? "Goal achieved! 🎉" 
                  : `${(parseFloat(goal.target_value) - progressData[progressData.length - 1]?.value || parseFloat(goal.current_value)).toFixed(1)} ${goal.metric_type === 'weight' ? 'kg' : ''} to go`}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Chart */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Progress Over Time</h2>
        
        {progressLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : progressData.length < 2 ? (
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-gray-500 mb-2">Not enough data to show progress</p>
              <p className="text-sm text-gray-400">Record at least two measurements to see your progress chart</p>
            </div>
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={progressData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(tick) => new Date(tick).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  domain={
                    goal.goal_type === 'weight_loss' || parseFloat(goal.target_value) < parseFloat(goal.current_value) 
                      ? [Math.min(parseFloat(goal.target_value) * 0.95, Math.min(...progressData.map(d => d.value))), parseFloat(goal.current_value) * 1.05]
                      : [parseFloat(goal.current_value) * 0.95, Math.max(parseFloat(goal.target_value) * 1.05, Math.max(...progressData.map(d => d.value)))]
                  }
                />
                <Tooltip 
                  formatter={(value) => [value.toFixed(1), goal.metric_type]}
                  labelFormatter={(value) => `Date: ${value}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        
        <div className="mt-4">
          <button
            onClick={generateInsights}
            disabled={isGeneratingInsights || progressData.length < 2}
            className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
          >
            {isGeneratingInsights ? 'Generating...' : 'Generate AI Insights'}
          </button>
          
          {insights && (
            <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">AI Insights</h3>
              <p className="text-sm text-gray-700">{insights.analysis}</p>
              
              {insights.recommendations && (
                <>
                  <h4 className="font-medium text-blue-800 mt-3 mb-1">Recommendations</h4>
                  <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                    {insights.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Workout Plan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Workout Plan Card */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Workout Plan</h2>
          
          {workoutPlan ? (
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-lg">{workoutPlan.name}</h3>
                  <p className="text-sm text-gray-600">{workoutPlan.description}</p>
                </div>
                <Link 
                  to={`/templates/${workoutPlan.id}`}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                >
                  View Full Plan
                </Link>
              </div>
              
              <div className="mt-4 border-t pt-4">
                <p className="font-medium mb-2">Exercise List</p>
                <ul className="divide-y">
                  {workoutPlan.workout_template_exercises?.map((exercise, index) => (
                    <li key={index} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{exercise.exercises?.name || 'Unknown Exercise'}</p>
                        <p className="text-xs text-gray-500">
                          {exercise.exercises?.muscle_group} • {exercise.exercises?.difficulty}
                        </p>
                      </div>
                      <div className="text-sm text-gray-700">
                        {exercise.sets || 3} sets × {exercise.time_seconds ? `${exercise.time_seconds}s` : `${exercise.reps || 10} reps`}
                      </div>
                    </li>
                  ))}
                </ul>
                
                <div className="mt-4">
                  <Link
                    to={`/workout/${workoutPlan.workout_template_exercises?.[0]?.exercises?.id}/live`}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 inline-block"
                  >
                    Start Workout
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg text-center">
              <p className="text-gray-500 mb-3">No workout plan associated with this goal</p>
              <Link
                to="/templates/create"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-block"
              >
                Create Workout Plan
              </Link>
            </div>
          )}
        </div>
        
        {/* Recent Workouts Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Workouts</h2>
          
          {workoutsLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : relatedWorkouts.length === 0 ? (
            <div className="h-40 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500 text-center">No workouts recorded since starting this goal</p>
            </div>
          ) : (
            <ul className="divide-y">
              {relatedWorkouts.slice(0, 5).map(workout => (
                <li key={workout.id} className="py-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{formatDate(workout.date)}</span>
                    <span className="text-sm text-gray-500">{formatDuration(workout.duration_seconds)}</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {workout.workout_exercises?.length || 0} exercises • {workout.calories_burned || 0} calories
                  </p>
                </li>
              ))}
            </ul>
          )}
          
          <div className="mt-4 pt-3 border-t">
            <Link 
              to="/history" 
              className="text-blue-600 hover:underline text-sm flex items-center"
            >
              View all workouts
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalDetailPage;