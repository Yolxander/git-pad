import axios from 'axios';

declare global {
  interface Window {
    config: {
      apiUrl: string;
    };
  }
}

// Ensure API URL is properly formatted
const getApiUrl = () => {
  const configUrl = window.config?.apiUrl;
  if (configUrl && configUrl.startsWith('http')) {
    return configUrl;
  }
  return 'http://localhost:8000/api';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
  password_confirmation: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export interface Bug {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

export interface QaChecklist {
  id: number;
  title: string;
  description: string;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChecklistItem {
  id: number;
  identifier: string;
  item_text: string | null;
  answer: string | null;
  failure_reason: string | null;
  status: string;
  order_number: number;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    console.log('🌐 API Service: Sending login request...', {
      email: credentials.email,
      apiUrl: API_URL
    });

    const response = await api.post<AuthResponse>('/login', credentials);

    console.log('📡 API Service: Login response received:', {
      status: response.status,
      statusText: response.statusText,
      hasData: !!response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      response: response.data
    });

    console.log('🔍 API Service: Full response data structure:', JSON.stringify(response.data, null, 2));

    const { access_token, user } = response.data;
    if (access_token) {
      localStorage.setItem('auth_token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      console.log('🔑 API Service: Token stored and header set');
    } else {
      console.warn('⚠️ API Service: No access_token in response!');
    }
    return response.data;
  },

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/register', credentials);
    const { access_token, user } = response.data;
    if (access_token) {
      localStorage.setItem('auth_token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    }
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('auth_token');
      delete api.defaults.headers.common['Authorization'];
    }
  },

  async getCurrentUser(): Promise<AuthResponse['user']> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw new Error('No auth token found');
    }
    const response = await api.get<AuthResponse>('/user');
    return response.data.user;
  },

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token;
  },

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  },

  async getUsers(token: string): Promise<any[]> {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch assignees: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      const users = Array.isArray(responseData) ? responseData : responseData.data;

      if (!users || !Array.isArray(users)) {
        return [];
      }

      // Store users in localStorage
      localStorage.setItem('users', JSON.stringify(users));
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  getStoredUsers(): any[] {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
  }
};

export const bugService = {
  async getBugs(token: string): Promise<Bug[]> {
    try {
      const response = await fetch(`${API_URL}/bugs`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch bugs: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      const bugs = Array.isArray(responseData) ? responseData : responseData.data;

      if (!bugs || !Array.isArray(bugs)) {
        return [];
      }

      // Store bugs in localStorage
      localStorage.setItem('bugs', JSON.stringify(bugs));
      return bugs;
    } catch (error) {
      console.error('Error fetching bugs:', error);
      return [];
    }
  },

  getStoredBugs(): Bug[] {
    const bugs = localStorage.getItem('bugs');
    return bugs ? JSON.parse(bugs) : [];
  }
};

export const qaService = {
  async getQaChecklists(token: string): Promise<QaChecklist[]> {
    try {
      const response = await fetch(`${API_URL}/qa-checklists`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch QA checklists: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      const checklists = Array.isArray(responseData) ? responseData : responseData.data;

      if (!checklists || !Array.isArray(checklists)) {
        return [];
      }

      // Store checklists in localStorage
      localStorage.setItem('qa_checklists', JSON.stringify(checklists));
      return checklists;
    } catch (error) {
      console.error('Error fetching QA checklists:', error);
      return [];
    }
  },

  async updateChecklistItem(
    token: string,
    checklistId: number,
    itemId: number,
    data: {
      order_number: number;
      status: 'passed' | 'failed' | 'pending';
      answer: string | null;
      failure_reason: string | null;
    }
  ): Promise<ChecklistItem> {
    try {
      console.log('Sending update request:', {
        url: `${API_URL}/qa-checklists/${checklistId}/items/${itemId}`,
        data
      });

      const response = await fetch(`${API_URL}/qa-checklists/${checklistId}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update checklist item: ${response.status} ${errorText}`);
      }

      const responseData = await response.json();
      console.log('Update response:', responseData);

      // The API returns the item directly, not wrapped in a data property
      return responseData;
    } catch (error) {
      console.error('Error updating checklist item:', error);
      throw error;
    }
  },

  getStoredQaChecklists(): QaChecklist[] {
    const checklists = localStorage.getItem('qa_checklists');
    return checklists ? JSON.parse(checklists) : [];
  }
};

export default api;
