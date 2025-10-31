import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineHome } from 'react-icons/ai';
import { MdCode } from 'react-icons/md';
import { FiGitBranch } from 'react-icons/fi';
import logo from '../../../assets/logo.png';
import './Home.css';
import RepositoryBar from './RepositoryBar';
import CommandBoard from './CommandBoard';
import ConsolePanel, { ConsoleEntry } from './ConsolePanel';
import CommandEditor from './CommandEditor';
import ConfirmationModal from './ConfirmationModal';
import CommandButton from './CommandButton';
import { GitCommand } from '../data/dummyCommands';
import { gitService } from '../services/gitService';
import type { RepoInfo } from '../preload';

declare global {
  interface Window {
    electron: {
      minimizeWindow: () => void;
      restoreWindow: () => void;
      closeWindow: () => void;
      resizeWindow: (width: number, height: number) => void;
      setWindowPosition: (x: number, y: number) => void;
      getScreenSize: () => Promise<{ width: number; height: number }>;
      getWindowSize: () => Promise<{ width: number; height: number }>;
      getWindowPosition: () => Promise<{ x: number; y: number }>;
      pickGitRepo: () => Promise<string | null>;
      validateGitRepo: (path: string) => Promise<boolean>;
      executeGitCommand: (repoPath: string, command: string) => Promise<any>;
      getCommands: () => Promise<GitCommand[] | null>;
      saveCommands: (commands: GitCommand[]) => Promise<{ success: boolean }>;
      getRepoInfo: (repoPath: string) => Promise<RepoInfo>;
      setFrameless?: (frameless: boolean) => void;
    };
  }
}

interface VariableInput {
    name: string;
  value: string;
}

function Home() {
  const [activeSection, setActiveSection] = useState<'home' | 'gitpad' | 'padmode'>('home');
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [commands, setCommands] = useState<GitCommand[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [activeModal, setActiveModal] = useState<'editor' | 'confirmation' | null>(null);
  const [editingCommand, setEditingCommand] = useState<GitCommand | null>(null);
  const [confirmCommand, setConfirmCommand] = useState<{
    command: GitCommand;
    finalCommand: string;
  } | null>(null);
  const [variableInputs, setVariableInputs] = useState<VariableInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [padPage, setPadPage] = useState(0);

  // Load commands and saved repository on mount
  useEffect(() => {
    loadCommands();
    loadSavedRepository();
  }, []);

  const loadCommands = async () => {
    try {
      const loadedCommands = await gitService.loadCommands();
      setCommands(loadedCommands);
  } catch (error) {
      console.error('Error loading commands:', error);
    }
  };

  const loadSavedRepository = () => {
    const saved = localStorage.getItem('gitPad_repoPath');
    if (saved) {
      validateAndSetRepository(saved);
    }
  };

  const validateAndSetRepository = async (path: string) => {
    const isValid = await gitService.validateRepository(path);
    if (isValid) {
      setRepoPath(path);
      localStorage.setItem('gitPad_repoPath', path);
      refreshRepoInfo(path);
    } else {
      addConsoleEntry('error', `Invalid Git repository: ${path}`);
      setRepoPath(null);
      localStorage.removeItem('gitPad_repoPath');
    }
  };

  const refreshRepoInfo = async (path: string) => {
    try {
      const info = await gitService.getRepositoryInfo(path);
      setRepoInfo(info);
    } catch (error: any) {
      addConsoleEntry('error', `Error getting repo info: ${error.message}`);
    }
  };

  const handlePickRepository = async () => {
    try {
      const path = await gitService.pickRepository();
      if (path) {
        await validateAndSetRepository(path);
      }
    } catch (error: any) {
      addConsoleEntry('error', `Error picking repository: ${error.message}`);
    }
  };

  const handleCommandClick = (command: GitCommand) => {
    if (!repoPath) {
      addConsoleEntry('warning', 'Please select a Git repository first');
      return;
    }

    // Extract variables from command
    const variables = gitService.extractVariables(command.command);

    if (variables.length > 0 && command.variables && command.variables.length > 0) {
      // Show variable input modal (simplified - we'll use prompts for now)
      collectVariables(command);
    } else {
      // No variables, proceed directly to confirmation
      proceedToConfirmation(command, command.command);
    }
  };

  const collectVariables = (command: GitCommand) => {
    if (!command.variables || command.variables.length === 0) {
      proceedToConfirmation(command, command.command);
      return;
    }

    // For now, use simple prompts (can be enhanced with a proper modal later)
    const values: Record<string, string> = {};
    let allCollected = true;

    command.variables.forEach((variable) => {
      const value = prompt(`Enter ${variable.label || variable.name}:`);
      if (value !== null) {
        values[variable.name] = value;
    } else {
        allCollected = false;
      }
    });

    if (allCollected) {
      const finalCommand = gitService.replaceVariables(command.command, command.variables, values);
      proceedToConfirmation(command, finalCommand);
    }
  };

  const proceedToConfirmation = (command: GitCommand, finalCommand: string) => {
    setConfirmCommand({ command, finalCommand });
    setActiveModal('confirmation');
  };

  const handleExecuteCommand = async () => {
    if (!confirmCommand || !repoPath) return;

    setActiveModal(null);
    const { command, finalCommand } = confirmCommand;

    // Add command to console
    addConsoleEntry('command', `Executing: ${finalCommand}`);
      setLoading(true);

    try {
      const result = await gitService.executeCommand(repoPath, finalCommand);

      if (result.success) {
        addConsoleEntry('success', result.stdout || result.output || 'Command executed successfully');
      } else {
        addConsoleEntry('error', result.stderr || result.error || result.output || 'Command failed');
      }

      // Refresh repo info after command execution
      await refreshRepoInfo(repoPath);
    } catch (error: any) {
      addConsoleEntry('error', `Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setConfirmCommand(null);
    }
  };

  const handleAddCommand = () => {
    setEditingCommand(null);
    setActiveModal('editor');
  };

  const handleEditCommand = (command: GitCommand) => {
    setEditingCommand(command);
    setActiveModal('editor');
  };

  const handleSaveCommand = async (command: GitCommand) => {
    if (editingCommand) {
      // Update existing
      const updated = commands.map((c) => (c.id === command.id ? command : c));
      setCommands(updated);
      await gitService.saveCommands(updated);
      } else {
      // Add new
      const updated = [...commands, command];
      setCommands(updated);
      await gitService.saveCommands(updated);
    }
    setActiveModal(null);
    setEditingCommand(null);
    addConsoleEntry('success', `Command "${command.name}" ${editingCommand ? 'updated' : 'created'}`);
  };

  const handleDeleteCommand = async (command: GitCommand) => {
    if (window.confirm(`Delete command "${command.name}"?`)) {
      const updated = commands.filter((c) => c.id !== command.id);
      setCommands(updated);
      await gitService.saveCommands(updated);
      addConsoleEntry('info', `Command "${command.name}" deleted`);
    }
  };

  const handleClearConsole = () => {
    setConsoleEntries([]);
  };

  const addConsoleEntry = (type: ConsoleEntry['type'], message: string) => {
    const entry: ConsoleEntry = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type,
      message,
    };
    setConsoleEntries((prev) => [...prev, entry]);
  };

  const handleMinimize = () => {
    window.electron.minimizeWindow();
  };

  const handleClose = () => {
    window.electron.closeWindow();
  };

  const isDangerous = confirmCommand
    ? gitService.isDangerousCommand(confirmCommand.finalCommand)
    : false;

  // Generate current date/time string
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const formattedDate = `${pad(now.getHours())}:${pad(now.getMinutes())}, ${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`;

  // Pad Mode - Minimal UI with only buttons
  const padContainerRef = useRef<HTMLDivElement>(null);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'branching':
        return '🌿';
      case 'commits':
        return '💾';
      case 'sync':
        return '🔄';
      case 'advanced':
        return '⚙️';
      default:
        return '⚡';
    }
  };

  // Handle window resize for pad mode
  useEffect(() => {
    if (activeSection === 'padmode') {
      // Resize window for pad mode - compact size (3x3 grid + pagination)
      // Header (20px) + Grid (flex) + Pagination (24px) + padding = ~350px
      window.electron.resizeWindow(600, 260);

      return () => {
        // Restore original size when exiting
        window.electron.resizeWindow(1200, 800);
      };
    }
  }, [activeSection]);

  if (activeSection === 'padmode') {
    const commandsPerPage = 9; // 3x3 grid
    const totalPages = Math.ceil(commands.length / commandsPerPage);
    const paginatedCommands = commands.slice(
      padPage * commandsPerPage,
      (padPage + 1) * commandsPerPage
    );

    return (
      <div
        className="pad-mode-container"
        ref={padContainerRef}
      >
        <div className="pad-mode-header">
    <button
      type="button"
            className="pad-mode-header-btn minimize-btn"
            onClick={() => window.electron.minimizeWindow()}
            title="Minimize"
          >
            Minimize
    </button>
                                    <button
            type="button"
            className="pad-mode-header-btn close-btn"
            onClick={() => setActiveSection('home')}
            title="Close"
          >
            Close
            </button>
        </div>
        <div className="pad-mode-grid">
          {paginatedCommands.map((command) => (
            <div key={command.id} className="pad-mode-button-wrapper">
            <button
                className={`pad-mode-button ${command.category}`}
                onClick={() => handleCommandClick(command)}
                disabled={loading || !repoPath}
                title={command.description}
              >
                <span className="pad-button-icon">
                  {command.icon || getCategoryIcon(command.category)}
                </span>
                <span className="pad-button-name">{command.name}</span>
            </button>
          </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="pad-mode-pagination">
            <button
              className="pad-page-btn"
              onClick={() => setPadPage(Math.max(0, padPage - 1))}
              disabled={padPage === 0}
            >
              ← Prev
            </button>
            <span className="pad-page-info">
              Page {padPage + 1} of {totalPages}
            </span>
            <button
              className="pad-page-btn"
              onClick={() => setPadPage(Math.min(totalPages - 1, padPage + 1))}
              disabled={padPage >= totalPages - 1}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    );
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
            className={`nav-button ${activeSection === 'home' ? 'active' : ''}`}
            onClick={() => setActiveSection('home')}
          >
            <AiOutlineHome size={20} />
            <span>Home</span>
          </button>
          <button
            type="button"
            className={`nav-button ${activeSection === 'gitpad' ? 'active' : ''}`}
            onClick={() => setActiveSection('gitpad')}
          >
            <FiGitBranch size={20} />
            <span>Git Pad</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="cyber-main">
        {/* Header */}
        <header className="cyber-header">
          <div className="header-info">
            <h1 className="cyber-title">
              {activeSection === 'home' ? 'GIT COMMAND PAD' : 'GIT COMMAND PAD'}
            </h1>
            <p className="cyber-subtitle">
              {activeSection === 'home'
                ? 'Visual Git command execution dashboard'
                : 'Execute Git commands with visual buttons'}
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

        {/* Home Section */}
        {activeSection === 'home' && (
          <div className="home-section">
            <div className="quick-actions-section">
              <h2 className="section-title">QUICK ACTIONS</h2>
              <div className="action-buttons-grid">
                <button
                  className="quick-action-btn primary"
                  onClick={() => setActiveSection('gitpad')}
                >
                  <div className="btn-icon">
                    <FiGitBranch size={32} />
                  </div>
                  <div className="btn-content">
                    <span className="btn-title">Git Pad</span>
                    <span className="btn-subtitle">Full Git command dashboard</span>
                  </div>
                </button>

                <button
                  className="quick-action-btn secondary"
                  onClick={() => setActiveSection('padmode')}
                >
                  <div className="btn-icon">
                    <MdCode size={32} />
                  </div>
                  <div className="btn-content">
                    <span className="btn-title">Pad Mode</span>
                    <span className="btn-subtitle">Minimal button-only interface</span>
                  </div>
                </button>
                  </div>
                  </div>

            {commands.length > 0 && (
              <div className="home-commands-preview">
                <h2 className="section-title">AVAILABLE COMMANDS ({commands.length})</h2>
                <div className="home-commands-grid">
                  {commands.slice(0, 6).map((command) => (
                    <div key={command.id} className="home-command-card">
                      <div className="home-command-icon">{command.icon || '⚡'}</div>
                      <div className="home-command-name">{command.name}</div>
                      <div className="home-command-category">{command.category}</div>
                  </div>
                  ))}
                </div>
                  </div>
                )}
                            </div>
        )}

        {/* Git Pad Section */}
        {activeSection === 'gitpad' && (
          <>
            {/* Repository Bar */}
            <RepositoryBar
              repoPath={repoPath}
              repoInfo={repoInfo}
              onPickRepository={handlePickRepository}
              onRefreshInfo={() => repoPath && refreshRepoInfo(repoPath)}
            />

            {/* Main Content Grid */}
            <div className="git-pad-content">
              <div className="git-pad-left">
                <CommandBoard
                  commands={commands}
                  onCommandClick={handleCommandClick}
                  onAddCommand={handleAddCommand}
                  onEditCommand={handleEditCommand}
                  onDeleteCommand={handleDeleteCommand}
                  disabled={loading || !repoPath}
                />
                        </div>
              <div className="git-pad-right">
                <ConsolePanel entries={consoleEntries} onClear={handleClearConsole} />
                            </div>
                                </div>
          </>
        )}
      </main>

      {/* Modals */}
      {activeModal === 'editor' && (
        <CommandEditor
          command={editingCommand}
          onSave={handleSaveCommand}
          onCancel={() => {
                  setActiveModal(null);
            setEditingCommand(null);
          }}
        />
      )}

      {activeModal === 'confirmation' && confirmCommand && repoPath && (
        <ConfirmationModal
          command={confirmCommand.command}
          finalCommand={confirmCommand.finalCommand}
          repoPath={repoPath}
          isDangerous={isDangerous}
          onConfirm={handleExecuteCommand}
          onCancel={() => {
                        setActiveModal(null);
            setConfirmCommand(null);
          }}
        />
      )}
    </div>
  );
}

export default Home;
