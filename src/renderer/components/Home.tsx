import React, { useState } from 'react';
import { AiOutlineHome } from 'react-icons/ai';
import { MdTask, MdMessage, MdFolder, MdClose } from 'react-icons/md';
import { FiClock, FiActivity, FiFolder } from 'react-icons/fi';
import logo from '../../../assets/logo.png';
import './Home.css';
import { useAuth } from '../contexts/AuthContext';

// Dummy data
const DUMMY_TASKS = [
  { id: 1, title: 'Complete user authentication flow', deadline: '2 hours', priority: 'high', status: 'pending' },
  { id: 2, title: 'Review dashboard design mockups', deadline: '4 hours', priority: 'medium', status: 'pending' },
  { id: 3, title: 'Test payment integration', deadline: '6 hours', priority: 'high', status: 'in-progress' },
  { id: 4, title: 'Update API documentation', deadline: '1 day', priority: 'low', status: 'pending' }
];

const DUMMY_MESSAGES = [
  { id: 1, from: 'Sarah Chen', message: 'Can you review the latest PR?', time: '5 min ago', type: 'request' },
  { id: 2, from: 'Design Team', message: 'New UI components ready for review', time: '15 min ago', type: 'notification' },
  { id: 3, from: 'Alex Rodriguez', message: 'Meeting moved to 3 PM today', time: '1 hour ago', type: 'update' },
  { id: 4, from: 'QA Team', message: 'Found critical bug in checkout', time: '2 hours ago', type: 'urgent' }
];

const DUMMY_ACTIVITIES = [
  { id: 1, type: 'file', action: 'updated', item: 'dashboard.tsx', user: 'John Doe', time: '10 min ago' },
  { id: 2, type: 'comment', action: 'commented on', item: 'Payment Integration PR', user: 'Sarah Chen', time: '25 min ago' },
  { id: 3, type: 'commit', action: 'pushed to', item: 'feature/auth-flow', user: 'Mike Johnson', time: '1 hour ago' },
  { id: 4, type: 'file', action: 'created', item: 'api-docs.md', user: 'Alex Rodriguez', time: '2 hours ago' }
];

const DUMMY_STATS = [
  { label: 'Active Projects', value: '8', change: '+2', trend: 'up' },
  { label: 'Completed Tasks', value: '24', change: '+5', trend: 'up' },
  { label: 'Team Members', value: '12', change: '0', trend: 'stable' },
  { label: 'Open Issues', value: '3', change: '-2', trend: 'down' }
];

function Home() {
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tasks' | 'files'>('dashboard');
  const [activeModal, setActiveModal] = useState<'task' | 'message' | 'file' | 'timer' | null>(null);

  // Generate current date/time string
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const formattedDate = `${pad(now.getHours())}:${pad(now.getMinutes())}, ${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`;

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

  const renderMinimized = () => (
    <button
      type="button"
      onClick={handleRestore}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleRestore();
      }}
      style={{
        width: '100%',
        height: '100%',
        padding: 0,
        border: 'none',
        background: 'none',
        cursor: 'pointer',
      }}
      tabIndex={0}
      aria-label="Restore window"
    >
      <img
        src={logo}
        alt="Bobbi Logo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    </button>
  );

  if (isMinimized) {
    return renderMinimized();
  }

  return (
    <div className="cyber-dashboard">
      {/* Sidebar */}
      <aside className="cyber-sidebar">
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
        </div>
        <nav className="sidebar-nav">
          <button
            type="button"
            className={`nav-button ${activeSection === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveSection('dashboard')}
          >
            <AiOutlineHome size={20} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            className={`nav-button ${activeSection === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveSection('tasks')}
          >
            <MdTask size={20} />
            <span>Task Manager</span>
          </button>
          <button
            type="button"
            className={`nav-button ${activeSection === 'files' ? 'active' : ''}`}
            onClick={() => setActiveSection('files')}
          >
            <FiFolder size={20} />
            <span>File Dropzone</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="cyber-main">
        {/* Header */}
        <header className="cyber-header">
          <div className="header-info">
            <h1 className="cyber-title">SYSTEM DASHBOARD</h1>
            <p className="cyber-subtitle">
              Welcome back, <span className="highlight">{user?.name || 'User'}</span>
            </p>
          </div>
          <div className="header-controls">
            <div className="system-time">{formattedDate}</div>
            <div className="window-controls">
              <button type="button" className="control-btn minimize" onClick={handleMinimize}>
                −
              </button>
              <button type="button" className="control-btn close" onClick={handleClose}>
                ×
              </button>
            </div>
          </div>
        </header>

        {/* Content based on active section */}
        {activeSection === 'dashboard' && (
          <div className="dashboard-content">
            {/* Stats Overview */}
            <section className="stats-grid">
              {DUMMY_STATS.map((stat, index) => (
                <div key={index} className="stat-card">
                  <div className="stat-header">
                    <span className="stat-label">{stat.label}</span>
                    <span className={`stat-trend ${stat.trend}`}>{stat.change}</span>
                  </div>
                  <div className="stat-value">{stat.value}</div>
                </div>
              ))}
            </section>

            {/* Quick Actions Buttons */}
            <section className="quick-actions-section">
              <h2 className="section-title">QUICK ACTIONS</h2>
              <div className="action-buttons-grid">
                <button
                  className="quick-action-btn primary"
                  onClick={() => setActiveModal('task')}
                >
                  <div className="btn-icon">
                    <MdTask size={32} />
                  </div>
                  <div className="btn-content">
                    <span className="btn-title">New Task</span>
                    <span className="btn-subtitle">Create a new task</span>
                  </div>
                </button>

                <button
                  className="quick-action-btn secondary"
                  onClick={() => setActiveModal('message')}
                >
                  <div className="btn-icon">
                    <MdMessage size={32} />
                  </div>
                  <div className="btn-content">
                    <span className="btn-title">Quick Message</span>
                    <span className="btn-subtitle">Send a message</span>
                  </div>
                </button>

                <button
                  className="quick-action-btn secondary"
                  onClick={() => setActiveModal('file')}
                >
                  <div className="btn-icon">
                    <MdFolder size={32} />
                  </div>
                  <div className="btn-content">
                    <span className="btn-title">Upload File</span>
                    <span className="btn-subtitle">Share files</span>
                  </div>
                </button>

                <button
                  className="quick-action-btn secondary"
                  onClick={() => setActiveModal('timer')}
                >
                  <div className="btn-icon">
                    <FiClock size={32} />
                  </div>
                  <div className="btn-content">
                    <span className="btn-title">Start Timer</span>
                    <span className="btn-subtitle">Track time</span>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeSection === 'tasks' && (
          <div className="dashboard-content">
            <div className="cyber-widget">
              <div className="widget-header">
                <div className="widget-title">
                  <MdTask className="title-icon" />
                  <span>TASK MANAGER</span>
                </div>
              </div>
              <div className="widget-content">
                <p>Task Manager component coming soon...</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'files' && (
          <div className="dashboard-content">
            <div className="cyber-widget">
              <div className="widget-header">
                <div className="widget-title">
                  <FiFolder className="title-icon" />
                  <span>FILE DROPZONE & RECENT FILES</span>
                </div>
              </div>
              <div className="widget-content">
                <p>File Dropzone & Recent Files component coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {activeModal === 'task' && 'Create New Task'}
                {activeModal === 'message' && 'Quick Message'}
                {activeModal === 'file' && 'Upload File'}
                {activeModal === 'timer' && 'Start Timer'}
              </h3>
              <button
                className="modal-close"
                onClick={() => setActiveModal(null)}
              >
                <MdClose size={24} />
              </button>
            </div>
            <div className="modal-body">
              {activeModal === 'task' && (
                <div className="task-form">
                  <div className="form-group">
                    <label>Task Title</label>
                    <input type="text" placeholder="Enter task title..." />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea placeholder="Enter task description..." rows={4}></textarea>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Priority</label>
                      <select>
                        <option>High</option>
                        <option>Medium</option>
                        <option>Low</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Due Date</label>
                      <input type="date" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button className="btn-primary">Create Task</button>
                  </div>
                </div>
              )}

              {activeModal === 'message' && (
                <div className="message-form">
                  <div className="form-group">
                    <label>To</label>
                    <input type="text" placeholder="Enter recipient..." />
                  </div>
                  <div className="form-group">
                    <label>Subject</label>
                    <input type="text" placeholder="Enter subject..." />
                  </div>
                  <div className="form-group">
                    <label>Message</label>
                    <textarea placeholder="Type your message..." rows={6}></textarea>
                  </div>
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button className="btn-primary">Send Message</button>
                  </div>
                </div>
              )}

              {activeModal === 'file' && (
                <div className="file-form">
                  <div className="file-dropzone">
                    <MdFolder size={48} />
                    <p>Drag and drop files here or click to browse</p>
                    <input type="file" multiple style={{ display: 'none' }} />
                  </div>
                  <div className="form-group">
                    <label>Project</label>
                    <select>
                      <option>Select project...</option>
                      <option>Project Alpha</option>
                      <option>Project Beta</option>
                    </select>
                  </div>
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button className="btn-primary">Upload Files</button>
                  </div>
                </div>
              )}

              {activeModal === 'timer' && (
                <div className="timer-form">
                  <div className="timer-display">
                    <div className="timer-clock">00:00:00</div>
                    <div className="timer-controls">
                      <button className="timer-btn start">Start</button>
                      <button className="timer-btn pause">Pause</button>
                      <button className="timer-btn stop">Stop</button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Task/Project</label>
                    <input type="text" placeholder="What are you working on?" />
                  </div>
                  <div className="form-group">
                    <label>Notes</label>
                    <textarea placeholder="Add notes..." rows={3}></textarea>
                  </div>
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setActiveModal(null)}>Close</button>
                    <button className="btn-primary">Save Session</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
