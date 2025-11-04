import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiGitBranch, FiTerminal, FiFolder } from 'react-icons/fi';
import { HiMinus, HiX } from 'react-icons/hi';
import './Onboarding.css';
import logo from '../../../assets/icons/command-pad-logo.png';

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

  const handleGetStarted = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    navigate('/home');
  };

  const handleSkip = () => {
    localStorage.setItem('hasCompletedOnboarding', 'true');
    navigate('/home');
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
    <div className="onboarding">
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

          <div className="onboarding-actions">
            <button className="skip-button" onClick={handleSkip}>
              Skip
            </button>
            <button className="get-started-button" onClick={handleGetStarted}>
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

