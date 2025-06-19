/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

// Set environment variables
process.env.API_URL = process.env.API_URL || 'http://localhost:8000/api';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 900,
    height: 800,
    icon: getAssetPath('icon.png'),
    alwaysOnTop: true,
    skipTaskbar: true,
    frame: false,
    transparent: true,
    type: 'panel',
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      devTools: false

    },
  });

  // Disable DevTools shortcut
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.key.toLowerCase() === 'i') {
      event.preventDefault();
    }
  });

  // Make the window draggable
  mainWindow.setMovable(true);
  mainWindow.setResizable(false);

  // Position the window in the top-right corner of the primary display
  const { width, height } = mainWindow.getBounds();
  const { width: screenWidth } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  mainWindow.setPosition(screenWidth - width - 20, 20);

  // Handle display changes
  require('electron').screen.on('display-added', () => {
    const { width: newScreenWidth } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    mainWindow?.setPosition(newScreenWidth - width - 20, 20);
  });

  require('electron').screen.on('display-removed', () => {
    const { width: newScreenWidth } = require('electron').screen.getPrimaryDisplay().workAreaSize;
    mainWindow?.setPosition(newScreenWidth - width - 20, 20);
  });

  // Add IPC handlers for window controls
  ipcMain.on('minimize-window', () => {
    if (mainWindow) {
      mainWindow.setSize(48, 48); // Small icon size
      mainWindow.setPosition(screenWidth - 68, 20); // Position in top-right
    }
  });

  ipcMain.on('restore-window', () => {
    if (mainWindow) {
      mainWindow.setSize(900, 800); // Restore original size
      mainWindow.setPosition(screenWidth - 920, 20); // Restore original position
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  // Add handler for screenshot capture
  ipcMain.handle('capture-screenshot', async () => {
    try {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;

      const screenshot = await mainWindow?.webContents.capturePage({
        x: 0,
        y: 0,
        width,
        height
      });

      return screenshot.toDataURL();
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      throw error;
    }
  });

  // Add handler for bug report submission
  ipcMain.handle('submit-bug-report', async (_, formData, authToken) => {
    try {
      console.log('Received bug report submission request');
      console.log('Form data:', formData);

      const apiUrl = process.env.API_URL || 'http://localhost:8000/api';
      console.log('Submitting to API:', `${apiUrl}/bugs`);

      // Create a new FormData object
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      const response = await fetch(`${apiUrl}/bugs`, {
        method: 'POST',
        body: formDataToSend,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('API Error:', errorData);
        throw new Error(errorData?.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('API Response:', result);
      return response;
    } catch (error) {
      console.error('Error in submit-bug-report handler:', error);
      throw error;
    }
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
