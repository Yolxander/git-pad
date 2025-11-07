# Command Pad

A powerful desktop application that transforms your command-line workflow into an intuitive, visual interface. Execute Git commands, system operations, and project-specific tasks with a single click.

## 🎯 Why Command Pad?

**Stop typing repetitive commands. Start clicking.**

Command Pad eliminates the need to remember complex command syntax, type long commands repeatedly, or switch between terminal windows. Whether you're managing Git repositories, running system operations, or executing project-specific tasks, Command Pad makes it effortless.

### Benefits

- ⚡ **Save Time**: Execute commands instantly with custom buttons instead of typing long commands
- 🎯 **Reduce Errors**: Visual interface prevents typos and command mistakes
- 📚 **Organize Workflows**: Categorize and manage your commands efficiently
- 🚀 **Boost Productivity**: Streamline repetitive development tasks
- 🎨 **Intuitive UI**: Beautiful, modern interface that's easy to use
- 🔒 **Safe Execution**: Confirmation dialogs for dangerous operations
- 📊 **Real-time Feedback**: See command output in the integrated console
- 💾 **Persistent Storage**: Your commands are saved and ready anytime

## ✨ Features

### 🐙 Git Pad

Execute Git commands with custom buttons tailored to your workflow.

- **Repository Management**: Select and work with any Git repository
- **Visual Command Board**: See all your Git commands organized by categories:
  - Branching (create, switch, merge branches)
  - Commits (commit, amend, rebase)
  - Sync (pull, push, fetch)
  - Advanced (cherry-pick, reset, stash)
- **Custom Commands**: Create your own Git command shortcuts
- **Variable Support**: Use dynamic variables in commands (e.g., branch names, commit messages)
- **Confirmation Dialogs**: Safety prompts for destructive operations
- **Real-time Output**: View command execution results instantly

### 💻 System Pad

Run system commands and terminal operations without leaving your app.

- **System Operations**: Execute any terminal command with custom buttons
- **Category Organization**: Organize commands by:
  - Power (system management)
  - Network (connectivity operations)
  - Audio (media controls)
  - Utilities (system tools)
- **Custom Shortcuts**: Create shortcuts for frequently used system commands
- **Variable Inputs**: Dynamic command parameters on execution
- **Console Integration**: View system command output in real-time
- **Safe Execution**: Confirmation for potentially dangerous commands

### 📁 Project Pad

Manage project-specific commands that run in your project's context.

- **Project Context**: Navigate to any project and run commands in that directory
- **Project-Specific Commands**: Commands tailored to your project's needs
- **Category Support**: Organize by:
  - Server (development servers)
  - Build (build processes)
  - Test (testing commands)
  - Database (database operations)
- **Context-Aware**: Commands execute in the correct project directory
- **Team Sharing**: Share command configurations with your team

### 📝 Prompts Pad

Copy prompts to clipboard with one click for quick access to frequently used text.

- **Quick Copy**: Click any prompt button to copy its text to clipboard instantly
- **Toast Notifications**: Get visual feedback when prompts are copied
- **Category Organization**: Organize prompts by:
  - AI (AI prompts and templates)
  - Code (code snippets and templates)
  - Writing (email templates, documentation)
  - General (general purpose prompts)
- **Custom Prompts**: Create your own prompt buttons with custom text
- **Icon Support**: Add emoji icons to identify prompts quickly

### 🎮 Pad Mode

Full-screen command execution mode for maximum productivity.

- **Full-Screen Interface**: Immersive command execution experience
- **Grid Layout**: Customizable button grid (3x3, 4x4, etc.)
- **Quick Access**: Execute commands with large, touch-friendly buttons
- **Keyboard Shortcuts**: Navigate and execute commands with keyboard
- **Multiple Pad Types**: Switch between Git Pad, System Pad, Project Pad, and Prompts Pad modes

### 🔧 Advanced Features

- **Command Variables**: Use variables in commands that prompt for input on execution
- **Category Filtering**: Filter commands by category for quick access
- **Command Search**: Quickly find commands in your collection
- **Edit & Delete**: Modify or remove commands anytime
- **Console Panel**: View all command outputs in an integrated console
- **Repository Detection**: Automatically detect Git repositories
- **Project Navigation**: Quick access to project directories

## 🚀 Future Plans

We're constantly working to make Command Pad even better. Here's what's coming:

### 📅 Upcoming Features

- **Command Templates**: Pre-built command templates for common workflows
- **Command History**: Track and replay previously executed commands
- **Scheduled Commands**: Automate commands to run at specific times
- **Command Sharing**: Share command collections with the community
- **Plugin System**: Extend functionality with custom plugins
- **Dark Mode**: System-wide dark mode support
- **Multi-Repository Support**: Work with multiple repositories simultaneously
- **Command Chaining**: Execute multiple commands in sequence
- **Cloud Sync**: Sync your commands across devices
- **Team Collaboration**: Share command boards with team members
- **Advanced Console**: Enhanced console with color coding and filtering
- **Command Analytics**: Track your most-used commands
- **Export/Import**: Backup and restore your command configurations
- **Keyboard Macros**: Record and replay complex command sequences

### 🎯 Long-term Vision

- **AI-Powered Suggestions**: Get intelligent command recommendations
- **Workflow Automation**: Create complex workflows with visual builders
- **Integration Hub**: Connect with popular development tools (GitHub, GitLab, etc.)
- **Mobile Companion**: Control your desktop from mobile devices
- **Web Dashboard**: Manage commands from any browser
- **Enterprise Features**: Team management and command governance

## 📦 Installation

### For End Users

1. **Download**: Get the latest release from [GitHub Releases](https://github.com/yourusername/git-pad/releases)
2. **Install**: 
   - **macOS**: Open the `.dmg` file and drag Command Pad to Applications
   - **Windows**: Run the `.exe` installer
   - **Linux**: Make the `.AppImage` executable and run it
3. **Launch**: Open Command Pad from Applications (macOS) or Start menu (Windows)

### For Developers

```bash
# Clone the repository
git clone https://github.com/yourusername/git-pad.git
cd git-pad

# Install dependencies
npm install

# Run in development mode
npm start

# Build for distribution
npm run dist:mac    # For macOS
npm run dist:win    # For Windows
npm run dist:linux  # For Linux
```

## 🎓 Getting Started

1. **First Launch**: You'll see an onboarding screen introducing Git Pad, System Pad, and Project Pad
2. **Select Repository**: In Git Pad, click to select a Git repository
3. **Create Commands**: Click "Add Command" to create your first custom command
4. **Execute**: Click any command button to run it instantly
5. **Explore**: Try Pad Mode for a full-screen command experience

## 📚 Documentation

- **[BUILD_FOR_MAC.md](BUILD_FOR_MAC.md)** - Build and distribute for macOS
- **[GITHUB_RELEASE_GUIDE.md](GITHUB_RELEASE_GUIDE.md)** - Create GitHub releases
- **[DISTRIBUTION.md](DISTRIBUTION.md)** - Complete distribution guide
- **[QUICK_START.md](QUICK_START.md)** - Quick start guide

## 🤝 Contributing

We welcome contributions! Whether it's bug reports, feature requests, or code contributions, your input helps make Command Pad better.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

Built with:
- [Electron](https://electron.atom.io/) - Cross-platform desktop framework
- [React](https://reactjs.org/) - UI library
- [TypeScript](https://www.typescriptlang.org/) - Type-safe development

---

**Ready to supercharge your workflow?** Download Command Pad today and start executing commands with a click!
