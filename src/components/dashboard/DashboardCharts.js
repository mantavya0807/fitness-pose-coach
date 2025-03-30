import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DashboardCharts = ({ statsHistory }) => {
  // Format data for chart display
  const chartData = statsHistory.map(item => ({
    date: new Date(item.recorded_at).toLocaleDateString(),
    weight: item.weight_kg,
    bmi: item.bmi
  }));

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip />
          <Legend />
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="weight" 
            name="Weight (kg)" 
            stroke="#8884d8" 
            activeDot={{ r: 8 }} 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="bmi" 
            name="BMI" 
            stroke="#82ca9d" 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DashboardCharts;