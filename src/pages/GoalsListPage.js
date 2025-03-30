// src/pages/GoalsListPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import GoalProgressCard from '../components/goals/GoalProgressCard';

const GoalsListPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('active'); // 'active', 'completed', 'all'
  
  // Fetch user goals
  const { 
    data: goals = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['userGoals', user?.id, filter],
    queryFn: async () => {
      // Build query based on filter
      let query = supabase
        .from('user_goals')
        .select(`
          *,
          goal_workout_plans (
            template_id,
            is_primary,
            workout_templates (
              id,
              name,
              estimated_duration_minutes
            )
          )
        `)
        .eq('user_id', user?.id);
      
      // Apply status filter
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }
      
      // Execute query
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
  
  // Fetch latest physical stats for goal progress calculations
  const { data: latestStats } = useQuery({
    queryKey: ['latestUserStats', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('physical_stats')
        .select('*')
        .eq('user_id', user?.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Update goal status mutation
  const updateGoalStatusMutation = useMutation({
    mutationFn: async ({ goalId, status }) => {
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
      queryClient.invalidateQueries(['userGoals']);
    },
    onError: (error) => {
      console.error('Error updating goal status:', error);
      alert(`Failed to update goal: ${error.message}`);
    }
  });
  
  // Calculate progress percentage for a goal
  const calculateProgress = (goal) => {
    if (!goal || !latestStats) return 0;
    
    const current = parseFloat(goal.current_value);
    const target = parseFloat(goal.target_value);
    let currentValue = current;
    
    // Get the most recent value based on metric type
    switch (goal.metric_type) {
      case 'weight':
        currentValue = latestStats.weight_kg || current;
        break;
      case 'bmi':
        currentValue = latestStats.bmi || current;
        break;
      // Add other metric types as needed
      default:
        currentValue = current;
    }
    
    // Calculate progress percentage based on goal type
    if (goal.goal_type === 'weight_loss' || target < current) {
      // Weight loss goals or any goal where target is lower than start
      const totalChange = current - target;
      const currentChange = current - currentValue;
      
      if (totalChange <= 0) return 0; // Invalid goal
      return Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
    } else {
      // Weight gain goals or any goal where target is higher than start
      const totalChange = target - current;
      const currentChange = currentValue - current;
      
      if (totalChange <= 0) return 0; // Invalid goal
      return Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
    }
  };
  
  // Handle status change
  const handleStatusChange = (goalId, newStatus) => {
    updateGoalStatusMutation.mutate({ goalId, status: newStatus });
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  // Calculate days remaining until target date
  const calculateDaysRemaining = (targetDate) => {
    if (!targetDate) return 0;
    
    const target = new Date(targetDate);
    const today = new Date();
    
    // Reset time components to compare dates only
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">My Fitness Goals</h1>
          <p className="text-gray-600">Track your progress and manage your fitness goals</p>
        </div>
        
        <Link 
          to="/goals/create" 
          className="mt-3 md:mt-0 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          Create New Goal
        </Link>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-md ${
              filter === 'active' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-md ${
              filter === 'completed' 
                ? 'bg-green-100 text-green-700 font-medium' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all' 
                ? 'bg-purple-100 text-purple-700 font-medium' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Goals
          </button>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading your goals...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-6">
          <p className="font-medium">Error loading goals:</p>
          <p>{error.message}</p>
          <button
            onClick={() => queryClient.invalidateQueries(['userGoals'])}
            className="mt-2 px-4 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      )}
      
      {/* Empty state */}
      {!isLoading && !error && goals.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2">No {filter !== 'all' ? filter : ''} goals yet</h2>
          <p className="text-gray-600 mb-6">
            {filter === 'active' ? 
              "Create fitness goals to track your progress and get personalized workout plans." : 
              filter === 'completed' ? 
              "You haven't completed any goals yet. Keep working toward your active goals!" :
              "You haven't created any fitness goals yet. Let's get started!"}
          </p>
          <Link
            to="/goals/create"
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 inline-block"
          >
            Create Your First Goal
          </Link>
        </div>
      )}
      
      {/* Goals grid */}
      {!isLoading && !error && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => (
            <GoalProgressCard
              key={goal.id}
              goal={goal}
              progress={calculateProgress(goal)}
              daysRemaining={calculateDaysRemaining(goal.target_date)}
              formatDate={formatDate}
              onStatusChange={handleStatusChange}
              onClick={() => navigate(`/goals/${goal.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalsListPage;