# Testing the Onboarding Screen

## Quick Test Methods

### Method 1: Clear localStorage (Recommended)

1. **Start the app in development mode:**
   ```bash
   npm start
   ```

2. **Open Developer Tools** (if not already open):
   - Press `Cmd+Option+I` (macOS) or `Ctrl+Shift+I` (Windows/Linux)
   - Or use the menu if available

3. **Clear the onboarding flag:**
   - Open the Console tab
   - Run this command:
     ```javascript
     localStorage.removeItem('hasCompletedOnboarding');
     ```
   - Refresh the app (the onboarding should appear)

4. **Test the onboarding:**
   - Click "Get Started" - should navigate to home
   - Or click "Skip" - should navigate to home
   - Verify the onboarding doesn't show again after completing it

### Method 2: Test via Sidebar Button

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Navigate to the home screen** (if onboarding was already completed)

3. **Click the "Onboarding" button** in the sidebar footer
   - This should reset the flag and show onboarding again

### Method 3: Fresh Install Simulation

1. **Close the app completely**

2. **Clear Electron's user data** (simulates fresh install):
   ```bash
   # On macOS
   rm -rf ~/Library/Application\ Support/Command\ Pad
   
   # On Windows
   # Navigate to: %APPDATA%\Command Pad
   # Delete the folder
   
   # On Linux
   rm -rf ~/.config/Command\ Pad
   ```

3. **Start the app:**
   ```bash
   npm start
   ```

4. **Verify onboarding appears**

## Testing Checklist

- [ ] Onboarding screen appears on first launch
- [ ] "Get Started" button navigates to home
- [ ] "Skip" button navigates to home
- [ ] Onboarding doesn't show again after completion
- [ ] "Onboarding" button in sidebar resets and shows onboarding
- [ ] All three feature cards display correctly (Git Pad, System Pad, Project Pad)
- [ ] Window controls (minimize, close) work
- [ ] Responsive design works (if testing on different window sizes)
- [ ] Styling matches the app's cyberpunk theme

## Testing in Production Build

To test the onboarding in a production build:

1. **Build the app:**
   ```bash
   npm run package
   ```

2. **Install the built app** (from `release/build/`)

3. **Launch it** - onboarding should appear on first launch

4. **To test again**, delete the app's user data folder (see Method 3 above)

## Debugging Tips

If onboarding doesn't appear:

1. **Check localStorage:**
   ```javascript
   // In DevTools Console
   console.log(localStorage.getItem('hasCompletedOnboarding'));
   // Should be null or 'false' for onboarding to show
   ```

2. **Check console for errors:**
   - Look for any React errors
   - Check for routing issues

3. **Verify the route:**
   - The initial route should be `/onboarding` if `hasCompletedOnboarding` is not 'true'
   - Check the URL/route in React DevTools

