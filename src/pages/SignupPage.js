// src/pages/SignupPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock } from 'lucide-react'; // Removed ArrowRight, added UserPlus
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/card";

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const { signUp, loading, error: authError } = useAuthStore();
  const navigate = useNavigate();

  // Improved password handling for immediate feedback
  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    if (confirmPassword) { // Check match only if confirm has value
        setPasswordsMatch(newPassword === confirmPassword);
    } else {
        setPasswordsMatch(true); // Reset if confirm is empty
    }
  }

  const handleConfirmPasswordChange = (e) => {
    const newConfirmPassword = e.target.value;
    setConfirmPassword(newConfirmPassword);
    setPasswordsMatch(password === newConfirmPassword);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setPasswordsMatch(false);
      return; // Stop submission if passwords don't match
    }
    setPasswordsMatch(true); // Ensure it's true before proceeding

    const signupResult = await signUp(email, password);
    // Check if the result object exists and if it has an error property
    if (signupResult && !signupResult.error) {
      alert('Signup successful! Please check your email for confirmation if enabled.');
      navigate('/login');
    }
    // Error state is handled by the store and displayed below if signupResult.error exists
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
              Create Your Account
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Join us to improve your fitness form!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email-signup" className="text-gray-700 dark:text-gray-300">Email</Label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <Input
                    type="email"
                    id="email-signup"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 w-full"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password-signup" className="text-gray-700 dark:text-gray-300">Password</Label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <Input
                    type="password"
                    id="password-signup"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    minLength={6} // Supabase default minimum
                    className="pl-10 w-full"
                    placeholder="•••••••• (min 6 characters)"
                  />
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password-signup" className="text-gray-700 dark:text-gray-300">Confirm Password</Label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 h-5 w-5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <Input
                    type="password"
                    id="confirm-password-signup"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                    minLength={6}
                    // Apply red border if passwords don't match using ring for better focus visibility
                    className={`pl-10 w-full ${!passwordsMatch && confirmPassword ? 'ring-2 ring-red-500 dark:ring-red-400 ring-offset-1' : ''}`}
                    placeholder="••••••••"
                  />
                </div>
                {!passwordsMatch && confirmPassword && ( // Show error only if confirm field has value and doesn't match
                   <p className="text-red-500 dark:text-red-400 text-xs pt-1 font-medium">Passwords do not match.</p>
                )}
              </div>

              {/* Auth Error Message */}
              {authError && (
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-red-500 dark:text-red-400 text-sm text-center font-medium"
                  >
                      {authError}
                  </motion.p>
              )}

              {/* Submit Button */}
              <div>
                <Button
                  type="submit"
                  disabled={loading || !passwordsMatch || !password || !confirmPassword || password !== confirmPassword } // More robust disable check
                  className="w-full group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-70"
                  size="lg" // Make button slightly larger
                >
                  {loading ? 'Signing up...' : 'Sign Up'}
                  {!loading && <UserPlus className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-sm text-gray-600 dark:text-gray-400 pt-4">
            Already have an account?
            <Link
              to="/login"
              className="ml-1 font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
            >
              Log in
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default SignupPage;