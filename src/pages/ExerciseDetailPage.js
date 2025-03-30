// src/pages/ExerciseDetailPage.js
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';

// Fetch single exercise with its details
const fetchExerciseDetails = async (exerciseId) => {
  if (!exerciseId) return null;
  
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select(`
        *,
        exercise_details (*)
      `)
      .eq('id', exerciseId)
      .single(); // Expect only one row

    if (error) {
      console.error("Error fetching exercise details:", error);
      // Handle 'PGRST116' specificially if needed (row not found)
      if (error.code === 'PGRST116') throw new Error('Exercise not found.');
      throw new Error(error.message);
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Fetch related exercises based on muscle group
const fetchRelatedExercises = async (exerciseId, muscleGroup) => {
  if (!muscleGroup) return [];
  
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, difficulty, demo_image_url')
      .eq('muscle_group', muscleGroup)
      .neq('id', exerciseId) // Exclude current exercise
      .limit(3); // Limit to 3 related exercises
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching related exercises:", error);
    return [];
  }
};

// Fetch user's equipment data for equipment check
const fetchUserEquipment = async (userId) => {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('available_equipment')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data?.available_equipment || [];
  } catch (error) {
    console.error("Error fetching user equipment:", error);
    return [];
  }
};

// Save exercise to user favorites
const saveExerciseMutation = async ({ userId, exerciseId, saved }) => {
  if (!userId || !exerciseId) throw new Error("User ID and Exercise ID are required");
  
  if (saved) {
    // Insert into favorites
    const { error } = await supabase
      .from('user_favorite_exercises')
      .insert({ user_id: userId, exercise_id: exerciseId });
      
    if (error) throw error;
  } else {
    // Remove from favorites
    const { error } = await supabase
      .from('user_favorite_exercises')
      .delete()
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId);
      
    if (error) throw error;
  }
  
  return { success: true, saved };
};

// Check if exercise is in user favorites
const checkFavoriteStatus = async (userId, exerciseId) => {
  if (!userId || !exerciseId) return false;
  
  try {
    const { data, error } = await supabase
      .from('user_favorite_exercises')
      .select('id')
      .eq('user_id', userId)
      .eq('exercise_id', exerciseId)
      .maybeSingle();
      
    if (error) throw error;
    return !!data; // Convert to boolean
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
};

const ExerciseDetailPage = () => {
  const { exerciseId } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('instructions');
  const [isFavorite, setIsFavorite] = useState(false);
  
  // Fetch exercise details
  const { 
    data: exercise, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['exerciseDetail', exerciseId],
    queryFn: () => fetchExerciseDetails(exerciseId),
    enabled: !!exerciseId,
  });
  
  // Fetch related exercises based on muscle group
  const { 
    data: relatedExercises = [] 
  } = useQuery({
    queryKey: ['relatedExercises', exerciseId, exercise?.muscle_group],
    queryFn: () => fetchRelatedExercises(exerciseId, exercise?.muscle_group),
    enabled: !!exercise?.muscle_group,
  });
  
  // Fetch user equipment
  const { 
    data: userEquipment = [] 
  } = useQuery({
    queryKey: ['userEquipment', user?.id],
    queryFn: () => fetchUserEquipment(user?.id),
    enabled: !!user?.id,
  });
  
  // Check if exercise is in user favorites
  useQuery({
    queryKey: ['favoriteStatus', user?.id, exerciseId],
    queryFn: () => checkFavoriteStatus(user?.id, exerciseId),
    enabled: !!user?.id && !!exerciseId,
    onSuccess: (data) => setIsFavorite(data),
  });
  
  // Toggle favorite mutation
  const toggleFavoriteMutation = useMutation({
    mutationFn: saveExerciseMutation,
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['favoriteStatus', user?.id, exerciseId] });
      queryClient.invalidateQueries({ queryKey: ['userFavorites', user?.id] });
    }
  });
  
  // Check if user has the required equipment
  const hasRequiredEquipment = () => {
    if (!exercise?.equipment || !userEquipment || userEquipment.length === 0) return true;
    
    // If the exercise requires "Bodyweight" only, always return true
    if (exercise.equipment === 'Bodyweight') return true;
    
    // Check if user has the required equipment
    return userEquipment.includes(exercise.equipment);
  };
  
  // Helper to format text with newlines
  const formatText = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  };
  
  // Toggle favorite status
  const handleToggleFavorite = () => {
    if (!user) return; // User must be logged in
    
    toggleFavoriteMutation.mutate({
      userId: user.id,
      exerciseId: Number(exerciseId),
      saved: !isFavorite
    });
  };
  
  // Loading and error states
  if (isLoading) return <div className="text-center p-10">Loading exercise details...</div>;
  if (error) return <div className="text-center p-10 text-red-500">Error: {error.message}</div>;
  if (!exercise) return <div className="text-center p-10">Exercise data not available.</div>;

  // Safely access nested details
  const details = exercise.exercise_details || {};
  
  // Calculate equipment warning
  const equipmentWarning = !hasRequiredEquipment();

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-lg shadow-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <div className="flex items-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-1">{exercise.name}</h1>
            <button 
              onClick={handleToggleFavorite}
              disabled={!user || toggleFavoriteMutation.isPending}
              className="ml-3 text-gray-400 hover:text-yellow-500 transition-colors"
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill={isFavorite ? "currentColor" : "none"}
                stroke="currentColor"
                className={`w-6 h-6 ${isFavorite ? 'text-yellow-500' : 'text-gray-400'}`}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-gray-500">
            <span className="bg-gray-100 px-2 py-1 rounded">{exercise.type || 'N/A'}</span>
            <span className="bg-gray-100 px-2 py-1 rounded">{exercise.muscle_group || 'N/A'}</span>
            <span className={`px-2 py-1 rounded ${
              exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
              exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
              exercise.difficulty === 'Advanced' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
            }`}>{exercise.difficulty || 'N/A'}</span>
            <span className={`px-2 py-1 rounded ${
              equipmentWarning ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>{exercise.equipment || 'No Equipment'}</span>
          </div>
        </div>
        
        <Link
          to={`/workout/${exercise.id}/live`} // Link to the camera view
          className="mt-4 md:mt-0 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow hover:bg-green-600 transition whitespace-nowrap"
        >
          Start Exercise
        </Link>
      </div>

      {/* Equipment Warning */}
      {equipmentWarning && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>
            This exercise requires <strong>{exercise.equipment}</strong> which is not in your available equipment. 
            <Link to="/settings" className="ml-1 underline text-blue-600">Update your equipment</Link>
          </span>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Image/Demo */}
        <div className="md:col-span-1">
          {exercise.demo_image_url ? (
            <img 
              src={exercise.demo_image_url} 
              alt={`${exercise.name} demonstration`} 
              className="w-full rounded-lg shadow object-contain bg-gray-100" 
            />
          ) : (
            <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          
          {/* Quick Stats */}
          <div className="mt-4 bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Target</p>
                <p className="font-medium">{exercise.muscle_group || 'N/A'}</p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Equipment</p>
                <p className="font-medium">{exercise.equipment || 'None'}</p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Difficulty</p>
                <p className="font-medium">{exercise.difficulty || 'N/A'}</p>
              </div>
              <div className="bg-white p-2 rounded">
                <p className="text-gray-500">Cal/Rep</p>
                <p className="font-medium">{details.calories_per_rep || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="md:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
              <li className="mr-2">
                <button
                  onClick={() => setActiveTab('instructions')}
                  className={`inline-block p-4 rounded-t-lg ${
                    activeTab === 'instructions' 
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Instructions
                </button>
              </li>
              <li className="mr-2">
                <button
                  onClick={() => setActiveTab('benefits')}
                  className={`inline-block p-4 rounded-t-lg ${
                    activeTab === 'benefits' 
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Benefits
                </button>
              </li>
              <li className="mr-2">
                <button
                  onClick={() => setActiveTab('mistakes')}
                  className={`inline-block p-4 rounded-t-lg ${
                    activeTab === 'mistakes' 
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Common Mistakes
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('variations')}
                  className={`inline-block p-4 rounded-t-lg ${
                    activeTab === 'variations' 
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-b-2 border-transparent hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  Variations
                </button>
              </li>
            </ul>
          </div>
          
          {/* Tab Content */}
          <div className="py-2">
            {activeTab === 'instructions' && (
              <div>
                <h2 className="text-xl font-semibold mb-3">How to perform {exercise.name}</h2>
                {details.instructions ? (
                  <p className="text-gray-700 whitespace-pre-line">{formatText(details.instructions)}</p>
                ) : (
                  <p className="text-gray-500 italic">Instructions are not available for this exercise.</p>
                )}
              </div>
            )}
            
            {activeTab === 'benefits' && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Benefits</h2>
                {details.benefits ? (
                  <p className="text-gray-700 whitespace-pre-line">{formatText(details.benefits)}</p>
                ) : (
                  <p className="text-gray-500 italic">Benefits information is not available for this exercise.</p>
                )}
              </div>
            )}
            
            {activeTab === 'mistakes' && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Common Mistakes to Avoid</h2>
                {details.common_mistakes ? (
                  <p className="text-gray-700 whitespace-pre-line">{formatText(details.common_mistakes)}</p>
                ) : (
                  <p className="text-gray-500 italic">Common mistakes information is not available for this exercise.</p>
                )}
              </div>
            )}
            
            {activeTab === 'variations' && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Variations & Modifications</h2>
                {details.variations ? (
                  <p className="text-gray-700 whitespace-pre-line">{formatText(details.variations)}</p>
                ) : (
                  <p className="text-gray-500 italic">Variations information is not available for this exercise.</p>
                )}
              </div>
            )}
          </div>
          
          {/* Placeholder for missing information */}
          {(!details.instructions || !details.benefits || !details.common_mistakes || !details.variations) && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              Some detailed information for this exercise is currently unavailable.
            </div>
          )}
          
          {/* Related Exercises */}
          {relatedExercises.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-lg font-semibold mb-3">Related Exercises</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {relatedExercises.map(relExercise => (
                  <Link 
                    key={relExercise.id} 
                    to={`/exercise/${relExercise.id}`}
                    className="flex items-center p-2 border rounded-lg hover:bg-gray-50 transition"
                  >
                    <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden mr-2">
                      {relExercise.demo_image_url ? (
                        <img src={relExercise.demo_image_url} alt={relExercise.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{relExercise.name}</p>
                      <p className="text-xs text-gray-500">{relExercise.difficulty}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseDetailPage;