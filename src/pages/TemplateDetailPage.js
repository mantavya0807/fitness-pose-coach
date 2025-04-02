// src/pages/TemplateDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import { colors, animations, shadows, borderRadius } from '../styles/theme';
import { 
  Play, 
  Edit, 
  Clock, 
  Dumbbell, 
  ChevronUp, 
  ChevronDown, 
  Award, 
  Flame, 
  ArrowLeft,
  Users,
  User,
  Share2,
  Bookmark,
  BookmarkCheck,
  CalendarCheck,
  MoreHorizontal,
  ChevronRight
} from 'lucide-react';

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
  const [expandedExercise, setExpandedExercise] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('exercises');
  
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
  
  // Toggle exercise expansion
  const toggleExercise = (index) => {
    if (expandedExercise === index) {
      setExpandedExercise(null);
    } else {
      setExpandedExercise(index);
    }
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

  // Get difficulty styling
  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'beginner': 
        return {
          bg: 'bg-green-100', 
          text: 'text-green-800',
          icon: <Award className="w-4 h-4 mr-1" />
        };
      case 'intermediate': 
        return {
          bg: 'bg-yellow-100', 
          text: 'text-yellow-800',
          icon: <Award className="w-4 h-4 mr-1" />
        };
      case 'advanced': 
        return {
          bg: 'bg-red-100', 
          text: 'text-red-800',
          icon: <Flame className="w-4 h-4 mr-1" />
        };
      default: 
        return {
          bg: 'bg-gray-100', 
          text: 'text-gray-800',
          icon: <Award className="w-4 h-4 mr-1" />
        };
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
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

  // Get first exercise image if available for header background
  const headerImage = template.workout_template_exercises?.[0]?.exercises?.demo_image_url;
  
  // Get difficulty styling
  const difficultyStyle = getDifficultyColor(template.difficulty);
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/templates')}
          className="inline-flex items-center text-gray-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} className="mr-1" />
          <span>Back to Templates</span>
        </button>
      </div>
      
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg">
        {/* Background image or gradient */}
        {headerImage ? (
          <div className="absolute inset-0">
            <img 
              src={headerImage} 
              alt={template.name} 
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/80 to-indigo-600/80"></div>
          </div>
        ) : null}
        
        <div className="relative p-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">{template.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {/* Difficulty badge */}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20`}>
                  {difficultyStyle.icon}
                  {template.difficulty}
                </span>
                
                {/* Visibility badge */}
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20">
                  {template.is_public ? (
                    <>
                      <Users size={14} className="mr-1" />
                      Public
                    </>
                  ) : (
                    <>
                      <User size={14} className="mr-1" />
                      Private
                    </>
                  )}
                </span>
                
                {/* Owner badge */}
                {isOwner && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20">
                    <User size={14} className="mr-1" />
                    Your Template
                  </span>
                )}
              </div>
              
              <p className="text-white/90 max-w-2xl">
                {template.description || `A ${template.difficulty?.toLowerCase() || ''} workout focusing on ${Array.from(muscleGroups).slice(0, 3).join(', ')}${muscleGroups.size > 3 ? '...' : ''}`}
              </p>
            </div>
            
            {/* Action button */}
            <div className="mt-6 md:mt-0">
              <button
                onClick={handleStartWorkout}
                disabled={isStartingWorkout}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
              >
                <Play size={20} className="mr-2" fill="currentColor" />
                {isStartingWorkout ? 'Starting...' : 'Start Workout'}
              </button>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center text-white/80 mb-1">
                <Dumbbell size={16} className="mr-1" />
                <span className="text-sm">Exercises</span>
              </div>
              <p className="text-2xl font-bold">{exerciseCount}</p>
            </div>
            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center text-white/80 mb-1">
                <Award size={16} className="mr-1" />
                <span className="text-sm">Total Sets</span>
              </div>
              <p className="text-2xl font-bold">{totalSets}</p>
            </div>
            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center text-white/80 mb-1">
                <Clock size={16} className="mr-1" />
                <span className="text-sm">Duration</span>
              </div>
              <p className="text-2xl font-bold">{template.estimated_duration_minutes || 30}<span className="text-sm font-normal ml-1">min</span></p>
            </div>
            <div className="bg-white/10 p-3 rounded-lg backdrop-blur-sm">
              <div className="flex items-center text-white/80 mb-1">
                <Flame size={16} className="mr-1" />
                <span className="text-sm">Calories</span>
              </div>
              <p className="text-2xl font-bold">{Math.round(estimatedCalories)}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('exercises')}
              className={`px-4 py-3 text-sm font-medium flex items-center ${
                activeTab === 'exercises' 
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Dumbbell size={16} className="mr-2" />
              Exercises
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-medium flex items-center ${
                activeTab === 'details' 
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Clock size={16} className="mr-2" />
              Details
            </button>
          </div>
        </div>
        
        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'exercises' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Dumbbell size={20} className="mr-2 text-blue-600" />
                Exercises
              </h2>
              
              {/* Exercise list */}
              {template.workout_template_exercises && template.workout_template_exercises.length > 0 ? (
                <div className="space-y-4">
                  {template.workout_template_exercises.map((exerciseItem, index) => (
                    <div 
                      key={exerciseItem.id || index} 
                      className={`border rounded-lg overflow-hidden transition-shadow hover:shadow-md ${
                        expandedExercise === index ? 'shadow-md' : ''
                      }`}
                    >
                      <div 
                        className="flex items-start p-4 cursor-pointer bg-white hover:bg-gray-50 transition-colors"
                        onClick={() => toggleExercise(index)}
                      >
                        <div className="mr-4 bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {exerciseItem.exercises?.name || 'Unknown Exercise'}
                            </h3>
                            
                            <div className="flex items-center mt-1 sm:mt-0">
                              <span className="text-sm font-medium text-gray-700 mr-2">
                                {formatExerciseTarget(exerciseItem)}
                              </span>
                              
                              {expandedExercise === index ? (
                                <ChevronUp size={18} className="text-gray-400" />
                              ) : (
                                <ChevronDown size={18} className="text-gray-400" />
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mt-1">
                            {exerciseItem.exercises?.muscle_group || 'No muscle group specified'}
                          </p>
                        </div>
                      </div>
                      
                      {/* Expanded details */}
                      {expandedExercise === index && (
                        <div className="p-4 bg-gray-50 border-t animate-fadeDown">
                          <div className="sm:flex">
                            {/* Exercise image */}
                            <div className="mb-4 sm:mb-0 sm:mr-4 sm:w-48 h-32 sm:h-auto bg-gray-200 rounded-lg overflow-hidden">
                              {exerciseItem.exercises?.demo_image_url ? (
                                <img 
                                  src={exerciseItem.exercises.demo_image_url} 
                                  alt={exerciseItem.exercises.name} 
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <Dumbbell size={32} />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                <div className="bg-white p-3 rounded-lg shadow-sm">
                                  <p className="text-xs text-gray-500 mb-1">Sets</p>
                                  <p className="font-medium">{exerciseItem.sets || 1}</p>
                                </div>
                                
                                {exerciseItem.reps ? (
                                  <div className="bg-white p-3 rounded-lg shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Reps</p>
                                    <p className="font-medium">{exerciseItem.reps}</p>
                                  </div>
                                ) : exerciseItem.time_seconds ? (
                                  <div className="bg-white p-3 rounded-lg shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                                    <p className="font-medium">{exerciseItem.time_seconds} sec</p>
                                  </div>
                                ) : null}
                                
                                {exerciseItem.rest_seconds && (
                                  <div className="bg-white p-3 rounded-lg shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">Rest</p>
                                    <p className="font-medium">{exerciseItem.rest_seconds} sec</p>
                                  </div>
                                )}
                              </div>
                              
                              {/* Exercise details if available */}
                              {exerciseItem.exercises?.exercise_details?.instructions && (
                                <div className="mt-3">
                                  <h4 className="text-sm font-medium text-gray-700 mb-1">Instructions:</h4>
                                  <p className="text-sm text-gray-600">
                                    {exerciseItem.exercises.exercise_details.instructions.length > 150 
                                      ? `${exerciseItem.exercises.exercise_details.instructions.substring(0, 150)}...` 
                                      : exerciseItem.exercises.exercise_details.instructions}
                                  </p>
                                </div>
                              )}
                              
                              {/* View exercise link */}
                              <div className="mt-3">
                                <Link
                                  to={`/exercise/${exerciseItem.exercises?.id}`}
                                  className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                  View Exercise Details
                                  <ChevronRight size={16} className="ml-1" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <Dumbbell size={40} className="mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 mb-2">This template doesn't have any exercises yet.</p>
                  {isOwner && (
                    <button
                      onClick={() => navigate(`/templates/${templateId}/edit`)}
                      className="px-4 py-2 mt-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors font-medium"
                    >
                      Add exercises
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'details' && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Clock size={20} className="mr-2 text-blue-600" />
                Workout Details
              </h2>
              
              <div className="space-y-6">
                {/* Creator info */}
                <div className="flex items-center bg-gray-50 p-4 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <User size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Created by: {template.profiles?.name || 'Unknown user'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Created on: {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {/* Workout Focus */}
                {muscleGroups.size > 0 && (
                  <div className="bg-white border rounded-lg p-4">
                    <h3 className="text-md font-medium mb-3">Muscle Groups Targeted:</h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(muscleGroups).map(group => (
                        <span 
                          key={group} 
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm inline-flex items-center"
                        >
                          <Dumbbell size={12} className="mr-1" />
                          {group}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Additional Details */}
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-md font-medium mb-3">Additional Information:</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Difficulty Level:</span>
                      <span className="font-medium">{template.difficulty || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estimated Duration:</span>
                      <span className="font-medium">{formatDuration(template.estimated_duration_minutes)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estimated Calories:</span>
                      <span className="font-medium">{Math.round(estimatedCalories)} calories</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Visibility:</span>
                      <span className="font-medium capitalize">{template.is_public ? 'Public' : 'Private'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Actions Footer */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-8 flex flex-wrap justify-between items-center">
        {/* Left side actions */}
        <div className="flex space-x-4">
          <button 
            onClick={() => setIsSaved(!isSaved)} 
            className={`flex items-center text-sm font-medium px-3 py-2 rounded-md ${
              isSaved 
                ? 'text-blue-600 bg-blue-50' 
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            {isSaved ? (
              <>
                <BookmarkCheck size={18} className="mr-1.5" />
                Saved
              </>
            ) : (
              <>
                <Bookmark size={18} className="mr-1.5" />
                Save
              </>
            )}
          </button>
          
          <button 
            className="flex items-center text-sm font-medium text-gray-600 px-3 py-2 rounded-md hover:bg-gray-50"
          >
            <CalendarCheck size={18} className="mr-1.5" />
            Schedule
          </button>
        </div>

        {/* Right side actions */}
        <div className="flex space-x-3 mt-3 sm:mt-0">
          {isOwner && (
            <button
              onClick={() => navigate(`/templates/${templateId}/edit`)}
              className="flex items-center text-sm font-medium text-white bg-blue-600 px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Edit size={16} className="mr-1.5" />
              Edit Template
            </button>
          )}
          
          <button
            onClick={handleStartWorkout}
            disabled={isStartingWorkout}
            className="flex items-center text-sm font-medium text-white bg-green-600 px-4 py-2 rounded-md hover:bg-green-700 transition-colors shadow-sm disabled:opacity-70"
          >
            <Play size={16} className="mr-1.5" />
            {isStartingWorkout ? 'Starting...' : 'Start Workout'}
          </button>
          
          <button 
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
      
      {/* Similar Templates Section */}
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Dumbbell size={20} className="mr-2 text-blue-600" />
          Similar Workouts
        </h2>
        
        {/* This would show similar templates based on muscle groups or difficulty */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Just placeholders - in a real app, you'd fetch similar templates */}
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all border border-gray-100">
              <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600 relative"></div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900">Similar Workout {i}</h3>
                <p className="text-sm text-gray-500 mb-3">A {template.difficulty} workout focusing on {Array.from(muscleGroups)[0]}</p>
                
                <div className="flex justify-between items-center">
                  <div className="flex space-x-1">
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">{5+i} exercises</span>
                    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-gray-600">{20+i*5} min</span>
                  </div>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Add this CSS animation to your global styles
const fadeDownAnimation = `
@keyframes fadeDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeDown {
  animation: fadeDown ${animations.duration.normal} ${animations.easing.easeOut} forwards;
}
`;

export default TemplateDetailPage;m