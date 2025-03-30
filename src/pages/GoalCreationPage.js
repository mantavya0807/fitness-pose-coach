// src/pages/GoalCreationPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import { GoogleCalendarButton } from '../components/goals/GoogleCalendarButton';
import { getRecommendedWorkout } from '../services/geminiService';

const GoalCreationPage = () => {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State for goal form
  const [goalType, setGoalType] = useState('weight_loss');
  const [metricType, setMetricType] = useState('weight');
  const [currentValue, setCurrentValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [frequency, setFrequency] = useState(3); // workouts per week
  const [targetDate, setTargetDate] = useState('');
  const [notes, setNotes] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  // Fetch user's latest physical stats
  const { data: latestStats } = useQuery({
    queryKey: ['latestStats', user?.id],
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

  // Fetch existing active goals
  const { data: existingGoals } = useQuery({
    queryKey: ['activeGoals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_goals')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'active');
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Set default current value based on latest stats when loaded
  useEffect(() => {
    if (latestStats) {
      if (metricType === 'weight' && latestStats.weight_kg) {
        setCurrentValue(latestStats.weight_kg.toString());
      } else if (metricType === 'bmi' && latestStats.bmi) {
        setCurrentValue(latestStats.bmi.toString());
      }
    }
  }, [latestStats, metricType]);

  // Set default target date (30 days from now)
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setTargetDate(date.toISOString().split('T')[0]);
  }, []);

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (goalData) => {
      const { data, error } = await supabase
        .from('user_goals')
        .insert([goalData])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['activeGoals']);
      if (recommendation) {
        // Save the recommended workout as a template
        saveWorkoutTemplate(data.id);
      } else {
        navigate('/goals');
      }
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
      alert(`Failed to create goal: ${error.message}`);
    }
  });

  // Save workout template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      // First create the template
      const { data: template, error: templateError } = await supabase
        .from('workout_templates')
        .insert({
          name: templateData.name,
          description: templateData.description,
          difficulty: templateData.difficulty,
          estimated_duration_minutes: templateData.duration,
          is_public: false,
          created_by: user.id
        })
        .select()
        .single();
        
      if (templateError) throw templateError;
      
      // Now create the exercises for the template
      if (templateData.exercises && templateData.exercises.length > 0) {
        const exerciseItems = templateData.exercises.map((ex, index) => ({
          template_id: template.id,
          exercise_id: ex.id,
          sets: ex.sets || 3,
          reps: ex.type === 'timed' ? null : (ex.reps || 10),
          time_seconds: ex.type === 'timed' ? (ex.time || 30) : null,
          rest_seconds: 60,
          sort_order: index
        }));
        
        const { error: exercisesError } = await supabase
          .from('workout_template_exercises')
          .insert(exerciseItems);
          
        if (exercisesError) throw exercisesError;
      }
      
      // Link the template to the goal
      const { error: linkError } = await supabase
        .from('goal_workout_plans')
        .insert({
          goal_id: templateData.goalId,
          template_id: template.id,
          is_primary: true
        });
        
      if (linkError) throw linkError;
      
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['workoutTemplates']);
      navigate('/goals');
    },
    onError: (error) => {
      console.error('Error saving workout template:', error);
      alert(`Workout plan was created but failed to save template: ${error.message}`);
      navigate('/goals');
    }
  });

  const saveWorkoutTemplate = async (goalId) => {
    if (!recommendation) return;
    
    await saveTemplateMutation.mutate({
      name: `${goalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Plan`,
      description: `Custom plan generated for your ${goalType.replace('_', ' ')} goal`,
      difficulty: recommendation.difficulty || 'Beginner',
      duration: 30, // Default to 30 minutes
      exercises: recommendation.exercises,
      goalId: goalId
    });
  };

  // Generate workout plan with Gemini
  const generateWorkoutPlan = async () => {
    if (!user) return;
    
    setIsGeneratingPlan(true);
    
    try {
      // Prepare user data for Gemini
      const userData = {
        goalType,
        metricType,
        currentValue,
        targetValue,
        frequency,
        timeSlots: selectedTimeSlots,
        stats: latestStats,
        equipment: profile?.available_equipment || [],
        existingGoals: existingGoals || []
      };
      
      // Get recommendation from Gemini
      const plan = await getRecommendedWorkout(userData);
      setRecommendation(plan);
    } catch (error) {
      console.error('Error generating workout plan:', error);
      alert(`Failed to generate workout plan: ${error.message}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!user) {
      alert('You must be logged in to create a goal');
      return;
    }
    
    if (!currentValue || !targetValue || !targetDate) {
      alert('Please fill in all required fields');
      return;
    }
    
    // Basic validation
    const current = parseFloat(currentValue);
    const target = parseFloat(targetValue);
    
    if (isNaN(current) || isNaN(target)) {
      alert('Current and target values must be numbers');
      return;
    }
    
    if (targetDate < new Date().toISOString().split('T')[0]) {
      alert('Target date cannot be in the past');
      return;
    }
    
    // Create goal data object
    const goalData = {
      user_id: user.id,
      goal_type: goalType,
      metric_type: metricType,
      current_value: current,
      target_value: target,
      frequency: frequency,
      start_date: new Date().toISOString().split('T')[0],
      target_date: targetDate,
      time_slots: selectedTimeSlots,
      notes: notes,
      calendar_connected: calendarConnected,
      status: 'active'
    };
    
    // Create the goal
    createGoalMutation.mutate(goalData);
  };

  // Handle calendar time slots selection
  const handleTimeSlotSelect = (slots) => {
    setSelectedTimeSlots(slots);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow p-6">
      <h1 className="text-2xl font-bold mb-6">Create a New Fitness Goal</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Goal Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Goal Type
          </label>
          <select
            value={goalType}
            onChange={(e) => setGoalType(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md"
            required
          >
            <option value="weight_loss">Weight Loss</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="endurance">Improved Endurance</option>
            <option value="flexibility">Better Flexibility</option>
            <option value="strength">Strength Building</option>
            <option value="general">General Fitness</option>
          </select>
        </div>
        
        {/* Metric Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Measurement Metric
          </label>
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md"
            required
          >
            <option value="weight">Weight (kg)</option>
            <option value="bmi">BMI</option>
            <option value="body_fat">Body Fat Percentage</option>
            <option value="waist">Waist Circumference (cm)</option>
            <option value="run_time">5K Run Time (minutes)</option>
            <option value="pushups">Push-ups (max reps)</option>
            <option value="custom">Custom Metric</option>
          </select>
        </div>
        
        {/* Current & Target Values */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Value
            </label>
            <input
              type="number"
              step="0.01"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="block w-full p-2 border border-gray-300 rounded-md"
              required
              placeholder={latestStats?.weight_kg || "Enter current value"}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Value
            </label>
            <input
              type="number"
              step="0.01"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              className="block w-full p-2 border border-gray-300 rounded-md"
              required
              placeholder="Enter target value"
            />
          </div>
        </div>
        
        {/* Target Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Date
          </label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md"
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        
        {/* Workout Frequency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Workout Frequency (per week)
          </label>
          <select
            value={frequency}
            onChange={(e) => setFrequency(parseInt(e.target.value))}
            className="block w-full p-2 border border-gray-300 rounded-md"
            required
          >
            <option value="1">1 day per week</option>
            <option value="2">2 days per week</option>
            <option value="3">3 days per week</option>
            <option value="4">4 days per week</option>
            <option value="5">5 days per week</option>
            <option value="6">6 days per week</option>
            <option value="7">7 days per week</option>
          </select>
        </div>
        
        {/* Google Calendar Integration */}
        <div className="border p-4 rounded-md bg-gray-50">
          <h3 className="font-medium mb-2">Sync with Google Calendar</h3>
          <p className="text-sm text-gray-600 mb-3">
            Connect your Google Calendar to schedule workouts based on your availability
          </p>
          <GoogleCalendarButton 
            onConnected={() => setCalendarConnected(true)}
            onDisconnected={() => setCalendarConnected(false)} 
            onTimeSlotSelect={handleTimeSlotSelect}
          />
          
          {selectedTimeSlots.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium">Selected Time Slots:</p>
              <ul className="text-xs text-gray-600 mt-1 space-y-1">
                {selectedTimeSlots.map((slot, index) => (
                  <li key={index} className="bg-white p-1 rounded border">
                    {slot.day} at {slot.time}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full p-2 border border-gray-300 rounded-md"
            rows="3"
            placeholder="Any additional information or context for your goal"
          ></textarea>
        </div>
        
        {/* Generate Workout Plan with Gemini */}
        <div className="border-t pt-6">
          <button
            type="button"
            onClick={generateWorkoutPlan}
            disabled={isGeneratingPlan || !currentValue || !targetValue}
            className="w-full py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isGeneratingPlan ? 'Generating Plan...' : 'Generate AI Workout Plan'}
          </button>
          
          <p className="text-sm text-gray-500 mt-2 text-center">
            Uses Gemini AI to create a personalized workout plan based on your goal
          </p>
        </div>
        
        {/* Display recommendation if available */}
        {recommendation && (
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-2">Recommended Workout Plan</h3>
            <div className="bg-blue-50 p-4 rounded-md">
              <p className="font-medium">{recommendation.name}</p>
              <p className="text-sm text-gray-700 mb-2">{recommendation.description}</p>
              
              <p className="text-sm font-medium mt-3 mb-1">Recommended Exercises:</p>
              <ul className="text-sm divide-y">
                {recommendation.exercises.map((ex, index) => (
                  <li key={index} className="py-1 flex justify-between">
                    <span>{ex.name}</span>
                    <span className="text-gray-600">
                      {ex.type === 'timed' 
                        ? `${ex.sets || 3} sets × ${ex.time || 30}s`
                        : `${ex.sets || 3} sets × ${ex.reps || 10} reps`}
                    </span>
                  </li>
                ))}
              </ul>
              
              <p className="text-sm mt-3 text-gray-700">
                This workout plan will be saved when you create your goal.
              </p>
            </div>
          </div>
        )}
        
        {/* Submit buttons */}
        <div className="flex justify-between pt-4 border-t">
          <button
            type="button"
            onClick={() => navigate('/goals')}
            className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createGoalMutation.isLoading || saveTemplateMutation.isLoading}
            className="py-2 px-6 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {createGoalMutation.isLoading || saveTemplateMutation.isLoading
              ? 'Saving...'
              : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GoalCreationPage;