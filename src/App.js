// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './store/authStore';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';

// Auth Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ProfileSetupPage from './pages/ProfileSetupPage';

// Main Pages
import HeroPage from './pages/HeroPage';
import DashboardPage from './pages/DashboardPage';
import ExerciseExplorerPage from './pages/ExerciseExplorerPage';
import ExerciseDetailPage from './pages/ExerciseDetailPage';
import CameraViewPage from './pages/CameraViewPage';
import WorkoutHistoryPage from './pages/WorkoutHistoryPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import NotFoundPage from './pages/NotFoundPage';
import HealthImportPage from './pages/HealthImportPage';

// Template Pages
import WorkoutTemplatesPage from './pages/WorkoutTemplatesPage';
import TemplateDetailPage from './pages/TemplateDetailPage';
import TemplateCreatePage from './pages/TemplateCreatePage';

// Goal Pages
import GoalsListPage from './pages/GoalsListPage';
import GoalDetailPage from './pages/GoalDetailPage';
import GoalCreationPage from './pages/GoalCreationPage';

// Nutrition Pages
import NutritionDashboard from './pages/NutritionDashboard';
import FoodSearchPage from './pages/FoodSearchPage';
import MealDetailsPage from './pages/MealDetailsPage';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Auth Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <div>Loading authentication...</div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Profile Setup Check
const ProfileSetupCheck = ({ children }) => {
  const { user, profile, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return <div>Loading user profile...</div>;
  }

  if (user && !profile?.name) {
    return <Navigate to="/profile-setup" state={{ from: location }} replace />;
  }

  return children;
};

// App Component
function App() {
  // Force authentication check on initial load
  const { checkSession } = useAuthStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HeroPage />} />

          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route 
              path="/profile-setup" 
              element={
                <ProtectedRoute>
                  <ProfileSetupPage />
                </ProtectedRoute>
              } 
            />
          </Route>

          {/* Protected Routes */}
          <Route 
            element={
              <ProtectedRoute>
                <ProfileSetupCheck>
                  <MainLayout />
                </ProfileSetupCheck>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/explore" element={<ExerciseExplorerPage />} />
            <Route path="/exercise/:exerciseId" element={<ExerciseDetailPage />} />
            <Route path="/workout/:exerciseId/live" element={<CameraViewPage />} />
            <Route path="/history" element={<WorkoutHistoryPage />} />
            <Route path="/settings" element={<ProfileSettingsPage />} />
            <Route path="/connect/health" element={<HealthImportPage />} />
            
            {/* Templates Routes */}
            <Route path="/templates" element={<WorkoutTemplatesPage />} />
            <Route path="/templates/:templateId" element={<TemplateDetailPage />} />
            <Route path="/templates/create" element={<TemplateCreatePage />} />
            <Route path="/templates/:templateId/edit" element={<TemplateCreatePage />} />
            
            {/* Goals Routes */}
            <Route path="/goals" element={<GoalsListPage />} />
            <Route path="/goals/:goalId" element={<GoalDetailPage />} />
            <Route path="/goals/create" element={<GoalCreationPage />} />
            
            {/* Nutrition Routes */}
            <Route path="/nutrition" element={<NutritionDashboard />} />
            <Route path="/food-search" element={<FoodSearchPage />} />
            <Route path="/meal/:mealId" element={<MealDetailsPage />} />
          </Route>

          {/* Default redirect to dashboard if logged in */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            } 
          />

          {/* 404 Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;