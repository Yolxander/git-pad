# Build & Distribute Command Pad for macOS

## Quick Start - Build for macOS

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build the macOS Application

```bash
npm run dist:mac
```

This command will:
- Clean previous builds
- Compile the TypeScript code
- Bundle the application
- Create a macOS DMG file in `release/build/`

### Step 3: Find Your Built Application

After building, check the `release/build/` directory. You'll find:
- **`Command Pad-{version}-mac.dmg`** - For Intel Macs (x64)
- **`Command Pad-{version}-mac-arm64.dmg`** - For Apple Silicon Macs (M1/M2/M3)

## How Users Install the App

### For End Users (Installation Instructions)

1. **Download the DMG file** from your distribution method
2. **Open the DMG file** (double-click it)
3. **Drag "Command Pad" to the Applications folder** (shown in the DMG window)
4. **Launch Command Pad** from Applications
5. **If you see a security warning:**
   - Go to **System Settings** → **Privacy & Security**
   - Scroll down to find the message about Command Pad
   - Click **"Open Anyway"**

## Distribution Options

### Option 1: Direct File Sharing (Easiest)

1. Build the app: `npm run dist:mac`
2. Upload the DMG files from `release/build/` to:
   - Google Drive
   - Dropbox
   - WeTransfer
   - Your own website/server
3. Share the download link with users

### Option 2: GitHub Releases (Recommended)

1. **Build the app:**
   ```bash
   npm run dist:mac
   ```

2. **Create a GitHub release:**
   ```bash
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

3. **Upload to GitHub:**
   - Go to your GitHub repository
   - Click **"Releases"** → **"Draft a new release"**
   - Select the tag (e.g., `v1.0.0`)
   - Upload both DMG files from `release/build/`
   - Add release notes
   - Click **"Publish release"**

### Option 3: Code Signing (For Production)

To avoid "unidentified developer" warnings, you need code signing:

1. **Get an Apple Developer account** ($99/year)
2. **Update your environment variables:**
   ```bash
   export APPLE_ID="your.apple.id@email.com"
   export APPLE_ID_PASS="your-app-specific-password"
   export APPLE_TEAM_ID="YOUR_TEAM_ID"
   ```

3. **Update `package.json`** to enable notarization:
   ```json
   "mac": {
     "notarize": true,
     "identity": "Developer ID Application: Your Name (TEAM_ID)"
   }
   ```

4. **Build again:**
   ```bash
   npm run dist:mac
   ```

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run dist:mac
```

### Missing Xcode Tools

```bash
xcode-select --install
```

### Check Build Output

The built files will be in:
```
release/build/
```

## Current Build Configuration

- **App Name:** Command Pad
- **App ID:** com.commandpad.app
- **Icon:** `assets/command-pad-logo.icns`
- **Output:** `release/build/`
- **Architectures:** arm64 (Apple Silicon) and x64 (Intel)

## Next Steps

1. ✅ Build: `npm run dist:mac`
2. ✅ Test the DMG file yourself
3. ✅ Upload to your distribution method
4. ✅ Share with users!

For more details, see [DISTRIBUTION.md](DISTRIBUTION.md)

