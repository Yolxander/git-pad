# Distribution Guide for Git Pad

This guide explains how to build and distribute Git Pad to end users.

## Quick Start - Build for Distribution

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Build the Application

```bash
npm run package
```

This command will:
1. Clean previous builds
2. Build the main and renderer processes
3. Package the application using electron-builder
4. Create distributable files in `release/build/`

### Step 3: Find Your Built Application

After building, check the `release/build/` directory:

- **macOS**: `Git Pad-{version}-mac.dmg` and `Git Pad-{version}-mac-arm64.dmg` (for Apple Silicon)
- **Windows**: `Git Pad Setup {version}.exe`
- **Linux**: `Git Pad-{version}.AppImage`

## Distribution Methods

### Method 1: Direct File Sharing

1. Build the application: `npm run package`
2. Upload files to:
   - Google Drive
   - Dropbox
   - WeTransfer
   - Your own server
3. Share the download link

### Method 2: GitHub Releases (Recommended)

1. **Create a GitHub Release**:
   ```bash
   # Tag the release
   git tag -a v1.0.0 -m "Release version 1.0.0"
   git push origin v1.0.0
   ```

2. **Build the application**:
   ```bash
   npm run package
   ```

3. **Upload to GitHub**:
   - Go to your repository on GitHub
   - Click "Releases" → "Draft a new release"
   - Select the tag you created
   - Upload the files from `release/build/`:
     - `Git Pad-{version}-mac.dmg` (macOS)
     - `Git Pad Setup {version}.exe` (Windows)
     - `Git Pad-{version}.AppImage` (Linux)
   - Add release notes
   - Publish the release

### Method 3: Automated Distribution with GitHub Actions

Create `.github/workflows/release.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [macos-latest, windows-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run package
      
      - uses: softprops/action-gh-release@v1
        with:
          files: release/build/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Platform-Specific Instructions

### macOS Distribution

1. **Build the DMG**:
   ```bash
   npm run package
   ```

2. **Test the DMG**:
   - Double-click the `.dmg` file
   - Drag Git Pad to Applications
   - Launch from Applications

3. **Code Signing (Optional)**:
   To avoid "unidentified developer" warnings:
   - Get an Apple Developer account
   - Update `package.json` with your signing certificate
   - Set `notarize: true` in the build configuration

### Windows Distribution

1. **Build the Installer**:
   ```bash
   npm run package
   ```

2. **Test the Installer**:
   - Run the `.exe` file
   - Follow the installation wizard
   - Launch from Start menu

3. **Code Signing (Optional)**:
   - Get a code signing certificate
   - Configure electron-builder with certificate details

### Linux Distribution

1. **Build the AppImage**:
   ```bash
   npm run package
   ```

2. **Make it executable**:
   ```bash
   chmod +x "Git Pad-{version}.AppImage"
   ```

3. **Test**:
   ```bash
   ./Git\ Pad-{version}.AppImage
   ```

## User Installation Instructions

### For macOS Users

1. Download the `.dmg` file
2. Open the `.dmg` file (double-click)
3. Drag "Git Pad" to the Applications folder
4. Open Applications and launch Git Pad
5. If you see a security warning:
   - Go to System Preferences → Security & Privacy
   - Click "Open Anyway" next to the Git Pad message

### For Windows Users

1. Download the `.exe` installer
2. Run the installer
3. Follow the installation wizard
4. Launch Git Pad from the Start menu
5. If Windows Defender shows a warning:
   - Click "More info"
   - Click "Run anyway" (if you trust the source)

### For Linux Users

1. Download the `.AppImage` file
2. Make it executable:
   ```bash
   chmod +x Git-Pad-*.AppImage
   ```
3. Run it:
   ```bash
   ./Git-Pad-*.AppImage
   ```

## Version Management

### Updating the Version

1. Update version in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. Build and distribute the new version:
   ```bash
   npm run package
   ```

3. Update GitHub releases or your distribution method

## Troubleshooting Build Issues

### Build Fails with "electron-builder" Error

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run package
```

### macOS Build Fails

- Ensure you're on macOS to build for macOS
- Check Xcode command line tools: `xcode-select --install`

### Windows Build Fails

- Ensure you're on Windows to build for Windows
- Install Windows Build Tools if needed

### Linux Build Fails

- Install required dependencies:
  ```bash
  sudo apt-get install -y libnss3-dev libgconf-2-4 libxss1 libappindicator1 libindicator7
  ```

## Security Considerations

1. **Code Signing**: Consider code signing for production releases
2. **Virus Scanning**: Scan built files before distribution
3. **Checksums**: Provide SHA256 checksums for downloads
4. **HTTPS**: Always distribute over HTTPS

## Next Steps

1. ✅ Build the application: `npm run package`
2. ✅ Test on your platform
3. ✅ Upload to distribution method
4. ✅ Share download links with users
5. ✅ Collect feedback and iterate

---

For more information, see the main [README.md](README.md).

