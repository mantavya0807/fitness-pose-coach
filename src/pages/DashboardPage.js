// src/pages/DashboardPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchDashboardData,
  formatDuration,
  getMotivationalQuote
} from '../utils/dashboardUtils';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  AlertCircle, BarChart, LineChart, PieChart, Target, Activity,
  Settings, History, PlusCircle, Dumbbell, CalendarDays, Flame,
  HeartPulse, ClipboardList, Award, TrendingUp, ArrowRight, 
  RefreshCw, User, Sparkles, Scale, Utensils, Pizza,
  Apple, Salad, ChevronRight, CheckCircle2, ListChecks, CircleDashed,
  Lightbulb, BookOpen
} from 'lucide-react';

// Dashboard components
import DashboardCharts from '../components/dashboard/DashboardCharts';
import WeeklyActivity from '../components/dashboard/WeeklyActivity';
import MuscleGroupChart from '../components/dashboard/MuscleGroupChart';
import RecentWorkoutsList from '../components/dashboard/RecentWorkoutsList';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const slideInRight = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 1 },
  visible: { 
    opacity: 1, 
    transition: { 
      staggerChildren: 0.07,
      delayChildren: 0.1
    } 
  }
};

const popIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 15 
    } 
  }
};

const statusColors = {
  "good": "text-green-500",
  "average": "text-amber-500",
  "poor": "text-red-500",
};

const DashboardPage = () => {
  const { user, profile: authProfile } = useAuthStore();
  const navigate = useNavigate();
  const [quote, setQuote] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0); // For animation resets on refresh

  // Get a motivational quote on component mount
  useEffect(() => {
    setQuote(getMotivationalQuote());
  }, []);

  // Load dashboard data with error handling
  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchDashboardData(user.id, supabase);
      setDashboardData(data);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError(err instanceof Error ? err : new Error('An unknown error occurred'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load data on component mount or when deps change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle refresh button click
  const handleRefresh = () => {
    loadData();
    setRefreshKey(prev => prev + 1);
  };

  // Helper function to get BMI category
  const getBmiCategory = (bmi) => {
    if (!bmi) return '';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  // Helper function to determine workout streak quality
  const getStreakStatus = (streak) => {
    if (!streak) return "poor";
    if (streak >= 5) return "good";
    if (streak >= 2) return "average";
    return "poor";
  };

  // Get user name for display
  const userName = dashboardData?.profile?.name || 
                  authProfile?.name || 
                  user?.email?.split('@')[0] || 
                  'Athlete';

  // === LOADING STATE ===
  if (isLoading) {
    return (
      <div className="space-y-6 p-4 md:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-10 w-32 rounded" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <Skeleton className="h-72 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
              <Skeleton className="h-64 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <Skeleton className="h-56 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-48 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
            <Skeleton className="h-40 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  // === ERROR STATE ===
  if (error) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[calc(100vh-200px)]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }} 
          animate={{ opacity: 1, scale: 1 }} 
          transition={{ duration: 0.3 }}
        >
          <Alert variant="destructive" className="max-w-lg shadow-lg border-red-300">
            <AlertCircle className="h-5 w-5" />
            <AlertTitle className="text-lg font-semibold">Error Loading Dashboard</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">There was a problem fetching your data. Please check your connection and try again.</p>
              <p className="text-xs opacity-70 font-mono bg-red-50 p-2 rounded mb-3">{error?.message || 'Unknown error'}</p>
              <div className="flex gap-3">
                <Button variant="destructive" onClick={handleRefresh} size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" /> Retry
                </Button>
                <Button variant="outline" onClick={() => navigate('/settings')} size="sm" className="gap-2">
                  <Settings className="h-4 w-4" /> Check Settings
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      </div>
    );
  }

  // === NO DATA STATE ===
  if (!dashboardData) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-200px)] text-center">
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.5 }}
          className="max-w-md"
        >
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-blue-50 rounded-full">
              <Activity className="h-12 w-12 text-blue-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Welcome to Fitness Pose Coach</h2>
          <p className="text-muted-foreground mb-6">
            It looks like you're just getting started. Complete your profile to unlock personalized tracking and recommendations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => navigate('/settings')} size="lg" className="gap-2">
              <User className="h-4 w-4" /> Complete Your Profile
            </Button>
            <Button onClick={handleRefresh} variant="outline" size="lg" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh Dashboard
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // === MAIN DASHBOARD VIEW ===
  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Page header with title and actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-3xl font-bold tracking-tight">Your Dashboard</h1>
          <p className="text-muted-foreground">Track your progress and access key features</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex gap-3"
        >
          <Button 
            onClick={() => navigate('/explore')} 
            className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md"
            size="lg"
          >
            <Dumbbell className="h-4 w-4" /> Find Exercises
          </Button>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="icon"
            className="h-10 w-10 border-gray-300"
            title="Refresh Data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>

      {/* Quick Access Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          <Button 
            onClick={() => navigate('/explore')} 
            variant="outline" 
            className="bg-gradient-to-r from-rose-50 to-rose-100 hover:from-rose-100 hover:to-rose-200 text-rose-700 border-rose-200 hover:border-rose-300 h-auto py-3 flex-col justify-center items-center gap-0.5 group shadow"
          >
            <Dumbbell className="h-5 w-5 group-hover:scale-110 transition" />
            <span className="text-xs font-medium mt-1">Exercises</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/explore')} 
            variant="outline" 
            className="bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 text-blue-700 border-blue-200 hover:border-blue-300 h-auto py-3 flex-col justify-center items-center gap-0.5 group shadow"
          >
            <Activity className="h-5 w-5 group-hover:scale-110 transition" />
            <span className="text-xs font-medium mt-1">Workouts</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/goals')} 
            variant="outline" 
            className="bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 text-amber-700 border-amber-200 hover:border-amber-300 h-auto py-3 flex-col justify-center items-center gap-0.5 group shadow"
          >
            <Target className="h-5 w-5 group-hover:animate-ping duration-1000" />
            <span className="text-xs font-medium mt-1">Your Goals</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/templates')} 
            variant="outline" 
            className="bg-gradient-to-r from-violet-50 to-violet-100 hover:from-violet-100 hover:to-violet-200 text-violet-700 border-violet-200 hover:border-violet-300 h-auto py-3 flex-col justify-center items-center gap-0.5 group shadow"
          >
            <ListChecks className="h-5 w-5 group-hover:scale-110 transition" />
            <span className="text-xs font-medium mt-1">Templates</span>
          </Button>
          
          <Button 
            onClick={() => navigate('/nutrition')} 
            variant="outline" 
            className="bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200 text-emerald-700 border-emerald-200 hover:border-emerald-300 h-auto py-3 flex-col justify-center items-center gap-0.5 group shadow"
          >
            <Utensils className="h-5 w-5 group-hover:scale-110 transition" />
            <span className="text-xs font-medium mt-1">Nutrition</span>
          </Button>
        </div>
      </motion.div>

      {/* Main content with tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={fadeIn}
        >
          <TabsList className="mb-6 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="relative">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" /> Overview
              </span>
            </TabsTrigger>
            <TabsTrigger value="goals">
              <span className="flex items-center gap-2">
                <Target className="h-4 w-4" /> Goals & Progress
              </span>
            </TabsTrigger>
            <TabsTrigger value="insights">
              <span className="flex items-center gap-2">
                <LineChart className="h-4 w-4" /> Insights
              </span>
              <span className="absolute -right-1 -top-1">
                <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 h-5 min-w-5 p-0 text-[10px] flex items-center justify-center">New</Badge>
              </span>
            </TabsTrigger>
          </TabsList>
        </motion.div>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="mt-0 space-y-6">
          {/* Welcome Banner */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`welcome-${refreshKey}`}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={slideUp}
            >
              <Card className="overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 dark:from-indigo-700 dark:to-purple-800 text-primary-foreground shadow-xl border-none">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-white">Welcome back, {userName}!</h1>
                      <p className="italic text-purple-100 dark:text-purple-200/90 mt-1 text-lg">{quote}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={() => navigate('/explore')}
                        size="lg"
                        variant="secondary"
                        className="bg-white/95 text-purple-900 hover:bg-white border-white/20 shadow-md"
                      >
                        <Dumbbell className="mr-2 h-4 w-4" /> Find Exercises
                      </Button>
                      
                      <Button
                        onClick={() => navigate('/templates')}
                        size="lg"
                        className="bg-white/20 text-white hover:bg-white/30 border-white/10 shadow-md backdrop-blur-sm"
                      >
                        <ListChecks className="mr-2 h-4 w-4" /> Browse Templates
                      </Button>
                    </div>
                  </div>
                  
                  <motion.div 
                    className="grid grid-cols-2 md:grid-cols-4 gap-4" 
                    variants={staggerContainer} 
                    initial="hidden" 
                    animate="visible"
                  >
                    {/* Workout Streak */}
                    <motion.div 
                      className="bg-white/10 dark:bg-black/10 p-4 rounded-xl backdrop-blur-sm ring-1 ring-white/10 flex flex-col justify-between min-h-[110px] relative overflow-hidden group"
                      variants={popIn}
                    >
                      <div className="absolute -right-10 -top-10 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                      <div>
                        <div className="flex items-center mb-1">
                          <CalendarDays className="h-5 w-5 mr-1.5 text-purple-200 flex-shrink-0"/>
                          <p className="text-xs uppercase tracking-wider font-medium text-purple-200 opacity-90">Workout Streak</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-4xl font-bold text-white">{dashboardData?.streak || 0}</p>
                          <p className="text-lg text-white/70">days</p>
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${statusColors[getStreakStatus(dashboardData?.streak)]} bg-black/20 w-fit mt-1`}>
                        {dashboardData?.streak >= 5 ? 'Excellent!' : dashboardData?.streak >= 2 ? 'Good progress' : 'Getting started'}
                      </div>
                    </motion.div>
                    
                    {/* Monthly Workouts */}
                    <motion.div 
                      className="bg-white/10 dark:bg-black/10 p-4 rounded-xl backdrop-blur-sm ring-1 ring-white/10 flex flex-col justify-between min-h-[110px] relative overflow-hidden group"
                      variants={popIn}
                    >
                      <div className="absolute -right-10 -top-10 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                      <div>
                        <div className="flex items-center mb-1">
                          <Activity className="h-5 w-5 mr-1.5 text-purple-200 flex-shrink-0"/>
                          <p className="text-xs uppercase tracking-wider font-medium text-purple-200 opacity-90">Total Workouts</p>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <p className="text-4xl font-bold text-white">{dashboardData?.monthWorkoutsData?.length || 0}</p>
                        </div>
                      </div>
                      <p className="text-xs text-purple-200 opacity-80">Last 30 days</p>
                    </motion.div>
                    
                    {/* Calories Burned */}
                    <motion.div 
                      className="bg-white/10 dark:bg-black/10 p-4 rounded-xl backdrop-blur-sm ring-1 ring-white/10 flex flex-col justify-between min-h-[110px] relative overflow-hidden group"
                      variants={popIn}
                    >
                      <div className="absolute -right-10 -top-10 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                      <div>
                        <div className="flex items-center mb-1">
                          <Flame className="h-5 w-5 mr-1.5 text-purple-200 flex-shrink-0"/>
                          <p className="text-xs uppercase tracking-wider font-medium text-purple-200 opacity-90">Calories Burned</p>
                        </div>
                        <p className="text-4xl font-bold text-white">
                          {dashboardData?.monthWorkoutsData?.reduce((sum, workout) => sum + (workout.calories_burned || 0), 0) || 0}
                        </p>
                      </div>
                      <p className="text-xs text-purple-200 opacity-80">Last 30 days</p>
                    </motion.div>
                    
                    {/* BMI */}
                    <motion.div 
                      className="bg-white/10 dark:bg-black/10 p-4 rounded-xl backdrop-blur-sm ring-1 ring-white/10 flex flex-col justify-between min-h-[110px] relative overflow-hidden group"
                      variants={popIn}
                    >
                      <div className="absolute -right-10 -top-10 w-24 h-24 bg-white/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                      <div>
                        <div className="flex items-center mb-1">
                          <HeartPulse className="h-5 w-5 mr-1.5 text-purple-200 flex-shrink-0"/>
                          <p className="text-xs uppercase tracking-wider font-medium text-purple-200 opacity-90">Current BMI</p>
                        </div>
                        <p className="text-4xl font-bold text-white">{dashboardData?.latestStats?.bmi || 'N/A'}</p>
                      </div>
                      {dashboardData?.latestStats?.bmi && (
                        <p className="text-xs text-purple-200 opacity-80">
                          {getBmiCategory(dashboardData.latestStats.bmi)}
                        </p>
                      )}
                    </motion.div>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Featured Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {/* Feature Card 1: Explore Exercises */}
            <motion.div variants={popIn} className="col-span-1">
              <Card className="overflow-hidden h-full border-rose-100 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-0 pt-6">
                  <div className="flex justify-between items-start">
                    <CardTitle>Exercise Library</CardTitle>
                    <div className="bg-rose-100 p-1.5 rounded-full">
                      <Dumbbell className="h-5 w-5 text-rose-700" />
                    </div>
                  </div>
                  <CardDescription>Browse our exercise collection</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-sm mb-6">
                    Explore our comprehensive library of exercises with detailed form guidance.
                  </p>
                  <Button 
                    onClick={() => navigate('/explore')} 
                    className="w-full bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-700 hover:to-pink-700 shadow"
                  >
                    Find Exercises
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature Card 2: Nutrition Tracking */}
            <motion.div variants={popIn} className="col-span-1">
              <Card className="overflow-hidden h-full border-emerald-100 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-0 pt-6">
                  <div className="flex justify-between items-start">
                    <CardTitle>Nutrition Tracking</CardTitle>
                    <div className="bg-emerald-100 p-1.5 rounded-full">
                      <Apple className="h-5 w-5 text-emerald-700" />
                    </div>
                  </div>
                  <CardDescription>Log meals & track calories</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-sm mb-6">
                    Track your daily nutrition and get personalized advice to support your fitness goals.
                  </p>
                  <Button 
                    onClick={() => navigate('/nutrition')} 
                    className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-700 hover:to-green-700 shadow"
                  >
                    Nutrition Dashboard
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Feature Card 3: Workout Templates */}
            <motion.div variants={popIn} className="col-span-1 md:col-span-2 xl:col-span-1">
              <Card className="overflow-hidden h-full border-violet-100 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader className="pb-0 pt-6">
                  <div className="flex justify-between items-start">
                    <CardTitle>Workout Templates</CardTitle>
                    <div className="bg-violet-100 p-1.5 rounded-full">
                      <ListChecks className="h-5 w-5 text-violet-700" />
                    </div>
                  </div>
                  <CardDescription>Pre-designed workout plans</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <p className="text-muted-foreground text-sm mb-6">
                    Choose from our collection of workout templates or create your own custom plan.
                  </p>
                  <Button 
                    onClick={() => navigate('/templates')} 
                    className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow"
                  >
                    Browse Templates
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Main Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Weight & BMI Tracker */}
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={slideUp}
                transition={{ delay: 0.2 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow border-blue-100 dark:border-blue-900">
                  <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-lg md:text-xl">
                        <Scale className="h-5 w-5 mr-2 text-blue-600" /> Weight & BMI Tracker
                      </CardTitle>
                      {dashboardData?.statsHistory && dashboardData.statsHistory.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => navigate('/settings')}
                          className="h-8 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          <PlusCircle className="h-3.5 w-3.5" /> Update Stats
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {dashboardData?.statsHistory && dashboardData.statsHistory.length > 0 ? (
                      <DashboardCharts statsHistory={dashboardData.statsHistory} />
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-blue-50/50 rounded-md">
                        <Scale className="h-8 w-8 text-blue-400 mb-3" />
                        <p className="text-blue-700 mb-4">No weight or BMI data recorded yet.</p>
                        <Button 
                          onClick={() => navigate('/settings')} 
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <PlusCircle className="h-4 w-4"/> Add Your Stats
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Weekly & Muscle Group Analytics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Weekly Activity */}
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={slideUp}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="shadow-md hover:shadow-lg transition-shadow h-full border-amber-100 dark:border-amber-900">
                    <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center text-lg">
                          <BarChart className="h-5 w-5 mr-2 text-amber-600" /> Weekly Activity
                        </CardTitle>
                        <Badge variant="outline" className="text-xs border-amber-200 text-amber-700 bg-amber-50">Last 7 days</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {dashboardData?.weeklyDistribution && Object.keys(dashboardData.weeklyDistribution).length > 0 ? (
                        <WeeklyActivity weeklyDistribution={dashboardData.weeklyDistribution} />
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center bg-amber-50/50 rounded-md p-4">
                          <Activity className="h-8 w-8 text-amber-400 mb-3" />
                          <p className="text-amber-700 mb-4">No activity data for this week yet.</p>
                          <Button 
                            onClick={() => navigate('/explore')} 
                            className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <Dumbbell className="h-4 w-4" /> Find Exercises
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Muscle Groups */}
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={slideUp}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="shadow-md hover:shadow-lg transition-shadow h-full border-purple-100 dark:border-purple-900">
                    <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                      <div className="flex justify-between items-center">
                        <CardTitle className="flex items-center text-lg">
                          <PieChart className="h-5 w-5 mr-2 text-purple-600" /> Muscle Groups
                        </CardTitle>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 gap-1 text-purple-700 hover:text-purple-800 hover:bg-purple-50"
                          onClick={() => navigate('/explore')}
                        >
                          Explore <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      {dashboardData?.muscleGroupData && dashboardData.muscleGroupData.length > 0 ? (
                        <MuscleGroupChart muscleGroupData={dashboardData.muscleGroupData} />
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center bg-purple-50/50 rounded-md p-4">
                          <PieChart className="h-8 w-8 text-purple-400 mb-3" />
                          <p className="text-purple-700 mb-4">No exercise data available yet.</p>
                          <Button 
                            onClick={() => navigate('/explore')} 
                            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Dumbbell className="h-4 w-4" /> Browse Exercises
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Goals Section */}
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={slideUp}
                transition={{ delay: 0.5 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow border-green-100 dark:border-green-900">
                  <CardHeader className="pb-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center text-lg md:text-xl">
                        <Target className="h-5 w-5 mr-2 text-green-600" /> Your Fitness Goals
                      </CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate('/goals')}
                        className="h-8 gap-1 border-green-200 text-green-700 hover:bg-green-50"
                      >
                        View All Goals
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {dashboardData?.activeGoals && dashboardData.activeGoals.length > 0 ? (
                      <div className="space-y-4">
                        {dashboardData.activeGoals.slice(0, 2).map((goal) => (
                          <div 
                            key={goal.id} 
                            className="bg-green-50/50 hover:bg-green-50 rounded-lg p-4 cursor-pointer transition-colors border border-green-100"
                            onClick={() => navigate(`/goals/${goal.id}`)}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-medium text-green-800">{goal.goal_type}</h3>
                                {goal.target_date && (
                                  <p className="text-sm text-green-700/70">
                                    Target: {new Date(goal.target_date).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">{goal.status}</Badge>
                            </div>
                            <Progress value={68} className="h-2 mb-2 bg-green-100" indicatorClassName="bg-green-600" />
                            <div className="flex justify-between text-sm text-green-700">
                              <span>Starting: 70kg</span>
                              <span>Current: 67kg</span>
                              <span>Target: 60kg</span>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-center pt-2">
                          <Button 
                            variant="outline" 
                            onClick={() => navigate('/goals/create')} 
                            className="gap-2 border-green-200 text-green-700 hover:bg-green-50"
                          >
                            <PlusCircle className="h-4 w-4" /> Add New Goal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center bg-green-50/30 rounded-md">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                          <Target className="h-6 w-6 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-green-800 mb-2">No Active Goals</h3>
                        <p className="text-green-700 max-w-md mb-4">
                          Setting clear goals is the first step towards fitness success.
                        </p>
                        <Button 
                          onClick={() => navigate('/goals/create')} 
                          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                          <PlusCircle className="h-4 w-4" /> Create Your First Goal
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 space-y-6">
              {/* Recent Workouts Card */}
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={slideInRight}
                transition={{ delay: 0.3 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow border-indigo-100 dark:border-indigo-900">
                  <CardHeader className="pb-2 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold flex items-center">
                        <Activity className="h-5 w-5 mr-2 text-indigo-600"/> Recent Workouts
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50" 
                        onClick={() => navigate('/history')}
                      >
                        View all <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {dashboardData?.recentWorkouts && dashboardData.recentWorkouts.length > 0 ? (
                      <RecentWorkoutsList workouts={dashboardData.recentWorkouts} />
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center text-center bg-indigo-50/50 rounded-md p-4">
                        <ClipboardList className="h-8 w-8 text-indigo-400 mb-3" />
                        <p className="text-indigo-700 mb-4">No recent workouts logged.</p>
                        <Button 
                          onClick={() => navigate('/explore')} 
                          className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                          <Dumbbell className="h-4 w-4" /> Find Exercises
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Nutrition Summary */}
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={slideInRight}
                transition={{ delay: 0.4 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow border-emerald-100 dark:border-emerald-900 overflow-hidden">
                  <CardHeader className="pb-2 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg font-semibold flex items-center">
                        <Utensils className="h-5 w-5 mr-2 text-emerald-600"/> Nutrition Summary
                      </CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1 text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50" 
                        onClick={() => navigate('/nutrition')}
                      >
                        Open <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="bg-emerald-50/50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-emerald-800 font-medium">Daily Calories</h3>
                        <span className="text-emerald-700 font-medium">1450 / 2000</span>
                      </div>
                      <Progress value={72.5} className="h-2.5 mb-1 bg-emerald-100" indicatorClassName="bg-emerald-600" />
                      <div className="flex justify-between text-xs text-emerald-700 mt-2">
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-sm">120g</span>
                          <span>Protein</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-sm">150g</span>
                          <span>Carbs</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-sm">56g</span>
                          <span>Fat</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                            <Salad className="h-4 w-4 text-amber-700" />
                          </div>
                          <span className="text-sm font-medium">Breakfast</span>
                        </div>
                        <span className="text-sm">420 cal</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <Pizza className="h-4 w-4 text-blue-700" />
                          </div>
                          <span className="text-sm font-medium">Lunch</span>
                        </div>
                        <span className="text-sm">650 cal</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                            <Utensils className="h-4 w-4 text-indigo-700" />
                          </div>
                          <span className="text-sm font-medium">Dinner</span>
                        </div>
                        <span className="text-sm">380 cal</span>
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <Button 
                      onClick={() => navigate('/nutrition')} 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" 
                      size="sm"
                    >
                      <Apple className="mr-2 h-4 w-4" /> Track Your Nutrition
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* Quick Actions Card */}
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={slideInRight}
                transition={{ delay: 0.5 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow border-blue-100 dark:border-blue-900">
                  <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                    <CardTitle className="flex items-center text-lg">
                      <Dumbbell className="h-5 w-5 mr-2 text-blue-600" /> Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <Button 
                      onClick={() => navigate('/explore')} 
                      className="w-full justify-start group shadow" 
                      size="lg"
                    >
                      <Dumbbell className="mr-2 h-4 w-4 group-hover:animate-pulse"/> Browse Exercises
                    </Button>
                    <Button 
                      onClick={() => navigate('/templates')} 
                      className="w-full justify-start group shadow" 
                      variant="outline"
                      size="lg"
                    >
                      <ListChecks className="mr-2 h-4 w-4 group-hover:animate-pulse"/> Workout Templates
                    </Button>
                    <Button 
                      onClick={() => navigate('/goals')} 
                      className="w-full justify-start group bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow" 
                      size="lg"
                    >
                      <Target className="mr-2 h-4 w-4 group-hover:animate-ping duration-1000"/> Manage Goals
                    </Button>
                    <Button 
                      onClick={() => navigate('/nutrition')} 
                      className="w-full justify-start group bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow" 
                      size="lg"
                    >
                      <Apple className="mr-2 h-4 w-4"/> Nutrition Tracker
                    </Button>
                    <Button 
                      onClick={() => navigate('/history')} 
                      className="w-full justify-start group bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow" 
                      size="lg"
                    >
                      <History className="mr-2 h-4 w-4 group-hover:rotate-[-45deg] transition-transform"/> Workout History
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* Tips Card */}
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={slideInRight}
                transition={{ delay: 0.6 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-shadow border-amber-100 dark:border-amber-900">
                  <CardHeader className="pb-2 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
                    <CardTitle className="flex items-center text-lg">
                      <Lightbulb className="h-5 w-5 mr-2 text-amber-600" /> Fitness Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                        <h3 className="font-medium text-amber-800 mb-1 flex items-center text-sm">
                          <CircleDashed className="h-4 w-4 mr-1.5 text-amber-600" /> Hydration Reminder
                        </h3>
                        <p className="text-xs text-amber-700">
                          Aim to drink at least 8 glasses of water daily. Proper hydration is essential for optimal workout performance.
                        </p>
                      </div>
                      
                      <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                        <h3 className="font-medium text-amber-800 mb-1 flex items-center text-sm">
                          <CheckCircle2 className="h-4 w-4 mr-1.5 text-amber-600" /> Rest Day Importance
                        </h3>
                        <p className="text-xs text-amber-700">
                          Don't forget to take rest days. Muscles grow during recovery, not during workouts themselves.
                        </p>
                      </div>
                      
                      <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                        <h3 className="font-medium text-amber-800 mb-1 flex items-center text-sm">
                          <BookOpen className="h-4 w-4 mr-1.5 text-amber-600" /> Workout Variety
                        </h3>
                        <p className="text-xs text-amber-700">
                          Mix up your routine to prevent plateaus. Try adding a new exercise to your routine this week.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Workout Suggestion Card */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={slideUp}
            transition={{ delay: 0.8 }}
          >
            <Card className="overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-700 dark:from-violet-700 dark:to-indigo-800 text-primary-foreground border-none shadow-xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <CardTitle className="text-xl md:text-2xl flex items-center">
                      <Sparkles className="mr-2 h-5 w-5 animate-pulse" /> Today's Recommended Workout
                    </CardTitle>
                    <CardDescription className="text-violet-200">
                      Personalized based on your goals and recent activity
                    </CardDescription>
                  </div>
                  <Badge className="bg-white/20 hover:bg-white/30 text-white border-white/10 w-fit">
                    AI-Generated
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <motion.div 
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6" 
                  variants={staggerContainer} 
                  initial="hidden" 
                  animate="visible"
                >
                  {[
                    { name: 'Push Up', detail: '3 sets x 12 reps', id: 1 },
                    { name: 'Bodyweight Squat', detail: '3 sets x 15 reps', id: 2 },
                    { name: 'Plank', detail: '3 sets x 45 seconds', id: 4 }
                  ].map((exercise) => (
                    <motion.div 
                      key={exercise.name} 
                      className="bg-white/10 dark:bg-black/10 p-4 rounded-lg ring-1 ring-white/10 hover:bg-white/20 transition-colors duration-200 cursor-pointer group"
                      onClick={() => navigate(`/exercise/${exercise.id}`)}
                      variants={popIn}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg text-white">{exercise.name}</h3>
                        <ArrowRight className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-white/80">{exercise.detail}</p>
                    </motion.div>
                  ))}
                </motion.div>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    className="bg-white text-indigo-700 hover:bg-white/90 font-semibold shadow" 
                    onClick={() => navigate('/templates')}
                    size="lg"
                  >
                    <ListChecks className="mr-2 h-4 w-4"/> Start This Workout
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white/50 text-white hover:bg-white/10 font-semibold" 
                    onClick={() => navigate('/templates')}
                  >
                    <ListChecks className="mr-2 h-4 w-4"/> View All Templates
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* GOALS & PROGRESS TAB */}
        <TabsContent value="goals" className="mt-0 space-y-6">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <Card className="shadow-lg border-green-100 dark:border-green-900 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
                <CardTitle className="flex items-center text-xl">
                  <Target className="h-5 w-5 mr-2 text-green-600" /> Your Fitness Goals
                </CardTitle>
                <CardDescription>
                  Track your fitness goals and view your progress over time
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {dashboardData?.activeGoals && dashboardData.activeGoals.length > 0 ? (
                  <div className="space-y-6">
                    {dashboardData.activeGoals.map((goal) => (
                      <div key={goal.id} className="bg-green-50 rounded-lg p-5 hover:shadow-md transition-shadow border border-green-100 cursor-pointer" onClick={() => navigate(`/goals/${goal.id}`)}>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                          <div>
                            <h3 className="font-medium text-lg text-green-800">{goal.goal_type}</h3>
                            {goal.target_date && (
                              <p className="text-sm text-green-700">
                                Target: {new Date(goal.target_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200 w-fit">{goal.status}</Badge>
                        </div>
                        <Progress value={68} className="h-3 mb-2 bg-green-200" indicatorClassName="bg-green-600" />
                        <div className="flex justify-between text-sm text-green-700 mt-2">
                          <div>
                            <span className="block text-xs text-green-600">Starting</span>
                            <span className="font-medium">70kg</span>
                          </div>
                          <div>
                            <span className="block text-xs text-green-600">Current</span>
                            <span className="font-medium">67kg</span>
                          </div>
                          <div>
                            <span className="block text-xs text-green-600">Target</span>
                            <span className="font-medium">60kg</span>
                          </div>
                        </div>
                        
                        <div className="mt-4 p-3 bg-white rounded-md border border-green-100 flex gap-2 items-start">
                          <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-medium text-gray-800">AI Suggestion</h4>
                            <p className="text-xs text-gray-600">
                              Based on your current progress, increasing protein intake and adding one more cardio session each week could help accelerate your results.
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-center pt-4">
                      <Button 
                        onClick={() => navigate('/goals/create')} 
                        className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow"
                        size="lg"
                      >
                        <PlusCircle className="h-4 w-4" /> Add New Goal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                      <Target className="h-8 w-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-medium text-green-800 mb-2">No Active Goals</h3>
                    <p className="text-green-700 max-w-md mb-6">
                      Setting clear fitness goals is the first step towards achieving real results. Create your first goal to start tracking your progress.
                    </p>
                    <Button 
                      onClick={() => navigate('/goals/create')} 
                      className="gap-2 bg-green-600 hover:bg-green-700 text-white shadow"
                      size="lg"
                    >
                      <PlusCircle className="h-4 w-4" /> Create Your First Goal
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Completed Goals Section */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideUp}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-md border-blue-100 dark:border-blue-900">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                <CardTitle className="flex items-center text-lg">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-blue-600" /> Completed Goals
                </CardTitle>
                <CardDescription>
                  Celebrate your achievements and milestones
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium text-blue-800 mb-2">No Completed Goals Yet</h3>
                  <p className="text-blue-700 max-w-md mx-auto">
                    Keep working on your active goals! Your achievements will appear here once completed.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* INSIGHTS TAB */}
        <TabsContent value="insights" className="mt-0 space-y-6">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <Card className="shadow-lg border-purple-100 dark:border-purple-900 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20">
                <CardTitle className="flex items-center text-xl">
                  <TrendingUp className="h-5 w-5 mr-2 text-purple-600" /> AI Fitness Insights
                </CardTitle>
                <CardDescription>
                  Personalized analysis of your workout patterns and progress
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-5 rounded-lg border border-blue-100 dark:border-blue-950/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-full">
                        <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg text-blue-800 dark:text-blue-300">Consistency Insight</h3>
                        <p className="text-blue-700 dark:text-blue-400 mt-1">
                          You're more likely to work out on Mondays and Wednesdays. Adding a weekend workout would help balance your routine and improve overall results.
                        </p>
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            className="border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-900/50"
                            onClick={() => navigate('/templates')}
                          >
                            <ListChecks className="mr-2 h-4 w-4" /> Find Weekend Workout
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-950/30 p-5 rounded-lg border border-green-100 dark:border-green-950/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-full">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg text-green-800 dark:text-green-300">Progress Insight</h3>
                        <p className="text-green-700 dark:text-green-400 mt-1">
                          Your upper body workouts have increased in intensity by 15% in the last month. Great progress! Consider adding more leg exercises to balance your development.
                        </p>
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            className="border-green-200 text-green-700 hover:bg-green-100 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/50"
                            onClick={() => navigate('/explore')}
                          >
                            <Dumbbell className="mr-2 h-4 w-4" /> Explore Leg Exercises
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-950/30 p-5 rounded-lg border border-purple-100 dark:border-purple-950/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-full">
                        <Dumbbell className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg text-purple-800 dark:text-purple-300">Form Analysis</h3>
                        <p className="text-purple-700 dark:text-purple-400 mt-1">
                          Your squat form has been improving consistently. Based on your last 5 sessions, your knee position and depth have shown significant improvement.
                        </p>
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            className="border-purple-200 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/50"
                            onClick={() => navigate('/exercise/2')}
                          >
                            <Dumbbell className="mr-2 h-4 w-4" /> View Squat Exercise
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Advanced Performance Metrics */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-5 rounded-lg border border-amber-100 dark:border-amber-950/50 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded-full">
                        <LineChart className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h3 className="font-medium text-lg text-amber-800 dark:text-amber-300">Advanced Metrics</h3>
                        <p className="text-amber-700 dark:text-amber-400 mt-1">
                          Your workout efficiency score is 8.2/10, which is in the top 15% of users with similar goals. Your recovery pattern suggests optimal performance on Tuesdays and Thursdays.
                        </p>
                        <div className="mt-4">
                          <Button 
                            variant="outline" 
                            className="border-amber-200 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/50"
                            onClick={() => navigate('/history')}
                          >
                            <Activity className="mr-2 h-4 w-4" /> View Detailed Analytics
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DashboardPage;