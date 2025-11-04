import { ProjectCommand, ProjectCommandVariable } from '../data/dummyProjectCommands';

export interface ProjectCommandResult {
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  output?: string;
  error?: string;
}

class ProjectService {
  async pickProject(): Promise<string | null> {
    try {
      const path = await window.electron.pickProject();
      return path;
    } catch (error) {
      console.error('Error picking project:', error);
      return null;
    }
  }

  async executeCommand(projectPath: string, command: string): Promise<ProjectCommandResult> {
    try {
      const result = await window.electron.executeProjectCommand(projectPath, command);
      return result as ProjectCommandResult;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
        output: error.message || 'Unknown error',
      };
    }
  }

  async loadCommands(): Promise<ProjectCommand[]> {
    try {
      const savedCommands = await window.electron.getProjectCommands();
      if (savedCommands && Array.isArray(savedCommands) && savedCommands.length > 0) {
        return savedCommands;
      }
      // Return dummy commands if no saved commands
      const { dummyProjectCommands } = await import('../data/dummyProjectCommands');
      return dummyProjectCommands;
    } catch (error) {
      console.error('Error loading project commands:', error);
      const { dummyProjectCommands } = await import('../data/dummyProjectCommands');
      return dummyProjectCommands;
    }
  }

  async saveCommands(commands: ProjectCommand[]): Promise<{ success: boolean }> {
    try {
      const result = await window.electron.saveProjectCommands(commands);
      return result;
    } catch (error: any) {
      return { success: false };
    }
  }

  replaceVariables(command: string, variables: ProjectCommandVariable[], values: Record<string, string>): string {
    let finalCommand = command;
    variables.forEach((variable) => {
      const value = values[variable.name] || '';
      finalCommand = finalCommand.replace(new RegExp(`{{\\s*${variable.name}\\s*}}`, 'g'), value);
    });
    return finalCommand;
  }

  isDangerousCommand(command: string): boolean {
    const dangerousPatterns = [
      /rm\s+-rf/i,
      /del\s+\//i,
      /format\s+/i,
      /mkfs/i,
      /dd\s+if=/i,
      /shutdown/i,
      /reboot/i,
    ];
    return dangerousPatterns.some((pattern) => pattern.test(command));
  }
}

export const projectService = new ProjectService();

