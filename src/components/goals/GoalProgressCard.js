// src/components/goals/GoalProgressCard.js
import React from 'react';

const GoalProgressCard = ({ 
  goal, 
  progress, 
  daysRemaining, 
  formatDate, 
  onStatusChange, 
  onClick 
}) => {
  // Format progress percentage
  const progressFormatted = progress.toFixed(1);
  
  // Determine goal-specific icon and colors
  const getGoalIcon = (goalType) => {
    switch (goalType) {
      case 'weight_loss':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case 'muscle_gain':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'endurance':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'flexibility':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'strength':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
    }
  };
  
  const getGoalColor = (goalType) => {
    switch (goalType) {
      case 'weight_loss':
        return 'blue';
      case 'muscle_gain':
        return 'green';
      case 'endurance':
        return 'orange';
      case 'flexibility':
        return 'purple';
      case 'strength':
        return 'red';
      default:
        return 'gray';
    }
  };
  
  const color = getGoalColor(goal.goal_type);
  
  // Status badge style
  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Format the goal type name for display
  const formatGoalType = (type) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  
  return (
    <div 
      className={`bg-white border-l-4 border-${color}-500 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden`}
      onClick={onClick}
    >
      {/* Header */}
      <div className="p-5">
        {/* Title and status */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div className={`mr-3 p-2 rounded-full bg-${color}-100 text-${color}-600`}>
              {getGoalIcon(goal.goal_type)}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{formatGoalType(goal.goal_type)}</h3>
              <p className="text-sm text-gray-500">
                {goal.metric_type === 'weight' && 'Weight Goal'}
                {goal.metric_type === 'bmi' && 'BMI Goal'}
                {goal.metric_type === 'body_fat' && 'Body Fat Goal'}
                {goal.metric_type === 'run_time' && 'Running Goal'}
                {goal.metric_type === 'custom' && 'Custom Goal'}
              </p>
            </div>
          </div>
          <div>
            <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeStyle(goal.status)}`}>
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm">
            <p>Progress</p>
            <p className="font-medium">{progressFormatted}%</p>
          </div>
          <div className="mt-1 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-${color}-500 rounded-full`} 
              style={{ width: `${Math.min(100, progress)}%` }}
            ></div>
          </div>
        </div>
        
        {/* Goal details */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500">Starting Value</p>
            <p className="font-medium">{goal.current_value} {goal.metric_type === 'weight' ? 'kg' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Target Value</p>
            <p className="font-medium">{goal.target_value} {goal.metric_type === 'weight' ? 'kg' : ''}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm mt-2">
          <div>
            <p className="text-gray-500">Target Date</p>
            <p className="font-medium">{formatDate(goal.target_date)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500">Days Remaining</p>
            <p className="font-medium">
              {daysRemaining > 0 ? daysRemaining : 'Target reached'}
            </p>
          </div>
        </div>
      </div>
      
      {/* Footer with actions */}
      <div className="px-5 py-3 bg-gray-50 flex justify-between items-center border-t">
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the card click
            window.location.href = `/workout/${goal.goal_workout_plans?.[0]?.workout_templates?.workout_template_exercises?.[0]?.exercise_id}/live`;
          }}
          className={`px-3 py-1 rounded-md bg-${color}-600 text-white hover:bg-${color}-700 text-sm`}
        >
          Start Workout
        </button>
        
        <div className="flex space-x-2">
          {goal.status === 'active' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the card click
                  if (window.confirm('Mark this goal as completed?')) {
                    onStatusChange(goal.id, 'completed');
                  }
                }}
                className="p-1 text-gray-500 hover:text-green-600"
                title="Mark Completed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering the card click
                  if (window.confirm('Cancel this goal?')) {
                    onStatusChange(goal.id, 'cancelled');
                  }
                }}
                className="p-1 text-gray-500 hover:text-red-600"
                title="Cancel Goal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          )}
          {goal.status !== 'active' && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the card click
                if (window.confirm('Reactivate this goal?')) {
                  onStatusChange(goal.id, 'active');
                }
              }}
              className="p-1 text-gray-500 hover:text-blue-600"
              title="Reactivate Goal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoalProgressCard;