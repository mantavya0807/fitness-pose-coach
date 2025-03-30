// src/pages/TemplateDetailPage.js
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';

// Fetch template details with exercises
const fetchTemplateDetails = async (templateId) => {
  if (!templateId) return null;
  
  try {
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
            equipment,
            difficulty,
            type,
            demo_image_url,
            exercise_details(
              instructions,
              benefits,
              common_mistakes,
              variations,
              calories_per_rep
            )
          )
        )
      `)
      .eq('id', templateId)
      .single();
      
    if (error) throw error;
    
    // Sort exercises by sort_order
    if (data && data.workout_template_exercises) {
      data.workout_template_exercises.sort((a, b) => a.sort_order - b.sort_order);
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching template details:", error);
    throw error;
  }
};

// Start a workout from this template
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
    
    // Add exercises to the workout
    if (template.workout_template_exercises && template.workout_template_exercises.length > 0) {
      const workoutExercises = template.workout_template_exercises.map(exercise => ({
        workout_id: workout.id,
        exercise_id: exercise.exercise_id,
        sets: exercise.sets || 1,
        reps: exercise.reps || null,
        time_seconds: exercise.time_seconds || null
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
      firstExerciseId 
    };
  } catch (error) {
    console.error("Error starting workout from template:", error);
    throw error;
  }
};

const TemplateDetailPage = () => {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isStartingWorkout, setIsStartingWorkout] = useState(false);
  
  // Fetch template details
  const { 
    data: template, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['templateDetail', templateId],
    queryFn: () => fetchTemplateDetails(templateId),
    enabled: !!templateId
  });
  
  // Calculate template stats
  const totalSets = template?.workout_template_exercises?.reduce((sum, exercise) => sum + (exercise.sets || 0), 0) || 0;
  const exerciseCount = template?.workout_template_exercises?.length || 0;
  
  // Calculate estimated calories (rough estimate based on available data)
  const estimatedCalories = template?.workout_template_exercises?.reduce((sum, exItem) => {
    const caloriesPerRep = exItem.exercises?.exercise_details?.calories_per_rep || 0.3; // Default if not specified
    
    // For time-based exercises (like plank)
    if (exItem.time_seconds && !exItem.reps) {
      return sum + (exItem.sets || 1) * ((exItem.time_seconds / 60) * 3); // ~3 calories per minute of plank
    }
    
    // For rep-based exercises
    return sum + (exItem.sets || 1) * (exItem.reps || 0) * caloriesPerRep;
  }, 0) || 0;
  
  // Check if user is the creator
  const isOwner = user && template && user.id === template.created_by;
  
  // Get all unique muscle groups from exercises
  const muscleGroups = new Set();
  template?.workout_template_exercises?.forEach(exItem => {
    if (exItem.exercises?.muscle_group) {
      exItem.exercises.muscle_group.split(',').forEach(group => {
        muscleGroups.add(group.trim());
      });
    }
  });
  
  // Format time display
  const formatDuration = (minutes) => {
    if (!minutes) return 'Not specified';
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours} hour${hours > 1 ? 's' : ''}${mins > 0 ? ` ${mins} min` : ''}`;
  };
  
  // Start workout function
  const handleStartWorkout = async () => {
    if (!user) {
      alert('Please log in to start a workout');
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
  
  // Format time/reps display for an exercise
  const formatExerciseTarget = (exercise) => {
    if (exercise.time_seconds) {
      return `${exercise.sets || 1} set${(exercise.sets || 1) > 1 ? 's' : ''} × ${exercise.time_seconds} seconds`;
    }
    return `${exercise.sets || 1} set${(exercise.sets || 1) > 1 ? 's' : ''} × ${exercise.reps || '?'} reps`;
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-red-50 p-6 rounded-lg border border-red-200 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Template</h2>
        <p className="text-red-600">{error.message}</p>
        <button
          onClick={() => navigate('/templates')}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Back to Templates
        </button>
      </div>
    );
  }
  
  // If template not found
  if (!template) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold text-yellow-700 mb-2">Template Not Found</h2>
        <p className="text-yellow-600">The requested workout template could not be found.</p>
        <button
          onClick={() => navigate('/templates')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Templates
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">{template.name}</h1>
            <div className="flex flex-wrap gap-2">
              {/* Difficulty badge */}
              {template.difficulty && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  template.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                  template.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                  template.difficulty === 'Advanced' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {template.difficulty}
                </span>
              )}
              
              {/* Visibility badge */}
              <span className={`text-xs px-2 py-1 rounded-full ${
                template.is_public ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
              }`}>
                {template.is_public ? 'Public' : 'Private'}
              </span>
              
              {/* Owner badge */}
              {isOwner && (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  Your Template
                </span>
              )}
            </div>
          </div>
          
          <div className="mt-4 md:mt-0 space-x-3">
            {/* Edit button - only for owner */}
            {isOwner && (
              <button
                onClick={() => navigate(`/templates/${templateId}/edit`)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded hover:bg-gray-200"
              >
                Edit Template
              </button>
            )}
            
            {/* Start workout button */}
            <button
              onClick={handleStartWorkout}
              disabled={isStartingWorkout}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStartingWorkout ? 'Starting...' : 'Start Workout'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Template Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Template details */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Workout Details</h2>
          
          {/* Description */}
          {template.description && (
            <div className="mb-6">
              <p className="text-gray-700">{template.description}</p>
            </div>
          )}
          
          {/* Creator info */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Created by: {template.profiles?.name || 'Unknown user'} | 
              Duration: {formatDuration(template.estimated_duration_minutes)}
            </p>
          </div>
          
          {/* Muscle groups */}
          {muscleGroups.size > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium mb-2">Muscle Groups Targeted:</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(muscleGroups).map(group => (
                  <span key={group} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                    {group}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Stats overview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-gray-500 text-sm">Exercises</p>
              <p className="text-2xl font-semibold">{exerciseCount}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-gray-500 text-sm">Total Sets</p>
              <p className="text-2xl font-semibold">{totalSets}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded text-center">
              <p className="text-gray-500 text-sm">Est. Calories</p>
              <p className="text-2xl font-semibold">{Math.round(estimatedCalories)}</p>
            </div>
          </div>
        </div>
        
        {/* Call to action */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-lg shadow-md text-white flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Ready to Get Started?</h2>
            <p className="mb-6">This workout includes {exerciseCount} exercises and should take about {formatDuration(template.estimated_duration_minutes)}.</p>
            <p className="text-sm opacity-90">You'll burn approximately {Math.round(estimatedCalories)} calories during this workout.</p>
          </div>
          
          <button
            onClick={handleStartWorkout}
            disabled={isStartingWorkout}
            className="mt-6 px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isStartingWorkout ? 'Starting Workout...' : 'Start Workout Now'}
          </button>
        </div>
      </div>
      
      {/* Exercise List */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Exercises in this Workout</h2>
        
        {/* Exercise list */}
        {template.workout_template_exercises && template.workout_template_exercises.length > 0 ? (
          <div className="space-y-4">
            {template.workout_template_exercises.map((exerciseItem, index) => (
              <div key={exerciseItem.id} className="border rounded-lg overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Exercise image */}
                  <div className="md:w-48 h-32 md:h-auto bg-gray-200">
                    {exerciseItem.exercises?.demo_image_url ? (
                      <img 
                        src={exerciseItem.exercises.demo_image_url} 
                        alt={exerciseItem.exercises.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  {/* Exercise info */}
                  <div className="p-4 flex-1">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center font-semibold mr-3">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {exerciseItem.exercises?.name || 'Unknown Exercise'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {exerciseItem.exercises?.muscle_group || 'No muscle group specified'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-500">Target</p>
                        <p className="font-medium">{formatExerciseTarget(exerciseItem)}</p>
                      </div>
                      
                      {exerciseItem.rest_seconds && (
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-xs text-gray-500">Rest</p>
                          <p className="font-medium">{exerciseItem.rest_seconds} seconds</p>
                        </div>
                      )}
                      
                      <div className="bg-gray-50 p-2 rounded">
                        <p className="text-xs text-gray-500">Equipment</p>
                        <p className="font-medium">{exerciseItem.exercises?.equipment || 'None'}</p>
                      </div>
                    </div>
                    
                    {/* Link to exercise detail */}
                    <div className="mt-3">
                      <Link
                        to={`/exercise/${exerciseItem.exercises?.id}`}
                        className="text-blue-600 hover:underline text-sm inline-flex items-center"
                      >
                        View Exercise Details
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg text-center">
            <p className="text-gray-500">This template doesn't have any exercises yet.</p>
            {isOwner && (
              <button
                onClick={() => navigate(`/templates/${templateId}/edit`)}
                className="mt-2 text-blue-600 hover:underline"
              >
                Add exercises
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Actions footer */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => navigate('/templates')}
          className="text-gray-600 hover:text-gray-800 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Templates
        </button>
        
        <div className="space-x-3">
          {isOwner && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this template?')) {
                  // Delete implementation would go here
                  alert('Template deletion not implemented');
                  // navigate('/templates');
                }
              }}
              className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Delete Template
            </button>
          )}
          
          <button
            onClick={handleStartWorkout}
            disabled={isStartingWorkout}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isStartingWorkout ? 'Starting...' : 'Start Workout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateDetailPage;