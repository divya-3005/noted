# 📓 Noted

> A fast, elegant, local-first Markdown desktop workspace engineered for focused thinking and writing.

---

## 🌟 Key Features

- 📁 **Notebooks & Organization**: Categorize notes into workspaces with seamless drag-and-drop hierarchy.
- ⭐ **Pins & Starred Notes**: Pin high-priority notes to keep them anchored at the top of your list.
- 🏷️ **Dynamic Tags**: Auto-detects `#tags` inside your text (e.g. `#roadmap`, `#dev`, `#meeting`) and generates interactive sidebar tag filters.
- ⚡ **Simultaneous Two-Way Editing**:
  - Write raw Markdown on the left with live preview on the right.
  - Or edit directly in the formatted visual view while Markdown generates simultaneously.
- 📑 **Table of Contents (Outline Drawer)**: Automatically parses headings (`H1`, `H2`, `H3`) to generate a clickable navigation tree for long documents.
- 🌙 **Dark & Light Mode**: Clean, high-contrast themes inspired by Linear and Obsidian with instant toggle.
- ⛶ **Zen / Focus Mode**: Collapse sidebar panels with `Cmd+Shift+F` for a centered, distraction-free writing environment.
- 🗑️ **Trash & Safe Recovery**: Soft-delete safeguards notes against accidental data loss, with one-click restore and permanent purge controls.
- 📤 **Multi-Format Export**: Export any note as standard Markdown (`.md`), standalone styled HTML (`.html`), plain text (`.txt`), or print to PDF.
- 📊 **Live Analytics & Reading Time**: Real-time word count, character count, paragraph counter, and estimated reading time.
- ⌨️ **Keyboard-Driven Workflow**: Full shortcut mapping for navigation, formatting, note creation, and search.
- 🔒 **100% Local-First & Private**: Your data is stored on-device in atomic JSON files without telemetry or vendor lock-in.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Cmd / Ctrl + N` | New Note |
| `Cmd / Ctrl + Shift + N` | New Notebook |
| `Cmd / Ctrl + F` | Search notes & tags |
| `Cmd / Ctrl + Shift + P` | Pin / Star note |
| `Cmd / Ctrl + D` | Duplicate note |
| `Cmd / Ctrl + Shift + F` | Toggle Zen / Focus Mode |
| `Cmd / Ctrl + Shift + O` | Toggle Table of Contents Outline |
| `Cmd / Ctrl + 1 / 2 / 3` | Switch between Edit, Split, and Preview |
| `?` | Open Keyboard Shortcuts cheatsheet |
| `Esc` | Close open modals or clear search |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or later recommended)
- npm

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/divya-3005/noted.git
cd noted

# Install dependencies
npm install

# Run the app locally
npm start
```

### Running Tests

```bash
npm test
```

### Building for Distribution (macOS DMG)

```bash
npm run dist
```

---

## 📂 Architecture

```
noted/
├── package.json              # App configuration, build scripts & metadata
├── src/
│   ├── main/                 # Electron Main Process (Node.js)
│   │   ├── main.js           # Window lifecycle, window manager & IPC handlers
│   │   ├── store.js          # Atomic local storage engine with tags, pins & trash
│   │   └── store.test.js     # Storage engine test suite
│   │
│   ├── preload/              # Security Bridge
│   │   └── preload.js        # Safe IPC exposure via contextBridge
│   │
│   └── renderer/             # Frontend UI (Chromium)
│       ├── index.html        # 3-column Joplin/Obsidian layout
│       ├── styles.css        # Theme variables (Light/Dark), zen mode & outline styles
│       ├── app.js            # Frontend reactive state, tags, outline & events
│       └── vendor/
│           └── marked.min.js # Zero-dependency Markdown parser
└── docs/
    └── MARKDOWN_GUIDE.md     # Syntax reference
```

---

## 📄 License
MIT
