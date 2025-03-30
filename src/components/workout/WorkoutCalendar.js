import React, { useState, useMemo } from 'react';

// Helper function to get days in month
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper function to get day of week (0 = Sunday, 6 = Saturday)
const getDayOfWeek = (year, month, day) => {
  return new Date(year, month, day).getDay();
};

const WorkoutCalendar = ({ workouts = [] }) => {
  // Current date for default view
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  
  // Navigate to prev/next month
  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };
  
  // Go to current month
  const goToCurrentMonth = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };
  
  // Prepare calendar data
  const calendarData = useMemo(() => {
    // Get days in the month and the first day of the month
    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDayOfMonth = getDayOfWeek(viewYear, viewMonth, 1);
    
    // Create array for the calendar grid
    const calendarArray = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarArray.push({ day: null, workouts: [] });
    }
    
    // Add days of the month with workout data
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(viewYear, viewMonth, day);
      // Convert to YYYY-MM-DD for comparison
      const dateString = date.toISOString().split('T')[0];
      
      // Find workouts for this day
      const dayWorkouts = workouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        return workoutDate.toISOString().split('T')[0] === dateString;
      });
      
      calendarArray.push({
        day,
        date,
        isToday: today.getDate() === day && 
                 today.getMonth() === viewMonth && 
                 today.getFullYear() === viewYear,
        workouts: dayWorkouts
      });
    }
    
    return calendarArray;
  }, [viewYear, viewMonth, workouts, today]);
  
  // Get the month name
  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long' });
  
  // Day names for header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Format duration from seconds
  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    return `${mins}m`;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      {/* Calendar Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{monthName} {viewYear}</h2>
        <div className="flex space-x-2">
          <button 
            onClick={goToPrevMonth}
            className="p-1 rounded hover:bg-gray-200 text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button 
            onClick={goToCurrentMonth}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Today
          </button>
          <button 
            onClick={goToNextMonth}
            className="p-1 rounded hover:bg-gray-200 text-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Calendar Grid */}
      <div>
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center font-medium text-gray-500 text-sm py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1 h-96">
          {calendarData.map((dayData, index) => (
            <div 
              key={index} 
              className={`border rounded-lg p-1 overflow-hidden ${
                dayData.isToday ? 'bg-blue-50 border-blue-200' : 
                dayData.day ? 'hover:bg-gray-50' : 'bg-gray-100'
              }`}
            >
              {dayData.day && (
                <>
                  <div className={`text-right text-sm font-medium ${
                    dayData.isToday ? 'text-blue-600' : ''
                  }`}>
                    {dayData.day}
                  </div>
                  
                  {/* Workout Indicators */}
                  <div className="mt-1 space-y-1">
                    {dayData.workouts.length > 0 ? (
                      dayData.workouts.map((workout, wIndex) => (
                        <div 
                          key={wIndex}
                          className="bg-green-100 text-green-800 text-xs p-1 truncate rounded"
                          title={workout.notes || 'Workout'}
                        >
                          {workout.notes?.substring(0, 12) || 'Workout'} 
                          {workout.notes?.length > 12 ? '...' : ''} 
                          {workout.duration_seconds ? ` (${formatDuration(workout.duration_seconds)})` : ''}
                        </div>
                      ))
                    ) : (
                      <div className="h-6"></div> // Empty space for no workouts
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        
        {/* Legend */}
        <div className="mt-4 text-xs text-gray-500 flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-50 border border-blue-200 mr-1"></div>
          <span className="mr-3">Today</span>
          <div className="w-3 h-3 rounded-full bg-green-100 mr-1"></div>
          <span>Workout</span>
        </div>
      </div>
    </div>
  );
};

export default WorkoutCalendar;