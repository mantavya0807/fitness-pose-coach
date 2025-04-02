// src/pages/EnhancedMealDetailsPage.js
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import { ArrowLeft, Plus, Trash2, Edit2, AlertTriangle, Camera, Check, X } from 'lucide-react';
import { colors, shadows, animations } from '../styles/theme';

// Fetch meal with food items
const fetchMealDetails = async (mealId, userId) => {
  try {
    if (!mealId || !userId) return null;
    
    // Fetch the meal
    const { data: meal, error: mealError } = await supabase
      .from('meals')
      .select(`
        id,
        meal_type,
        meal_date,
        notes,
        created_at
      `)
      .eq('id', mealId)
      .eq('user_id', userId)
      .single();
      
    if (mealError) throw mealError;
    if (!meal) return null;
    
    // Fetch the food items in this meal
    const { data: foodItems, error: foodItemsError } = await supabase
      .from('meal_food_items')
      .select(`
        id,
        servings,
        food_item:food_item_id (
          id,
          name,
          calories_per_serving,
          protein_g,
          carbs_g,
          fat_g,
          serving_size,
          serving_unit,
          food_category
        )
      `)
      .eq('meal_id', mealId);
      
    if (foodItemsError) throw foodItemsError;
    
    return {
      ...meal,
      food_items: foodItems || []
    };
  } catch (error) {
    console.error('Error fetching meal details:', error);
    throw error;
  }
};

// Remove food item from meal
const removeFoodItem = async (mealFoodItemId) => {
  try {
    const { error } = await supabase
      .from('meal_food_items')
      .delete()
      .eq('id', mealFoodItemId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing food item:', error);
    throw error;
  }
};

// Update meal notes
const updateMealNotes = async ({ mealId, notes }) => {
  try {
    const { error } = await supabase
      .from('meals')
      .update({ notes })
      .eq('id', mealId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error updating meal notes:', error);
    throw error;
  }
};

// Delete entire meal
const deleteMeal = async (mealId) => {
  try {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', mealId);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting meal:', error);
    throw error;
  }
};

const MealDetailsPage = () => {
  const { mealId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  // State
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletedItems, setDeletedItems] = useState([]);
  
  // Animation variants
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
      transition: { type: "spring", stiffness: 300, damping: 30 }
    },
    exit: {
      opacity: 0,
      x: -100,
      transition: { duration: 0.2 }
    }
  };
  
  // Fetch meal details
  const { 
    data: meal, 
    isLoading, 
    error 
  } = useQuery({
    queryKey: ['mealDetails', mealId],
    queryFn: () => fetchMealDetails(mealId, user?.id),
    enabled: !!mealId && !!user?.id,
    onSuccess: (data) => {
      if (data?.notes) {
        setNotes(data.notes);
      }
    }
  });
  
  // Remove food item mutation
  const removeItemMutation = useMutation({
    mutationFn: removeFoodItem,
    onSuccess: () => {
      queryClient.invalidateQueries(['mealDetails', mealId]);
    }
  });
  
  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: updateMealNotes,
    onSuccess: () => {
      queryClient.invalidateQueries(['mealDetails', mealId]);
      setIsEditing(false);
    }
  });
  
  // Delete meal mutation
  const deleteMealMutation = useMutation({
    mutationFn: deleteMeal,
    onSuccess: () => {
      queryClient.invalidateQueries(['userMeals']);
      navigate('/nutrition');
    }
  });
  
  // Handle saving notes
  const handleSaveNotes = () => {
    if (!meal) return;
    
    updateNotesMutation.mutate({
      mealId: meal.id,
      notes
    });
  };
  
  // Handle deleting meal
  const handleDeleteMeal = () => {
    if (!meal) return;
    
    deleteMealMutation.mutate(meal.id);
  };
  
  // Handle removing a food item
  const handleRemoveFoodItem = (itemId) => {
    // Add to deleted items for animation
    setDeletedItems([...deletedItems, itemId]);
    
    // Remove after animation completes
    setTimeout(() => {
      removeItemMutation.mutate(itemId);
    }, 300);
  };
  
  // Helper to format meal type
  const formatMealType = (type) => {
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
  };
  
  // Calculate total nutrition
  const calculateMealTotals = (foodItems) => {
    if (!foodItems || foodItems.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    
    return foodItems.reduce((totals, item) => {
      const servings = item.servings || 0;
      const food = item.food_item;
      
      if (!food) return totals;
      
      return {
        calories: totals.calories + (food.calories_per_serving * servings || 0),
        protein: totals.protein + (food.protein_g * servings || 0),
        carbs: totals.carbs + (food.carbs_g * servings || 0),
        fat: totals.fat + (food.fat_g * servings || 0)
      };
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  // Get meal type styling
  const getMealTypeStyle = (type) => {
    switch(type?.toLowerCase()) {
      case 'breakfast':
        return {
          gradient: 'from-yellow-400 to-orange-500',
          lightBg: 'from-yellow-50 to-orange-50'
        };
      case 'lunch':
        return {
          gradient: 'from-green-400 to-green-600',
          lightBg: 'from-green-50 to-green-100'
        };
      case 'dinner':
        return {
          gradient: 'from-blue-400 to-blue-600',
          lightBg: 'from-blue-50 to-blue-100'
        };
      case 'snack':
        return {
          gradient: 'from-purple-400 to-purple-600',
          lightBg: 'from-purple-50 to-purple-100'
        };
      default:
        return {
          gradient: 'from-gray-400 to-gray-600',
          lightBg: 'from-gray-50 to-gray-100'
        };
    }
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/nutrition')}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Loading Meal Details...</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">Loading meal information...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/nutrition')}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Error</h1>
        </div>
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200">
          <p>Failed to load meal details: {error.message}</p>
          <button
            onClick={() => navigate('/nutrition')}
            className="mt-4 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200"
          >
            Return to Nutrition Tracker
          </button>
        </div>
      </div>
    );
  }
  
  // If meal not found
  if (!meal) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/nutrition')}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">Meal Not Found</h1>
        </div>
        <div className="bg-yellow-50 text-yellow-700 p-6 rounded-xl border border-yellow-200">
          <p>The requested meal could not be found or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/nutrition')}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Return to Nutrition Tracker
          </button>
        </div>
      </div>
    );
  }
  
  // Calculate totals
  const totals = calculateMealTotals(meal.food_items);
  
  // Get styling based on meal type
  const mealTypeStyle = getMealTypeStyle(meal.meal_type);
  
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container mx-auto p-4 max-w-3xl"
    >
      {/* Header */}
      <motion.div 
        variants={itemVariants}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center">
          <motion.button
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/nutrition')}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
          >
            <ArrowLeft size={20} />
          </motion.button>
          <div>
            <h1 className="text-2xl font-bold">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r ${mealTypeStyle.gradient}`}>
                {formatMealType(meal.meal_type)} Details
              </span>
            </h1>
            <p className="text-gray-600">
              {new Date(meal.meal_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long', 
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
        <div>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
            title="Delete Meal"
          >
            <Trash2 size={20} />
          </motion.button>
        </div>
      </motion.div>
      
      {/* Meal Summary Card */}
      <motion.div 
        variants={itemVariants}
        className="bg-white p-6 rounded-xl shadow-md mb-6"
        style={{ boxShadow: shadows.md }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`text-center p-4 rounded-xl bg-gradient-to-br ${mealTypeStyle.lightBg}`}>
            <p className="text-sm text-gray-600 mb-1">Calories</p>
            <p className="text-2xl font-bold text-gray-800">{Math.round(totals.calories)}</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100">
            <p className="text-sm text-gray-600 mb-1">Protein</p>
            <p className="text-2xl font-bold text-gray-800">{totals.protein.toFixed(1)}g</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-yellow-50 to-yellow-100">
            <p className="text-sm text-gray-600 mb-1">Carbs</p>
            <p className="text-2xl font-bold text-gray-800">{totals.carbs.toFixed(1)}g</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-gradient-to-br from-red-50 to-red-100">
            <p className="text-sm text-gray-600 mb-1">Fat</p>
            <p className="text-2xl font-bold text-gray-800">{totals.fat.toFixed(1)}g</p>
          </div>
        </div>
        
        {/* Add Food Button */}
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: shadows.lg }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate(`/nutrition/search?mealType=${meal.meal_type}`)}
          className={`w-full py-2.5 px-4 bg-gradient-to-r ${mealTypeStyle.gradient} text-white rounded-lg flex items-center justify-center gap-2 shadow-md transition-all duration-200`}
        >
          <Plus size={18} />
          <span>Add Food to {formatMealType(meal.meal_type)}</span>
        </motion.button>
      </motion.div>
      
      {/* Notes Section */}
      <motion.div 
        variants={itemVariants}
        className="bg-white p-6 rounded-xl shadow-md mb-6"
        style={{ boxShadow: shadows.md }}
      >
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold text-lg text-gray-800">Notes</h2>
          <motion.button
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsEditing(!isEditing)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-all duration-200"
          >
            <Edit2 size={18} />
          </motion.button>
        </div>
        
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] transition-all duration-200"
                placeholder="Add notes about this meal..."
              ></textarea>
              <div className="flex justify-end gap-2 mt-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsEditing(false);
                    setNotes(meal.notes || '');
                  }}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveNotes}
                  disabled={updateNotesMutation.isLoading}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
                >
                  {updateNotesMutation.isLoading ? 'Saving...' : 'Save Notes'}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="display"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-gray-700 min-h-[60px] p-2"
            >
              {meal.notes || <span className="text-gray-400 italic">No notes added yet.</span>}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Food Items List */}
      <motion.div 
        variants={itemVariants}
        className="bg-white rounded-xl shadow-md overflow-hidden"
        style={{ boxShadow: shadows.md }}
      >
        <div className={`font-semibold text-lg p-5 border-b bg-gradient-to-r ${mealTypeStyle.lightBg}`}>
          Food Items
        </div>
        
        <AnimatePresence>
          {meal.food_items && meal.food_items.length > 0 ? (
            <div className="divide-y">
              {meal.food_items.map((item) => (
                !deletedItems.includes(item.id) && (
                  <motion.div 
                    key={item.id}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-4 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex justify-between">
                      <div>
                        <div className="font-medium text-gray-800">{item.food_item?.name}</div>
                        <div className="text-sm text-gray-500">
                          {item.servings} serving{item.servings !== 1 ? 's' : ''}
                          {item.food_item?.serving_size && item.food_item?.serving_unit && 
                           ` (${item.food_item.serving_size} ${item.food_item.serving_unit} each)`}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-medium text-gray-800">
                            {Math.round(item.food_item?.calories_per_serving * item.servings)} cal
                          </div>
                          <div className="text-xs text-gray-500">
                            P: {(item.food_item?.protein_g * item.servings).toFixed(1)}g | 
                            C: {(item.food_item?.carbs_g * item.servings).toFixed(1)}g | 
                            F: {(item.food_item?.fat_g * item.servings).toFixed(1)}g
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.2, rotate: 180 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveFoodItem(item.id)}
                          disabled={removeItemMutation.isLoading}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 disabled:opacity-50"
                          title="Remove item"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )
              ))}
            </div>
          ) : (
            <motion.div 
              variants={itemVariants}
              className="p-8 text-center"
            >
              <p className="text-gray-500 mb-3">No food items in this meal yet.</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/nutrition/search?mealType=${meal.meal_type}`)}
                className="text-blue-600 hover:underline inline-flex items-center gap-1 transition-all duration-200"
              >
                <Plus size={16} />
                <span>Add Food</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 500 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              style={{ boxShadow: shadows.xl }}
            >
              <div className="flex items-center gap-3 text-red-600 mb-4">
                <AlertTriangle size={24} />
                <h3 className="text-lg font-semibold">Delete Meal</h3>
              </div>
              <p className="mb-6 text-gray-700">
                Are you sure you want to delete this {formatMealType(meal.meal_type).toLowerCase()} and all its food items? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeleteMeal}
                  disabled={deleteMealMutation.isLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors duration-200"
                >
                  {deleteMealMutation.isLoading ? 'Deleting...' : 'Delete Meal'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MealDetailsPage;