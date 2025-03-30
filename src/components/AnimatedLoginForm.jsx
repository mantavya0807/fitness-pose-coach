import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useRive,
  Layout,
  Fit,
  Alignment,
  useStateMachineInput,
} from 'rive-react';

const STATE_MACHINE_NAME = 'State Machine 1';

export default function AnimatedLoginForm({ 
  onSubmit, 
  error, 
  loading = false,
  onForgotPassword 
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { rive: riveInstance, RiveComponent } = useRive({
    src: 'a_violet_bear.riv',
    stateMachines: STATE_MACHINE_NAME,
    autoplay: true,
    layout: new Layout({
      fit: Fit.Cover,
      alignment: Alignment.Center,
    }),
  });

  const lookDownInput = useStateMachineInput(riveInstance, STATE_MACHINE_NAME, 'Look_down');
  const handsUpInput = useStateMachineInput(riveInstance, STATE_MACHINE_NAME, 'hands_up');
  const successInput = useStateMachineInput(riveInstance, STATE_MACHINE_NAME, 'success');
  const failInput = useStateMachineInput(riveInstance, STATE_MACHINE_NAME, 'fail');
  const checkInput = useStateMachineInput(riveInstance, STATE_MACHINE_NAME, 'Check');
  const emailInput = useStateMachineInput(riveInstance, STATE_MACHINE_NAME, 'Look_down');

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    try {
      if (emailInput) {
        emailInput.fire();
      }
    } catch (err) {
      console.warn('Failed to trigger email input animation:', err);
    }
  };

  const handlePasswordFocus = (focused) => {
    if (handsUpInput) {
      handsUpInput.value = focused;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (checkInput) {
      checkInput.value = true;
    }

    try {
      await onSubmit(email, password);
      if (successInput) {
        successInput.fire();
      }
    } catch (err) {
      if (failInput) {
        failInput.fire();
      }
    } finally {
      if (checkInput) {
        checkInput.value = false;
      }
    }
  };

  return (
    <div className="w-full">
      {/* Rive Animation Container */}
      <div className="mb-6 h-48 overflow-hidden rounded-xl bg-white/50 dark:bg-black/20 backdrop-blur-sm">
        <RiveComponent className="w-full h-full" />
      </div>

      {/* Error Alert */}
      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4"
          >
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden bg-white/50 dark:bg-black/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Sign in to your account to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="Email"
                    className="pl-10"
                    required
                  />
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="pl-10"
                    required
                    onFocus={() => handlePasswordFocus(true)}
                    onBlur={() => handlePasswordFocus(false)}
                  />
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Forgot Password */}
              {onForgotPassword && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-blue-900 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    onClick={onForgotPassword}
                  >
                    Forgot password?
                  </Button>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-950 to-blue-800 dark:from-primary dark:to-blue-600 hover:shadow-lg hover:shadow-blue-600/20 dark:hover:shadow-primary/20"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
