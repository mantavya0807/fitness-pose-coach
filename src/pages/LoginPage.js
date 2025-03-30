// src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { motion } from 'framer-motion';
import { LogIn, Mail, Lock } from 'lucide-react'; // Removed ArrowRight, added LogIn
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card"; // Added CardDescription

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { logIn, loading, error } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loginResult = await logIn(email, password); // Capture the result
    // Check if the result object itself exists and if it has an error property
    if (loginResult && !loginResult.error) {
      navigate('/dashboard'); // Redirect on successful login
    }
    // Error state is handled by the store and displayed below if loginResult.error exists
  };

  return (
    // Centering container with background gradient
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950 dark:to-black p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md" // Control the width of the card
      >
        <Card className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-gray-200 dark:border-gray-700/50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-semibold text-gray-800 dark:text-white">
              Welcome Back!
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Log in to access your fitness coach.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
                <div className="relative flex items-center"> {/* Use flex to align icon and input */}
                  <Mail className="absolute left-3 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <Input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 w-full" // Padding left for icon, ensure full width
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                <div className="relative flex items-center"> {/* Use flex to align icon and input */}
                  <Lock className="absolute left-3 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <Input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 w-full" // Padding left for icon, ensure full width
                    placeholder="••••••••"
                  />
                </div>
                {/* Forgot Password Link */}
                <div className="text-right pt-1">
                  <Link
                    to="/forgot-password" // Make sure this route exists or will be created
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                 <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 dark:text-red-400 text-sm text-center font-medium"
                  >
                      {error}
                  </motion.p>
              )}

              {/* Submit Button */}
              <div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300"
                  size="lg" // Make button slightly larger
                >
                  {loading ? 'Logging in...' : 'Log In'}
                  {!loading && <LogIn className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-sm text-gray-600 dark:text-gray-400 pt-4">
            Don't have an account?
            <Link
              to="/signup"
              className="ml-1 font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
              Sign up
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default LoginPage;