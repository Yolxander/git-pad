# Quick Start Guide - Build & Distribute Git Pad

## For End Users (Download Ready-to-Use App)

If you just want to use Git Pad, look for pre-built releases:
- Check GitHub Releases for download links
- Or ask the developer for the latest build

## For Developers (Build from Source)

### Prerequisites

- Node.js >= 14.x
- npm >= 7.x
- Git (for cloning)

### Step 1: Clone and Install

```bash
git clone https://github.com/your-username/git-pad.git
cd git-pad
npm install
```

### Step 2: Run in Development

```bash
npm start
```

### Step 3: Build for Distribution

```bash
npm run package
```

The built files will be in `release/build/`:
- macOS: `.dmg` file
- Windows: `.exe` installer  
- Linux: `.AppImage` file

### Step 4: Distribute

**Option A: Upload to Cloud Storage**
1. Upload files from `release/build/` to Google Drive, Dropbox, etc.
2. Share the download link

**Option B: GitHub Releases**
1. Create a new GitHub release
2. Upload the files from `release/build/`
3. Share the release link

**Option C: Your Own Server**
1. Upload files to your web server
2. Create a downloads page
3. Share the URL

## That's It! 🎉

Your users can now download and install Git Pad on their computers.

For detailed instructions, see:
- [README.md](README.md) - Full documentation
- [DISTRIBUTION.md](DISTRIBUTION.md) - Detailed distribution guide

