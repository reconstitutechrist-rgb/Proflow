# Testing Phase 1 - Document Workshop

## Pre-Flight Checklist

### ✅ Files Created

- [x] `DocumentWorkshop.jsx` (1,011 lines)
- [x] Route added to `index.jsx`
- [x] Imported all required components

### ✅ Dependencies Required

All imports are from existing components:

- ✅ UI components (Button, Input, Card, etc.)
- ✅ React Router (useNavigate, useSearchParams)
- ✅ API entities (Document, Assignment, Task)
- ✅ Existing components (OutlineGenerator, AIReviewPanel, etc.)
- ✅ Workspace context
- ✅ Framer Motion (for animations)

---

## Testing Instructions

### 1. **Start the Application**

```bash
# Option 1: If vite is available
npm run dev

# Option 2: If using different build tool
npm start

# Option 3: Check package.json for correct command
cat package.json | grep -A 5 "scripts"
```

### 2. **Navigate to Document Workshop**

Once the app is running, go to:

```
http://localhost:5173/DocumentWorkshop
```

(Or whatever port your app uses - check the terminal output)

---

## Test Cases for Phase 1

### Test 1: Welcome Screen Display ✨

**Expected Result:**

- [ ] Welcome screen shows with gradient background (indigo → purple → pink)
- [ ] Three main cards are displayed:
  - ✨ Quick Generate (blue gradient)
  - 📝 Blank Document (purple gradient)
  - 📂 Open Existing (green gradient)
- [ ] Recent Documents section appears (if you have documents)
- [ ] Pro tip at bottom mentions Ctrl+K
- [ ] All cards have hover effect (scale up slightly)
- [ ] Animations are smooth (fade in from bottom)

**How to Test:**

1. Open `/DocumentWorkshop`
2. Verify all visual elements appear
3. Hover over each card - should scale and show shadow
4. Check if recent documents list shows (if available)

**Screenshot Checklist:**

- Large "Document Workshop" heading with icon
- 3 cards in a row (responsive grid on mobile)
- Clean, modern design

---

### Test 2: Template Selection Flow 📋

**Steps:**

1. Click "✨ Quick Generate" card on welcome screen
2. Should navigate to template selector

**Expected Result:**

- [ ] Page transitions with smooth animation
- [ ] Back button appears at top left
- [ ] "Choose a Template" heading displayed
- [ ] 4 template cards in 2x2 grid:
  - Assignment Brief (blue)
  - Technical Specification (purple)
  - Project Plan (green)
  - Status Report (orange)
- [ ] "Create Custom Document" option with dashed border
- [ ] Each card shows icon, title, description

**Interaction Tests:**

- [ ] Click on a template card
  - Should show checkmark ✓
  - Border changes to indigo
  - Background becomes light indigo
- [ ] Click another template
  - Previous selection cleared
  - New one selected
- [ ] "Continue" button appears at bottom right
- [ ] "Open Wizard" button in custom document card works

**Edge Cases:**

- [ ] Can navigate back using Back button
- [ ] Selection persists when clicking Continue
- [ ] Cards are responsive on mobile (stack vertically)

---

### Test 3: Quick Generate Customization 🎯

**Steps:**

1. Select a template (e.g., "Assignment Brief")
2. Click "Continue" button
3. Should navigate to customization page

**Expected Result:**

- [ ] Back button goes to template selector
- [ ] Heading shows: "Customize Your [Template Name]"
- [ ] Form fields displayed:
  - Document Title (pre-filled intelligently)
  - Link to Assignment (dropdown, optional)
  - Custom Prompt (large textarea, pre-filled with template prompt)
  - Reference Materials upload button
  - Generate tasks checkbox (checked by default)
  - Notify team checkbox (unchecked by default)
- [ ] "Generate Document" button at bottom (gradient indigo→purple)

**Form Interaction Tests:**

**A. Title Field:**

- [ ] Pre-filled with template name + "for Project"
- [ ] Can edit the title
- [ ] Title updates in real-time

**B. Assignment Dropdown:**

- [ ] Shows "No Assignment" option
- [ ] Lists all available assignments
- [ ] Can select an assignment
- [ ] Can clear selection back to "No Assignment"

**C. Custom Prompt:**

- [ ] Pre-filled with template-specific prompt
- [ ] Can edit the prompt
- [ ] Has helpful placeholder text
- [ ] Shows tip: "💡 The more details you provide..."

**D. Upload Button:**

- [ ] "Upload Files" button visible
- [ ] Click opens file picker
- [ ] Accepts: .pdf, .doc, .docx, .txt, .md

**E. Checkboxes:**

- [ ] Generate tasks checkbox toggles
- [ ] Notify team checkbox toggles
- [ ] Labels are clickable

**F. Generate Button:**

- [ ] Disabled when title empty
- [ ] Disabled when prompt empty
- [ ] Shows loading state when clicked ("Generating...")
- [ ] Shows spinner icon when generating

---

### Test 4: Document Generation (AI Integration) 🤖

**Steps:**

1. Fill in all required fields
2. Click "Generate Document"

**Expected Result:**

- [ ] Button shows loading state
- [ ] Spinner animates
- [ ] Text changes to "Generating your document..."
- [ ] After AI response:
  - Toast notification: "Document generated!"
  - Navigates to Editor mode
  - Content is populated with AI-generated text

**Error Handling:**

- [ ] If title empty: Toast shows "Please fill in all required fields"
- [ ] If prompt empty: Toast shows "Please fill in all required fields"
- [ ] If AI fails: Toast shows "Failed to generate document"
- [ ] Generate button re-enables after error

---

### Test 5: Blank Document Creation 📝

**Steps:**

1. From welcome screen, click "📝 Blank Document"

**Expected Result:**

- [ ] Navigates directly to Editor mode
- [ ] Title set to "Untitled Document"
- [ ] Content area is empty
- [ ] Ready to start typing

---

### Test 6: Navigation & Flow 🔄

**Test Complete Flow:**

1. Welcome → Quick Generate → Template Select → Customize → Generate → Editor
2. At each step, verify Back button works
3. Verify state persists when going back

**Navigation Tests:**

- [ ] Back from Template Select → Welcome screen
- [ ] Back from Customize → Template Select (keeps selection)
- [ ] Browser back button works
- [ ] URL updates correctly at each step

---

### Test 7: Keyboard Shortcuts ⌨️

**Available Shortcuts:**

- `Ctrl/Cmd + K` - Open command palette (placeholder for now)
- `Ctrl/Cmd + S` - Save document (in Editor mode)
- `Ctrl/Cmd + /` - Toggle AI panel (in Editor mode)
- `Escape` - Close command palette

**Test Each:**

- [ ] Press Ctrl+K anywhere
- [ ] Verify shortcut hint shows in welcome screen
- [ ] Shortcuts don't interfere with normal typing

---

### Test 8: Responsive Design 📱

**Desktop (>768px):**

- [ ] Welcome cards in 3-column grid
- [ ] Template cards in 2x2 grid
- [ ] All text readable
- [ ] Spacing looks good

**Tablet (768px):**

- [ ] Welcome cards still 3 columns or 2 columns
- [ ] Template cards in 2 columns
- [ ] Form fields full width

**Mobile (<768px):**

- [ ] Welcome cards stack vertically (1 column)
- [ ] Template cards stack vertically
- [ ] Form fields full width
- [ ] Buttons full width
- [ ] Text size appropriate
- [ ] Touch targets large enough (44px min)

**Test by:**

- Resizing browser window
- Using browser dev tools device emulation
- Testing on actual mobile device

---

### Test 9: Animations & Performance 🎬

**Animation Tests:**

- [ ] Welcome screen fades in smoothly
- [ ] Cards have hover effect (scale 1.02)
- [ ] Cards have tap effect (scale 0.98)
- [ ] Page transitions smooth
- [ ] Continue button appears with fade-in animation
- [ ] Selection checkmark appears smoothly

**Performance Tests:**

- [ ] No lag when hovering cards
- [ ] Smooth scrolling
- [ ] Quick page transitions
- [ ] No console errors
- [ ] No memory leaks

---

### Test 10: Error States & Edge Cases 🚨

**No Workspace Selected:**

- [ ] Component handles missing workspace
- [ ] Shows appropriate message
- [ ] Doesn't crash

**No Assignments:**

- [ ] Dropdown shows "No Assignment" only
- [ ] Form still works
- [ ] Can generate without assignment

**No Recent Documents:**

- [ ] Recent section doesn't show
- [ ] Welcome screen still looks good
- [ ] No errors

**AI Generation Fails:**

- [ ] Error toast shown
- [ ] User can retry
- [ ] Form data preserved
- [ ] Button re-enables

**Network Issues:**

- [ ] Graceful degradation
- [ ] Error messages shown
- [ ] User can retry

---

## Browser Console Checklist

Open browser DevTools (F12) and check:

### Console Tab:

- [ ] No JavaScript errors
- [ ] No React warnings
- [ ] No 404s for imports
- [ ] No CORS errors

### Network Tab:

- [ ] API calls working (when generating)
- [ ] No failed requests
- [ ] Reasonable load times

### Elements Tab:

- [ ] HTML structure looks correct
- [ ] CSS classes applied
- [ ] Animations working

### Performance Tab:

- [ ] No performance warnings
- [ ] Smooth 60fps animations
- [ ] No layout thrashing

---

## Known Limitations (Phase 1)

These are intentionally not implemented yet:

- ❌ **Editor Mode**: Placeholder only (coming in Phase 2)
- ❌ **Preview Mode**: Not yet built
- ❌ **Command Palette**: Shortcut registered but not functional
- ❌ **AI Copilot**: Will be added in Phase 2
- ❌ **Save Functionality**: Basic save exists, full version in Phase 2
- ❌ **Reference Document Display**: Upload works, display pending

---

## Common Issues & Solutions

### Issue: "vite: not found"

**Solution:**

```bash
npm install
npm run dev
```

### Issue: Page shows blank

**Possible causes:**

1. Check console for errors
2. Verify all imports exist
3. Check WorkspaceContext is available
4. Ensure API client is configured

### Issue: Animations not smooth

**Solution:**

- Check Framer Motion is installed: `npm list framer-motion`
- Verify browser supports CSS transforms
- Check CPU usage isn't maxed

### Issue: "Cannot find module..."

**Solution:**

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Issue: Styles not applied

**Solution:**

- Check Tailwind CSS is configured
- Verify all UI components exist in components/ui/
- Check CSS imports in index

---

## Success Criteria

Phase 1 is successful if:

✅ **Core Functionality:**

- [x] Welcome screen displays correctly
- [x] Can navigate to template selector
- [x] Can select templates
- [x] Can customize generation settings
- [x] Can trigger AI generation
- [x] Can create blank document

✅ **UI/UX:**

- [x] Animations are smooth
- [x] Responsive on all screen sizes
- [x] Hover effects work
- [x] Navigation is intuitive
- [x] Loading states display

✅ **Technical:**

- [x] No console errors
- [x] All imports resolve
- [x] State management works
- [x] Routing works
- [x] API integration works (for generation)

---

## Next: Phase 2 Preview

Once Phase 1 is tested and working, Phase 2 will add:

1. **Rich Text Editor** with full formatting toolbar
2. **Split-Pane Layout** (Editor | AI Copilot)
3. **AI Copilot Sidebar** with 3 tabs
4. **Command Palette** (functional)
5. **Preview Mode**
6. **Export Options**
7. **Auto-Save** indicators
8. **Version History**

---

## Reporting Issues

If you find bugs, please note:

1. **What you did** (steps to reproduce)
2. **What you expected** to happen
3. **What actually happened**
4. **Browser console errors** (if any)
5. **Screenshot** (if visual issue)

Example:

```
ISSUE: Template selection doesn't persist
STEPS:
1. Click Quick Generate
2. Select Assignment Brief
3. Click Continue
4. Click Back
5. Template is no longer selected

EXPECTED: Template should stay selected
ACTUAL: No template selected

CONSOLE: No errors
```

---

## Testing Checklist Summary

Copy this for quick testing:

```
[ ] Welcome screen displays
[ ] Quick Generate navigation works
[ ] Template selector shows 4 templates
[ ] Can select template (visual feedback)
[ ] Continue button appears
[ ] Customize page displays
[ ] All form fields work
[ ] Generate button functional
[ ] AI generation works
[ ] Blank document works
[ ] Open existing navigates away
[ ] Back buttons work
[ ] Keyboard shortcuts registered
[ ] Responsive on mobile
[ ] No console errors
[ ] Animations smooth
```

---

## Ready to Test?

1. Start the dev server
2. Navigate to `/DocumentWorkshop`
3. Work through each test case
4. Report any issues
5. Celebrate if everything works! 🎉

Good luck testing! 🚀
