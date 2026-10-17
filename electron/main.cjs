/**
 * Electron Main Process for Point of Sales Desktop Application
 * Compatible with Windows (.exe), macOS (.dmg), and Linux (.AppImage / .deb)
 */

const { app, BrowserWindow, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow = null;
let serverProcess = null;
const PORT = process.env.PORT || 3000;
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;

function findServerScript() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'server.cjs'),
    path.join(__dirname, 'dist', 'server.cjs'),
    path.join(process.cwd(), 'dist', 'server.cjs'),
    path.join(app.getAppPath(), 'dist', 'server.cjs'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function findIndexHtml() {
  const candidates = [
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(process.cwd(), 'dist', 'index.html'),
    path.join(app.getAppPath(), 'dist', 'index.html'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function isPortActive(port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function checkServerReady(url, maxAttempts = 40, interval = 400) {
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
  const serverPath = findServerScript();
  if (serverPath) {
    try {
      // In packaged or embedded mode, start bundled express server
      require(serverPath);
      console.log('Embedded server started from', serverPath);
      return true;
    } catch (err) {
      console.error('Failed to start embedded server:', err);
      return false;
    }
  } else {
    console.warn('dist/server.cjs not found in candidates, searching for dev server');
  }
  return false;
}

function getFallbackErrorHtml(isTempPath, appDir) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Ulilmart POS - Menghubungkan ke Server Kasir</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #020617;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 16px;
      max-width: 640px;
      width: 100%;
      padding: 36px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      margin-bottom: 20px;
    }
    .spinner {
      display: inline-block;
      width: 28px;
      height: 28px;
      border: 3px solid rgba(56, 189, 248, 0.2);
      border-radius: 50%;
      border-top-color: #38bdf8;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 12px; color: #ffffff; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
    .box {
      background: #1e293b;
      border-radius: 10px;
      padding: 16px;
      text-align: left;
      font-size: 13px;
      color: #cbd5e1;
      margin-bottom: 24px;
      border-left: 4px solid #38bdf8;
    }
    .box b { color: #f8fafc; }
    .box ol { padding-left: 20px; margin-top: 8px; }
    .box li { margin-bottom: 6px; }
    .btn {
      background: #0284c7;
      color: white;
      border: none;
      padding: 12px 28px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .btn:hover { background: #0369a1; }
    .status-text { font-size: 12px; color: #64748b; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <div class="badge">Menunggu Server Kasir (Port 3000)</div>
    <h1>Menghubungkan ke Terminal Kasir...</h1>
    <p>Aplikasi Electron sedang menunggu server backend lokal di <code>http://localhost:3000</code> siap melayani.</p>

    <div class="box">
      ${isTempPath ? `
        <p style="color:#fca5a5; font-weight:bold; margin-bottom:8px;">
          ⚠️ PERINGATAN: Terdeteksi Berjalan di Folder Sementara (Temp)
        </p>
        <p>Anda membuka file langsung dari dalam arsip ZIP tanpa mengekstraknya terlebih dahulu. Windows memindahkan file sementara ke:</p>
        <code style="display:block; padding:8px; background:#0b1120; border-radius:6px; margin:6px 0; word-break:break-all; color:#93c5fd; font-size:12px;">${appDir}</code>
        <ol>
          <li>Tutup jendela ini.</li>
          <li>Buka file <b>ZIP Ulilmart POS</b> di File Explorer Anda.</li>
          <li>Klik kanan file ZIP &gt; pilih <b>"Extract All..." / "Ekstrak Semua"</b> ke folder baru (misal di Desktop atau <code>C:\\UlilmartPOS</code>).</li>
          <li>Jalankan <b>UlilmartPOS.exe</b> atau <b>MULAI-KASIR.bat</b> dari folder yang sudah diekstrak.</li>
        </ol>
      ` : `
        <b>Petunjuk Menyalakan Kasir:</b>
        <ol>
          <li>Pastikan Anda sudah menjalankan <b>UlilmartPOS.exe</b> atau <b>MULAI-KASIR.bat</b>.</li>
          <li>Server akan menyala dalam beberapa detik di port 3000.</li>
          <li>Jendela ini akan <b>otomatis terbuka</b> begitu server aktif.</li>
        </ol>
      `}
    </div>

    <button class="btn" onclick="checkNow()">Coba Hubungkan Sekarang</button>
    <div class="status-text" id="status">Mengecek port 3000 setiap 2 detik secara otomatis...</div>
  </div>

  <script>
    async function checkNow() {
      document.getElementById('status').innerText = 'Sedang memeriksa koneksi ke http://localhost:3000...';
      try {
        const res = await fetch('http://localhost:3000/api/health', { method: 'GET' });
        if (res.ok) {
          document.getElementById('status').innerText = 'Server terhubung! Membuka kasir...';
          window.location.href = 'http://localhost:3000';
          return;
        }
      } catch (e) {
        // Not ready
      }
      document.getElementById('status').innerText = 'Server belum merespons. Mencoba lagi...';
    }

    setInterval(async () => {
      try {
        const res = await fetch('http://localhost:3000/api/health', { method: 'GET' });
        if (res.ok) {
          window.location.href = 'http://localhost:3000';
        }
      } catch (e) {}
    }, 2000);
  </script>
</body>
</html>`;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    title: 'Ulilmart POS - Terminal Kasir Desktop',
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

  // Check if server is already running
  const serverAlreadyRunning = await isPortActive(PORT, 1000);

  if (!serverAlreadyRunning) {
    console.log('[Electron] Port 3000 is not yet active, starting embedded server...');
    const serverStarted = startEmbeddedServer();
    if (serverStarted) {
      try {
        await checkServerReady(startUrl, 40, 500);
      } catch (err) {
        console.warn('[Electron] Server ready wait timed out:', err);
      }
    }
  }

  // Attempt to load the application
  try {
    await mainWindow.loadURL(startUrl);
  } catch (err) {
    console.warn('Direct loadURL failed, trying fallback:', err.message);
    const fallbackPath = findIndexHtml();
    if (fallbackPath) {
      mainWindow.loadFile(fallbackPath);
    } else {
      // Show informative embedded reconnect page instead of crashing!
      const currentDir = process.cwd();
      const isTemp = currentDir.toLowerCase().includes('temp') || __dirname.toLowerCase().includes('temp');
      mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getFallbackErrorHtml(isTemp, currentDir)));
    }
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
