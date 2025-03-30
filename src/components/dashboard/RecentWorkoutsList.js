import React from 'react';

const RecentWorkoutsList = ({ workouts = [] }) => {
  // Format duration from seconds to minutes:seconds
  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (workouts.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-gray-500 mb-2">No workouts recorded yet.</p>
        <p className="text-blue-600 hover:underline">Start exercising!</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {workouts.map(workout => (
        <li key={workout.id} className="border-b pb-2 last:border-0">
          <div className="flex justify-between items-start">
            <h3 className="font-medium">{workout.notes || 'Workout'}</h3>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
              {workout.calories_burned || 0} cal
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {new Date(workout.date).toLocaleDateString()} • {formatDuration(workout.duration_seconds)}
          </div>
          
          {/* Exercise list */}
          {workout.workout_exercises && workout.workout_exercises.length > 0 && (
            <div className="mt-1 text-xs text-gray-600">
              {workout.workout_exercises.map((ex, i) => (
                ex.exercises && (
                  <span key={ex.id} className="inline-block mr-1">
                    {ex.exercises.name}{i < workout.workout_exercises.length - 1 ? ', ' : ''}
                  </span>
                )
              ))}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
};

export default RecentWorkoutsList;