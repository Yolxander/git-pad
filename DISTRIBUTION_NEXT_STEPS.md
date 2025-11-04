# Distribution Next Steps

## Pre-Distribution Checklist

### 1. Update App Metadata

Before building, update these in `package.json`:

```json
{
  "name": "command-pad",  // Change from "electron-react-boilerplate"
  "version": "1.0.0",      // Already set
  "description": "Your app description here",
  "author": {
    "name": "Your Name",
    "email": "your.email@example.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/command-pad.git"
  },
  "homepage": "https://github.com/yourusername/command-pad#readme"
}
```

### 2. Update Build Configuration

In `package.json`, update the `build.publish` section:

```json
"publish": {
  "provider": "github",
  "owner": "yourusername",
  "repo": "command-pad"
}
```

### 3. Update Icons and Assets

Ensure all icons are in place:
- ✅ `assets/command-pad-logo.icns` (macOS)
- ✅ `assets/icon.ico` (Windows)
- ✅ `assets/icon.png` (Linux)

## Step-by-Step Distribution Process

### Step 1: Test the App Thoroughly

```bash
# Run in development
npm start

# Test all features:
# - Onboarding screen
# - Git Pad functionality
# - System Pad functionality
# - Project Pad functionality
# - All navigation
```

### Step 2: Build for Your Platform

**For macOS:**
```bash
npm run dist:mac
```

**For Windows:**
```bash
npm run dist:win
```

**For Linux:**
```bash
npm run dist:linux
```

**For all platforms** (requires cross-platform setup):
```bash
npm run dist:all
```

The built files will be in `release/build/`:
- macOS: `Command Pad-1.0.0-mac.dmg` and `Command Pad-1.0.0-mac-arm64.dmg`
- Windows: `Command Pad Setup 1.0.0.exe`
- Linux: `Command Pad-1.0.0.AppImage`

### Step 3: Test the Built Application

**macOS:**
1. Open the `.dmg` file
2. Drag to Applications
3. Launch from Applications
4. Verify onboarding appears on first launch
5. Test all features

**Windows:**
1. Run the `.exe` installer
2. Complete installation
3. Launch from Start menu
4. Verify onboarding appears on first launch
5. Test all features

**Linux:**
1. Make executable: `chmod +x Command\ Pad-*.AppImage`
2. Run: `./Command\ Pad-*.AppImage`
3. Verify onboarding appears on first launch
4. Test all features

### Step 4: Choose Distribution Method

#### Option A: GitHub Releases (Recommended)

1. **Create a GitHub release:**
   ```bash
   # Tag the release
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **Go to GitHub:**
   - Navigate to your repository
   - Click "Releases" → "Draft a new release"
   - Select tag `v1.0.0`
   - Upload files from `release/build/`
   - Add release notes
   - Publish

3. **Auto-updates** will work if you configure `electron-updater` properly

#### Option B: Direct File Sharing

1. Upload files to:
   - Google Drive
   - Dropbox
   - WeTransfer
   - Your own server

2. Share download links

#### Option C: App Stores (Optional)

**macOS App Store:**
- Requires Apple Developer account ($99/year)
- Follow Apple's guidelines
- Use `electron-builder` with `mac.target: ["mas"]`

**Microsoft Store:**
- Requires Microsoft Developer account
- Use `electron-builder` with `win.target: ["appx"]`

**Snap Store (Linux):**
- Use `electron-builder` with `linux.target: ["snap"]`

### Step 5: Code Signing (Recommended for Production)

**macOS:**
1. Get Apple Developer account
2. Create certificates in Apple Developer portal
3. Update `package.json`:
   ```json
   "mac": {
     "identity": "Developer ID Application: Your Name (TEAM_ID)",
     "notarize": true
   }
   ```
4. Set environment variables:
   ```bash
   export APPLE_ID="your.apple.id@email.com"
   export APPLE_ID_PASS="your-app-specific-password"
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   ```

**Windows:**
1. Get code signing certificate
2. Update `package.json`:
   ```json
   "win": {
     "certificateFile": "path/to/certificate.pfx",
     "certificatePassword": "certificate-password"
   }
   ```

### Step 6: Create Release Notes

Create a `CHANGELOG.md` or release notes:

```markdown
# Version 1.0.0

## Features
- Initial release
- Onboarding screen for first-time users
- Git Pad functionality
- System Pad functionality
- Project Pad functionality

## Installation
- macOS: Download the .dmg file and drag to Applications
- Windows: Run the .exe installer
- Linux: Make AppImage executable and run
```

### Step 7: Update Documentation

Update these files:
- ✅ `README.md` - Add installation instructions
- ✅ `DISTRIBUTION.md` - Already updated
- ✅ `CHANGELOG.md` - Document version changes

### Step 8: Set Up Auto-Updates (Optional)

If using GitHub Releases with auto-updates:

1. Ensure `electron-updater` is configured in `main.ts`
2. Set `publish` configuration in `package.json`
3. Test update mechanism:
   - Release version 1.0.0
   - Release version 1.0.1
   - Verify app checks for updates

## Post-Distribution Tasks

### 1. Monitor Feedback
- GitHub Issues
- User feedback channels
- Analytics (if implemented)

### 2. Plan Updates
- Bug fixes
- Feature requests
- Version roadmap

### 3. Marketing (Optional)
- Product announcement
- Social media posts
- Blog post
- Demo video

## Troubleshooting Distribution Issues

### Build Fails
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run dist:mac  # or your platform
```

### Code Signing Issues
- Verify certificates are valid
- Check environment variables
- Review electron-builder logs

### Users Can't Install
- Provide clear installation instructions
- Include troubleshooting guide
- Consider code signing for easier installation

## Quick Reference Commands

```bash
# Development
npm start

# Build for current platform
npm run package

# Build for specific platform
npm run dist:mac
npm run dist:win
npm run dist:linux

# Build for all platforms
npm run dist:all

# Test onboarding
# In DevTools: localStorage.removeItem('hasCompletedOnboarding')
```

## Next Actions

1. ✅ Test onboarding screen (see TESTING_ONBOARDING.md)
2. ⬜ Update package.json metadata
3. ⬜ Build for your target platform
4. ⬜ Test the built application
5. ⬜ Choose distribution method
6. ⬜ Set up code signing (optional but recommended)
7. ⬜ Create GitHub release or upload files
8. ⬜ Share with users!

