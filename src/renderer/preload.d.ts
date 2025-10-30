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

export {};
