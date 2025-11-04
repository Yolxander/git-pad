import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './components/Home';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import './App.css';

const AppRoutes = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Check if user has completed onboarding
  const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding') === 'true';
  
  // Determine initial route based on onboarding status
  const getInitialRoute = () => {
    if (!hasCompletedOnboarding) {
      return '/onboarding';
    }
    return '/home';
  };

  // Git Command Pad doesn't require auth - allow direct access
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={getInitialRoute()} replace />}
      />
      <Route
        path="/onboarding"
        element={<Onboarding />}
      />
      <Route
        path="/home"
        element={<Home onLogout={logout} />}
      />
    </Routes>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
