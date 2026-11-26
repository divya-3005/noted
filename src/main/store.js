const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INITIAL_DATA = {
  settings: {
    theme: 'light',
    sortBy: 'updated',
    focusMode: false
  },
  notebooks: [
    { id: 'nb-eng', name: 'Engineering', createdAt: new Date().toISOString() },
    { id: 'nb-personal', name: 'Personal', createdAt: new Date().toISOString() },
    { id: 'nb-archive', name: 'Archive', createdAt: new Date().toISOString() }
  ],
  notes: [
    {
      id: 'note-roadmap',
      notebookId: 'nb-eng',
      title: 'Product Roadmap & Architecture',
      body: `# Product Roadmap & Architecture #dev #roadmap

Local-first desktop workspace notes, design decisions, and sprint milestones.

### Current Priorities
- [x] High-performance Markdown rendering pipeline
- [x] Dynamic tag indexing and real-time filtering
- [x] Document outline tree navigation
- [ ] Multi-window workspace support

### Architecture Principles
- **Local Persistence**: State serializes atomically to JSON on disk without remote roundtrips.
- **Data Portability**: Clean CommonMark markdown output with zero proprietary metadata locks.
- **Instant Search**: In-memory inverted index across note titles, tags, and document bodies.

### System Shortcuts
- \`⌘N\` New note
- \`⌘F\` Search notes & tags
- \`⌘⇧F\` Zen focus mode
- \`⌘⇧P\` Pin note to top
- \`⌘1 / ⌘2 / ⌘3\` Switch between Edit, Split, and Preview`,
      isPinned: true,
      isTrash: false,
      tags: ['dev', 'roadmap'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'note-markdown-guide',
      notebookId: 'nb-personal',
      title: 'Markdown Guide & Reference',
      body: `# Markdown Guide & Reference #guide #reference

Comprehensive guide to Markdown formatting, Tree References, and Photos in Noted.

### Text Formatting
- **Bold text** with \`**bold**\`
- *Italic text* with \`*italic*\`
- ~~Strikethrough~~ with \`~~text~~\`
- \`Inline code\` with backticks
- > Blockquotes with \`> quote\`

### Headings & Tree Outlines
Headings create a tree outline for quick navigation:
# Heading 1
## Heading 2
### Heading 3

### Referencing Other Notes & Sections
You can reference any note or a specific part/heading of another note:
- **Full Note Reference**: [[Product Roadmap & Architecture]]
- **Section / Part Reference**: [[Product Roadmap & Architecture#Current Priorities]]
- **Custom Label Reference**: [[Product Roadmap & Architecture#System Shortcuts|View Shortcuts]]

Clicking any reference link instantly opens that note and smoothly scrolls to that exact section!
Use the **Reference** button in the toolbar to pick any note or section from the tree.

### Uploading Photos from Mac
- **Toolbar**: Click the 📷 **Photo** button to select any image from your Mac.
- **Drag & Drop**: Drag an image file from Finder and drop it directly into the editor.
- **Paste Screenshot**: Press \`⌘V\` to paste a copied screenshot or photo.
Markdown format:
\`\`\`markdown
![Photo Description](path-or-data-uri)
\`\`\`

### Interactive Task Checklists
- [x] Download Noted
- [x] Read this Markdown guide
- [ ] Upload a photo from Mac
- [ ] Create a section reference link

### Tables & Code Blocks
| Feature | Syntax | Description |
| :--- | :---: | :--- |
| Section Link | \`[[Note#Heading]]\` | Links to a specific part |
| Photo Upload | \`![Alt](url)\` | Upload from Mac |
| Checklists | \`- [ ]\` | Interactive tasks |

\`\`\`javascript
function calculateScore(items) {
  return items.filter(i => i.done).length;
}
\`\`\`

---
*Tip: Click the Outline button or expand notebooks in the sidebar tree to see heading hierarchies!*`,
      isPinned: true,
      isTrash: false,
      tags: ['guide', 'reference'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
};

function extractTags(text) {
  if (!text) return [];
  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_\-]+)(?!\w)/g;
  const tags = new Set();
  let match;
  while ((match = tagRegex.exec(text)) !== null) {
    const candidate = match[1].toLowerCase();
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
    } catch {}
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

      // Clean legacy AI tutorial content or emoji pollution from older runs
      let notebooks = (Array.isArray(parsed.notebooks) ? parsed.notebooks : []).map((nb) => ({
        ...nb,
        name: (nb.name || '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() || 'Notes'
      }));

      if (notebooks.length === 0) {
        notebooks = INITIAL_DATA.notebooks;
      }

      let notes = (Array.isArray(parsed.notes) ? parsed.notes : [])
        .filter((n) => !n.body || (!n.body.includes('Beginner-friendly') && !n.body.includes('3 Core Concepts: Main Process')))
        .map((n) => {
          if (n.id === 'note-welcome' && (n.body.includes('Joplin') || n.body.includes('Enjoy writing'))) {
            return INITIAL_DATA.notes[0];
          }
          return {
            ...n,
            title: (n.title || 'Untitled Note').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim(),
            isPinned: Boolean(n.isPinned),
            isTrash: Boolean(n.isTrash),
            tags: Array.isArray(n.tags) ? n.tags : extractTags(`${n.title || ''} ${n.body || ''}`)
          };
        });

      if (notes.length === 0) {
        notes = INITIAL_DATA.notes;
      } else {
        const hasGuide = notes.some((n) => n.id === 'note-markdown-guide' || n.title.includes('Markdown Guide'));
        if (!hasGuide) {
          notes.push(INITIAL_DATA.notes[1]);
        }
      }

      const sanitizedData = {
        settings: parsed.settings || { theme: 'light', sortBy: 'updated', focusMode: false },
        notebooks,
        notes
      };

      // Save sanitized state so user's disk file is permanently cleaned
      this.save(sanitizedData);
      return sanitizedData;
    } catch (err) {
      console.error('Storage read error, using fallback:', err);
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
      console.error('Storage write error:', err);
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
    }

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
    const before = data.notes.length;
    data.notes = data.notes.filter((n) => !n.isTrash);
    this.save(data);
    return before - data.notes.length;
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
