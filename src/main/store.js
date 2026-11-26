/**
 * store.js - Local-first JSON storage engine for Noted
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INITIAL_DATA = {
  settings: {
    theme: 'light',
    sortBy: 'updated', // 'updated', 'created', 'title'
    focusMode: false
  },
  notebooks: [
    { id: 'nb-projects', name: 'Projects 🚀', createdAt: new Date().toISOString() },
    { id: 'nb-personal', name: 'Personal 📓', createdAt: new Date().toISOString() },
    { id: 'nb-reference', name: 'Reference & Docs 📚', createdAt: new Date().toISOString() }
  ],
  notes: [
    {
      id: 'note-welcome',
      notebookId: 'nb-personal',
      title: 'Welcome to Noted 📓',
      body: `# Welcome to Noted 📓

Noted is a fast, local-first Markdown workspace engineered for focused thinking and writing.

### ⚡ Highlights & Workflow
- **Pins & Favorites**: Star critical notes to keep them pinned at the top.
- **Dynamic Tags**: Use \`#tags\` anywhere in your text (e.g. #productivity, #roadmap, #ideas) to auto-categorize notes.
- **Dual Live Sync**: Switch between Markdown view, Visual Text view, or Split mode.
- **Table of Contents**: Automatic Outline generated from your headings for swift navigation.
- **Trash & Recovery**: Soft-delete prevents accidental data loss; restore anytime.
- **Dark & Light Mode**: Built-in sleek dark theme for late-night flow.
- **Universal Export**: Export clean Markdown, standalone styled HTML, or plain text.

---

### ⌨️ Useful Keyboard Shortcuts
- \`Cmd / Ctrl + N\`: New Note
- \`Cmd / Ctrl + Shift + N\`: New Notebook
- \`Cmd / Ctrl + F\`: Instant Search
- \`Cmd / Ctrl + Shift + F\`: Zen / Focus Mode
- \`Cmd / Ctrl + D\`: Duplicate Note
- \`Cmd / Ctrl + 1 / 2 / 3\`: Toggle Edit, Split, Preview modes
- \`?\`: Open Keyboard Shortcuts cheatsheet

Enjoy your clean workspace.`,
      isPinned: true,
      isTrash: false,
      tags: ['productivity', 'guide'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'note-architecture',
      notebookId: 'nb-projects',
      title: 'Product Architecture & Roadmap #architecture #roadmap',
      body: `# Product Architecture & Roadmap #architecture #roadmap

Overview of core system decisions and upcoming development milestones.

## 1. Local-First Principles
- Zero network reliance for reading or writing notes.
- Direct JSON persistence with atomic disk writes.
- Plain text portability via standard Markdown specifications.

## 2. Core Pillars
| Pillar | Focus | Target |
| :--- | :--- | :--- |
| **Speed** | Instant startup & instant search | < 100ms |
| **Privacy** | 100% on-device data storage | Local disk |
| **Simplicity** | Clean 3-column layout | Minimalist |

## 3. Implementation Checklist
- [x] Local JSON storage engine
- [x] Real-time two-way Markdown preview
- [x] Tag extraction and sidebar filtering
- [x] Document outline navigation
- [ ] Cloud sync provider extensions`,
      isPinned: false,
      isTrash: false,
      tags: ['architecture', 'roadmap'],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 1800000).toISOString()
    }
  ]
};

/**
 * Extracts hashtag words from Markdown text
 * Matches #word while avoiding headings (# Title)
 */
function extractTags(text) {
  if (!text) return [];
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)(?!\w)/g;
  const tags = new Set();
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const candidate = match[1].toLowerCase();
    // Exclude single numbers or hex color fragments
    if (!/^\d+$/.test(candidate)) {
      tags.add(candidate);
    }
  }
  return Array.from(tags);
}

class Store {
  constructor(customFilePath = null) {
    this.filePath = customFilePath;
  }

  getFilePath() {
    if (this.filePath) return this.filePath;
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

  load() {
    const targetPath = this.getFilePath();
    try {
      if (!fs.existsSync(targetPath)) {
        this.save(INITIAL_DATA);
        return JSON.parse(JSON.stringify(INITIAL_DATA));
      }

      const raw = fs.readFileSync(targetPath, 'utf8');
      const parsed = JSON.parse(raw);

      const notes = (Array.isArray(parsed.notes) ? parsed.notes : []).map((n) => ({
        ...n,
        isPinned: Boolean(n.isPinned),
        isTrash: Boolean(n.isTrash),
        tags: Array.isArray(n.tags) ? n.tags : extractTags(`${n.title || ''} ${n.body || ''}`)
      }));

      return {
        settings: parsed.settings || { theme: 'light', sortBy: 'updated', focusMode: false },
        notebooks: Array.isArray(parsed.notebooks) ? parsed.notebooks : [],
        notes
      };
    } catch (err) {
      console.error('Error reading storage file, returning fallback:', err);
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
  }

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

  saveNote(noteData) {
    const data = this.load();
    const now = new Date().toISOString();
    const bodyTags = extractTags(`${noteData.title || ''} ${noteData.body || ''}`);
    const mergedTags = Array.from(new Set([...(noteData.tags || []), ...bodyTags]));

    if (!noteData.id) {
      const newNote = {
        id: 'note-' + crypto.randomUUID(),
        notebookId: noteData.notebookId || (data.notebooks[0] ? data.notebooks[0].id : 'default'),
        title: noteData.title || 'Untitled Note',
        body: noteData.body || '',
        isPinned: Boolean(noteData.isPinned),
        isTrash: false,
        tags: mergedTags,
        createdAt: now,
        updatedAt: now
      };
      data.notes.unshift(newNote);
      this.save(data);
      return newNote;
    }

    const index = data.notes.findIndex((n) => n.id === noteData.id);
    if (index !== -1) {
      const existing = data.notes[index];
      data.notes[index] = {
        ...existing,
        title: noteData.title !== undefined ? noteData.title : existing.title,
        body: noteData.body !== undefined ? noteData.body : existing.body,
        notebookId: noteData.notebookId || existing.notebookId,
        isPinned: noteData.isPinned !== undefined ? Boolean(noteData.isPinned) : existing.isPinned,
        isTrash: noteData.isTrash !== undefined ? Boolean(noteData.isTrash) : existing.isTrash,
        tags: noteData.tags !== undefined ? noteData.tags : mergedTags,
        updatedAt: now
      };
      this.save(data);
      return data.notes[index];
    } else {
      const newNote = {
        ...noteData,
        isPinned: Boolean(noteData.isPinned),
        isTrash: Boolean(noteData.isTrash),
        tags: mergedTags,
        createdAt: noteData.createdAt || now,
        updatedAt: now
      };
      data.notes.unshift(newNote);
      this.save(data);
      return newNote;
    }
  }

  togglePin(noteId) {
    const data = this.load();
    const note = data.notes.find((n) => n.id === noteId);
    if (!note) return null;
    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toISOString();
    this.save(data);
    return note;
  }

  duplicateNote(noteId) {
    const data = this.load();
    const note = data.notes.find((n) => n.id === noteId);
    if (!note) return null;

    const now = new Date().toISOString();
    const cloned = {
      ...note,
      id: 'note-' + crypto.randomUUID(),
      title: `${note.title || 'Untitled'} (Copy)`,
      isPinned: false,
      createdAt: now,
      updatedAt: now
    };
    data.notes.unshift(cloned);
    this.save(data);
    return cloned;
  }

  deleteNote(noteId, permanent = false) {
    const data = this.load();
    const note = data.notes.find((n) => n.id === noteId);
    if (!note) return false;

    if (permanent || note.isTrash) {
      data.notes = data.notes.filter((n) => n.id !== noteId);
    } else {
      note.isTrash = true;
      note.deletedAt = new Date().toISOString();
    }
    this.save(data);
    return true;
  }

  restoreNote(noteId) {
    const data = this.load();
    const note = data.notes.find((n) => n.id === noteId);
    if (!note) return false;

    note.isTrash = false;
    delete note.deletedAt;
    note.updatedAt = new Date().toISOString();
    this.save(data);
    return note;
  }

  emptyTrash() {
    const data = this.load();
    const countBefore = data.notes.length;
    data.notes = data.notes.filter((n) => !n.isTrash);
    this.save(data);
    return countBefore - data.notes.length;
  }

  saveSettings(settings) {
    const data = this.load();
    data.settings = { ...(data.settings || {}), ...settings };
    this.save(data);
    return data.settings;
  }

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

  deleteNotebook(notebookId) {
    const data = this.load();
    if (data.notebooks.length <= 1) {
      throw new Error('You must keep at least one notebook');
    }

    data.notebooks = data.notebooks.filter((n) => n.id !== notebookId);
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

const defaultStore = new Store();
module.exports = {
  Store,
  store: defaultStore,
  extractTags
};
