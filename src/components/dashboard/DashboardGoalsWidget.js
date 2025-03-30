// src/components/dashboard/DashboardGoalsWidget.js
import React from 'react';
import { Link } from 'react-router-dom';

const DashboardGoalsWidget = ({ goals = [] }) => {
  if (!goals || goals.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Active Goals</h2>
        <div className="text-center py-8">
          <p className="text-gray-500 mb-3">You don't have any active goals.</p>
          <Link 
            to="/goals/create" 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition inline-block"
          >
            Create a Goal
          </Link>
        </div>
      </div>
    );
  }
  
  // Filter to only active goals and sort by target date (nearest first)
  const activeGoals = goals
    .filter(goal => goal.status === 'active')
    .sort((a, b) => new Date(a.target_date) - new Date(b.target_date));
  
  // Calculate days remaining for each goal
  const calculateDaysRemaining = (targetDate) => {
    const target = new Date(targetDate);
    const today = new Date();
    
    // Reset time components
    target.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = target - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };
  
  // Calculate progress percentage for each goal
  const calculateProgress = (goal, latestStats) => {
    if (!goal) return 0;
    
    const current = parseFloat(goal.current_value);
    const target = parseFloat(goal.target_value);
    let currentValue = current;
    
    // Get the most recent value based on metric type (if stats are available)
    if (latestStats) {
      switch (goal.metric_type) {
        case 'weight':
          currentValue = latestStats.weight_kg || current;
          break;
        case 'bmi':
          currentValue = latestStats.bmi || current;
          break;
        // Add other metric types as needed
        default:
          currentValue = current;
      }
    }
    
    // Calculate progress percentage based on goal type
    if (goal.goal_type === 'weight_loss' || target < current) {
      // Weight loss goals or any goal where target is lower than start
      const totalChange = current - target;
      const currentChange = current - currentValue;
      
      if (totalChange <= 0) return 0; // Invalid goal
      return Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
    } else {
      // Weight gain goals or any goal where target is higher than start
      const totalChange = target - current;
      const currentChange = currentValue - current;
      
      if (totalChange <= 0) return 0; // Invalid goal
      return Math.min(100, Math.max(0, (currentChange / totalChange) * 100));
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Active Goals</h2>
        <Link to="/goals" className="text-sm text-blue-600 hover:underline">
          View All
        </Link>
      </div>
      
      <div className="space-y-4">
        {activeGoals.length === 0 ? (
          <p className="text-center py-4 text-gray-500">No active goals found.</p>
        ) : (
          activeGoals.slice(0, 3).map((goal) => {
            const daysRemaining = calculateDaysRemaining(goal.target_date);
            const progress = calculateProgress(goal);
            const progressFormatted = progress.toFixed(1);
            
            return (
              <Link
                key={goal.id}
                to={`/goals/${goal.id}`}
                className="block border rounded-lg overflow-hidden hover:shadow-md transition"
              >
                <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                  <h3 className="font-medium">
                    {goal.goal_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <span className="text-sm text-gray-500">
                    {daysRemaining} days left
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{progressFormatted}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Current</p>
                      <p className="font-medium">
                        {goal.current_value}{goal.metric_type === 'weight' ? ' kg' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-500">Target</p>
                      <p className="font-medium">
                        {goal.target_value}{goal.metric_type === 'weight' ? ' kg' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
      
      {activeGoals.length > 0 && (
        <div className="mt-4 pt-4 border-t flex justify-center">
          <Link
            to="/goals/create"
            className="text-blue-600 hover:underline text-sm inline-flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Goal
          </Link>
        </div>
      )}
    </div>
  );
};

export default DashboardGoalsWidget;