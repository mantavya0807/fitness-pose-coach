// src/utils/dashboardUtils.js

/**
 * Process exercise data for muscle group chart
 * @param {Array} exerciseData - Array of workout exercises with muscle group info
 * @returns {Array} Processed data for chart visualization
 */
export const processExerciseData = (exerciseData) => {
    if (!exerciseData || exerciseData.length === 0) return [];
  
    // Count exercises by muscle group
    const muscleGroupCounts = {};
    
    exerciseData.forEach(item => {
      if (item.exercises && item.exercises.muscle_group) {
        // Handle multiple muscle groups (comma-separated)
        const muscleGroups = item.exercises.muscle_group.split(',').map(group => group.trim());
        
        muscleGroups.forEach(group => {
          if (!muscleGroupCounts[group]) {
            muscleGroupCounts[group] = 0;
          }
          muscleGroupCounts[group]++;
        });
      }
    });
  
    // Convert to array for chart
    return Object.keys(muscleGroupCounts).map(group => ({
      name: group,
      count: muscleGroupCounts[group]
    })).sort((a, b) => b.count - a.count);
  };
  
  /**
   * Calculate current workout streak
   * @param {Array} workouts - Array of workout objects with date property
   * @returns {Number} Current streak in days
   */
  export const calculateStreak = (workouts) => {
    if (!workouts || workouts.length === 0) return 0;
  
    // Sort workouts by date (most recent first)
    const sortedWorkouts = [...workouts].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  
    let streak = 1;
    let currentDate = new Date(sortedWorkouts[0].date);
    currentDate.setHours(0, 0, 0, 0);
  
    // Check if most recent workout is today or yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
  
    if (currentDate.getTime() !== today.getTime() && 
        currentDate.getTime() !== yesterday.getTime()) {
      return 0; // Streak broken if most recent workout is older than yesterday
    }
  
    // Calculate streak by checking consecutive days
    for (let i = 1; i < sortedWorkouts.length; i++) {
      const workoutDate = new Date(sortedWorkouts[i].date);
      workoutDate.setHours(0, 0, 0, 0);
  
      const expectedPrevDate = new Date(currentDate);
      expectedPrevDate.setDate(expectedPrevDate.getDate() - 1);
  
      if (workoutDate.getTime() === expectedPrevDate.getTime()) {
        streak++;
        currentDate = workoutDate;
      } else {
        break;
      }
    }
  
    return streak;
  };
  
  /**
   * Calculate weekly workout distribution
   * @param {Array} workouts - Array of workout objects with date property
   * @returns {Array} Weekly distribution data for chart visualization
   */
  export const calculateWeeklyDistribution = (workouts) => {
    if (!workouts || workouts.length === 0) {
      return Array(7).fill(0).map((_, i) => ({
        name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        count: 0
      }));
    }
  
    // Initialize counts for each day of the week
    const dayCounts = Array(7).fill(0);
    
    // Count workouts for each day
    workouts.forEach(workout => {
      const date = new Date(workout.date);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
      dayCounts[dayOfWeek]++;
    });
  
    // Format for chart
    return dayCounts.map((count, index) => ({
      name: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
      count
    }));
  };
  
  /**
   * Format duration from seconds to minutes:seconds
   * @param {Number} seconds - Duration in seconds
   * @returns {String} Formatted duration string
   */
  export const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  /**
   * Generate a motivational quote
   * @returns {String} Random motivational quote
   */
  export const getMotivationalQuote = () => {
    const quotes = [
      "The only bad workout is the one that didn't happen.",
      "Your body can stand almost anything. It's your mind you have to convince.",
      "Strength does not come from the body. It comes from the will.",
      "The difference between try and triumph is a little umph.",
      "The hardest lift of all is lifting your butt off the couch.",
      "Don't wish for it, work for it.",
      "Sweat is just your fat crying.",
      "You don't have to be extreme, just consistent.",
      "The pain you feel today will be the strength you feel tomorrow.",
      "Your health is an investment, not an expense."
    ];
    
    return quotes[Math.floor(Math.random() * quotes.length)];
  };
  
  /**
   * Calculate estimated calories burned
   * @param {Object} exercise - Exercise object
   * @param {Number} reps - Number of repetitions
   * @param {Number} duration - Duration in seconds
   * @returns {Number} Estimated calories burned
   */
  export const calculateCaloriesBurned = (exercise, reps, duration) => {
    if (!exercise) return 0;
    
    // Get calories per rep from exercise details if available
    const caloriesPerRep = exercise.exercise_details?.calories_per_rep || 0.3; // Default value if not specified
    
    // For timed exercises like plank
    if (exercise.name === 'Plank') {
      return Math.round((duration / 60) * 3); // Approximately 3 calories per minute of plank
    }
    
    // For rep-based exercises
    return Math.round(reps * caloriesPerRep);
  };
  
  /**
   * Fetch comprehensive dashboard data
   * @param {String} userId - User ID
   * @param {Object} supabase - Supabase client
   * @returns {Object} Dashboard data
   */
  export const fetchDashboardData = async (userId, supabase) => {
    if (!userId) return null;
  
    try {
      // Fetch user profile data including equipment
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, photo_url, available_equipment')
        .eq('id', userId)
        .single();
  
      if (profileError) throw profileError;
  
      // Fetch physical stats history
      const { data: stats, error: statsError } = await supabase
        .from('physical_stats')
        .select('weight_kg, bmi, recorded_at')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: true })
        .limit(10);
  
      if (statsError) throw statsError;
  
      // Fetch active goals
      const { data: goals, error: goalsError } = await supabase
        .from('user_goals')
        .select('id, goal_type, target_date, status')
        .eq('user_id', userId)
        .eq('status', 'active');
  
      if (goalsError) throw goalsError;
  
      // Fetch recent workouts with more detail
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select(`
          id, 
          date, 
          duration_seconds, 
          calories_burned,
          notes,
          workout_exercises (
            id,
            reps,
            sets,
            form_score,
            time_seconds,
            exercises (
              id,
              name,
              type,
              muscle_group
            )
          )
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(5);
  
      if (workoutsError) throw workoutsError;
  
      // Calculate workout metrics for the past 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();
  
      const { data: monthWorkouts, error: monthWorkoutsError } = await supabase
        .from('workouts')
        .select('id, date, duration_seconds, calories_burned')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgoStr)
        .order('date', { ascending: true });
  
      if (monthWorkoutsError) throw monthWorkoutsError;
  
      // Fetch exercise history grouped by muscle group for the past 30 days
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('workout_exercises')
        .select(`
          id,
          exercises (
            id,
            name,
            muscle_group
          ),
          workout:workouts(date)
        `)
        .in('workout.user_id', [userId])
        .gte('workout.date', thirtyDaysAgoStr);
  
      if (exerciseError) throw exerciseError;
  
      // Process data for muscle group chart
      const muscleGroupData = processExerciseData(exerciseData);
  
      // Calculate current streak
      const streak = calculateStreak(monthWorkouts);
  
      // Calculate weekly workout distribution
      const weeklyDistribution = calculateWeeklyDistribution(monthWorkouts);
  
      return {
        profile,
        latestStats: stats && stats.length > 0 ? stats[stats.length - 1] : null,
        statsHistory: stats || [],
        recentWorkouts: workouts || [],
        activeGoals: goals || [],
        monthWorkoutsData: monthWorkouts || [],
        muscleGroupData,
        streak,
        weeklyDistribution
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  };