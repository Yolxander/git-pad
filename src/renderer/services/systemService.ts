import { SystemCommand, SystemCommandVariable } from '../data/dummySystemCommands';

export interface SystemCommandResult {
  success: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  output?: string;
  error?: string;
}

class SystemService {
  async executeCommand(command: string): Promise<SystemCommandResult> {
    try {
      const result = await window.electron.executeSystemCommand(command);
      return result as SystemCommandResult;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error',
        output: error.message || 'Unknown error',
      };
    }
  }

  async loadCommands(): Promise<SystemCommand[]> {
    try {
      const commands = await window.electron.getSystemCommands();
      if (commands && Array.isArray(commands)) {
        return commands;
      }
      // Return dummy commands if no saved commands
      const { dummySystemCommands } = await import('../data/dummySystemCommands');
      return dummySystemCommands;
    } catch (error) {
      console.error('Error loading system commands:', error);
      const { dummySystemCommands } = await import('../data/dummySystemCommands');
      return dummySystemCommands;
    }
  }

  async saveCommands(commands: SystemCommand[]): Promise<boolean> {
    try {
      const result = await window.electron.saveSystemCommands(commands);
      return result.success || false;
    } catch (error) {
      console.error('Error saving system commands:', error);
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
    variables: SystemCommandVariable[],
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
      /rm\s+-rf/,
      /sudo\s+rm/,
      /mkfs/,
      /dd\s+if=/,
      />\/dev\/sd/,
      /format/,
      /fdisk/,
    ];

    return dangerousPatterns.some((pattern) => pattern.test(command));
  }

  // Check if command starts with "System:" and remove the prefix
  normalizeCommand(command: string): string {
    const trimmed = command.trim();
    if (trimmed.startsWith('System:')) {
      return trimmed.replace(/^System:\s*/i, '').trim();
    }
    return trimmed;
  }
}

export const systemService = new SystemService();

