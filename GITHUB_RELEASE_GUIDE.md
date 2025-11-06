# Step-by-Step: Create GitHub Release & Upload DMG Files

This guide walks you through creating a GitHub Release and uploading your macOS app so users can download it.

## Prerequisites

1. Your code must be in a GitHub repository
2. You need to have the DMG files built (from `npm run dist:mac`)
3. You need write access to the repository

## Step 1: Build Your Application

First, make sure you have the DMG files ready:

```bash
# Navigate to your project directory
cd /Users/humancontact/Downloads/demos/nextjs/git-pad

# Build the macOS application
npm run dist:mac
```

This creates DMG files in `release/build/` directory.

## Step 2: Create a Git Tag (Optional but Recommended)

Tags help you track which code version corresponds to which release:

```bash
# Check your current version in package.json first
# Then create a tag (replace 1.0.0 with your actual version)
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push the tag to GitHub
git push origin v1.0.0
```

**Note:** If you haven't committed your latest changes, do that first:
```bash
git add .
git commit -m "Prepare for release v1.0.0"
git push origin main  # or your branch name
```

## Step 3: Create GitHub Release (Web Interface)

### 3a. Navigate to Releases

1. Go to your GitHub repository in a web browser
2. Click on the **"Releases"** link (usually on the right sidebar, or find it under "Code" tab)
3. You'll see a page that lists all releases. Click **"Draft a new release"** or **"Create a new release"** button

### 3b. Fill in Release Details

1. **Choose a tag:**
   - If you created a tag in Step 2, select it from the dropdown (e.g., `v1.0.0`)
   - If you didn't create a tag, click **"Choose a tag"** and type a new tag name (e.g., `v1.0.0`), then click **"Create new tag: v1.0.0 on publish"**

2. **Release title:**
   - Enter something like: `Command Pad v1.0.0` or `Release v1.0.0`

3. **Describe this release:**
   - Add release notes describing what's new, bug fixes, etc.
   - **Quick Template**: Copy and paste this into the description box:
     ```markdown
     # 🚀 Command Pad v1.0.0 - Initial Release
     
     ## ✨ What's New
     
     Command Pad is now available! Transform your command-line workflow into an intuitive, visual interface.
     
     ### 🐙 Git Pad
     - Execute Git commands with custom buttons
     - Visual command board organized by categories
     - Repository selection and management
     - Custom command creation with variable support
     
     ### 💻 System Pad
     - Run system commands and terminal operations
     - Organize commands by categories
     - Create custom shortcuts for frequently used commands
     
     ### 📁 Project Pad
     - Manage project-specific commands
     - Execute commands in project context
     - Quick project navigation
     
     ### 🎮 Pad Mode
     - Full-screen command execution mode
     - Customizable button grid layout
     - Keyboard shortcuts support
     
     ## 📥 Installation
     
     ### For macOS Users
     
     1. **Download the appropriate DMG file:**
        - **Intel Macs**: Download `Command Pad-1.0.0-mac.dmg`
        - **Apple Silicon (M1/M2/M3)**: Download `Command Pad-1.0.0-mac-arm64.dmg`
     
     2. **Install Command Pad:**
        - Open the downloaded DMG file (double-click)
        - Drag "Command Pad" to the Applications folder
        - Launch Command Pad from Applications
     
     3. **Security Note:**
        If you see a "Command Pad cannot be opened" message:
        - Go to **System Settings** → **Privacy & Security**
        - Scroll down to find the Command Pad message
        - Click **"Open Anyway"**
     
     ## 🎯 Getting Started
     
     1. **Git Pad**: Click to select a Git repository, then start creating custom Git command buttons
     2. **System Pad**: Create shortcuts for your most-used system commands
     3. **Project Pad**: Navigate to a project and set up project-specific commands
     4. **Pad Mode**: Click the pad mode button for full-screen command execution
     
     ## 📚 Documentation
     
     - Check out our [README.md](README.md) for full feature documentation
     - See [DISTRIBUTION.md](DISTRIBUTION.md) for detailed installation instructions
     ```
   - **For more templates**: See [RELEASE_NOTES_TEMPLATE.md](RELEASE_NOTES_TEMPLATE.md) for different release note templates

### 3c. Upload DMG Files

1. Scroll down to the **"Attach binaries"** section
2. Click **"Attach files by selecting them"** or drag and drop
3. Navigate to your `release/build/` folder and select:
   - `Command Pad-{version}-mac.dmg`
   - `Command Pad-{version}-mac-arm64.dmg`
4. Wait for the files to upload (you'll see progress indicators)

### 3d. Publish the Release

1. Review all the information
2. If everything looks good, click **"Publish release"** button
   - (Note: If you're not ready, you can click **"Save draft"** and come back later)

## Step 4: Share the Release Link

Once published, GitHub will show you the release page. You can:

1. **Copy the release URL** - Share this link with users
   - Example: `https://github.com/yourusername/git-pad/releases/tag/v1.0.0`

2. **Direct download links** - Users can download directly:
   - Example: `https://github.com/yourusername/git-pad/releases/download/v1.0.0/Command-Pad-1.0.0-mac.dmg`

## Alternative: Create Release via Command Line

If you prefer using the command line, you can use GitHub CLI:

### Install GitHub CLI (if not installed)

```bash
# macOS
brew install gh

# Login
gh auth login
```

### Create Release via CLI

```bash
# Create release and upload files
gh release create v1.0.0 \
  --title "Command Pad v1.0.0" \
  --notes "Initial release of Command Pad" \
  release/build/Command\ Pad-*.dmg
```

Or create a draft first:

```bash
gh release create v1.0.0 \
  --title "Command Pad v1.0.0" \
  --notes "Initial release" \
  --draft \
  release/build/Command\ Pad-*.dmg
```

## Step 5: Test the Download

1. Open the release page in an incognito/private browser window
2. Click on one of the DMG files to download
3. Test installing it on a Mac to make sure everything works

## Updating a Release

If you need to update the release:

1. Go to the release page
2. Click **"Edit release"** (pencil icon)
3. Make your changes
4. Click **"Update release"**

To add more files or update files:
1. Edit the release
2. Scroll to "Attach binaries"
3. Upload new files or delete old ones and upload new versions

## Troubleshooting

### "Tag not found" error
- Make sure you pushed the tag: `git push origin v1.0.0`
- Or create the tag directly in GitHub when creating the release

### Files are too large
- GitHub has a 2GB limit per file
- If your DMG is larger, consider:
  - Compressing the app
  - Using GitHub Large File Storage (LFS)
  - Or use a different hosting service

### Can't see the Releases tab
- Make sure you're logged into GitHub
- Check that you have write access to the repository
- The repository must be public or you must have access if it's private

## Best Practices

1. **Version numbering**: Use semantic versioning (e.g., v1.0.0, v1.0.1, v1.1.0)
2. **Release notes**: Always include what changed, what's new, and how to install
3. **Test before release**: Test the DMG files before publishing
4. **Tag regularly**: Tag each release so you can track versions
5. **Update version in package.json**: Make sure package.json version matches your release tag

## Quick Reference Commands

```bash
# Build the app
npm run dist:mac

# Create and push a tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Create release via GitHub CLI (alternative)
gh release create v1.0.0 --title "Command Pad v1.0.0" --notes "Release notes" release/build/*.dmg
```

## 📝 Quick Release Notes Template

Copy and paste this template into your GitHub Release description:

```markdown
# 🚀 Command Pad v1.0.0 - Initial Release

## ✨ What's New

Command Pad is now available! Transform your command-line workflow into an intuitive, visual interface.

### 🐙 Git Pad
- Execute Git commands with custom buttons
- Visual command board organized by categories
- Repository selection and management
- Custom command creation with variable support

### 💻 System Pad
- Run system commands and terminal operations
- Organize commands by categories
- Create custom shortcuts for frequently used commands

### 📁 Project Pad
- Manage project-specific commands
- Execute commands in project context
- Quick project navigation

### 🎮 Pad Mode
- Full-screen command execution mode
- Customizable button grid layout
- Keyboard shortcuts support

## 📥 Installation

### For macOS Users

1. **Download the appropriate DMG file:**
   - **Intel Macs**: Download `Command Pad-1.0.0-mac.dmg`
   - **Apple Silicon (M1/M2/M3)**: Download `Command Pad-1.0.0-mac-arm64.dmg`

2. **Install Command Pad:**
   - Open the downloaded DMG file (double-click)
   - Drag "Command Pad" to the Applications folder
   - Launch Command Pad from Applications

3. **Security Note:**
   If you see a "Command Pad cannot be opened" message:
   - Go to **System Settings** → **Privacy & Security**
   - Scroll down to find the Command Pad message
   - Click **"Open Anyway"**

## 🎯 Getting Started

1. **Git Pad**: Click to select a Git repository, then start creating custom Git command buttons
2. **System Pad**: Create shortcuts for your most-used system commands
3. **Project Pad**: Navigate to a project and set up project-specific commands
4. **Pad Mode**: Click the pad mode button for full-screen command execution

## 📚 Documentation

- Check out our [README.md](README.md) for full feature documentation
- See [DISTRIBUTION.md](DISTRIBUTION.md) for detailed installation instructions
```

**For more templates and examples**, see [RELEASE_NOTES_TEMPLATE.md](RELEASE_NOTES_TEMPLATE.md)

## What Users See

Once you publish the release, users will see:

1. A release page with your description and release notes
2. Download buttons for each DMG file
3. The ability to download the source code from that version (if they want)

Users can then:
- Click the DMG file to download it
- Open the DMG
- Drag the app to Applications
- Launch and use the app!

---

**Need help?** Check the main [DISTRIBUTION.md](DISTRIBUTION.md) for more information.

