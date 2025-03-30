// src/layouts/AuthLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
         {/* Optional: Add Logo */}
         <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Fitness Pose Coach</h1>
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;