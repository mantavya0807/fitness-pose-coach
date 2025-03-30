// src/components/common/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { Menu, X, ChevronDown, User, History, BarChart2, Clipboard, LogOut, Settings, Activity, Coffee } from 'lucide-react';

const Navbar = () => {
  const { user, profile, logOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Handle scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logOut();
    navigate('/login');
  };
  
  // Check if a route is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-200 ${isScrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-sm'}`}>
      <div className="container mx-auto px-4 py-3">
        {/* Desktop Navigation */}
        <div className="hidden md:flex justify-between items-center">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600 hover:text-blue-800 flex items-center">
            <Activity className="mr-2 h-6 w-6" />
            <span>Fitness Pose Coach</span>
          </Link>
          
          <div className="flex items-center space-x-1">
            <NavLink to="/dashboard" isActive={isActive('/dashboard')} icon={<BarChart2 size={18} />}>Dashboard</NavLink>
            <NavLink to="/explore" isActive={isActive('/explore')} icon={<Activity size={18} />}>Exercises</NavLink>
            <NavLink to="/templates" isActive={isActive('/templates')} icon={<Clipboard size={18} />}>Templates</NavLink>
            <NavLink to="/nutrition" isActive={isActive('/nutrition')} icon={<Coffee size={18} />}>Nutrition</NavLink>
            <NavLink to="/history" isActive={isActive('/history')} icon={<History size={18} />}>History</NavLink>

            {user ? (
              <div className="relative ml-2">
                <button 
                  className={`flex items-center space-x-2 focus:outline-none px-3 py-2 rounded-md ${isDropdownOpen ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
                    {profile?.photo_url ? 
                      <img src={profile.photo_url} alt="Profile" className="h-full w-full object-cover" /> : 
                      <span className="font-semibold">{profile?.name ? profile.name[0].toUpperCase() : user?.email[0].toUpperCase()}</span>
                    }
                  </div>
                  <span className="text-sm font-medium hidden lg:inline max-w-[100px] truncate">
                    {profile?.name || user.email.split('@')[0]}
                  </span>
                  <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="px-4 py-2 border-b">
                      <p className="text-sm font-medium text-gray-900 truncate">{profile?.name || 'User'}</p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                    <Link 
                      to="/settings" 
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" 
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <Settings size={16} className="mr-2" />
                      Settings
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsDropdownOpen(false);
                      }}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut size={16} className="mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-x-2 ml-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition">
                  Login
                </Link>
                <Link to="/signup" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition shadow-sm">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Mobile Navigation */}
        <div className="flex md:hidden justify-between items-center">
          <Link to="/dashboard" className="text-xl font-bold text-blue-600 flex items-center">
            <Activity className="mr-1 h-5 w-5" />
            <span>Fitness Coach</span>
          </Link>
          
          {/* Mobile Menu Button */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 focus:outline-none transition"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pt-3 pb-2 border-t mt-2 space-y-1">
            <MobileNavLink 
              to="/dashboard" 
              isActive={isActive('/dashboard')} 
              icon={<BarChart2 size={20} />}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Dashboard
            </MobileNavLink>
            <MobileNavLink 
              to="/explore" 
              isActive={isActive('/explore')} 
              icon={<Activity size={20} />}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Exercises
            </MobileNavLink>
            <MobileNavLink 
              to="/templates" 
              isActive={isActive('/templates')} 
              icon={<Clipboard size={20} />}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Templates
            </MobileNavLink>
            <MobileNavLink 
              to="/nutrition" 
              isActive={isActive('/nutrition')} 
              icon={<Coffee size={20} />}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Nutrition
            </MobileNavLink>
            <MobileNavLink 
              to="/history" 
              isActive={isActive('/history')} 
              icon={<History size={20} />}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              History
            </MobileNavLink>
            
            <div className="pt-2 mt-2 border-t">
              <MobileNavLink 
                to="/settings" 
                isActive={isActive('/settings')} 
                icon={<Settings size={20} />}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Settings
              </MobileNavLink>
              
              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center w-full px-4 py-2.5 text-left text-gray-700 hover:bg-gray-50"
                >
                  <LogOut size={20} className="mr-3 text-gray-500" />
                  <span>Logout</span>
                </button>
              )}
            </div>
            
            {/* User info on mobile */}
            {user && (
              <div className="mt-4 pt-4 border-t flex items-center px-4">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white">
                  {profile?.photo_url ? 
                    <img src={profile.photo_url} alt="Profile" className="h-full w-full object-cover" /> : 
                    <span className="font-semibold">{profile?.name ? profile.name[0].toUpperCase() : user?.email[0].toUpperCase()}</span>
                  }
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{profile?.name || 'User'}</p>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">{user?.email}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

// Helper for desktop NavLink styling
const NavLink = ({ to, children, isActive, icon }) => (
  <Link
    to={to}
    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive
      ? 'text-blue-600 bg-blue-50'
      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
    }`}
  >
    {icon && <span className="mr-1.5">{icon}</span>}
    {children}
  </Link>
);

// Helper for mobile NavLink styling
const MobileNavLink = ({ to, children, isActive, icon, onClick }) => (
  <Link
    to={to}
    className={`flex items-center px-4 py-2.5 ${
      isActive
      ? 'text-blue-600 bg-blue-50 font-medium'
      : 'text-gray-700 hover:bg-gray-50'
    }`}
    onClick={onClick}
  >
    {icon && <span className={`mr-3 ${isActive ? 'text-blue-500' : 'text-gray-500'}`}>{icon}</span>}
    {children}
  </Link>
);

export default Navbar;