import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Menu, X, User, LogOut, Settings, Home, Gamepad2, Tv, BarChart3, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Logo : placer lingo.png dans frontend/public

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState(null);

  // Toast à partir de location.state.toast
  useEffect(() => {
    const t = location.state?.toast;
    if (t) {
      setToast({ ...t, id: Date.now() });
      // Nettoyer l'état pour éviter répétition
      navigate(location.pathname, { replace: true });
      const to = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(to);
    }
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsUserMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinks = [
    { path: '/app', label: 'Home', icon: Home },
    { path: '/gaming', label: 'Gaming', icon: Gamepad2 },
    ...(user?.role === 'ADMIN' ? [{ path: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <nav className="bg-white/80 backdrop-blur-sm shadow-lg border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo et navigation principale */}
          <div className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link to="/app" className="flex-shrink-0 flex items-center">
                <img
                  src={process.env.PUBLIC_URL + '/lingo.png'}
                  alt="LingoRaid"
                  className="h-10 w-10 rounded-lg mr-3 object-contain"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = process.env.PUBLIC_URL + '/logo192.png'; }}
                />
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">LingoRaid</span>
              </Link>
            </motion.div>

            {/* Navigation desktop */}
            <div className="hidden md:ml-8 md:flex md:space-x-6">
              {navLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      to={link.path}
                      className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive(link.path)
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Menu utilisateur */}
          <div className="flex items-center">
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center text-sm rounded-xl bg-white/60 backdrop-blur-sm px-3 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="ml-2 text-gray-700 hidden sm:block font-medium">
                  {user?.email}
                </span>
              </motion.button>

              {/* Menu déroulant utilisateur */}
              <AnimatePresence>
                {isUserMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="origin-top-right absolute right-0 mt-2 w-56 rounded-2xl shadow-xl bg-white/90 backdrop-blur-sm border border-white/20 z-50"
                  >
                    <div className="py-2">
                      <div className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100">
                        <p className="font-semibold">{user?.email}</p>
                        <p className="text-xs text-gray-500 capitalize mt-1">{user?.role}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Mon Profil
                      </Link>
                      <motion.button
                        whileHover={{ backgroundColor: '#f3f4f6' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign out
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bouton menu mobile */}
            <div className="md:hidden ml-4">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu mobile */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block pl-3 pr-4 py-2 text-base font-medium transition-colors duration-200 ${
                    isActive(link.path)
                      ? 'bg-primary-50 border-r-4 border-primary-500 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="h-5 w-5 mr-3" />
                    {link.label}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Toast global */}
      {toast && (
        <div className="fixed top-20 right-4 z-[60]">
          <div className={`rounded-2xl shadow-lg px-5 py-4 text-white ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}>
            <div className="font-semibold">{toast.title || 'Notification'}</div>
            {toast.message && (<div className="text-sm opacity-90 mt-1">{toast.message}</div>)}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
