// src/pages/WorkoutTemplatesPage.js
// Fixed implementation without placeholders

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';

// Fetch workout templates with proper error handling
const fetchWorkoutTemplates = async (userId) => {
  try {
    // Fetch all public templates and the user's private templates
    const { data, error } = await supabase
      .from('workout_templates')
      .select(`
        id,
        name,
        description,
        difficulty,
        estimated_duration_minutes,
        is_public,
        created_by,
        created_at,
        profiles(name),
        workout_template_exercises(
          id,
          exercise_id,
          sets,
          reps,
          time_seconds,
          rest_seconds,
          sort_order,
          exercises(
            id,
            name,
            muscle_group,
            type,
            difficulty,
            equipment,
            demo_image_url
          )
        )
      `)
      .or(`is_public.eq.true,created_by.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching workout templates:", error);
    throw error;
  }
};

// Start workout from template - FIXED implementation
const startWorkoutFromTemplate = async (templateId, userId) => {
  if (!templateId || !userId) {
    throw new Error("Template ID and user ID are required");
  }
  
  try {
    console.log(`Starting workout from template: ${templateId} for user: ${userId}`);
    
    // First fetch the template details
    const { data: template, error: templateError } = await supabase
      .from('workout_templates')
      .select(`
        name,
        workout_template_exercises(
          exercise_id,
          sets,
          reps,
          time_seconds,
          rest_seconds,
          exercises(id, name)
        )
      `)
      .eq('id', templateId)
      .single();
      
    if (templateError) throw templateError;
    
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }
    
    // Create a new workout record
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: userId,
        notes: `${template.name} workout`,
        date: new Date().toISOString(),
        duration_seconds: 0  // Will be updated when workout completes
      })
      .select('id')
      .single();
      
    if (workoutError) throw workoutError;
    
    // Add exercises to the workout - IMPORTANT: remove 'notes' field which doesn't exist
    if (template.workout_template_exercises && template.workout_template_exercises.length > 0) {
      const workoutExercises = template.workout_template_exercises.map(exercise => ({
        workout_id: workout.id,
        exercise_id: exercise.exercise_id,
        sets: exercise.sets || 1,
        reps: exercise.reps || null,
        time_seconds: exercise.time_seconds || null
        // Remove 'notes' field which caused the error
      }));
      
      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(workoutExercises);
        
      if (exercisesError) throw exercisesError;
    }
    
    // Return the workout ID and first exercise ID for navigation
    const firstExerciseId = template.workout_template_exercises?.[0]?.exercise_id;
    return { 
      workoutId: workout.id, 
      firstExerciseId: firstExerciseId 
    };
  } catch (error) {
    console.error("Error starting workout from template:", error);
    throw error;
  }
};

const WorkoutTemplatesPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'public', 'mine'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  
  // Fetch templates
  const { 
    data: templates = [], 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['workoutTemplates', user?.id],
    queryFn: () => fetchWorkoutTemplates(user?.id),
    enabled: !!user?.id,
  });
  
  // Filter templates
  const filteredTemplates = templates.filter(template => {
    // Filter by search term
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    
    // Filter by ownership
    if (selectedFilter === 'public' && !template.is_public) return false;
    if (selectedFilter === 'mine' && template.created_by !== user?.id) return false;
    
    // Filter by difficulty
    if (selectedDifficulty && template.difficulty !== selectedDifficulty) return false;
    
    return true;
  });
  
  // Handle starting a workout from template
  const handleStartWorkout = async (templateId) => {
    if (!templateId || !user?.id) {
      console.error("Missing template ID or user ID");
      return;
    }
    
    setIsStartingWorkout(true);
    
    try {
      const result = await startWorkoutFromTemplate(templateId, user.id);
      
      // Navigate to the first exercise or history if no exercises
      if (result.firstExerciseId) {
        navigate(`/workout/${result.firstExerciseId}/live`);
      } else {
        navigate('/history');
      }
    } catch (error) {
      console.error("Failed to start workout:", error);
      alert("Failed to start workout. Please try again.");
    } finally {
      setIsStartingWorkout(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Workout Templates</h1>
          <p className="text-gray-600">Start a pre-designed workout or create your own</p>
        </div>
        
        <Link 
          to="/templates/create" 
          className="mt-2 md:mt-0 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
        >
          Create Template
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-8 border border-gray-300 rounded"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            >
              <option value="">All Difficulties</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
            
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="p-2 border border-gray-300 rounded"
            >
              <option value="all">All Templates</option>
              <option value="public">Public Templates</option>
              <option value="mine">My Templates</option>
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-500">Loading templates...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-700 border border-red-200">
          <p>Error loading templates: {error.message}</p>
          <button 
            onClick={() => refetch()}
            className="mt-2 px-4 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">No templates found</h2>
          <p className="text-gray-600 mb-4">
            {searchTerm || selectedDifficulty || selectedFilter !== 'all' 
              ? "Try changing your search or filters"
              : "Create your first workout template or explore public templates"}
          </p>
          {searchTerm || selectedDifficulty || selectedFilter !== 'all' ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDifficulty('');
                setSelectedFilter('all');
              }}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Clear Filters
            </button>
          ) : (
            <Link to="/templates/create" className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
              Create Template
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <WorkoutTemplateCard 
              key={template.id}
              template={template}
              userId={user?.id}
              onStartWorkout={() => handleStartWorkout(template.id)}
              isLoading={isStartingWorkout}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Workout Template Card Component
const WorkoutTemplateCard = ({ template, userId, onStartWorkout, isLoading }) => {
  const isOwner = template.created_by === userId;
  const navigate = useNavigate();
  
  // Get exercise count and muscle groups
  const exerciseCount = template.workout_template_exercises?.length || 0;
  
  // Get all unique muscle groups
  const muscleGroups = new Set();
  template.workout_template_exercises?.forEach(ex => {
    if (ex.exercises?.muscle_group) {
      ex.exercises.muscle_group.split(',').forEach(group => {
        muscleGroups.add(group.trim());
      });
    }
  });
  
  // Format duration
  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`;
  };
  
  // Get difficulty color
  const difficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get first exercise image if available
  const coverImage = template.workout_template_exercises?.[0]?.exercises?.demo_image_url || null;
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Header with image or gradient */}
      <div className="h-40 bg-gradient-to-r from-blue-400 to-indigo-500 relative">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt={template.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        )}
        
        {/* Badges overlay */}
        <div className="absolute top-2 right-2 flex flex-col items-end space-y-2">
          {/* Visibility badge */}
          <span className={`text-xs px-2 py-1 rounded-full ${
            template.is_public 
              ? 'bg-blue-100 text-blue-800' 
              : 'bg-purple-100 text-purple-800'
          }`}>
            {template.is_public ? 'Public' : 'Private'}
          </span>
          
          {/* Owner badge (for user's own templates) */}
          {isOwner && (
            <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
              Your Template
            </span>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-1">{template.name}</h3>
        
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <span className="mr-3">{exerciseCount} exercises</span>
          <span>{formatDuration(template.estimated_duration_minutes)}</span>
        </div>
        
        {template.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {/* Difficulty tag */}
          {template.difficulty && (
            <span className={`text-xs px-2 py-1 rounded-full ${difficultyColor(template.difficulty)}`}>
              {template.difficulty}
            </span>
          )}
          
          {/* Show up to 2 muscle groups */}
          {Array.from(muscleGroups).slice(0, 2).map(group => (
            <span key={group} className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
              {group}
            </span>
          ))}
          
          {/* Show "+X more" if there are more than 2 muscle groups */}
          {muscleGroups.size > 2 && (
            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full">
              +{muscleGroups.size - 2} more
            </span>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={onStartWorkout}
            disabled={isLoading}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Starting...' : 'Start Workout'}
          </button>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/templates/${template.id}`)}
              className="p-2 text-gray-600 hover:text-blue-600 transition"
              title="View Details"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            
            {/* Edit button (only for owner) */}
            {isOwner && (
              <button
                onClick={() => navigate(`/templates/${template.id}/edit`)}
                className="p-2 text-gray-600 hover:text-green-600 transition"
                title="Edit Template"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutTemplatesPage;