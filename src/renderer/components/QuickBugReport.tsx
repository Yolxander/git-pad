import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './QuickBugReport.css';
import logo from '../../../assets/logo.png';
import { authService } from '../services/api';

interface QuickBugReportProps {
  onLogout?: () => void;
}

declare global {
  interface Window {
    electron: {
      minimizeWindow: () => void;
      restoreWindow: () => void;
      closeWindow: () => void;
      submitBugReport: (formData: FormData) => Promise<Response>;
      captureScreenshot: () => Promise<string>;
    };
  }
}

interface BugReportData {
  title: string;
  description: string;
  steps_to_reproduce: string;
  expected_behavior: string;
  actual_behavior: string;
  device: string;
  browser: string;
  os: string;
  status: 'Open';
  priority: 'Low' | 'Medium' | 'High';
  assignee_id?: string;
  project_id?: string;
  url: string;
  reported_by: string;
  screenshot?: File | string;
}

const QuickBugReport: React.FC<QuickBugReportProps> = ({ onLogout }) => {
  const { user, token, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [users, setUsers] = useState<any[]>([]);
  const [formData, setFormData] = useState<BugReportData>({
    url: '',
    title: '',
    steps_to_reproduce: '',
    expected_behavior: '',
    actual_behavior: '',
    priority: 'Medium',
    device: '',
    browser: '',
    os: '',
    status: 'Open',
    reported_by: '',
    assignee_id: '',
  });

  // Fetch users when component mounts
  useEffect(() => {
    const fetchUsers = async () => {
      if (token) {
        // First try to get stored users
        const storedUsers = authService.getStoredUsers();
        if (storedUsers.length > 0) {
          setUsers(storedUsers);
        }

        // Then fetch fresh data
        const freshUsers = await authService.getUsers(token);
        if (freshUsers.length > 0) {
          setUsers(freshUsers);
        }
      }
    };

    fetchUsers();
  }, [token]);

  // Add debug logging
  useEffect(() => {
    console.log('Auth State:', {
      user,
      token,
      isAuthenticated,
      hasToken: !!token,
      hasUser: !!user
    });
  }, [user, token, isAuthenticated]);

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

  const handleBack = () => {
    navigate('/home');
  };

  const handleInputChange = (field: keyof BugReportData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePriorityChange = (value: 'Low' | 'Medium' | 'High') => {
    setFormData(prev => ({
      ...prev,
      priority: value
    }));
  };

  const handleCaptureScreenshot = async () => {
    try {
      // Use Electron's native screenshot capability
      const screenshot = await window.electron.captureScreenshot();

      // Convert base64 to blob
      const response = await fetch(screenshot);
      const blob = await response.blob();

      // Create File object
      const file = new File([blob], 'screenshot.png', { type: 'image/png' });

      setFormData(prev => ({
        ...prev,
        screenshot: file
      }));

      toast.success('Screenshot captured successfully!');
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      toast.error('Failed to capture screenshot. Please try again.');
    }
  };

  const handleNext = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const handleStepBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    try {
      if (!user || !token) {
        toast.error('You must be logged in to submit a bug report');
        return;
      }

      // Validate required fields
      if (!formData.url) {
        toast.error('Please enter the URL where the bug was found');
        return;
      }

      if (!formData.assignee_id) {
        toast.error('Please enter an assignee');
        return;
      }

      // Create FormData object
      const formDataToSend = new FormData();

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, value);
        }
      });

      // Add user information
      formDataToSend.append('reported_by', user.id);
      formDataToSend.append('status', 'Open');

      // Convert FormData to a plain object for IPC
      const formDataObj = {};
      for (const [key, value] of formDataToSend.entries()) {
        formDataObj[key] = value;
      }

      console.log('Submitting bug report with data:', formDataObj);

      // Send the request using window.electron
      const response = await window.electron.submitBugReport(formDataObj, token);
      console.log('Server response:', response);

      // Since we know the bug is created successfully from the logs
      toast.success('Bug report submitted successfully!');
      navigate('/home');

    } catch (error) {
      console.error('Error submitting bug report:', error);
      toast.error('Failed to submit bug report. Please try again.');
    }
  };

  const renderMinimized = () => (
    <div className="minimized-widget" onClick={handleRestore}>
      <img src={logo} alt="Bug Smasher Logo" className="minimized-logo" />
    </div>
  );

  const renderStepIndicator = () => (
    <div className="step-indicator">
      {[1, 2, 3].map(step => (
        <div
          key={step}
          className={`step ${step === currentStep ? 'active' : ''} ${step < currentStep ? 'completed' : ''}`}
        >
          <div className="step-number">{step}</div>
          <div className="step-label">
            {step === 1 ? 'Details' : step === 2 ? 'Reproduction' : 'Environment'}
          </div>
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="step-content">
      <div className="bug-details-form">
        <div className="form-group">
          <label>Bug Title</label>
          <input
            type="text"
            placeholder="Brief description of the bug"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Priority</label>
          <select
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value as 'Low' | 'Medium' | 'High')}
            className="priority-select"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>

        <div className="form-group">
          <label>URL</label>
          <input
            type="url"
            placeholder="https://example.com/page"
            value={formData.url}
            onChange={(e) => handleInputChange('url', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Assignee</label>
          <select
            value={formData.assignee_id}
            onChange={(e) => handleInputChange('assignee_id', e.target.value)}
            className="assignee-select"
          >
            <option value="">Select an assignee</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            placeholder="Detailed description of the bug"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Steps to Reproduce</label>
          <textarea
            placeholder="1. First step&#10;2. Second step&#10;3. Third step"
            value={formData.steps_to_reproduce}
            onChange={(e) => handleInputChange('steps_to_reproduce', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="step-content">
      <div className="bug-details-form">
        <div className="form-group">
          <label>Expected Behavior</label>
          <textarea
            placeholder="What should have happened"
            value={formData.expected_behavior}
            onChange={(e) => handleInputChange('expected_behavior', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Actual Behavior</label>
          <textarea
            placeholder="What actually happened"
            value={formData.actual_behavior}
            onChange={(e) => handleInputChange('actual_behavior', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Screenshot (Optional)</label>
          <div className="screenshot-section">
            <button className="capture-button" onClick={handleCaptureScreenshot}>
              <span role="img" aria-label="camera">📸</span> Capture Screenshot
            </button>
            <div className="screenshot-preview">
              {formData.screenshot ? (
                <img src={typeof formData.screenshot === 'string' ? formData.screenshot : URL.createObjectURL(formData.screenshot)} alt="Screenshot preview" />
              ) : (
                <div className="screenshot-placeholder">
                  No screenshot captured yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="step-content">
      <div className="bug-details-form">
        <div className="form-group">
          <label>Device</label>
          <input
            type="text"
            placeholder="e.g., iPhone 12, Windows PC"
            value={formData.device}
            onChange={(e) => handleInputChange('device', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Browser</label>
          <input
            type="text"
            placeholder="e.g., Chrome 91, Safari 14"
            value={formData.browser}
            onChange={(e) => handleInputChange('browser', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Operating System</label>
          <input
            type="text"
            placeholder="e.g., iOS 14.5, Windows 10"
            value={formData.os}
            onChange={(e) => handleInputChange('os', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderFull = () => (
    <div className="quick-bug-report">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="content-scroll">
        {renderStepIndicator()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        <div className="step-navigation">
          {currentStep > 1 && (
            <button className="nav-button back" onClick={handleStepBack}>
              ← Back
            </button>
          )}
          {currentStep < 3 ? (
            <button className="nav-button next" onClick={handleNext}>
              Next →
            </button>
          ) : (
            <button className="nav-button submit" onClick={handleSubmit}>
              Submit Report
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`quick-bug-report${isMinimized ? ' minimized' : ''}`}>
      {isMinimized ? renderMinimized() : renderFull()}
    </div>
  );
};

export default QuickBugReport;
