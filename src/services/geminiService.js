// src/services/geminiService.js

// Configuration for Google Gemini API
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
const API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with actual API key in production

/**
 * Helper to make API requests to Gemini API
 * @param {Object} prompt - The prompt object to send to Gemini
 * @returns {Promise<Object>} - The response from Gemini
 */
const callGeminiAPI = async (prompt) => {
  try {
    // In a real implementation, this would call the actual Gemini API
    // For now, we'll simulate responses based on prompt types
    
    console.log('Prompt to Gemini API:', prompt);
    
    // Check if this is a workout recommendation prompt
    if (prompt.includes('workout plan') || prompt.includes('exercise recommendations')) {
      // Simulate workout recommendation
      return simulateWorkoutRecommendation(prompt);
    } 
    // Check if this is a goal insights prompt
    else if (prompt.includes('progress analysis') || prompt.includes('goal insights')) {
      // Simulate goal insights
      return simulateGoalInsights(prompt);
    } 
    // Default response for other prompts
    else {
      return {
        text: "I've analyzed your request and can provide personalized recommendations. Please specify whether you're looking for workout plans, goal insights, or other fitness advice."
      };
    }
    
    /* Real implementation would look like this:
    const response = await fetch(`${GEMINI_API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to get response from Gemini API');
    }
    
    const data = await response.json();
    return {
      text: data.candidates[0]?.content?.parts[0]?.text || 'No response generated'
    };
    */
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw new Error(`Failed to get AI recommendations: ${error.message}`);
  }
};

/**
 * Simulate workout recommendations for demo purposes
 * @param {String} prompt - The prompt containing user data
 * @returns {Object} - Simulated workout recommendation
 */
const simulateWorkoutRecommendation = (prompt) => {
  // Extract key information from the prompt for personalization
  const isWeightLoss = prompt.includes('weight_loss');
  const isMuscleGain = prompt.includes('muscle_gain');
  const isEndurance = prompt.includes('endurance');
  const isFlexibility = prompt.includes('flexibility');
  const isStrength = prompt.includes('strength');
  
  // Create a tailored workout plan based on goal type
  let workoutPlan = {
    name: '',
    description: '',
    difficulty: 'Beginner',
    exercises: []
  };
  
  if (isWeightLoss) {
    workoutPlan.name = 'Fat-Burning HIIT Plan';
    workoutPlan.description = 'High-intensity interval training focused on maximizing calorie burn and boosting metabolism.';
    workoutPlan.exercises = [
      { id: 5, name: 'Jumping Jacks', sets: 3, reps: 30, type: 'cardio' },
      { id: 8, name: 'Burpees', sets: 3, reps: 15, type: 'cardio' },
      { id: 9, name: 'Mountain Climbers', sets: 3, reps: 20, type: 'cardio' },
      { id: 2, name: 'Squat', sets: 3, reps: 15, type: 'strength' },
      { id: 10, name: 'High Knees', sets: 3, reps: 30, type: 'cardio' },
      { id: 4, name: 'Plank', sets: 3, time: 30, type: 'timed' }
    ];
  } else if (isMuscleGain) {
    workoutPlan.name = 'Hypertrophy Focus Plan';
    workoutPlan.description = 'Progressive overload training designed to build muscle mass with adequate rest periods.';
    workoutPlan.difficulty = 'Intermediate';
    workoutPlan.exercises = [
      { id: 1, name: 'Push Up', sets: 4, reps: 12, type: 'strength' },
      { id: 3, name: 'Bicep Curl', sets: 4, reps: 10, type: 'strength' },
      { id: 12, name: 'Dumbbell Bench Press', sets: 3, reps: 10, type: 'strength' },
      { id: 2, name: 'Squat', sets: 4, reps: 15, type: 'strength' },
      { id: 4, name: 'Deadlift', sets: 3, reps: 8, type: 'strength' },
      { id: 5, name: 'Overhead Press', sets: 3, reps: 10, type: 'strength' }
    ];
  } else if (isEndurance) {
    workoutPlan.name = 'Cardio Endurance Builder';
    workoutPlan.description = 'Sustained effort training to improve cardiovascular health and stamina.';
    workoutPlan.exercises = [
      { id: 5, name: 'Jumping Jacks', sets: 2, reps: 50, type: 'cardio' },
      { id: 10, name: 'High Knees', sets: 2, reps: 40, type: 'cardio' },
      { id: 11, name: 'Butt Kicks', sets: 2, reps: 40, type: 'cardio' },
      { id: 9, name: 'Mountain Climbers', sets: 3, reps: 30, type: 'cardio' },
      { id: 8, name: 'Burpees', sets: 3, reps: 15, type: 'cardio' },
      { id: 1, name: 'Push Up', sets: 2, reps: 15, type: 'strength' }
    ];
  } else if (isFlexibility) {
    workoutPlan.name = 'Dynamic Flexibility Routine';
    workoutPlan.description = 'A balanced mix of static and dynamic stretches to improve range of motion.';
    workoutPlan.exercises = [
      { id: 22, name: 'Cat-Cow Stretch', sets: 2, reps: 10, type: 'flexibility' },
      { id: 23, name: 'Childs Pose', sets: 3, time: 30, type: 'timed' },
      { id: 24, name: 'Cobra Stretch', sets: 3, time: 30, type: 'timed' },
      { id: 25, name: 'Hamstring Stretch (Standing)', sets: 3, time: 30, type: 'timed' },
      { id: 1, name: 'Cat-Cow Stretch', sets: 2, reps: 10, type: 'flexibility' },
      { id: 4, name: 'Plank', sets: 2, time: 30, type: 'timed' }
    ];
  } else if (isStrength) {
    workoutPlan.name = 'Compound Strength Builder';
    workoutPlan.description = 'Focus on multi-joint exercises to maximize overall strength gains.';
    workoutPlan.difficulty = 'Intermediate';
    workoutPlan.exercises = [
      { id: 2, name: 'Deadlift', sets: 4, reps: 8, type: 'strength' },
      { id: 2, name: 'Squat', sets: 4, reps: 10, type: 'strength' },
      { id: 3, name: 'Overhead Press', sets: 3, reps: 8, type: 'strength' },
      { id: 4, name: 'Bent-Over Row', sets: 3, reps: 10, type: 'strength' },
      { id: 1, name: 'Push Up', sets: 3, reps: 15, type: 'strength' },
      { id: 4, name: 'Plank', sets: 3, time: 45, type: 'timed' }
    ];
  } else {
    // Default general fitness plan
    workoutPlan.name = 'Balanced Fitness Routine';
    workoutPlan.description = 'A well-rounded workout targeting multiple aspects of fitness including strength, mobility, and cardio.';
    workoutPlan.exercises = [
      { id: 1, name: 'Push Up', sets: 3, reps: 12, type: 'strength' },
      { id: 2, name: 'Squat', sets: 3, reps: 15, type: 'strength' },
      { id: 4, name: 'Plank', sets: 3, time: 30, type: 'timed' },
      { id: 5, name: 'Jumping Jacks', sets: 2, reps: 30, type: 'cardio' },
      { id: 6, name: 'Lunges', sets: 3, reps: 10, type: 'strength' },
      { id: 17, name: 'Bird Dog', sets: 2, reps: 10, type: 'strength' }
    ];
  }
  
  return workoutPlan;
};

/**
 * Simulate goal insights for demo purposes
 * @param {String} prompt - The prompt containing goal and progress data
 * @returns {Object} - Simulated goal insights
 */
const simulateGoalInsights = (prompt) => {
  // Extract probable scenario from the prompt
  const isWeightLoss = prompt.includes('weight_loss');
  const isMuscleGain = prompt.includes('muscle_gain');
  const isEndurance = prompt.includes('endurance');
  const isLowProgress = prompt.includes('behind schedule') || prompt.includes('struggling');
  const isGoodProgress = prompt.includes('on track') || prompt.includes('good progress');
  
  let insights = {
    analysis: '',
    recommendations: []
  };
  
  if (isWeightLoss) {
    if (isLowProgress) {
      insights.analysis = "Based on your current progress, you're slightly behind your weight loss goal schedule. This is perfectly normal, as weight loss often happens in a non-linear pattern.";
      insights.recommendations = [
        "Consider increasing your daily protein intake to help maintain muscle mass while losing fat.",
        "Try adding 1-2 more HIIT sessions per week to boost your metabolism.",
        "Focus on managing stress levels, as cortisol can affect weight loss progress.",
        "Ensure you're getting adequate sleep (7-9 hours) to support recovery and hormonal balance."
      ];
    } else if (isGoodProgress) {
      insights.analysis = "You're making excellent progress toward your weight loss goal! Your consistency is paying off, and you're right on track to reach your target by the projected date.";
      insights.recommendations = [
        "Continue with your current workout routine, but consider gradually increasing intensity.",
        "Begin incorporating more resistance training to preserve muscle mass as you lose weight.",
        "Start tracking your measurements in addition to weight to see changes in body composition.",
        "Ensure you're maintaining adequate nutrition to support your activity level."
      ];
    } else {
      insights.analysis = "I've analyzed your weight loss progress data and noticed some interesting patterns. Your rate of progress has been variable, which is completely normal for weight loss journeys.";
      insights.recommendations = [
        "Consider adjusting your caloric deficit slightly if progress has stalled for more than 2 weeks.",
        "Add variety to your cardio workouts to prevent adaptation and plateaus.",
        "Focus on progressive overload in your strength training sessions.",
        "Monitor your water intake and aim for 2-3 liters daily to support metabolism."
      ];
    }
  } else if (isMuscleGain) {
    insights.analysis = "Your muscle gain progress shows a steady improvement. Muscle building is a gradual process that requires consistent training stimulus and sufficient recovery.";
    insights.recommendations = [
      "Ensure you're in a modest caloric surplus of 200-300 calories per day.",
      "Prioritize protein intake of at least 1.6-2.2g per kg of bodyweight.",
      "Focus on progressive overload by increasing weight or reps in each workout.",
      "Consider adding an extra recovery day if you're feeling excessive fatigue."
    ];
  } else if (isEndurance) {
    insights.analysis = "Your endurance metrics are showing improvement, with your recent workouts demonstrating increased stamina and reduced recovery time between intervals.";
    insights.recommendations = [
      "Incorporate one longer, steady-state cardio session weekly to build aerobic base.",
      "Add interval training with work-to-rest ratios of 1:2 for optimal improvement.",
      "Focus on proper breathing techniques during high-intensity periods.",
      "Consider tracking your heart rate recovery to measure cardiovascular improvement."
    ];
  } else {
    insights.analysis = "Looking at your overall fitness data, I can see you've been consistent with your workouts and making steady progress toward your goals. Your workout frequency aligns well with your target.";
    insights.recommendations = [
      "Try adding variety to your routine to challenge different muscle groups and energy systems.",
      "Consider periodizing your training with specific focus phases lasting 4-6 weeks.",
      "Ensure you're tracking both performance metrics and subjective feelings of energy/recovery.",
      "Schedule a dedicated recovery week every 4-6 weeks to prevent overtraining."
    ];
  }
  
  return insights;
};

/**
 * Generate personalized workout recommendations based on user goals and data
 * @param {Object} userData - User profile, goals, and physical data
 * @returns {Promise<Object>} - Workout recommendations
 */
export const getRecommendedWorkout = async (userData) => {
  try {
    // Prepare prompt for Gemini API
    const prompt = `
      Generate a personalized workout plan for a user with the following profile:
      
      Goal Type: ${userData.goalType}
      Metric Type: ${userData.metricType}
      Current Value: ${userData.currentValue}
      Target Value: ${userData.targetValue}
      Workout Frequency: ${userData.frequency} days per week
      
      Physical Stats:
      ${userData.stats?.weight_kg ? `Weight: ${userData.stats.weight_kg} kg` : ''}
      ${userData.stats?.height_cm ? `Height: ${userData.stats.height_cm} cm` : ''}
      ${userData.stats?.bmi ? `BMI: ${userData.stats.bmi}` : ''}
      ${userData.stats?.age ? `Age: ${userData.stats.age}` : ''}
      ${userData.stats?.gender ? `Gender: ${userData.stats.gender}` : ''}
      
      Available Equipment: ${userData.equipment.join(', ') || 'Bodyweight only'}
      
      Available Time Slots:
      ${userData.timeSlots.map(slot => `${slot.day} at ${slot.time}`).join(', ') || 'Flexible schedule'}
      
      Provide a structured workout plan with specific exercises, sets, and reps tailored to their goal and fitness level.
      
      Focus on exercise recommendations that will help them achieve their specific goal of ${userData.goalType} most effectively.
    `;
    
    // Call Gemini API
    // const response = await callGeminiAPI(prompt);
    
    // For demo, use the simulated response directly
    const workoutPlan = simulateWorkoutRecommendation(prompt);
    
    return workoutPlan;
  } catch (error) {
    console.error('Error generating workout recommendation:', error);
    throw error;
  }
};

/**
 * Generate insights and recommendations based on goal progress data
 * @param {Object} goalData - Goal details and progress data
 * @returns {Promise<Object>} - AI-generated insights and recommendations
 */
export const getGoalInsights = async (goalData) => {
  try {
    // Prepare prompt for Gemini API
    const prompt = `
      Analyze the following fitness goal progress data and provide insights and recommendations:
      
      Goal Type: ${goalData.goal.goal_type}
      Metric Type: ${goalData.goal.metric_type}
      Starting Value: ${goalData.goal.current_value}
      Target Value: ${goalData.goal.target_value}
      Current Progress: ${goalData.currentProgress.toFixed(1)}%
      Days Remaining: ${goalData.daysRemaining}
      
      Progress Data Points:
      ${goalData.progressData.map(point => `- ${point.date}: ${point.value}`).join('\n')}
      
      Recent Workouts:
      ${goalData.workouts.slice(0, 3).map(w => 
        `- ${new Date(w.date).toLocaleDateString()}: ${w.workout_exercises?.length || 0} exercises, ${w.duration_seconds ? Math.floor(w.duration_seconds / 60) + ' minutes' : 'unknown duration'}`
      ).join('\n')}
      
      Provide an analysis of their progress toward the goal, including whether they are on track, behind schedule, or ahead of schedule.
      Include specific recommendations to help them optimize their approach.
    `;
    
    // Call Gemini API
    //const response = await callGeminiAPI(prompt);
    
    // For demo, use the simulated response directly
    const insights = simulateGoalInsights(prompt);
    
    return insights;
  } catch (error) {
    console.error('Error generating goal insights:', error);
    throw error;
  }
};