export interface GitCommandVariable {
  name: string;
  label: string;
  type: 'text' | 'dropdown';
  options?: string[];
}

export interface GitCommand {
  id: string;
  name: string;
  description: string;
  command: string;
  category: 'branching' | 'commits' | 'sync' | 'advanced';
  variables?: GitCommandVariable[];
  requiresConfirmation: boolean;
  icon?: string;
}

export const dummyCommands: GitCommand[] = [
  // Branching Commands
  {
    id: 'git-status',
    name: 'Status',
    description: 'Show the working tree status',
    command: 'git status',
    category: 'branching',
    requiresConfirmation: false,
    icon: '📊',
  },
  {
    id: 'git-branch',
    name: 'List Branches',
    description: 'List all local branches',
    command: 'git branch',
    category: 'branching',
    requiresConfirmation: false,
    icon: '🌿',
  },
  {
    id: 'git-checkout',
    name: 'Checkout Branch',
    description: 'Switch to a different branch',
    command: 'git checkout {{branch}}',
    category: 'branching',
    requiresConfirmation: false,
    variables: [
      {
        name: 'branch',
        label: 'Branch Name',
        type: 'text',
      },
    ],
    icon: '🔀',
  },
  {
    id: 'git-create-branch',
    name: 'Create Branch',
    description: 'Create and switch to a new branch',
    command: 'git checkout -b {{branch}}',
    category: 'branching',
    requiresConfirmation: false,
    variables: [
      {
        name: 'branch',
        label: 'Branch Name',
        type: 'text',
      },
    ],
    icon: '➕',
  },

  // Commit Commands
  {
    id: 'git-add-all',
    name: 'Add All Files',
    description: 'Stage all changes for commit',
    command: 'git add -A',
    category: 'commits',
    requiresConfirmation: false,
    icon: '📦',
  },
  {
    id: 'git-commit',
    name: 'Commit Changes',
    description: 'Commit staged changes with a message',
    command: "git commit -m '{{message}}'",
    category: 'commits',
    requiresConfirmation: true,
    variables: [
      {
        name: 'message',
        label: 'Commit Message',
        type: 'text',
      },
    ],
    icon: '💾',
  },
  {
    id: 'git-log',
    name: 'View Log',
    description: 'Show commit history',
    command: 'git log --oneline -20',
    category: 'commits',
    requiresConfirmation: false,
    icon: '📜',
  },
  {
    id: 'git-add-commit',
    name: 'Add & Commit',
    description: 'Stage all changes and commit with message',
    command: "git add -A && git commit -m '{{message}}'",
    category: 'commits',
    requiresConfirmation: true,
    variables: [
      {
        name: 'message',
        label: 'Commit Message',
        type: 'text',
      },
    ],
    icon: '⚡',
  },

  // Sync Commands
  {
    id: 'git-pull',
    name: 'Pull Changes',
    description: 'Fetch and merge changes from remote',
    command: 'git pull origin {{branch}}',
    category: 'sync',
    requiresConfirmation: false,
    variables: [
      {
        name: 'branch',
        label: 'Branch Name',
        type: 'text',
      },
    ],
    icon: '⬇️',
  },
  {
    id: 'git-push',
    name: 'Push Changes',
    description: 'Push local commits to remote repository',
    command: 'git push origin {{branch}}',
    category: 'sync',
    requiresConfirmation: true,
    variables: [
      {
        name: 'branch',
        label: 'Branch Name',
        type: 'text',
      },
    ],
    icon: '⬆️',
  },
  {
    id: 'git-pull-origin-main',
    name: 'Pull Main',
    description: 'Pull from origin main branch',
    command: 'git pull origin main',
    category: 'sync',
    requiresConfirmation: false,
    icon: '⬇️',
  },
  {
    id: 'git-push-origin-main',
    name: 'Push Main',
    description: 'Push to origin main branch',
    command: 'git push origin main',
    category: 'sync',
    requiresConfirmation: true,
    icon: '⬆️',
  },

  // Advanced Commands
  {
    id: 'git-diff',
    name: 'Show Diff',
    description: 'Show changes between working directory and staging area',
    command: 'git diff',
    category: 'advanced',
    requiresConfirmation: false,
    icon: '🔍',
  },
  {
    id: 'git-merge',
    name: 'Merge Branch',
    description: 'Merge a branch into the current branch',
    command: 'git merge {{branch}}',
    category: 'advanced',
    requiresConfirmation: true,
    variables: [
      {
        name: 'branch',
        label: 'Branch to Merge',
        type: 'text',
      },
    ],
    icon: '🔀',
  },
  {
    id: 'git-stash',
    name: 'Stash Changes',
    description: 'Temporarily save uncommitted changes',
    command: 'git stash',
    category: 'advanced',
    requiresConfirmation: false,
    icon: '📥',
  },
  {
    id: 'git-stash-pop',
    name: 'Apply Stash',
    description: 'Apply the most recent stash',
    command: 'git stash pop',
    category: 'advanced',
    requiresConfirmation: false,
    icon: '📤',
  },
  {
    id: 'git-reset-soft',
    name: 'Reset Soft',
    description: 'Reset HEAD to a specific commit (keeps changes staged)',
    command: 'git reset --soft HEAD~1',
    category: 'advanced',
    requiresConfirmation: true,
    icon: '↩️',
  },
];

