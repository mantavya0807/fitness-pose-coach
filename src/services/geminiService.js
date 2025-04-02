// src/services/geminiService.js

// Updated Gemini Service for food detection and fitness recommendations.
// This module calls the Gemini API with a prompt and returns generated text.
// Then, detectFoodFromCaption() uses Gemini to analyze an image caption and return food items.

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const GEMINI_API_KEY = 'AIzaSyBJ6PCxWMfvbIw62Wl5_er7WATEHFAtIfQ'; // Set your Gemini API key here

/**
 * Calls the Gemini API with a given prompt and returns the generated text.
 * @param {string} prompt - The text prompt to send to Gemini.
 * @returns {Promise<string>} - The generated text response.
 */
export const callGeminiAPI = async (prompt) => {
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || response.statusText);
    }
    const data = await response.json();
    // Extract the generated text from the first candidate
    const generatedText = data.candidates[0]?.content?.parts[0]?.text || '';
    return generatedText;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
};

/**
 * Uses Gemini to analyze an image caption and detect food items.
 * Expects Gemini to return a JSON array (as text) where each object has "name" and "confidence" fields.
 * @param {string} caption - The caption describing the image.
 * @returns {Promise<Array>} - An array of detected food items.
 */
export const detectFoodFromCaption = async (caption) => {
  try {
    const prompt = `Analyze the following image description and list any food items present along with an estimated confidence score. Respond in JSON format as an array of objects with "name" and "confidence" fields. Description: "${caption}"`;
    
    const generatedText = await callGeminiAPI(prompt);
    console.log("Raw response from Gemini:", generatedText.substring(0, 100) + "...");
    
    // Extract JSON from markdown code blocks if present
    let jsonText = generatedText;
    
    // Check for markdown code blocks
    const jsonMatch = generatedText.match(/```(?:json)?\s*\n([\s\S]*?)\n```/) || 
                      generatedText.match(/```([\s\S]*?)```/);
                      
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1].trim();
    }
    
    // Clean up the text in case there are other markdown remnants
    jsonText = jsonText.replace(/^```json\s*/, '')
                       .replace(/\s*```$/, '')
                       .trim();
                       
    // Attempt to parse the JSON
    try {
      const foodItems = JSON.parse(jsonText);
      return Array.isArray(foodItems) ? foodItems : [foodItems];
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);
      console.log("Attempted to parse:", jsonText);
      
      // Fallback - return some common food items
      return [
        { name: "food item", confidence: 0.7 },
        { name: "mixed meal", confidence: 0.6 }
      ];
    }
  } catch (error) {
    console.error('Error detecting food from caption using Gemini:', error);
    
    // Return fallback foods even if there's an error
    return [
      { name: "food item", confidence: 0.7 },
      { name: "mixed meal", confidence: 0.6 }
    ];
  }
};

/**
 * Generates a personalized workout plan recommendation based on user data and goals
 * @param {Object} userData - User profile, goals, and preferences
 * @returns {Object} - Structured workout plan with exercises
 */
export const getRecommendedWorkout = async (userData) => {
  try {
    console.log('Generating workout recommendation for:', userData.goalType);

    // Create a detailed prompt for Gemini
    const prompt = `
      Create a personalized workout plan for a person with the following details:
      - Goal type: ${userData.goalType.replace('_', ' ')}
      - Current ${userData.metricType}: ${userData.currentValue}
      - Target ${userData.metricType}: ${userData.targetValue}
      - Workout frequency: ${userData.frequency} days per week
      - Available equipment: ${userData.equipment?.join(', ') || 'None specified'}
      - Current stats: ${userData.stats ? `Height: ${userData.stats.height_cm}cm, Weight: ${userData.stats.weight_kg}kg, BMI: ${userData.stats.bmi}` : 'Not provided'}
      - Selected time slots: ${userData.timeSlots?.length > 0 ? userData.timeSlots.map(slot => `${slot.day} at ${slot.time}`).join(', ') : 'No specific times'}

      Return the response as a JSON object with the following structure:
      {
        "name": "Plan name",
        "description": "Brief description of the workout plan",
        "difficulty": "Beginner/Intermediate/Advanced",
        "exercises": [
          {
            "id": 1,
            "name": "Exercise name",
            "type": "timed or reps",
            "sets": 3,
            "reps": 10,
            "time": 30,
            "rest": 60
          }
        ]
      }
    `;

    // Call the Gemini API
    const response = await callGeminiAPI(prompt, 'application/json');
    
    // Parse and validate the response
    let plan;
    try {
      // Extract JSON if returned as text with markdown code blocks
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                        response.match(/```\n([\s\S]*?)\n```/) ||
                        response.match(/{[\s\S]*}/);
                        
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      plan = JSON.parse(jsonStr.replace(/^\s*{/, '{').replace(/}\s*$/, '}'));
      
      // Validate essential fields
      if (!plan.name || !plan.exercises || !Array.isArray(plan.exercises)) {
        throw new Error('Invalid plan format');
      }
      
      // Ensure each exercise has necessary fields
      plan.exercises = plan.exercises.map((ex, index) => ({
        id: ex.id || index + 1,
        name: ex.name || 'Exercise',
        type: ex.type || (ex.time ? 'timed' : 'reps'),
        sets: ex.sets || 3,
        reps: ex.reps || (ex.type !== 'timed' ? 10 : null),
        time: ex.time || (ex.type === 'timed' ? 30 : null),
        rest: ex.rest || 60
      }));
      
    } catch (parseError) {
      console.error('Error parsing workout plan:', parseError);
      throw new Error('Failed to generate a valid workout plan');
    }
    
    return plan;
  } catch (error) {
    console.error('Error in getRecommendedWorkout:', error);
    throw error;
  }
};

/**
 * Generates insights and recommendations based on user's goal progress
 * @param {Object} goalData - Goal details and progress metrics
 * @param {Array} progressData - Historical progress data
 * @returns {Object} - Insights, recommendations, and analysis
 */
export const getGoalInsights = async (goalData, progressData = []) => {
  try {
    console.log('Generating insights for goal:', goalData.goal_type);

    // Create a detailed prompt for Gemini
    const prompt = `
      Analyze this fitness goal and provide insights:
      - Goal type: ${goalData.goal_type.replace('_', ' ')}
      - Metric: ${goalData.metric_type}
      - Starting value: ${goalData.current_value}
      - Target value: ${goalData.target_value}
      - Start date: ${goalData.start_date}
      - Target date: ${goalData.target_date}
      - Current progress: ${progressData.length > 0 ? progressData[progressData.length - 1].value : goalData.current_value}
      - Progress history: ${JSON.stringify(progressData)}
      
      Return the response as a JSON object with the following structure:
      {
        "summary": "Brief summary of progress",
        "progressAnalysis": "Detailed analysis of the progress so far",
        "onTrack": true/false,
        "estimatedCompletion": "YYYY-MM-DD",
        "recommendations": [
          "Recommendation 1",
          "Recommendation 2",
          "Recommendation 3"
        ],
        "insightType": "positive/neutral/warning"
      }
    `;

    // Call the Gemini API
    const response = await callGeminiAPI(prompt, 'application/json');
    
    // Parse and validate the response
    let insights;
    try {
      // Extract JSON if returned as text with markdown code blocks
      const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || 
                        response.match(/```\n([\s\S]*?)\n```/) ||
                        response.match(/{[\s\S]*}/);
                        
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : response;
      insights = JSON.parse(jsonStr.replace(/^\s*{/, '{').replace(/}\s*$/, '}'));
      
      // Validate essential fields
      if (!insights.summary || !insights.recommendations || !Array.isArray(insights.recommendations)) {
        throw new Error('Invalid insights format');
      }
      
      // Set default values for missing fields
      insights.insightType = insights.insightType || 'neutral';
      insights.onTrack = insights.onTrack ?? true;
      
    } catch (parseError) {
      console.error('Error parsing goal insights:', parseError);
      throw new Error('Failed to generate valid insights');
    }
    
    return insights;
  } catch (error) {
    console.error('Error in getGoalInsights:', error);
    throw error;
  }
};
