// src/pages/ExerciseExplorerPage.js
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import ExerciseCard from '../components/exercise/ExerciseCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ArrowUp, Check, Dumbbell } from 'lucide-react';

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
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const { user } = useAuthStore();

  // Handle scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.pageYOffset);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
  
  // Check if any filters are active
  const areFiltersActive = selectedMuscleGroup || selectedEquipment || selectedDifficulty || selectedType || showOnlyAvailable;

  // Animation variants for framer-motion
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section with Parallax Effect */}
      <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-500 text-white">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url('/images/pattern-bg.svg')`,
            backgroundSize: 'cover',
            transform: `translateY(${scrollPosition * 0.4}px)`
          }}
        ></div>
        <div 
          className="absolute bottom-0 right-0 opacity-30"
          style={{
            backgroundImage: `url('/images/fitness-silhouette.svg')`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'bottom right',
            width: '40%',
            height: '90%',
            transform: `translateX(${scrollPosition * 0.2}px)`
          }}
        ></div>
        <div className="container mx-auto px-4 py-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight drop-shadow-sm">
              Find Your Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 to-cyan-200">Workout</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-2xl">
              Browse through our comprehensive exercise library to discover new workouts tailored to your fitness goals.
            </p>
            <div className="relative max-w-xl">
              <input
                type="text"
                placeholder="Search exercises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={`w-full p-4 pl-12 pr-4 rounded-xl text-gray-700 shadow-lg ring-4 transition-all ${
                  isSearchFocused ? 'ring-purple-300' : 'ring-transparent'
                } focus:outline-none focus:ring-purple-300`}
              />
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors ${
                isSearchFocused ? 'text-purple-600' : 'text-gray-400'
              }`} size={20} />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </motion.div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-indigo-50 to-transparent"></div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filter Bar - Desktop */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="sticky top-[68px] z-40 hidden md:block"
        >
          <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <Filter className="mr-2 text-purple-600" size={20} />
                Filters
              </h2>
              {areFiltersActive && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={resetFilters}
                  className="text-sm px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-all flex items-center"
                >
                  <X size={16} className="mr-1" />
                  Reset Filters
                </motion.button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {/* Muscle Group Filter */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Muscle Group</label>
                <select
                  value={selectedMuscleGroup}
                  onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white appearance-none pl-3 pr-10 text-gray-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">All Muscle Groups</option>
                  {filterOptions.muscleGroups.map(group => (
                    <option key={group} value={group}>{group}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-3 pointer-events-none text-gray-400">
                  <ArrowUp size={16} className="transform rotate-180" />
                </div>
              </div>
              
              {/* Equipment Filter */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Equipment</label>
                <select
                  value={selectedEquipment}
                  onChange={(e) => setSelectedEquipment(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white appearance-none pl-3 pr-10 text-gray-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">All Equipment</option>
                  {filterOptions.equipmentTypes.map(equipment => (
                    <option key={equipment} value={equipment}>{equipment}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-3 pointer-events-none text-gray-400">
                  <ArrowUp size={16} className="transform rotate-180" />
                </div>
              </div>
              
              {/* Difficulty Filter */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Difficulty</label>
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white appearance-none pl-3 pr-10 text-gray-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">All Difficulties</option>
                  {filterOptions.difficultyLevels.map(difficulty => (
                    <option key={difficulty} value={difficulty}>{difficulty}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-3 pointer-events-none text-gray-400">
                  <ArrowUp size={16} className="transform rotate-180" />
                </div>
              </div>
              
              {/* Type Filter */}
              <div className="relative">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Exercise Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg bg-white appearance-none pl-3 pr-10 text-gray-700 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                >
                  <option value="">All Types</option>
                  {filterOptions.exerciseTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 top-5 flex items-center pr-3 pointer-events-none text-gray-400">
                  <ArrowUp size={16} className="transform rotate-180" />
                </div>
              </div>
              
              {/* Available Equipment Toggle */}
              {user && (
                <div className="flex items-end">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showOnlyAvailable}
                      onChange={() => setShowOnlyAvailable(!showOnlyAvailable)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-700">My Equipment Only</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Mobile Filter Button */}
        <div className="md:hidden sticky top-[68px] z-40 flex justify-end mb-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowMobileFilters(true)}
            className="bg-white shadow-lg rounded-full p-3 flex items-center space-x-2 text-purple-700"
          >
            <Filter size={18} />
            <span>Filters</span>
            {areFiltersActive && (
              <span className="bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                !
              </span>
            )}
          </motion.button>
        </div>

        {/* Mobile Filters Slide-in Panel */}
        <AnimatePresence>
          {showMobileFilters && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween' }}
              className="fixed inset-0 z-50 md:hidden"
            >
              <div className="absolute inset-0 bg-gray-900 bg-opacity-50" onClick={() => setShowMobileFilters(false)}></div>
              <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                  <h3 className="text-lg font-bold">Filters</h3>
                  <button onClick={() => setShowMobileFilters(false)} className="p-2 rounded-full hover:bg-gray-100">
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto flex-grow">
                  {/* Muscle Group Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Muscle Group</label>
                    <select
                      value={selectedMuscleGroup}
                      onChange={(e) => setSelectedMuscleGroup(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-700"
                    >
                      <option value="">All Muscle Groups</option>
                      {filterOptions.muscleGroups.map(group => (
                        <option key={group} value={group}>{group}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Equipment Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Equipment</label>
                    <select
                      value={selectedEquipment}
                      onChange={(e) => setSelectedEquipment(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-700"
                    >
                      <option value="">All Equipment</option>
                      {filterOptions.equipmentTypes.map(equipment => (
                        <option key={equipment} value={equipment}>{equipment}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Difficulty Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Difficulty</label>
                    <select
                      value={selectedDifficulty}
                      onChange={(e) => setSelectedDifficulty(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-700"
                    >
                      <option value="">All Difficulties</option>
                      {filterOptions.difficultyLevels.map(difficulty => (
                        <option key={difficulty} value={difficulty}>{difficulty}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Type Filter */}
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Exercise Type</label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-700"
                    >
                      <option value="">All Types</option>
                      {filterOptions.exerciseTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Available Equipment Toggle */}
                  {user && (
                    <div className="pt-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showOnlyAvailable}
                          onChange={() => setShowOnlyAvailable(!showOnlyAvailable)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        <span className="ml-3 text-sm font-medium text-gray-700">My Equipment Only</span>
                      </label>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t flex space-x-2">
                  <button
                    onClick={resetFilters}
                    className="flex-1 py-3 border border-gray-300 rounded-lg text-gray-700"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Filters Pills */}
        {areFiltersActive && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            {selectedMuscleGroup && (
              <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center">
                <span>Muscle: {selectedMuscleGroup}</span>
                <button 
                  onClick={() => setSelectedMuscleGroup('')}
                  className="ml-2 p-1 hover:bg-purple-200 rounded-full"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            {selectedEquipment && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center">
                <span>Equipment: {selectedEquipment}</span>
                <button 
                  onClick={() => setSelectedEquipment('')}
                  className="ml-2 p-1 hover:bg-blue-200 rounded-full"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            {selectedDifficulty && (
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                <span>Difficulty: {selectedDifficulty}</span>
                <button 
                  onClick={() => setSelectedDifficulty('')}
                  className="ml-2 p-1 hover:bg-green-200 rounded-full"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            {selectedType && (
              <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm flex items-center">
                <span>Type: {selectedType}</span>
                <button 
                  onClick={() => setSelectedType('')}
                  className="ml-2 p-1 hover:bg-yellow-200 rounded-full"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            {showOnlyAvailable && (
              <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center">
                <span>My Equipment Only</span>
                <button 
                  onClick={() => setShowOnlyAvailable(false)}
                  className="ml-2 p-1 hover:bg-indigo-200 rounded-full"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Exercise Grid */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center">
            <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-xl text-gray-600">Finding the perfect exercises for you...</p>
          </div>
        )}
        
        {error && (
          <div className="py-10 px-4 bg-red-50 rounded-xl border border-red-200 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-bold text-red-800 mb-2">Error Loading Exercises</h3>
            <p className="text-red-700 mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-lg"
            >
              Try Again
            </button>
          </div>
        )}
        
        {!isLoading && !error && (
          filteredExercises.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 px-6 bg-white rounded-xl shadow-lg text-center"
            >
              <Dumbbell className="w-20 h-20 mx-auto text-gray-300 mb-4" />
              <h3 className="text-2xl font-bold text-gray-800 mb-3">No exercises found</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-8">
                We couldn't find any exercises matching your current filters. Try adjusting your search or filter criteria.
              </p>
              <button
                onClick={resetFilters}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition shadow-lg"
              >
                Reset All Filters
              </button>
            </motion.div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <p className="text-lg text-gray-700 font-medium">
                  Found <span className="text-purple-700 font-bold">{filteredExercises.length}</span> exercises
                </p>
                <div className="flex items-center text-sm text-gray-500">
                  <Check className="w-4 h-4 mr-1 text-green-500" />
                  <span>Click on any exercise to view details</span>
                </div>
              </div>
              
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12"
              >
                {filteredExercises.map(exercise => (
                  <motion.div
                    key={exercise.id}
                    variants={itemVariants}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                  >
                    <ExerciseCard exercise={exercise} userEquipment={userEquipment} />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          )
        )}
      </div>

      {/* Back to Top Button */}
      {scrollPosition > 500 && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-3 bg-purple-600 text-white rounded-full shadow-lg z-30"
        >
          <ArrowUp size={24} />
        </motion.button>
      )}
    </div>
  );
};

export default ExerciseExplorerPage;