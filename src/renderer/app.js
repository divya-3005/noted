const state = {
  notebooks: [],
  notes: [],
  settings: {
    theme: 'light',
    sortBy: 'updated',
    focusMode: false
  },
  selectedNoteId: null,
  activeView: 'all',
  searchQuery: '',
  sortBy: 'updated',
  viewMode: 'split',
  outlineOpen: false,
  autoSaveTimer: null,
  isSyncing: false
};

const dom = {
  appLayout: document.getElementById('app-layout'),
  sidebar: document.getElementById('sidebar'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  navAll: document.getElementById('nav-all'),
  navStarred: document.getElementById('nav-starred'),
  navTrash: document.getElementById('nav-trash'),
  countAll: document.getElementById('count-all'),
  countStarred: document.getElementById('count-starred'),
  countTrash: document.getElementById('count-trash'),
  tagTotalBadge: document.getElementById('tag-total-badge'),
  tagsList: document.getElementById('tags-list'),
  notebooksList: document.getElementById('notebooks-list'),
  btnAddNotebook: document.getElementById('btn-add-notebook'),
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  themeLabel: document.getElementById('theme-label'),
  btnShortcutsModal: document.getElementById('btn-shortcuts-modal'),
  btnToggleFocus: document.getElementById('btn-toggle-focus'),

  activeViewTitle: document.getElementById('active-view-title'),
  notesBadge: document.getElementById('notes-badge'),
  sortSelect: document.getElementById('sort-select'),
  btnEmptyTrash: document.getElementById('btn-empty-trash'),
  btnNewNote: document.getElementById('btn-new-note'),
  notesList: document.getElementById('notes-list'),
  notesEmptyState: document.getElementById('notes-empty-state'),
  emptyStateText: document.getElementById('empty-state-text'),
  btnEmptyCreate: document.getElementById('btn-empty-create'),

  btnStarNote: document.getElementById('btn-star-note'),
  noteTitle: document.getElementById('note-title'),
  noteNotebookSelect: document.getElementById('note-notebook-select'),
  btnToggleOutline: document.getElementById('btn-toggle-outline'),
  btnViewEdit: document.getElementById('btn-view-edit'),
  btnViewSplit: document.getElementById('btn-view-split'),
  btnViewPreview: document.getElementById('btn-view-preview'),
  btnExportDropdown: document.getElementById('btn-export-dropdown'),
  exportMenu: document.getElementById('export-menu'),
  btnDuplicateNote: document.getElementById('btn-duplicate-note'),
  btnRestoreNote: document.getElementById('btn-restore-note'),
  btnDeleteNote: document.getElementById('btn-delete-note'),

  noteTagsBar: document.getElementById('note-tags-bar'),
  activeNoteTags: document.getElementById('active-note-tags'),
  addTagInput: document.getElementById('add-tag-input'),

  editorToolbar: document.getElementById('editor-toolbar'),
  btnOpenGuide: document.getElementById('btn-open-guide'),
  editorWorkspace: document.getElementById('editor-workspace'),
  paneEditor: document.getElementById('pane-editor'),
  panePreview: document.getElementById('pane-preview'),
  noteBody: document.getElementById('note-body'),
  notePreviewContent: document.getElementById('note-preview-content'),

  outlineDrawer: document.getElementById('outline-drawer'),
  outlineList: document.getElementById('outline-list'),
  btnCloseOutline: document.getElementById('btn-close-outline'),

  saveStatus: document.getElementById('save-status'),
  noteUpdatedTime: document.getElementById('note-updated-time'),
  noteStatsBtn: document.getElementById('note-stats-btn'),
  statsWords: document.getElementById('stats-words'),
  statsReadtime: document.getElementById('stats-readtime'),

  notebookModal: document.getElementById('notebook-modal'),
  modalTitle: document.getElementById('modal-title'),
  modalInput: document.getElementById('modal-input'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalConfirmBtn: document.getElementById('modal-confirm-btn'),

  guideModal: document.getElementById('guide-modal'),
  guideCloseBtn: document.getElementById('guide-close-btn'),
  guideOkBtn: document.getElementById('guide-ok-btn'),

  statsModal: document.getElementById('stats-modal'),
  statsCloseBtn: document.getElementById('stats-close-btn'),
  statsOkBtn: document.getElementById('stats-ok-btn'),
  detailWords: document.getElementById('detail-words'),
  detailChars: document.getElementById('detail-chars'),
  detailParas: document.getElementById('detail-paras'),
  detailReadtime: document.getElementById('detail-readtime'),

  shortcutsModal: document.getElementById('shortcuts-modal'),
  shortcutsCloseBtn: document.getElementById('shortcuts-close-btn'),
  shortcutsOkBtn: document.getElementById('shortcuts-ok-btn')
};

async function init() {
  try {
    const data = await window.notedAPI.loadData();
    state.notebooks = data.notebooks || [];
    state.notes = data.notes || [];
    state.settings = { ...state.settings, ...(data.settings || {}) };

    applyTheme(state.settings.theme || 'light');
    if (state.settings.focusMode) {
      dom.appLayout.classList.add('focus-mode');
    }
    if (state.settings.sortBy) {
      state.sortBy = state.settings.sortBy;
      dom.sortSelect.value = state.sortBy;
    }

    setupEventListeners();
    renderNotebooks();
    renderTagsCloud();
    renderNotesList();

    const initial = getFilteredNotes()[0];
    if (initial) {
      selectNote(initial.id);
    } else {
      clearEditor();
    }
  } catch (err) {
    console.error('Init error:', err);
  }
}

function renderNotebooks() {
  const active = state.notes.filter((n) => !n.isTrash);
  const starred = active.filter((n) => n.isPinned);
  const trash = state.notes.filter((n) => n.isTrash);

  dom.countAll.textContent = active.length;
  dom.countStarred.textContent = starred.length;
  dom.countTrash.textContent = trash.length;

  dom.notebooksList.innerHTML = '';
  dom.noteNotebookSelect.innerHTML = '';

  state.notebooks.forEach((nb) => {
    const count = active.filter((n) => n.notebookId === nb.id).length;

    const item = document.createElement('div');
    const isCur = state.activeView === `notebook:${nb.id}`;
    item.className = `notebook-item ${isCur ? 'active' : ''}`;
    item.setAttribute('data-id', nb.id);
    item.innerHTML = `
      <span class="item-name">${escapeHtml(nb.name)}</span>
      <span class="item-count">${count}</span>
    `;

    item.addEventListener('click', () => {
      setActiveView(`notebook:${nb.id}`);
    });

    dom.notebooksList.appendChild(item);

    const opt = document.createElement('option');
    opt.value = nb.id;
    opt.textContent = nb.name;
    dom.noteNotebookSelect.appendChild(opt);
  });
}

function renderTagsCloud() {
  const active = state.notes.filter((n) => !n.isTrash);
  const tagCounts = {};

  active.forEach((note) => {
    (note.tags || []).forEach((t) => {
      const clean = t.toLowerCase().trim();
      if (clean) tagCounts[clean] = (tagCounts[clean] || 0) + 1;
    });
  });

  const tags = Object.keys(tagCounts).sort();
  dom.tagTotalBadge.textContent = tags.length;
  dom.tagsList.innerHTML = '';

  if (tags.length === 0) {
    dom.tagsList.innerHTML = '<span style="font-size: 11px; color: var(--text-muted); padding: 2px 4px;">No tags</span>';
    return;
  }

  tags.forEach((tag) => {
    const chip = document.createElement('div');
    const isCur = state.activeView === `tag:${tag}`;
    chip.className = `tag-chip ${isCur ? 'active' : ''}`;
    chip.innerHTML = `#${escapeHtml(tag)} <span style="opacity: 0.6; font-size: 9.5px; margin-left: 3px;">${tagCounts[tag]}</span>`;
    chip.addEventListener('click', () => {
      setActiveView(`tag:${tag}`);
    });
    dom.tagsList.appendChild(chip);
  });
}

function setActiveView(view) {
  state.activeView = view;

  dom.navAll.classList.toggle('active', view === 'all');
  dom.navStarred.classList.toggle('active', view === 'starred');
  dom.navTrash.classList.toggle('active', view === 'trash');

  renderNotebooks();
  renderTagsCloud();
  renderNotesList();

  const visible = getFilteredNotes();
  if (visible.length > 0 && (!state.selectedNoteId || !visible.some((n) => n.id === state.selectedNoteId))) {
    selectNote(visible[0].id);
  } else if (visible.length === 0) {
    clearEditor();
  }
}

function getFilteredNotes() {
  let list = [];

  if (state.activeView === 'trash') {
    list = state.notes.filter((n) => n.isTrash);
  } else {
    list = state.notes.filter((n) => !n.isTrash);

    if (state.activeView === 'starred') {
      list = list.filter((n) => n.isPinned);
    } else if (state.activeView.startsWith('notebook:')) {
      const nbId = state.activeView.replace('notebook:', '');
      list = list.filter((n) => n.notebookId === nbId);
    } else if (state.activeView.startsWith('tag:')) {
      const tagName = state.activeView.replace('tag:', '');
      list = list.filter((n) => (n.tags || []).includes(tagName));
    }
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter((n) =>
      (n.title || '').toLowerCase().includes(q) ||
      (n.body || '').toLowerCase().includes(q) ||
      (n.tags || []).some((t) => t.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => {
    if (state.activeView !== 'trash') {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
    }

    if (state.sortBy === 'created') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    if (state.sortBy === 'title') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  return list;
}

function renderNotesList() {
  const filtered = getFilteredNotes();

  let title = 'All Notes';
  if (state.activeView === 'starred') title = 'Starred';
  else if (state.activeView === 'trash') title = 'Trash';
  else if (state.activeView.startsWith('notebook:')) {
    const nb = state.notebooks.find((n) => n.id === state.activeView.replace('notebook:', ''));
    title = nb ? nb.name : 'Notebook';
  } else if (state.activeView.startsWith('tag:')) {
    title = `#${state.activeView.replace('tag:', '')}`;
  }

  if (state.searchQuery) {
    title = `"${state.searchQuery}"`;
  }

  dom.activeViewTitle.textContent = title;
  dom.notesBadge.textContent = `${filtered.length}`;
  dom.btnEmptyTrash.style.display = state.activeView === 'trash' && filtered.length > 0 ? 'inline-block' : 'none';

  if (filtered.length === 0) {
    dom.notesList.innerHTML = '';
    dom.notesEmptyState.style.display = 'flex';
    dom.emptyStateText.textContent = state.activeView === 'trash' ? 'Trash is empty' : 'No notes found';
    dom.btnEmptyCreate.style.display = state.activeView === 'trash' ? 'none' : 'inline-block';
    clearEditor();
    return;
  }

  dom.notesEmptyState.style.display = 'none';
  dom.notesList.innerHTML = '';

  filtered.forEach((note) => {
    const card = document.createElement('div');
    const isCur = note.id === state.selectedNoteId;
    card.className = `note-card ${isCur ? 'active' : ''}`;
    card.setAttribute('data-id', note.id);

    const cleanSnippet = (note.body || '')
      .replace(/[#*`~>-]/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .trim() || 'Empty note';

    const words = (note.body || '').trim().split(/\s+/).filter(Boolean).length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    const tagsHtml = (note.tags || []).slice(0, 3).map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="note-card-header">
        <span class="note-card-title">${escapeHtml(note.title || 'Untitled')}</span>
        ${note.isPinned ? '<span class="star-badge">★</span>' : ''}
      </div>
      <div class="note-card-snippet">${escapeHtml(cleanSnippet)}</div>
      <div class="note-card-footer">
        <span>${formatRelativeDate(note.updatedAt || note.createdAt)}</span>
        <div class="note-card-tags">${tagsHtml}</div>
      </div>
    `;

    card.addEventListener('click', () => selectNote(note.id));
    dom.notesList.appendChild(card);
  });
}

function selectNote(noteId) {
  state.selectedNoteId = noteId;
  const note = state.notes.find((n) => n.id === noteId);

  if (!note) {
    clearEditor();
    return;
  }

  document.querySelectorAll('.note-card').forEach((c) => {
    c.classList.toggle('active', c.getAttribute('data-id') === noteId);
  });

  dom.noteTitle.value = note.title || '';
  dom.noteNotebookSelect.value = note.notebookId || (state.notebooks[0] ? state.notebooks[0].id : '');
  dom.noteBody.value = note.body || '';

  dom.btnStarNote.classList.toggle('active', Boolean(note.isPinned));

  if (note.isTrash) {
    dom.btnRestoreNote.style.display = 'inline-flex';
    dom.btnDeleteNote.title = 'Delete Permanently';
  } else {
    dom.btnRestoreNote.style.display = 'none';
    dom.btnDeleteNote.title = 'Delete';
  }

  renderActiveNoteTags(note);
  updatePreviewFromMarkdown();
  updateStats(note.body || '');
  renderOutline();

  dom.noteUpdatedTime.textContent = `${formatRelativeDate(note.updatedAt || note.createdAt)}`;
}

function renderActiveNoteTags(note) {
  dom.activeNoteTags.innerHTML = '';
  (note.tags || []).forEach((t) => {
    const pill = document.createElement('span');
    pill.className = 'tag-remove-pill';
    pill.innerHTML = `#${escapeHtml(t)} <span class="remove-x" title="Remove">✕</span>`;
    pill.querySelector('.remove-x').addEventListener('click', (e) => {
      e.stopPropagation();
      removeTagFromNote(note, t);
    });
    dom.activeNoteTags.appendChild(pill);
  });
}

function addTagToCurrentNote(tagText) {
  const cur = state.notes.find((n) => n.id === state.selectedNoteId);
  if (!cur) return;
  const clean = tagText.replace(/^#/, '').trim().toLowerCase();
  if (!clean) return;

  if (!cur.tags) cur.tags = [];
  if (!cur.tags.includes(clean)) {
    cur.tags.push(clean);
    renderActiveNoteTags(cur);
    renderTagsCloud();
    renderNotesList();
    triggerAutoSave();
  }
}

function removeTagFromNote(note, tag) {
  note.tags = (note.tags || []).filter((t) => t !== tag);
  renderActiveNoteTags(note);
  renderTagsCloud();
  renderNotesList();
  triggerAutoSave();
}

function clearEditor() {
  state.selectedNoteId = null;
  dom.noteTitle.value = '';
  dom.noteBody.value = '';
  dom.notePreviewContent.innerHTML = '';
  dom.activeNoteTags.innerHTML = '';
  dom.statsWords.textContent = '0 words';
  dom.statsReadtime.textContent = '0m';
  dom.noteUpdatedTime.textContent = '';
  dom.outlineList.innerHTML = '<span style="font-size: 11px; color: var(--text-muted); padding: 4px;">No note selected</span>';
}

async function createNewNote() {
  let targetNb = state.notebooks[0] ? state.notebooks[0].id : 'default';
  if (state.activeView.startsWith('notebook:')) {
    targetNb = state.activeView.replace('notebook:', '');
  }

  const tags = state.activeView.startsWith('tag:') ? [state.activeView.replace('tag:', '')] : [];

  const created = await window.notedAPI.saveNote({
    title: 'Untitled Note',
    body: '',
    notebookId: targetNb,
    tags,
    isPinned: false
  });

  state.notes.unshift(created);

  if (state.activeView === 'trash') {
    state.activeView = 'all';
  }

  renderNotebooks();
  renderTagsCloud();
  renderNotesList();
  selectNote(created.id);
  dom.noteTitle.focus();
}

async function duplicateCurrentNote() {
  if (!state.selectedNoteId) return;
  const cloned = await window.notedAPI.duplicateNote(state.selectedNoteId);
  if (cloned) {
    state.notes.unshift(cloned);
    renderNotebooks();
    renderTagsCloud();
    renderNotesList();
    selectNote(cloned.id);
  }
}

async function togglePinCurrentNote() {
  if (!state.selectedNoteId) return;
  const updated = await window.notedAPI.togglePin(state.selectedNoteId);
  if (updated) {
    const idx = state.notes.findIndex((n) => n.id === updated.id);
    if (idx !== -1) state.notes[idx] = updated;

    dom.btnStarNote.classList.toggle('active', Boolean(updated.isPinned));
    renderNotebooks();
    renderNotesList();
  }
}

async function deleteCurrentNote() {
  if (!state.selectedNoteId) return;
  const note = state.notes.find((n) => n.id === state.selectedNoteId);
  if (!note) return;

  if (note.isTrash) {
    if (!confirm('Permanently delete note?')) return;
    await window.notedAPI.deleteNote(note.id, true);
    state.notes = state.notes.filter((n) => n.id !== note.id);
  } else {
    await window.notedAPI.deleteNote(note.id, false);
    note.isTrash = true;
    note.deletedAt = new Date().toISOString();
  }

  renderNotebooks();
  renderTagsCloud();
  renderNotesList();

  const next = getFilteredNotes();
  if (next.length > 0) {
    selectNote(next[0].id);
  } else {
    clearEditor();
  }
}

async function restoreCurrentNote() {
  if (!state.selectedNoteId) return;
  const restored = await window.notedAPI.restoreNote(state.selectedNoteId);
  if (restored) {
    const idx = state.notes.findIndex((n) => n.id === restored.id);
    if (idx !== -1) state.notes[idx] = restored;
    renderNotebooks();
    renderTagsCloud();
    renderNotesList();
    selectNote(restored.id);
  }
}

async function emptyTrash() {
  if (!confirm('Empty all notes in Trash?')) return;
  await window.notedAPI.emptyTrash();
  state.notes = state.notes.filter((n) => !n.isTrash);
  renderNotebooks();
  renderNotesList();
  clearEditor();
}

function triggerAutoSave() {
  if (!state.selectedNoteId) return;
  dom.saveStatus.textContent = 'Saving';

  clearTimeout(state.autoSaveTimer);
  state.autoSaveTimer = setTimeout(async () => {
    const current = state.notes.find((n) => n.id === state.selectedNoteId);
    if (!current) return;

    const payload = {
      id: current.id,
      title: dom.noteTitle.value.trim() || 'Untitled Note',
      body: dom.noteBody.value,
      notebookId: dom.noteNotebookSelect.value,
      tags: current.tags || []
    };

    const saved = await window.notedAPI.saveNote(payload);
    const idx = state.notes.findIndex((n) => n.id === saved.id);
    if (idx !== -1) state.notes[idx] = saved;

    dom.saveStatus.textContent = 'Saved';
    dom.noteUpdatedTime.textContent = 'Just now';
    renderNotebooks();
    renderTagsCloud();
    renderNotesList();
    renderOutline();
  }, 350);
}

function updatePreviewFromMarkdown() {
  if (typeof marked !== 'undefined') {
    dom.notePreviewContent.innerHTML = marked.parse(dom.noteBody.value || '');
  } else {
    dom.notePreviewContent.textContent = dom.noteBody.value || '';
  }
}

function updateMarkdownFromVisual() {
  state.isSyncing = true;
  const md = htmlToMarkdown(dom.notePreviewContent.innerHTML);
  dom.noteBody.value = md;
  updateStats(md);
  triggerAutoSave();
  state.isSyncing = false;
}

function htmlToMarkdown(html) {
  if (!html) return '';
  const temp = document.createElement('div');
  temp.innerHTML = html;

  function parseNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const children = Array.from(node.childNodes).map(parseNode).join('');

    switch (tag) {
      case 'h1': return `\n# ${children.trim()}\n\n`;
      case 'h2': return `\n## ${children.trim()}\n\n`;
      case 'h3': return `\n### ${children.trim()}\n\n`;
      case 'strong': case 'b': return `**${children}**`;
      case 'em': case 'i': return `*${children}*`;
      case 'del': case 's': return `~~${children}~~`;
      case 'code': return `\`${children}\``;
      case 'pre': return `\n\`\`\`\n${node.textContent.trim()}\n\`\`\`\n\n`;
      case 'blockquote': return `\n> ${children.trim()}\n\n`;
      case 'hr': return `\n---\n\n`;
      case 'li': {
        const checkbox = node.querySelector('input[type="checkbox"]');
        if (checkbox) {
          const checked = checkbox.checked ? 'x' : ' ';
          const span = node.querySelector('span');
          return `- [${checked}] ${(span ? span.textContent : children).trim()}\n`;
        }
        return `- ${children.trim()}\n`;
      }
      case 'ul': case 'ol': return `\n${children}\n`;
      case 'p': return `${children.trim()}\n\n`;
      case 'br': return '\n';
      case 'a': return `[${children}](${node.getAttribute('href') || ''})`;
      default: return children;
    }
  }

  return Array.from(temp.childNodes).map(parseNode).join('').replace(/\n{3,}/g, '\n\n').trim();
}

function renderOutline() {
  const content = dom.noteBody.value || '';
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  dom.outlineList.innerHTML = '';

  let match;
  let count = 0;
  while ((match = headingRegex.exec(content)) !== null) {
    count++;
    const level = match[1].length;
    const text = match[2].trim();

    const item = document.createElement('div');
    item.className = `outline-item level-${level}`;
    item.textContent = text;
    item.addEventListener('click', () => scrollToHeading(text));
    dom.outlineList.appendChild(item);
  }

  if (count === 0) {
    dom.outlineList.innerHTML = '<span style="font-size: 11px; color: var(--text-muted); padding: 4px;">No headings</span>';
  }
}

function scrollToHeading(text) {
  const headings = dom.notePreviewContent.querySelectorAll('h1, h2, h3');
  for (const h of headings) {
    if (h.textContent.trim() === text) {
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
  }
}

function updateStats(text) {
  const clean = (text || '').trim();
  const words = clean ? clean.split(/\s+/).filter(Boolean).length : 0;
  const chars = clean.length;
  const paras = clean ? clean.split(/\n\s*\n/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 200));

  dom.statsWords.textContent = `${words} words`;
  dom.statsReadtime.textContent = `${readTime}m read`;

  dom.detailWords.textContent = words.toLocaleString();
  dom.detailChars.textContent = chars.toLocaleString();
  dom.detailParas.textContent = paras.toLocaleString();
  dom.detailReadtime.textContent = `${readTime}m`;
}

function applyToolbarAction(action) {
  const textarea = dom.noteBody;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const full = textarea.value;
  const sel = full.substring(start, end);

  let replacement = '';
  let cursorOffset = 0;

  switch (action) {
    case 'bold':
      replacement = `**${sel || 'text'}**`;
      cursorOffset = sel ? replacement.length : 2;
      break;
    case 'italic':
      replacement = `*${sel || 'text'}*`;
      cursorOffset = sel ? replacement.length : 1;
      break;
    case 'strike':
      replacement = `~~${sel || 'text'}~~`;
      cursorOffset = sel ? replacement.length : 2;
      break;
    case 'h1':
      replacement = `\n# ${sel || 'Heading 1'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'h2':
      replacement = `\n## ${sel || 'Heading 2'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'h3':
      replacement = `\n### ${sel || 'Heading 3'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'ul':
      replacement = `\n- ${sel || 'Item'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'task':
      replacement = `\n- [ ] ${sel || 'Task'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'quote':
      replacement = `\n> ${sel || 'Quote'}\n`;
      cursorOffset = replacement.length;
      break;
    case 'code':
      replacement = sel.includes('\n') ? `\n\`\`\`\n${sel}\n\`\`\`\n` : `\`${sel || 'code'}\``;
      cursorOffset = replacement.length;
      break;
    case 'table':
      replacement = `\n| Column 1 | Column 2 |\n| :--- | :--- |\n| A | B |\n`;
      cursorOffset = replacement.length;
      break;
    case 'link':
      replacement = `[${sel || 'link'}](url)`;
      cursorOffset = replacement.length - 1;
      break;
    case 'hr':
      replacement = `\n---\n`;
      cursorOffset = replacement.length;
      break;
    default:
      return;
  }

  textarea.value = full.substring(0, start) + replacement + full.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);

  updatePreviewFromMarkdown();
  updateStats(textarea.value);
  triggerAutoSave();
}

function applyTheme(theme) {
  state.settings.theme = theme;
  document.body.setAttribute('data-theme', theme);
  dom.themeLabel.textContent = theme === 'dark' ? 'Light' : 'Dark';
  window.notedAPI.saveSettings({ theme });
}

function toggleTheme() {
  applyTheme(state.settings.theme === 'dark' ? 'light' : 'dark');
}

function toggleFocusMode() {
  const isFocus = dom.appLayout.classList.toggle('focus-mode');
  state.settings.focusMode = isFocus;
  window.notedAPI.saveSettings({ focusMode: isFocus });
}

function setViewMode(mode) {
  state.viewMode = mode;
  dom.editorWorkspace.className = `editor-workspace mode-${mode}`;
  dom.btnViewEdit.classList.toggle('active', mode === 'edit');
  dom.btnViewSplit.classList.toggle('active', mode === 'split');
  dom.btnViewPreview.classList.toggle('active', mode === 'preview');
}

async function handleExport(format) {
  dom.exportMenu.style.display = 'none';
  const cur = state.notes.find((n) => n.id === state.selectedNoteId);
  if (!cur) return;

  if (format === 'print') {
    window.print();
    return;
  }

  const html = dom.notePreviewContent.innerHTML;
  await window.notedAPI.exportNote(cur, format, html);
}

function setupEventListeners() {
  dom.navAll.addEventListener('click', () => setActiveView('all'));
  dom.navStarred.addEventListener('click', () => setActiveView('starred'));
  dom.navTrash.addEventListener('click', () => setActiveView('trash'));

  dom.btnAddNotebook.addEventListener('click', () => {
    dom.modalTitle.textContent = 'New Notebook';
    dom.modalInput.value = '';
    dom.notebookModal.style.display = 'flex';
    dom.modalInput.focus();
  });

  dom.modalCancelBtn.addEventListener('click', () => {
    dom.notebookModal.style.display = 'none';
  });

  dom.modalConfirmBtn.addEventListener('click', async () => {
    const name = dom.modalInput.value.trim();
    if (!name) return;
    const created = await window.notedAPI.createNotebook(name);
    state.notebooks.push(created);
    dom.notebookModal.style.display = 'none';
    renderNotebooks();
    setActiveView(`notebook:${created.id}`);
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

  dom.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderNotesList();
    window.notedAPI.saveSettings({ sortBy: state.sortBy });
  });

  dom.btnNewNote.addEventListener('click', createNewNote);
  dom.btnEmptyCreate.addEventListener('click', createNewNote);
  dom.btnEmptyTrash.addEventListener('click', emptyTrash);
  dom.btnStarNote.addEventListener('click', togglePinCurrentNote);
  dom.btnDuplicateNote.addEventListener('click', duplicateCurrentNote);
  dom.btnDeleteNote.addEventListener('click', deleteCurrentNote);
  dom.btnRestoreNote.addEventListener('click', restoreCurrentNote);

  dom.noteTitle.addEventListener('input', triggerAutoSave);
  dom.noteNotebookSelect.addEventListener('change', triggerAutoSave);

  dom.noteBody.addEventListener('input', () => {
    if (state.isSyncing) return;
    updatePreviewFromMarkdown();
    updateStats(dom.noteBody.value);
    triggerAutoSave();
  });

  dom.notePreviewContent.addEventListener('input', () => {
    if (state.isSyncing) return;
    updateMarkdownFromVisual();
  });

  dom.notePreviewContent.addEventListener('change', (e) => {
    if (e.target && e.target.type === 'checkbox') {
      const li = e.target.closest('.task-item');
      if (li) li.classList.toggle('task-done', e.target.checked);
      updateMarkdownFromVisual();
    }
  });

  dom.addTagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addTagToCurrentNote(dom.addTagInput.value);
      dom.addTagInput.value = '';
    }
  });

  dom.btnViewEdit.addEventListener('click', () => setViewMode('edit'));
  dom.btnViewSplit.addEventListener('click', () => setViewMode('split'));
  dom.btnViewPreview.addEventListener('click', () => setViewMode('preview'));

  dom.btnToggleOutline.addEventListener('click', () => {
    state.outlineOpen = !state.outlineOpen;
    dom.outlineDrawer.style.display = state.outlineOpen ? 'flex' : 'none';
    if (state.outlineOpen) renderOutline();
  });

  dom.btnCloseOutline.addEventListener('click', () => {
    state.outlineOpen = false;
    dom.outlineDrawer.style.display = 'none';
  });

  dom.btnThemeToggle.addEventListener('click', toggleTheme);
  dom.btnToggleFocus.addEventListener('click', toggleFocusMode);

  dom.btnExportDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = dom.exportMenu.style.display === 'block';
    dom.exportMenu.style.display = isShown ? 'none' : 'block';
  });

  document.addEventListener('click', () => {
    dom.exportMenu.style.display = 'none';
  });

  document.querySelectorAll('[data-export]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleExport(btn.getAttribute('data-export'));
    });
  });

  dom.editorToolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tool-btn');
    if (!btn || btn.id === 'btn-open-guide') return;
    const action = btn.getAttribute('data-action');
    if (action) applyToolbarAction(action);
  });

  dom.btnOpenGuide.addEventListener('click', () => dom.guideModal.style.display = 'flex');
  dom.guideCloseBtn.addEventListener('click', () => dom.guideModal.style.display = 'none');
  dom.guideOkBtn.addEventListener('click', () => dom.guideModal.style.display = 'none');

  dom.noteStatsBtn.addEventListener('click', () => dom.statsModal.style.display = 'flex');
  dom.statsCloseBtn.addEventListener('click', () => dom.statsModal.style.display = 'none');
  dom.statsOkBtn.addEventListener('click', () => dom.statsModal.style.display = 'none');

  dom.btnShortcutsModal.addEventListener('click', () => dom.shortcutsModal.style.display = 'flex');
  dom.shortcutsCloseBtn.addEventListener('click', () => dom.shortcutsModal.style.display = 'none');
  dom.shortcutsOkBtn.addEventListener('click', () => dom.shortcutsModal.style.display = 'none');

  window.addEventListener('keydown', (e) => {
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;

    if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      createNewNote();
    } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      dom.btnAddNotebook.click();
    } else if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      dom.searchInput.focus();
    } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      toggleFocusMode();
    } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      togglePinCurrentNote();
    } else if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateCurrentNote();
    } else if (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      dom.btnToggleOutline.click();
    } else if (isCmdOrCtrl && e.key === '1') {
      e.preventDefault();
      setViewMode('edit');
    } else if (isCmdOrCtrl && e.key === '2') {
      e.preventDefault();
      setViewMode('split');
    } else if (isCmdOrCtrl && e.key === '3') {
      e.preventDefault();
      setViewMode('preview');
    } else if (e.key === '?' && !['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
      dom.shortcutsModal.style.display = 'flex';
    } else if (e.key === 'Escape') {
      dom.guideModal.style.display = 'none';
      dom.statsModal.style.display = 'none';
      dom.shortcutsModal.style.display = 'none';
      dom.notebookModal.style.display = 'none';
      dom.exportMenu.style.display = 'none';
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRelativeDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const days = Math.floor(h / 24);

  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

document.addEventListener('DOMContentLoaded', init);
