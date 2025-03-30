import React, { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const WorkoutHistoryCharts = ({ workouts = [], timeRange }) => {
  // Process data for charts
  const { 
    workoutsByDate, 
    caloriesByDate, 
    muscleGroupData,
    exerciseTypeData
  } = useMemo(() => {
    if (!workouts || workouts.length === 0) {
      return { 
        workoutsByDate: [], 
        caloriesByDate: [],
        muscleGroupData: [],
        exerciseTypeData: []
      };
    }
    
    // Process workouts by date for line chart
    const dateMap = {};
    const today = new Date();
    
    // Create a skeleton of dates based on the time range
    let daysToShow = 30;
    if (timeRange === '7d') daysToShow = 7;
    else if (timeRange === '30d') daysToShow = 30;
    else if (timeRange === '90d') daysToShow = 90;
    else if (timeRange === '365d') daysToShow = 365;
    else daysToShow = 30; // Default
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dateMap[dateStr] = { date: dateStr, count: 0, calories: 0, duration: 0 };
    }
    
    // Fill in actual workout data
    workouts.forEach(workout => {
      const workoutDate = new Date(workout.date).toISOString().split('T')[0];
      if (dateMap[workoutDate]) {
        dateMap[workoutDate].count += 1;
        dateMap[workoutDate].calories += workout.calories_burned || 0;
        dateMap[workoutDate].duration += workout.duration_seconds || 0;
      }
    });
    
    // Convert to arrays for charts
    const workoutsByDate = Object.values(dateMap);
    
    // Clone and prepare data specifically for calories chart
    const caloriesByDate = workoutsByDate.map(day => ({
      date: day.date,
      calories: day.calories
    }));
    
    // Process muscle group data for pie chart
    const muscleGroups = {};
    const exerciseTypes = {};
    
    workouts.forEach(workout => {
      if (workout.workout_exercises) {
        workout.workout_exercises.forEach(we => {
          if (we.exercises) {
            // Process muscle groups
            if (we.exercises.muscle_group) {
              const groups = we.exercises.muscle_group.split(',').map(g => g.trim());
              groups.forEach(group => {
                muscleGroups[group] = (muscleGroups[group] || 0) + 1;
              });
            }
            
            // Process exercise types
            if (we.exercises.type) {
              exerciseTypes[we.exercises.type] = (exerciseTypes[we.exercises.type] || 0) + 1;
            }
          }
        });
      }
    });
    
    // Convert to arrays for charts
    const muscleGroupData = Object.entries(muscleGroups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value) // Sort by frequency
      .slice(0, 5); // Top 5
      
    const exerciseTypeData = Object.entries(exerciseTypes)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    return { 
      workoutsByDate, 
      caloriesByDate,
      muscleGroupData,
      exerciseTypeData
    };
  }, [workouts, timeRange]);
  
  // Colors for pie charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  // If no data, show message
  if (workouts.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow text-center">
        <p className="text-gray-500">No workout data available for this time period.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Workout Frequency Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Workout Frequency</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={workoutsByDate}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth()+1}/${d.getDate()}`;
                }}
                interval={workoutsByDate.length > 30 ? Math.floor(workoutsByDate.length / 15) : 0}
              />
              <YAxis allowDecimals={false} />
              <Tooltip 
                formatter={(value) => [`${value} workout(s)`, 'Count']}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Bar dataKey="count" fill="#3b82f6" name="Workouts" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Calories Burned Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Calories Burned</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={caloriesByDate}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => {
                  const d = new Date(date);
                  return `${d.getMonth()+1}/${d.getDate()}`;
                }}
                interval={caloriesByDate.length > 30 ? Math.floor(caloriesByDate.length / 15) : 0}
              />
              <YAxis />
              <Tooltip 
                formatter={(value) => [`${value} calories`, 'Burned']}
                labelFormatter={(date) => new Date(date).toLocaleDateString()}
              />
              <Line type="monotone" dataKey="calories" stroke="#ef4444" name="Calories" strokeWidth={2} dot={{ r: 1 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Muscle Groups and Exercise Types Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Muscle Groups Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top Muscle Groups</h2>
          <div className="h-64">
            {muscleGroupData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={muscleGroupData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {muscleGroupData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} exercises`, 'Count']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No muscle group data available.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Exercise Types Distribution */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Exercise Types</h2>
          <div className="h-64">
            {exerciseTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={exerciseTypeData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip formatter={(value) => [`${value} exercises`, 'Count']} />
                  <Bar dataKey="value" fill="#8884d8">
                    {exerciseTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">No exercise type data available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutHistoryCharts;