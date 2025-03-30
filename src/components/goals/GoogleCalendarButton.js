// src/components/goals/GoogleCalendarButton.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import useAuthStore from '../../store/authStore';

export const GoogleCalendarButton = ({ 
  onConnected, 
  onDisconnected,
  onTimeSlotSelect
}) => {
  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [calendarData, setCalendarData] = useState(null);
  const [showTimeSlots, setShowTimeSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]);
  
  // Check if user has already connected their Google Calendar
  useEffect(() => {
    if (!user) return;
    
    const checkCalendarConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('user_integrations')
          .select('connected, data')
          .eq('user_id', user.id)
          .eq('integration_type', 'google_calendar')
          .maybeSingle();
          
        if (error) throw error;
        
        if (data && data.connected) {
          setIsConnected(true);
          setCalendarData(data.data);
          
          if (onConnected) onConnected(data.data);
        } else {
          setIsConnected(false);
          
          if (onDisconnected) onDisconnected();
        }
      } catch (error) {
        console.error('Error checking calendar connection:', error);
      }
    };
    
    checkCalendarConnection();
  }, [user, onConnected, onDisconnected]);
  
  // Connect Google Calendar
  const handleConnect = async () => {
    if (!user) {
      alert('Please log in to connect Google Calendar');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // In a real implementation, this would initiate OAuth flow
      // For this demo, we'll simulate a successful connection
      
      // Generate some dummy available time slots
      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const timeSlots = ['6:00 AM', '7:00 AM', '8:00 AM', '12:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'];
      
      // Generate dummy available slots (some days/times)
      const availableSlots = daysOfWeek.flatMap(day => {
        // Randomly select 2-4 time slots for each day
        const daySlots = [];
        const numSlots = 2 + Math.floor(Math.random() * 3); // 2-4 slots
        
        const shuffledTimeSlots = [...timeSlots].sort(() => 0.5 - Math.random());
        
        for (let i = 0; i < numSlots; i++) {
          daySlots.push({
            day,
            time: shuffledTimeSlots[i]
          });
        }
        
        return daySlots;
      });
      
      // Mock calendar data
      const mockCalendarData = {
        email: `${user.email}`,
        connected_at: new Date().toISOString(),
        available_slots: availableSlots,
        calendars: ['Primary', 'Work', 'Fitness']
      };
      
      // Store in Supabase (would normally happen after OAuth)
      const { error } = await supabase
        .from('user_integrations')
        .upsert({
          user_id: user.id,
          integration_type: 'google_calendar',
          connected: true,
          data: mockCalendarData,
          last_updated: new Date().toISOString()
        });
        
      if (error) throw error;
      
      setIsConnected(true);
      setCalendarData(mockCalendarData);
      setShowTimeSlots(true);
      
      if (onConnected) onConnected(mockCalendarData);
      
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      alert('Failed to connect to Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Disconnect Google Calendar
  const handleDisconnect = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Update the integration status
      const { error } = await supabase
        .from('user_integrations')
        .update({
          connected: false,
          last_updated: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('integration_type', 'google_calendar');
        
      if (error) throw error;
      
      setIsConnected(false);
      setCalendarData(null);
      setSelectedSlots([]);
      setShowTimeSlots(false);
      
      if (onDisconnected) onDisconnected();
      
    } catch (error) {
      console.error('Error disconnecting from Google Calendar:', error);
      alert('Failed to disconnect from Google Calendar');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle time slot selection
  const toggleTimeSlot = (slot) => {
    const slotKey = `${slot.day}-${slot.time}`;
    
    if (selectedSlots.some(s => `${s.day}-${s.time}` === slotKey)) {
      // Remove slot
      setSelectedSlots(prev => prev.filter(s => `${s.day}-${s.time}` !== slotKey));
    } else {
      // Add slot
      setSelectedSlots(prev => [...prev, slot]);
    }
  };
  
  // When selected slots change, notify parent
  useEffect(() => {
    if (onTimeSlotSelect) {
      onTimeSlotSelect(selectedSlots);
    }
  }, [selectedSlots, onTimeSlotSelect]);
  
  // Render time slots selection
  const renderTimeSlots = () => {
    if (!calendarData || !calendarData.available_slots) return null;
    
    // Group slots by day
    const slotsByDay = calendarData.available_slots.reduce((acc, slot) => {
      if (!acc[slot.day]) acc[slot.day] = [];
      acc[slot.day].push(slot.time);
      return acc;
    }, {});
    
    return (
      <div className="mt-4 border-t pt-4">
        <h3 className="text-sm font-medium mb-2">Select Available Time Slots for Workouts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(slotsByDay).map(([day, times]) => (
            <div key={day} className="mb-3">
              <p className="text-sm font-medium mb-1">{day}</p>
              <div className="flex flex-wrap gap-2">
                {times.map((time) => {
                  const isSelected = selectedSlots.some(s => s.day === day && s.time === time);
                  return (
                    <button
                      key={`${day}-${time}`}
                      onClick={() => toggleTimeSlot({ day, time })}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700 border-blue-300'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {selectedSlots.length === 0 
            ? "Select time slots when you're available for workouts"
            : `Selected ${selectedSlots.length} time slots`}
        </p>
      </div>
    );
  };
  
  // Main render
  return (
    <div>
      {!isConnected ? (
        <button
          onClick={handleConnect}
          disabled={isLoading}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-t-2 border-blue-500 border-solid rounded-full animate-spin mr-2"></div>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 4H18C20.2091 4 22 5.79086 22 8V16C22 18.2091 20.2091 20 18 20H6C3.79086 20 2 18.2091 2 16V8C2 5.79086 3.79086 4 6 4Z" stroke="#4285F4" strokeWidth="2" />
                <path d="M6 11H18M6 15H13" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 9L6 12" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Connect Google Calendar
            </>
          )}
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">
                Connected to Google Calendar
                {calendarData?.email && ` (${calendarData.email})`}
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowTimeSlots(!showTimeSlots)}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                {showTimeSlots ? 'Hide Time Slots' : 'Show Time Slots'}
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isLoading}
                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
              >
                {isLoading ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
          
          {showTimeSlots && renderTimeSlots()}
        </div>
      )}
    </div>
  );
};