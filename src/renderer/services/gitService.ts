import { GitCommand, GitCommandVariable } from '../data/dummyCommands';
import { GitCommandResult, RepoInfo } from '../preload.d';

class GitService {
  async pickRepository(): Promise<string | null> {
    try {
      const path = await window.electron.pickGitRepo();
      return path;
    } catch (error) {
      console.error('Error picking repository:', error);
      return null;
    }
  }

  async validateRepository(repoPath: string): Promise<boolean> {
    try {
      return await window.electron.validateGitRepo(repoPath);
    } catch (error) {
      console.error('Error validating repository:', error);
      return false;
    }
  }

  async executeCommand(
    repoPath: string,
    command: string
  ): Promise<GitCommandResult> {
    try {
      const result = await window.electron.executeGitCommand(repoPath, command);
      return result as GitCommandResult;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
        output: error.message || 'Unknown error',
      };
    }
  }

  async getRepositoryInfo(repoPath: string): Promise<RepoInfo> {
    try {
      const info = await window.electron.getRepoInfo(repoPath);
      return info as RepoInfo;
    } catch (error: any) {
      return {
        branch: 'unknown',
        hasUncommittedChanges: false,
        repoPath,
        error: error.message,
      };
    }
  }

  async loadCommands(): Promise<GitCommand[]> {
    try {
      const commands = await window.electron.getCommands();
      if (commands && Array.isArray(commands)) {
        return commands;
      }
      // Return dummy commands if no saved commands
      const { dummyCommands } = await import('../data/dummyCommands');
      return dummyCommands;
    } catch (error) {
      console.error('Error loading commands:', error);
      const { dummyCommands } = await import('../data/dummyCommands');
      return dummyCommands;
    }
  }

  async saveCommands(commands: GitCommand[]): Promise<boolean> {
    try {
      const result = await window.electron.saveCommands(commands);
      return result.success || false;
    } catch (error) {
      console.error('Error saving commands:', error);
      return false;
    }
  }

  extractVariables(command: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(command)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  replaceVariables(
    command: string,
    variables: GitCommandVariable[],
    values: Record<string, string>
  ): string {
    let result = command;

    variables.forEach((variable) => {
      const placeholder = `{{${variable.name}}}`;
      const value = values[variable.name] || '';
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });

    return result;
  }

  isDangerousCommand(command: string): boolean {
    const dangerousPatterns = [
      /git\s+push\s+.*--force/,
      /git\s+reset\s+--hard/,
      /git\s+clean\s+-fd/,
      /git\s+push\s+.*--delete/,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(command));
  }
}

export const gitService = new GitService();

