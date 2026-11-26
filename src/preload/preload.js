/**
 * preload.js - Secure Bridge between Node.js and Renderer
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notedAPI', {
  // Load entire store data
  loadData: () => ipcRenderer.invoke('notes:load'),

  // Save / update note
  saveNote: (noteData) => ipcRenderer.invoke('notes:save-note', noteData),

  // Toggle pin / favorite
  togglePin: (noteId) => ipcRenderer.invoke('notes:toggle-pin', noteId),

  // Duplicate note
  duplicateNote: (noteId) => ipcRenderer.invoke('notes:duplicate', noteId),

  // Delete note (soft-delete to trash by default, or permanent)
  deleteNote: (noteId, permanent = false) => ipcRenderer.invoke('notes:delete-note', { noteId, permanent }),

  // Restore note from trash
  restoreNote: (noteId) => ipcRenderer.invoke('notes:restore', noteId),

  // Empty trash
  emptyTrash: () => ipcRenderer.invoke('notes:empty-trash'),

  // Notebook management
  createNotebook: (name) => ipcRenderer.invoke('notebooks:create', name),
  renameNotebook: (id, name) => ipcRenderer.invoke('notebooks:rename', { id, name }),
  deleteNotebook: (id) => ipcRenderer.invoke('notebooks:delete', id),

  // Save settings (theme, sort, etc.)
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Multi-format export (Markdown, HTML, Plain Text)
  exportNote: (note, format = 'md', htmlContent = '') =>
    ipcRenderer.invoke('notes:export', { note, format, htmlContent }),

  // Photo / Image uploads
  pickImage: () => ipcRenderer.invoke('images:pick-and-upload'),
  saveImage: (payload) => ipcRenderer.invoke('images:save-data', payload)
});
