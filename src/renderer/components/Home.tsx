import React, { useState, useEffect } from 'react';
import { AiOutlineHome, AiOutlinePlayCircle, AiOutlinePauseCircle, AiOutlineSetting, AiOutlineStop } from 'react-icons/ai';
import { MdTask, MdMessage, MdFolder, MdClose, MdAdd, MdExpandMore, MdExpandLess, MdEdit, MdDelete, MdCheck, MdSwapHoriz } from 'react-icons/md';
import { FiClock, FiActivity, FiFolder, FiUser, FiCalendar } from 'react-icons/fi';
import logo from '../../../assets/logo.png';
import './Home.css';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import SmartTextEditor from './SmartTextEditor';
import SplitViewPanel from './SplitViewPanel';
import { useHotkeys } from 'react-hotkeys-hook';

// Extended window interface for pomodoro functionality
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
    };
  }
}

// Types
interface Project {
  id: number;
  title: string;
  description?: string;
  status: 'active' | 'inactive' | 'completed';
  created_at: string;
  updated_at: string;
  tasks_count?: number;
}

interface Task {
  id: number;
  project_id: number;
  phase_id?: number;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  due_date?: string;
  assigned_to?: number;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  tags?: string[];
  estimated_hours?: string;
  created_at: string;
  updated_at: string;
  project?: {
    id: number;
    title: string;
    status?: string;
  };
  assigned_user?: {
    id: number;
    name: string;
    email?: string;
  };
  subtasks?: Subtask[];
}

interface Subtask {
  id: number;
  task_id: number;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  created_at: string;
  updated_at: string;
}

interface NewTask {
  project_id: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  due_date?: string;
  assigned_to?: number;
  tags?: string[];
  estimated_hours?: string;
}

// API Service - Simplified and more robust URL construction
const getApiBaseUrl = () => {
  const defaultUrl = 'http://localhost:8000/api';

  try {
    // Try to get from window.config if available
    const configUrl = window?.config?.apiUrl;

    if (configUrl && typeof configUrl === 'string' && configUrl.startsWith('http')) {
      // Validate that the URL doesn't have any malformed parts
      const url = new URL(configUrl);
      const validUrl = url.toString().replace(/\/$/, ''); // Remove trailing slash
      console.log('✅ Using validated config URL:', validUrl);
      return validUrl;
    }

    console.log('⚠️ Using default URL (config not available or invalid):', defaultUrl);
    return defaultUrl;
  } catch (error) {
    console.error('❌ Error getting API base URL, using default:', error);
    return defaultUrl;
  }
};

// Validate the final URL
const validateApiUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const validUrl = urlObj.toString().replace(/\/$/, ''); // Remove trailing slash

    // Extra check to ensure we don't have malformed URLs like ":8000"
    if (!validUrl.includes('://')) {
      throw new Error('Invalid URL format');
    }

    return validUrl;
  } catch (error) {
    console.error('❌ URL validation failed, using fallback:', error);
    return 'http://localhost:8000/api';
  }
};

const API_BASE_URL = validateApiUrl(getApiBaseUrl());
console.log('🌐 Validated Task API Base URL:', API_BASE_URL);

const getAuthHeaders = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('No auth token found. Please log in again.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
};

const apiService = {
  // Project endpoints
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      headers: await getAuthHeaders(),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch projects: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  // Task endpoints
  async getTasks(): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      headers: await getAuthHeaders(),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch tasks: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  async createTask(task: NewTask): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify(task),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create task: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  async updateTask(id: number, updates: Partial<Task>): Promise<Task> {
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update task: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  async deleteTask(id: number): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to delete task: ${response.status} ${errorText}`);
    }
  },

  async getTasksByProject(projectId: number): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks/project/${projectId}`, {
      headers: await getAuthHeaders(),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch project tasks: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  async getTasksByPhase(phaseId: number): Promise<Task[]> {
    const response = await fetch(`${API_BASE_URL}/tasks/phase/${phaseId}`, {
      headers: await getAuthHeaders(),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch phase tasks: ${response.status} ${errorText}`);
    }
    return response.json();
  },

    async getSubtasks(taskId: number): Promise<{ success: boolean; data: Subtask[] }> {
    const url = `${API_BASE_URL}/tasks/${taskId}/subtasks`;

    const response = await fetch(url, {
      headers: await getAuthHeaders(),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch subtasks: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  async createSubtask(taskId: number, description: string): Promise<{ success: boolean; data: Subtask }> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: await getAuthHeaders(),
      body: JSON.stringify({
        description,
        status: 'todo'
      }),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create subtask: ${response.status} ${errorText}`);
    }
    return response.json();
  },

    async updateSubtask(taskId: number, subtaskId: number, updates: Partial<Subtask>): Promise<Subtask> {
    const url = `${API_BASE_URL}/tasks/${taskId}/subtasks/${subtaskId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: await getAuthHeaders(),
      body: JSON.stringify(updates),
    });

    if (response.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update subtask: ${response.status} ${errorText}`);
    }
    return response.json();
  },
};

// Dummy data for messages and activities (can be replaced with real API later)
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

function Home() {
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'tasks' | 'files'>('dashboard');
  const [activeModal, setActiveModal] = useState<'task' | 'message' | 'file' | 'timer' | 'taskDetail' | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Pomodoro Timer State
  const [pomodoroState, setPomodoroState] = useState({
    isActive: false,
    isPaused: false,
    currentSession: 'work' as 'work' | 'shortBreak' | 'longBreak',
    sessionCount: 0,
    timeRemaining: 25 * 60, // 25 minutes in seconds
    isWidgetMode: false
  });

  const [pomodoroSettings, setPomodoroSettings] = useState({
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4
  });

  const [pomodoroTask, setPomodoroTask] = useState('');
  const [pomodoroNotes, setPomodoroNotes] = useState('');
  const [showPomodoroSettings, setShowPomodoroSettings] = useState(false);

  // Store original window state for restoration
  const [originalWindowState, setOriginalWindowState] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  // Project and Task management state
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Task wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [taskFormData, setTaskFormData] = useState<NewTask>({
    project_id: 1, // Default project
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo', // Default status
    due_date: '',
    tags: [],
  });

  // Subtask creation state
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');

  // Smart editing and split view state
  const [showSplitView, setShowSplitView] = useState(false);
  const [splitViewPanels, setSplitViewPanels] = useState<Array<{
    id: string;
    title: string;
    content: React.ReactNode;
    closable: boolean;
  }>>([
    {
      id: 'tasks',
      title: 'Task List',
      content: null,
      closable: false,
    },
    {
      id: 'editor',
      title: 'Smart Editor',
      content: null,
      closable: false,
    }
  ]);
  const [splitOrientation, setSplitOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  // Load projects and tasks on component mount
  useEffect(() => {
    loadProjects();
    loadTasks();
  }, []);

  // Filter tasks when selected project changes
  useEffect(() => {
    if (selectedProject) {
      const projectTasks = tasks.filter(task => task.project_id === selectedProject.id);
      setFilteredTasks(projectTasks);
    } else {
      setFilteredTasks(tasks);
    }
  }, [selectedProject, tasks]);

  // Pomodoro Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (pomodoroState.isActive && !pomodoroState.isPaused) {
      interval = setInterval(() => {
        setPomodoroState(prev => {
          if (prev.timeRemaining <= 1) {
            // Timer finished, move to next session
            const nextSession = getNextSession(prev.currentSession, prev.sessionCount);
            const nextDuration = getSessionDuration(nextSession.session);

            // Show notification
            if (Notification.permission === 'granted') {
              new Notification('Pomodoro Timer', {
                body: nextSession.session === 'work'
                  ? 'Break time is over! Ready to focus?'
                  : 'Great work! Time for a break.',
                icon: '/assets/logo.png'
              });
            }

            return {
              ...prev,
              currentSession: nextSession.session,
              sessionCount: nextSession.sessionCount,
              timeRemaining: nextDuration * 60,
              isActive: false, // Auto-pause for user to acknowledge
              isPaused: false
            };
          }

          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pomodoroState.isActive, pomodoroState.isPaused]);

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const fetchedProjects = await apiService.getProjects();
      setProjects(fetchedProjects);
      if (fetchedProjects.length > 0 && !selectedProject) {
        setSelectedProject(fetchedProjects[0]);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      // If projects API fails, create a default project
      const defaultProject: Project = {
        id: 1,
        title: 'Default Project',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProjects([defaultProject]);
      setSelectedProject(defaultProject);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTasks = await apiService.getTasks();

      // Load subtasks for each task
      const tasksWithSubtasks = await Promise.all(
        fetchedTasks.map(async (task) => {
          try {
            const subtasksResponse = await apiService.getSubtasks(task.id);
            return { ...task, subtasks: subtasksResponse.data || [] };
          } catch (err) {
            console.error(`Error loading subtasks for task ${task.id}:`, err);
            return { ...task, subtasks: [] };
          }
        })
      );

      setTasks(tasksWithSubtasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      console.error('Error loading tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = async (project: Project) => {
    setSelectedProject(project);
    setTaskFormData(prev => ({ ...prev, project_id: project.id }));

    try {
      setLoading(true);
      const projectTasks = await apiService.getTasksByProject(project.id);
      const tasksWithSubtasks = await Promise.all(
        projectTasks.map(async (task) => {
          try {
            const subtasksResponse = await apiService.getSubtasks(task.id);
            return { ...task, subtasks: subtasksResponse.data || [] };
          } catch (err) {
            return { ...task, subtasks: [] };
          }
        })
      );
      setFilteredTasks(tasksWithSubtasks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async () => {
    try {
      setLoading(true);
      setError(null);
      const newTask = await apiService.createTask(taskFormData);
      setTasks(prev => [{ ...newTask, subtasks: [] }, ...prev]);
      setActiveModal(null);
      setWizardStep(1); // Reset wizard to step 1
      // Reset form
      setTaskFormData({
        project_id: selectedProject?.id || 1,
        title: '',
        description: '',
        priority: 'medium',
        status: 'todo',
        due_date: '',
        tags: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      console.error('Error creating task:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: number, status: Task['status']) => {
    try {
      const updatedTask = await apiService.updateTask(taskId, { status });
      setTasks(prev => prev.map(task =>
        task.id === taskId ? { ...task, status: updatedTask.status } : task
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      console.error('Error updating task:', err);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await apiService.deleteTask(taskId);
      setTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      console.error('Error deleting task:', err);
    }
  };

  const handleToggleTaskExpansion = (taskId: number) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleCreateSubtask = async (taskId: number, description: string) => {
    try {
      const response = await apiService.createSubtask(taskId, description);
      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? { ...task, subtasks: [...(task.subtasks || []), response.data] }
          : task
      ));
      // Update selectedTask if it's the current task
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(prev => prev ? {
          ...prev,
          subtasks: [...(prev.subtasks || []), response.data]
        } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subtask');
      console.error('Error creating subtask:', err);
    }
  };

  const handleSubmitSubtask = async () => {
    if (!selectedTask || !newSubtaskDescription.trim()) return;

    try {
      setLoading(true);
      await handleCreateSubtask(selectedTask.id, newSubtaskDescription.trim());
      setNewSubtaskDescription('');
      setShowSubtaskForm(false);
    } catch (err) {
      console.error('Error submitting subtask:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubtask = () => {
    setNewSubtaskDescription('');
    setShowSubtaskForm(false);
  };

  // Split view panel handlers
  const handlePanelClose = (panelId: string) => {
    setSplitViewPanels(panels => panels.filter(p => p.id !== panelId));
  };

  const handleOrientationChange = (orientation: 'horizontal' | 'vertical') => {
    setSplitOrientation(orientation);
  };

  // Render task list content for split view
  const renderTaskListPanel = () => (
    <div className="task-list-panel">
      <div className="task-summary">
        <h3>Active Tasks ({filteredTasks.length})</h3>
        <div className="task-stats">
          <span className="stat-item">
            📋 {filteredTasks.filter(t => t.status === 'todo').length} To Do
          </span>
          <span className="stat-item">
            ⚡ {filteredTasks.filter(t => t.status === 'in_progress').length} In Progress
          </span>
          <span className="stat-item">
            ✅ {filteredTasks.filter(t => t.status === 'done').length} Done
          </span>
        </div>
      </div>
      <div className="task-list-compact">
        {filteredTasks.slice(0, 10).map(task => (
          <div key={task.id} className={`task-item-compact ${task.priority}`}>
            <div className="task-compact-header">
              <span className="task-compact-title">{task.title}</span>
              <span className={`status-indicator ${task.status}`}>
                {task.status === 'todo' ? '📋' : task.status === 'in_progress' ? '⚡' : '✅'}
              </span>
            </div>
            {task.description && (
              <p className="task-compact-description">{task.description.substring(0, 80)}...</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Render smart editor panel
  const renderSmartEditorPanel = () => (
    <div className="smart-editor-panel">
      <div className="editor-toolbar">
        <h3>Smart Notes & Task Editor</h3>
        <div className="editor-actions">
          <button className="editor-btn" title="Format text">
            📝 Format
          </button>
          <button className="editor-btn" title="Add template">
            📋 Template
          </button>
        </div>
      </div>
      <div className="editor-workspace">
        <SmartTextEditor
          value={pomodoroNotes}
          onChange={setPomodoroNotes}
          placeholder="Start typing with smart autocomplete... Try 'Bug', 'Feature', 'TODO', etc."
          multiline={true}
          rows={15}
          className="workspace-editor"
        />
      </div>
      <div className="editor-hints">
        <div className="hint-group">
          <strong>Multi-cursor shortcuts:</strong>
          <span><kbd>Ctrl+D</kbd> Add cursor at next occurrence</span>
          <span><kbd>Ctrl+Shift+L</kbd> Select all occurrences</span>
        </div>
        <div className="hint-group">
          <strong>Smart suggestions:</strong>
          <span>Type keywords like "Bug", "Feature", "TODO" for autocomplete</span>
        </div>
      </div>
    </div>
  );

  // Update split view panels content
  React.useEffect(() => {
    setSplitViewPanels(panels => panels.map(panel => {
      if (panel.id === 'tasks') {
        return { ...panel, content: renderTaskListPanel() };
      } else if (panel.id === 'editor') {
        return { ...panel, content: renderSmartEditorPanel() };
      }
      return panel;
    }));
  }, [filteredTasks, pomodoroNotes]);

  // Keyboard shortcut to exit split view
  useHotkeys('escape', () => {
    if (showSplitView) {
      setShowSplitView(false);
    }
  }, { enableOnFormTags: true });

  const handleUpdateSubtaskStatus = async (taskId: number, subtaskId: number, status: Subtask['status']) => {
    try {
      const updatedSubtask = await apiService.updateSubtask(taskId, subtaskId, { status });
      setTasks(prev => prev.map(task =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks?.map(subtask =>
                subtask.id === subtaskId ? { ...subtask, status: updatedSubtask.status } : subtask
              ) || []
            }
          : task
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update subtask');
      console.error('Error updating subtask:', err);
    }
  };

  const handleTaskItemClick = (task: Task) => {
    setSelectedTask(task);
    setActiveModal('taskDetail');
  };

  // Pomodoro Helper Functions
  const getNextSession = (currentSession: string, sessionCount: number) => {
    if (currentSession === 'work') {
      const nextCount = sessionCount + 1;
      if (nextCount % pomodoroSettings.sessionsUntilLongBreak === 0) {
        return { session: 'longBreak' as const, sessionCount: nextCount };
      } else {
        return { session: 'shortBreak' as const, sessionCount: nextCount };
      }
    } else {
      return { session: 'work' as const, sessionCount };
    }
  };

  const getSessionDuration = (session: string) => {
    switch (session) {
      case 'work':
        return pomodoroSettings.workDuration;
      case 'shortBreak':
        return pomodoroSettings.shortBreakDuration;
      case 'longBreak':
        return pomodoroSettings.longBreakDuration;
      default:
        return pomodoroSettings.workDuration;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePomodoroStart = async () => {
    try {
      // Save current window state for restoration
      const currentSize = await window.electron.getWindowSize();
      const currentPosition = await window.electron.getWindowPosition();
      const screenSize = await window.electron.getScreenSize();

      setOriginalWindowState({
        width: currentSize.width,
        height: currentSize.height,
        x: currentPosition.x,
        y: currentPosition.y
      });

      // Resize window to widget size
      window.electron.resizeWindow(300, 320);

      // Position at top-right of screen (with some margin)
      const margin = 20;
      window.electron.setWindowPosition(
        screenSize.width - 300 - margin,
        margin
      );

      setPomodoroState(prev => ({
        ...prev,
        isActive: true,
        isPaused: false,
        isWidgetMode: true
      }));
      setActiveModal(null);
    } catch (error) {
      console.error('Failed to resize window for pomodoro:', error);
      // Fallback to regular widget mode if window operations fail
      setPomodoroState(prev => ({
        ...prev,
        isActive: true,
        isPaused: false,
        isWidgetMode: true
      }));
      setActiveModal(null);
    }
  };

  const handlePomodoroPause = () => {
    setPomodoroState(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  const handlePomodoroStop = () => {
    // Restore original window size and position
    if (originalWindowState) {
      try {
        window.electron.resizeWindow(originalWindowState.width, originalWindowState.height);
        window.electron.setWindowPosition(originalWindowState.x, originalWindowState.y);
        setOriginalWindowState(null);
      } catch (error) {
        console.error('Failed to restore window state:', error);
      }
    }

    setPomodoroState(prev => ({
      ...prev,
      isActive: false,
      isPaused: false,
      isWidgetMode: false,
      timeRemaining: getSessionDuration(prev.currentSession) * 60
    }));
  };

  const handlePomodoroReset = () => {
    setPomodoroState({
      isActive: false,
      isPaused: false,
      currentSession: 'work',
      sessionCount: 0,
      timeRemaining: pomodoroSettings.workDuration * 60,
      isWidgetMode: false
    });
  };

  const handleSkipSession = () => {
    const nextSession = getNextSession(pomodoroState.currentSession, pomodoroState.sessionCount);
    const nextDuration = getSessionDuration(nextSession.session);

    setPomodoroState(prev => ({
      ...prev,
      currentSession: nextSession.session,
      sessionCount: nextSession.sessionCount,
      timeRemaining: nextDuration * 60,
      isActive: false,
      isPaused: false
    }));
  };

  // Calculate stats from real data
  const stats = [
    {
      label: 'Total Tasks',
      value: filteredTasks.length.toString(),
      change: '+' + filteredTasks.filter(t => new Date(t.created_at) > new Date(Date.now() - 24*60*60*1000)).length,
      trend: 'up'
    },
    {
      label: 'Completed Tasks',
      value: filteredTasks.filter(t => t.status === 'done').length.toString(),
      change: '+' + filteredTasks.filter(t => t.status === 'done' && new Date(t.updated_at) > new Date(Date.now() - 24*60*60*1000)).length,
      trend: 'up'
    },
    {
      label: 'In Progress',
      value: filteredTasks.filter(t => t.status === 'in_progress').length.toString(),
      change: '+' + filteredTasks.filter(t => t.status === 'in_progress' && new Date(t.updated_at) > new Date(Date.now() - 24*60*60*1000)).length,
      trend: 'up'
    },
    {
      label: 'High Priority',
      value: filteredTasks.filter(t => t.priority === 'high').length.toString(),
      change: '+' + filteredTasks.filter(t => t.priority === 'high' && new Date(t.created_at) > new Date(Date.now() - 24*60*60*1000)).length,
      trend: 'up'
    }
  ];

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

    // If pomodoro is in widget mode, show only the pomodoro widget as the entire app
  if (pomodoroState.isWidgetMode) {
    return (
      <div className="pomodoro-app-widget">
        <div className="widget-header-large">
          <span className="widget-session-large">
            {pomodoroState.currentSession === 'work' ? '🍅 Focus Session' :
             pomodoroState.currentSession === 'shortBreak' ? '☕ Short Break' :
             '🌟 Long Break'}
          </span>
          <div className="widget-controls-large">
                                    <button
              className="widget-btn-large"
              onClick={handlePomodoroPause}
              title={pomodoroState.isPaused ? 'Resume' : 'Pause'}
            >
              {pomodoroState.isPaused ? <AiOutlinePlayCircle size={20} /> : <AiOutlinePauseCircle size={20} />}
            </button>
            <button
              className="widget-btn-large"
              onClick={handlePomodoroStop}
              title="Stop & Return"
            >
              <AiOutlineStop size={20} />
            </button>
          </div>
        </div>

                <div className="widget-timer-large">
          {formatTime(pomodoroState.timeRemaining)}
        </div>

        <div className="session-stats">
          <div className="stat-item">
            <span className="stat-label">Session</span>
            <span className="stat-value">{pomodoroState.sessionCount + 1}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Next</span>
            <span className="stat-value">
              {pomodoroState.currentSession === 'work'
                ? (pomodoroState.sessionCount + 1) % pomodoroSettings.sessionsUntilLongBreak === 0
                  ? 'Long Break'
                  : 'Short Break'
                : 'Work'
              }
            </span>
          </div>
        </div>

        {pomodoroTask && (
          <div className="widget-task-large">
            <div className="task-label">Focus Task:</div>
            <div className="task-text">📝 {pomodoroTask}</div>
          </div>
        )}

        <div className="session-indicator-large">
          <div className={`session-dot ${pomodoroState.currentSession === 'work' ? 'active' : ''}`}>
            🍅
          </div>
          <div className={`session-dot ${pomodoroState.currentSession === 'shortBreak' ? 'active' : ''}`}>
            ☕
          </div>
          <div className={`session-dot ${pomodoroState.currentSession === 'longBreak' ? 'active' : ''}`}>
            🌟
          </div>
        </div>

        {pomodoroState.isPaused && (
          <div className="pause-indicator">
            ⏸️ PAUSED
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



        {/* Error Display */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        {/* Content based on active section */}
        {activeSection === 'dashboard' && (
          <div className="dashboard-content">
            {/* Stats Overview */}
            <section className="stats-grid">
              {stats.map((stat, index) => (
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
                  disabled={loading}
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
                    <span className="btn-title">Pomodoro Timer</span>
                    <span className="btn-subtitle">Focus & productivity</span>
                  </div>
                </button>

                <button
                  className={`quick-action-btn ${showSplitView ? 'primary' : 'secondary'}`}
                  onClick={() => setShowSplitView(!showSplitView)}
                  title="Toggle Split View Workspace"
                >
                  <div className="btn-icon">
                    <MdSwapHoriz size={32} />
                  </div>
                  <div className="btn-content">
                    <span className="btn-title">Split View</span>
                    <span className="btn-subtitle">Multi-panel workspace</span>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeSection === 'tasks' && (
          <div className="dashboard-content">
            <div className="task-manager-container">
              {/* Project Selector */}
              <div className="project-selector-header">
                <div className="project-selector">
                  <label className="project-label">Active Project:</label>
                  <select
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const projectId = parseInt(e.target.value);
                      const project = projects.find(p => p.id === projectId);
                      if (project) handleProjectChange(project);
                    }}
                    className="project-dropdown"
                  >
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>
                        {project.title} ({project.status})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="create-task-btn"
                  onClick={() => setActiveModal('task')}
                  disabled={loading}
                >
                  <MdAdd size={20} />
                  Create Task
                </button>
              </div>

              {/* Task List */}
              <div className="task-list-container">
                {loading && <div className="loading-spinner">Loading tasks...</div>}
                {!loading && filteredTasks.length === 0 && (
                  <div className="empty-state">
                    <MdTask size={64} />
                    <h3>No Tasks Found</h3>
                    <p>Create your first task for {selectedProject?.title || 'this project'} to get started!</p>
                  </div>
                )}
                {!loading && filteredTasks.length > 0 && (
                  <div className="tasks-list">
                    {filteredTasks.map((task) => (
                      <div key={task.id} className={`task-card ${task.priority}`}>
                        {/* Task Header */}
                        <div className="task-card-header" onClick={() => handleTaskItemClick(task)}>
                          <div className="task-title-row">
                            <h3 className="task-title">{task.title}</h3>
                            <div className="task-status-badges">
                              <span className={`priority-indicator ${task.priority}`}>
                                {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
                              </span>
                              <span className={`status-indicator ${task.status}`}>
                                {task.status === 'todo' ? '📋' : task.status === 'in_progress' ? '⚡' : '✅'}
                              </span>
                            </div>
                          </div>

                          {task.description && (
                            <p className="task-preview-description">{task.description.substring(0, 100)}...</p>
                          )}

                          <div className="task-quick-info">
                            {task.due_date && (
                              <span className="quick-info-item">
                                <FiCalendar size={14} />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            )}
                            {task.estimated_hours && (
                              <span className="quick-info-item">
                                <FiClock size={14} />
                                {task.estimated_hours}h
                              </span>
                            )}
                            {task.subtasks && task.subtasks.length > 0 && (
                              <span className="quick-info-item">
                                <MdTask size={14} />
                                {task.subtasks.filter(st => st.status === 'done').length}/{task.subtasks.length} subtasks
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Task Actions */}
                        <div className="task-card-actions">
                          <select
                            value={task.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleUpdateTaskStatus(task.id, e.target.value as Task['status']);
                            }}
                            className={`status-select ${task.status}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="todo">To Do</option>
                            <option value="in_progress">In Progress</option>
                            <option value="done">Done</option>
                          </select>

                          {task.subtasks && task.subtasks.length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTaskExpansion(task.id);
                              }}
                              className="action-btn expand-btn"
                              title={expandedTasks.has(task.id) ? 'Collapse subtasks' : 'Expand subtasks'}
                            >
                              {expandedTasks.has(task.id) ? 'Collapse' : 'Expand'}
                            </button>
                          )}

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTask(task.id);
                            }}
                            className="action-btn delete-btn"
                            title="Delete task"
                          >
                            Delete
                          </button>
                        </div>

                        {/* Subtasks Section */}
                        {task.subtasks && task.subtasks.length > 0 && expandedTasks.has(task.id) && (
                          <div className="subtasks-container">
                            <div className="subtasks-header">
                              <span>Subtasks ({task.subtasks.filter(st => st.status === 'done').length}/{task.subtasks.length})</span>
                            </div>
                            <div className="subtasks-list">
                              {task.subtasks.map((subtask) => (
                                <div key={subtask.id} className={`subtask-item ${subtask.status}`}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateSubtaskStatus(task.id, subtask.id,
                                        subtask.status === 'done' ? 'todo' : 'done'
                                      );
                                    }}
                                    className={`subtask-checkbox ${subtask.status === 'done' ? 'checked' : ''}`}
                                  >
                                    {subtask.status === 'done' && <MdCheck size={16} />}
                                  </button>
                                  <span className={`subtask-text ${subtask.status === 'done' ? 'completed' : ''}`}>
                                    {subtask.description}
                                  </span>
                                  <span className={`subtask-status ${subtask.status}`}>
                                    {subtask.status.replace('_', ' ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              <div className="modal-header-content">
                <h3 className="modal-title">
                  {activeModal === 'task' && 'Create New Task'}
                  {activeModal === 'taskDetail' && selectedTask?.title}
                  {activeModal === 'message' && 'Quick Message'}
                  {activeModal === 'file' && 'Upload File'}
                  {activeModal === 'timer' && 'Pomodoro Timer'}
                </h3>
                {activeModal === 'taskDetail' && selectedTask && (
                  <div className="modal-header-badges">
                    <span className={`priority-badge-large ${selectedTask.priority}`}>
                      {selectedTask.priority === 'high' ? '🔴 HIGH' : selectedTask.priority === 'medium' ? '🟡 MEDIUM' : '🟢 LOW'}
                    </span>
                    <span className={`status-badge-large ${selectedTask.status}`}>
                      {selectedTask.status === 'todo' ? '📋 TO DO' : selectedTask.status === 'in_progress' ? '⚡ IN PROGRESS' : '✅ COMPLETED'}
                    </span>
                    <div className="progress-indicator">
                      Progress: <span className="progress-value">0%</span>
                    </div>
                  </div>
                )}
              </div>
              <button
                className="modal-close"
                onClick={() => {
                  setActiveModal(null);
                  setSelectedTask(null);
                  setShowSubtaskForm(false);
                  setNewSubtaskDescription('');
                }}
              >
                <MdClose size={24} />
              </button>
            </div>
            <div className="modal-body">
              {activeModal === 'task' && (
                <div className="task-tabs-form">
                  {/* Tab Navigation */}
                  <div className="tab-navigation">
                    <button
                      className={`tab-button ${wizardStep === 1 ? 'active' : ''}`}
                      onClick={() => setWizardStep(1)}
                    >
                      <span className="tab-icon">📝</span>
                      <span className="tab-label">Basic Info</span>
                    </button>
                    <button
                      className={`tab-button ${wizardStep === 2 ? 'active' : ''}`}
                      onClick={() => setWizardStep(2)}
                    >
                      <span className="tab-icon">⚙️</span>
                      <span className="tab-label">Details</span>
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="tab-content">
                    {/* Tab 1: Basic Information */}
                    {wizardStep === 1 && (
                      <div className="tab-panel">
                        <div className="tab-header">
                          <h4>Basic Task Information</h4>
                          <p>Essential details for your task</p>
                        </div>

                        <div className="form-group">
                          <label>Project *</label>
                          <select
                            value={taskFormData.project_id}
                            onChange={(e) => setTaskFormData(prev => ({ ...prev, project_id: parseInt(e.target.value) }))}
                          >
                            {projects.map(project => (
                              <option key={project.id} value={project.id}>{project.title}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Task Title *</label>
                          <SmartTextEditor
                            value={taskFormData.title}
                            onChange={(value) => setTaskFormData(prev => ({ ...prev, title: value }))}
                            placeholder="Enter a clear, descriptive title..."
                            disabled={loading}
                          />
                        </div>

                        <div className="form-group">
                          <label>Description</label>
                          <SmartTextEditor
                            value={taskFormData.description || ''}
                            onChange={(value) => setTaskFormData(prev => ({ ...prev, description: value }))}
                            placeholder="Describe what needs to be done, acceptance criteria, etc..."
                            multiline={true}
                            rows={6}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Task Details */}
                    {wizardStep === 2 && (
                      <div className="tab-panel">
                        <div className="tab-header">
                          <h4>Task Details & Planning</h4>
                          <p>Priority, timeline, and additional details</p>
                        </div>

                                                <div className="form-row">
                          <div className="form-group">
                            <label>Priority</label>
                            <select
                              value={taskFormData.priority}
                              onChange={(e) => setTaskFormData(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                            >
                              <option value="high">🔴 High Priority</option>
                              <option value="medium">🟡 Medium Priority</option>
                              <option value="low">🟢 Low Priority</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Status</label>
                            <select
                              value={taskFormData.status}
                              onChange={(e) => setTaskFormData(prev => ({ ...prev, status: e.target.value as 'todo' | 'in_progress' | 'done' }))}
                            >
                              <option value="todo">📋 To Do</option>
                              <option value="in_progress">⚡ In Progress</option>
                              <option value="done">✅ Done</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Due Date</label>
                          <input
                            type="date"
                            value={taskFormData.due_date}
                            onChange={(e) => setTaskFormData(prev => ({ ...prev, due_date: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label>Estimated Hours</label>
                          <input
                            type="number"
                            step="0.5"
                            placeholder="e.g., 8.5"
                            value={taskFormData.estimated_hours}
                            onChange={(e) => setTaskFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                          />
                          <small className="form-hint">How many hours do you estimate this will take?</small>
                        </div>

                        <div className="form-group">
                          <label>Tags</label>
                          <input
                            type="text"
                            placeholder="Add tags separated by commas (e.g., frontend, urgent, bug-fix)"
                            value={taskFormData.tags?.join(', ') || ''}
                            onChange={(e) => setTaskFormData(prev => ({
                              ...prev,
                              tags: e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
                            }))}
                          />
                          <small className="form-hint">Tags help organize and filter your tasks</small>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="form-actions">
                    <button
                      className="btn-cancel"
                      onClick={() => {
                        setActiveModal(null);
                        setWizardStep(1);
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleCreateTask}
                      disabled={loading || !taskFormData.title.trim()}
                    >
                      {loading ? 'Creating...' : 'Create Task'}
                    </button>
                  </div>
                </div>
              )}

              {activeModal === 'taskDetail' && selectedTask && (
                <div className="task-detail-modal">

                  <div className="task-detail-content-split">
                    {/* Left Column - Subtasks Management */}
                    <div className="task-detail-left">
                      <div className="detail-section">
                        <h4 className="section-title">
                          <span className="section-icon">✅</span>
                          SUBTASKS
                          <button
                            className="add-subtask-btn"
                            onClick={() => setShowSubtaskForm(true)}
                            disabled={showSubtaskForm}
                          >
                            <MdAdd size={16} />
                            Add Subtask
                          </button>
                        </h4>
                        <div className="subtask-progress-bar">
                          <span className="subtask-progress-text">
                            ✅ {selectedTask.subtasks?.filter(st => st.status === 'done').length || 0}/{selectedTask.subtasks?.length || 0} subtasks
                          </span>
                          <span className="progress-percentage">
                            Progress: {selectedTask.subtasks?.length ? Math.round((selectedTask.subtasks.filter(st => st.status === 'done').length / selectedTask.subtasks.length) * 100) : 0}%
                          </span>
                        </div>

                        {/* Add Subtask Form */}
                        {showSubtaskForm && (
                          <div className="add-subtask-form">
                            <div className="form-group">
                              <label>Subtask Description</label>
                              <SmartTextEditor
                                value={newSubtaskDescription}
                                onChange={setNewSubtaskDescription}
                                placeholder="Enter subtask description..."
                                multiline={true}
                                rows={3}
                                className="subtask-textarea"
                                disabled={loading}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.ctrlKey) {
                                    e.preventDefault();
                                    handleSubmitSubtask();
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancelSubtask();
                                  }
                                }}
                                autoFocus
                              />
                              <small className="form-hint">
                                Press Ctrl+Enter to submit, Escape to cancel • Multi-cursor: Ctrl+D
                              </small>
                            </div>
                            <div className="subtask-form-actions">
                              <button
                                onClick={handleCancelSubtask}
                                className="btn-cancel"
                                disabled={loading}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSubmitSubtask}
                                className="btn-primary"
                                disabled={loading || !newSubtaskDescription.trim()}
                              >
                                {loading ? 'Adding...' : 'Add Subtask'}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="subtasks-detail-list">
                          {selectedTask.subtasks && selectedTask.subtasks.length > 0 ? (
                            selectedTask.subtasks.map((subtask) => (
                              <div key={subtask.id} className={`subtask-detail-item ${subtask.status}`}>
                                <button
                                  onClick={() => handleUpdateSubtaskStatus(selectedTask.id, subtask.id,
                                    subtask.status === 'done' ? 'todo' : 'done'
                                  )}
                                  className={`subtask-detail-checkbox ${subtask.status === 'done' ? 'checked' : ''}`}
                                >
                                  {subtask.status === 'done' && <MdCheck size={16} />}
                                </button>
                                <span className={`subtask-detail-text ${subtask.status === 'done' ? 'completed' : ''}`}>
                                  {subtask.description}
                                </span>
                                <span className={`subtask-detail-status ${subtask.status}`}>
                                  {subtask.status === 'todo' ? '📋' : subtask.status === 'in_progress' ? '⚡' : '✅'}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="no-subtasks">
                              <p>No subtasks yet</p>
                              <span>Click "Add Subtask" to create your first subtask</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Task Details */}
                    <div className="task-detail-right">
                      {/* Description Section */}
                      <div className="detail-section">
                        <h4 className="section-title">
                          <span className="section-icon">📄</span>
                          DESCRIPTION
                          <button className="edit-icon">
                            <MdEdit size={16} />
                          </button>
                        </h4>
                        <div className="section-content">
                          {selectedTask.description || 'No description provided'}
                        </div>
                      </div>

                      {/* Details Section */}
                      <div className="detail-section">
                        <h4 className="section-title">
                          <span className="section-icon">⚙️</span>
                          DETAILS
                        </h4>
                        <div className="details-list">
                          <div className="detail-item">
                            <span className="detail-label">START DATE</span>
                            <span className="detail-value">
                              <FiCalendar size={16} />
                              {new Date(selectedTask.created_at).toLocaleDateString() + ', ' + new Date(selectedTask.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                          {selectedTask.due_date && (
                            <div className="detail-item">
                              <span className="detail-label">DEADLINE</span>
                              <span className="detail-value">
                                <FiCalendar size={16} />
                                {new Date(selectedTask.due_date).toLocaleDateString() + ', ' + new Date(selectedTask.due_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </span>
                            </div>
                          )}
                          {selectedTask.estimated_hours && (
                            <div className="detail-item">
                              <span className="detail-label">ESTIMATED HOURS</span>
                              <span className="detail-value">
                                <FiClock size={16} />
                                {selectedTask.estimated_hours}.00 hours
                              </span>
                            </div>
                          )}
                          {selectedTask.assigned_user && (
                            <div className="detail-item">
                              <span className="detail-label">ASSIGNED TO</span>
                              <span className="detail-value">
                                <FiUser size={16} />
                                {selectedTask.assigned_user.name}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tags Section */}
                      {selectedTask.tags && selectedTask.tags.length > 0 && (
                        <div className="detail-section">
                          <h4 className="section-title">
                            <span className="section-icon">🏷️</span>
                            TAGS
                          </h4>
                          <div className="tags-container">
                            {selectedTask.tags.map((tag, index) => (
                              <span key={index} className="tag-item">{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="task-detail-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setActiveModal(null);
                        setSelectedTask(null);
                        setShowSubtaskForm(false);
                        setNewSubtaskDescription('');
                      }}
                    >
                      Close
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        // TODO: Add edit functionality
                        console.log('Edit task:', selectedTask.id);
                      }}
                    >
                      Edit Task
                    </button>
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
                      {projects.map(project => (
                        <option key={project.id} value={project.id}>{project.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-actions">
                    <button className="btn-cancel" onClick={() => setActiveModal(null)}>Cancel</button>
                    <button className="btn-primary">Upload Files</button>
                  </div>
                </div>
              )}

                            {activeModal === 'timer' && (
                <div className="pomodoro-form">
                  {!showPomodoroSettings ? (
                    <div className="pomodoro-display">
                      <div className="pomodoro-header">
                        <div className="session-indicator">
                          <span className={`session-tab ${pomodoroState.currentSession === 'work' ? 'active' : ''}`}>
                            🍅 Work ({pomodoroSettings.workDuration}m)
                          </span>
                          <span className={`session-tab ${pomodoroState.currentSession === 'shortBreak' ? 'active' : ''}`}>
                            ☕ Short Break ({pomodoroSettings.shortBreakDuration}m)
                          </span>
                          <span className={`session-tab ${pomodoroState.currentSession === 'longBreak' ? 'active' : ''}`}>
                            🌟 Long Break ({pomodoroSettings.longBreakDuration}m)
                          </span>
                        </div>
                        <button
                          className="settings-toggle-btn"
                          onClick={() => setShowPomodoroSettings(true)}
                          title="Settings"
                        >
                          <AiOutlineSetting size={20} />
                        </button>
                      </div>

                      <div className="pomodoro-clock">
                        {formatTime(pomodoroState.timeRemaining)}
                      </div>

                      <div className="session-progress">
                        <div className="progress-circle">
                          <svg viewBox="0 0 100 100">
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="rgba(209, 255, 117, 0.2)"
                              strokeWidth="4"
                            />
                            <circle
                              cx="50"
                              cy="50"
                              r="45"
                              fill="none"
                              stroke="#D1FF75"
                              strokeWidth="4"
                              strokeDasharray={`${((getSessionDuration(pomodoroState.currentSession) * 60 - pomodoroState.timeRemaining) / (getSessionDuration(pomodoroState.currentSession) * 60)) * 283} 283`}
                              strokeLinecap="round"
                              transform="rotate(-90 50 50)"
                            />
                          </svg>
                        </div>
                        <div className="session-count">
                          Session {pomodoroState.sessionCount + 1}
                        </div>
                      </div>

                      <div className="pomodoro-controls">
                        {!pomodoroState.isActive ? (
                          <button className="pomodoro-btn start" onClick={handlePomodoroStart}>
                            ▶️ Start Pomodoro
                          </button>
                        ) : (
                          <>
                            <button className="pomodoro-btn pause" onClick={handlePomodoroPause}>
                              {pomodoroState.isPaused ? '▶️ Resume' : '⏸️ Pause'}
                            </button>
                            <button className="pomodoro-btn stop" onClick={handlePomodoroStop}>
                              ⏹️ Stop
                            </button>
                          </>
                        )}
                        <button className="pomodoro-btn secondary" onClick={handleSkipSession}>
                          ⏭️ Skip Session
                        </button>
                        <button className="pomodoro-btn secondary" onClick={handlePomodoroReset}>
                          🔄 Reset
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pomodoro-settings-view">
                      <div className="settings-header">
                        <h3>Pomodoro Settings</h3>
                        <button
                          className="back-btn"
                          onClick={() => setShowPomodoroSettings(false)}
                          title="Back to Timer"
                        >
                          ← Back
                        </button>
                      </div>

                  <div className="pomodoro-settings">
                    <div className="form-group">
                      <label>What are you working on?</label>
                      <input
                        type="text"
                        placeholder="Focus task or project..."
                        value={pomodoroTask}
                        onChange={(e) => setPomodoroTask(e.target.value)}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Work Duration (min)</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={pomodoroSettings.workDuration}
                          onChange={(e) => {
                            const newDuration = parseInt(e.target.value) || 25;
                            setPomodoroSettings(prev => ({ ...prev, workDuration: newDuration }));
                            if (pomodoroState.currentSession === 'work' && !pomodoroState.isActive) {
                              setPomodoroState(prev => ({ ...prev, timeRemaining: newDuration * 60 }));
                            }
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Short Break (min)</label>
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={pomodoroSettings.shortBreakDuration}
                          onChange={(e) => {
                            const newDuration = parseInt(e.target.value) || 5;
                            setPomodoroSettings(prev => ({ ...prev, shortBreakDuration: newDuration }));
                            if (pomodoroState.currentSession === 'shortBreak' && !pomodoroState.isActive) {
                              setPomodoroState(prev => ({ ...prev, timeRemaining: newDuration * 60 }));
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Long Break (min)</label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={pomodoroSettings.longBreakDuration}
                          onChange={(e) => {
                            const newDuration = parseInt(e.target.value) || 15;
                            setPomodoroSettings(prev => ({ ...prev, longBreakDuration: newDuration }));
                            if (pomodoroState.currentSession === 'longBreak' && !pomodoroState.isActive) {
                              setPomodoroState(prev => ({ ...prev, timeRemaining: newDuration * 60 }));
                            }
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Sessions until Long Break</label>
                        <input
                          type="number"
                          min="2"
                          max="10"
                          value={pomodoroSettings.sessionsUntilLongBreak}
                          onChange={(e) => setPomodoroSettings(prev => ({
                            ...prev,
                            sessionsUntilLongBreak: parseInt(e.target.value) || 4
                          }))}
                        />
                      </div>
                    </div>

                      <div className="form-group">
                        <label>Session Notes</label>
                        <textarea
                          placeholder="Add notes about your focus session..."
                          rows={3}
                          value={pomodoroNotes}
                          onChange={(e) => setPomodoroNotes(e.target.value)}
                        ></textarea>
                      </div>
                    </div>

                    <div className="form-actions">
                      <button className="btn-cancel" onClick={() => setActiveModal(null)}>Close</button>
                      {pomodoroState.isActive && (
                        <button className="btn-secondary" onClick={() => {
                          setPomodoroState(prev => ({ ...prev, isWidgetMode: true }));
                          setActiveModal(null);
                        }}>
                          📱 Minimize to Widget
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Split View Workspace */}
      {showSplitView && (
        <div className="split-view-workspace">
          <div className="split-view-header-controls">
            <button
              className="exit-split-view-btn"
              onClick={() => setShowSplitView(false)}
              title="Exit Split View and return to dashboard"
            >
              <MdClose size={20} />
              Exit Split View
            </button>
          </div>
          <SplitViewPanel
            panels={splitViewPanels}
            orientation={splitOrientation}
            onPanelClose={handlePanelClose}
            onOrientationChange={handleOrientationChange}
            resizable={true}
            className="main-split-view"
          />
        </div>
      )}
    </div>
  );
}

export default Home;
