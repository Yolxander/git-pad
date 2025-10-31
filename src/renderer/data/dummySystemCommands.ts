export interface SystemCommandVariable {
  name: string;
  label: string;
  type: 'text' | 'dropdown';
  options?: string[];
}

export interface SystemCommand {
  id: string;
  name: string;
  description: string;
  command: string;
  category: 'power' | 'network' | 'audio' | 'utilities';
  variables?: SystemCommandVariable[];
  requiresConfirmation: boolean;
  icon?: string;
}

export const dummySystemCommands: SystemCommand[] = [
  // Power Commands
  {
    id: 'caffeinate-display',
    name: 'Keep Display Awake',
    description: 'Prevent display from sleeping (caffeinate -d)',
    command: 'caffeinate -d',
    category: 'power',
    requiresConfirmation: false,
    icon: '☕',
  },
  {
    id: 'caffeinate-system',
    name: 'Keep System Awake',
    description: 'Prevent system from sleeping (caffeinate -i)',
    command: 'caffeinate -i',
    category: 'power',
    requiresConfirmation: false,
    icon: '⚡',
  },
  {
    id: 'pmset-sleepnow',
    name: 'Sleep Now',
    description: 'Put system to sleep immediately',
    command: 'pmset sleepnow',
    category: 'power',
    requiresConfirmation: true,
    icon: '😴',
  },
  {
    id: 'pmset-displaysleep',
    name: 'Display Sleep Settings',
    description: 'Show display sleep settings',
    command: 'pmset -g',
    category: 'power',
    requiresConfirmation: false,
    icon: '💤',
  },

  // Audio Commands
  {
    id: 'say-message',
    name: 'Say Message',
    description: 'Use macOS text-to-speech to say a message',
    command: 'say "{{message}}"',
    category: 'audio',
    requiresConfirmation: false,
    variables: [
      {
        name: 'message',
        label: 'Message to Speak',
        type: 'text',
      },
    ],
    icon: '🔊',
  },
  {
    id: 'say-build-complete',
    name: 'Say Build Complete',
    description: 'Announce build completion',
    command: 'say "Build complete"',
    category: 'audio',
    requiresConfirmation: false,
    icon: '✅',
  },
  {
    id: 'say-notification',
    name: 'Say Notification',
    description: 'Speak a custom notification message',
    command: 'say "{{notification}}"',
    category: 'audio',
    requiresConfirmation: false,
    variables: [
      {
        name: 'notification',
        label: 'Notification Message',
        type: 'text',
      },
    ],
    icon: '📢',
  },

  // Network Commands
  {
    id: 'open-url',
    name: 'Open URL',
    description: 'Open a URL in default browser',
    command: 'open {{url}}',
    category: 'network',
    requiresConfirmation: false,
    variables: [
      {
        name: 'url',
        label: 'URL to Open',
        type: 'text',
      },
    ],
    icon: '🌐',
  },
  {
    id: 'open-localhost',
    name: 'Open Localhost',
    description: 'Open localhost:3000 in browser',
    command: 'open http://localhost:3000',
    category: 'network',
    requiresConfirmation: false,
    icon: '🚀',
  },
  {
    id: 'ping-host',
    name: 'Ping Host',
    description: 'Ping a host to check connectivity',
    command: 'ping -c 4 {{host}}',
    category: 'network',
    requiresConfirmation: false,
    variables: [
      {
        name: 'host',
        label: 'Host to Ping',
        type: 'text',
      },
    ],
    icon: '📡',
  },
  {
    id: 'ifconfig',
    name: 'Show Network Info',
    description: 'Display network interface configuration',
    command: 'ifconfig',
    category: 'network',
    requiresConfirmation: false,
    icon: '📶',
  },

  // Utilities Commands
  {
    id: 'list-processes',
    name: 'List Processes',
    description: 'Show running processes (top)',
    command: 'ps aux | head -20',
    category: 'utilities',
    requiresConfirmation: false,
    icon: '📋',
  },
  {
    id: 'disk-usage',
    name: 'Disk Usage',
    description: 'Show disk usage information',
    command: 'df -h',
    category: 'utilities',
    requiresConfirmation: false,
    icon: '💾',
  },
  {
    id: 'system-info',
    name: 'System Info',
    description: 'Display system information',
    command: 'system_profiler SPSoftwareDataType',
    category: 'utilities',
    requiresConfirmation: false,
    icon: '💻',
  },
  {
    id: 'copy-to-clipboard',
    name: 'Copy to Clipboard',
    description: 'Copy text to clipboard using pbcopy',
    command: 'echo "{{text}}" | pbcopy',
    category: 'utilities',
    requiresConfirmation: false,
    variables: [
      {
        name: 'text',
        label: 'Text to Copy',
        type: 'text',
      },
    ],
    icon: '📋',
  },
  {
    id: 'clear-terminal',
    name: 'Clear Terminal',
    description: 'Clear terminal screen',
    command: 'clear',
    category: 'utilities',
    requiresConfirmation: false,
    icon: '🧹',
  },
];

