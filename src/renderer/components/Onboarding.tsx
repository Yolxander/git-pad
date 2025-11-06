import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiGitBranch, FiTerminal, FiFolder } from 'react-icons/fi';
import { HiMinus, HiX } from 'react-icons/hi';
import './Onboarding.css';
import logo from '../../../assets/icons/command-pad-logo.png';
import rightSideBg from '../../../assets/right-side-new-bg.png';

declare global {
  interface Window {
    electron: {
      minimizeWindow: () => void;
      restoreWindow: () => void;
      closeWindow: () => void;
    };
  }
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');

  const handleGetStarted = async () => {
    if (isRegistering) {
      // Handle sign up
      try {
        setError('');
        await register({
          email,
          password,
          name,
          password_confirmation: passwordConfirmation
        });
        localStorage.setItem('hasCompletedOnboarding', 'true');
        navigate('/home');
      } catch (err: any) {
        console.error('Registration failed:', err);
        setError(err.message || 'Registration failed. Please try again.');
      }
    } else {
      // Skip to login if user wants to sign in instead
      navigate('/auth');
    }
  };

  const handleSkip = () => {
    // Skip to login
    navigate('/auth');
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };

  const handleMinimize = () => {
    window.electron.minimizeWindow();
  };

  const handleClose = () => {
    window.electron.closeWindow();
  };

  const features = [
    {
      icon: <FiGitBranch size={32} />,
      title: 'Git Pad',
      description: 'Execute Git commands with custom buttons. Select your repository and run commands with a single click.',
    },
    {
      icon: <FiTerminal size={32} />,
      title: 'System Pad',
      description: 'Run system commands and terminal operations. Create custom command shortcuts for your workflow.',
    },
    {
      icon: <FiFolder size={32} />,
      title: 'Project Pad',
      description: 'Manage project-specific commands. Navigate to your project and execute commands in context.',
    },
  ];

  return (
    <div className="onboarding" style={{ backgroundImage: `url(${rightSideBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="window-header">
        <div className="window-title">
          <img src={logo} alt="Command Pad Logo" className="header-logo" />
          <span>Welcome to Command Pad</span>
        </div>
        <div className="window-controls">
          <button className="window-button minimize-button" onClick={handleMinimize}>
            <HiMinus size={16} color="#ffffff" />
          </button>
          <button className="window-button close-button" onClick={handleClose}>
            <HiX size={16} color="#ffffff" />
          </button>
        </div>
      </div>

      <div className="onboarding-content">
        <div className="onboarding-card">
          <div className="onboarding-header">
            <img src={logo} alt="Command Pad Logo" className="onboarding-logo" />
            <h1>Welcome to Command Pad</h1>
            <p>Your powerful command execution hub for Git, System, and Project operations</p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>

          {isRegistering && (
            <div className="signup-form">
              {error && <div className="signup-error">{error}</div>}
              <div className="signup-form-group">
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
              <div className="signup-form-group">
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
              <div className="signup-form-group">
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
              <div className="signup-form-group">
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
              <div className="signup-toggle">
                <span>Already have an account?</span>
                <button type="button" onClick={toggleMode} className="signup-toggle-link">
                  Sign In
                </button>
              </div>
            </div>
          )}

          <div className="onboarding-actions">
            {!isRegistering && (
              <button className="skip-button" onClick={handleSkip}>
                Skip
              </button>
            )}
            <button className="get-started-button" onClick={handleGetStarted}>
              {isRegistering ? 'Create Account' : 'Get Started'}
            </button>
            {!isRegistering && (
              <button className="skip-button" onClick={toggleMode} style={{ marginLeft: '10px' }}>
                Sign Up
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

