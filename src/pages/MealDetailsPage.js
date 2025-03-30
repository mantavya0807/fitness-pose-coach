// src/pages/MealDetailsPage.js
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import useAuthStore from '../store/authStore';
import { ArrowLeft, Plus, Trash2, Edit2, AlertTriangle, Camera } from 'lucide-react';

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
          <div className="animate-spin w-10 h-10 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto mb-4"></div>
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
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          <p>Failed to load meal details: {error.message}</p>
          <button
            onClick={() => navigate('/nutrition')}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
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
        <div className="bg-yellow-50 text-yellow-700 p-4 rounded-lg border border-yellow-200">
          <p>The requested meal could not be found or you don't have permission to view it.</p>
          <button
            onClick={() => navigate('/nutrition')}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Return to Nutrition Tracker
          </button>
        </div>
      </div>
    );
  }
  
  // Calculate totals
  const totals = calculateMealTotals(meal.food_items);
  
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/nutrition')}
            className="mr-3 p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              {formatMealType(meal.meal_type)} Details
            </h1>
            <p className="text-gray-600">
              {new Date(meal.meal_date).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-red-500 hover:bg-red-50 rounded"
            title="Delete Meal"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      
      {/* Meal Summary Card */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Calories</p>
            <p className="text-2xl font-bold">{Math.round(totals.calories)}</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Protein</p>
            <p className="text-2xl font-bold">{totals.protein.toFixed(1)}g</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-gray-600">Carbs</p>
            <p className="text-2xl font-bold">{totals.carbs.toFixed(1)}g</p>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-gray-600">Fat</p>
            <p className="text-2xl font-bold">{totals.fat.toFixed(1)}g</p>
          </div>
        </div>
        
        {/* Add Food Button */}
        <button
          onClick={() => navigate(`/food-search?mealType=${meal.meal_type}`)}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-blue-700"
        >
          <Plus size={18} />
          <span>Add Food to {formatMealType(meal.meal_type)}</span>
        </button>
      </div>
      
      {/* Notes Section */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="font-semibold text-lg">Notes</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
          >
            <Edit2 size={18} />
          </button>
        </div>
        
        {isEditing ? (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md min-h-[100px]"
              placeholder="Add notes about this meal..."
            ></textarea>
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setNotes(meal.notes || '');
                }}
                className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                disabled={updateNotesMutation.isLoading}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {updateNotesMutation.isLoading ? 'Saving...' : 'Save Notes'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700">
            {meal.notes || <span className="text-gray-400 italic">No notes added yet.</span>}
          </p>
        )}
      </div>
      
      {/* Food Items List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="font-semibold text-lg p-4 border-b">Food Items</h2>
        
        {meal.food_items && meal.food_items.length > 0 ? (
          <div className="divide-y">
            {meal.food_items.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <div>
                    <div className="font-medium">{item.food_item?.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.servings} serving{item.servings !== 1 ? 's' : ''}
                      {item.food_item?.serving_size && item.food_item?.serving_unit && 
                       ` (${item.food_item.serving_size} ${item.food_item.serving_unit} each)`}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {Math.round(item.food_item?.calories_per_serving * item.servings)} cal
                      </div>
                      <div className="text-xs text-gray-500">
                        P: {(item.food_item?.protein_g * item.servings).toFixed(1)}g | 
                        C: {(item.food_item?.carbs_g * item.servings).toFixed(1)}g | 
                        F: {(item.food_item?.fat_g * item.servings).toFixed(1)}g
                      </div>
                    </div>
                    <button
                      onClick={() => removeItemMutation.mutate(item.id)}
                      disabled={removeItemMutation.isLoading}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                      title="Remove item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-2">No food items in this meal yet.</p>
            <button
              onClick={() => navigate(`/food-search?mealType=${meal.meal_type}`)}
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <Plus size={16} />
              <span>Add Food</span>
            </button>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-semibold">Delete Meal</h3>
            </div>
            <p className="mb-4 text-gray-700">
              Are you sure you want to delete this {formatMealType(meal.meal_type).toLowerCase()} and all its food items? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteMeal}
                disabled={deleteMealMutation.isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMealMutation.isLoading ? 'Deleting...' : 'Delete Meal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealDetailsPage;