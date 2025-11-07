import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineHome } from 'react-icons/ai';
import { MdCode } from 'react-icons/md';
import { FiGitBranch, FiSettings, FiLogOut, FiHelpCircle } from 'react-icons/fi';
import { HiMinus, HiX } from 'react-icons/hi';
import './Home.css';
import RepositoryBar from './RepositoryBar';
import ProjectBar from './ProjectBar';
import CommandBoard from './CommandBoard';
import ConsolePanel, { ConsoleEntry } from './ConsolePanel';
import CommandEditor from './CommandEditor';
import ConfirmationModal from './ConfirmationModal';
import CommandButton from './CommandButton';
import { GitCommand } from '../data/dummyCommands';
import { SystemCommand } from '../data/dummySystemCommands';
import { ProjectCommand } from '../data/dummyProjectCommands';
import { Prompt } from '../data/prompts';
import { gitService } from '../services/gitService';
import { systemService } from '../services/systemService';
import { projectService } from '../services/projectService';
import { promptsService } from '../services/promptsService';
import { useAuth } from '../contexts/AuthContext';
import type { RepoInfo } from '../preload';
import rightSideBg from '../../../assets/right-side-new-bg.png';

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
      pickProject: () => Promise<string | null>;
      executeProjectCommand: (projectPath: string, command: string) => Promise<any>;
      executeProjectCommandInTerminal: (projectPath: string, command: string, commandId: string, commandName?: string) => Promise<{ success: boolean; error?: string; commandId?: string }>;
      getProjectCommands: () => Promise<ProjectCommand[] | null>;
      saveProjectCommands: (commands: ProjectCommand[]) => Promise<{ success: boolean }>;
      getPrompts: () => Promise<Prompt[] | null>;
      savePrompts: (prompts: Prompt[]) => Promise<{ success: boolean }>;
      showToast: (message: string, commandText: string) => Promise<{ success: boolean }>;
      onProjectCommandOutput?: (callback: (data: { type: string; data: string }) => void) => () => void;
      setFrameless?: (frameless: boolean) => void;
      showConsoleWindow?: () => void;
      closeConsoleWindow?: () => void;
      updateConsoleEntries?: (entries: any[]) => void;
      sendConsoleCleared?: () => void;
    };
  }
}

interface VariableInput {
    name: string;
  value: string;
}

function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'home' | 'gitpad' | 'systempad' | 'projectpad' | 'promptspad' | 'padmode'>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [repoPath, setRepoPath] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [commands, setCommands] = useState<GitCommand[]>([]);
  const [systemCommands, setSystemCommands] = useState<SystemCommand[]>([]);
  const [projectCommands, setProjectCommands] = useState<ProjectCommand[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [activeModal, setActiveModal] = useState<'editor' | 'confirmation' | 'variables' | null>(null);
  const [editingCommand, setEditingCommand] = useState<GitCommand | SystemCommand | ProjectCommand | Prompt | null>(null);
  const [confirmCommand, setConfirmCommand] = useState<{
    command: GitCommand | SystemCommand | ProjectCommand;
    finalCommand: string;
  } | null>(null);
  const [variableCommand, setVariableCommand] = useState<GitCommand | SystemCommand | ProjectCommand | null>(null);
  const [variableInputs, setVariableInputs] = useState<VariableInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [padPage, setPadPage] = useState(0);
  const [padLayout, setPadLayout] = useState<{columns: number; rows: number}>({columns: 3, rows: 3});
  const [basePadWidth, setBasePadWidth] = useState<number | null>(null);
  const [padCommandType, setPadCommandType] = useState<'git' | 'system' | 'project' | 'prompts'>('system');
  const [runningCommands, setRunningCommands] = useState<Set<string>>(new Set());
  const [showConsoleModal, setShowConsoleModal] = useState(false);

  // Load commands and saved repository on mount
  useEffect(() => {
    loadCommands();
    loadSystemCommands();
    loadProjectCommands();
    loadPrompts();
    loadSavedRepository();
    loadSavedProject();

    // Listen for command finished events
    const cleanup1 = window.electron?.onCommandFinished?.((commandId: string) => {
      setRunningCommands((prev) => {
        const next = new Set(prev);
        next.delete(commandId);
        return next;
      });
    }) || (() => {});

    // Listen for project command output in real-time (for both regular and background commands)
    const cleanup2 = window.electron.onProjectCommandOutput?.((data: { type: string; data: string }) => {
      if (data.type === 'stdout') {
        addConsoleEntry('success', data.data);
      } else if (data.type === 'stderr') {
        addConsoleEntry('error', data.data);
      }
      // Show console modal if we're in projectpad section
      if (activeSection === 'projectpad') {
        setShowConsoleModal(true);
      }
    });

    return () => {
      if (cleanup1) cleanup1();
      if (cleanup2) cleanup2();
    };
  }, [activeSection]);

  // Close console modal when switching away from git pad or project pad
  useEffect(() => {
    if (activeSection !== 'gitpad' && activeSection !== 'projectpad') {
      setShowConsoleModal(false);
    }
  }, [activeSection]);

  // Update console window entries when consoleEntries changes (for pad mode)
  useEffect(() => {
    if (activeSection === 'padmode' && (padCommandType === 'git' || padCommandType === 'project')) {
      // Send console entries to console window
      if (window.electron.updateConsoleEntries) {
        window.electron.updateConsoleEntries(consoleEntries.map(e => ({
          type: e.type,
          message: e.message,
          timestamp: e.timestamp.getTime(),
        })));
      }
    }
  }, [consoleEntries, activeSection, padCommandType]);

  // Close console window when exiting pad mode
  useEffect(() => {
    if (activeSection !== 'padmode') {
      if (window.electron.closeConsoleWindow) {
        window.electron.closeConsoleWindow();
      }
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

  const loadProjectCommands = async () => {
    try {
      const loadedCommands = await projectService.loadCommands();
      setProjectCommands(loadedCommands);
    } catch (error) {
      console.error('Error loading project commands:', error);
    }
  };

  const loadPrompts = async () => {
    try {
      const loadedPrompts = await promptsService.loadPrompts();
      setPrompts(loadedPrompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const loadSavedRepository = () => {
    const saved = localStorage.getItem('gitPad_repoPath');
    if (saved) {
      validateAndSetRepository(saved);
    }
  };

  const loadSavedProject = () => {
    const saved = localStorage.getItem('projectPad_projectPath');
    if (saved) {
      setProjectPath(saved);
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

  const handlePickProject = async () => {
    try {
      const path = await projectService.pickProject();
      if (path) {
        setProjectPath(path);
        localStorage.setItem('projectPad_projectPath', path);
        addConsoleEntry('success', `Project selected: ${path}`);
      }
    } catch (error: any) {
      addConsoleEntry('error', `Error picking project: ${error.message}`);
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

  const executeGitCommandDirectly = async (command: GitCommand, finalCommand: string) => {
    if (!repoPath) {
      addConsoleEntry('warning', 'Please select a Git repository first');
      return;
    }

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

      // Refresh repo info after git command execution
      await refreshRepoInfo(repoPath);
    } catch (error: any) {
      addConsoleEntry('error', `Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const executeProjectCommandDirectly = async (command: ProjectCommand, finalCommand: string) => {
    if (!projectPath) {
      addConsoleEntry('warning', 'Please select a project folder first');
      return;
    }

    // Check if command has continuous output (server commands)
    const hasContinuousOutput = projectService.hasContinuousOutput(finalCommand);

    if (hasContinuousOutput) {
      // Run in background with toast notification (like system commands)
      try {
        const commandId = command.id;
        const commandName = command.name || command.command;
        const result = await window.electron.executeProjectCommandInTerminal(projectPath, finalCommand, commandId, commandName);

        if (result.success) {
          setRunningCommands((prev) => {
            const next = new Set(prev);
            next.add(commandId);
            return next;
          });
        } else {
          addConsoleEntry('error', `Failed to execute command: ${result.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        addConsoleEntry('error', `Error executing command: ${error.message || 'Unknown error'}`);
      }
    } else {
      // Regular command with console output
      // Add command to console
      addConsoleEntry('command', `Executing: ${finalCommand}`);
      setLoading(true);

      try {
        const result = await projectService.executeCommand(projectPath, finalCommand);

        // Output is already streamed in real-time via IPC events
        // Only show final result if there's additional output
        if (result.success) {
          // Only add success message if we haven't already shown output
          if (result.stdout && result.stdout !== 'Command started (running in background)...') {
            // Additional output might have come after the timeout
            if (!result.stdout.includes('Command started')) {
              addConsoleEntry('success', result.stdout);
            }
          } else if (result.output && !result.output.includes('Command started')) {
            addConsoleEntry('success', result.output);
          }
        } else {
          // Show error if any
          if (result.stderr) {
            addConsoleEntry('error', result.stderr);
          } else if (result.error) {
            addConsoleEntry('error', result.error);
          }
        }
      } catch (error: any) {
        addConsoleEntry('error', `Error: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
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

  const handleCommandClick = (command: GitCommand | SystemCommand | ProjectCommand | Prompt) => {
    try {
      // Determine command type based on active section
      const isSystemCommand = activeSection === 'systempad' ||
                              (activeSection === 'padmode' && padCommandType === 'system');
      const isProjectCommand = activeSection === 'projectpad' ||
                               (activeSection === 'padmode' && padCommandType === 'project');
      const isPrompt = activeSection === 'promptspad' ||
                       (activeSection === 'padmode' && padCommandType === 'prompts');
      const isPadModeSystem = activeSection === 'padmode' && padCommandType === 'system';
      const isPadModeGit = activeSection === 'padmode' && padCommandType === 'git';
      const isPadModeProject = activeSection === 'padmode' && padCommandType === 'project';

      // Handle prompt clicks (copy to clipboard)
      if (isPrompt) {
        handlePromptClick(command as Prompt);
        return;
      }

      // Check if command is already running (for pad mode system or project commands)
      if ((isPadModeSystem || isPadModeProject) && runningCommands.has(command.id)) {
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
      } else if (isProjectCommand) {
        // Project command
        if (!projectPath && (activeSection === 'projectpad' || activeSection === 'padmode')) {
          addConsoleEntry('warning', 'Please select a project folder first');
          return;
        }

        // Check if command is already running (for non-pad mode project commands with continuous output)
        const hasContinuousOutput = projectService.hasContinuousOutput(command.command);
        if (!isPadModeProject && hasContinuousOutput && runningCommands.has(command.id)) {
          // Kill the running command
          killCommandInTerminal(command.id);
          return;
        }

        // Check if variables need to be collected
        if (command.variables && command.variables.length > 0) {
          collectVariables(command);
        } else {
          // For pad mode project commands, execute directly without confirmation
          if (isPadModeProject) {
            executeProjectCommandDirectly(command as ProjectCommand, command.command);
          } else {
            // For non-pad mode, check if it's a continuous output command
            if (hasContinuousOutput) {
              // Execute in background with toast
              executeProjectCommandDirectly(command as ProjectCommand, command.command);
            } else {
              proceedToConfirmation(command, command.command);
            }
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
          // For pad mode git commands, execute directly without confirmation
          if (isPadModeGit) {
            executeGitCommandDirectly(command as GitCommand, command.command);
          } else {
            proceedToConfirmation(command, command.command);
          }
        }
      }
    } catch (error: any) {
      console.error('Error in handleCommandClick:', error);
      addConsoleEntry('error', `Error executing command: ${error.message || 'Unknown error'}`);
    }
  };

  const collectVariables = (command: GitCommand | SystemCommand | ProjectCommand) => {
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
    const isProjectCommand = activeSection === 'projectpad' ||
                             (activeSection === 'padmode' && padCommandType === 'project');
    const isPadModeSystem = activeSection === 'padmode' && padCommandType === 'system';
    const isPadModeGit = activeSection === 'padmode' && padCommandType === 'git';
    const isPadModeProject = activeSection === 'padmode' && padCommandType === 'project';

    if (isSystemCommand) {
      finalCommand = systemService.replaceVariables(variableCommand.command, variableCommand.variables, values);
    } else if (isProjectCommand) {
      finalCommand = projectService.replaceVariables(variableCommand.command, variableCommand.variables, values);
    } else {
      finalCommand = gitService.replaceVariables(variableCommand.command, variableCommand.variables, values);
    }

    setActiveModal(null);
    setVariableCommand(null);
    setVariableInputs([]);

    // For pad mode commands, execute directly
    if (isPadModeSystem) {
      executeCommandInTerminal(variableCommand, finalCommand);
    } else if (isPadModeGit) {
      executeGitCommandDirectly(variableCommand as GitCommand, finalCommand);
    } else if (isPadModeProject) {
      executeProjectCommandDirectly(variableCommand as ProjectCommand, finalCommand);
    } else if (isProjectCommand) {
      // For non-pad mode project commands, check if continuous output
      const hasContinuousOutput = projectService.hasContinuousOutput(finalCommand);
      if (hasContinuousOutput) {
        executeProjectCommandDirectly(variableCommand as ProjectCommand, finalCommand);
      } else {
        proceedToConfirmation(variableCommand, finalCommand);
      }
    } else {
      proceedToConfirmation(variableCommand, finalCommand);
    }
  };

  const proceedToConfirmation = (command: GitCommand | SystemCommand | ProjectCommand, finalCommand: string) => {
    setConfirmCommand({ command, finalCommand });
    setActiveModal('confirmation');
  };

  const handleExecuteCommand = async () => {
    if (!confirmCommand) return;

    // System commands don't need repoPath
    const isSystemCommand = activeSection === 'systempad' ||
                            (activeSection === 'padmode' && padCommandType === 'system');
    const isProjectCommand = activeSection === 'projectpad' ||
                             (activeSection === 'padmode' && padCommandType === 'project');
    if (!isSystemCommand && !isProjectCommand && (activeSection === 'gitpad' || activeSection === 'padmode') && !repoPath) return;
    if (isProjectCommand && !projectPath) return;

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
      } else if (isProjectCommand) {
        // Project command
        if (!projectPath) return;
        result = await projectService.executeCommand(projectPath, finalCommand);
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

      // Show console modal for git pad or project pad after command execution
      if ((activeSection === 'gitpad' || activeSection === 'projectpad') && !isSystemCommand) {
        setShowConsoleModal(true);
      }
    } catch (error: any) {
      addConsoleEntry('error', `Error: ${error.message || 'Unknown error'}`);

      // Show console modal for git pad or project pad even on error
      if ((activeSection === 'gitpad' || activeSection === 'projectpad') && !isSystemCommand) {
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

  const handleEditCommand = (command: GitCommand | SystemCommand | ProjectCommand | Prompt) => {
    setEditingCommand(command);
    setActiveModal('editor');
  };

  const handlePromptClick = async (prompt: Prompt) => {
    try {
      // Copy prompt text to clipboard
      await navigator.clipboard.writeText(prompt.text);
      
      // Show toast notification
      if (window.electron.showToast) {
        await window.electron.showToast(
          `${prompt.name} has been copied to the clipboard`,
          prompt.text.substring(0, 50) + (prompt.text.length > 50 ? '...' : '')
        );
      }
    } catch (error) {
      console.error('Error copying prompt to clipboard:', error);
      addConsoleEntry('error', `Failed to copy prompt "${prompt.name}" to clipboard`);
    }
  };

  const handleSaveCommand = async (command: GitCommand | SystemCommand | ProjectCommand | Prompt) => {
    if (activeSection === 'promptspad') {
      // Prompt
      const prompt = command as Prompt;
      if (editingCommand) {
        // Update existing
        const updated = prompts.map((p) => (p.id === prompt.id ? prompt : p));
        setPrompts(updated);
        await promptsService.savePrompts(updated);
      } else {
        // Add new
        const updated = [...prompts, prompt];
        setPrompts(updated);
        await promptsService.savePrompts(updated);
      }
    } else if (activeSection === 'systempad') {
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
    } else if (activeSection === 'projectpad') {
      // Project command
      const projectCmd = command as ProjectCommand;
      if (editingCommand) {
        // Update existing
        const updated = projectCommands.map((c) => (c.id === projectCmd.id ? projectCmd : c));
        setProjectCommands(updated);
        await projectService.saveCommands(updated);
      } else {
        // Add new
        const updated = [...projectCommands, projectCmd];
        setProjectCommands(updated);
        await projectService.saveCommands(updated);
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
    const itemType = activeSection === 'promptspad' ? 'Prompt' : 'Command';
    addConsoleEntry('success', `${itemType} "${command.name}" ${editingCommand ? 'updated' : 'created'}`);
  };

  const handleDeleteCommand = async (command: GitCommand | SystemCommand | ProjectCommand | Prompt) => {
    if (window.confirm(`Delete ${activeSection === 'promptspad' ? 'prompt' : 'command'} "${command.name}"?`)) {
      if (activeSection === 'promptspad') {
        const updated = prompts.filter((p) => p.id !== command.id);
        setPrompts(updated);
        await promptsService.savePrompts(updated);
        addConsoleEntry('info', `Prompt "${command.name}" deleted`);
      } else if (activeSection === 'systempad') {
        const updated = systemCommands.filter((c) => c.id !== command.id);
        setSystemCommands(updated);
        await systemService.saveCommands(updated);
      } else if (activeSection === 'projectpad') {
        const updated = projectCommands.filter((c) => c.id !== command.id);
        setProjectCommands(updated);
        await projectService.saveCommands(updated);
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
    // Notify console window
    if (window.electron.sendConsoleCleared) {
      window.electron.sendConsoleCleared();
    }
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
    // Always minimize to system tray
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
      case 'power':
        return '⚡';
      case 'network':
        return '🌐';
      case 'audio':
        return '🔊';
      case 'utilities':
        return '🛠️';
      case 'server':
        return '🚀';
      case 'build':
        return '🔨';
      case 'test':
        return '🧪';
      case 'database':
        return '🗄️';
      case 'ai':
        return '🤖';
      case 'code':
        return '💻';
      case 'writing':
        return '✍️';
      case 'general':
        return '📝';
      default:
        return '⚡';
    }
  };

  // Handle window resize and positioning for pad mode
  useEffect(() => {
    if (activeSection === 'padmode') {
      // Position window at top-right and resize for pad mode
      // Show console window for git pad mode or project pad mode
      window.electron.enterPadMode(padCommandType === 'git' || padCommandType === 'project');
      // Store the base width for 3x3 layout
      window.electron.getWindowSize().then((size) => {
        setBasePadWidth(size.width);
      }).catch((error) => {
        console.error('Error getting window size:', error);
      });
    }
    // No cleanup needed - centerWindow handles resizing when closing pad mode
  }, [activeSection, padCommandType]);

  // Reset to page 0 when layout changes
  useEffect(() => {
    if (activeSection === 'padmode') {
      setPadPage(0);
    }
  }, [padLayout, activeSection]);

  // Reset to page 0 when command type changes, show/hide console window, and adjust height
  useEffect(() => {
    if (activeSection === 'padmode') {
      setPadPage(0);
      // Save current position before changing type (window position is maintained)
      if (window.electron.savePadModePosition) {
        window.electron.savePadModePosition();
      }
      // All pad modes use consistent height: 320px
      window.electron.getWindowSize().then((size) => {
        const newHeight = 320;
        window.electron.resizeWindow(size.width, newHeight);
      }).catch((error) => {
        console.error('Error resizing window for pad type:', error);
      });
      // Show/hide console window based on pad command type
      if (padCommandType === 'git' || padCommandType === 'project') {
        window.electron.showConsoleWindow();
      } else {
        window.electron.closeConsoleWindow();
      }
    }
  }, [padCommandType, activeSection]);

  // Resize window when layout changes in pad mode
  useEffect(() => {
    if (activeSection === 'padmode' && basePadWidth !== null) {
      const resizeWindowForLayout = async () => {
        try {
          // Save current position before layout change
          if (window.electron.savePadModePosition) {
            window.electron.savePadModePosition();
          }

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

          // Keep current position when layout changes (don't reposition)
          // Just resize the window, position stays the same
          await window.electron.resizeWindow(newWidth, currentHeight);
        } catch (error) {
          console.error('Error resizing window:', error);
        }
      };

      resizeWindowForLayout();
    }
  }, [padLayout, activeSection, basePadWidth]);

  if (activeSection === 'padmode') {
    const currentCommands = padCommandType === 'system' ? systemCommands :
                           padCommandType === 'project' ? projectCommands :
                           padCommandType === 'prompts' ? prompts :
                           commands;
    const commandsPerPage = padLayout.columns * padLayout.rows;
    const totalPages = Math.ceil(currentCommands.length / commandsPerPage);
    const paginatedCommands = currentCommands.slice(
      padPage * commandsPerPage,
      (padPage + 1) * commandsPerPage
    );

    return (
      <div
        className={`pad-mode-container pad-mode-${padCommandType} pad-mode-layout-${padLayout.columns}x${padLayout.rows}`}
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
        {/* Repository Bar for Git Pad Mode */}
        {padCommandType === 'git' && (
          <div className="pad-mode-repo-bar">
            <RepositoryBar
              repoPath={repoPath}
              onPickRepository={handlePickRepository}
            />
          </div>
        )}
        {/* Project Bar for Project Pad Mode */}
        {padCommandType === 'project' && (
          <div className="pad-mode-repo-bar">
            <ProjectBar
              projectPath={projectPath}
              onPickProject={handlePickProject}
            />
          </div>
        )}

        <div className={`pad-mode-grid pad-mode-grid-${padLayout.columns}-${padLayout.rows}`}>
          {paginatedCommands.map((command) => {
            const isRunning = runningCommands.has(command.id);
            const isPadSystemCommand = padCommandType === 'system';
            const isPadProjectCommand = padCommandType === 'project';
            const shouldShowActive = isRunning && (isPadSystemCommand || isPadProjectCommand);
            return (
              <div key={command.id} className="pad-mode-button-wrapper">
                <button
                  type="button"
                  className={`pad-mode-button ${command.category} ${shouldShowActive ? 'active-running' : ''}`}
                  onClick={() => handleCommandClick(command)}
                  disabled={loading || (padCommandType === 'git' && !repoPath) || (padCommandType === 'project' && !projectPath)}
                  title={shouldShowActive ? `Click to kill: ${(command as any).description || command.name}` : ((command as any).description || command.name)}
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
              className={`pad-mode-toggle-btn ${padCommandType === 'project' ? 'active' : ''}`}
              onClick={() => setPadCommandType('project')}
              title="Project Commands"
            >
              Project
            </button>
            <button
              type="button"
              className={`pad-mode-toggle-btn ${padCommandType === 'system' ? 'active' : ''}`}
              onClick={() => setPadCommandType('system')}
              title="System Commands"
            >
              System
            </button>
            <button
              type="button"
              className={`pad-mode-toggle-btn ${padCommandType === 'prompts' ? 'active' : ''}`}
              onClick={() => setPadCommandType('prompts')}
              title="Prompts"
            >
              Prompts
            </button>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="cyber-dashboard" style={{ backgroundImage: `url(${rightSideBg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
      {/* Sidebar */}
      <aside className={`cyber-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-text">
            {sidebarCollapsed ? 'Pad' : 'Command Pad'}
          </div>
          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
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
            className={`nav-button ${activeSection === 'projectpad' ? 'active' : ''}`}
            onClick={() => setActiveSection('projectpad')}
          >
            <MdCode size={20} />
            <span>Project Pad</span>
          </button>
          <button
            type="button"
            className={`nav-button ${activeSection === 'systempad' ? 'active' : ''}`}
            onClick={() => setActiveSection('systempad')}
          >
            <FiSettings size={20} />
            <span>System Pad</span>
          </button>
          <button
            type="button"
            className={`nav-button ${activeSection === 'promptspad' ? 'active' : ''}`}
            onClick={() => setActiveSection('promptspad')}
          >
            <MdCode size={20} />
            <span>Prompts Pad</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <button
            type="button"
            className="nav-button"
            onClick={() => {
              navigate('/onboarding');
            }}
            title="View Onboarding"
          >
            <FiHelpCircle size={20} />
            <span>Onboarding</span>
          </button>
          <button
            type="button"
            className="nav-button logout-button"
            onClick={async () => {
              await logout();
              navigate('/auth');
            }}
            title="Logout"
          >
            <FiLogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
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
                : activeSection === 'projectpad'
                ? 'PROJECT COMMAND PAD'
                : activeSection === 'promptspad'
                ? 'PROMPTS PAD'
                : 'GIT COMMAND PAD'}
            </h1>
            <p className="cyber-subtitle">
              {activeSection === 'home'
                ? 'Visual Git command execution dashboard'
                : activeSection === 'systempad'
                ? 'Execute system commands with visual buttons'
                : activeSection === 'promptspad'
                ? 'Copy prompts to clipboard with one click'
                : activeSection === 'projectpad'
                ? 'Execute project commands with visual buttons'
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
            <div className="tips-section">
              <h2 className="section-title">HOW TO USE THE PADS</h2>
              <div className="tips-grid">
                <div className="tip-card">
                  <h3 className="tip-title">Git Pad</h3>
                  <p className="tip-description">
                    Execute Git commands visually. First, select a Git repository using the "Pick Repository" button.
                    Then click any command button to execute it. Commands with variables will prompt you for input.
                    Use "Add Command" to create custom Git commands. The console window shows command output in real-time.
                  </p>
                </div>

                <div className="tip-card">
                  <h3 className="tip-title">Project Pad</h3>
                  <p className="tip-description">
                    Run project-specific commands like "php artisan serve" or "npm start". Select your project folder first,
                    then execute commands. Server commands (with continuous output) run in background with toast notifications
                    and show active state. Click the active button to terminate running commands. Output streams to console.
                  </p>
                </div>

                <div className="tip-card">
                  <h3 className="tip-title">System Pad</h3>
                  <p className="tip-description">
                    Execute system commands that run in the background. Commands show toast notifications when activated
                    and display active state on buttons. Click active buttons to kill running commands. Perfect for power
                    management, network operations, and system utilities.
                  </p>
                </div>

                <div className="tip-card">
                  <h3 className="tip-title">Pad Mode</h3>
                  <p className="tip-description">
                    Minimal button-only interface accessible from any pad section. Switch between Git, Project, and System
                    commands using the toggle buttons. Adjust layout (1x3, 2x3, 3x3) for different screen sizes. The window
                    is draggable and remembers its position. Minimize to system tray (macOS) or top navbar.
                  </p>
                </div>

                <div className="tip-card">
                  <h3 className="tip-title">Command Editor</h3>
                  <p className="tip-description">
                    Create custom commands with variables. Use {'{{variableName}}'} syntax for user input. Variables can be
                    text fields or dropdowns. Commands can require confirmation for safety. Edit or delete commands using
                    the action buttons on each command card.
                  </p>
                </div>

                <div className="tip-card">
                  <h3 className="tip-title">Console Output</h3>
                  <p className="tip-description">
                    Git Pad and Project Pad show command output in a console window. In pad mode, the console appears as 
                    a separate window. Regular commands show output immediately. Long-running commands (like servers) stream 
                    output in real-time while showing active state on buttons.
                  </p>
                </div>
              </div>

              {/* Quick Access Pads */}
              <div className="quick-access-pads">
                <h2 className="section-title">QUICK ACCESS PADS</h2>
                <div className="quick-access-grid">
                  <button
                    type="button"
                    className="quick-access-btn"
                    onClick={() => {
                      setPadCommandType('git');
                      setActiveSection('padmode');
                      window.electron.enterPadMode(true);
                    }}
                  >
                    <div className="quick-access-icon">
                      <FiGitBranch size={24} />
                    </div>
                    <div className="quick-access-content">
                      <span className="quick-access-title">Git Pad</span>
                      <span className="quick-access-subtitle">Git commands</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="quick-access-btn"
                    onClick={() => {
                      setPadCommandType('project');
                      setActiveSection('padmode');
                      window.electron.enterPadMode(true);
                    }}
                  >
                    <div className="quick-access-icon">
                      <MdCode size={24} />
                    </div>
                    <div className="quick-access-content">
                      <span className="quick-access-title">Project Pad</span>
                      <span className="quick-access-subtitle">Project commands</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="quick-access-btn"
                    onClick={() => {
                      setPadCommandType('system');
                      setActiveSection('padmode');
                      window.electron.enterPadMode(false);
                    }}
                  >
                    <div className="quick-access-icon">
                      <FiSettings size={24} />
                    </div>
                    <div className="quick-access-content">
                      <span className="quick-access-title">System Pad</span>
                      <span className="quick-access-subtitle">System commands</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    className="quick-access-btn"
                    onClick={() => {
                      setPadCommandType('git');
                      setActiveSection('padmode');
                      window.electron.enterPadMode(true);
                    }}
                  >
                    <div className="quick-access-icon">
                      <MdCode size={24} />
                    </div>
                    <div className="quick-access-content">
                      <span className="quick-access-title">Pad Mode</span>
                      <span className="quick-access-subtitle">Minimal interface</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Git Pad Section */}
        {activeSection === 'gitpad' && (
          <>
            {/* Git Pad Button */}
            <div className="section-header-btn">
              <button
                className="section-mode-btn"
                onClick={() => {
                  setPadCommandType('git');
                  setActiveSection('padmode');
                  window.electron.enterPadMode();
                }}
                title="Open Git Pad Mode"
              >
                <MdCode size={16} />
                <span>Git Pad Mode</span>
              </button>
            </div>

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

        {/* Project Pad Section */}
        {activeSection === 'projectpad' && (
          <>
            {/* Project Pad Button */}
            <div className="section-header-btn">
              <button
                className="section-mode-btn"
                onClick={() => {
                  setPadCommandType('project');
                  setActiveSection('padmode');
                  window.electron.enterPadMode(true);
                }}
                title="Open Project Pad Mode"
              >
                <MdCode size={16} />
                <span>Project Pad Mode</span>
              </button>
            </div>

            {/* Main Content Grid */}
            <div className="git-pad-content">
              <div className="git-pad-left">
                    <CommandBoard
                      commands={projectCommands}
                      onCommandClick={handleCommandClick}
                      onAddCommand={handleAddCommand}
                      onEditCommand={handleEditCommand}
                      onDeleteCommand={handleDeleteCommand}
                      disabled={loading || !projectPath}
                      runningCommands={runningCommands}
                    />
              </div>
            </div>
          </>
        )}

        {/* System Pad Section */}
        {activeSection === 'systempad' && (
          <>
            {/* Pad Mode Button */}
            <div className="section-header-btn">
              <button
                className="section-mode-btn"
                onClick={() => {
                  setPadCommandType('system');
                  setActiveSection('padmode');
                  window.electron.enterPadMode();
                }}
                title="Open System Pad Mode"
              >
                <MdCode size={16} />
                <span>Pad Mode</span>
              </button>
            </div>

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
          </>
        )}

        {/* Prompts Pad Section */}
        {activeSection === 'promptspad' && (
          <>
            {/* Pad Mode Button */}
            <div className="section-header-btn">
              <button
                className="section-mode-btn"
                onClick={() => {
                  setPadCommandType('prompts');
                  setActiveSection('padmode');
                  window.electron.enterPadMode();
                }}
                title="Open Prompts Pad Mode"
              >
                <MdCode size={16} />
                <span>Pad Mode</span>
              </button>
            </div>

            {/* Full-width Command Board */}
            <div className="prompts-pad-content">
              <CommandBoard
                commands={prompts}
                onCommandClick={handleCommandClick}
                onAddCommand={handleAddCommand}
                onEditCommand={handleEditCommand}
                onDeleteCommand={handleDeleteCommand}
                disabled={loading}
              />
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
          isProjectCommand={activeSection === 'projectpad'}
          isPrompt={activeSection === 'promptspad'}
        />
      )}

      {activeModal === 'confirmation' && confirmCommand &&
        (activeSection === 'systempad' ||
         (activeSection === 'padmode' && padCommandType === 'system') ||
         repoPath ||
         projectPath ||
         (activeSection === 'padmode' && padCommandType === 'git' && repoPath) ||
         (activeSection === 'padmode' && padCommandType === 'project' && projectPath)) && (
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

      {/* Console Modal for Git Pad and Project Pad (only in gitpad/projectpad section, not padmode) */}
      {showConsoleModal && (activeSection === 'gitpad' || activeSection === 'projectpad') && (
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
