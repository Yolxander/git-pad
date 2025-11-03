import React, { useState, useEffect, useRef } from 'react';
import { AiOutlineHome } from 'react-icons/ai';
import { MdCode } from 'react-icons/md';
import { FiGitBranch, FiSettings } from 'react-icons/fi';
import { HiMinus, HiX } from 'react-icons/hi';
import logo from '../../../assets/logo.png';
import './Home.css';
import RepositoryBar from './RepositoryBar';
import CommandBoard from './CommandBoard';
import ConsolePanel, { ConsoleEntry } from './ConsolePanel';
import CommandEditor from './CommandEditor';
import ConfirmationModal from './ConfirmationModal';
import CommandButton from './CommandButton';
import { GitCommand } from '../data/dummyCommands';
import { SystemCommand } from '../data/dummySystemCommands';
import { gitService } from '../services/gitService';
import { systemService } from '../services/systemService';
import type { RepoInfo } from '../preload';

declare global {
  interface Window {
    electron: {
      minimizeWindow: () => void;
      restoreWindow: () => void;
      closeWindow: () => void;
      resizeWindow: (width: number, height: number) => void;
      setWindowPosition: (x: number, y: number) => void;
      centerWindow: () => void;
      enterPadMode: () => void;
      minimizeToTray: () => void;
      showFromTray: () => void;
      getScreenSize: () => Promise<{ width: number; height: number }>;
      getWindowSize: () => Promise<{ width: number; height: number }>;
      getWindowPosition: () => Promise<{ x: number; y: number }>;
      pickGitRepo: () => Promise<string | null>;
      validateGitRepo: (path: string) => Promise<boolean>;
      executeGitCommand: (repoPath: string, command: string) => Promise<any>;
      getCommands: () => Promise<GitCommand[] | null>;
      saveCommands: (commands: GitCommand[]) => Promise<{ success: boolean }>;
      getRepoInfo: (repoPath: string) => Promise<RepoInfo>;
      executeSystemCommand: (command: string) => Promise<any>;
      executeSystemCommandInTerminal: (command: string, commandId: string, commandName?: string) => Promise<{ success: boolean; error?: string; commandId?: string }>;
      killSystemCommand: (commandId: string) => Promise<{ success: boolean; error?: string }>;
      isCommandRunning: (commandId: string) => Promise<{ running: boolean }>;
      onCommandFinished: (callback: (commandId: string) => void) => () => void;
      getSystemCommands: () => Promise<SystemCommand[] | null>;
      saveSystemCommands: (commands: SystemCommand[]) => Promise<{ success: boolean }>;
      setFrameless?: (frameless: boolean) => void;
    };
  }
}

interface VariableInput {
    name: string;
  value: string;
}

function Home() {
  const [activeSection, setActiveSection] = useState<'home' | 'gitpad' | 'systempad' | 'padmode'>('home');
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [commands, setCommands] = useState<GitCommand[]>([]);
  const [systemCommands, setSystemCommands] = useState<SystemCommand[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [activeModal, setActiveModal] = useState<'editor' | 'confirmation' | 'variables' | null>(null);
  const [editingCommand, setEditingCommand] = useState<GitCommand | SystemCommand | null>(null);
  const [confirmCommand, setConfirmCommand] = useState<{
    command: GitCommand | SystemCommand;
    finalCommand: string;
  } | null>(null);
  const [variableCommand, setVariableCommand] = useState<GitCommand | SystemCommand | null>(null);
  const [variableInputs, setVariableInputs] = useState<VariableInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [padPage, setPadPage] = useState(0);
  const [padLayout, setPadLayout] = useState<{columns: number; rows: number}>({columns: 3, rows: 3});
  const [basePadWidth, setBasePadWidth] = useState<number | null>(null);
  const [padCommandType, setPadCommandType] = useState<'git' | 'system'>('system');
  const [runningCommands, setRunningCommands] = useState<Set<string>>(new Set());
  const [showConsoleModal, setShowConsoleModal] = useState(false);

  // Load commands and saved repository on mount
  useEffect(() => {
    loadCommands();
    loadSystemCommands();
    loadSavedRepository();

    // Listen for command finished events
    const cleanup = window.electron.onCommandFinished((commandId: string) => {
      setRunningCommands((prev) => {
        const next = new Set(prev);
        next.delete(commandId);
        return next;
      });
    });

    return cleanup;
  }, []);

  // Close console modal when switching away from git pad
  useEffect(() => {
    if (activeSection !== 'gitpad') {
      setShowConsoleModal(false);
    }
  }, [activeSection]);

  const loadCommands = async () => {
    try {
      const loadedCommands = await gitService.loadCommands();
      setCommands(loadedCommands);
  } catch (error) {
      console.error('Error loading commands:', error);
    }
  };

  const loadSystemCommands = async () => {
    try {
      const loadedCommands = await systemService.loadCommands();
      setSystemCommands(loadedCommands);
    } catch (error) {
      console.error('Error loading system commands:', error);
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

  const executeCommandInTerminal = async (command: GitCommand | SystemCommand, finalCommand: string) => {
    try {
      const commandId = command.id;
      const normalizedCommand = systemService.normalizeCommand(finalCommand);
      const commandName = command.name || command.command;
      const result = await window.electron.executeSystemCommandInTerminal(normalizedCommand, commandId, commandName);

      if (result.success) {
        console.log(`Adding command ${commandId} to runningCommands`);
        setRunningCommands((prev) => {
          const next = new Set(prev);
          next.add(commandId);
          console.log(`runningCommands now has:`, Array.from(next));
          return next;
        });
        addConsoleEntry('success', `Command running in background: ${normalizedCommand}`);
      } else {
        addConsoleEntry('error', `Failed to execute command: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      addConsoleEntry('error', `Error executing command: ${error.message || 'Unknown error'}`);
    }
  };

  const killCommandInTerminal = async (commandId: string) => {
    try {
      const result = await window.electron.killSystemCommand(commandId);

      if (result.success) {
        setRunningCommands((prev) => {
          const next = new Set(prev);
          next.delete(commandId);
          return next;
        });
        addConsoleEntry('success', 'Command terminated');
      } else {
        addConsoleEntry('error', `Failed to kill command: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      addConsoleEntry('error', `Error killing command: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCommandClick = (command: GitCommand | SystemCommand) => {
    try {
      // Determine command type based on active section
      const isSystemCommand = activeSection === 'systempad' ||
                              (activeSection === 'padmode' && padCommandType === 'system');
      const isPadModeSystem = activeSection === 'padmode' && padCommandType === 'system';

      // Check if command is already running (only for pad mode system commands)
      if (isPadModeSystem && runningCommands.has(command.id)) {
        // Kill the running command
        killCommandInTerminal(command.id);
        return;
      }

      if (isSystemCommand) {
        // System command - check if variables need to be collected
        if (command.variables && command.variables.length > 0) {
          collectVariables(command);
        } else {
          // For pad mode system commands, execute directly in terminal
          if (isPadModeSystem) {
            executeCommandInTerminal(command, command.command);
          } else {
            proceedToConfirmation(command, command.command);
          }
        }
      } else {
        // Git command
        if (!repoPath && (activeSection === 'gitpad' || activeSection === 'padmode')) {
          addConsoleEntry('warning', 'Please select a Git repository first');
          return;
        }

        // Check if variables need to be collected
        if (command.variables && command.variables.length > 0) {
          collectVariables(command);
        } else {
          proceedToConfirmation(command, command.command);
        }
      }
    } catch (error: any) {
      console.error('Error in handleCommandClick:', error);
      addConsoleEntry('error', `Error executing command: ${error.message || 'Unknown error'}`);
    }
  };

  const collectVariables = (command: GitCommand | SystemCommand) => {
    if (!command.variables || command.variables.length === 0) {
      proceedToConfirmation(command, command.command);
      return;
    }

    // Initialize variable inputs with empty values
    const initialInputs: VariableInput[] = command.variables.map((variable) => ({
      name: variable.name,
      value: '',
    }));

    setVariableInputs(initialInputs);
    setVariableCommand(command);
    setActiveModal('variables');
  };

  const handleVariableSubmit = () => {
    if (!variableCommand || !variableCommand.variables) return;

    // Check if all required variables are filled
    const allFilled = variableInputs.every((input) => input.value.trim() !== '');
    if (!allFilled) {
      addConsoleEntry('warning', 'Please fill in all required variables');
      return;
    }

    // Create values object
    const values: Record<string, string> = {};
    variableInputs.forEach((input) => {
      values[input.name] = input.value;
    });

    // Replace variables in command
    let finalCommand: string;
    const isSystemCommand = activeSection === 'systempad' ||
                            (activeSection === 'padmode' && padCommandType === 'system');
    const isPadModeSystem = activeSection === 'padmode' && padCommandType === 'system';

    if (isSystemCommand) {
      finalCommand = systemService.replaceVariables(variableCommand.command, variableCommand.variables, values);
    } else {
      finalCommand = gitService.replaceVariables(variableCommand.command, variableCommand.variables, values);
    }

    setActiveModal(null);
    setVariableCommand(null);
    setVariableInputs([]);

    // For pad mode system commands, execute directly in terminal
    if (isPadModeSystem) {
      executeCommandInTerminal(variableCommand, finalCommand);
    } else {
      proceedToConfirmation(variableCommand, finalCommand);
    }
  };

  const proceedToConfirmation = (command: GitCommand | SystemCommand, finalCommand: string) => {
    setConfirmCommand({ command, finalCommand });
    setActiveModal('confirmation');
  };

  const handleExecuteCommand = async () => {
    if (!confirmCommand) return;

    // System commands don't need repoPath
    const isSystemCommand = activeSection === 'systempad' ||
                            (activeSection === 'padmode' && padCommandType === 'system');
    if (!isSystemCommand && (activeSection === 'gitpad' || activeSection === 'padmode') && !repoPath) return;

    setActiveModal(null);
    const { command, finalCommand } = confirmCommand;

    // Add command to console
    addConsoleEntry('command', `Executing: ${finalCommand}`);
    setLoading(true);

    try {
      let result;
      if (isSystemCommand) {
        // Normalize command (remove "System:" prefix if present)
        const normalizedCommand = systemService.normalizeCommand(finalCommand);
        result = await systemService.executeCommand(normalizedCommand);
      } else {
        // Git command
        if (!repoPath) return;
        result = await gitService.executeCommand(repoPath, finalCommand);
        // Refresh repo info after git command execution
        await refreshRepoInfo(repoPath);
      }

      if (result.success) {
        addConsoleEntry('success', result.stdout || result.output || 'Command executed successfully');
      } else {
        addConsoleEntry('error', result.stderr || result.error || result.output || 'Command failed');
      }
      
      // Show console modal for git pad after command execution
      if (activeSection === 'gitpad' && !isSystemCommand) {
        setShowConsoleModal(true);
      }
    } catch (error: any) {
      addConsoleEntry('error', `Error: ${error.message || 'Unknown error'}`);
      
      // Show console modal for git pad even on error
      if (activeSection === 'gitpad' && !isSystemCommand) {
        setShowConsoleModal(true);
      }
    } finally {
      setLoading(false);
      setConfirmCommand(null);
    }
  };

  const handleAddCommand = () => {
    setEditingCommand(null);
    setActiveModal('editor');
  };

  const handleEditCommand = (command: GitCommand | SystemCommand) => {
    setEditingCommand(command);
    setActiveModal('editor');
  };

  const handleSaveCommand = async (command: GitCommand | SystemCommand) => {
    if (activeSection === 'systempad') {
      // System command
      const systemCmd = command as SystemCommand;
      if (editingCommand) {
        // Update existing
        const updated = systemCommands.map((c) => (c.id === systemCmd.id ? systemCmd : c));
        setSystemCommands(updated);
        await systemService.saveCommands(updated);
      } else {
        // Add new
        const updated = [...systemCommands, systemCmd];
        setSystemCommands(updated);
        await systemService.saveCommands(updated);
      }
    } else {
      // Git command
      const gitCmd = command as GitCommand;
      if (editingCommand) {
        // Update existing
        const updated = commands.map((c) => (c.id === gitCmd.id ? gitCmd : c));
        setCommands(updated);
        await gitService.saveCommands(updated);
      } else {
        // Add new
        const updated = [...commands, gitCmd];
        setCommands(updated);
        await gitService.saveCommands(updated);
      }
    }
    setActiveModal(null);
    setEditingCommand(null);
    addConsoleEntry('success', `Command "${command.name}" ${editingCommand ? 'updated' : 'created'}`);
  };

  const handleDeleteCommand = async (command: GitCommand | SystemCommand) => {
    if (window.confirm(`Delete command "${command.name}"?`)) {
      if (activeSection === 'systempad') {
        const updated = systemCommands.filter((c) => c.id !== command.id);
        setSystemCommands(updated);
        await systemService.saveCommands(updated);
      } else {
        const updated = commands.filter((c) => c.id !== command.id);
        setCommands(updated);
        await gitService.saveCommands(updated);
      }
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

  const isSystemCommandForDanger = activeSection === 'systempad' ||
                                    (activeSection === 'padmode' && padCommandType === 'system');
  const isDangerous = confirmCommand
    ? isSystemCommandForDanger
      ? systemService.isDangerousCommand(confirmCommand.finalCommand)
      : gitService.isDangerousCommand(confirmCommand.finalCommand)
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

  // Handle window resize and positioning for pad mode
  useEffect(() => {
    if (activeSection === 'padmode') {
      // Position window at top-right and resize for pad mode
      window.electron.enterPadMode();
      // Store the base width for 3x3 layout
      window.electron.getWindowSize().then((size) => {
        setBasePadWidth(size.width);
      }).catch((error) => {
        console.error('Error getting window size:', error);
      });
    }
    // No cleanup needed - centerWindow handles resizing when closing pad mode
  }, [activeSection]);

  // Reset to page 0 when layout changes
  useEffect(() => {
    if (activeSection === 'padmode') {
      setPadPage(0);
    }
  }, [padLayout, activeSection]);

  // Reset to page 0 when command type changes
  useEffect(() => {
    if (activeSection === 'padmode') {
      setPadPage(0);
    }
  }, [padCommandType, activeSection]);

  // Resize window when layout changes in pad mode
  useEffect(() => {
    if (activeSection === 'padmode' && basePadWidth !== null) {
      const resizeWindowForLayout = async () => {
        try {
          const [currentSize, screenSize, currentPos] = await Promise.all([
            window.electron.getWindowSize(),
            window.electron.getScreenSize(),
            window.electron.getWindowPosition(),
          ]);

          const currentHeight = currentSize.height;

          // Calculate new width based on layout using stored base width
          let newWidth: number;
          if (padLayout.columns === 1) {
            // 1x3: 1/3 of the 3x3 base width
            newWidth = Math.max(Math.round(basePadWidth / 3), 200); // Minimum 200px
          } else if (padLayout.columns === 2) {
            // 2x3: 2/3 of the 3x3 base width
            newWidth = Math.max(Math.round((basePadWidth * 2) / 3), 400); // Minimum 400px
          } else {
            // 3x3: use the base width
            newWidth = basePadWidth;
          }

          // Calculate new position to keep window at top-right corner
          // x position: screen width - new window width
          // y position: keep current y position (top)
          const newX = screenSize.width - newWidth;
          const newY = currentPos.y;

          // Resize window to new width
          await window.electron.resizeWindow(newWidth, currentHeight);

          // Reposition window to maintain top-right position
          await window.electron.setWindowPosition(newX, newY);
        } catch (error) {
          console.error('Error resizing window:', error);
        }
      };

      resizeWindowForLayout();
    }
  }, [padLayout, activeSection, basePadWidth]);

  if (activeSection === 'padmode') {
    const currentCommands = padCommandType === 'system' ? systemCommands : commands;
    const commandsPerPage = padLayout.columns * padLayout.rows;
    const totalPages = Math.ceil(currentCommands.length / commandsPerPage);
    const paginatedCommands = currentCommands.slice(
      padPage * commandsPerPage,
      (padPage + 1) * commandsPerPage
    );

    return (
      <div
        className={`pad-mode-container pad-mode-layout-${padLayout.columns}x${padLayout.rows}`}
        ref={padContainerRef}
      >
        <div className="pad-mode-header">
          <div className="pad-mode-layout-controls">
            <button
              type="button"
              className={`pad-mode-layout-btn ${padLayout.columns === 1 && padLayout.rows === 3 ? 'active' : ''}`}
              onClick={() => setPadLayout({columns: 1, rows: 3})}
              title="1 Column 3 Rows"
            >
              1x3
            </button>
            <button
              type="button"
              className={`pad-mode-layout-btn ${padLayout.columns === 2 && padLayout.rows === 3 ? 'active' : ''}`}
              onClick={() => setPadLayout({columns: 2, rows: 3})}
              title="2 Columns 3 Rows"
            >
              2x3
            </button>
            <button
              type="button"
              className={`pad-mode-layout-btn ${padLayout.columns === 3 && padLayout.rows === 3 ? 'active' : ''}`}
              onClick={() => setPadLayout({columns: 3, rows: 3})}
              title="3 Columns 3 Rows"
            >
              3x3
            </button>
          </div>
          <div className="pad-mode-window-controls">
            <button
              type="button"
              className="pad-mode-header-btn minimize-btn"
              onClick={() => window.electron.minimizeToTray()}
              title="Minimize"
            >
              {padLayout.columns === 1 ? <HiMinus size={12} /> : 'Minimize'}
            </button>
            <button
              type="button"
              className="pad-mode-header-btn close-btn"
              onClick={() => {
                window.electron.centerWindow();
                setActiveSection('home');
              }}
              title="Close"
            >
              {padLayout.columns === 1 ? <HiX size={12} /> : 'Close'}
            </button>
          </div>
        </div>
        <div className={`pad-mode-grid pad-mode-grid-${padLayout.columns}-${padLayout.rows}`}>
          {paginatedCommands.map((command) => {
            const isRunning = runningCommands.has(command.id);
            const isPadSystemCommand = padCommandType === 'system';
            const shouldShowActive = isRunning && isPadSystemCommand;
            return (
              <div key={command.id} className="pad-mode-button-wrapper">
                <button
                  type="button"
                  className={`pad-mode-button ${command.category} ${shouldShowActive ? 'active-running' : ''}`}
                  onClick={() => handleCommandClick(command)}
                  disabled={loading || (padCommandType === 'git' && !repoPath)}
                  title={shouldShowActive ? `Click to kill: ${command.description}` : command.description}
                >
                  <span className="pad-button-icon">
                    {command.icon || getCategoryIcon(command.category)}
                  </span>
                  <span className="pad-button-name">{command.name}</span>
                </button>
              </div>
            );
          })}
        </div>
        <div className="pad-mode-bottom-controls">
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
          <div className="pad-mode-command-toggle">
            <button
              type="button"
              className={`pad-mode-toggle-btn ${padCommandType === 'git' ? 'active' : ''}`}
              onClick={() => setPadCommandType('git')}
              title="Git Commands"
            >
              Git
            </button>
            <button
              type="button"
              className={`pad-mode-toggle-btn ${padCommandType === 'system' ? 'active' : ''}`}
              onClick={() => setPadCommandType('system')}
              title="System Commands"
            >
              System
            </button>
          </div>
        </div>
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
          <button
            type="button"
            className={`nav-button ${activeSection === 'systempad' ? 'active' : ''}`}
            onClick={() => setActiveSection('systempad')}
          >
            <FiSettings size={20} />
            <span>System Pad</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="cyber-main">
        {/* Header */}
        <header className="cyber-header">
          <div className="header-info">
            <h1 className="cyber-title">
              {activeSection === 'home'
                ? 'GIT COMMAND PAD'
                : activeSection === 'systempad'
                ? 'SYSTEM COMMAND PAD'
                : 'GIT COMMAND PAD'}
            </h1>
            <p className="cyber-subtitle">
              {activeSection === 'home'
                ? 'Visual Git command execution dashboard'
                : activeSection === 'systempad'
                ? 'Execute system commands with visual buttons'
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
            </div>
          </>
        )}

        {/* System Pad Section */}
        {activeSection === 'systempad' && (
          <>
            {/* Full-width Command Board */}
            <div className="system-pad-content">
              <CommandBoard
                commands={systemCommands}
                onCommandClick={handleCommandClick}
                onAddCommand={handleAddCommand}
                onEditCommand={handleEditCommand}
                onDeleteCommand={handleDeleteCommand}
                disabled={loading}
              />
            </div>

            {/* Console Panel Section */}
            <div className="console-section">
              <ConsolePanel entries={consoleEntries} onClear={handleClearConsole} />
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
          isSystemCommand={activeSection === 'systempad'}
        />
      )}

      {activeModal === 'confirmation' && confirmCommand &&
        (activeSection === 'systempad' ||
         (activeSection === 'padmode' && padCommandType === 'system') ||
         repoPath ||
         (activeSection === 'padmode' && padCommandType === 'git' && repoPath)) && (
        <ConfirmationModal
          command={confirmCommand.command}
          finalCommand={confirmCommand.finalCommand}
          repoPath={(activeSection === 'systempad' || (activeSection === 'padmode' && padCommandType === 'system')) ? '' : (repoPath || '')}
          isDangerous={isDangerous}
          onConfirm={handleExecuteCommand}
          onCancel={() => {
                        setActiveModal(null);
            setConfirmCommand(null);
          }}
        />
      )}

      {activeModal === 'variables' && variableCommand && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Enter Variables</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setActiveModal(null);
                  setVariableCommand(null);
                  setVariableInputs([]);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: 'rgba(255, 255, 255, 0.7)' }}>
                {variableCommand.name}: {variableCommand.description}
              </p>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                {variableCommand.variables && variableCommand.variables.map((variable, index) => (
                  <div key={variable.name} style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#D1FF75' }}>
                      {variable.label || variable.name}
                    </label>
                    <input
                      type="text"
                      value={variableInputs[index]?.value || ''}
                      onChange={(e) => {
                        const newInputs = [...variableInputs];
                        newInputs[index] = { ...newInputs[index], value: e.target.value };
                        setVariableInputs(newInputs);
                      }}
                      placeholder={`Enter ${variable.label || variable.name}`}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(209, 255, 117, 0.3)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontFamily: 'inherit',
                        fontSize: '0.9rem',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleVariableSubmit();
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setActiveModal(null);
                    setVariableCommand(null);
                    setVariableInputs([]);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleVariableSubmit}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Console Modal for Git Pad */}
      {showConsoleModal && activeSection === 'gitpad' && (
        <div className="modal-overlay" onClick={() => setShowConsoleModal(false)}>
          <div className="modal-content console-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">COMMAND OUTPUT</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowConsoleModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <ConsolePanel entries={consoleEntries} onClear={handleClearConsole} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
