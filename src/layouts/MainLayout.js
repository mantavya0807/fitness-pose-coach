// src/layouts/MainLayout.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/common/Navbar'; // Assumes Navbar exists

const MainLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet /> {/* Nested routes render here */}
      </main>
      <footer className="bg-gray-800 text-white p-4 text-center text-sm">
        Fitness Pose Coach © {new Date().getFullYear()}
      </footer>
    </div>
  );
};
export default MainLayout;