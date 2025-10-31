import { ElectronHandler } from '../main/preload';

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    electron: ElectronHandler;
    config: {
      apiUrl: string;
      supabaseUrl: string;
      supabaseAnonKey: string;
    };
  }
}

export interface GitCommandResult {
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  output?: string;
  error?: string;
}

export interface RepoInfo {
  branch: string;
  hasUncommittedChanges: boolean;
  repoPath: string;
  error?: string;
}

export {};
