// src/pages/HeroPage.js
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Activity, Target, BarChart } from 'lucide-react'; // Example icons
import { Button } from "../components/ui/button"; // Assuming Shadcn Button

const HeroPage = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const currentRef = heroRef.current; // Capture ref value
    if (currentRef) {
       currentRef.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
        if (currentRef) {
            currentRef.removeEventListener('mousemove', handleMouseMove);
        }
    };
  }, []);

  const glowStyle = {
    background: `radial-gradient(circle 600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.10), transparent 80%)`, // Blue glow
  };

  const features = [
      { icon: <Activity />, title: "Real-time Feedback", description: "Get instant corrections on your form using your camera." },
      { icon: <Target />, title: "Personalized Workouts", description: "Custom plans tailored to your fitness goals." },
      { icon: <BarChart />, title: "Track Progress", description: "Monitor your improvements and consistency over time." },
  ]

  return (
    <div ref={heroRef} className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-950 dark:to-black flex flex-col justify-center items-center p-6">
      {/* Mouse Follow Glow */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300 opacity-70 dark:opacity-50"
        style={glowStyle}
      />

      {/* Decorative Gradients */}
       <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-gradient-to-br from-blue-100 to-transparent dark:from-blue-600/10 dark:to-transparent blur-3xl opacity-50" />
       <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-pink-100 to-transparent dark:from-purple-600/10 dark:to-transparent blur-3xl opacity-50" />


      {/* Main Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-6 drop-shadow-sm"
        >
          Fitness Pose Coach
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-gray-700 dark:text-gray-300 mb-10 max-w-2xl mx-auto"
        >
          Improve your exercise form with real-time feedback using your device's camera. Get personalized workouts and track your progress.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
          className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4"
        >
          <Button
            size="lg"
            className="group px-8 py-3 text-lg w-full sm:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
            onClick={() => navigate('/signup')}
          >
            Get Started
            <ArrowRight className="ml-2 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
          </Button>
          <Button
            size="lg"
            variant="outline"
             className="px-8 py-3 text-lg w-full sm:w-auto bg-white/70 dark:bg-gray-800/50 border-blue-300 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800/80 text-blue-600 dark:text-blue-300 backdrop-blur-sm transition-all duration-300"
            onClick={() => navigate('/login')}
          >
            Login
          </Button>
        </motion.div>

         {/* Simple Features Overview */}
         <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
            className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8"
         >
            {features.map((feature, index) => (
                 <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 + index * 0.1, ease: "easeOut" }}
                    className="group rounded-xl border border-gray-200 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm p-6 transition-all hover:shadow-lg hover:shadow-blue-100 dark:hover:shadow-blue-500/10 hover:border-gray-300 dark:hover:border-gray-600"
                 >
                    <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-600 dark:text-blue-300 group-hover:text-white group-hover:bg-gradient-to-br group-hover:from-blue-600 group-hover:to-purple-600 dark:group-hover:from-blue-500 dark:group-hover:to-purple-500 transition-all duration-300">
                        {React.cloneElement(feature.icon, { className: "h-6 w-6" })}
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
                </motion.div>
            ))}
         </motion.div>
      </div>
    </div>
  );
};
export default HeroPage;