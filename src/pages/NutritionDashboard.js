import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "../components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tab";
import { Progress } from "../components/ui/progress";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Camera, Calendar, MessageCircle, ChevronLeft, ChevronRight, Utensils, Upload, Clock, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { supabase } from '../supabaseClient';
import FoodCamera from '../components/nutrition/FoodCamera';
import NutritionChatbot from '../components/nutrition/NutritionChatbot';

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

// Fetch user's nutrition data for the day
const fetchDailyNutrition = async (userId, date) => {
  if (!userId) return null;
  
  try {
    // Format date as YYYY-MM-DD for query
    const formattedDate = date.toISOString().split('T')[0];
    
    // Fetch meals for the day
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select(`
        id,
        meal_type,
        meal_date,
        notes,
        total_calories,
        meal_food_items (
          id,
          food_item_id,
          servings,
          confidence,
          food_items (
            id, 
            name,
            calories_per_serving,
            protein_g,
            carbs_g,
            fat_g,
            serving_size,
            serving_unit
          )
        )
      `)
      .eq('user_id', userId)
      .eq('meal_date', formattedDate)
      .order('created_at', { ascending: true });
      
    if (mealsError) throw mealsError;
    
    // Fetch user's calorie goal
    const { data: userGoal, error: goalError } = await supabase
      .from('user_goals')
      .select('id, goal_type, target_date, status, daily_calories')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('goal_type', ['weight_loss', 'weight_maintenance', 'muscle_gain', 'general_fitness'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
    if (goalError) throw goalError;
    
    // Process meals data
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    
    const processedMeals = {
      breakfast: { items: [], calories: 0 },
      lunch: { items: [], calories: 0 },
      dinner: { items: [], calories: 0 },
      snack: { items: [], calories: 0 }
    };
    
    // Process each meal
    meals?.forEach(meal => {
      const mealType = meal.meal_type.toLowerCase();
      if (!processedMeals[mealType]) {
        processedMeals[mealType] = { items: [], calories: 0 };
      }
      
      meal.meal_food_items?.forEach(item => {
        if (!item.food_items) return;
        
        const food = item.food_items;
        const servings = item.servings || 1;
        const calories = food.calories_per_serving * servings;
        const protein = food.protein_g * servings;
        const carbs = food.carbs_g * servings;
        const fat = food.fat_g * servings;
        
        processedMeals[mealType].items.push({
          id: item.id,
          name: food.name,
          calories,
          protein,
          carbs,
          fat,
          servings,
          food_item_id: item.food_item_id
        });
        
        processedMeals[mealType].calories += calories;
        
        totalCalories += calories;
        totalProtein += protein;
        totalCarbs += carbs;
        totalFat += fat;
      });
    });
    
    // Calculate daily calorie goal based on user goal or default to 2000
    const dailyCalorieGoal = userGoal?.daily_calories || 2000;
    
    return {
      date: formattedDate,
      meals: processedMeals,
      macros: {
        protein: totalProtein,
        carbs: totalCarbs,
        fat: totalFat
      },
      dailyGoal: dailyCalorieGoal,
      consumed: totalCalories,
      userGoal
    };
  } catch (error) {
    console.error('Error fetching daily nutrition:', error);
    throw error;
  }
};

// Fetch weekly nutrition data
const fetchWeeklyData = async (userId) => {
  if (!userId) return [];
  
  try {
    // Calculate date range (7 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // Last 7 days
    
    const formattedEndDate = endDate.toISOString().split('T')[0];
    const formattedStartDate = startDate.toISOString().split('T')[0];
    
    // Fetch meals within date range
    const { data: meals, error } = await supabase
      .from('meals')
      .select('id, meal_date, total_calories')
      .eq('user_id', userId)
      .gte('meal_date', formattedStartDate)
      .lte('meal_date', formattedEndDate);
      
    if (error) throw error;
    
    // Group by date
    const dailyTotals = {};
    
    // Initialize all days in the range with 0 calories
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dayString = date.toISOString().split('T')[0];
      dailyTotals[dayString] = 0;
    }
    
    // Sum calories for each day
    meals?.forEach(meal => {
      if (meal.meal_date in dailyTotals) {
        dailyTotals[meal.meal_date] += meal.total_calories || 0;
      } else {
        dailyTotals[meal.meal_date] = meal.total_calories || 0;
      }
    });
    
    // Convert to chart format
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return Object.entries(dailyTotals).map(([dateStr, calories]) => {
      const date = new Date(dateStr);
      return {
        day: weekdays[date.getDay()],
        date: dateStr,
        calories: Math.round(calories)
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
  } catch (error) {
    console.error('Error fetching weekly data:', error);
    return [];
  }
};

// Fetch recent meals
const fetchRecentMeals = async (userId, limit = 5) => {
  if (!userId) return [];
  
  try {
    const { data, error } = await supabase
      .from('meals')
      .select(`
        id,
        meal_type,
        meal_date,
        total_calories,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching recent meals:', error);
    return [];
  }
};

// Delete a food item from a meal
const deleteFoodItem = async (mealFoodItemId) => {
  try {
    const { error } = await supabase
      .from('meal_food_items')
      .delete()
      .eq('id', mealFoodItemId);
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting food item:', error);
    throw error;
  }
};

// Component for food item in meal list
const FoodItem = ({ item, onDelete, disabled }) => {
  return (
    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md group">
      <div>
        <div className="font-medium">{item.name}</div>
        <div className="text-xs text-gray-500">
          P: {item.protein.toFixed(1)}g | C: {item.carbs.toFixed(1)}g | F: {item.fat.toFixed(1)}g
          {item.servings !== 1 && ` | ${item.servings} servings`}
        </div>
      </div>
      <div className="flex items-center">
        <div className="text-right mr-3">
          <div className="font-medium">{Math.round(item.calories)} cal</div>
        </div>
        <button
          onClick={() => onDelete(item.id)}
          disabled={disabled}
          className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-50"
          title="Remove item"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};

// Main NutritionDashboard component
const NutritionDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showChatbot, setShowChatbot] = useState(false);
  const [showFoodCamera, setShowFoodCamera] = useState(false);
  const [activeMealTab, setActiveMealTab] = useState("breakfast");
  
  // Format the current date for display
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Fetch nutrition data
  const { 
    data: nutritionData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['dailyNutrition', user?.id, currentDate.toISOString().split('T')[0]],
    queryFn: () => fetchDailyNutrition(user?.id, currentDate),
    enabled: !!user?.id,
    refetchOnWindowFocus: true,
  });
  
  // Fetch weekly data
  const { 
    data: weeklyData = [], 
    isLoading: isLoadingWeekly 
  } = useQuery({
    queryKey: ['weeklyNutrition', user?.id],
    queryFn: () => fetchWeeklyData(user?.id),
    enabled: !!user?.id,
  });
  
  // Fetch recent meals
  const { 
    data: recentMeals = [], 
    isLoading: isLoadingRecent 
  } = useQuery({
    queryKey: ['recentMeals', user?.id],
    queryFn: () => fetchRecentMeals(user?.id),
    enabled: !!user?.id,
  });
  
  // Delete food item mutation
  const deleteMutation = useMutation({
    mutationFn: deleteFoodItem,
    onSuccess: () => {
      // Invalidate and refetch nutrition data
      queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
    }
  });
  
  // Handle food item deletion
  const handleDeleteFoodItem = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item?')) {
      deleteMutation.mutate(itemId);
    }
  };

  // Next day navigation
  const handleNextDay = () => {
    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);
    if (nextDay <= new Date()) {
      setCurrentDate(nextDay);
    }
  };

  // Previous day navigation
  const handlePrevDay = () => {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);
    setCurrentDate(prevDay);
  };
  
  // Handle food camera success
  const handleFoodCameraSuccess = useCallback((result) => {
    // Refetch nutrition data when food is added
    queryClient.invalidateQueries({ queryKey: ['dailyNutrition'] });
    queryClient.invalidateQueries({ queryKey: ['weeklyNutrition'] });
    queryClient.invalidateQueries({ queryKey: ['recentMeals'] });
  }, [queryClient]);
  
  // Navigate to food search page
  const navigateToFoodSearch = (mealType) => {
    navigate(`/nutrition/search?mealType=${mealType}`);
  };

  // Calculate calorie percentage
  const caloriePercentage = nutritionData 
    ? Math.round((nutritionData.consumed / nutritionData.dailyGoal) * 100)
    : 0;
  
  // Create data for macro nutrients pie chart
  const macroData = nutritionData ? [
    { name: 'Protein', value: nutritionData.macros.protein },
    { name: 'Carbs', value: nutritionData.macros.carbs },
    { name: 'Fat', value: nutritionData.macros.fat }
  ] : [];
  
  // For displaying toast when recognition is complete
  const [recognitionComplete, setRecognitionComplete] = useState(false);
  const [recognitionSuccess, setRecognitionSuccess] = useState(false);
  const [recognitionMessage, setRecognitionMessage] = useState('');
  
  // Handle recognition success
  const handleRecognitionSuccess = (result) => {
    setRecognitionComplete(true);
    setRecognitionSuccess(true);
    setRecognitionMessage(`Added ${result.recognitionResult.foods.length} food items to your meal!`);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setRecognitionComplete(false);
    }, 3000);
    
    // Refetch data
    handleFoodCameraSuccess(result);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header with Date Navigation */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nutrition Tracker</h1>
          <p className="text-gray-500">Track your daily food intake and nutrition goals</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowFoodCamera(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            <Camera size={16} />
            <span>Scan Food</span>
          </button>
          <button onClick={() => setShowChatbot(prev => !prev)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <MessageCircle size={16} />
            <span>Nutrition Chat</span>
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-full">
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-xl font-medium">{formattedDate}</h2>
            <button 
              onClick={handleNextDay} 
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={currentDate.toDateString() === new Date().toDateString()}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-red-700">
          <h2 className="text-xl font-semibold mb-3">Error Loading Nutrition Data</h2>
          <p>{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Daily Summary */}
          <div className="space-y-6">
            {/* Daily Calories Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Calories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-2">
                  <span className="text-3xl font-bold">{Math.round(nutritionData?.consumed || 0)}</span>
                  <span className="text-xl text-gray-500"> / {nutritionData?.dailyGoal || 2000}</span>
                </div>
                <Progress value={caloriePercentage} className="h-3" />
                <div className="flex justify-between mt-2 text-sm text-gray-500">
                  <span>0</span>
                  <span>{nutritionData?.dailyGoal || 2000} cal</span>
                </div>
              </CardContent>
            </Card>

            {/* Macros Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Macronutrients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => 
                          percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''
                        }
                        labelLine={false}
                      >
                        {macroData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(1)}g`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="bg-blue-50 p-2 rounded-md">
                    <div className="text-xs text-blue-800">Protein</div>
                    <div className="font-medium">{nutritionData?.macros.protein.toFixed(1) || 0}g</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded-md">
                    <div className="text-xs text-green-800">Carbs</div>
                    <div className="font-medium">{nutritionData?.macros.carbs.toFixed(1) || 0}g</div>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded-md">
                    <div className="text-xs text-yellow-800">Fat</div>
                    <div className="font-medium">{nutritionData?.macros.fat.toFixed(1) || 0}g</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trends */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Weekly Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`${value} cal`, 'Calories']} />
                      <Bar dataKey="calories" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle & Right Columns - Meals & Recent History */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Meals */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Today's Meals</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={activeMealTab} onValueChange={setActiveMealTab}>
                  <TabsList className="grid grid-cols-4 mb-4">
                    <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
                    <TabsTrigger value="lunch">Lunch</TabsTrigger>
                    <TabsTrigger value="dinner">Dinner</TabsTrigger>
                    <TabsTrigger value="snack">Snacks</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="breakfast" className="space-y-4">
                    {nutritionData?.meals?.breakfast?.items?.length > 0 ? (
                      <>
                        {nutritionData.meals.breakfast.items.map((item, index) => (
                          <FoodItem 
                            key={item.id || index} 
                            item={item} 
                            onDelete={handleDeleteFoodItem}
                            disabled={deleteMutation.isLoading}
                          />
                        ))}
                        <div className="flex justify-between border-t pt-2 font-medium">
                          <span>Total</span>
                          <span>{Math.round(nutritionData.meals.breakfast.calories)} cal</span>
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => navigateToFoodSearch('breakfast')}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Plus size={16} />
                            <span>Add more items</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Utensils className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500">No breakfast recorded yet</p>
                        <div className="mt-4 flex justify-center gap-3">
                          <button 
                            onClick={() => navigateToFoodSearch('breakfast')}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Plus size={16} />
                            <span>Add Food</span>
                          </button>
                          <button 
                            onClick={() => {
                              setActiveMealTab('breakfast');
                              setShowFoodCamera(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                          >
                            <Camera size={16} />
                            <span>Scan Food</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="lunch" className="space-y-4">
                    {nutritionData?.meals?.lunch?.items?.length > 0 ? (
                      <>
                        {nutritionData.meals.lunch.items.map((item, index) => (
                          <FoodItem 
                            key={item.id || index} 
                            item={item} 
                            onDelete={handleDeleteFoodItem}
                            disabled={deleteMutation.isLoading}
                          />
                        ))}
                        <div className="flex justify-between border-t pt-2 font-medium">
                          <span>Total</span>
                          <span>{Math.round(nutritionData.meals.lunch.calories)} cal</span>
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => navigateToFoodSearch('lunch')}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Plus size={16} />
                            <span>Add more items</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Utensils className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500">No lunch recorded yet</p>
                        <div className="mt-4 flex justify-center gap-3">
                          <button 
                            onClick={() => navigateToFoodSearch('lunch')}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Plus size={16} />
                            <span>Add Food</span>
                          </button>
                          <button 
                            onClick={() => {
                              setActiveMealTab('lunch');
                              setShowFoodCamera(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                          >
                            <Camera size={16} />
                            <span>Scan Food</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="dinner" className="space-y-4">
                    {nutritionData?.meals?.dinner?.items?.length > 0 ? (
                      <>
                        {nutritionData.meals.dinner.items.map((item, index) => (
                          <FoodItem 
                            key={item.id || index} 
                            item={item} 
                            onDelete={handleDeleteFoodItem}
                            disabled={deleteMutation.isLoading}
                          />
                        ))}
                        <div className="flex justify-between border-t pt-2 font-medium">
                          <span>Total</span>
                          <span>{Math.round(nutritionData.meals.dinner.calories)} cal</span>
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => navigateToFoodSearch('dinner')}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Plus size={16} />
                            <span>Add more items</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Utensils className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500">No dinner recorded yet</p>
                        <div className="mt-4 flex justify-center gap-3">
                          <button 
                            onClick={() => navigateToFoodSearch('dinner')}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Plus size={16} />
                            <span>Add Food</span>
                          </button>
                          <button 
                            onClick={() => {
                              setActiveMealTab('dinner');
                              setShowFoodCamera(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                          >
                            <Camera size={16} />
                            <span>Scan Food</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="snack" className="space-y-4">
                    {nutritionData?.meals?.snack?.items?.length > 0 ? (
                      <>
                        {nutritionData.meals.snack.items.map((item, index) => (
                          <FoodItem 
                            key={item.id || index} 
                            item={item} 
                            onDelete={handleDeleteFoodItem}
                            disabled={deleteMutation.isLoading}
                          />
                        ))}
                        <div className="flex justify-between border-t pt-2 font-medium">
                          <span>Total</span>
                          <span>{Math.round(nutritionData.meals.snack.calories)} cal</span>
                        </div>
                        <div className="flex justify-end">
                          <button 
                            onClick={() => navigateToFoodSearch('snack')}
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Plus size={16} />
                            <span>Add more items</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Utensils className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                        <p className="text-gray-500">No snacks recorded yet</p>
                        <div className="mt-4 flex justify-center gap-3">
                          <button 
                            onClick={() => navigateToFoodSearch('snack')}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                          >
                            <Plus size={16} />
                            <span>Add Food</span>
                          </button>
                          <button 
                            onClick={() => {
                              setActiveMealTab('snack');
                              setShowFoodCamera(true);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2"
                          >
                            <Camera size={16} />
                            <span>Scan Food</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Recent Meals History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Recent Meals</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingRecent ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : recentMeals.length > 0 ? (
                  <div className="space-y-3">
                    {recentMeals.map((meal, index) => (
                      <div 
                        key={meal.id || index} 
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 cursor-pointer"
                        onClick={() => {
                          // Set date to this meal's date and open appropriate tab
                          const mealDate = new Date(meal.meal_date);
                          setCurrentDate(mealDate);
                          setActiveMealTab(meal.meal_type);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            meal.meal_type === 'breakfast' ? 'bg-yellow-100 text-yellow-600' :
                            meal.meal_type === 'lunch' ? 'bg-green-100 text-green-600' :
                            meal.meal_type === 'dinner' ? 'bg-blue-100 text-blue-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {meal.meal_type === 'breakfast' ? 'B' : 
                             meal.meal_type === 'lunch' ? 'L' :
                             meal.meal_type === 'dinner' ? 'D' : 'S'}
                          </div>
                          <div>
                            <div className="font-medium capitalize">{meal.meal_type}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar size={12} />
                              <span>{new Date(meal.meal_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{Math.round(meal.total_calories || 0)} cal</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No recent meals recorded</p>
                  </div>
                )}
                <button 
                  onClick={() => navigate('/nutrition/history')}
                  className="w-full mt-4 text-center text-blue-600 hover:underline"
                >
                  View All History
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Food Camera Modal */}
      {showFoodCamera && (
        <FoodCamera 
          isOpen={showFoodCamera} 
          onClose={() => setShowFoodCamera(false)}
          onSuccess={handleRecognitionSuccess}
        />
      )}

      {/* Nutrition Chatbot */}
      <NutritionChatbot 
        isOpen={showChatbot}
        onClose={() => setShowChatbot(!showChatbot)}
      />
      
      {/* Recognition Toast Notification */}
      {recognitionComplete && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg transition-opacity ${
          recognitionSuccess ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            {recognitionSuccess ? (
              <Check size={20} className="flex-shrink-0" />
            ) : (
              <X size={20} className="flex-shrink-0" />
            )}
            <p>{recognitionMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionDashboard;