# 📓 Noted

> A simple, beginner-friendly Markdown note-taking desktop app built with **Electron**, inspired by **[Joplin](https://github.com/laurent22/joplin)**.

---

## 🌟 Why Noted?

[Joplin](https://github.com/laurent22/joplin) is one of the best open-source note-taking applications in the world. However, its codebase is a massive monorepo with dozens of packages, native compilation, and complex build scripts—which can be overwhelming if you are a beginner trying to learn how an Electron app works.

**Noted** distills Joplin's core features into a clean, minimal, and beautifully organized codebase:
- **Zero build pipelines**: No Webpack, Vite, Babel, or complex bundlers required.
- **Easy to read & modify**: Every file is structured simply with detailed comments.
- **Joplin-style 3-Column Layout**: Notebooks sidebar, Notes list, and Markdown Editor/Preview.
- **Safe & Modern Electron**: Built with standard security best practices (`contextIsolation`, `preload`, and IPC).

---

## ✨ Features

- 📁 **Notebooks & Organization**: Create, rename, and delete notebooks to keep your notes organized.
- ⚡ **Simultaneous Two-Way Editing**:
  - Type raw Markdown on the left, and the Visual Text preview updates live.
  - Or type directly in the Visual Text pane on the right, and Markdown generates simultaneously!
- 📖 **Markdown Guide**: Built-in toolbar guide modal and documentation in `docs/MARKDOWN_GUIDE.md`.
- 🛠️ **Formatting Toolbar**: One-click buttons to format headings, bold, italic, checklists, quotes, and code.
- 🔍 **Instant Search**: Search across note titles and content with real-time filtering.
- 💾 **Auto-Save**: Notes save automatically as you type to a local JSON file.
- 📤 **Export as Markdown**: Save any note directly to your computer as a `.md` file.
- 🧪 **Built-in Unit Tests**: Run `npm test` to test store operations.

---

## 📂 Project Structure

The project structure is clean and minimal:

```
noted/
├── package.json              # App metadata, dependencies, and start scripts
├── .gitignore                # Files excluded from git
├── README.md                 # Project documentation
├── docs/
│   └── MARKDOWN_GUIDE.md     # Standalone Markdown guide and reference
└── src/
    ├── main/                 # Electron Main Process (Node.js)
    │   ├── main.js           # Window creation, app lifecycle, and IPC handlers
    │   ├── store.js          # Handles saving/reading notes from a local JSON file
    │   └── store.test.js     # Unit tests for the storage system
    │
    ├── preload/              # Security Bridge
    │   └── preload.js        # Safely exposes APIs to the renderer via contextBridge
    │
    └── renderer/             # Frontend Web UI (Chromium)
        ├── index.html        # Clean, semantic 3-column Joplin-style layout
        ├── styles.css        # Modern styles with CSS variables and dual panes
        ├── app.js            # Two-way sync, state management & auto-save
        └── vendor/
            └── marked.min.js # Standalone, zero-dependency Markdown parser
```

---

## 🚀 Getting Started

### 1. Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (version 16 or newer).

Check your version in a terminal:
```bash
node -v
npm -v
```

### 2. Clone the Repository
```bash
git clone https://github.com/divya-3005/noted.git
cd noted
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Application
```bash
npm start
```

### 5. Run the Tests
```bash
npm test
```

---

## 💡 Where Your Notes Are Saved

When running in Electron, your notes and notebooks are automatically saved to:
- **macOS**: `~/Library/Application Support/noted/noted-data.json`
- **Windows**: `%APPDATA%/noted/noted-data.json`
- **Linux**: `~/.config/noted/noted-data.json`

This file is standard JSON. You can open, inspect, or back it up at any time.

---

## 🛠️ Ideas for Beginners to Practice & Extend

Here are some fun features you can try adding to practice:
1. **Dark Mode Toggle**: Add a button to switch between dark and light themes using CSS variables.
2. **Tags System**: Add tags to notes (e.g. `#work`, `#todo`) and filter notes by tag.
3. **Pin Notes**: Add a "Pin to top" button so important notes stay at the top of the list.
4. **Keyboard Shortcuts**: Add `Ctrl/Cmd + N` to create a note, `Ctrl/Cmd + S` to force save.
5. **Trash / Archive**: Create a "Trash" notebook instead of permanently deleting notes.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
