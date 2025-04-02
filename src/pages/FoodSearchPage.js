// src/pages/nutrition/EnhancedFoodSearchPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import fatSecretService from '../services/fatSecretService';
import { Search, ArrowLeft, Plus, XCircle, Loader, AlertCircle, Scan, BarChart2, Check } from 'lucide-react';
import { colors, shadows } from '../styles/theme';

// Component for adding a food item to a meal
const AddFoodModal = ({ food, isOpen, onClose, mealType, onSuccess }) => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [servings, setServings] = useState(1);
  const [selectedServing, setSelectedServing] = useState(0);
  
  // Reset state when food changes
  useEffect(() => {
    if (food && food.all_servings && food.all_servings.length > 0) {
      setSelectedServing(0);
      setServings(1);
    }
  }, [food]);

  // Add to meal mutation
  const addToMealMutation = useMutation({
    mutationFn: async ({ userId, foodData, mealType, servingIndex, servingAmount }) => {
      try {
        if (!userId || !foodData || !mealType) {
          throw new Error('Missing required information');
        }
        
        const today = new Date().toISOString().split('T')[0];
        
        // Check if food exists in our database first
        const { data: existingFoods, error: foodsError } = await supabase
          .from('food_items')
          .select('id')
          .eq('fatsecret_food_id', foodData.fatsecret_food_id)
          .maybeSingle();
          
        if (foodsError) throw foodsError;
        
        let foodItemId;
        
        if (existingFoods) {
          // Use existing food record
          foodItemId = existingFoods.id;
        } else {
          // Insert new food item
          const { data: newFood, error: insertError } = await supabase
            .from('food_items')
            .insert({
              fatsecret_food_id: foodData.fatsecret_food_id,
              name: foodData.name,
              brand: foodData.brand,
              calories_per_serving: foodData.calories_per_serving,
              protein_g: foodData.protein_g,
              carbs_g: foodData.carbs_g,
              fat_g: foodData.fat_g,
              fiber_g: foodData.fiber_g || 0,
              sugar_g: foodData.sugar_g || 0,
              sodium_mg: foodData.sodium_mg || 0,
              serving_size: foodData.serving_size,
              serving_unit: foodData.serving_unit,
              food_category: foodData.food_category
            })
            .select('id')
            .single();
            
          if (insertError) throw insertError;
          foodItemId = newFood.id;
        }
        
        // Get or create meal for today
        const { data: existingMeal, error: mealError } = await supabase
          .from('meals')
          .select('id')
          .eq('user_id', userId)
          .eq('meal_type', mealType)
          .eq('meal_date', today)
          .maybeSingle();
          
        if (mealError) throw mealError;
        
        let mealId;
        if (existingMeal) {
          mealId = existingMeal.id;
        } else {
          // Create new meal
          const { data: newMeal, error: newMealError } = await supabase
            .from('meals')
            .insert({
              user_id: userId,
              meal_type: mealType,
              meal_date: today
            })
            .select('id')
            .single();
            
          if (newMealError) throw newMealError;
          mealId = newMeal.id;
        }
        
        // Add food to meal
        const { data: mealFoodItem, error: addError } = await supabase
          .from('meal_food_items')
          .insert({
            meal_id: mealId,
            food_item_id: foodItemId,
            servings: servingAmount,
            serving_index: servingIndex // Store which serving option was used
          })
          .select('id')
          .single();
          
        if (addError) throw addError;
        
        return { success: true, mealId, foodItemId };
      } catch (error) {
        console.error('Error adding food to meal:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries(['todaysMeals', user?.id]);
      
      // Close modal and notify parent
      onSuccess && onSuccess();
      onClose && onClose();
    }
  });
  
  if (!isOpen || !food) return null;
  
  // Get current serving details
  const currentServing = food.all_servings[selectedServing] || food.all_servings[0] || {};
  
  // Calculate nutrition based on servings
  const calculateNutrition = (baseValue, multiplier) => {
    if (!baseValue) return 0;
    return (parseFloat(baseValue) * multiplier).toFixed(1);
  };

  // Modal animation variants
  const modalVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        type: "spring",
        damping: 25,
        stiffness: 500
      }
    },
    exit: { 
      opacity: 0, 
      y: 50, 
      scale: 0.95,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      } 
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={modalVariants}
        className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
        style={{ boxShadow: shadows.xl }}
      >
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-blue-50 to-indigo-50 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">{food.name}</h3>
          <motion.button 
            whileHover={{ scale: 1.1, rotate: 90 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <XCircle size={20} />
          </motion.button>
        </div>
        
        {/* Content */}
        <div className="p-5">
          {/* Brand and food type */}
          {food.brand && (
            <p className="text-sm text-gray-600 mb-3">{food.brand}</p>
          )}
          
          {/* Serving selection */}
          {food.all_servings && food.all_servings.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Serving Size
              </label>
              <select
                value={selectedServing}
                onChange={(e) => setSelectedServing(parseInt(e.target.value))}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
              >
                {food.all_servings.map((serving, index) => (
                  <option key={index} value={index}>
                    {serving.serving_description || 
                     `${serving.metric_serving_amount || serving.serving_amount || 1} ${serving.metric_serving_unit || serving.serving_unit || 'serving'}`}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Number of servings */}
          <div className="mb-5">
            <label htmlFor="num-servings" className="block text-sm font-medium text-gray-700 mb-1">
              Number of Servings
            </label>
            <input
              type="number"
              id="num-servings"
              min="0.25"
              max="10"
              step="0.25"
              value={servings}
              onChange={(e) => setServings(parseFloat(e.target.value))}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150"
            />
          </div>
          
          {/* Nutrition info */}
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
            <h4 className="font-medium mb-4 text-gray-800">Nutrition Information</h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-2 bg-white bg-opacity-60 rounded-lg shadow-sm">
                <p className="text-lg font-bold text-blue-700">
                  {calculateNutrition(currentServing.calories, servings)}
                </p>
                <p className="text-xs text-gray-600">calories</p>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-60 rounded-lg shadow-sm">
                <p className="text-lg font-bold text-green-700">
                  {calculateNutrition(currentServing.protein, servings)}g
                </p>
                <p className="text-xs text-gray-600">protein</p>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-60 rounded-lg shadow-sm">
                <p className="text-lg font-bold text-yellow-700">
                  {calculateNutrition(currentServing.carbohydrate, servings)}g
                </p>
                <p className="text-xs text-gray-600">carbs</p>
              </div>
              <div className="text-center p-2 bg-white bg-opacity-60 rounded-lg shadow-sm">
                <p className="text-lg font-bold text-red-700">
                  {calculateNutrition(currentServing.fat, servings)}g
                </p>
                <p className="text-xs text-gray-600">fat</p>
              </div>
            </div>
            
            {/* Additional nutritional info */}
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div className="p-2 bg-white bg-opacity-50 rounded-md">
                <span className="text-gray-600 font-medium">Fiber: </span>
                <span>{calculateNutrition(currentServing.fiber, servings)}g</span>
              </div>
              <div className="p-2 bg-white bg-opacity-50 rounded-md">
                <span className="text-gray-600 font-medium">Sugar: </span>
                <span>{calculateNutrition(currentServing.sugar, servings)}g</span>
              </div>
              <div className="p-2 bg-white bg-opacity-50 rounded-md">
                <span className="text-gray-600 font-medium">Sodium: </span>
                <span>{calculateNutrition(currentServing.sodium, servings)}mg</span>
              </div>
            </div>
          </div>
          
          {/* Buttons */}
          <div className="flex justify-end space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: shadows.md }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                addToMealMutation.mutate({
                  userId: user.id,
                  foodData: food,
                  mealType,
                  servingIndex: selectedServing,
                  servingAmount: servings
                });
              }}
              disabled={addToMealMutation.isLoading}
              className="px-5 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200"
            >
              {addToMealMutation.isLoading ? (
                <span className="flex items-center">
                  <Loader size={16} className="animate-spin mr-2" />
                  Adding...
                </span>
              ) : (
                `Add to ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Main component
const EnhancedFoodSearchPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get meal type from URL params
  const mealTypeParam = searchParams.get('mealType') || 'breakfast';
  
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [selectedFood, setSelectedFood] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addedFoods, setAddedFoods] = useState([]);
  
  // Automatically set search term from URL
  useEffect(() => {
    const searchQuery = searchParams.get('query');
    if (searchQuery) {
      setSearchTerm(searchQuery);
    }
  }, [searchParams]);

  // Container animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  // Popular foods query
  const { 
    data: popularFoods,
    isLoading: isLoadingPopular,
    error: popularError
  } = useQuery({
    queryKey: ['popularFoods'],
    queryFn: () => fatSecretService.getPopularFoods(),
    enabled: !searchTerm, // Only load popular foods when not searching
  });

  // Search foods query
  const { 
    data: searchResults,
    isLoading: isSearching,
    error: searchError
  } = useQuery({
    queryKey: ['searchFoods', searchTerm, page],
    queryFn: () => fatSecretService.searchFoods(searchTerm, page),
    enabled: !!searchTerm, // Only run when search term exists
  });

  // Food details query
  const { 
    data: foodDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
    refetch: refetchDetails
  } = useQuery({
    queryKey: ['foodDetails', selectedFood?.food_id],
    queryFn: () => fatSecretService.getFoodDetails(selectedFood?.food_id),
    enabled: !!selectedFood?.food_id, // Only run when a food is selected
    onSuccess: (data) => {
      if (data && data.food) {
        const processed = fatSecretService.processFoodData(data.food);
        setSelectedFood(processed);
        setShowAddModal(true);
      }
    }
  });

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      setPage(1); // Reset to first page
    }
  };

  // Handle food item click
  const handleFoodClick = (food) => {
    setSelectedFood(food);
    refetchDetails(); // Trigger fetching detailed info
  };

  // Format meal type for display
  const formatMealType = (type) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Handle successful food addition
  const handleFoodAdded = () => {
    // Update added foods list for visual feedback
    if (selectedFood) {
      setAddedFoods([...addedFoods, selectedFood.food_name || selectedFood.name]);
      
      // Show temporary success message
      setTimeout(() => {
        setAddedFoods(prev => prev.filter(name => name !== (selectedFood.food_name || selectedFood.name)));
      }, 3000);
    }
    
    // Close modal
    setShowAddModal(false);
  };

  // Get meal type background color
  const getMealTypeColor = () => {
    switch(mealTypeParam) {
      case 'breakfast': return 'from-yellow-400 to-orange-500';
      case 'lunch': return 'from-green-400 to-green-600';
      case 'dinner': return 'from-blue-400 to-blue-600';
      case 'snack': return 'from-purple-400 to-purple-600';
      default: return 'from-blue-500 to-indigo-600';
    }
  };

  // Render food items
  const renderFoodItems = (foods) => {
    if (!foods || !foods.food) return <p>No foods found</p>;

    const foodList = Array.isArray(foods.food) ? foods.food : [foods.food];
    
    return (
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="divide-y"
      >
        {foodList.map((food, index) => {
          const isAdded = addedFoods.includes(food.food_name);
          
          return (
            <motion.div
              key={food.food_id}
              variants={itemVariants}
              whileHover={{ backgroundColor: 'rgba(237, 242, 247, 0.7)' }}
              onClick={() => handleFoodClick({ food_id: food.food_id, food_name: food.food_name })}
              className={`p-4 cursor-pointer transition-all duration-200 ${
                isAdded ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-800">{food.food_name}</h3>
                  {food.brand_name && (
                    <p className="text-sm text-gray-600">{food.brand_name}</p>
                  )}
                  <p className="text-xs text-gray-500">{food.food_description}</p>
                </div>
                <div className="flex items-center">
                  <div className="text-right mr-2">
                    <p className="font-medium text-xs px-2 py-1 rounded-full bg-gray-100">{food.food_type}</p>
                  </div>
                  {isAdded ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="p-1.5 bg-green-100 text-green-600 rounded-full"
                    >
                      <Check size={16} />
                    </motion.div>
                  ) : (
                    <motion.button 
                      whileHover={{ scale: 1.2, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                      whileTap={{ scale: 0.9 }}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-all duration-200"
                    >
                      <Plus size={16} />
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto p-4 max-w-4xl"
    >
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex items-center mb-6"
      >
        <motion.button
          whileHover={{ scale: 1.1, x: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/nutrition')}
          className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </motion.button>
        <div>
          <h1 className="text-2xl font-bold">
            <span className={`bg-clip-text text-transparent bg-gradient-to-r ${getMealTypeColor()}`}>
              Add Food to {formatMealType(mealTypeParam)}
            </span>
          </h1>
          <p className="text-gray-600">Search the FatSecret database for foods to add</p>
        </div>
      </motion.div>
      
      {/* Search Bar */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white p-5 rounded-xl shadow-md mb-6"
        style={{ boxShadow: shadows.md }}
      >
        <form onSubmit={handleSearch}>
          <div className="relative">
            <motion.input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for foods..."
              className="w-full p-3 pl-10 pr-16 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              animate={{ 
                boxShadow: searchTerm ? shadows.md : shadows.sm 
              }}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="absolute inset-y-0 right-0 px-4 text-blue-600 font-medium"
            >
              Search
            </motion.button>
          </div>
        </form>
        
        {/* Additional options */}
        <div className="flex mt-3 text-sm">
          <motion.button
            whileHover={{ scale: 1.05, x: 2 }}
            className="mr-4 flex items-center text-gray-700 hover:text-blue-600 transition-colors duration-200"
            onClick={() => navigate('/nutrition/scan')}
          >
            <Scan size={15} className="mr-1" />
            <span>Scan Barcode</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, x: 2 }}
            className="flex items-center text-gray-700 hover:text-blue-600 transition-colors duration-200"
            onClick={() => navigate('/nutrition/frequent')}
          >
            <BarChart2 size={15} className="mr-1" />
            <span>My Frequent Foods</span>
          </motion.button>
        </div>
      </motion.div>
      
      {/* Food List */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-white rounded-xl shadow-md overflow-hidden"
        style={{ boxShadow: shadows.md }}
      >
        {/* Loading States */}
        {(isSearching || isLoadingPopular) && (
          <div className="p-8 text-center">
            <Loader size={24} className="animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Searching for foods...</p>
          </div>
        )}
        
        {/* Errors */}
        {(searchError || popularError) && (
          <div className="p-8 text-center">
            <AlertCircle size={24} className="mx-auto mb-4 text-red-500" />
            <p className="text-red-600">Error loading foods. Please try again.</p>
            <button 
              className="mt-2 text-blue-600 hover:underline"
              onClick={() => searchTerm ? setSearchTerm('') : null}
            >
              Reset
            </button>
          </div>
        )}
        
        {/* No search results */}
        {searchTerm && searchResults && searchResults.foods?.total_results === 0 && (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">No foods found matching "{searchTerm}"</p>
            <button 
              className="text-blue-600 hover:underline"
              onClick={() => setSearchTerm('')}
            >
              Clear search
            </button>
          </div>
        )}
        
        {/* Search Results */}
        {searchTerm && searchResults && searchResults.foods?.food && (
          <div>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <p className="text-sm text-gray-600">
                Found {searchResults.foods.total_results} results for "{searchTerm}"
                {searchResults.foods.max_results && 
                 searchResults.foods.total_results > searchResults.foods.max_results && 
                 ` (showing ${searchResults.foods.max_results})`}
              </p>
            </div>
            {renderFoodItems(searchResults.foods)}
            
            {/* Pagination */}
            {searchResults.foods.total_results > 20 && (
              <div className="p-4 flex justify-between border-t bg-gray-50">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md shadow-sm disabled:opacity-50 transition-all duration-200"
                >
                  Previous
                </motion.button>
                <span className="px-3 py-1.5 text-sm flex items-center">
                  Page {page} of {Math.ceil(searchResults.foods.total_results / 20)}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={page >= Math.ceil(searchResults.foods.total_results / 20)}
                  className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md shadow-sm disabled:opacity-50 transition-all duration-200"
                >
                  Next
                </motion.button>
              </div>
            )}
          </div>
        )}
        
        {/* Popular Foods */}
        {!searchTerm && popularFoods && popularFoods.popular_foods?.food && (
          <div>
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <p className="text-sm text-gray-600 font-medium">Popular Foods</p>
            </div>
            {renderFoodItems(popularFoods.popular_foods)}
          </div>
        )}
      </motion.div>
      
      {/* Add Food Modal */}
      <AnimatePresence>
        {selectedFood && showAddModal && (
          <AddFoodModal
            food={selectedFood}
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            mealType={mealTypeParam}
            onSuccess={handleFoodAdded}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default EnhancedFoodSearchPage;