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
import { app, BrowserWindow, shell, ipcMain, dialog, Tray, nativeImage, Menu, screen } from 'electron';
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
let toastWindow: BrowserWindow | null = null;
let consoleWindow: BrowserWindow | null = null;

// Store last pad mode position
let lastPadModePosition: { x: number; y: number } | null = null;

// Store last console window position
let lastConsoleWindowPosition: { x: number; y: number } | null = null;

// Track running processes by command ID
interface RunningProcess {
  process: any;
  command: string;
  startTime: number;
  tabId?: string; // For macOS Terminal.app tabs
}

const runningProcesses = new Map<string, RunningProcess>();

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
    icon: getAssetPath('icons', 'command-pad-logo.png'),
    alwaysOnTop: true,
    skipTaskbar: false,
    frame: false,
    transparent: true,
    type: 'panel',
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
        devTools: isDebug,
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

  // Track window position changes in pad mode
  mainWindow.on('moved', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      // Save position if window is in pad mode size (600px width)
      if (bounds.width === 600) {
        lastPadModePosition = { x: bounds.x, y: bounds.y };
      }
    }
  });

  // Position the window in the top-right corner of the current screen (where cursor is)
  const { width, height } = mainWindow.getBounds();
  const cursorPoint = screen.getCursorScreenPoint();
  const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
  const { width: screenWidth } = currentDisplay.workAreaSize;
  const { x: displayX } = currentDisplay.bounds;
  // Calculate position relative to the current display
  mainWindow.setPosition(displayX + screenWidth - width - 20, currentDisplay.bounds.y + 20);

  // Handle display changes - preserve window position on current display
  require('electron').screen.on('display-added', () => {
    // Don't reset position - keep window where user placed it
    // Only adjust if window is now off-screen
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const { screen } = require('electron');
      const displays = screen.getAllDisplays();

      // Check if window is still on a valid display
      const isOnValidDisplay = displays.some((display: Electron.Display) => {
        const { x, y, width, height } = display.bounds;
        return bounds.x >= x && bounds.x < x + width &&
               bounds.y >= y && bounds.y < y + height;
      });

      // If window is off-screen, move it to current screen (where cursor is)
      if (!isOnValidDisplay) {
        const cursorPoint = screen.getCursorScreenPoint();
        const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
        const { width: screenWidth } = currentDisplay.workAreaSize;
        const { x: displayX, y: displayY } = currentDisplay.bounds;
        mainWindow.setPosition(displayX + screenWidth - bounds.width - 20, displayY + 20);
      }
    }
  });

  require('electron').screen.on('display-removed', () => {
    // Don't reset position - keep window where user placed it
    // Only adjust if window is now off-screen
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      const { screen } = require('electron');
      const displays = screen.getAllDisplays();

      // Check if window is still on a valid display
      const isOnValidDisplay = displays.some((display: Electron.Display) => {
        const { x, y, width, height } = display.bounds;
        return bounds.x >= x && bounds.x < x + width &&
               bounds.y >= y && bounds.y < y + height;
      });

      // If window is off-screen, move it to current screen (where cursor is)
      if (!isOnValidDisplay) {
        const cursorPoint = screen.getCursorScreenPoint();
        const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
        const { width: screenWidth } = currentDisplay.workAreaSize;
        const { x: displayX, y: displayY } = currentDisplay.bounds;
        mainWindow.setPosition(displayX + screenWidth - bounds.width - 20, displayY + 20);
      }
    }
  });

  // Add IPC handlers for window controls
  ipcMain.on('minimize-window', () => {
    if (mainWindow) {
      // Save current window position before minimizing (for pad mode restoration)
      const bounds = mainWindow.getBounds();
      // Only save if window is in pad mode size (600px width)
      if (bounds.width === 600) {
        lastPadModePosition = { x: bounds.x, y: bounds.y };
      }

      // Hide console window when minimizing
      if (consoleWindow && !consoleWindow.isDestroyed()) {
        consoleWindow.hide();
      }
      // Hide the window to system tray
      mainWindow.hide();

      // Create system tray if it doesn't exist (works on all platforms)
      if (!systemTray) {
        const RESOURCES_PATH = app.isPackaged
          ? path.join(process.resourcesPath, 'assets')
          : path.join(__dirname, '../../assets');
        const getAssetPath = (...paths: string[]): string => {
          return path.join(RESOURCES_PATH, ...paths);
        };

        // Try to use a small icon for the tray (from command-pad-logo.png)
        const iconPath = getAssetPath('icons', '16x16.png');
        let trayImage = nativeImage.createFromPath(iconPath);

        // Fallback to other icon sizes if 16x16 doesn't exist
        if (trayImage.isEmpty()) {
          trayImage = nativeImage.createFromPath(getAssetPath('icons', '24x24.png'));
        }
        if (trayImage.isEmpty()) {
          trayImage = nativeImage.createFromPath(getAssetPath('icons', 'command-pad-logo.png'));
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
                // Show console window if in git pad mode
                const bounds = mainWindow.getBounds();
                if (bounds && bounds.width === 600 && bounds.height === 360) {
                  if (consoleWindow && !consoleWindow.isDestroyed()) {
                    setTimeout(() => {
                      if (consoleWindow && !consoleWindow.isDestroyed()) {
                        consoleWindow.showInactive();
                        if (mainWindow && !mainWindow.isDestroyed()) {
                          setImmediate(() => {
                            if (mainWindow && !mainWindow.isDestroyed()) {
                              mainWindow.focus();
                            }
                          });
                        }
                      }
                    }, 50);
                  }
                }
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

        // On macOS, also handle click on tray icon
        if (process.platform === 'darwin') {
          systemTray.on('click', () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
              // Show console window if in git pad mode
              const bounds = mainWindow.getBounds();
              if (bounds && bounds.width === 600 && bounds.height === 360) {
                if (consoleWindow && !consoleWindow.isDestroyed()) {
                  setTimeout(() => {
                    if (consoleWindow && !consoleWindow.isDestroyed()) {
                      consoleWindow.showInactive();
                      if (mainWindow && !mainWindow.isDestroyed()) {
                        setImmediate(() => {
                          if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.focus();
                          }
                        });
                      }
                    }
                  }, 50);
                }
              }
            }
          });
        }
      }
    }
  });

  ipcMain.on('restore-window', () => {
    if (mainWindow) {
      // Get current position to determine which display
      const currentPos = mainWindow.getPosition();
      const { screen } = require('electron');

      // Find which display the window is currently on
      const displays = screen.getAllDisplays();
      let targetDisplay = displays.find((display: Electron.Display) => {
        const { x, y, width, height } = display.bounds;
        const bounds = mainWindow!.getBounds();
        return bounds.x >= x && bounds.x < x + width &&
               bounds.y >= y && bounds.y < y + height;
      }) || screen.getPrimaryDisplay();

      mainWindow.setSize(1200, 800); // Restore original size
      // Restore position in top-right of current display
      const { width: displayWidth } = targetDisplay.workAreaSize;
      const { x: displayX, y: displayY } = targetDisplay.bounds;
      mainWindow.setPosition(displayX + displayWidth - 1220, displayY + 20);
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
      // Preserve current window position
      const currentPos = mainWindow.getPosition();
      mainWindow.setSize(width, height);
      mainWindow.setPosition(currentPos[0], currentPos[1]);
      mainWindow.setResizable(false); // Keep it non-resizable
      // Update console window position if it exists
      updateConsoleWindowPosition();
    }
  });

  ipcMain.on('set-window-position', (_, x: number, y: number) => {
    if (mainWindow) {
      mainWindow.setPosition(x, y);
      // Update console window position if it exists
      updateConsoleWindowPosition();
    }
  });

  // Save current pad mode position explicitly
  ipcMain.on('save-pad-mode-position', () => {
    if (mainWindow) {
      const bounds = mainWindow.getBounds();
      // Only save if window is in pad mode size (600px width)
      if (bounds.width === 600) {
        lastPadModePosition = { x: bounds.x, y: bounds.y };
      }
    }
  });

  // Restore window to full size and preserve position on current display
  ipcMain.on('center-window', () => {
    if (mainWindow) {
      // Get current window position to determine which display it's on
      const currentBounds = mainWindow.getBounds();
      const { screen } = require('electron');

      // Find which display the window is currently on
      const displays = screen.getAllDisplays();
      let targetDisplay = displays.find((display: Electron.Display) => {
        const { x, y, width, height } = display.bounds;
        return currentBounds.x >= x && currentBounds.x < x + width &&
               currentBounds.y >= y && currentBounds.y < y + height;
      }) || screen.getPrimaryDisplay();

      // Preserve position on current display, just restore size
      const currentPos = mainWindow.getPosition();
      mainWindow.setSize(1200, 800);
      // Keep window on same display, adjust position if needed to keep it visible
      const { width: screenWidth, height: screenHeight } = targetDisplay.workAreaSize;
      const { x: screenX, y: screenY } = targetDisplay.bounds;
      const windowWidth = 1200;
      const windowHeight = 800;

      // Ensure window stays within display bounds
      let x = currentPos[0];
      let y = currentPos[1];

      // If window would be outside display, center it on that display instead
      if (x < screenX || x + windowWidth > screenX + screenWidth ||
          y < screenY || y + windowHeight > screenY + screenHeight) {
        x = screenX + Math.floor((screenWidth - windowWidth) / 2);
        y = screenY + Math.floor((screenHeight - windowHeight) / 2);
      }

      mainWindow.setPosition(x, y);
      // Close console window when exiting pad mode
      closeConsoleWindow();
    }
  });

  // Enter pad mode - preserve current window position or default to top-right
  ipcMain.on('enter-pad-mode', (_, isGitMode: boolean = false) => {
    if (mainWindow) {
      const padWidth = 600;
      // All pad modes use consistent height: 320px (includes header, repo bar if needed, grid, and pagination)
      const padHeight = 320;

      let x: number;
      let y: number;

      // If user hasn't moved the pad mode window yet, default to top-right of current screen
      if (lastPadModePosition === null) {
        const cursorPoint = screen.getCursorScreenPoint();
        const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
        const { width: screenWidth } = currentDisplay.workAreaSize;
        const { x: displayX, y: displayY } = currentDisplay.bounds;
        x = displayX + screenWidth - padWidth - 20;
        y = displayY + 20;
      } else {
        // Use saved position if user has moved the window
        x = lastPadModePosition.x;
        y = lastPadModePosition.y;
      }

      mainWindow.setSize(padWidth, padHeight);
      mainWindow.setPosition(x, y);

      // Save position for future reference
      lastPadModePosition = { x, y };

      // Show console window for git pad mode or project pad mode
      // Note: isGitMode is true for both git and project modes (project mode uses same height)
      if (isGitMode) {
        showConsoleWindow();
      } else {
        closeConsoleWindow();
      }
    }
  });

  // Minimize to system tray (macOS)
  ipcMain.on('minimize-to-tray', () => {
    if (mainWindow && process.platform === 'darwin') {
      // Save current window position before minimizing (for pad mode restoration)
      const bounds = mainWindow.getBounds();
      // Only save if window is in pad mode size (600px width)
      if (bounds.width === 600) {
        lastPadModePosition = { x: bounds.x, y: bounds.y };
      }

      // Hide console window when minimizing
      if (consoleWindow && !consoleWindow.isDestroyed()) {
        consoleWindow.hide();
      }
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

        // Try to use a small icon for the tray (from command-pad-logo.png)
        const iconPath = getAssetPath('icons', '16x16.png');
        let trayImage = nativeImage.createFromPath(iconPath);

        // Fallback to other icon sizes if 16x16 doesn't exist
        if (trayImage.isEmpty()) {
          trayImage = nativeImage.createFromPath(getAssetPath('icons', '24x24.png'));
        }
        if (trayImage.isEmpty()) {
          trayImage = nativeImage.createFromPath(getAssetPath('icons', 'command-pad-logo.png'));
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
                // Show console window if in git pad mode
                const bounds = mainWindow.getBounds();
                if (bounds && bounds.width === 600 && bounds.height === 360) {
                  if (consoleWindow && !consoleWindow.isDestroyed()) {
                    setTimeout(() => {
                      if (consoleWindow && !consoleWindow.isDestroyed()) {
                        consoleWindow.showInactive();
                        if (mainWindow && !mainWindow.isDestroyed()) {
                          setImmediate(() => {
                            if (mainWindow && !mainWindow.isDestroyed()) {
                              mainWindow.focus();
                            }
                          });
                        }
                      }
                    }, 50);
                  }
                }
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
              // Hide console window when hiding main window
              if (consoleWindow && !consoleWindow.isDestroyed()) {
                consoleWindow.hide();
              }
              mainWindow.hide();
            } else {
              mainWindow.show();
              mainWindow.focus();
              // Show console window if in git pad mode
              const bounds = mainWindow.getBounds();
              if (bounds && bounds.width === 600 && bounds.height === 360) {
                if (consoleWindow && !consoleWindow.isDestroyed()) {
                  setTimeout(() => {
                    if (consoleWindow && !consoleWindow.isDestroyed()) {
                      consoleWindow.showInactive();
                      if (mainWindow && !mainWindow.isDestroyed()) {
                        setImmediate(() => {
                          if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.focus();
                          }
                        });
                      }
                    }
                  }, 50);
                }
              }
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

  // Prompts Pad IPC Handlers
  ipcMain.handle('get-prompts', async () => {
    try {
      const promptsPath = path.join(app.getPath('userData'), 'prompts.json');
      if (fs.existsSync(promptsPath)) {
        const data = await fs.promises.readFile(promptsPath, 'utf-8');
        return JSON.parse(data);
      }
      return null; // Return null to use dummy data
    } catch (error) {
      console.error('Error loading prompts:', error);
      return null;
    }
  });

  ipcMain.handle('save-prompts', async (_, prompts: any[]) => {
    try {
      const promptsPath = path.join(app.getPath('userData'), 'prompts.json');
      await fs.promises.writeFile(promptsPath, JSON.stringify(prompts, null, 2), 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('Error saving prompts:', error);
      return { success: false, error: error.message };
    }
  });

  // Project Command Pad IPC Handlers
  ipcMain.handle('pick-project', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Project Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  ipcMain.handle('execute-project-command', async (_, projectPath: string, command: string) => {
    return new Promise((resolve, reject) => {
      // Use shell for better argument handling, especially on Windows
      const proc = spawn(command, [], {
        cwd: projectPath,
        shell: true,
      });

      let stdout = '';
      let stderr = '';
      let hasResolved = false;

      proc.stdout?.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        // Send output in real-time to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project-command-output', {
            type: 'stdout',
            data: output,
          });
        }
        // Resolve immediately on first output (for long-running commands)
        if (!hasResolved) {
          hasResolved = true;
          resolve({
            success: true,
            exitCode: null,
            stdout: 'Command started...',
            stderr: '',
            output: 'Command started...',
          });
        }
      });

      proc.stderr?.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        // Send output in real-time to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('project-command-output', {
            type: 'stderr',
            data: output,
          });
        }
        // Resolve immediately on first output (for long-running commands)
        if (!hasResolved) {
          hasResolved = true;
          resolve({
            success: true,
            exitCode: null,
            stdout: 'Command started...',
            stderr: '',
            output: 'Command started...',
          });
        }
      });

      proc.on('close', (code) => {
        // Only resolve if we haven't already resolved (for quick commands)
        if (!hasResolved) {
          hasResolved = true;
          resolve({
            success: code === 0,
            exitCode: code,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            output: stdout || stderr,
          });
        }
      });

      proc.on('error', (error) => {
        if (!hasResolved) {
          hasResolved = true;
          reject({
            success: false,
            error: error.message,
            output: error.message,
          });
        }
      });

      // For commands that might not produce immediate output, resolve after a short delay
      // This prevents the UI from hanging on commands like "php artisan serve"
      setTimeout(() => {
        if (!hasResolved && proc && !proc.killed) {
          hasResolved = true;
          resolve({
            success: true,
            exitCode: null,
            stdout: 'Command started (running in background)...',
            stderr: '',
            output: 'Command started (running in background)...',
          });
        }
      }, 1000); // Wait 1 second for initial output

      // Store process for potential cleanup
      const processId = `project-${Date.now()}`;
      runningProcesses.set(processId, {
        process: proc,
        command: command,
        startTime: Date.now(),
      });
    });
  });

  ipcMain.handle('get-project-commands', async () => {
    try {
      const commandsPath = path.join(app.getPath('userData'), 'project-commands.json');
      if (fs.existsSync(commandsPath)) {
        const data = await fs.promises.readFile(commandsPath, 'utf-8');
        return JSON.parse(data);
      }
      return null; // Return null to use dummy data
    } catch (error) {
      console.error('Error loading project commands:', error);
      return null;
    }
  });

  ipcMain.handle('save-project-commands', async (_, commands: any[]) => {
    try {
      const commandsPath = path.join(app.getPath('userData'), 'project-commands.json');
      await fs.promises.writeFile(commandsPath, JSON.stringify(commands, null, 2), 'utf-8');
      return { success: true };
    } catch (error: any) {
      console.error('Error saving project commands:', error);
      return { success: false, error: error.message };
    }
  });

  // Onboarding and Preferences IPC Handlers
  ipcMain.handle('check-onboarding-completed', async () => {
    try {
      const onboardingPath = path.join(app.getPath('userData'), 'onboarding.json');
      if (fs.existsSync(onboardingPath)) {
        const data = await fs.promises.readFile(onboardingPath, 'utf-8');
        const onboarding = JSON.parse(data);
        return onboarding.completed === true;
      }
      return false;
    } catch (error) {
      console.error('Error checking onboarding completion:', error);
      return false;
    }
  });

  ipcMain.handle('complete-onboarding', async (_, preferences: { launchAtLogin: boolean; workingDirectory?: string }) => {
    try {
      const onboardingPath = path.join(app.getPath('userData'), 'onboarding.json');
      const onboardingData = {
        completed: true,
        completedAt: new Date().toISOString(),
        preferences: {
          launchAtLogin: preferences.launchAtLogin || false,
          workingDirectory: preferences.workingDirectory || null,
        },
      };
      await fs.promises.writeFile(onboardingPath, JSON.stringify(onboardingData, null, 2), 'utf-8');
      
      // Set launch at login preference
      app.setLoginItemSettings({
        openAtLogin: preferences.launchAtLogin || false,
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-preferences', async () => {
    try {
      const onboardingPath = path.join(app.getPath('userData'), 'onboarding.json');
      if (fs.existsSync(onboardingPath)) {
        const data = await fs.promises.readFile(onboardingPath, 'utf-8');
        const onboarding = JSON.parse(data);
        return onboarding.preferences || { launchAtLogin: false, workingDirectory: null };
      }
      return { launchAtLogin: false, workingDirectory: null };
    } catch (error) {
      console.error('Error getting preferences:', error);
      return { launchAtLogin: false, workingDirectory: null };
    }
  });

  ipcMain.handle('set-launch-at-login', async (_, enabled: boolean) => {
    try {
      app.setLoginItemSettings({
        openAtLogin: enabled,
      });
      
      // Update preferences file
      const onboardingPath = path.join(app.getPath('userData'), 'onboarding.json');
      let preferences = { launchAtLogin: false, workingDirectory: null };
      
      if (fs.existsSync(onboardingPath)) {
        const data = await fs.promises.readFile(onboardingPath, 'utf-8');
        const onboarding = JSON.parse(data);
        preferences = onboarding.preferences || preferences;
      }
      
      preferences.launchAtLogin = enabled;
      
      const onboardingData = {
        completed: true,
        completedAt: new Date().toISOString(),
        preferences,
      };
      
      await fs.promises.writeFile(onboardingPath, JSON.stringify(onboardingData, null, 2), 'utf-8');
      
      return { success: true };
    } catch (error: any) {
      console.error('Error setting launch at login:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pick-working-directory', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
      title: 'Select Default Working Directory',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Show toast notification
  const showToast = (message: string, commandText: string) => {
    // Escape HTML to prevent XSS
    const escapeHtml = (text: string) => {
      const map: { [key: string]: string } = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return text.replace(/[&<>"']/g, (m) => map[m]);
    };

    const safeMessage = escapeHtml(message);
    const safeCommandText = escapeHtml(commandText);

    // Close existing toast if any
    if (toastWindow) {
      toastWindow.close();
      toastWindow = null;
    }

    const toastWidth = 350;
    const toastHeight = 80;
    const padding = 20;

    // Calculate toast position relative to main window to ensure it's on the same Space
    let toastX = 0;
    let toastY = 0;

    if (mainWindow && !mainWindow.isDestroyed()) {
      // Position toast relative to main window - this ensures it's on the same Space
      const mainWindowBounds = mainWindow.getBounds();
      const { screen } = require('electron');
      const targetDisplay = screen.getDisplayNearestPoint({
        x: mainWindowBounds.x,
        y: mainWindowBounds.y,
      });
      const { width: screenWidth, height: screenHeight } = targetDisplay.workAreaSize;
      const { x: screenX, y: screenY } = targetDisplay.bounds;

      // Position at bottom-right of the display where main window is
      toastX = screenX + screenWidth - toastWidth - padding;
      toastY = screenY + screenHeight - toastHeight - padding;
    } else {
      // Fallback to current screen (where cursor is) if main window not available
      const { screen } = require('electron');
      const cursorPoint = screen.getCursorScreenPoint();
      const currentDisplay = screen.getDisplayNearestPoint(cursorPoint);
      const { width: screenWidth, height: screenHeight } = currentDisplay.workAreaSize;
      const { x: screenX, y: screenY } = currentDisplay.bounds;
      toastX = screenX + screenWidth - toastWidth - padding;
      toastY = screenY + screenHeight - toastHeight - padding;
    }

    toastWindow = new BrowserWindow({
      width: toastWidth,
      height: toastHeight,
      x: toastX,
      y: toastY,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      focusable: false, // Don't steal focus from main window
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
      },
    });

    // On macOS, set toast to be visible on all workspaces to prevent desktop switching
    if (process.platform === 'darwin') {
      toastWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }

    toastWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800;900&display=swap');
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              width: ${toastWidth}px;
              height: ${toastHeight}px;
              background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
              border: 1px solid rgba(209, 255, 117, 0.3);
              border-radius: 8px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: flex-start;
              padding: 12px 16px;
              font-family: 'Orbitron', monospace;
              box-shadow: 0 0 20px rgba(209, 255, 117, 0.4), 0 4px 12px rgba(0, 0, 0, 0.5);
              overflow: hidden;
            }
            p {
              font-family: 'Exo 2', sans-serif;
            }
            .toast-message {
              font-size: 12px;
              font-weight: 600;
              color: #D1FF75;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
              text-shadow: 0 0 8px rgba(209, 255, 117, 0.6);
              font-family: 'Exo 2', sans-serif;
            }
            .toast-command {
              font-size: 10px;
              font-weight: 400;
              color: rgba(209, 255, 117, 0.8);
              font-family: 'Exo 2', sans-serif;
              text-overflow: ellipsis;
              overflow: hidden;
              white-space: nowrap;
              width: 100%;
              letter-spacing: 0.3px;
            }
            @keyframes slideIn {
              from {
                transform: translateX(400px);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            body {
              animation: slideIn 0.3s ease-out;
            }
          </style>
        </head>
        <body>
          <div class="toast-message">${safeMessage}</div>
          <div class="toast-command">${safeCommandText}</div>
        </body>
      </html>
    `)}`);

    // Wait for content to load, then show without activating
    // Add small delay to let macOS establish the current Space context
    toastWindow.webContents.once('did-finish-load', () => {
      if (toastWindow && !toastWindow.isDestroyed()) {
        // Small delay to ensure main window is on current Space
        setTimeout(() => {
          if (toastWindow && !toastWindow.isDestroyed()) {
            // Show toast without stealing focus from main window
            toastWindow.showInactive();

            // Ensure main window stays focused after showing toast
            if (mainWindow && !mainWindow.isDestroyed()) {
              setImmediate(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.focus();
                }
              });
            }
          }
        }, 50); // 50ms delay to let macOS settle
      }
    });

    // Auto-close after 3 seconds
    setTimeout(() => {
      if (toastWindow) {
        toastWindow.close();
        toastWindow = null;
      }
    }, 3000);
  };

  // IPC handler for showing toast notifications
  ipcMain.handle('show-toast', async (_, message: string, commandText: string) => {
    showToast(message, commandText);
    return { success: true };
  });

  // Show console window beside pad mode window
  const showConsoleWindow = () => {
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      // Use saved position if it exists, otherwise update position relative to pad mode window
      if (lastConsoleWindowPosition !== null) {
        consoleWindow.setPosition(lastConsoleWindowPosition.x, lastConsoleWindowPosition.y);
      } else {
        updateConsoleWindowPosition();
      }
      // Show without stealing focus and ensure main window stays focused
      consoleWindow.showInactive();
      if (mainWindow && !mainWindow.isDestroyed()) {
        setImmediate(() => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.focus();
          }
        });
      }
      return;
    }

    if (!mainWindow) return;

    const consoleWidth = 600; // Match pad mode window width
    const consoleHeight = 360; // Match git pad mode window height

    let x: number;
    let y: number;

    // If user hasn't moved the console window yet, position it to the left of pad mode window
    if (lastConsoleWindowPosition === null) {
      const mainBounds = mainWindow.getBounds();
      const { screen } = require('electron');
      const targetDisplay = screen.getDisplayNearestPoint({
        x: mainBounds.x,
        y: mainBounds.y,
      });
      const padding = 20;

      x = mainBounds.x - consoleWidth - padding;
      y = mainBounds.y;
    } else {
      // Use saved position if user has moved the window
      x = lastConsoleWindowPosition.x;
      y = lastConsoleWindowPosition.y;
    }

    consoleWindow = new BrowserWindow({
      width: consoleWidth,
      height: consoleHeight,
      x,
      y,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      focusable: false,
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
      },
    });

    // Track console window position changes
    consoleWindow.on('moved', () => {
      if (consoleWindow && !consoleWindow.isDestroyed()) {
        const bounds = consoleWindow.getBounds();
        lastConsoleWindowPosition = { x: bounds.x, y: bounds.y };
      }
    });

    // Save initial position
    lastConsoleWindowPosition = { x, y };

    // Make console window visible on all workspaces (macOS)
    if (process.platform === 'darwin') {
      consoleWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    }

    // Load console HTML
    const consoleHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800;900&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              width: ${consoleWidth}px;
              height: ${consoleHeight}px;
              background: #000000;
              color: #D1FF75;
              font-family: 'Orbitron', monospace;
              overflow: hidden;
              border: 1px solid rgba(209, 255, 117, 0.2);
              border-radius: 4px;
            }
            p {
              font-family: 'Exo 2', sans-serif;
            }
            #console-container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              background: #000000;
            }
            .console-header {
              padding: 6px 12px;
              border-bottom: 1px solid rgba(209, 255, 117, 0.2);
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: rgba(209, 255, 117, 0.05);
              flex-shrink: 0;
              -webkit-app-region: drag;
              cursor: move;
            }
            .console-title {
              font-size: 10px;
              color: #D1FF75;
              text-transform: uppercase;
              letter-spacing: 1px;
              font-weight: 600;
              display: flex;
              align-items: center;
              gap: 8px;
              font-family: 'Exo 2', sans-serif;
            }
            .console-entry-count {
              font-size: 9px;
              color: rgba(209, 255, 117, 0.6);
              font-family: 'Exo 2', sans-serif;
            }
            .console-actions {
              display: flex;
              gap: 4px;
              -webkit-app-region: no-drag;
            }
            .console-action-btn {
              background: rgba(209, 255, 117, 0.1);
              border: 1px solid rgba(209, 255, 117, 0.3);
              color: #D1FF75;
              padding: 4px 6px;
              border-radius: 2px;
              cursor: pointer;
              font-size: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
              font-family: 'Exo 2', sans-serif;
            }
            .console-action-btn:hover {
              background: rgba(209, 255, 117, 0.2);
              border-color: #D1FF75;
            }
            #console-content {
              flex: 1;
              overflow-y: auto;
              padding: 6px;
              font-size: 10px;
              line-height: 1.4;
              font-family: 'Exo 2', sans-serif;
            }
            .console-entry {
              margin-bottom: 4px;
              padding: 4px 6px;
              border-left: 2px solid;
              border-radius: 2px;
              background: rgba(209, 255, 117, 0.05);
            }
            .console-entry.success { border-color: #66bb6a; }
            .console-entry.error { border-color: #ff4757; }
            .console-entry.warning { border-color: #ffaa00; }
            .console-entry.info { border-color: #42a5f5; }
            .console-entry.command { border-color: #D1FF75; }
            .console-timestamp {
              font-size: 9px;
              color: rgba(209, 255, 117, 0.6);
              margin-right: 6px;
              font-family: 'Exo 2', sans-serif;
            }
            .console-message {
              margin: 0;
              font-size: 10px;
              color: #D1FF75;
              white-space: pre-wrap;
              word-wrap: break-word;
              font-family: 'Exo 2', sans-serif;
            }
            .console-empty {
              color: rgba(209, 255, 117, 0.5);
              text-align: center;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          <div id="console-container">
            <div class="console-header">
              <div class="console-title">
                <span>COMMAND OUTPUT</span>
                <span class="console-entry-count" id="entry-count">0 entries</span>
              </div>
              <div class="console-actions">
                <button class="console-action-btn" id="copy-btn" title="Copy to Clipboard">Copy</button>
                <button class="console-action-btn" id="clear-btn" title="Clear Console">Clear</button>
              </div>
            </div>
            <div id="console-content"></div>
          </div>
          <script>
            let consoleEntries = [];

            function updateEntryCount() {
              const countEl = document.getElementById('entry-count');
              if (countEl) {
                countEl.textContent = consoleEntries.length + ' entries';
              }
            }

            function renderConsole() {
              const content = document.getElementById('console-content');
              if (!content) return;

              updateEntryCount();

              if (consoleEntries.length === 0) {
                content.innerHTML = '<div class="console-empty">No console output yet</div>';
              } else {
                content.innerHTML = consoleEntries.map(entry => {
                  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
                  return \`
                    <div class="console-entry \${entry.type}">
                      <span class="console-timestamp">\${timestamp}</span>
                      <pre class="console-message">\${escapeHtml(entry.message)}</pre>
                    </div>
                  \`;
                }).join('');
                // Auto-scroll to bottom
                content.scrollTop = content.scrollHeight;
              }
            }

            function escapeHtml(text) {
              const div = document.createElement('div');
              div.textContent = text;
              return div.innerHTML;
            }

            document.getElementById('copy-btn')?.addEventListener('click', () => {
              const text = consoleEntries.map(e => \`[\${new Date(e.timestamp).toLocaleTimeString()}] \${e.message}\`).join('\\n');
              navigator.clipboard.writeText(text);
            });

            document.getElementById('clear-btn')?.addEventListener('click', () => {
              consoleEntries = [];
              renderConsole();
              if (window.electron?.sendConsoleCleared) {
                window.electron.sendConsoleCleared();
              }
            });

            window.addEventListener('DOMContentLoaded', () => {
              renderConsole();
            });

            // Expose function to update console entries
            window.updateConsoleEntries = (entries) => {
              consoleEntries = entries.map(e => ({
                type: e.type,
                message: e.message,
                timestamp: e.timestamp,
              }));
              renderConsole();
            };
          </script>
        </body>
      </html>
    `;

    consoleWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(consoleHTML)}`);

    // Wait for content to load, then show without activating (like toast)
    // Add small delay to let macOS establish the current Space context
    consoleWindow.webContents.once('did-finish-load', () => {
      if (consoleWindow && !consoleWindow.isDestroyed()) {
        // Small delay to ensure main window is on current Space
        setTimeout(() => {
          if (consoleWindow && !consoleWindow.isDestroyed()) {
            // Show console without stealing focus from main window
            consoleWindow.showInactive();

            // Ensure main window stays focused after showing console
            if (mainWindow && !mainWindow.isDestroyed()) {
              setImmediate(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.focus();
                }
              });
            }
          }
        }, 50); // 50ms delay to let macOS settle
      }
    });

    consoleWindow.on('closed', () => {
      consoleWindow = null;
    });
  };

  // Update console window position to match pad mode window
  const updateConsoleWindowPosition = () => {
    if (!consoleWindow || !mainWindow || consoleWindow.isDestroyed() || mainWindow.isDestroyed()) return;

    const mainBounds = mainWindow.getBounds();
    const consoleWidth = 600;

    // Only update position if user hasn't manually moved the console window
    // If user has moved it, preserve their position and only update height
    if (lastConsoleWindowPosition === null) {
      // User hasn't moved it yet - position it relative to pad mode window
      const { screen } = require('electron');
      const targetDisplay = screen.getDisplayNearestPoint({
        x: mainBounds.x,
        y: mainBounds.y,
      });
      const padding = 20;

      const x = mainBounds.x - consoleWidth - padding;
      const y = mainBounds.y;

      consoleWindow.setPosition(x, y);
    }
    // Always update height to match pad mode window height
    consoleWindow.setSize(consoleWidth, mainBounds.height);
  };

  // Close console window
  const closeConsoleWindow = () => {
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      // Save position before closing
      const bounds = consoleWindow.getBounds();
      lastConsoleWindowPosition = { x: bounds.x, y: bounds.y };
      consoleWindow.close();
      consoleWindow = null;
    }
  };

  // Execute command in background (no terminal window)
  ipcMain.handle('execute-system-command-in-terminal', async (_, command: string, commandId: string, commandName?: string) => {
    try {
      // Remove "System:" prefix if present
      const normalizedCommand = command.trim().replace(/^System:\s*/i, '');

      // Check if already running
      if (runningProcesses.has(commandId)) {
        return { success: false, error: 'Command is already running' };
      }

      let proc: any;

      // Run command in background for all platforms - no terminal windows
      if (process.platform === 'darwin') {
        // macOS: Run command in background using spawn with detached mode
        // Spawn directly in shell without opening Terminal window
        // Set environment variables to prevent window opening and desktop switching
        const env = {
          ...process.env,
          // Prevent GUI applications from opening windows
          NSUnbufferedIO: '1',
        };

        proc = spawn(normalizedCommand, [], {
          shell: true,
          detached: true,
          stdio: 'ignore',
          env: env,
        });

        // Unref to allow parent process to exit independently
        proc.unref();
      } else if (process.platform === 'win32') {
        // Windows: Run command in background without opening cmd window
        // Spawn directly with detached mode and hidden window
        proc = spawn(normalizedCommand, [], {
          shell: true,
          detached: true,
          stdio: 'ignore',
          windowsHide: true, // Hide the window on Windows
        });

        // Unref to allow parent process to exit independently
        proc.unref();
      } else {
        // Linux: Run command in background without opening terminal
        proc = spawn('sh', ['-c', normalizedCommand], {
          detached: true,
          stdio: 'ignore',
        });

        // Unref to allow parent process to exit independently
        proc.unref();
      }

      // Store the process for tracking (even though we can't easily track detached processes)
      // We'll use the PID for killing if needed
      runningProcesses.set(commandId, {
        process: proc,
        command: normalizedCommand,
        startTime: Date.now(),
      });

      // Try to track process exit (may not work for all detached processes)
      if (proc && proc.on) {
        proc.on('exit', () => {
          runningProcesses.delete(commandId);
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', commandId);
          }
        });

        proc.on('error', (error: Error) => {
          console.error(`Process error for ${commandId}:`, error);
          runningProcesses.delete(commandId);
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', commandId);
          }
        });
      }

      console.log(`Command ${commandId} started in background, stored in runningProcesses`);

      // Ensure main window stays focused and visible on current desktop
      // This prevents switching to another desktop/space when command runs
      if (mainWindow && !mainWindow.isDestroyed()) {
        // Use setImmediate and setTimeout to restore focus after any potential focus changes
        const restoreFocus = () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(true);
            mainWindow.show();
            mainWindow.focus();
          }
        };

        // Restore focus immediately and after delays to catch any focus changes
        restoreFocus();
        setImmediate(restoreFocus);
        setTimeout(restoreFocus, 10);
        setTimeout(restoreFocus, 50);
        setTimeout(restoreFocus, 100);
      }

      // Show toast notification on the same display as main window
      const displayMessage = commandName ? `${commandName} activated` : 'Command running';
      const displayCommand = normalizedCommand;
      showToast(displayMessage, displayCommand);

      return { success: true, commandId };
    } catch (error: any) {
      console.error('Error executing command:', error);
      return { success: false, error: error.message };
    }
  });

  // Execute project command in background (for continuous output commands)
  ipcMain.handle('execute-project-command-in-terminal', async (_, projectPath: string, command: string, commandId: string, commandName?: string) => {
    try {
      // Check if already running
      if (runningProcesses.has(commandId)) {
        return { success: false, error: 'Command is already running' };
      }

      let proc: any;

      // Run command in background in the project directory with output capture
      // Use 'pipe' for stdio to capture output, but still run detached for background execution
      if (process.platform === 'darwin') {
        // macOS: Run command in background but capture output
        const env = {
          ...process.env,
          NSUnbufferedIO: '1',
        };

        proc = spawn(command, [], {
          cwd: projectPath,
          shell: true,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
          env: env,
        });

        proc.unref();
      } else if (process.platform === 'win32') {
        // Windows: Run command in background but capture output
        proc = spawn(command, [], {
          cwd: projectPath,
          shell: true,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
          windowsHide: true,
        });

        proc.unref();
      } else {
        // Linux: Run command in background but capture output
        proc = spawn('sh', ['-c', command], {
          cwd: projectPath,
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'], // Capture stdout and stderr
        });

        proc.unref();
      }

      // Capture and stream output to console
      if (proc.stdout) {
        proc.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          // Send output to console window
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('project-command-output', {
              type: 'stdout',
              data: output,
            });
          }
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          // Send output to console window
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('project-command-output', {
              type: 'stderr',
              data: output,
            });
          }
        });
      }

      // Store the process for tracking
      runningProcesses.set(commandId, {
        process: proc,
        command: command,
        startTime: Date.now(),
      });

      // Try to track process exit
      if (proc && proc.on) {
        proc.on('exit', () => {
          runningProcesses.delete(commandId);
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', commandId);
          }
        });

        proc.on('error', (error: Error) => {
          console.error(`Process error for ${commandId}:`, error);
          runningProcesses.delete(commandId);
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', commandId);
            // Send error to console
            mainWindow.webContents.send('project-command-output', {
              type: 'stderr',
              data: `Error: ${error.message}\n`,
            });
          }
        });
      }

      console.log(`Project command ${commandId} started in background, stored in runningProcesses`);

      // Ensure main window stays focused
      if (mainWindow && !mainWindow.isDestroyed()) {
        const restoreFocus = () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setAlwaysOnTop(true);
            mainWindow.show();
            mainWindow.focus();
          }
        };

        restoreFocus();
        setImmediate(restoreFocus);
        setTimeout(restoreFocus, 10);
        setTimeout(restoreFocus, 50);
        setTimeout(restoreFocus, 100);
      }

      // Show toast notification
      const displayMessage = commandName ? `${commandName} activated` : 'Command running';
      const displayCommand = command;
      showToast(displayMessage, displayCommand);

      return { success: true, commandId };
    } catch (error: any) {
      console.error('Error executing project command:', error);
      return { success: false, error: error.message };
    }
  });

  // Kill running command
  ipcMain.handle('kill-system-command', async (_, commandId: string) => {
    try {
      const runningProcess = runningProcesses.get(commandId);
      if (!runningProcess) {
        return { success: false, error: 'Command is not running' };
      }

      let killed = false;

      // Try multiple kill strategies for background processes
      if (runningProcess.process) {
        // Strategy 1: Use the process object's kill method directly
        if (typeof runningProcess.process.kill === 'function') {
          try {
            killed = runningProcess.process.kill('SIGTERM');
          } catch (e) {
            console.log('Direct process.kill() failed:', e);
          }
        }

        // Strategy 2: Kill by PID/process group
        if (runningProcess.process.pid && runningProcess.process.pid !== 0) {
          try {
            if (process.platform === 'win32') {
              // Windows: Kill process tree using taskkill
              spawn('taskkill', ['/pid', runningProcess.process.pid.toString(), '/f', '/t'], {
                detached: true,
                stdio: 'ignore',
              });
              killed = true;
            } else {
              // macOS/Linux: Try to kill process group first (negative PID)
              // This kills the shell and all its children
              try {
                process.kill(-runningProcess.process.pid, 'SIGTERM');
                killed = true;
              } catch (pgidError: any) {
                // If process group kill fails (might not be in separate group),
                // try killing the individual process
                try {
                  process.kill(runningProcess.process.pid, 'SIGTERM');
                  killed = true;
                } catch (pidError: any) {
                  console.log('PID kill failed:', pidError.message);
                  // Process may have already exited
                }
              }
            }
          } catch (killError: any) {
            console.error('Error killing by PID:', killError.message);
          }
        }

        // Strategy 3: For macOS/Linux, also try pkill to find and kill by command pattern
        if (process.platform !== 'win32' && !killed) {
          try {
            // Extract command name from full command
            const commandParts = runningProcess.command.split(/\s+/);
            const commandName = commandParts[0];

            if (commandName) {
              spawn('pkill', ['-f', runningProcess.command], {
                detached: true,
                stdio: 'ignore',
              });
            }
          } catch (e) {
            console.log('pkill failed:', e);
          }
        }
      }

      // Save PID before cleanup for force kill timeout
      const processPid = runningProcess.process?.pid;

      // Force kill after short timeout if process didn't terminate
      setTimeout(() => {
        if (processPid && processPid !== 0) {
          try {
            if (process.platform === 'win32') {
              spawn('taskkill', ['/pid', processPid.toString(), '/f', '/t'], {
                detached: true,
                stdio: 'ignore',
              });
            } else {
              // Force kill process group with SIGKILL
              try {
                process.kill(-processPid, 'SIGKILL');
              } catch (e) {
                // If process group kill fails, try individual process
                try {
                  process.kill(processPid, 'SIGKILL');
                } catch (e2) {
                  // Process already terminated
                }
              }
            }
          } catch (e) {
            // Process already terminated
          }
        }
      }, 1000);

      // Immediately remove from tracking and notify UI
      runningProcesses.delete(commandId);

      if (mainWindow) {
        mainWindow.webContents.send('command-finished', commandId);
      }

      return { success: true, killed };
    } catch (error: any) {
      console.error('Error killing command:', error);

      // Even if kill fails, clean up the tracking
      runningProcesses.delete(commandId);
      if (mainWindow) {
        mainWindow.webContents.send('command-finished', commandId);
      }

      return { success: false, error: error.message };
    }
  });

  // Check if command is running
  ipcMain.handle('is-command-running', async (_, commandId: string) => {
    return { running: runningProcesses.has(commandId) };
  });

  // Console window IPC handlers
  ipcMain.on('show-console-window', () => {
    showConsoleWindow();
  });

  ipcMain.on('close-console-window', () => {
    closeConsoleWindow();
  });

  ipcMain.on('update-console-entries', (_, entries: any[]) => {
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      consoleWindow.webContents.executeJavaScript(`
        if (window.updateConsoleEntries) {
          window.updateConsoleEntries(${JSON.stringify(entries)});
        }
      `).catch(console.error);
    }
  });

  ipcMain.on('console-cleared', () => {
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      consoleWindow.webContents.executeJavaScript(`
        if (window.updateConsoleEntries) {
          window.updateConsoleEntries([]);
        }
      `).catch(console.error);
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

  // Hide/show console window when main window is minimized/restored
  mainWindow.on('minimize', () => {
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      consoleWindow.hide();
    }
  });

  mainWindow.on('restore', () => {
    // Only show console if we're in git pad mode
    if (consoleWindow && !consoleWindow.isDestroyed()) {
      const bounds = mainWindow?.getBounds();
      if (bounds) {
        // Check if window is in git pad mode (600px width, 360px height)
        if (bounds.width === 600 && bounds.height === 360) {
          setTimeout(() => {
            if (consoleWindow && !consoleWindow.isDestroyed()) {
              consoleWindow.showInactive();
              // Ensure main window stays focused
              setImmediate(() => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                  mainWindow.focus();
                }
              });
            }
          }, 50);
        }
      }
    }
  });

  // Clean up toast window and console window on app close
  app.on('before-quit', () => {
    if (toastWindow) {
      toastWindow.close();
      toastWindow = null;
    }
    if (consoleWindow) {
      consoleWindow.close();
      consoleWindow = null;
    }
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
    // Set app name and dock icon for macOS (before creating window)
    if (process.platform === 'darwin') {
      app.setName('Command Pad');
      const RESOURCES_PATH = app.isPackaged
        ? path.join(process.resourcesPath, 'assets')
        : path.join(__dirname, '../../assets');
      const getAssetPath = (...paths: string[]): string => {
        return path.join(RESOURCES_PATH, ...paths);
      };
      const dockIcon = nativeImage.createFromPath(getAssetPath('icons', 'command-pad-logo.png'));
      if (!dockIcon.isEmpty()) {
        app.dock?.setIcon(dockIcon);
      }
    }
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) {
        createWindow();
      } else {
        // Show and focus the window if it exists but is hidden
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        // Show console window if in git pad mode
        const bounds = mainWindow.getBounds();
        if (bounds && bounds.width === 600 && bounds.height === 360) {
          if (consoleWindow && !consoleWindow.isDestroyed()) {
            setTimeout(() => {
              if (consoleWindow && !consoleWindow.isDestroyed()) {
                consoleWindow.showInactive();
                if (mainWindow && !mainWindow.isDestroyed()) {
                  setImmediate(() => {
                    if (mainWindow && !mainWindow.isDestroyed()) {
                      mainWindow.focus();
                    }
                  });
                }
              }
            }, 50);
          }
        }
      }
    });
  })
  .catch(console.log);
