/**
 * app.js - Frontend Application Logic for Noted
 *
 * This script runs in the renderer (Chromium browser window).
 * It communicates with the backend via `window.notedAPI` which was safely
 * exposed by `src/preload/preload.js`.
 *
 * Core Features:
 * 1. Application State & Notebook Management
 * 2. Simultaneous Two-Way Live Editing:
 *    - Type in Markdown textarea -> updates Visual Text preview live.
 *    - Type directly in Visual Text pane -> converts to Markdown live.
 * 3. Interactive Checkboxes in rendered task lists
 * 4. Debounced Auto-saving to local JSON
 * 5. Search, Filter, and Export
 */

// ============================================================================
// 1. STATE MANAGEMENT
// ============================================================================
const state = {
  notebooks: [],
  notes: [],
  selectedNotebookId: 'all', // 'all' or notebook ID
  selectedNoteId: null,
  searchQuery: '',
  viewMode: 'split', // 'split', 'edit', or 'preview'
  saveTimeout: null,
  modalMode: null, // 'create' or 'rename'
  targetNotebookId: null
};

// Flag to prevent feedback loop during two-way sync
let isSyncing = false;

// ============================================================================
// 2. DOM ELEMENT REFERENCES
// ============================================================================
const dom = {
  // Sidebar & Search
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  btnAddNotebook: document.getElementById('btn-add-notebook'),
  notebooksList: document.getElementById('notebooks-list'),
  countAll: document.getElementById('count-all'),

  // Notes List Column
  activeNotebookTitle: document.getElementById('active-notebook-title'),
  notesBadge: document.getElementById('notes-badge'),
  btnNewNote: document.getElementById('btn-new-note'),
  notesList: document.getElementById('notes-list'),
  notesEmptyState: document.getElementById('notes-empty-state'),
  btnEmptyCreate: document.getElementById('btn-empty-create'),

  // Editor Column
  noteTitle: document.getElementById('note-title'),
  noteNotebookSelect: document.getElementById('note-notebook-select'),
  btnExportNote: document.getElementById('btn-export-note'),
  btnDeleteNote: document.getElementById('btn-delete-note'),
  btnViewEdit: document.getElementById('btn-view-edit'),
  btnViewSplit: document.getElementById('btn-view-split'),
  btnViewPreview: document.getElementById('btn-view-preview'),
  editorWorkspace: document.getElementById('editor-workspace'),
  editorToolbar: document.getElementById('editor-toolbar'),
  btnOpenGuide: document.getElementById('btn-open-guide'),
  noteBody: document.getElementById('note-body'),
  notePreviewContent: document.getElementById('note-preview-content'),

  // Status Bar
  saveStatus: document.getElementById('save-status'),
  noteStats: document.getElementById('note-stats'),
  noteUpdatedTime: document.getElementById('note-updated-time'),

  // Notebook Modal
  modal: document.getElementById('notebook-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalInput: document.getElementById('modal-input'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalConfirmBtn: document.getElementById('modal-confirm-btn'),

  // Guide Modal
  guideModal: document.getElementById('guide-modal'),
  guideCloseBtn: document.getElementById('guide-close-btn'),
  guideOkBtn: document.getElementById('guide-ok-btn')
};

// ============================================================================
// 3. INITIALIZATION
// ============================================================================
async function init() {
  try {
    // 1. Fetch initial notebooks and notes from main process via preload bridge
    const data = await window.notedAPI.loadData();
    state.notebooks = data.notebooks || [];
    state.notes = data.notes || [];

    // 2. Setup event listeners
    setupEventListeners();

    // 3. Render notebooks and note list
    renderNotebooks();
    renderNotebookSelectOptions();

    // 4. Select the first note by default (if any exists)
    if (state.notes.length > 0) {
      selectNote(state.notes[0].id);
    } else {
      renderNotesList();
    }
  } catch (err) {
    console.error('Initialization error:', err);
  }
}

// ============================================================================
// 4. RENDERING & TWO-WAY EDITING
// ============================================================================

/**
 * Render the notebooks list in the left sidebar
 */
function renderNotebooks() {
  dom.countAll.textContent = state.notes.length;
  dom.notebooksList.innerHTML = '';

  state.notebooks.forEach((nb) => {
    const noteCount = state.notes.filter((n) => n.notebookId === nb.id).length;
    const isActive = state.selectedNotebookId === nb.id;

    const item = document.createElement('div');
    item.className = `notebook-item ${isActive ? 'active' : ''}`;
    item.setAttribute('data-id', nb.id);

    item.innerHTML = `
      <span class="item-icon">📁</span>
      <span class="item-name" title="${escapeHtml(nb.name)}">${escapeHtml(nb.name)}</span>
      <span class="item-count">${noteCount}</span>
      <button class="item-menu-btn" title="Notebook options">⚙️</button>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('item-menu-btn')) return;
      selectNotebook(nb.id);
    });

    const menuBtn = item.querySelector('.item-menu-btn');
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openNotebookOptions(nb);
    });

    dom.notebooksList.appendChild(item);
  });

  const allItem = document.querySelector('.notebook-item[data-id="all"]');
  if (allItem) {
    allItem.classList.toggle('active', state.selectedNotebookId === 'all');
  }
}

/**
 * Update notebook dropdown in the note editor
 */
function renderNotebookSelectOptions() {
  dom.noteNotebookSelect.innerHTML = '';
  state.notebooks.forEach((nb) => {
    const opt = document.createElement('option');
    opt.value = nb.id;
    opt.textContent = nb.name;
    dom.noteNotebookSelect.appendChild(opt);
  });
}

/**
 * Filter and render the list of notes in the middle column
 */
function renderNotesList() {
  let filtered = state.notes;

  if (state.selectedNotebookId !== 'all') {
    filtered = filtered.filter((n) => n.notebookId === state.selectedNotebookId);
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (n) => (n.title && n.title.toLowerCase().includes(q)) || (n.body && n.body.toLowerCase().includes(q))
    );
  }

  let title = 'All Notes';
  if (state.selectedNotebookId !== 'all') {
    const currentNb = state.notebooks.find((nb) => nb.id === state.selectedNotebookId);
    title = currentNb ? currentNb.name : 'Notes';
  }
  if (state.searchQuery) {
    title = `Search: "${state.searchQuery}"`;
  }
  dom.activeNotebookTitle.textContent = title;
  dom.notesBadge.textContent = `${filtered.length} ${filtered.length === 1 ? 'note' : 'notes'}`;

  if (filtered.length === 0) {
    dom.notesList.innerHTML = '';
    dom.notesEmptyState.style.display = 'flex';
    clearEditor();
    return;
  }

  dom.notesEmptyState.style.display = 'none';
  dom.notesList.innerHTML = '';

  filtered.forEach((note) => {
    const card = document.createElement('div');
    const isActive = note.id === state.selectedNoteId;
    card.className = `note-card ${isActive ? 'active' : ''}`;
    card.setAttribute('data-id', note.id);

    const cleanSnippet = (note.body || '')
      .replace(/[#*`~>-]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .trim() || 'No additional text';

    card.innerHTML = `
      <div class="note-card-title">${escapeHtml(note.title || 'Untitled Note')}</div>
      <div class="note-card-snippet">${escapeHtml(cleanSnippet)}</div>
      <div class="note-card-footer">
        <span>${formatRelativeDate(note.updatedAt || note.createdAt)}</span>
      </div>
    `;

    card.addEventListener('click', () => selectNote(note.id));
    dom.notesList.appendChild(card);
  });
}

/**
 * Select and load a note into the editor
 */
function selectNote(noteId) {
  state.selectedNoteId = noteId;
  const note = state.notes.find((n) => n.id === noteId);

  if (!note) {
    clearEditor();
    return;
  }

  dom.noteTitle.value = note.title || '';
  dom.noteNotebookSelect.value = note.notebookId || (state.notebooks[0] ? state.notebooks[0].id : '');
  dom.noteBody.value = note.body || '';

  // Render preview from markdown
  updatePreviewFromMarkdown();
  updateStats(note.body || '');
  dom.noteUpdatedTime.textContent = `Updated ${formatRelativeDate(note.updatedAt)}`;

  document.querySelectorAll('.note-card').forEach((card) => {
    card.classList.toggle('active', card.getAttribute('data-id') === noteId);
  });
}

function clearEditor() {
  state.selectedNoteId = null;
  dom.noteTitle.value = '';
  dom.noteBody.value = '';
  dom.notePreviewContent.innerHTML = '<p style="color: #94a3b8; font-style: italic;">No note selected</p>';
  dom.noteStats.textContent = '0 words · 0 characters';
}

/**
 * Parse Markdown and update the visual text pane
 */
function updatePreviewFromMarkdown() {
  if (isSyncing) return;
  isSyncing = true;

  const markdownText = dom.noteBody.value;
  if (window.marked && typeof window.marked.parse === 'function') {
    dom.notePreviewContent.innerHTML = window.marked.parse(markdownText);
  } else {
    dom.notePreviewContent.textContent = markdownText;
  }

  isSyncing = false;
}

/**
 * Convert HTML from the visual text pane into clean Markdown and update the markdown textarea
 */
function updateMarkdownFromVisual() {
  if (isSyncing) return;
  isSyncing = true;

  const markdown = htmlToMarkdown(dom.notePreviewContent);
  dom.noteBody.value = markdown;
  updateStats(markdown);
  triggerAutoSave();

  isSyncing = false;
}

/**
 * HTML to Markdown Converter
 * Traverses DOM nodes and produces standard Markdown
 */
function htmlToMarkdown(root) {
  function walk(node) {
    if (!node) return '';

    // Plain text node
    if (node.nodeType === Node.TEXT_NODE) {
      return node.nodeValue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const tag = node.tagName.toLowerCase();

    // Check for interactive task item (- [ ] or - [x])
    if (tag === 'li' && node.classList.contains('task-item')) {
      const checkbox = node.querySelector('input[type="checkbox"]');
      const isChecked = checkbox && checkbox.checked;
      let text = '';
      node.childNodes.forEach((child) => {
        if (child.tagName && child.tagName.toLowerCase() === 'input') return;
        text += walk(child);
      });
      return `- [${isChecked ? 'x' : ' '}] ${text.trim()}\n`;
    }

    // Recursively walk children
    let childrenText = '';
    node.childNodes.forEach((child) => {
      childrenText += walk(child);
    });

    switch (tag) {
      case 'h1': return `\n# ${childrenText.trim()}\n\n`;
      case 'h2': return `\n## ${childrenText.trim()}\n\n`;
      case 'h3': return `\n### ${childrenText.trim()}\n\n`;
      case 'h4': return `\n#### ${childrenText.trim()}\n\n`;
      case 'h5': return `\n##### ${childrenText.trim()}\n\n`;
      case 'h6': return `\n###### ${childrenText.trim()}\n\n`;
      case 'p': return `${childrenText.trim()}\n\n`;
      case 'br': return '\n';
      case 'hr': return '\n---\n\n';
      case 'strong':
      case 'b':
        return `**${childrenText}**`;
      case 'em':
      case 'i':
        return `*${childrenText}*`;
      case 'del':
      case 's':
      case 'strike':
        return `~~${childrenText}~~`;
      case 'code':
        if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
          return childrenText;
        }
        return `\`${childrenText}\``;
      case 'pre': {
        const codeEl = node.querySelector('code');
        const codeText = codeEl ? codeEl.textContent : childrenText;
        return `\n\`\`\`\n${codeText.trim()}\n\`\`\`\n\n`;
      }
      case 'blockquote':
        return `\n> ${childrenText.trim()}\n\n`;
      case 'ul':
        return `\n${childrenText}\n`;
      case 'ol':
        return `\n${childrenText}\n`;
      case 'li': {
        const parent = node.parentElement;
        if (parent && parent.tagName.toLowerCase() === 'ol') {
          const index = Array.from(parent.children).indexOf(node) + 1;
          return `${index}. ${childrenText.trim()}\n`;
        }
        return `- ${childrenText.trim()}\n`;
      }
      case 'a': {
        const href = node.getAttribute('href') || '#';
        return `[${childrenText}](${href})`;
      }
      case 'div':
        return childrenText ? `${childrenText}\n` : '\n';
      default:
        return childrenText;
    }
  }

  const raw = walk(root);
  return raw.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Update word and character count in the status bar
 */
function updateStats(text) {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  dom.noteStats.textContent = `${words} ${words === 1 ? 'word' : 'words'} · ${chars} ${chars === 1 ? 'character' : 'characters'}`;
}

// ============================================================================
// 5. AUTO-SAVING & NOTE ACTIONS
// ============================================================================

function triggerAutoSave() {
  if (!state.selectedNoteId) return;

  dom.saveStatus.className = 'save-status saving';
  dom.saveStatus.innerHTML = '<span class="status-dot"></span> Saving...';

  clearTimeout(state.saveTimeout);
  state.saveTimeout = setTimeout(async () => {
    await saveCurrentNote();
  }, 350);
}

async function saveCurrentNote() {
  if (!state.selectedNoteId) return;

  const title = dom.noteTitle.value.trim() || 'Untitled Note';
  const body = dom.noteBody.value;
  const notebookId = dom.noteNotebookSelect.value;

  try {
    const updated = await window.notedAPI.saveNote({
      id: state.selectedNoteId,
      title,
      body,
      notebookId
    });

    const idx = state.notes.findIndex((n) => n.id === updated.id);
    if (idx !== -1) {
      state.notes[idx] = updated;
    }

    renderNotebooks();
    renderNotesList();

    dom.saveStatus.className = 'save-status saved';
    dom.saveStatus.innerHTML = '<span class="status-dot"></span> Saved';
    dom.noteUpdatedTime.textContent = 'Updated just now';
  } catch (err) {
    console.error('Failed to save note:', err);
    dom.saveStatus.className = 'save-status saving';
    dom.saveStatus.innerHTML = '<span class="status-dot"></span> Error saving';
  }
}

async function createNewNote() {
  const targetNbId =
    state.selectedNotebookId !== 'all'
      ? state.selectedNotebookId
      : state.notebooks[0]
      ? state.notebooks[0].id
      : 'nb-personal';

  try {
    const newNote = await window.notedAPI.saveNote({
      title: 'Untitled Note',
      body: '',
      notebookId: targetNbId
    });

    state.notes.unshift(newNote);
    renderNotebooks();
    renderNotesList();
    selectNote(newNote.id);

    dom.noteTitle.focus();
    dom.noteTitle.select();
  } catch (err) {
    console.error('Failed to create new note:', err);
  }
}

async function deleteCurrentNote() {
  if (!state.selectedNoteId) return;

  const currentNote = state.notes.find((n) => n.id === state.selectedNoteId);
  const title = currentNote ? currentNote.title : 'this note';

  if (!confirm(`Are you sure you want to delete "${title}"?`)) {
    return;
  }

  try {
    await window.notedAPI.deleteNote(state.selectedNoteId);
    state.notes = state.notes.filter((n) => n.id !== state.selectedNoteId);

    renderNotebooks();
    renderNotesList();

    if (state.notes.length > 0) {
      selectNote(state.notes[0].id);
    } else {
      clearEditor();
    }
  } catch (err) {
    console.error('Failed to delete note:', err);
  }
}

async function exportCurrentNote() {
  if (!state.selectedNoteId) return;
  const currentNote = state.notes.find((n) => n.id === state.selectedNoteId);
  if (!currentNote) return;

  const res = await window.notedAPI.exportNote(currentNote);
  if (res && res.success) {
    alert(`Note successfully exported to:\n${res.filePath}`);
  }
}

// ============================================================================
// 6. NOTEBOOK MANAGEMENT & MODALS
// ============================================================================

function selectNotebook(notebookId) {
  state.selectedNotebookId = notebookId;
  renderNotebooks();
  renderNotesList();

  if (notebookId !== 'all') {
    const activeNote = state.notes.find((n) => n.id === state.selectedNoteId);
    if (!activeNote || activeNote.notebookId !== notebookId) {
      const match = state.notes.find((n) => n.notebookId === notebookId);
      if (match) selectNote(match.id);
      else clearEditor();
    }
  }
}

function openCreateNotebookModal() {
  state.modalMode = 'create';
  state.targetNotebookId = null;
  dom.modalTitle.textContent = 'Create New Notebook';
  dom.modalInput.value = '';
  dom.modal.style.display = 'flex';
  setTimeout(() => dom.modalInput.focus(), 50);
}

function openNotebookOptions(nb) {
  const action = prompt(`Notebook Options for "${nb.name}":\n\nType "rename" to rename\nType "delete" to delete\nOr press Cancel`, 'rename');
  if (!action) return;

  const cleanAction = action.trim().toLowerCase();
  if (cleanAction === 'rename') {
    const newName = prompt('Enter new notebook name:', nb.name);
    if (newName && newName.trim()) {
      renameNotebook(nb.id, newName.trim());
    }
  } else if (cleanAction === 'delete') {
    if (confirm(`Delete notebook "${nb.name}"? Notes inside will be moved to another notebook.`)) {
      deleteNotebook(nb.id);
    }
  }
}

async function renameNotebook(id, newName) {
  try {
    const updated = await window.notedAPI.renameNotebook(id, newName);
    const nb = state.notebooks.find((n) => n.id === id);
    if (nb) nb.name = updated.name;
    renderNotebooks();
    renderNotebookSelectOptions();
    renderNotesList();
  } catch (err) {
    alert(err.message || 'Failed to rename notebook');
  }
}

async function deleteNotebook(id) {
  try {
    const res = await window.notedAPI.deleteNotebook(id);
    state.notebooks = state.notebooks.filter((n) => n.id !== id);

    state.notes.forEach((note) => {
      if (note.notebookId === id) {
        note.notebookId = res.fallbackNotebookId;
      }
    });

    if (state.selectedNotebookId === id) {
      state.selectedNotebookId = 'all';
    }

    renderNotebooks();
    renderNotebookSelectOptions();
    renderNotesList();
  } catch (err) {
    alert(err.message || 'Failed to delete notebook');
  }
}

async function handleModalConfirm() {
  const name = dom.modalInput.value.trim();
  if (!name) return;

  if (state.modalMode === 'create') {
    try {
      const newNb = await window.notedAPI.createNotebook(name);
      state.notebooks.push(newNb);
      renderNotebooks();
      renderNotebookSelectOptions();
      selectNotebook(newNb.id);
      closeModal();
    } catch (err) {
      alert(err.message || 'Failed to create notebook');
    }
  }
}

function closeModal() {
  dom.modal.style.display = 'none';
  state.modalMode = null;
  state.targetNotebookId = null;
}

// ============================================================================
// 7. FORMATTING TOOLBAR HELPERS
// ============================================================================

/**
 * Applies formatting to whichever pane is currently active
 */
function applyFormatting(action) {
  const isVisualFocused = document.activeElement === dom.notePreviewContent || dom.notePreviewContent.contains(document.activeElement);

  if (isVisualFocused) {
    switch (action) {
      case 'bold': document.execCommand('bold', false, null); break;
      case 'italic': document.execCommand('italic', false, null); break;
      case 'strike': document.execCommand('strikeThrough', false, null); break;
      case 'h1': document.execCommand('formatBlock', false, '<h1>'); break;
      case 'h2': document.execCommand('formatBlock', false, '<h2>'); break;
      case 'h3': document.execCommand('formatBlock', false, '<h3>'); break;
      case 'ul': document.execCommand('insertUnorderedList', false, null); break;
      case 'ol': document.execCommand('insertOrderedList', false, null); break;
      case 'quote': document.execCommand('formatBlock', false, '<blockquote>'); break;
      case 'hr': document.execCommand('insertHorizontalRule', false, null); break;
      default:
        applyMarkdownToolbarAction(action);
        return;
    }
    updateMarkdownFromVisual();
  } else {
    applyMarkdownToolbarAction(action);
  }
}

/**
 * Inserts markdown syntax around or at the current textarea cursor selection
 */
function applyMarkdownToolbarAction(action) {
  const textarea = dom.noteBody;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const fullText = textarea.value;
  const selected = fullText.substring(start, end);

  let replacement = '';
  let cursorOffset = 0;

  switch (action) {
    case 'bold':
      replacement = `**${selected || 'bold text'}**`;
      cursorOffset = selected ? replacement.length : 2;
      break;
    case 'italic':
      replacement = `*${selected || 'italic text'}*`;
      cursorOffset = selected ? replacement.length : 1;
      break;
    case 'strike':
      replacement = `~~${selected || 'strikethrough text'}~~`;
      cursorOffset = selected ? replacement.length : 2;
      break;
    case 'h1':
      replacement = `\n# ${selected || 'Heading 1'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'h2':
      replacement = `\n## ${selected || 'Heading 2'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'h3':
      replacement = `\n### ${selected || 'Heading 3'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'ul':
      replacement = `\n- ${selected || 'List item'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'ol':
      replacement = `\n1. ${selected || 'Numbered item'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'task':
      replacement = `\n- [ ] ${selected || 'New task'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'quote':
      replacement = `\n> ${selected || 'Quote text'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'code':
      if (selected.includes('\n')) {
        replacement = `\n\`\`\`javascript\n${selected || '// code here'}\n\`\`\`\n`;
      } else {
        replacement = `\`${selected || 'code'}\``;
      }
      cursorOffset = replacement.length;
      break;
    case 'link':
      replacement = `[${selected || 'link text'}](https://)`;
      cursorOffset = replacement.length - 1;
      break;
    case 'hr':
      replacement = `\n---\n`;
      cursorOffset = replacement.length;
      break;
    default:
      return;
  }

  textarea.value = fullText.substring(0, start) + replacement + fullText.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);

  updatePreviewFromMarkdown();
  updateStats(textarea.value);
  triggerAutoSave();
}

// ============================================================================
// 8. EVENT LISTENERS
// ============================================================================
function setupEventListeners() {
  document.querySelector('.notebook-item[data-id="all"]').addEventListener('click', () => {
    selectNotebook('all');
  });

  dom.btnAddNotebook.addEventListener('click', openCreateNotebookModal);
  dom.btnNewNote.addEventListener('click', createNewNote);
  dom.btnEmptyCreate.addEventListener('click', createNewNote);
  dom.btnDeleteNote.addEventListener('click', deleteCurrentNote);
  dom.btnExportNote.addEventListener('click', exportCurrentNote);

  // 1. Typing in Markdown textarea -> updates Visual Text preview live
  dom.noteBody.addEventListener('input', () => {
    if (isSyncing) return;
    updatePreviewFromMarkdown();
    updateStats(dom.noteBody.value);
    triggerAutoSave();
  });

  // 2. Typing directly in Visual Text pane -> converts to Markdown live simultaneously
  dom.notePreviewContent.addEventListener('input', () => {
    if (isSyncing) return;
    updateMarkdownFromVisual();
  });

  // 3. Interactive checkboxes in Visual Text pane
  dom.notePreviewContent.addEventListener('change', (e) => {
    if (e.target && e.target.type === 'checkbox') {
      const li = e.target.closest('.task-item');
      if (li) {
        li.classList.toggle('task-done', e.target.checked);
      }
      updateMarkdownFromVisual();
    }
  });

  dom.noteTitle.addEventListener('input', () => {
    triggerAutoSave();
  });

  dom.noteNotebookSelect.addEventListener('change', () => {
    triggerAutoSave();
  });

  dom.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    dom.searchClearBtn.style.display = state.searchQuery ? 'block' : 'none';
    renderNotesList();
  });

  dom.searchClearBtn.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.searchQuery = '';
    dom.searchClearBtn.style.display = 'none';
    renderNotesList();
  });

  // Formatting toolbar clicks
  dom.editorToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tool-btn');
    if (!btn || btn.id === 'btn-open-guide') return;
    const action = btn.getAttribute('data-action');
    if (action) applyFormatting(action);
  });

  // Markdown Guide Modal
  dom.btnOpenGuide.addEventListener('click', () => {
    dom.guideModal.style.display = 'flex';
  });
  dom.guideCloseBtn.addEventListener('click', () => {
    dom.guideModal.style.display = 'none';
  });
  dom.guideOkBtn.addEventListener('click', () => {
    dom.guideModal.style.display = 'none';
  });
  dom.guideModal.addEventListener('click', (e) => {
    if (e.target === dom.guideModal) {
      dom.guideModal.style.display = 'none';
    }
  });

  // View Mode switches
  dom.btnViewEdit.addEventListener('click', () => setViewMode('edit'));
  dom.btnViewSplit.addEventListener('click', () => setViewMode('split'));
  dom.btnViewPreview.addEventListener('click', () => setViewMode('preview'));

  // Notebook Modal
  dom.modalCancelBtn.addEventListener('click', closeModal);
  dom.modalConfirmBtn.addEventListener('click', handleModalConfirm);
  dom.modalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleModalConfirm();
    if (e.key === 'Escape') closeModal();
  });
  dom.modal.addEventListener('click', (e) => {
    if (e.target === dom.modal) closeModal();
  });
}

function setViewMode(mode) {
  state.viewMode = mode;
  dom.editorWorkspace.className = `editor-workspace mode-${mode}`;

  dom.btnViewEdit.classList.toggle('active', mode === 'edit');
  dom.btnViewSplit.classList.toggle('active', mode === 'split');
  dom.btnViewPreview.classList.toggle('active', mode === 'preview');
}

// ============================================================================
// 9. UTILITY FUNCTIONS
// ============================================================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRelativeDate(isoDateString) {
  if (!isoDateString) return 'recently';
  const date = new Date(isoDateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

document.addEventListener('DOMContentLoaded', init);
