/**
 * store.test.js - Comprehensive test suite for Noted storage engine
 * Run with: npm test
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Store, extractTags } = require('./store');

const testFilePath = path.join(__dirname, '../../noted-data.test.json');

// Clean up any old test file
if (fs.existsSync(testFilePath)) {
  fs.unlinkSync(testFilePath);
}

console.log('🧪 Starting Noted Store tests...');

const store = new Store(testFilePath);

// Test 1: First load initializes default data with settings
console.log('Test 1: Initializing store with default data...');
const initialData = store.load();
assert.strictEqual(Array.isArray(initialData.notebooks), true, 'Notebooks should be an array');
assert.strictEqual(Array.isArray(initialData.notes), true, 'Notes should be an array');
assert.strictEqual(initialData.notebooks.length >= 3, true, 'Should have at least 3 starter notebooks');
assert.strictEqual(initialData.notes.length >= 1, true, 'Should have starter notes');
assert.strictEqual(typeof initialData.settings, 'object', 'Settings should be present');
console.log('✅ Test 1 Passed: Initial data loaded correctly');

// Test 2: Creating a new note with automatic hashtag detection
console.log('Test 2: Creating note with tag extraction...');
const createdNote = store.saveNote({
  title: 'Engineering Review #dev #sprint',
  body: 'Meeting notes discussing the upcoming release #launch',
  notebookId: initialData.notebooks[0].id
});
assert.strictEqual(typeof createdNote.id, 'string', 'Created note should have an ID');
assert.strictEqual(createdNote.tags.includes('dev'), true, 'Should extract #dev tag');
assert.strictEqual(createdNote.tags.includes('sprint'), true, 'Should extract #sprint tag');
assert.strictEqual(createdNote.tags.includes('launch'), true, 'Should extract #launch tag');
console.log('✅ Test 2 Passed: Note created with extracted tags');

// Test 3: Pinning / Star note toggle
console.log('Test 3: Toggling pin on note...');
const pinnedNote = store.togglePin(createdNote.id);
assert.strictEqual(pinnedNote.isPinned, true, 'Note should be pinned');
const unpinnedNote = store.togglePin(createdNote.id);
assert.strictEqual(unpinnedNote.isPinned, false, 'Note should be unpinned');
console.log('✅ Test 3 Passed: Note pin toggle works');

// Test 4: Duplicate note
console.log('Test 4: Duplicating note...');
const clonedNote = store.duplicateNote(createdNote.id);
assert.notStrictEqual(clonedNote.id, createdNote.id, 'Clone should have a different ID');
assert.strictEqual(clonedNote.title.includes('(Copy)'), true, 'Clone title should have copy indicator');
console.log('✅ Test 4 Passed: Note duplication works');

// Test 5: Soft-delete to Trash and Restore
console.log('Test 5: Soft-delete and restore note...');
store.deleteNote(clonedNote.id); // Moves to trash
let data = store.load();
let foundCloned = data.notes.find((n) => n.id === clonedNote.id);
assert.strictEqual(foundCloned.isTrash, true, 'Deleted note should be flagged as trash');

store.restoreNote(clonedNote.id); // Restores note
data = store.load();
foundCloned = data.notes.find((n) => n.id === clonedNote.id);
assert.strictEqual(foundCloned.isTrash, false, 'Restored note should not be in trash');

// Permanent delete
store.deleteNote(clonedNote.id, true);
data = store.load();
foundCloned = data.notes.find((n) => n.id === clonedNote.id);
assert.strictEqual(foundCloned, undefined, 'Permanent delete should remove note completely');
console.log('✅ Test 5 Passed: Trash and restore operations work');

// Test 6: Notebook management
console.log('Test 6: Notebook operations...');
const newNb = store.createNotebook('Deep Work 🎯');
assert.strictEqual(newNb.name, 'Deep Work 🎯');
const renamed = store.renameNotebook(newNb.id, 'Deep Work & Research');
assert.strictEqual(renamed.name, 'Deep Work & Research');
console.log('✅ Test 6 Passed: Notebook operations work');

// Test 7: Settings persistence
console.log('Test 7: Settings persistence...');
const updatedSettings = store.saveSettings({ theme: 'dark', sortBy: 'title' });
assert.strictEqual(updatedSettings.theme, 'dark');
assert.strictEqual(updatedSettings.sortBy, 'title');
console.log('✅ Test 7 Passed: Settings persistence works');

// Clean up test file
if (fs.existsSync(testFilePath)) {
  fs.unlinkSync(testFilePath);
}

console.log('\n🎉 All store tests passed successfully!');
