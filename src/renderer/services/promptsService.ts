import { Prompt } from '../data/prompts';

class PromptsService {
  async loadPrompts(): Promise<Prompt[]> {
    try {
      const prompts = await window.electron.getPrompts();
      if (prompts && Array.isArray(prompts)) {
        return prompts;
      }
      // Return dummy prompts if no saved prompts
      const { dummyPrompts } = await import('../data/prompts');
      return dummyPrompts;
    } catch (error) {
      console.error('Error loading prompts:', error);
      const { dummyPrompts } = await import('../data/prompts');
      return dummyPrompts;
    }
  }

  async savePrompts(prompts: Prompt[]): Promise<boolean> {
    try {
      const result = await window.electron.savePrompts(prompts);
      return result.success || false;
    } catch (error) {
      console.error('Error saving prompts:', error);
      return false;
    }
  }
}

export const promptsService = new PromptsService();

