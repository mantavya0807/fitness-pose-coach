// src/pages/ExerciseExplorerPage.js
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import ExerciseCard from '../components/exercise/ExerciseCard'; // Assuming you have an ExerciseCard component

// --- Data Fetching Hook ---
const fetchExercises = async () => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*, exercise_details(calories_per_rep)')
      .order('name', { ascending: true });

    if (error) {
      console.error("Error fetching exercises:", error);
      throw new Error(error.message);
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in fetchExercises:", error);
    throw error;
  }
};

// Fetch user equipment
const fetchUserEquipment = async (userId) => {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('available_equipment')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    return data?.available_equipment || [];
  } catch (error) {
    console.error("Error fetching user equipment:", error);
    return [];
  }
};

// --- Main Explorer Page ---
const ExerciseExplorerPage = () => {
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  
  const { user } = useAuthStore();

  // Fetch exercises data
  const { 
    data: exercises = [], 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['exercises'],
    queryFn: fetchExercises,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch user equipment
  const { 
    data: userEquipment = [] 
  } = useQuery({
    queryKey: ['userEquipment', user?.id],
    queryFn: () => fetchUserEquipment(user?.id),
    enabled: !!user?.id && showOnlyAvailable,
  });

  // Extract unique filter options from data
  const filterOptions = useMemo(() => {
    const muscleGroups = new Set();
    const equipmentTypes = new Set();
    const difficultyLevels = new Set();
    const exerciseTypes = new Set();

    exercises.forEach(ex => {
      // Handle muscle groups (may be comma-separated)
      if (ex.muscle_group) {
        ex.muscle_group.split(',').forEach(group => {
          muscleGroups.add(group.trim());
        });
      }
      
      if (ex.equipment) equipmentTypes.add(ex.equipment);
      if (ex.difficulty) difficultyLevels.add(ex.difficulty);
      if (ex.type) exerciseTypes.add(ex.type);
    });

    return {
      muscleGroups: Array.from(muscleGroups).sort(),
      equipmentTypes: Array.from(equipmentTypes).sort(),
      difficultyLevels: Array.from(difficultyLevels).sort((a, b) => {
        // Custom sort: Beginner, Intermediate, Advanced
        const order = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
        return order[a] - order[b];
      }),
      exerciseTypes: Array.from(exerciseTypes).sort(),
    };
  }, [exercises]);

  // --- Filtering Logic ---
  const filteredExercises = useMemo(() => {
    if (!exercises) return [];
    
    return exercises.filter(ex => {
      // Search term filter
      const matchesSearch = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      // Muscle group filter
      if (selectedMuscleGroup && ex.muscle_group) {
        const muscleGroups = ex.muscle_group.split(',').map(group => group.trim());
        if (!muscleGroups.includes(selectedMuscleGroup)) return false;
      }
      
      // Equipment filter
      if (selectedEquipment && ex.equipment !== selectedEquipment) return false;
      
      // Difficulty filter
      if (selectedDifficulty && ex.difficulty !== selectedDifficulty) return false;
      
      // Type filter
      if (selectedType && ex.type !== selectedType) return false;
      
      // Show only available equipment filter
      if (showOnlyAvailable && ex.equipment) {
        // If exercise requires "Bodyweight" only or no equipment, always return true
        if (ex.equipment === 'Bodyweight' || !ex.equipment) return true;
        
        // Check if user has the required equipment
        return userEquipment.includes(ex.equipment);
      }
      
      return true;
    });
  }, [
    exercises, 
    searchTerm, 
    selectedMuscleGroup, 
    selectedEquipment, 
    selectedDifficulty, 
    selectedType, 
    showOnlyAvailable,
    userEquipment
  ]);

  // Handle filter reset
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMuscleGroup('');
    setSelectedEquipment('');
    setSelectedDifficulty('');
    setSelectedType('');
    setShowOnlyAvailable(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-2">Exercise Explorer</h1>
      <p className="text-gray-600">Find the perfect exercise for your workout routine.</p>

      {/* --- Search and Filter --- */}
      <div className="sticky top-[68px] bg-gray-100 py-4 z-40 rounded-lg shadow-sm"> 
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="px-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-3 top-3 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Filter Bar */}
          <div className="px-4 flex flex-wrap gap-3">
            {/* Muscle Group Filter */}
            <select
              value={selectedMuscleGroup}
              onChange={(e) => setSelectedMuscleGroup(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Muscle Groups</option>
              {filterOptions.muscleGroups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            
            {/* Equipment Filter */}
            <select
              value={selectedEquipment}
              onChange={(e) => setSelectedEquipment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Equipment</option>
              {filterOptions.equipmentTypes.map(equipment => (
                <option key={equipment} value={equipment}>{equipment}</option>
              ))}
            </select>
            
            {/* Difficulty Filter */}
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Difficulties</option>
              {filterOptions.difficultyLevels.map(difficulty => (
                <option key={difficulty} value={difficulty}>{difficulty}</option>
              ))}
            </select>
            
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Types</option>
              {filterOptions.exerciseTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            {/* Available Equipment Toggle */}
            {user && (
              <label className="inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-md text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyAvailable}
                  onChange={() => setShowOnlyAvailable(!showOnlyAvailable)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                My Equipment Only
              </label>
            )}
            
            {/* Reset Filters */}
            <button
              onClick={resetFilters}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md text-sm hover:bg-gray-300 transition"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* --- Exercise Grid --- */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading exercises...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <p className="font-medium">Error loading exercises:</p>
          <p>{error.message}</p>
        </div>
      )}
      
      {!isLoading && !error && (
        filteredExercises.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xl text-gray-600 mb-2">No exercises found matching your criteria.</p>
            <button
              onClick={resetFilters}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">Showing {filteredExercises.length} exercises</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredExercises.map(exercise => (
                <ExerciseCard key={exercise.id} exercise={exercise} userEquipment={userEquipment} />
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default ExerciseExplorerPage;