/**
 * store.js - Simple local JSON storage for Noted
 *
 * This file handles reading and writing notebooks and notes to a local
 * JSON file on the user's computer. It provides easy-to-understand CRUD
 * (Create, Read, Update, Delete) methods.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Default initial data when the user runs the app for the very first time
const INITIAL_DATA = {
  notebooks: [
    { id: 'nb-personal', name: 'Personal 📝', createdAt: new Date().toISOString() },
    { id: 'nb-work', name: 'Work & Projects 💼', createdAt: new Date().toISOString() },
    { id: 'nb-ideas', name: 'Ideas & Learning 💡', createdAt: new Date().toISOString() }
  ],
  notes: [
    {
      id: 'note-welcome',
      notebookId: 'nb-personal',
      title: 'Welcome to Noted! 👋',
      body: `# Welcome to Noted! 👋

Noted is a simple, lightweight note-taking app inspired by **Joplin**.

### 🚀 Key Features
- **Notebooks & Organization**: Categorize notes into folders.
- **Simultaneous Two-Way Editing**:
  - Type in the **Markdown** pane, and the formatted text updates live.
  - Or type directly in the **Visual Text** pane, and the Markdown generates simultaneously!
- **Auto-Save**: Changes save automatically as you write.
- **Fast Search**: Instantly find notes by keyword in title or content.
- **Export**: Export any note to a standard \`.md\` file with one click.
- **Offline & Local-first**: Your notes stay safely on your computer.

### ⌨️ Quick Tips
- Click **+ New Note** to create a blank note in the current notebook.
- Use the formatting buttons in the toolbar to format text.
- Click **📖 Guide** in the toolbar for a quick Markdown syntax reference.
- Switch between **Edit**, **Split**, and **Preview** modes using the top-right buttons.

Enjoy writing! 🎉`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

/**
 * Storage Class
 */
class Store {
  constructor(customFilePath = null) {
    this.filePath = customFilePath;
  }

  // Get the file path where notes data is saved
  getFilePath() {
    if (this.filePath) return this.filePath;

    // In production Electron, save to the user's application data folder
    try {
      const { app } = require('electron');
      if (app && app.getPath) {
        return path.join(app.getPath('userData'), 'noted-data.json');
      }
    } catch {
      // Fallback for tests or non-electron environments
    }

    return path.join(process.cwd(), 'noted-data.json');
  }

  // Load all notebooks and notes from disk
  load() {
    const targetPath = this.getFilePath();

    try {
      if (!fs.existsSync(targetPath)) {
        // First run: save and return starter data
        this.save(INITIAL_DATA);
        return JSON.parse(JSON.stringify(INITIAL_DATA));
      }

      const raw = fs.readFileSync(targetPath, 'utf8');
      const parsed = JSON.parse(raw);

      // Filter out older starter guides so personal notes stay clean
      const cleanedNotes = (Array.isArray(parsed.notes) ? parsed.notes : []).filter(
        (n) => n.id !== 'note-architecture' && n.id !== 'note-markdown-guide'
      );

      return {
        notebooks: Array.isArray(parsed.notebooks) ? parsed.notebooks : [],
        notes: cleanedNotes
      };
    } catch (err) {
      console.error('Error reading storage file, returning fallback:', err);
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  }

  // Save the entire data state to disk
  save(data) {
    const targetPath = this.getFilePath();
    try {
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (err) {
      console.error('Failed to write storage file:', err);
      return false;
    }
  }

  // Save (create or update) a single note
  saveNote(noteData) {
    const data = this.load();
    const now = new Date().toISOString();

    if (!noteData.id) {
      // Create new note
      const newNote = {
        id: 'note-' + crypto.randomUUID(),
        notebookId: noteData.notebookId || (data.notebooks[0] ? data.notebooks[0].id : 'default'),
        title: noteData.title || 'Untitled Note',
        body: noteData.body || '',
        createdAt: now,
        updatedAt: now
      };
      data.notes.unshift(newNote);
      this.save(data);
      return newNote;
    }

    // Update existing note
    const index = data.notes.findIndex((n) => n.id === noteData.id);
    if (index !== -1) {
      data.notes[index] = {
        ...data.notes[index],
        title: noteData.title !== undefined ? noteData.title : data.notes[index].title,
        body: noteData.body !== undefined ? noteData.body : data.notes[index].body,
        notebookId: noteData.notebookId || data.notes[index].notebookId,
        updatedAt: now
      };
      this.save(data);
      return data.notes[index];
    } else {
      // If note had an ID but was not found, insert it
      const newNote = {
        ...noteData,
        createdAt: noteData.createdAt || now,
        updatedAt: now
      };
      data.notes.unshift(newNote);
      this.save(data);
      return newNote;
    }
  }

  // Delete a note by its ID
  deleteNote(noteId) {
    const data = this.load();
    data.notes = data.notes.filter((n) => n.id !== noteId);
    this.save(data);
    return true;
  }

  // Create a new notebook
  createNotebook(name) {
    const data = this.load();
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('Notebook name cannot be empty');

    const newNotebook = {
      id: 'nb-' + crypto.randomUUID(),
      name: trimmed,
      createdAt: new Date().toISOString()
    };
    data.notebooks.push(newNotebook);
    this.save(data);
    return newNotebook;
  }

  // Rename an existing notebook
  renameNotebook(notebookId, newName) {
    const data = this.load();
    const trimmed = (newName || '').trim();
    if (!trimmed) throw new Error('Notebook name cannot be empty');

    const nb = data.notebooks.find((n) => n.id === notebookId);
    if (!nb) throw new Error('Notebook not found');

    nb.name = trimmed;
    this.save(data);
    return nb;
  }

  // Delete a notebook and reassign or delete its notes
  deleteNotebook(notebookId) {
    const data = this.load();
    if (data.notebooks.length <= 1) {
      throw new Error('You must keep at least one notebook');
    }

    // Remove the notebook
    data.notebooks = data.notebooks.filter((n) => n.id !== notebookId);

    // Reassign orphaned notes to the first available notebook
    const fallbackId = data.notebooks[0].id;
    data.notes.forEach((note) => {
      if (note.notebookId === notebookId) {
        note.notebookId = fallbackId;
      }
    });

    this.save(data);
    return { success: true, fallbackNotebookId: fallbackId };
  }
}

// Export singleton instance and class
const defaultStore = new Store();
module.exports = {
  Store,
  store: defaultStore
};
