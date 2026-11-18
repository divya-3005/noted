/**
 * store.test.js - Simple test suite for store operations
 * Run with: npm test
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Store } = require('./store');

const testFilePath = path.join(__dirname, '../../noted-data.test.json');

// Clean up any old test file
if (fs.existsSync(testFilePath)) {
  fs.unlinkSync(testFilePath);
}

console.log('🧪 Starting Noted Store tests...');

const store = new Store(testFilePath);

// Test 1: First load should initialize default data
console.log('Test 1: Initializing store with default data...');
const initialData = store.load();
assert.strictEqual(Array.isArray(initialData.notebooks), true, 'Notebooks should be an array');
assert.strictEqual(Array.isArray(initialData.notes), true, 'Notes should be an array');
assert.strictEqual(initialData.notebooks.length >= 3, true, 'Should have at least 3 starter notebooks');
assert.strictEqual(initialData.notes.length >= 3, true, 'Should have at least 3 starter notes');
console.log('✅ Test 1 Passed: Initial data loaded correctly');

// Test 2: Creating a new note
console.log('Test 2: Creating a new note...');
const createdNote = store.saveNote({
  title: 'My Test Note',
  body: 'Hello world from tests!',
  notebookId: initialData.notebooks[0].id
});
assert.strictEqual(typeof createdNote.id, 'string', 'Created note should have an ID');
assert.strictEqual(createdNote.title, 'My Test Note');
assert.strictEqual(createdNote.body, 'Hello world from tests!');
console.log('✅ Test 2 Passed: Note created');

// Test 3: Updating an existing note
console.log('Test 3: Updating note...');
const updatedNote = store.saveNote({
  id: createdNote.id,
  title: 'Updated Note Title',
  body: 'Updated body content'
});
assert.strictEqual(updatedNote.id, createdNote.id);
assert.strictEqual(updatedNote.title, 'Updated Note Title');
assert.strictEqual(updatedNote.body, 'Updated body content');
console.log('✅ Test 3 Passed: Note updated');

// Test 4: Creating a notebook
console.log('Test 4: Creating a new notebook...');
const newNb = store.createNotebook('Test Notebook 🔬');
assert.strictEqual(newNb.name, 'Test Notebook 🔬');
assert.strictEqual(typeof newNb.id, 'string');
console.log('✅ Test 4 Passed: Notebook created');

// Test 5: Renaming a notebook
console.log('Test 5: Renaming notebook...');
const renamedNb = store.renameNotebook(newNb.id, 'Renamed Notebook ✨');
assert.strictEqual(renamedNb.name, 'Renamed Notebook ✨');
console.log('✅ Test 5 Passed: Notebook renamed');

// Test 6: Deleting a note
console.log('Test 6: Deleting note...');
store.deleteNote(createdNote.id);
const dataAfterDelete = store.load();
const found = dataAfterDelete.notes.find((n) => n.id === createdNote.id);
assert.strictEqual(found, undefined, 'Deleted note should no longer exist');
console.log('✅ Test 6 Passed: Note deleted');

// Clean up test file
if (fs.existsSync(testFilePath)) {
  fs.unlinkSync(testFilePath);
}

console.log('\n🎉 All store tests passed successfully!');