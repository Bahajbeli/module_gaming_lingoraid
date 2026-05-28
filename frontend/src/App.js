import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import SiteVitrine from './components/SiteVitrine';
import Login from './components/Login';
import WelcomeScreen from './components/WelcomeScreen';
import GamingSection from './components/GamingSection';
import Navbar from './components/Navbar';
import GameRunner from './components/GameRunner';
import OnlineGameLobby from './components/OnlineGameLobby';
import OnlineMatchPlay from './components/OnlineMatchPlay';
import GermanBingoRunner from './components/GermanBingoRunner';
import ShadowingRunner from './components/ShadowingRunner';
import VocabQuizRunner from './components/VocabQuizRunner';
import CreativityRoadMap from './components/CreativityRoadMap';
import AdminBackoffice from './components/AdminBackoffice';
import BackgroundMusic from './components/BackgroundMusic';
import Profile from './components/Profile';
import './App.css';

const Spinner = ({ dark }) => (
  <div
    className={
      dark
        ? 'min-h-screen bg-slate-950 flex items-center justify-center'
        : 'min-h-screen bg-gradient-to-br from-german-50 to-german-100 flex items-center justify-center'
    }
  >
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMIN') return <Navigate to="/app" replace />;
  return children;
};

const PublicOnlyRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner dark />;
  if (user) return <Navigate to="/app" replace />;
  return children;
};

function AppRoutes() {
  const location = useLocation();
  const hideNavbar =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/german-bingo' ||
    location.pathname === '/shadowing' ||
    location.pathname === '/vocab-quiz';

  return (
    <div className={hideNavbar ? 'App App--immersive' : 'App'}>
      <BackgroundMusic />
      {!hideNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<SiteVitrine />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <WelcomeScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gaming"
          element={
            <ProtectedRoute>
              <GamingSection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/german-bingo"
          element={
            <ProtectedRoute>
              <GermanBingoRunner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/game/:type/:mode"
          element={
            <ProtectedRoute>
              <GameRunner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <OnlineGameLobby />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId/play"
          element={
            <ProtectedRoute>
              <OnlineMatchPlay />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap/:gameType"
          element={
            <ProtectedRoute>
              <CreativityRoadMap />
            </ProtectedRoute>
          }
        />
        <Route
          path="/shadowing"
          element={
            <ProtectedRoute>
              <ShadowingRunner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vocab-quiz"
          element={
            <ProtectedRoute>
              <VocabQuizRunner />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminBackoffice />
            </AdminRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
