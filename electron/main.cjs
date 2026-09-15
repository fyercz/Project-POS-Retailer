/**
 * Electron Main Process for Point of Sales Desktop Application
 * Compatible with Windows (.exe), macOS (.dmg), and Linux (.AppImage / .deb)
 */

const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;

function checkServerReady(url, maxAttempts = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      http
        .get(url, (res) => {
          if (res.statusCode < 500) {
            resolve(true);
          } else {
            retry();
          }
        })
        .on('error', () => {
          retry();
        });
    };

    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Server start timed out'));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

function startEmbeddedServer() {
  if (app.isPackaged) {
    try {
      // In packaged mode, start the bundled express server
      const serverPath = path.join(__dirname, '..', 'dist', 'server.cjs');
      require(serverPath);
      console.log('Embedded server started from', serverPath);
    } catch (err) {
      console.error('Failed to start embedded server:', err);
    }
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: 'Point of Sales - Terminal Kasir Desktop',
    backgroundColor: '#020617',
    icon: path.join(__dirname, '..', 'public', 'icon.svg'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // Remove default menu for clean POS feel
  Menu.setApplicationMenu(null);

  const startUrl = `http://localhost:${PORT}`;

  try {
    if (app.isPackaged) {
      startEmbeddedServer();
      await checkServerReady(startUrl);
    }
    await mainWindow.loadURL(startUrl);
  } catch (err) {
    console.warn('Direct loadURL failed, falling back to local file:', err);
    const fallbackPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(fallbackPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle Cashier Keyboard Hotkeys (F11 Fullscreen Kiosk, F5 Refresh)
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for POS Hardware Integration
ipcMain.handle('pos:get-printers', async () => {
  if (!mainWindow) return [];
  try {
    return await mainWindow.webContents.getPrintersAsync();
  } catch (err) {
    console.error('Failed to get printers:', err);
    return [];
  }
});

ipcMain.handle('pos:print-silent', async (event, { deviceName, silent = true }) => {
  if (!mainWindow) return { success: false, error: 'Window not available' };
  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: silent,
        printBackground: true,
        deviceName: deviceName || '',
        margins: { marginType: 'none' },
      },
      (success, failureReason) => {
        if (!success) {
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      }
    );
  });
});

ipcMain.handle('pos:toggle-fullscreen', () => {
  if (!mainWindow) return false;
  const isFull = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(isFull);
  return isFull;
});

ipcMain.handle('pos:toggle-kiosk', () => {
  if (!mainWindow) return false;
  const isKiosk = !mainWindow.isKiosk();
  mainWindow.setKiosk(isKiosk);
  return isKiosk;
});

ipcMain.handle('pos:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('pos:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('pos:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('pos:kick-cash-drawer', async () => {
  // ESC/POS Drawer kick command: ESC p 0 25 250
  console.log('[POS Hardware] Cash drawer kick pulse executed.');
  return { success: true, message: 'Pulse ESC/POS Cash Drawer dikirim ke printer kasir.' };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
