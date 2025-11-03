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
let toastWindow: BrowserWindow | null = null;

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
    
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Close existing toast if any
    if (toastWindow) {
      toastWindow.close();
      toastWindow = null;
    }
    
    const toastWidth = 350;
    const toastHeight = 80;
    const padding = 20;
    
    toastWindow = new BrowserWindow({
      width: toastWidth,
      height: toastHeight,
      x: screenWidth - toastWidth - padding,
      y: screenHeight - toastHeight - padding,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        devTools: false,
      },
    });
    
    toastWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700;900&display=swap');
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
            .toast-message {
              font-size: 12px;
              font-weight: 600;
              color: #D1FF75;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 6px;
              text-shadow: 0 0 8px rgba(209, 255, 117, 0.6);
            }
            .toast-command {
              font-size: 10px;
              font-weight: 400;
              color: rgba(209, 255, 117, 0.8);
              font-family: 'Courier New', monospace;
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
    
    toastWindow.show();
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      if (toastWindow) {
        toastWindow.close();
        toastWindow = null;
      }
    }, 3000);
  };

  // Open terminal window and execute command
  ipcMain.handle('execute-system-command-in-terminal', async (_, command: string, commandId: string, commandName?: string) => {
    try {
      // Remove "System:" prefix if present
      const normalizedCommand = command.trim().replace(/^System:\s*/i, '');

      // Check if already running
      if (runningProcesses.has(commandId)) {
        return { success: false, error: 'Command is already running' };
      }

      let proc: any;

      if (process.platform === 'darwin') {
        // macOS: Open Terminal.app and run the command there
        // Store a reference to the terminal tab for killing
        const escapedCommand = normalizedCommand.replace(/"/g, '\\"').replace(/\$/g, '\\$');
        const script = `tell application "Terminal"
          set newTab to do script "${escapedCommand}"
          return id of newTab
        end tell`;

        // Use a Promise to wait for the tab ID with timeout and better error handling
        const getTabId = new Promise<string>((resolve, reject) => {
          const osascriptProc = spawn('osascript', ['-e', script], {
            detached: false,
            stdio: 'pipe',
          });

          let tabId = '';
          let stderrOutput = '';

          osascriptProc.stdout.on('data', (data) => {
            tabId += data.toString().trim();
          });

          osascriptProc.stderr.on('data', (data) => {
            stderrOutput += data.toString();
          });

          // Add a timeout (5 seconds)
          const timeout = setTimeout(() => {
            osascriptProc.kill();
            reject(new Error(`Timeout waiting for Terminal tab ID. stderr: ${stderrOutput || 'none'}`));
          }, 5000);

          osascriptProc.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0 && tabId) {
              resolve(tabId);
            } else {
              reject(new Error(`Failed to get Terminal tab ID (code: ${code}, stderr: ${stderrOutput || 'none'}, stdout: ${tabId || 'empty'})`));
            }
          });

          osascriptProc.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });

        // Wait for tab ID and then store it (non-blocking - command still runs even if this fails)
        getTabId.then((tabId) => {
          const runningProcess = runningProcesses.get(commandId);
          if (runningProcess) {
            runningProcess.tabId = tabId;

            // Poll to check if the Terminal tab is still running
            const checkInterval = setInterval(() => {
              const checkScript = `tell application "Terminal"
                try
                  repeat with win in windows
                    repeat with t in tabs of win
                      if id of t is ${tabId} then
                        return true
                      end if
                    end repeat
                  end repeat
                  return false
                on error
                  return false
                end try
              end tell`;

              const checkProc = spawn('osascript', ['-e', checkScript], {
                detached: false,
                stdio: 'pipe',
              });

              let stillRunning = false;
              checkProc.stdout.on('data', (data) => {
                const result = data.toString().trim();
                stillRunning = result === 'true';
              });

              checkProc.on('close', (code) => {
                if (!stillRunning || code !== 0) {
                  // Tab closed or process finished
                  clearInterval(checkInterval);
                  runningProcesses.delete(commandId);
                  if (mainWindow) {
                    mainWindow.webContents.send('command-finished', commandId);
                  }
                }
              });

              checkProc.on('error', () => {
                // Ignore errors during checking
              });
            }, 2000); // Check every 2 seconds

            // Store interval ID to clear it if killed manually
            (runningProcess as any).checkInterval = checkInterval;
          }
        }).catch((error) => {
          // Log the error but don't fail the command - it may still be running
          // Some commands (like caffeinate) may not create a persistent tab
          console.warn('Failed to get Terminal tab ID (command may still be running):', error.message || error);

          // For commands that might finish quickly, we won't be able to track them
          // but that's okay - they've still been executed
          const runningProcess = runningProcesses.get(commandId);
          if (runningProcess) {
            // Mark that we don't have a tab ID, so we can't track or kill it via tab ID
            // The process will need to be tracked differently or manually killed
            (runningProcess as any).noTabId = true;
          }
        });

        // Create a process object that uses AppleScript to send Control+C
        proc = {
          pid: 0, // Placeholder
          kill: function(signal?: string) {
            const runningProcess = runningProcesses.get(commandId);
            if (!runningProcess) {
              return false;
            }

            // Clear the polling interval if it exists
            if ((runningProcess as any).checkInterval) {
              clearInterval((runningProcess as any).checkInterval);
            }

            // If we have a tab ID, try to kill via Terminal tab
            if (runningProcess.tabId) {
              const killScript = `tell application "Terminal"
                activate
                try
                  repeat with win in windows
                    repeat with t in tabs of win
                      if id of t is ${runningProcess.tabId} then
                        set frontmost of win to true
                        set selected of t to true
                        do script (ASCII character 3) in t
                        delay 0.3
                        do script "killall -KILL Terminal" in t
                        return true
                      end if
                    end repeat
                  end repeat
                on error errMsg
                  return false
                end try
              end tell`;
              spawn('osascript', ['-e', killScript], {
                detached: false,
                stdio: 'ignore',
              });
              // Clean up from runningProcesses immediately since tab will be closed
              runningProcesses.delete(commandId);
              // Notify renderer that command was finished/killed
              if (mainWindow) {
                mainWindow.webContents.send('command-finished', commandId);
              }
              return true;
            }

            // If we don't have a tab ID, try to find and kill the process
            // This is a fallback for commands where tab ID retrieval failed
            if ((runningProcess as any).noTabId) {
              // First, try to find and close the terminal tab by finding the most recent tab
              // This works as a fallback when tab ID retrieval fails
              const findAndKillScript = `tell application "Terminal"
                activate
                try
                  -- Find the last tab in the frontmost window (most likely our tab)
                  set frontWin to front window
                  set tabCount to count of tabs of frontWin

                  if tabCount > 0 then
                    -- Get the last tab (most recently created)
                    set targetTab to tab tabCount of frontWin
                    set frontmost of frontWin to true
                    set selected of targetTab to true
                    do script (ASCII character 3) in targetTab
                    delay 0.3
                    do script "killall -KILL Terminal" in targetTab
                    return true
                  end if

                  return false
                on error errMsg
                  return false
                end try
              end tell`;

              spawn('osascript', ['-e', findAndKillScript], {
                detached: false,
                stdio: 'ignore',
              });

              // Also try to kill the process using pkill as a backup
              const commandParts = runningProcess.command.split(/\s+/);
              const commandName = commandParts[0];

              if (commandName) {
                try {
                  // Use pkill to kill the process
                  spawn('pkill', ['-f', runningProcess.command], {
                    detached: false,
                    stdio: 'ignore',
                  });
                } catch (e) {
                  console.warn(`Failed to kill process ${commandId} via pkill:`, e);
                }
              }

              // Clean up from runningProcesses
              runningProcesses.delete(commandId);
              // Notify renderer that command was finished/killed
              if (mainWindow) {
                mainWindow.webContents.send('command-finished', commandId);
              }
              return true;
            }

            return false;
          },
        };
      } else if (process.platform === 'win32') {
        // Windows: Execute command and open in cmd window
        // First execute the command so we can track it
        proc = spawn(normalizedCommand, [], {
          shell: true,
          stdio: 'inherit',
          detached: false,
        });

        // Also open cmd window to show it
        spawn('cmd.exe', ['/c', 'start', 'cmd.exe', '/k', normalizedCommand], {
          detached: true,
          stdio: 'ignore',
        });
      } else {
        // Linux: Execute command and open terminal
        proc = spawn(normalizedCommand, [], {
          shell: true,
          stdio: 'inherit',
          detached: false,
        });

        // Open terminal to show it
        const terminals = ['gnome-terminal', 'xterm', 'konsole', 'terminator'];
        for (const term of terminals) {
          try {
            spawn(term, ['-e', 'bash', '-c', `${normalizedCommand}; exec bash`], {
              detached: true,
              stdio: 'ignore',
            });
            break;
          } catch (e) {
            continue;
          }
        }
      }

      // Store the process immediately (before async tabId capture on macOS)
      runningProcesses.set(commandId, {
        process: proc,
        command: normalizedCommand,
        startTime: Date.now(),
      });

      // Clean up when process exits (only for non-macOS or real processes)
      if (proc && process.platform !== 'darwin' && proc.on) {
        proc.on('exit', () => {
          runningProcesses.delete(commandId);
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', commandId);
          }
        });

        proc.on('error', (error) => {
          console.error(`Process error for ${commandId}:`, error);
          runningProcesses.delete(commandId);
          if (mainWindow) {
            mainWindow.webContents.send('command-finished', commandId);
          }
        });
      }

      console.log(`Command ${commandId} started, stored in runningProcesses`);
      
      // Show toast notification
      const displayMessage = commandName ? `${commandName} activated` : 'Command running';
      const displayCommand = normalizedCommand;
      showToast(displayMessage, displayCommand);
      
      return { success: true, commandId };
    } catch (error: any) {
      console.error('Error opening terminal:', error);
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

      // macOS: Kill process in Terminal tab by sending Control+C
      if (process.platform === 'darwin' && runningProcess.tabId) {
        try {
          // Clear the polling interval if it exists
          if ((runningProcess as any).checkInterval) {
            clearInterval((runningProcess as any).checkInterval);
          }

          // Send interrupt signal and then exit to close the tab
          const killScript = `tell application "Terminal"
            activate
            try
              repeat with win in windows
                repeat with t in tabs of win
                  if id of t is ${runningProcess.tabId} then
                    set frontmost of win to true
                    set selected of t to true
                    -- Send Control+C to interrupt the command
                    do script (ASCII character 3) in t
                    delay 0.3
                    -- Kill Terminal to close all windows
                    do script "killall -KILL Terminal" in t
                    return true
                  end if
                end repeat
              end repeat
            on error errMsg
              return false
            end try
          end tell`;

          const killProc = spawn('osascript', ['-e', killScript], {
            detached: false,
            stdio: 'pipe',
          });

          let output = '';
          killProc.stdout.on('data', (data) => {
            output += data.toString();
          });

          killProc.on('close', (code) => {
            if (code === 0) {
              console.log(`Successfully sent Control+C to Terminal tab ${runningProcess.tabId}`);
            } else {
              console.log(`Failed to send Control+C to Terminal tab ${runningProcess.tabId}, code: ${code}, output: ${output}`);
            }
          });

          killProc.on('error', (error) => {
            console.error(`Error executing kill script:`, error);
          });

          killed = true;
        } catch (e) {
          console.log('AppleScript kill failed:', e);
        }
      }

      // If we don't have a tab ID but we're on macOS, try to find and close the most recent tab
      if (process.platform === 'darwin' && !runningProcess.tabId && (runningProcess as any).noTabId) {
        try {
          const findAndKillScript = `tell application "Terminal"
            activate
            try
              -- Find the last tab in the frontmost window (most likely our tab)
              set frontWin to front window
              set tabCount to count of tabs of frontWin

              if tabCount > 0 then
                -- Get the last tab (most recently created)
                set targetTab to tab tabCount of frontWin
                set frontmost of frontWin to true
                set selected of targetTab to true
                do script (ASCII character 3) in targetTab
                delay 0.3
                do script "killall -KILL Terminal" in targetTab
                return true
              end if

              return false
            on error errMsg
              return false
            end try
          end tell`;

          spawn('osascript', ['-e', findAndKillScript], {
            detached: false,
            stdio: 'ignore',
          });
          killed = true;
        } catch (e) {
          console.log('Fallback AppleScript kill failed:', e);
        }
      }

      // Try multiple kill strategies
      if (runningProcess.process && !killed) {
        // Strategy 1: Use the process object's kill method directly (most reliable)
        if (typeof runningProcess.process.kill === 'function') {
          try {
            killed = runningProcess.process.kill('SIGTERM');
          } catch (e) {
            console.log('Direct process.kill() failed:', e);
          }
        }

        // Strategy 2: Kill by PID/process group (skip if already killed via AppleScript)
        if (runningProcess.process.pid && runningProcess.process.pid !== 0) {
          try {
            if (process.platform === 'win32') {
              // Windows: Kill process tree using taskkill
              spawn('taskkill', ['/pid', runningProcess.process.pid.toString(), '/f', '/t'], {
                detached: true,
                stdio: 'ignore',
              });
              killed = true;
            } else if (process.platform !== 'darwin') {
              // Linux: Try to kill process group first (negative PID)
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
      }

      // Save PID and tabId before cleanup for force kill timeout
      const processPid = runningProcess.process?.pid;
      const tabId = runningProcess.tabId;

      // Force kill after short timeout if process didn't terminate
      setTimeout(() => {
        if (process.platform === 'darwin' && tabId) {
          // macOS: Try sending Control+C again via AppleScript, then exit
          try {
            const killScript = `tell application "Terminal"
              activate
              try
                repeat with win in windows
                  repeat with t in tabs of win
                    if id of t is ${tabId} then
                      set frontmost of win to true
                      set selected of t to true
                      do script (ASCII character 3) in t
                      delay 0.3
                      do script "killall -KILL Terminal" in t
                      return true
                    end if
                  end repeat
                end repeat
              on error errMsg
                return false
              end try
            end tell`;
            spawn('osascript', ['-e', killScript], {
              detached: false,
              stdio: 'ignore',
            });
          } catch (e) {
            // Tab may have closed
          }
        } else if (processPid && processPid !== 0) {
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
  
  // Clean up toast window on app close
  app.on('before-quit', () => {
    if (toastWindow) {
      toastWindow.close();
      toastWindow = null;
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
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
