import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HiMinus, HiX, HiChevronLeft, HiChevronRight } from 'react-icons/hi';
import './Onboarding.css';
import logo from '../../../assets/icons/command-pad-logo.png';
import rightSideBg from '../../../assets/right-side-new-bg.png';

declare global {
  interface Window {
    electron: {
      minimizeWindow: () => void;
      restoreWindow: () => void;
      closeWindow: () => void;
      completeOnboarding: (preferences: { launchAtLogin: boolean; workingDirectory?: string }) => Promise<{ success: boolean }>;
      pickWorkingDirectory: () => Promise<string | null>;
    };
  }
}

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated } = useAuth();
  const [step, setStep] = useState(1);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Auth form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [authError, setAuthError] = useState('');
  const [authAttempted, setAuthAttempted] = useState(false);
  
  // Preferences state
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [workingDirectory, setWorkingDirectory] = useState<string | null>(null);

  const handleMinimize = () => {
    window.electron.minimizeWindow();
  };

  const handleClose = () => {
    window.electron.closeWindow();
  };

  const handleNext = async () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Allow proceeding even if auth failed (auth is optional)
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthAttempted(true);

    try {
      if (isRegistering) {
        await register({
          email,
          password,
          name,
          password_confirmation: passwordConfirmation
        });
        // After successful registration, automatically proceed to next step
        setAuthError('');
        // Small delay to show success state before advancing
        setTimeout(() => {
          setStep(3);
        }, 500);
      } else {
        await login({ email, password });
        setAuthError('');
        // After successful login, automatically proceed to next step
        setTimeout(() => {
          setStep(3);
        }, 500);
      }
    } catch (err: any) {
      console.error('Auth failed:', err);
      setAuthError(err.message || 'Authentication failed. Please try again.');
    }
  };

  const handlePickDirectory = async () => {
    try {
      const dir = await window.electron.pickWorkingDirectory();
      if (dir) {
        setWorkingDirectory(dir);
      }
    } catch (error) {
      console.error('Error picking directory:', error);
    }
  };

  const handleComplete = async () => {
    try {
      await window.electron.completeOnboarding({
        launchAtLogin,
        workingDirectory: workingDirectory || undefined,
      });
      navigate('/home');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setAuthError('');
    setAuthAttempted(false);
  };

  // Step 1: Welcome
  const renderWelcome = () => (
    <div className="onboarding-step">
      <div className="onboarding-step-content" style={{ alignItems: 'center', textAlign: 'center' }}>
        <img src={logo} alt="Command Pad Logo" className="onboarding-logo" />
        <h1>Welcome to Command Pad</h1>
        <p className="onboarding-tagline">
          Your universal command launcher for desktop & mobile.
        </p>
        <p className="onboarding-subtitle">
          Let's get you set up in under a minute.
        </p>
      </div>
    </div>
  );

  // Step 2: Preferences (Auth + Settings)
  const renderPreferences = () => (
    <div className="onboarding-step">
      <div className="onboarding-step-content" style={{ alignItems: 'flex-start', textAlign: 'left' }}>
        <h2>Set Up Your Preferences</h2>
        
        {/* Authentication Section */}
        <div className="preferences-section">
          <h3>Account (Optional)</h3>
          <p className="section-description">Sign in or create an account to sync your settings across devices.</p>
          
          <form onSubmit={handleAuthSubmit} className="onboarding-auth-form">
            {authError && <div className="auth-error">{authError}</div>}
            
            {isRegistering && (
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  required={isRegistering}
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
            
            <button type="submit" className="auth-submit-button">
              {isRegistering ? 'Create Account' : 'Sign In'}
            </button>
            
            <div className="auth-toggle">
              <span>
                {isRegistering ? 'Already have an account?' : "Don't have an account?"}
              </span>
              <button type="button" className="toggle-link" onClick={toggleAuthMode}>
                {isRegistering ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
        
        {/* Preferences Section */}
        <div className="preferences-section">
          <h3>Preferences</h3>
          
          <div className="preference-item">
            <div className="preference-label">
              <label htmlFor="launchAtLogin">Launch at login</label>
              <span className="preference-description">Start Command Pad automatically when you log in</span>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                id="launchAtLogin"
                checked={launchAtLogin}
                onChange={(e) => setLaunchAtLogin(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
          
          <div className="preference-item">
            <div className="preference-label">
              <label htmlFor="workingDirectory">Default working directory</label>
              <span className="preference-description">Choose a default directory for command execution</span>
            </div>
            <div className="directory-picker">
              <button
                type="button"
                className="directory-picker-button"
                onClick={handlePickDirectory}
              >
                {workingDirectory ? (workingDirectory.length > 40 ? `...${workingDirectory.slice(-37)}` : workingDirectory) : 'Pick Directory'}
              </button>
              {workingDirectory && (
                <button
                  type="button"
                  className="directory-clear-button"
                  onClick={() => setWorkingDirectory(null)}
                  title="Clear directory"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 3: Finish
  const renderFinish = () => (
    <div className="onboarding-step">
      <div className="onboarding-step-content" style={{ alignItems: 'center', textAlign: 'center' }}>
        <img src={logo} alt="Command Pad Logo" className="onboarding-logo" />
        <h1>All Set!</h1>
        <p className="onboarding-tagline">
          You're ready to start using Command Pad.
        </p>
        <p className="onboarding-subtitle">
          Execute commands with a single click and boost your productivity.
        </p>
      </div>
    </div>
  );

  return (
    <div className="onboarding" style={{ backgroundImage: `url(${rightSideBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      <div className="window-header">
        <div className="window-title">
          <img src={logo} alt="Command Pad Logo" className="header-logo" />
          <span>Command Pad Setup</span>
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
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''}`}></div>
            <div className={`step-line ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}></div>
            <div className={`step-line ${step >= 3 ? 'active' : ''}`}></div>
            <div className={`step-dot ${step >= 3 ? 'active' : ''}`}></div>
          </div>

          {/* Step Content */}
          {step === 1 && renderWelcome()}
          {step === 2 && renderPreferences()}
          {step === 3 && renderFinish()}

          {/* Navigation Buttons */}
          <div className="onboarding-actions">
            {step > 1 && (
              <button className="nav-button back-button" onClick={handleBack}>
                <HiChevronLeft size={16} />
                Back
              </button>
            )}
            {step < 3 ? (
              <button className="nav-button next-button" onClick={handleNext}>
                Next
                <HiChevronRight size={16} />
              </button>
            ) : (
              <button className="nav-button complete-button" onClick={handleComplete}>
                Open Command Pad
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
