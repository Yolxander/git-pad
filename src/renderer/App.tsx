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

  // Check if user exists locally
  const localUser = localStorage.getItem('user');
  const isAuthenticatedLocally = localStorage.getItem('isAuthenticated') === 'true';
  
  // Determine initial route based on auth state
  const getInitialRoute = () => {
    // If authenticated, go to home
    if (isAuthenticated && isAuthenticatedLocally) {
      return '/home';
    }
    
    // If user exists locally but not authenticated (logged out), show login
    if (localUser && !isAuthenticated) {
      return '/auth';
    }
    
    // If no user exists, show onboarding (with sign up)
    return '/onboarding';
  };

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
        path="/auth"
        element={<Auth onLogin={() => {}} />}
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
