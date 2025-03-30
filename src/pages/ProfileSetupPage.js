// src/pages/ProfileSetupPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';

const ProfileSetupPage = () => {
    const { user, profile, updateProfile, loading: authLoading } = useAuthStore();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [availableEquipment, setAvailableEquipment] = useState([]);
    const [goals, setGoals] = useState([]); // Selected goal types
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const equipmentOptions = ['Bodyweight', 'Dumbbells', 'Resistance Band', 'Kettlebell', 'Barbell', 'Machine'];
    const goalOptions = ['Weight Loss', 'Muscle Gain', 'Improved Endurance', 'Better Flexibility', 'General Fitness'];

     // Pre-fill form if profile data exists (e.g., user comes back)
     useEffect(() => {
        if (profile) {
            setName(profile.name || '');
             setAvailableEquipment(profile.available_equipment || []);
            // TODO: Fetch and pre-fill physical stats and goals if they exist separately
        }
     }, [profile]);

    const handleEquipmentChange = (equip) => {
        setAvailableEquipment(prev =>
            prev.includes(equip) ? prev.filter(item => item !== equip) : [...prev, equip]
        );
    };

     const handleGoalChange = (goal) => {
        setGoals(prev =>
            prev.includes(goal) ? prev.filter(item => item !== goal) : [...prev, goal]
        );
    };


    const calculateBmi = (h_cm, w_kg) => {
        if (!h_cm || !w_kg || h_cm <= 0 || w_kg <= 0) return null;
        const h_m = h_cm / 100;
        return (w_kg / (h_m * h_m)).toFixed(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError("User not found. Please log in again.");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Update Profile table (name, available_equipment)
            const profileUpdates = { name, available_equipment: availableEquipment };
            const { error: profileError } = await updateProfile(profileUpdates); // Use store action
            if (profileError) throw profileError;

             // 2. Insert into Physical Stats table
             const bmi = calculateBmi(height, weight);
            const { error: statsError } = await supabase
                .from('physical_stats')
                .insert({
                    user_id: user.id,
                    height_cm: height ? parseFloat(height) : null,
                    weight_kg: weight ? parseFloat(weight) : null,
                    age: age ? parseInt(age) : null,
                    gender: gender || null,
                    bmi: bmi ? parseFloat(bmi) : null,
                    recorded_at: new Date().toISOString() // Record timestamp
                });
            if (statsError) throw statsError;


             // 3. Insert into User Goals table
             if (goals.length > 0) {
                 const goalInserts = goals.map(goalType => ({
                    user_id: user.id,
                    goal_type: goalType,
                    start_date: new Date().toISOString().split('T')[0], // Today's date
                    // target_date: Calculate based on selected timeline (e.g., 30/60/90 days) - add timeline state
                    status: 'active'
                 }));
                 const { error: goalsError } = await supabase
                    .from('user_goals')
                    .insert(goalInserts);
                 if (goalsError) throw goalsError;
             }

            // Navigate to dashboard on success
            navigate('/dashboard');

        } catch (err) {
            console.error("Profile setup error:", err);
            setError(err.message || "An error occurred during setup.");
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <div>Loading user data...</div>;

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6 text-center">Complete Your Profile</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                 {/* Personal Info */}
                <fieldset className="border p-4 rounded">
                    <legend className="text-lg font-semibold px-2">About You</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full input-field" placeholder="Your Name" />
                        </div>
                         <div>
                            <label htmlFor="age" className="block text-sm font-medium text-gray-700">Age</label>
                            <input type="number" id="age" value={age} onChange={(e) => setAge(e.target.value)} className="mt-1 w-full input-field" placeholder="e.g., 30" />
                        </div>
                        <div>
                            <label htmlFor="height" className="block text-sm font-medium text-gray-700">Height (cm)</label>
                            <input type="number" step="0.1" id="height" value={height} onChange={(e) => setHeight(e.target.value)} required className="mt-1 w-full input-field" placeholder="e.g., 175" />
                        </div>
                        <div>
                            <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Weight (kg)</label>
                            <input type="number" step="0.1" id="weight" value={weight} onChange={(e) => setWeight(e.target.value)} required className="mt-1 w-full input-field" placeholder="e.g., 70" />
                        </div>
                        <div>
                            <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)} className="mt-1 w-full input-field">
                                <option value="">Select...</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                                <option value="prefer_not_say">Prefer not to say</option>
                            </select>
                        </div>
                         {height && weight && calculateBmi(height, weight) && (
                            <div className="md:col-span-2 mt-2 p-2 bg-gray-50 rounded border">
                                <p className="text-sm text-gray-700">Estimated BMI: <span className="font-semibold">{calculateBmi(height, weight)}</span></p>
                                {/* TODO: Add BMI interpretation text */}
                            </div>
                        )}
                    </div>
                </fieldset>

                 {/* Goals */}
                <fieldset className="border p-4 rounded">
                    <legend className="text-lg font-semibold px-2">Fitness Goals</legend>
                     <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                         {goalOptions.map(goal => (
                            <label key={goal} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={goals.includes(goal)}
                                    onChange={() => handleGoalChange(goal)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">{goal}</span>
                            </label>
                         ))}
                    </div>
                     {/* TODO: Add Goal timeline setting (30/60/90 days) */}
                </fieldset>

                 {/* Equipment */}
                 <fieldset className="border p-4 rounded">
                    <legend className="text-lg font-semibold px-2">Available Equipment</legend>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                         {equipmentOptions.map(equip => (
                            <label key={equip} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={availableEquipment.includes(equip)}
                                    onChange={() => handleEquipmentChange(equip)}
                                     className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm">{equip}</span>
                            </label>
                         ))}
                    </div>
                 </fieldset>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button
                    type="submit"
                    disabled={isLoading || authLoading}
                    className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                    {isLoading ? 'Saving Profile...' : 'Save and Continue'}
                </button>
            </form>
             {/* Simple input field styling helper */}
            <style jsx>{`
                .input-field {
                    padding: 8px 12px;
                    border: 1px solid #D1D5DB; /* gray-300 */
                    border-radius: 0.375rem; /* rounded-md */
                    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); /* shadow-sm */
                }
                .input-field:focus {
                    outline: none;
                    border-color: #3B82F6; /* blue-500 */
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3); /* ring */
                }
            `}</style>
        </div>
    );
};
export default ProfileSetupPage;
