/**
 * main.js - Electron Main Process
 *
 * This is the entry point of our Electron application.
 * It runs in a Node.js environment and is responsible for:
 * 1. Managing application lifecycle (start, quit, activate).
 * 2. Creating and managing the desktop window (BrowserWindow).
 * 3. Handling IPC (Inter-Process Communication) messages from the renderer UI.
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { store } = require('./store');

let mainWindow = null;

/**
 * Creates the primary application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1150,
    height: 760,
    minWidth: 780,
    minHeight: 520,
    title: 'Noted',
    titleBarStyle: 'default',
    webPreferences: {
      // The preload script safely bridges Node.js and the Web UI
      preload: path.join(__dirname, '../preload/preload.js'),
      // Security best practice: keep renderer isolated from Node.js
      contextIsolation: true,
      // Security best practice: do not expose raw Node.js APIs in the DOM
      nodeIntegration: false
    }
  });

  // Load the frontend HTML file
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Clean up reference when window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Register IPC Handlers
 * These functions answer requests sent from the frontend (app.js via preload.js).
 */
function setupIpcHandlers() {
  // 1. Load all notebooks and notes
  ipcMain.handle('notes:load', async () => {
    return store.load();
  });

  // 2. Save or update a note
  ipcMain.handle('notes:save-note', async (_event, noteData) => {
    return store.saveNote(noteData);
  });

  // 3. Delete a note
  ipcMain.handle('notes:delete-note', async (_event, noteId) => {
    return store.deleteNote(noteId);
  });

  // 4. Create a new notebook
  ipcMain.handle('notebooks:create', async (_event, name) => {
    return store.createNotebook(name);
  });

  // 5. Rename a notebook
  ipcMain.handle('notebooks:rename', async (_event, { id, name }) => {
    return store.renameNotebook(id, name);
  });

  // 6. Delete a notebook
  ipcMain.handle('notebooks:delete', async (_event, notebookId) => {
    return store.deleteNotebook(notebookId);
  });

  // 7. Export a note as a .md file to the user's computer
  ipcMain.handle('notes:export', async (_event, note) => {
    if (!mainWindow) return { success: false };

    const sanitizedTitle = (note.title || 'untitled')
      .replace(/[^a-zA-Z0-9-_\s]/g, '')
      .trim() || 'note';

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Note as Markdown',
      defaultPath: `${sanitizedTitle}.md`,
      filters: [{ name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      const content = `# ${note.title}\n\n${note.body || ''}`;
      fs.writeFileSync(filePath, content, 'utf8');
      return { success: true, filePath };
    } catch (err) {
      console.error('Failed to export note:', err);
      return { success: false, error: err.message };
    }
  });
}

/**
 * App Lifecycle Events
 */
app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  // On macOS, recreate window when dock icon is clicked and no windows exist
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
