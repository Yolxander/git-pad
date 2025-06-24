import React, { useState, useEffect } from 'react';
import { AiOutlineHome } from 'react-icons/ai';
import { MdTask, MdMessage, MdFolder, MdClose, MdAdd, MdExpandMore, MdExpandLess, MdEdit, MdDelete, MdCheck } from 'react-icons/md';
import { FiClock, FiActivity, FiFolder, FiUser, FiCalendar } from 'react-icons/fi';
import logo from '../../../assets/logo.png';
import './Home.css';
import { useAuth } from '../contexts/AuthContext';

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

const getAuthHeaders = () => {
  const token = localStorage.getItem('auth_token');
  if (!token) {
    throw new Error('No auth token found. Please log in again.');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

const apiService = {
  // Project endpoints
  async getProjects(): Promise<Project[]> {
    const response = await fetch(`${API_BASE_URL}/projects`, {
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
      body: JSON.stringify({ description }),
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
      headers: getAuthHeaders(),
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subtask');
      console.error('Error creating subtask:', err);
    }
  };

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
                  {activeModal === 'timer' && 'Start Timer'}
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
                          <input
                            type="text"
                            placeholder="Enter a clear, descriptive title..."
                            value={taskFormData.title}
                            onChange={(e) => setTaskFormData(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>

                        <div className="form-group">
                          <label>Description</label>
                          <textarea
                            placeholder="Describe what needs to be done, acceptance criteria, etc..."
                            rows={6}
                            value={taskFormData.description}
                            onChange={(e) => setTaskFormData(prev => ({ ...prev, description: e.target.value }))}
                          ></textarea>
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
                          <button className="add-subtask-btn">
                            <MdAdd size={16} />
                            Add Subtask
                          </button>
                        </h4>
                        <div className="subtask-progress-bar">
                          <span className="subtask-progress-text">
                            ✅ {selectedTask.subtasks?.filter(st => st.status === 'done').length || 0}/{selectedTask.subtasks?.length || 0} subtasks
                          </span>
                          <span className="progress-percentage">Progress: 0%</span>
                        </div>

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
