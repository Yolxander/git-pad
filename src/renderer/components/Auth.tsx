import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';
import logo from '../../../assets/icons/command-pad-logo.png';
import rightSideBg from '../../../assets/right-side-new-bg.png';

interface AuthProps {
  onLogin: () => void;
}

declare global {
  interface Window {
    electron: {
      minimizeWindow: () => void;
      restoreWindow: () => void;
      closeWindow: () => void;
    };
  }
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');

  const handleMinimize = () => {
    window.electron.minimizeWindow();
    setIsMinimized(true);
  };

  const handleRestore = () => {
    window.electron.restoreWindow();
    setIsMinimized(false);
  };

  const handleClose = () => {
    window.electron.closeWindow();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    console.log('🔐 Auth.tsx: Starting login process...', { email });

    try {
      if (isRegistering) {
        console.log('📝 Auth.tsx: Attempting registration...', { email, name });
        await register({
          email,
          password,
          name,
          password_confirmation: passwordConfirmation
        });
        console.log('✅ Auth.tsx: Registration successful');
      } else {
        console.log('🔑 Auth.tsx: Attempting login...', { email });
        await login({ email, password });
        console.log('✅ Auth.tsx: Login successful, calling onLogin()');
      }
      // Navigate to home after successful login
      navigate('/home');
      console.log('🏠 Auth.tsx: Navigating to home');
    } catch (err) {
      console.error('❌ Auth.tsx: Login/Registration failed:', err);
      setError('Invalid credentials. Please try again.');
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };

  const renderMinimized = () => (
    <div className="minimized-widget" onClick={handleRestore}>
      <img src={logo} alt="Command Pad Logo" className="minimized-logo" />
    </div>
  );

  if (isMinimized) {
    return renderMinimized();
  }

  return (
    <div className="auth" style={{ backgroundImage: `url(${rightSideBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="window-header">
        <div className="window-title">
          <img src={logo} alt="Command Pad Logo" className="header-logo" />
          <span>Command Pad {isRegistering ? 'Sign Up' : 'Sign In'}</span>
        </div>
        <div className="window-controls">
          <button className="window-button close-button" onClick={handleClose}>
            ×
          </button>
        </div>
      </div>

      <div className="auth-content">
        <div className="auth-card">
          <div className="auth-header">
            <img src={logo} alt="Command Pad Logo" className="auth-logo" />
            <h1>{isRegistering ? 'Create Account' : 'Welcome Back'}</h1>
            <p>{isRegistering ? 'Sign up to get started' : 'Sign in to continue to Command Pad'}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            {isRegistering && (
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {isRegistering && (
              <div className="form-group">
                <label htmlFor="passwordConfirmation">Confirm Password</label>
                <input
                  type="password"
                  id="passwordConfirmation"
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <button type="submit" className="login-button">
              {isRegistering ? 'Create Account' : 'Sign In'}
            </button>

            <div className="auth-toggle">
              <span>
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button type="button" className="toggle-link" onClick={toggleMode}>
                {isRegistering ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
