'use strict';

/* Local-only Electron wrapper. This is NOT a browser pointing to pokesurvivor.com. */
const { app, BrowserWindow, Menu, session, ipcMain, shell } = require('electron');
const path = require('node:path');

app.setAppUserModelId('com.ronvotri.pkmsvv');
// Stable localStorage path even when the portable executable is moved.
app.setPath('userData', path.join(app.getPath('appData'), 'PKMSVV-Offline'));

let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 540,
    backgroundColor: '#0a1430',
    title: 'Pokémon Sống Sót — Votri Valley',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname,'preload.cjs'),
      webSecurity: true,
      spellcheck: false
    }
  });
  mainWindow = win;

  // Native fail-safe: renderer visibility callbacks can be throttled when
  // minimized. Mute Electron's output immediately without changing the
  // player's saved music/SFX mute preferences.
  const syncBackgroundMute = () => {
    if (win.isDestroyed() || win.webContents.isDestroyed()) return;
    win.webContents.setAudioMuted(win.isMinimized() || !win.isVisible() || !win.isFocused());
  };
  for (const event of ['minimize','restore','blur','focus','hide','show'])
    win.on(event, syncBackgroundMute);

  // Online content, CDN, Firebase, sockets and other web endpoints are blocked.
  // Local game assets, data: and blob: URLs still work.
  const blocker = ({ url }, done) => {
    done({ cancel: /^(?:https?|wss?):/i.test(url) });
  };
  session.defaultSession.webRequest.onBeforeRequest(blocker);
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, target) => {
    if (target !== win.webContents.getURL()) event.preventDefault();
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, '..', 'vendor', 'pokesurvivor', 'index.html'));
  win.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  // Only the app's own window may request a native full-screen toggle.
  ipcMain.handle('pkmsvv:toggle-fullscreen',event=>{
    const win=BrowserWindow.fromWebContents(event.sender);
    if(!win || win!==mainWindow)throw Error('Invalid full-screen requester');
    win.setFullScreen(!win.isFullScreen());
    return {fullscreen:win.isFullScreen()};
  });
  // OAuth stays in the trusted external browser, not Electron's file:// renderer.
  ipcMain.handle('pkmsvv:open-online',async event=>{
    const win=BrowserWindow.fromWebContents(event.sender);
    if(!win || win!==mainWindow)throw Error('Invalid online launcher requester');
    return shell.openExternal('https://pkmsvv-b84d2.web.app/');
  });
  ipcMain.handle('pkmsvv:is-fullscreen',event=>{
    const win=BrowserWindow.fromWebContents(event.sender);
    if(!win || win!==mainWindow)throw Error('Invalid full-screen requester');
    return {fullscreen:win.isFullScreen()};
  });
  createWindow();
  if(app.isPackaged) require('./update-check.cjs').checkForNewRelease({app,mainWindow});
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
