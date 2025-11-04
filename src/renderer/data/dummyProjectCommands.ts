export interface ProjectCommandVariable {
  name: string;
  label: string;
  type: 'text' | 'dropdown';
  options?: string[];
}

export interface ProjectCommand {
  id: string;
  name: string;
  description: string;
  command: string;
  category: 'server' | 'build' | 'test' | 'database' | 'utilities';
  variables?: ProjectCommandVariable[];
  requiresConfirmation: boolean;
  icon?: string;
}

export const dummyProjectCommands: ProjectCommand[] = [
  // Server Commands
  {
    id: 'laravel-serve',
    name: 'Laravel Server',
    description: 'Start Laravel development server',
    command: 'php artisan serve',
    category: 'server',
    requiresConfirmation: false,
    icon: '🚀',
  },
  {
    id: 'npm-start',
    name: 'NPM Start',
    description: 'Start npm development server',
    command: 'npm start',
    category: 'server',
    requiresConfirmation: false,
    icon: '⚡',
  },
  {
    id: 'npm-run-dev',
    name: 'NPM Run Dev',
    description: 'Run development build',
    command: 'npm run dev',
    category: 'server',
    requiresConfirmation: false,
    icon: '🔧',
  },
  {
    id: 'python-serve',
    name: 'Python Server',
    description: 'Start Python HTTP server',
    command: 'python -m http.server {{port}}',
    category: 'server',
    requiresConfirmation: false,
    variables: [
      {
        name: 'port',
        label: 'Port Number',
        type: 'text',
      },
    ],
    icon: '🐍',
  },

  // Build Commands
  {
    id: 'npm-build',
    name: 'NPM Build',
    description: 'Build production bundle',
    command: 'npm run build',
    category: 'build',
    requiresConfirmation: false,
    icon: '📦',
  },
  {
    id: 'composer-install',
    name: 'Composer Install',
    description: 'Install PHP dependencies',
    command: 'composer install',
    category: 'build',
    requiresConfirmation: false,
    icon: '📥',
  },
  {
    id: 'npm-install',
    name: 'NPM Install',
    description: 'Install npm dependencies',
    command: 'npm install',
    category: 'build',
    requiresConfirmation: false,
    icon: '📦',
  },

  // Test Commands
  {
    id: 'npm-test',
    name: 'NPM Test',
    description: 'Run test suite',
    command: 'npm test',
    category: 'test',
    requiresConfirmation: false,
    icon: '🧪',
  },
  {
    id: 'phpunit',
    name: 'PHPUnit',
    description: 'Run PHPUnit tests',
    command: 'php artisan test',
    category: 'test',
    requiresConfirmation: false,
    icon: '✅',
  },

  // Database Commands
  {
    id: 'laravel-migrate',
    name: 'Laravel Migrate',
    description: 'Run database migrations',
    command: 'php artisan migrate',
    category: 'database',
    requiresConfirmation: false,
    icon: '🗄️',
  },
  {
    id: 'laravel-seed',
    name: 'Laravel Seed',
    description: 'Seed the database',
    command: 'php artisan db:seed',
    category: 'database',
    requiresConfirmation: false,
    icon: '🌱',
  },

  // Utilities
  {
    id: 'clear-cache',
    name: 'Clear Cache',
    description: 'Clear application cache',
    command: 'php artisan cache:clear',
    category: 'utilities',
    requiresConfirmation: false,
    icon: '🧹',
  },
];

