// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

export type Channels = 'ipc-example';

const electronHandler = {
  ipcRenderer: {
    sendMessage(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  restoreWindow: () => ipcRenderer.send('restore-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  resizeWindow: (width: number, height: number) => ipcRenderer.send('resize-window', width, height),
  setWindowPosition: (x: number, y: number) => ipcRenderer.send('set-window-position', x, y),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),
  submitBugReport: async (formData: Record<string, any>, authToken: string) => {
    return new Promise((resolve, reject) => {
      ipcRenderer.invoke('submit-bug-report', formData, authToken)
        .then(resolve)
        .catch(reject);
    });
  },
};

// Custom APIs for renderer
const api = {
  // ... existing code ...
};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronHandler);
    contextBridge.exposeInMainWorld('config', {
      apiUrl: process.env.API_URL || 'http://localhost:8000/api'
    });
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronHandler;
  // @ts-ignore (define in dts)
  window.config = {
    apiUrl: process.env.API_URL || 'http://localhost:8000/api'
  };
}

export type ElectronHandler = typeof electronHandler;
