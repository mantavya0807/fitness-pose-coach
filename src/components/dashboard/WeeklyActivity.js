import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const WeeklyActivity = ({ weeklyDistribution }) => {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={weeklyDistribution}
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip formatter={(value) => [`${value} workouts`, 'Count']} />
          <Bar dataKey="count" fill="#3b82f6" name="Workouts" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeeklyActivity;