// src/pages/ProfileSettingsPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';

// --- Data Fetching ---
const fetchUserProfile = async (userId) => {
  if (!userId) return null;

  // Fetch profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('name, photo_url, available_equipment')
    .eq('id', userId)
    .single();

  // Fetch latest physical stats record
  const { data: statsData, error: statsError } = await supabase
    .from('physical_stats')
    .select('height_cm, weight_kg, age, gender, bmi')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch goals
  const { data: goalsData, error: goalsError } = await supabase
    .from('user_goals')
    .select(`
      id, 
      goal_type, 
      status, 
      target_date,
      metric_type,
      current_value,
      target_value,
      frequency,
      start_date,
      goal_workout_plans(
        template_id,
        workout_templates(name)
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (profileError) throw profileError;
  if (statsError) console.warn("Stats fetch error:", statsError.message);
  if (goalsError) console.warn("Goals fetch error:", goalsError.message);

  // Parse available_equipment if it is returned as a string
  if (profileData && typeof profileData.available_equipment === 'string') {
    try {
      profileData.available_equipment = JSON.parse(profileData.available_equipment);
    } catch (err) {
      console.warn("Failed to parse available_equipment:", err);
      profileData.available_equipment = [];
    }
  }

  return {
    profile: profileData,
    stats: statsData,
    goals: goalsData || [],
  };
};

// --- Data Mutation ---
const updateUserData = async ({ userId, profileUpdates, statsUpdates, goalUpdates, queryClient }) => {
  if (!userId) throw new Error("User ID is required for updates.");

  const promises = [];

  // 1. Update Profile
  if (profileUpdates && Object.keys(profileUpdates).length > 0) {
    // Ensure available_equipment is stringified if it is an array
    if (profileUpdates.available_equipment && Array.isArray(profileUpdates.available_equipment)) {
      profileUpdates.available_equipment = JSON.stringify(profileUpdates.available_equipment);
    }
    promises.push(
      supabase
        .from('profiles')
        .update({ ...profileUpdates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .then(({ error }) => { if (error) throw new Error(`Profile update failed: ${error.message}`); })
    );
  }

  // 2. Insert new Physical Stats record
  if (statsUpdates && Object.keys(statsUpdates).length > 0) {
    const bmi = calculateBmi(statsUpdates.height_cm, statsUpdates.weight_kg);
    promises.push(
      supabase
        .from('physical_stats')
        .insert({
          user_id: userId,
          ...statsUpdates,
          bmi: bmi ? parseFloat(bmi) : null,
          recorded_at: new Date().toISOString()
        })
        .then(({ error }) => { if (error) throw new Error(`Stats update failed: ${error.message}`); })
    );
  }

  // 3. Goals update (not fully implemented)
  if (goalUpdates && goalUpdates.length > 0) {
    console.warn("Goal update logic not fully implemented in mutation.");
  }

  await Promise.all(promises);

  // Invalidate queries to refresh the data
  if (queryClient) {
    queryClient.invalidateQueries({ queryKey: ['userProfileData', userId] });
    queryClient.invalidateQueries({ queryKey: ['dashboardData', userId] });
    queryClient.invalidateQueries({ queryKey: ['userGoals', userId] });
  }

  // Refresh profile in auth store if applicable
  useAuthStore.getState().fetchProfile(userId);

  return { success: true };
};

// --- Helper ---
const calculateBmi = (h_cm, w_kg) => {
  if (!h_cm || !w_kg || h_cm <= 0 || w_kg <= 0) return null;
  const h_m = parseFloat(h_cm) / 100;
  return (parseFloat(w_kg) / (h_m * h_m)).toFixed(1);
};

// --- Component ---
const ProfileSettingsPage = () => {
  const { user, loading: authLoading } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Local state for form fields
  const [name, setName] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [availableEquipment, setAvailableEquipment] = useState([]);

  // Fetch data using React Query
  const { data: userData, isLoading: dataLoading, error: dataError, refetch } = useQuery({
    queryKey: ['userProfileData', user?.id],
    queryFn: () => fetchUserProfile(user?.id),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      if (data?.profile) {
        setName(data.profile.name || '');
        const equipment = data.profile.available_equipment;
        if (Array.isArray(equipment)) {
          setAvailableEquipment(equipment);
        } else if (typeof equipment === 'string') {
          try {
            setAvailableEquipment(JSON.parse(equipment));
          } catch (err) {
            console.warn("Error parsing available_equipment:", err);
            setAvailableEquipment([]);
          }
        } else {
          setAvailableEquipment([]);
        }
      }
      if (data?.stats) {
        setHeight(data.stats.height_cm || '');
        setWeight(data.stats.weight_kg || '');
        setAge(data.stats.age || '');
        setGender(data.stats.gender || '');
      }
    }
  });

  // Mutation hook for updates
  const mutation = useMutation({
    mutationFn: (mutationData) => updateUserData({ ...mutationData, queryClient }),
    onSuccess: () => {
      alert('Profile updated successfully!');
      refetch();
    },
    onError: (error) => {
      console.error("Update failed:", error);
      alert(`Update failed: ${error.message}`);
    }
  });

  const handleEquipmentChange = (equip) => {
    setAvailableEquipment(prev =>
      prev.includes(equip) ? prev.filter(item => item !== equip) : [...prev, equip]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user) return;

    const profileUpdates = {
      name: name !== userData?.profile?.name ? name : undefined,
      available_equipment:
        JSON.stringify(availableEquipment) !== JSON.stringify(userData?.profile?.available_equipment)
          ? availableEquipment
          : undefined,
    };
    const cleanProfileUpdates = Object.fromEntries(
      Object.entries(profileUpdates).filter(([_, v]) => v !== undefined)
    );

    // Determine if stats have changed
    const statsChanged =
      (height || null) !== (userData?.stats?.height_cm || null) ||
      (weight || null) !== (userData?.stats?.weight_kg || null) ||
      (age || null) !== (userData?.stats?.age || null) ||
      (gender || null) !== (userData?.stats?.gender || null);

    const statsUpdates = statsChanged
      ? {
          height_cm: height ? parseFloat(height) : null,
          weight_kg: weight ? parseFloat(weight) : null,
          age: age ? parseInt(age) : null,
          gender: gender || null,
        }
      : null;

    if (Object.keys(cleanProfileUpdates).length > 0 || statsUpdates) {
      mutation.mutate({ 
        userId: user.id, 
        profileUpdates: cleanProfileUpdates, 
        statsUpdates,
      });
    } else {
      alert("No changes detected.");
    }
  };

  const equipmentOptions = ['Bodyweight', 'Dumbbells', 'Resistance Band', 'Kettlebell', 'Barbell', 'Machine'];
  const goalOptions = ['Weight Loss', 'Muscle Gain', 'Improved Endurance', 'Better Flexibility', 'General Fitness'];

  if (authLoading || dataLoading)
    return <div>Loading settings...</div>;
  if (dataError)
    return (
      <div className="text-red-500">
        Error loading settings: {dataError.message}{" "}
        <button onClick={() => refetch()} className="underline ml-2">
          Retry
        </button>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Profile &amp; Settings</h1>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold border-b pb-2 mb-4">Your Information</h2>

        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="settings-name" className="label">
              Name
            </label>
            <input
              type="text"
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="settings-email" className="label">
              Email
            </label>
            <input
              type="email"
              id="settings-email"
              value={user?.email || ''}
              disabled
              className="input-field bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <label htmlFor="settings-age" className="label">
              Age
            </label>
            <input
              type="number"
              id="settings-age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="settings-gender" className="label">
              Gender
            </label>
            <select
              id="settings-gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="input-field"
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_say">Prefer not to say</option>
            </select>
          </div>
        </fieldset>

        {/* Physical Stats */}
        <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
          <div>
            <label htmlFor="settings-height" className="label">
              Height (cm)
            </label>
            <input
              type="number"
              step="0.1"
              id="settings-height"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label htmlFor="settings-weight" className="label">
              Current Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              id="settings-weight"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="input-field"
            />
          </div>
          {height && weight && calculateBmi(height, weight) && (
            <div className="md:col-span-2 mt-1 text-sm text-gray-600">
              Estimated BMI: <span className="font-semibold">{calculateBmi(height, weight)}</span>
              <p className="text-xs italic mt-1">Saving will record this weight and height as a new entry.</p>
            </div>
          )}
        </fieldset>

        {/* Equipment */}
        <fieldset className="border-t pt-4">
          <legend className="label mb-2">Available Equipment</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {equipmentOptions.map((equip) => (
              <label
                key={equip}
                className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={availableEquipment.includes(equip)}
                  onChange={() => handleEquipmentChange(equip)}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>{equip}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={mutation.isLoading}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {mutation.isLoading ? 'Updating...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Goals Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center border-b pb-2 mb-4">
          <h2 className="text-xl font-semibold">Your Goals</h2>
          <Link
            to="/goals/create"
            className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-medium"
          >
            Add New Goal
          </Link>
        </div>

        {userData?.goals && userData.goals.length > 0 ? (
          <div className="space-y-3">
            {userData.goals.slice(0, 3).map((goal) => (
              <div key={goal.id} className="border rounded-lg overflow-hidden">
                <div className="p-3 bg-gray-50 flex justify-between items-center">
                  <div>
                    <span className="font-medium">
                      {goal.goal_type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs capitalize ${
                        goal.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : goal.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {goal.status}
                    </span>
                  </div>
                  <Link to={`/goals/${goal.id}`} className="text-sm text-blue-600 hover:underline">
                    View Details
                  </Link>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Target:</p>
                      <p>
                        {goal.target_value} {goal.metric_type === 'weight' ? 'kg' : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">By:</p>
                      <p>{new Date(goal.target_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {goal.goal_workout_plans && goal.goal_workout_plans.length > 0 && (
                    <div className="mt-2 text-sm">
                      <p className="text-gray-500">Linked plan:</p>
                      <p>{goal.goal_workout_plans[0].workout_templates?.name || 'Custom plan'}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {userData.goals.length > 3 && (
              <div className="text-center pt-2">
                <Link to="/goals" className="text-blue-600 hover:underline text-sm">
                  View all {userData.goals.length} goals
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-3">You haven't set any fitness goals yet.</p>
            <Link
              to="/goals/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Your First Goal
            </Link>
          </div>
        )}
      </div>

      {/* Simple input field styling helper */}
      <style >{`
        .label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 4px;
        }
        .input-field {
          display: block;
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        .input-field:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
};

export default ProfileSettingsPage;
