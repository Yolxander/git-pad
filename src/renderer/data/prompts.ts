export interface Prompt {
  id: string;
  name: string;
  text: string; // Prompt content to copy to clipboard
  category: 'ai' | 'code' | 'writing' | 'general';
  icon?: string;
}

export const dummyPrompts: Prompt[] = [
  {
    id: 'ai-code-review',
    name: 'Code Review Prompt',
    text: 'Please review this code and provide feedback on:\n1. Code quality and best practices\n2. Potential bugs or issues\n3. Performance optimizations\n4. Security concerns',
    category: 'ai',
    icon: '🔍',
  },
  {
    id: 'ai-explain-code',
    name: 'Explain Code',
    text: 'Can you explain what this code does? Break it down step by step and explain the logic.',
    category: 'ai',
    icon: '💡',
  },
  {
    id: 'code-function-template',
    name: 'Function Template',
    text: 'function functionName(params) {\n  // TODO: Implement function logic\n  return result;\n}',
    category: 'code',
    icon: '⚙️',
  },
  {
    id: 'writing-email-template',
    name: 'Email Template',
    text: 'Subject: \n\nDear [Name],\n\nI hope this message finds you well.\n\n[Your message here]\n\nBest regards,\n[Your name]',
    category: 'writing',
    icon: '📧',
  },
  {
    id: 'general-todo',
    name: 'Todo List Template',
    text: '- [ ] Task 1\n- [ ] Task 2\n- [ ] Task 3',
    category: 'general',
    icon: '✅',
  },
];

