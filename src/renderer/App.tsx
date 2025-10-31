import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Home from './components/Home';
import Auth from './components/Auth';
import './App.css';

const AppRoutes = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Git Command Pad doesn't require auth - allow direct access
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to="/home" replace />}
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
