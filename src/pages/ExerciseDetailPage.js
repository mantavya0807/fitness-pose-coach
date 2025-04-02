// src/pages/ExerciseDetailPage.js
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, ArrowLeft, Play, Award, Dumbbell, 
  AlertTriangle, Info, CheckCircle, X, ChevronRight 
} from 'lucide-react';

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
      .single();

    if (error) {
      console.error("Error fetching exercise details:", error);
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
      .neq('id', exerciseId)
      .limit(3);
      
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
    return !!data;
  } catch (error) {
    console.error("Error checking favorite status:", error);
    return false;
  }
};

const ExerciseDetailPage = () => {
  const { exerciseId } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('instructions');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showFavoriteAnimation, setShowFavoriteAnimation] = useState(false);
  
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
      // Show animation when adding to favorites
      if (!isFavorite) {
        setShowFavoriteAnimation(true);
        setTimeout(() => setShowFavoriteAnimation(false), 1500);
      }
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
  
  // Get difficulty color
  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-600';
      case 'intermediate': return 'bg-yellow-500';
      case 'advanced': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };
  
  // Get difficulty text color
  const getDifficultyTextColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'beginner': return 'text-green-600';
      case 'intermediate': return 'text-yellow-600';
      case 'advanced': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  // Loading states
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10">
        <div className="w-16 h-16 border-t-4 border-blue-600 border-solid rounded-full animate-spin mb-4"></div>
        <p className="text-xl font-medium text-gray-600">Loading exercise details...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10">
        <div className="max-w-3xl mx-auto bg-red-50 p-6 rounded-lg border border-red-200">
          <h2 className="text-2xl font-bold text-red-700 mb-2 flex items-center">
            <X className="mr-2 h-6 w-6" /> Error
          </h2>
          <p className="text-red-600 mb-6">{error.message}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }
  
  // Not found state
  if (!exercise) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-10">
        <div className="max-w-3xl mx-auto bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h2 className="text-2xl font-bold text-yellow-700 mb-2 flex items-center">
            <Info className="mr-2 h-6 w-6" /> Exercise Not Found
          </h2>
          <p className="text-yellow-600 mb-6">The exercise you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/explore')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Exercises
          </button>
        </div>
      </div>
    );
  }

  // Safely access nested details
  const details = exercise.exercise_details || {};
  
  // Calculate equipment warning
  const equipmentWarning = !hasRequiredEquipment();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hearts animation for favorite */}
      <AnimatePresence>
        {showFavoriteAnimation && (
          <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1 }}
              className="text-red-500"
            >
              <Heart className="h-24 w-24 fill-current" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-6 px-4 py-2 text-gray-600 hover:text-gray-900 inline-flex items-center transition group"
        >
          <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back</span>
        </button>
        
        {/* Hero Section */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 shadow-xl mb-8">
          <div className="absolute inset-0 bg-black/20 z-10"></div>
          
          {exercise.demo_image_url ? (
            <div className="h-[400px] w-full">
              <img 
                src={exercise.demo_image_url} 
                alt={`${exercise.name} demonstration`} 
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-[400px] w-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
              <Dumbbell className="h-24 w-24 text-white/70" />
            </div>
          )}
          
          <div className="absolute inset-0 flex flex-col justify-end z-20 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium">
                {exercise.type || 'Exercise'}
              </span>
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium">
                {exercise.muscle_group || 'Various Muscles'}
              </span>
              <span className={`px-3 py-1 rounded-full text-white text-sm font-medium 
                ${exercise.difficulty === 'Beginner' ? 'bg-green-500/70' : 
                  exercise.difficulty === 'Intermediate' ? 'bg-yellow-500/70' : 
                  exercise.difficulty === 'Advanced' ? 'bg-red-500/70' : 
                  'bg-gray-500/70'} backdrop-blur-sm`}
              >
                {exercise.difficulty || 'Any Level'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{exercise.name}</h1>
              
              <button 
                onClick={handleToggleFavorite}
                disabled={!user || toggleFavoriteMutation.isPending}
                className={`p-3 rounded-full ${
                  isFavorite ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                } transition-all transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100`}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`h-6 w-6 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Equipment Warning */}
        {equipmentWarning && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3"
          >
            <AlertTriangle className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-700">Equipment Required</h3>
              <p className="text-yellow-600">
                This exercise requires <strong>{exercise.equipment}</strong> which is not in your available equipment. 
                <Link to="/settings" className="ml-1 underline text-blue-600 hover:text-blue-800">
                  Update your equipment
                </Link>
              </p>
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Quick Stats */}
          <div className="lg:col-span-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4 text-gray-800">Quick Stats</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-full mr-4">
                      <Award className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Difficulty</p>
                      <p className={`font-semibold ${getDifficultyTextColor(exercise.difficulty)}`}>
                        {exercise.difficulty || 'Not specified'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-purple-100 rounded-full mr-4">
                      <Dumbbell className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Equipment</p>
                      <p className="font-semibold">{exercise.equipment || 'Bodyweight'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-green-100 rounded-full mr-4">
                      <div className="h-6 w-6 flex items-center justify-center text-green-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Muscle Focus</p>
                      <p className="font-semibold line-clamp-1">{exercise.muscle_group || 'Various'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-red-100 rounded-full mr-4">
                      <div className="h-6 w-6 flex items-center justify-center text-red-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Calories/Rep</p>
                      <p className="font-semibold">{details.calories_per_rep || '~5'} cal</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Start button */}
              <Link
                to={`/workout/${exercise.id}/live`}
                className="flex items-center justify-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 hover:from-blue-700 hover:to-indigo-700 transition group"
              >
                <Play className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                <span className="font-bold">Start Exercise</span>
              </Link>
            </motion.div>
            
            {/* Related Exercises */}
            {relatedExercises.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-md overflow-hidden"
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-4 text-gray-800">Related Exercises</h2>
                  
                  <div className="space-y-3">
                    {relatedExercises.map(relExercise => (
                      <Link 
                        key={relExercise.id} 
                        to={`/exercise/${relExercise.id}`}
                        className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                      >
                        <div className="h-16 w-16 rounded-md overflow-hidden bg-gray-200 mr-3 flex-shrink-0">
                          {relExercise.demo_image_url ? (
                            <img src={relExercise.demo_image_url} alt={relExercise.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                              <Dumbbell className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{relExercise.name}</p>
                          <div className="mt-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                              relExercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                              relExercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                              relExercise.difficulty === 'Advanced' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {relExercise.difficulty}
                            </span>
                          </div>
                        </div>
                        
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Column - Details Tabs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2 bg-white rounded-xl shadow-md overflow-hidden"
          >
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex overflow-x-auto hide-scrollbar">
                <button
                  onClick={() => setActiveTab('instructions')}
                  className={`px-6 py-4 text-md font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'instructions' 
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Instructions
                </button>
                <button
                  onClick={() => setActiveTab('benefits')}
                  className={`px-6 py-4 text-md font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'benefits' 
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Benefits
                </button>
                <button
                  onClick={() => setActiveTab('mistakes')}
                  className={`px-6 py-4 text-md font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'mistakes' 
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Common Mistakes
                </button>
                <button
                  onClick={() => setActiveTab('variations')}
                  className={`px-6 py-4 text-md font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'variations' 
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Variations
                </button>
              </div>
            </div>
            
            {/* Tab Content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'instructions' && (
                    <div>
                      <div className="flex items-center mb-4">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${getDifficultyColor(exercise.difficulty)} text-white mr-3`}>
                          <CheckCircle className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">How to perform {exercise.name}</h2>
                      </div>
                      
                      {details.instructions ? (
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{formatText(details.instructions)}</p>
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-lg text-center">
                          <p className="text-gray-500 italic">Instructions are not available for this exercise.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'benefits' && (
                    <div>
                      <div className="flex items-center mb-4">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-green-600 text-white mr-3">
                          <Award className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Benefits</h2>
                      </div>
                      
                      {details.benefits ? (
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{formatText(details.benefits)}</p>
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-lg text-center">
                          <p className="text-gray-500 italic">Benefits information is not available for this exercise.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'mistakes' && (
                    <div>
                      <div className="flex items-center mb-4">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-red-600 text-white mr-3">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Common Mistakes to Avoid</h2>
                      </div>
                      
                      {details.common_mistakes ? (
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{formatText(details.common_mistakes)}</p>
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-lg text-center">
                          <p className="text-gray-500 italic">Common mistakes information is not available for this exercise.</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {activeTab === 'variations' && (
                    <div>
                      <div className="flex items-center mb-4">
                        <div className="h-8 w-8 rounded-full flex items-center justify-center bg-purple-600 text-white mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Variations & Modifications</h2>
                      </div>
                      {details.variations ? (
                        <p className="text-gray-700 whitespace-pre-line leading-relaxed">{formatText(details.variations)}</p>
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-lg text-center">
                          <p className="text-gray-500 italic">Variations information is not available for this exercise.</p>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ExerciseDetailPage;
