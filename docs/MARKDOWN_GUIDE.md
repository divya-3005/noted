# 📝 Noted - Markdown Formatting Guide

This guide covers all Markdown formatting supported in Noted.

---

## 1. Headings
Use `#` symbols followed by a space:
```markdown
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6
```

---

## 2. Text Styling
```markdown
**Bold text** with `**bold**`
*Italic text* with `*italic*`
~~Strikethrough~~ with `~~strikethrough~~`
`Inline code` with backticks
```

---

## 3. Lists & Task Lists

### Bulleted Lists
```markdown
- First item
- Second item
  - Nested item
```

### Numbered Lists
```markdown
1. First step
2. Second step
3. Third step
```

### Interactive Checklists
```markdown
- [ ] Task to do
- [x] Completed task
```

---

## 4. Quotes & Callouts
```markdown
> "Simplicity is the soul of efficiency."
```

---

## 5. Code Blocks
Specify a language for syntax context:
````markdown
```javascript
function greet(name) {
  console.log(`Hello, ${name}!`);
}
greet('World');
```
````

---

## 6. Links & Images
```markdown
[Open GitHub](https://github.com)
![Example](https://via.placeholder.com/150)
```

---

## 7. Tables
```markdown
| Feature | Supported | Description |
| :--- | :---: | :--- |
| Markdown | ✅ | Full formatting |
| Live Sync | ✅ | Two-way editable |
| Auto-save | ✅ | Saved to local JSON |
```

---

## 8. Horizontal Divider
```markdown
---
```
