/**
 * preload.js - Secure Bridge between Node.js and Renderer
 *
 * In modern Electron applications, the web page (index.html/app.js) is isolated
 * from Node.js for security.
 *
 * This preload script runs in a privileged context and uses `contextBridge` to
 * safely expose a restricted set of functions to `window.notedAPI`.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notedAPI', {
  // Load initial data (notebooks and notes)
  loadData: () => ipcRenderer.invoke('notes:load'),

  // Save or update a note
  saveNote: (noteData) => ipcRenderer.invoke('notes:save-note', noteData),

  // Delete a note by id
  deleteNote: (noteId) => ipcRenderer.invoke('notes:delete-note', noteId),

  // Notebook management
  createNotebook: (name) => ipcRenderer.invoke('notebooks:create', name),
  renameNotebook: (id, name) => ipcRenderer.invoke('notebooks:rename', { id, name }),
  deleteNotebook: (id) => ipcRenderer.invoke('notebooks:delete', id),

  // Export note as a .md file
  exportNote: (note) => ipcRenderer.invoke('notes:export', note)
});
