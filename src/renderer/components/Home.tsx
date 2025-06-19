import React, { useState, useEffect } from 'react';
import { AiOutlineHome } from 'react-icons/ai';
import { BsBug } from 'react-icons/bs';
import { MdChecklist } from 'react-icons/md';
import QuickBugReport from './QuickBugReport';
import QACompletion from './QACompletion';
import logo from '../../../assets/logo.png';
import './Home.css';
import { useAuth } from '../contexts/AuthContext';
import { bugService, Bug, authService, qaService, QaChecklist } from '../services/api';

function Home() {
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeSection, setActiveSection] = useState<
    'dashboard' | 'bug' | 'qa'
  >('dashboard');
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [qaChecklists, setQaChecklists] = useState<QaChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [qaLoading, setQaLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = authService.getToken();
        if (!token) {
          setLoading(false);
          setQaLoading(false);
          return;
        }
        const [fetchedBugs, fetchedQaChecklists] = await Promise.all([
          bugService.getBugs(token),
          qaService.getQaChecklists(token)
        ]);
        setBugs(fetchedBugs);
        setQaChecklists(fetchedQaChecklists);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
        setQaLoading(false);
      }
    };

    fetchData();
  }, []);

  // Generate current date/time string
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
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
    <div className="dashboard-root">
      {/* Sidebar */}
      <aside className="sidebar draggable">
        <div className="sidebar-icons">
          <button
            type="button"
            className={`sidebar-icon${activeSection === 'dashboard' ? ' active' : ''}`}
            data-tooltip="Dashboard"
            onClick={() => setActiveSection('dashboard')}
          >
            <AiOutlineHome size={12} />
          </button>
          <button
            type="button"
            className={`sidebar-icon${activeSection === 'bug' ? ' active' : ''}`}
            data-tooltip="Quick Bug Report"
            onClick={() => setActiveSection('bug')}
          >
            <BsBug size={12} />
          </button>
          <button
            type="button"
            className={`sidebar-icon${activeSection === 'qa' ? ' active' : ''}`}
            data-tooltip="QA Completion"
            onClick={() => setActiveSection('qa')}
          >
            <MdChecklist size={12} />
          </button>
        </div>
        <div className="sidebar-avatar">
          <img src={logo} alt="Bobbi Logo" />
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="dashboard-title">
            <span className="dashboard-link">Bobbi</span>
            <span className="dashboard-greeting">
              {`Hello ${user?.name || 'User'}, welcome back.`}
            </span>
          </div>
          <div className="dashboard-header-actions">
            <div className="dashboard-date">{formattedDate}</div>
            <button
              type="button"
              className="dashboard-minimize-btn"
              title="Minimize"
              onClick={handleMinimize}
            >
              &minus;
            </button>
            <button
              type="button"
              className="dashboard-close-btn"
              title="Close"
              onClick={handleClose}
            >
              ×
            </button>
          </div>
        </header>
        {/* Main content rendering based on activeSection */}
        {activeSection === 'dashboard' && (
          <>
            {/* Cards and Balance */}
            <section className="dashboard-row cards-balance-row">
              <div className="my-cards">
                <div className="my-cards-header">
                  <span>My Reported Bugs</span>
                  <button
                    type="button"
                    className="add-card"
                    onClick={() => setActiveSection('bug')}
                  >
                    +
                  </button>
                </div>
                <ul className="bug-list">
                  {loading ? (
                    <li className="bug-list-item">Loading bugs...</li>
                  ) : bugs.length > 0 ? (
                    bugs.map((bug) => (
                      <li key={bug.id} className="bug-list-item">
                        {bug.title}
                      </li>
                    ))
                  ) : (
                    <li className="bug-list-item">No bugs reported yet</li>
                  )}
                </ul>
              </div>
              <div className="balance-widget">
                <div className="balance-header">
                  <span>Bug Stats</span>
                  <span className="balance-period">Last 30 days ▼</span>
                </div>
                <div className="bug-stats-main">
                  <span className="bug-stats-total">
                    Total Reported: <b>24</b>
                  </span>
                </div>
                <div className="bug-stats-details">
                  <span className="bug-stats-open">
                    Open <b>5</b>
                  </span>
                  <span className="bug-stats-closed">
                    Closed <b>19</b>
                  </span>
                </div>
              </div>
            </section>
            {/* Monthly Summary and Latest Transaction */}
            <section className="dashboard-row summary-transaction-row">
              <div className="monthly-summary">
                <div className="summary-header">
                  <span>QA Completion Analytics</span>
                  <button type="button" className="generate-report">
                    Generate QA Report
                  </button>
                </div>
                <div className="summary-stats simple">
                  <div className="summary-total">
                    <span className="summary-label">Total Completions</span>
                    <span className="summary-value">
                      {qaChecklists.filter(checklist => checklist.completed_at).length}
                    </span>
                  </div>
                  <div className="summary-passrate">
                    <span className="summary-label">Pass Rate</span>
                    <span className="summary-value">
                      {qaChecklists.length > 0
                        ? `${Math.round((qaChecklists.filter(checklist => checklist.completed_at).length / qaChecklists.length) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="summary-pending">
                    <span className="summary-label">Pending Tasks</span>
                    <span className="summary-value">
                      {qaChecklists.filter(checklist => !checklist.completed_at).length}
                    </span>
                  </div>
                </div>
                <div className="qa-checklist-list">
                  {qaLoading ? (
                    <div className="loading-message">Loading QA checklists...</div>
                  ) : qaChecklists.length > 0 ? (
                    <ul className="checklist-items">
                      {qaChecklists.map((checklist) => (
                        <li key={checklist.id} className="checklist-item">
                          <span className={`status-indicator ${checklist.completed_at ? 'completed' : 'pending'}`} />
                          <span className="checklist-title">{checklist.title}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-items">No QA checklists available</div>
                  )}
                </div>
                <div className="summary-dates">Last 7 days</div>
              </div>
              <div className="quick-actions">
                <div className="quick-actions-header">
                  <span>Quick Actions</span>
                </div>
                <div className="quick-actions-list">
                  <button
                    type="button"
                    className="quick-action-btn primary"
                    onClick={() => setActiveSection('bug')}
                  >
                    🐞 Report Bug
                  </button>
                  <button
                    type="button"
                    className="quick-action-btn primary"
                    onClick={() => setActiveSection('qa')}
                  >
                    ✅ Complete QA
                  </button>
                  <button
                    type="button"
                    className="quick-action-btn"
                    onClick={() => setActiveSection('dashboard')}
                  >
                    ⚙️ Settings
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
        {activeSection === 'bug' && <QuickBugReport />}
        {activeSection === 'qa' && <QACompletion />}
      </main>
    </div>
  );
}

export default Home;
