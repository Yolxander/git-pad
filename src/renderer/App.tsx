import { MemoryRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import QuickBugReport from './components/QuickBugReport';
import QACompletion from './components/QACompletion';
import Home from './components/Home';
import Auth from './components/Auth';
import './App.css';

const AppRoutes = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/home" replace />
          ) : (
            <Auth onLogin={() => {}} />
          )
        }
      />
      <Route
        path="/home"
        element={
          isAuthenticated ? (
            <Home onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/bug-report"
        element={
          isAuthenticated ? (
            <QuickBugReport onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/qa-completion"
        element={
          isAuthenticated ? (
            <QACompletion onLogout={logout} />
          ) : (
            <Navigate to="/" replace />
          )
        }
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
