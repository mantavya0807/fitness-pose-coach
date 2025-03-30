// src/pages/TemplateCreatePage.js
// Fixed implementation without placeholders

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';

// Fetch all exercises for selection
const fetchExercises = async () => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('id, name, muscle_group, equipment, difficulty, type, demo_image_url')
      .order('name');
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching exercises:", error);
    throw error;
  }
};

// Fetch template for editing (if templateId is provided)
const fetchTemplateForEdit = async (templateId, userId) => {
  if (!templateId || !userId) return null;
  
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
            demo_image_url
          )
        )
      `)
      .eq('id', templateId)
      .single();
      
    if (error) throw error;
    
    // Check if user has permission to edit this template
    if (data.created_by !== userId) {
      throw new Error("You don't have permission to edit this template");
    }
    
    // Sort exercises by sort_order
    if (data.workout_template_exercises) {
      data.workout_template_exercises.sort((a, b) => a.sort_order - b.sort_order);
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching template for edit:", error);
    throw error;
  }
};

// Save template mutation - FIXED implementation
const saveTemplateMutation = async ({ template, userId, isEdit }) => {
  if (!template || !userId) throw new Error("Template and user ID are required");
  
  try {
    let templateId;
    
    // If editing, update the template
    if (isEdit) {
      const { id, workout_template_exercises, ...templateData } = template;
      templateId = id;
      
      // Update template
      const { error: updateError } = await supabase
        .from('workout_templates')
        .update(templateData)
        .eq('id', id);
        
      if (updateError) throw updateError;
      
      // Delete existing exercises
      const { error: deleteError } = await supabase
        .from('workout_template_exercises')
        .delete()
        .eq('template_id', id);
        
      if (deleteError) throw deleteError;
    } 
    // If creating, insert new template
    else {
      const { data: newTemplate, error: createError } = await supabase
        .from('workout_templates')
        .insert({
          ...template,
          created_by: userId
        })
        .select('id')
        .single();
        
      if (createError) throw createError;
      templateId = newTemplate.id;
    }
    
    // Insert exercises
    if (template.exercises && template.exercises.length > 0) {
      const exercises = template.exercises.map((exercise, index) => ({
        template_id: templateId,
        exercise_id: exercise.id,
        sets: exercise.sets || null,
        reps: exercise.reps || null,
        time_seconds: exercise.time_seconds || null,
        rest_seconds: exercise.rest_seconds || null,
        // Remove notes field that doesn't exist in the schema
        sort_order: index
      }));
      
      const { error: exercisesError } = await supabase
        .from('workout_template_exercises')
        .insert(exercises);
        
      if (exercisesError) throw exercisesError;
    }
    
    return templateId;
  } catch (error) {
    console.error("Error saving template:", error);
    throw error;
  }
};

const TemplateCreatePage = () => {
  const { templateId } = useParams(); // For edit mode
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isEditMode = !!templateId;
  
  // State for template form
  const [template, setTemplate] = useState({
    name: '',
    description: '',
    difficulty: 'Beginner',
    estimated_duration_minutes: 30,
    is_public: false,
    exercises: []
  });
  
  // State for exercise selection
  const [showExerciseSelector, setShowExerciseSelector] = useState(false);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState(null); // For editing an exercise
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  
  // Fetch all exercises
  const { 
    data: allExercises = [],
    isLoading: isLoadingExercises,
    error: exercisesError 
  } = useQuery({
    queryKey: ['allExercises'],
    queryFn: fetchExercises,
  });
  
  // Fetch template for editing
  const { 
    data: templateData,
    isLoading: isLoadingTemplate,
    error: templateError 
  } = useQuery({
    queryKey: ['editTemplate', templateId],
    queryFn: () => fetchTemplateForEdit(templateId, user?.id),
    enabled: isEditMode && !!user?.id,
    onSuccess: (data) => {
      if (data) {
        setTemplate({
          id: data.id,
          name: data.name,
          description: data.description || '',
          difficulty: data.difficulty,
          estimated_duration_minutes: data.estimated_duration_minutes || 30,
          is_public: data.is_public,
          exercises: data.workout_template_exercises.map(ex => ({
            id: ex.exercise_id,
            sets: ex.sets,
            reps: ex.reps,
            time_seconds: ex.time_seconds,
            rest_seconds: ex.rest_seconds,
            name: ex.exercises?.name,
            muscle_group: ex.exercises?.muscle_group,
            equipment: ex.exercises?.equipment,
            difficulty: ex.exercises?.difficulty,
            type: ex.exercises?.type,
            demo_image_url: ex.exercises?.demo_image_url
          }))
        });
      }
    }
  });
  
  // Save template mutation
  const saveTemplateMut = useMutation({
    mutationFn: saveTemplateMutation,
    onSuccess: (templateId) => {
      navigate(`/templates/${templateId}`);
    },
    onError: (error) => {
      console.error("Error saving template:", error);
      alert(`Failed to save template: ${error.message}`);
    }
  });
  
  // Filter exercises for the selector
  const filteredExercises = allExercises.filter(exercise => {
    // Filter by search term
    const matchesSearch = exercise.name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    
    // Filter by muscle group
    if (selectedMuscleGroup && exercise.muscle_group) {
      const muscleGroups = exercise.muscle_group.split(',').map(group => group.trim());
      if (!muscleGroups.includes(selectedMuscleGroup)) return false;
    }
    
    // Filter by equipment
    if (selectedEquipment && exercise.equipment !== selectedEquipment) return false;
    
    return true;
  });
  
  // Extract unique filter options
  const muscleGroups = new Set();
  const equipmentTypes = new Set();
  
  allExercises.forEach(ex => {
    if (ex.muscle_group) {
      ex.muscle_group.split(',').forEach(group => {
        muscleGroups.add(group.trim());
      });
    }
    if (ex.equipment) equipmentTypes.add(ex.equipment);
  });
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTemplate(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // Handle adding an exercise
  const handleAddExercise = (exercise) => {
    const newExercise = {
      id: exercise.id,
      sets: 3, // Default values
      reps: 10, // Default values
      time_seconds: null,
      rest_seconds: 60, // Default values
      name: exercise.name,
      muscle_group: exercise.muscle_group,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
      type: exercise.type,
      demo_image_url: exercise.demo_image_url
    };
    
    // Special handling for plank (time-based exercise)
    if (exercise.name.toLowerCase().includes('plank')) {
      newExercise.time_seconds = 30; // Default 30 seconds
      newExercise.reps = null; // No reps for plank
    }
    
    if (selectedExerciseIndex !== null) {
      // Replace exercise
      setTemplate(prev => {
        const updatedExercises = [...prev.exercises];
        updatedExercises[selectedExerciseIndex] = newExercise;
        return { ...prev, exercises: updatedExercises };
      });
      setSelectedExerciseIndex(null);
    } else {
      // Add new exercise
      setTemplate(prev => ({
        ...prev,
        exercises: [...prev.exercises, newExercise]
      }));
    }
    
    // Close selector
    setShowExerciseSelector(false);
    
    // Reset filters
    setSearchTerm('');
    setSelectedMuscleGroup('');
    setSelectedEquipment('');
  };
  
  // Handle removing an exercise
  const handleRemoveExercise = (index) => {
    setTemplate(prev => ({
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index)
    }));
  };
  
  // Handle editing an exercise
  const handleEditExercise = (exercise, index) => {
    setSelectedExerciseIndex(index);
    setShowExerciseSelector(true);
  };
  
  // Handle exercise update (sets, reps, etc.)
  const handleExerciseUpdate = (index, field, value) => {
    setTemplate(prev => {
      const updatedExercises = [...prev.exercises];
      updatedExercises[index] = {
        ...updatedExercises[index],
        [field]: value
      };
      
      // Special handling for plank - if time_seconds is set, clear reps
      if (field === 'time_seconds' && value > 0) {
        updatedExercises[index].reps = null;
      }
      // If reps is set for a time-based exercise, clear time_seconds
      else if (field === 'reps' && value > 0 && updatedExercises[index].time_seconds) {
        updatedExercises[index].time_seconds = null;
      }
      
      return { ...prev, exercises: updatedExercises };
    });
  };
  
  // Handle reordering exercises
  const handleMoveExercise = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === template.exercises.length - 1)
    ) {
      return; // Can't move further
    }
    
    setTemplate(prev => {
      const updatedExercises = [...prev.exercises];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      
      // Swap exercises
      [updatedExercises[index], updatedExercises[targetIndex]] = 
      [updatedExercises[targetIndex], updatedExercises[index]];
      
      return { ...prev, exercises: updatedExercises };
    });
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!template.name) {
      alert('Please provide a template name');
      return;
    }
    
    if (template.exercises.length === 0) {
      alert('Please add at least one exercise to the template');
      return;
    }
    
    // Validate exercise data
    const invalidExercises = template.exercises.filter(ex => {
      const isTimeBased = ex.name.toLowerCase().includes('plank');
      if (isTimeBased) {
        return !ex.time_seconds || ex.time_seconds <= 0;
      } else {
        return !ex.sets || ex.sets <= 0 || !ex.reps || ex.reps <= 0;
      }
    });
    
    if (invalidExercises.length > 0) {
      alert(`Please set valid ${invalidExercises[0].time_seconds !== null ? 'time' : 'sets and reps'} for all exercises`);
      return;
    }
    
    // Save template
    saveTemplateMut.mutate({
      template,
      userId: user.id,
      isEdit: isEditMode
    });
  };
  
  // Loading state
  if (isEditMode && isLoadingTemplate) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Loading template...</p>
      </div>
    );
  }
  
  // Error state
  if (isEditMode && templateError) {
    return (
      <div className="bg-red-50 p-6 rounded-lg shadow text-red-700 border border-red-200">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="mb-4">{templateError.message}</p>
        <button
          onClick={() => navigate('/templates')}
          className="px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200"
        >
          Back to Templates
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h1 className="text-2xl font-bold mb-4">
          {isEditMode ? 'Edit Workout Template' : 'Create Workout Template'}
        </h1>
        
        <form onSubmit={handleSubmit}>
          {/* Basic Template Info */}
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Template Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={template.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Full Body Workout, Upper Body Blast, etc."
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={template.description}
                onChange={handleInputChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Short description of this workout template"
              ></textarea>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={template.difficulty}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="estimated_duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  id="estimated_duration_minutes"
                  name="estimated_duration_minutes"
                  value={template.estimated_duration_minutes}
                  onChange={handleInputChange}
                  min="1"
                  max="240"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-center h-full pt-6">
                <input
                  type="checkbox"
                  id="is_public"
                  name="is_public"
                  checked={template.is_public}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_public" className="ml-2 block text-sm text-gray-700">
                  Make this template public
                </label>
              </div>
            </div>
          </div>
          
          {/* Exercises Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-medium text-gray-700">Exercises</h2>
              <button
                type="button"
                onClick={() => {
                  setSelectedExerciseIndex(null);
                  setShowExerciseSelector(true);
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Exercise
              </button>
            </div>
            
            {/* Exercises List */}
            {template.exercises.length === 0 ? (
              <div className="bg-gray-50 p-6 rounded-lg text-center border border-dashed border-gray-300 mb-4">
                <p className="text-gray-500 mb-2">No exercises added yet</p>
                <button
                  type="button"
                  onClick={() => setShowExerciseSelector(true)}
                  className="text-blue-600 hover:underline"
                >
                  Click to add exercises
                </button>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {template.exercises.map((exercise, index) => (
                  <div key={index} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded-full mr-3">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-medium">{exercise.name}</h3>
                          <p className="text-xs text-gray-500">{exercise.muscle_group}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {/* Move Up Button */}
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        
                        {/* Move Down Button */}
                        <button
                          type="button"
                          onClick={() => handleMoveExercise(index, 'down')}
                          disabled={index === template.exercises.length - 1}
                          className="p-1 text-gray-500 hover:text-blue-600 disabled:opacity-30"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleEditExercise(exercise, index)}
                          className="p-1 text-gray-500 hover:text-green-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Sets */}
                        <div>
                          <label htmlFor={`sets-${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Sets
                          </label>
                          <input
                            type="number"
                            id={`sets-${index}`}
                            name={`sets-${index}`}
                            value={exercise.sets || ''}
                            onChange={(e) => handleExerciseUpdate(index, 'sets', parseInt(e.target.value, 10) || null)}
                            min="1"
                            max="20"
                            className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        
                        {/* Different input based on exercise type */}
                        {exercise.name.toLowerCase().includes('plank') ? (
                          // Time input for planks and other time-based exercises
                          <div>
                            <label htmlFor={`time-${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                              Time (seconds)
                            </label>
                            <input
                              type="number"
                              id={`time-${index}`}
                              name={`time-${index}`}
                              value={exercise.time_seconds || ''}
                              onChange={(e) => handleExerciseUpdate(index, 'time_seconds', parseInt(e.target.value, 10) || null)}
                              min="1"
                              max="600"
                              className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        ) : (
                          // Reps input for standard exercises
                          <div>
                            <label htmlFor={`reps-${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                              Reps
                            </label>
                            <input
                              type="number"
                              id={`reps-${index}`}
                              name={`reps-${index}`}
                              value={exercise.reps || ''}
                              onChange={(e) => handleExerciseUpdate(index, 'reps', parseInt(e.target.value, 10) || null)}
                              min="1"
                              max="100"
                              className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        )}
                        
                        {/* Rest time between sets */}
                        <div>
                          <label htmlFor={`rest-${index}`} className="block text-xs font-medium text-gray-700 mb-1">
                            Rest (seconds)
                          </label>
                          <input
                            type="number"
                            id={`rest-${index}`}
                            name={`rest-${index}`}
                            value={exercise.rest_seconds || ''}
                            onChange={(e) => handleExerciseUpdate(index, 'rest_seconds', parseInt(e.target.value, 10) || null)}
                            min="0"
                            max="300"
                            className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Rest between sets"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Form Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveTemplateMut.isPending}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saveTemplateMut.isPending
                ? (isEditMode ? 'Updating...' : 'Creating...')
                : (isEditMode ? 'Save Changes' : 'Create Template')}
            </button>
          </div>
        </form>
      </div>
      
      {/* Exercise Selector Modal */}
      {showExerciseSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full h-[80vh] flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {selectedExerciseIndex !== null ? 'Change Exercise' : 'Add Exercise'}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowExerciseSelector(false);
                    setSelectedExerciseIndex(null);
                    setSearchTerm('');
                    setSelectedMuscleGroup('');
                    setSelectedEquipment('');
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Filters */}
              <div className="mt-3 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Search exercises..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 pl-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-2 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                <select
                  value={selectedMuscleGroup}
                  onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Muscle Groups</option>
                  {Array.from(muscleGroups).map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                
                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Equipment</option>
                  {Array.from(equipmentTypes).map(equipment => (
                    <option key={equipment} value={equipment}>{equipment}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoadingExercises ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  <p className="mt-2 text-gray-500">Loading exercises...</p>
                </div>
              ) : exercisesError ? (
                <div className="text-center py-8 text-red-500">
                  Error loading exercises: {exercisesError.message}
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No exercises found matching your criteria.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredExercises.map(exercise => (
                    <div
                      key={exercise.id}
                      onClick={() => handleAddExercise(exercise)}
                      className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition"
                    >
                      <div className="h-32 bg-gray-200">
                        {exercise.demo_image_url ? (
                          <img
                            src={exercise.demo_image_url}
                            alt={exercise.name}
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
                      <div className="p-3">
                        <h3 className="font-medium truncate">{exercise.name}</h3>
                        <p className="text-xs text-gray-500 truncate">{exercise.muscle_group}</p>
                        <div className="flex space-x-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            exercise.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                            exercise.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                            exercise.difficulty === 'Advanced' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {exercise.difficulty}
                          </span>
                          {exercise.equipment && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              {exercise.equipment}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateCreatePage;