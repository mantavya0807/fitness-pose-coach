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
import { motion, AnimatePresence } from 'framer-motion'; 
import { colors, animations, shadows } from '../styles/theme';

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      layout
      className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md group transition-all duration-200"
      style={{ boxShadow: shadows.sm }}
    >
      <div>
        <div className="font-medium">{item.name}</div>
        <div className="text-xs text-gray-500">
          P: {item.protein.toFixed(1)}g | C: {item.carbs.toFixed(1)}g | F: {item.fat.toFixed(1)}g
          {item.servings !== 1 && ` | ${item.servings} servings`}
        </div>
      </div>
      <div className="flex items-center">
        <div className="text-right mr-3">
          <div className="font-medium text-blue-600">{Math.round(item.calories)} cal</div>
        </div>
        <motion.button
          whileHover={{ scale: 1.2, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onDelete(item.id)}
          disabled={disabled}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 disabled:opacity-50"
          title="Remove item"
        >
          <Trash2 size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
};

// Main NutritionDashboard component
const NutritionDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State
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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1
      }
    }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
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
    // Show success message
    setRecognitionComplete(true);
    setRecognitionSuccess(true);
    setRecognitionMessage(`Added ${result.recognitionResult.foods.length} food items to your meal!`);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setRecognitionComplete(false);
    }, 3000);
    
    // Refetch nutrition data
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
  
  // Colors for charts
  const COLORS = [colors.primary[500], colors.accent.green.base, colors.accent.orange.base];
  
  // For displaying toast when recognition is complete
  const [recognitionComplete, setRecognitionComplete] = useState(false);
  const [recognitionSuccess, setRecognitionSuccess] = useState(false);
  const [recognitionMessage, setRecognitionMessage] = useState('');

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="container mx-auto p-4 space-y-6"
    >
      {/* Header with Date Navigation */}
      <motion.div 
        variants={itemVariants}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Nutrition Tracker
          </h1>
          <p className="text-gray-500">Track your daily food intake and nutrition goals</p>
        </div>
        <div className="flex items-center gap-4">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFoodCamera(true)} 
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-md hover:shadow-md transition-all duration-300"
            style={{ boxShadow: shadows.md }}
          >
            <Camera size={16} />
            <span>Scan Food</span>
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowChatbot(prev => !prev)} 
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-md hover:shadow-md transition-all duration-300"
            style={{ boxShadow: shadows.md }}
          >
            <MessageCircle size={16} />
            <span>Nutrition Chat</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Date Navigation */}
      <motion.div 
        variants={itemVariants}
        className="bg-white rounded-xl shadow-md overflow-hidden"
        style={{ boxShadow: shadows.md }}
      >
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex justify-between items-center">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevDay} 
              className="p-2 hover:bg-white rounded-full transition-colors duration-200"
            >
              <ChevronLeft size={20} className="text-blue-600" />
            </motion.button>
            <h2 className="text-xl font-medium text-gray-800 flex items-center">
              <Calendar size={18} className="mr-2 text-blue-500" />
              {formattedDate}
            </h2>
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNextDay} 
              className="p-2 hover:bg-white rounded-full transition-colors duration-200"
              disabled={currentDate.toDateString() === new Date().toDateString()}
            >
              <ChevronRight size={20} className={currentDate.toDateString() === new Date().toDateString() ? "text-gray-300" : "text-blue-600"} />
            </motion.button>
          </div>
        </div>
      </motion.div>

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
          <motion.div variants={itemVariants} className="space-y-6">
            {/* Daily Calories Progress */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300" style={{ boxShadow: shadows.md }}>
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-lg font-medium text-gray-800">Calories</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    {Math.round(nutritionData?.consumed || 0)}
                  </span>
                  <span className="text-xl text-gray-500"> / {nutritionData?.dailyGoal || 2000}</span>
                </div>
                <Progress 
                  value={caloriePercentage} 
                  className="h-3 rounded-full bg-gray-100" 
                  style={{ 
                    background: `linear-gradient(to right, ${colors.primary[500]} ${caloriePercentage}%, ${colors.gray[200]} ${caloriePercentage}%)`,
                    transition: 'all 0.5s ease' 
                  }}
                />
                <div className="flex justify-between mt-3 text-sm text-gray-500">
                  <span>0</span>
                  <span>{nutritionData?.dailyGoal || 2000} cal</span>
                </div>
              </CardContent>
            </Card>

            {/* Macros Distribution */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300" style={{ boxShadow: shadows.md }}>
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-lg font-medium text-gray-800">Macronutrients</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
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
                        animationDuration={1000}
                        animationBegin={0}
                        animationEasing="ease-out"
                      >
                        {macroData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value.toFixed(1)}g`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg">
                    <div className="text-xs text-blue-800 font-medium">Protein</div>
                    <div className="font-medium text-blue-900">{nutritionData?.macros.protein.toFixed(1) || 0}g</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg">
                    <div className="text-xs text-green-800 font-medium">Carbs</div>
                    <div className="font-medium text-green-900">{nutritionData?.macros.carbs.toFixed(1) || 0}g</div>
                  </div>
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-3 rounded-lg">
                    <div className="text-xs text-yellow-800 font-medium">Fat</div>
                    <div className="font-medium text-yellow-900">{nutritionData?.macros.fat.toFixed(1) || 0}g</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trends */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300" style={{ boxShadow: shadows.md }}>
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-lg font-medium text-gray-800">Weekly Trends</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="day" 
                        axisLine={false}
                        tickLine={false}
                        stroke="#888"
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        stroke="#888"
                      />
                      <Tooltip
                        formatter={(value) => [`${value} cal`, 'Calories']}
                        labelFormatter={(day) => `${day}`}
                        contentStyle={{
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: shadows.lg
                        }}
                      />
                      <Bar 
                        dataKey="calories" 
                        fill={colors.primary[500]}
                        radius={[4, 4, 0, 0]}
                        animationDuration={1000}
                        animationBegin={300}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Middle & Right Columns - Meals */}
          <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
            {/* Today's Meals */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300" style={{ boxShadow: shadows.md }}>
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-lg font-medium text-gray-800">Today's Meals</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <Tabs value={activeMealTab} onValueChange={setActiveMealTab}>
                  <TabsList className="grid grid-cols-4 mb-6 bg-gray-100 p-1 rounded-lg">
                    <TabsTrigger 
                      value="breakfast"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-md transition-all duration-200"
                    >
                      Breakfast
                    </TabsTrigger>
                    <TabsTrigger 
                      value="lunch"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-md transition-all duration-200"
                    >
                      Lunch
                    </TabsTrigger>
                    <TabsTrigger 
                      value="dinner"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-md transition-all duration-200"
                    >
                      Dinner
                    </TabsTrigger>
                    <TabsTrigger 
                      value="snack"
                      className="data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md rounded-md transition-all duration-200"
                    >
                      Snacks
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Breakfast Tab Content */}
                  <TabsContent value="breakfast" className="space-y-4">
                    <AnimatePresence>
                      {nutritionData?.meals?.breakfast?.items?.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="space-y-3">
                            {nutritionData.meals.breakfast.items.map((item, index) => (
                              <FoodItem 
                                key={item.id || index} 
                                item={item} 
                                onDelete={handleDeleteFoodItem}
                                disabled={deleteMutation.isLoading}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between border-t pt-3 font-medium mt-4">
                            <span>Total</span>
                            <span className="text-blue-600">{Math.round(nutritionData.meals.breakfast.calories)} cal</span>
                          </div>
                          <div className="flex justify-end mt-2">
                            <motion.button 
                              whileHover={{ scale: 1.05, x: 5 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => navigateToFoodSearch('breakfast')}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors duration-200"
                            >
                              <Plus size={16} />
                              <span>Add more items</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-center py-10 bg-gradient-to-b from-gray-50 to-white rounded-lg"
                        >
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Utensils className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 mb-6">No breakfast recorded yet</p>
                            <div className="flex justify-center gap-4">
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigateToFoodSearch('breakfast')}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors duration-200 shadow-md"
                              >
                                <Plus size={16} />
                                <span>Add Food</span>
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setActiveMealTab('breakfast');
                                  setShowFoodCamera(true);
                                }}
                                className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center gap-2 shadow-md"
                              >
                                <Camera size={16} />
                                <span>Scan Food</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                  
                  {/* Lunch Tab Content */}
                  <TabsContent value="lunch" className="space-y-4">
                    <AnimatePresence>
                      {nutritionData?.meals?.lunch?.items?.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="space-y-3">
                            {nutritionData.meals.lunch.items.map((item, index) => (
                              <FoodItem 
                                key={item.id || index} 
                                item={item} 
                                onDelete={handleDeleteFoodItem}
                                disabled={deleteMutation.isLoading}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between border-t pt-3 font-medium mt-4">
                            <span>Total</span>
                            <span className="text-blue-600">{Math.round(nutritionData.meals.lunch.calories)} cal</span>
                          </div>
                          <div className="flex justify-end mt-2">
                            <motion.button 
                              whileHover={{ scale: 1.05, x: 5 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => navigateToFoodSearch('lunch')}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors duration-200"
                            >
                              <Plus size={16} />
                              <span>Add more items</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-center py-10 bg-gradient-to-b from-gray-50 to-white rounded-lg"
                        >
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Utensils className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 mb-6">No lunch recorded yet</p>
                            <div className="flex justify-center gap-4">
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigateToFoodSearch('lunch')}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors duration-200 shadow-md"
                              >
                                <Plus size={16} />
                                <span>Add Food</span>
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setActiveMealTab('lunch');
                                  setShowFoodCamera(true);
                                }}
                                className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center gap-2 shadow-md"
                              >
                                <Camera size={16} />
                                <span>Scan Food</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                  
                  {/* Dinner Tab Content */}
                  <TabsContent value="dinner" className="space-y-4">
                    <AnimatePresence>
                      {nutritionData?.meals?.dinner?.items?.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="space-y-3">
                            {nutritionData.meals.dinner.items.map((item, index) => (
                              <FoodItem 
                                key={item.id || index} 
                                item={item} 
                                onDelete={handleDeleteFoodItem}
                                disabled={deleteMutation.isLoading}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between border-t pt-3 font-medium mt-4">
                            <span>Total</span>
                            <span className="text-blue-600">{Math.round(nutritionData.meals.dinner.calories)} cal</span>
                          </div>
                          <div className="flex justify-end mt-2">
                            <motion.button 
                              whileHover={{ scale: 1.05, x: 5 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => navigateToFoodSearch('dinner')}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors duration-200"
                            >
                              <Plus size={16} />
                              <span>Add more items</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-center py-10 bg-gradient-to-b from-gray-50 to-white rounded-lg"
                        >
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Utensils className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 mb-6">No dinner recorded yet</p>
                            <div className="flex justify-center gap-4">
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigateToFoodSearch('dinner')}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors duration-200 shadow-md"
                              >
                                <Plus size={16} />
                                <span>Add Food</span>
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setActiveMealTab('dinner');
                                  setShowFoodCamera(true);
                                }}
                                className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center gap-2 shadow-md"
                              >
                                <Camera size={16} />
                                <span>Scan Food</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                  
                  {/* Snack Tab Content */}
                  <TabsContent value="snack" className="space-y-4">
                    <AnimatePresence>
                      {nutritionData?.meals?.snack?.items?.length > 0 ? (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <div className="space-y-3">
                            {nutritionData.meals.snack.items.map((item, index) => (
                              <FoodItem 
                                key={item.id || index} 
                                item={item} 
                                onDelete={handleDeleteFoodItem}
                                disabled={deleteMutation.isLoading}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between border-t pt-3 font-medium mt-4">
                            <span>Total</span>
                            <span className="text-blue-600">{Math.round(nutritionData.meals.snack.calories)} cal</span>
                          </div>
                          <div className="flex justify-end mt-2">
                            <motion.button 
                              whileHover={{ scale: 1.05, x: 5 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => navigateToFoodSearch('snack')}
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors duration-200"
                            >
                              <Plus size={16} />
                              <span>Add more items</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="text-center py-10 bg-gradient-to-b from-gray-50 to-white rounded-lg"
                        >
                          <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                          >
                            <Utensils className="mx-auto h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-gray-500 mb-6">No snacks recorded yet</p>
                            <div className="flex justify-center gap-4">
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => navigateToFoodSearch('snack')}
                                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors duration-200 shadow-md"
                              >
                                <Plus size={16} />
                                <span>Add Food</span>
                              </motion.button>
                              <motion.button 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => {
                                  setActiveMealTab('snack');
                                  setShowFoodCamera(true);
                                }}
                                className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center gap-2 shadow-md"
                              >
                                <Camera size={16} />
                                <span>Scan Food</span>
                              </motion.button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Recent Meals History */}
            <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300" style={{ boxShadow: shadows.md }}>
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                <CardTitle className="text-lg font-medium text-gray-800">Recent Meals</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingRecent ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                ) : recentMeals.length > 0 ? (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {recentMeals.map((meal, index) => (
                        <motion.div 
                          key={meal.id || index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex justify-between items-center p-3 bg-white rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
                          onClick={() => {
                            // Set date to this meal's date and open appropriate tab
                            const mealDate = new Date(meal.meal_date);
                            setCurrentDate(mealDate);
                            setActiveMealTab(meal.meal_type);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              meal.meal_type === 'breakfast' ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white' :
                              meal.meal_type === 'lunch' ? 'bg-gradient-to-br from-green-400 to-green-500 text-white' :
                              meal.meal_type === 'dinner' ? 'bg-gradient-to-br from-blue-400 to-blue-600 text-white' :
                              'bg-gradient-to-br from-purple-400 to-purple-600 text-white'
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
                            <div className="font-medium text-blue-600">{Math.round(meal.total_calories || 0)} cal</div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No recent meals recorded</p>
                  </div>
                )}
                <motion.button 
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/nutrition/history')}
                  className="w-full mt-6 text-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  View All History
                </motion.button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Food Camera Modal */}
      {showFoodCamera && (
        <FoodCamera 
          isOpen={showFoodCamera} 
          onClose={() => setShowFoodCamera(false)}
          onSuccess={handleFoodCameraSuccess}
          currentMealType={activeMealTab}
        />
      )}

      {/* Nutrition Chatbot */}
      <NutritionChatbot 
        isOpen={showChatbot}
        onClose={() => setShowChatbot(!showChatbot)}
      />
      
      {/* Recognition Toast Notification */}
      <AnimatePresence>
        {recognitionComplete && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
              recognitionSuccess ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
            }`}
            style={{ boxShadow: shadows.lg }}
          >
            <div className="flex items-center gap-2">
              {recognitionSuccess ? (
                <Check size={20} className="flex-shrink-0" />
              ) : (
                <X size={20} className="flex-shrink-0" />
              )}
              <p>{recognitionMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NutritionDashboard;