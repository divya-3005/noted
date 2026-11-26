/**
 * main.js - Electron Main Process for Noted
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { store } = require('./store');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 540,
    title: 'Noted',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    if (process.platform === 'darwin' && app.dock) {
      app.dock.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpcHandlers() {
  // Load state (notebooks, notes, settings)
  ipcMain.handle('notes:load', async () => {
    return store.load();
  });

  // Save or update note
  ipcMain.handle('notes:save-note', async (_event, noteData) => {
    return store.saveNote(noteData);
  });

  // Toggle pin/favorite
  ipcMain.handle('notes:toggle-pin', async (_event, noteId) => {
    return store.togglePin(noteId);
  });

  // Duplicate note
  ipcMain.handle('notes:duplicate', async (_event, noteId) => {
    return store.duplicateNote(noteId);
  });

  // Delete note (soft-delete to trash by default, or permanent)
  ipcMain.handle('notes:delete-note', async (_event, { noteId, permanent }) => {
    return store.deleteNote(noteId, permanent);
  });

  // Restore note from trash
  ipcMain.handle('notes:restore', async (_event, noteId) => {
    return store.restoreNote(noteId);
  });

  // Empty trash
  ipcMain.handle('notes:empty-trash', async () => {
    return store.emptyTrash();
  });

  // Notebook management
  ipcMain.handle('notebooks:create', async (_event, name) => {
    return store.createNotebook(name);
  });

  ipcMain.handle('notebooks:rename', async (_event, { id, name }) => {
    return store.renameNotebook(id, name);
  });

  ipcMain.handle('notebooks:delete', async (_event, notebookId) => {
    return store.deleteNotebook(notebookId);
  });

  // Save settings (theme, sort preference, etc.)
  ipcMain.handle('settings:save', async (_event, settings) => {
    return store.saveSettings(settings);
  });

  // Pick and upload image from Mac
  ipcMain.handle('images:pick-and-upload', async () => {
    if (!mainWindow) return { canceled: true };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Photo from Mac',
      buttonLabel: 'Insert Photo',
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic', 'tiff', 'bmp'] }
      ]
    });

    if (canceled || !filePaths || filePaths.length === 0) {
      return { canceled: true };
    }

    const sourcePath = filePaths[0];
    const ext = path.extname(sourcePath).toLowerCase();
    const fileName = path.basename(sourcePath);

    const attachmentsDir = path.join(app.getPath('userData'), 'attachments');
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    const uniqueName = `img_${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destPath = path.join(attachmentsDir, uniqueName);
    fs.copyFileSync(sourcePath, destPath);

    const fileBuffer = fs.readFileSync(sourcePath);
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.bmp': 'image/bmp'
    };
    const mime = mimeMap[ext] || 'image/png';
    const dataUrl = `data:${mime};base64,${fileBuffer.toString('base64')}`;

    return {
      canceled: false,
      fileName,
      filePath: destPath,
      dataUrl,
      markdown: `![${path.parse(fileName).name}](${dataUrl})`
    };
  });

  // Save image data from paste or drag-and-drop
  ipcMain.handle('images:save-data', async (_event, { base64Data, mimeType, name }) => {
    try {
      const attachmentsDir = path.join(app.getPath('userData'), 'attachments');
      if (!fs.existsSync(attachmentsDir)) {
        fs.mkdirSync(attachmentsDir, { recursive: true });
      }
      const ext = mimeType === 'image/jpeg' ? '.jpg' : mimeType === 'image/gif' ? '.gif' : '.png';
      const fileName = `img_${Date.now()}${ext}`;
      const destPath = path.join(attachmentsDir, fileName);
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(destPath, buffer);

      const dataUrl = `data:${mimeType || 'image/png'};base64,${base64Data}`;
      return {
        success: true,
        fileName,
        filePath: destPath,
        dataUrl,
        markdown: `![${name || 'Photo'}](${dataUrl})`
      };
    } catch (err) {
      console.error('Failed to save image:', err);
      return { success: false, error: err.message };
    }
  });

  // Multi-format export (Markdown, HTML, Plain Text)
  ipcMain.handle('notes:export', async (_event, { note, format = 'md', htmlContent = '' }) => {
    if (!mainWindow) return { success: false };

    const sanitizedTitle = (note.title || 'untitled')
      .replace(/[^a-zA-Z0-9-_\s]/g, '')
      .trim() || 'note';

    let defaultExt = 'md';
    let filterName = 'Markdown Document';
    let extensions = ['md', 'markdown'];

    if (format === 'html') {
      defaultExt = 'html';
      filterName = 'HTML Webpage';
      extensions = ['html', 'htm'];
    } else if (format === 'txt') {
      defaultExt = 'txt';
      filterName = 'Plain Text File';
      extensions = ['txt'];
    }

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: `Export Note as ${filterName}`,
      defaultPath: `${sanitizedTitle}.${defaultExt}`,
      filters: [{ name: filterName, extensions }, { name: 'All Files', extensions: ['*'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      let fileOutput = '';
      if (format === 'html') {
        fileOutput = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeXml(note.title || 'Untitled Note')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; }
    h1, h2, h3 { color: #0f172a; margin-top: 1.5em; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
    pre { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #6366f1; margin: 0; padding-left: 16px; color: #475569; font-style: italic; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; }
    .meta { font-size: 0.85em; color: #64748b; margin-bottom: 2em; border-bottom: 1px solid #e2e8f0; padding-bottom: 1em; }
  </style>
</head>
<body>
  <h1>${escapeXml(note.title || 'Untitled Note')}</h1>
  <div class="meta">Exported from Noted · Updated on ${new Date(note.updatedAt || Date.now()).toLocaleDateString()}</div>
  <div class="content">${htmlContent || ''}</div>
</body>
</html>`;
      } else if (format === 'txt') {
        fileOutput = `${note.title || 'Untitled'}\n${'='.repeat(40)}\n\n${(note.body || '').replace(/#|\*|`|~/g, '')}`;
      } else {
        fileOutput = `# ${note.title || 'Untitled'}\n\n${note.body || ''}`;
      }

      fs.writeFileSync(filePath, fileOutput, 'utf8');
      return { success: true, filePath };
    } catch (err) {
      console.error('Failed to export note:', err);
      return { success: false, error: err.message };
    }
  });
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

app.whenReady().then(() => {
  setupIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
