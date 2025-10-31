# Quick Test Setup for Document Workshop

## ⚠️ Setup Required First

Your `node_modules` directory is missing. You need to install dependencies before testing.

## Step 1: Install Dependencies

```bash
npm install
```

This will take a few minutes. You should see:
```
added XXX packages in XXs
```

## Step 2: Start Development Server

```bash
npm run dev
```

You should see output like:
```
VITE v6.1.x ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

## Step 3: Open Document Workshop

Open your browser and navigate to:
```
http://localhost:5173/DocumentWorkshop
```

(Or whatever URL vite shows in the terminal)

## Step 4: Follow Testing Guide

Once the app is running, follow the detailed testing guide in:
```
TESTING_PHASE1.md
```

---

## Quick Smoke Test (30 seconds)

Once the app is running, verify these 3 things work:

### ✅ Test 1: Welcome Screen (5 seconds)
- Open `/DocumentWorkshop`
- You should see:
  - Large "Document Workshop" heading
  - 3 colorful cards (Quick Generate, Blank, Open Existing)
  - Gradient background

### ✅ Test 2: Template Selection (10 seconds)
- Click "✨ Quick Generate"
- You should see:
  - 4 template cards
  - Can click to select (border turns blue, checkmark appears)
  - "Continue" button appears

### ✅ Test 3: Generation Form (15 seconds)
- Click "Continue" with a template selected
- You should see:
  - Title pre-filled
  - Large prompt textarea
  - "Generate Document" button
  - Can type in fields

**If all 3 work: ✅ Phase 1 is working!**

---

## Troubleshooting

### Error: "Cannot find module 'vite'"
```bash
# Delete everything and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Error: Port 5173 already in use
```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 5174
```

### Error: "React is not defined"
```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Browser shows blank page
1. Open DevTools (F12)
2. Check Console tab for errors
3. Look for red error messages
4. Share those errors for help

---

## Alternative: Quick Code Check (No Server Needed)

If you can't run the server, I can still help you:

1. **Static Code Analysis**
   - Check for syntax errors
   - Verify imports
   - Validate structure

2. **Manual Review**
   - Review component logic
   - Check state management
   - Validate routing

Just let me know what you'd prefer!

---

## Next Steps After Testing

Once Phase 1 is confirmed working:

1. **Report any bugs** you find
2. **Take screenshots** of working features
3. **Decide** if we proceed to Phase 2 or fix issues
4. **Phase 2** will add the rich text editor + AI copilot

---

## Need Help?

Let me know if you encounter:
- ❌ Installation errors
- ❌ Server won't start
- ❌ Blank pages
- ❌ Console errors
- ❌ Any other issues

I can help debug and fix! 🛠️
