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
import fs from 'fs';
import { app, BrowserWindow, shell, ipcMain, dialog, Tray, nativeImage, Menu } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { spawn } from 'child_process';
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
let systemTray: Tray | null = null;

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
    width: 1200,
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
      devTools: true

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
      mainWindow.setSize(1200, 800); // Restore original size
      mainWindow.setPosition(screenWidth - 1220, 20); // Restore original position
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  // Add handlers for pomodoro window functions
  ipcMain.on('resize-window', (_, width: number, height: number) => {
    if (mainWindow) {
      mainWindow.setSize(width, height);
      mainWindow.setResizable(false); // Keep it non-resizable
    }
  });

  ipcMain.on('set-window-position', (_, x: number, y: number) => {
    if (mainWindow) {
      mainWindow.setPosition(x, y);
    }
  });

  // Center window on screen
  ipcMain.on('center-window', () => {
    if (mainWindow) {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
      // Ensure window is full size before centering
      mainWindow.setSize(1200, 800);
      const windowWidth = 1200;
      const windowHeight = 800;
      const x = Math.floor((screenWidth - windowWidth) / 2);
      const y = Math.floor((screenHeight - windowHeight) / 2);
      mainWindow.setPosition(x, y);
    }
  });

  // Enter pad mode - position window at top-right
  ipcMain.on('enter-pad-mode', () => {
    if (mainWindow) {
      const { screen } = require('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width: screenWidth } = primaryDisplay.workAreaSize;
      const padWidth = 600;
      const padHeight = 260;
      const padding = 20;
      const x = screenWidth - padWidth - padding;
      const y = padding;
      mainWindow.setSize(padWidth, padHeight);
      mainWindow.setPosition(x, y);
    }
  });

  // Minimize to system tray (macOS)
  ipcMain.on('minimize-to-tray', () => {
    if (mainWindow && process.platform === 'darwin') {
      // Hide the window
      mainWindow.hide();

      // Create system tray if it doesn't exist
      if (!systemTray) {
        const RESOURCES_PATH = app.isPackaged
          ? path.join(process.resourcesPath, 'assets')
          : path.join(__dirname, '../../assets');
        const getAssetPath = (...paths: string[]): string => {
          return path.join(RESOURCES_PATH, ...paths);
        };

        // Try to use a small icon for the tray
        const iconPath = getAssetPath('icons', '16x16.png');
        let trayImage = nativeImage.createFromPath(iconPath);
        
        // Fallback to other icon sizes if 16x16 doesn't exist
        if (trayImage.isEmpty()) {
          trayImage = nativeImage.createFromPath(getAssetPath('icons', '24x24.png'));
        }
        if (trayImage.isEmpty()) {
          trayImage = nativeImage.createFromPath(getAssetPath('icon.png'));
        }

        systemTray = new Tray(trayImage);

        // Create context menu
        const contextMenu = Menu.buildFromTemplate([
          {
            label: 'Show Git Pad',
            click: () => {
              if (mainWindow) {
                mainWindow.show();
                mainWindow.focus();
              }
            },
          },
          {
            type: 'separator',
          },
          {
            label: 'Quit',
            click: () => {
              if (systemTray) {
                systemTray.destroy();
                systemTray = null;
              }
              app.quit();
            },
          },
        ]);

        systemTray.setContextMenu(contextMenu);
        systemTray.setToolTip('Git Pad');

        // Handle tray icon click to show/hide window
        systemTray.on('click', () => {
          if (mainWindow) {
            if (mainWindow.isVisible()) {
              mainWindow.hide();
            } else {
              mainWindow.show();
              mainWindow.focus();
            }
          }
        });
      }
    }
  });

  // Show window from tray
  ipcMain.on('show-from-tray', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  ipcMain.handle('get-screen-size', () => {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    return { width, height };
  });

  ipcMain.handle('get-window-size', () => {
    if (mainWindow) {
      const [width, height] = mainWindow.getSize();
      return { width, height };
    }
    return { width: 0, height: 0 };
  });

  ipcMain.handle('get-window-position', () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition();
      return { x, y };
    }
    return { x: 0, y: 0 };
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

  // Git Command Pad IPC Handlers
  ipcMain.handle('pick-git-repo', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Git Repository Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('validate-git-repo', async (_, repoPath: string) => {
    try {
      const gitPath = path.join(repoPath, '.git');
      const stats = await fs.promises.stat(gitPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  });

  ipcMain.handle('execute-git-command', async (_, repoPath: string, command: string) => {
    return new Promise((resolve, reject) => {
      // Use shell for better argument handling, especially on Windows
      const proc = spawn(command, [], {
        cwd: repoPath,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          output: stdout || stderr,
        });
      });

      proc.on('error', (error) => {
        reject({
          success: false,
          error: error.message,
          output: error.message,
        });
      });
    });
  });

  ipcMain.handle('get-repo-info', async (_, repoPath: string) => {
    try {
      // Get current branch
      const branchProc = spawn('git', ['branch', '--show-current'], {
        cwd: repoPath,
        shell: process.platform === 'win32',
      });

      let branch = '';
      branchProc.stdout?.on('data', (data) => {
        branch += data.toString();
      });

      await new Promise((resolve) => branchProc.on('close', resolve));

      // Get status
      const statusProc = spawn('git', ['status', '--porcelain'], {
        cwd: repoPath,
        shell: process.platform === 'win32',
      });

      let statusOutput = '';
      statusProc.stdout?.on('data', (data) => {
        statusOutput += data.toString();
      });

      await new Promise((resolve) => statusProc.on('close', resolve));

      const hasUncommittedChanges = statusOutput.trim().length > 0;

      return {
        branch: branch.trim() || 'unknown',
        hasUncommittedChanges,
        repoPath,
      };
    } catch (error: any) {
      return {
        branch: 'unknown',
        hasUncommittedChanges: false,
        repoPath,
        error: error.message,
      };
    }
  });

  ipcMain.handle('get-commands', async () => {
    try {
      const commandsPath = path.join(app.getPath('userData'), 'commands.json');
      if (fs.existsSync(commandsPath)) {
        const data = await fs.promises.readFile(commandsPath, 'utf-8');
        return JSON.parse(data);
      }
      return null; // Return null to use dummy data
    } catch (error) {
      console.error('Error loading commands:', error);
      return null;
    }
  });

  ipcMain.handle('save-commands', async (_, commands: any[]) => {
    try {
      const commandsPath = path.join(app.getPath('userData'), 'commands.json');
      await fs.promises.writeFile(commandsPath, JSON.stringify(commands, null, 2), 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('Error saving commands:', error);
      return { success: false, error: error.message };
    }
  });

  // System Command Pad IPC Handlers
  ipcMain.handle('execute-system-command', async (_, command: string) => {
    return new Promise((resolve, reject) => {
      // Remove "System:" prefix if present
      const normalizedCommand = command.trim().replace(/^System:\s*/i, '');
      
      // Use shell for better argument handling, especially on Windows
      const proc = spawn(normalizedCommand, [], {
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          output: stdout || stderr,
        });
      });

      proc.on('error', (error) => {
        reject({
          success: false,
          error: error.message,
          output: error.message,
        });
      });
    });
  });

  ipcMain.handle('get-system-commands', async () => {
    try {
      const commandsPath = path.join(app.getPath('userData'), 'system-commands.json');
      if (fs.existsSync(commandsPath)) {
        const data = await fs.promises.readFile(commandsPath, 'utf-8');
        return JSON.parse(data);
      }
      return null; // Return null to use dummy data
    } catch (error) {
      console.error('Error loading system commands:', error);
      return null;
    }
  });

  ipcMain.handle('save-system-commands', async (_, commands: any[]) => {
    try {
      const commandsPath = path.join(app.getPath('userData'), 'system-commands.json');
      await fs.promises.writeFile(commandsPath, JSON.stringify(commands, null, 2), 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('Error saving system commands:', error);
      return { success: false, error: error.message };
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

app.on('before-quit', () => {
  // Clean up system tray on quit
  if (systemTray) {
    systemTray.destroy();
    systemTray = null;
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
