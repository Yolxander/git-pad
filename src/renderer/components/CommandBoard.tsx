import React, { useState } from 'react';
import { MdAdd, MdFilterList } from 'react-icons/md';
import CommandButton from './CommandButton';
import './CommandBoard.css';
import { GitCommand } from '../data/dummyCommands';

interface CommandBoardProps {
  commands: GitCommand[];
  onCommandClick: (command: GitCommand) => void;
  onAddCommand: () => void;
  onEditCommand?: (command: GitCommand) => void;
  onDeleteCommand?: (command: GitCommand) => void;
  disabled?: boolean;
}

const CommandBoard: React.FC<CommandBoardProps> = ({
  commands,
  onCommandClick,
  onAddCommand,
  onEditCommand,
  onDeleteCommand,
  disabled = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories: Array<{ value: string | null; label: string }> = [
    { value: null, label: 'All' },
    { value: 'branching', label: 'Branching' },
    { value: 'commits', label: 'Commits' },
    { value: 'sync', label: 'Sync' },
    { value: 'advanced', label: 'Advanced' },
  ];

  const filteredCommands = selectedCategory
    ? commands.filter((cmd) => cmd.category === selectedCategory)
    : commands;

  return (
    <div className="command-board">
      <div className="command-board-header">
        <div className="command-board-title">
          <h2>COMMAND BOARD</h2>
          <span className="command-count">{filteredCommands.length} commands</span>
        </div>
        <div className="command-board-controls">
          <div className="category-filter">
            <MdFilterList size={18} />
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="category-select"
            >
              {categories.map((cat) => (
                <option key={cat.value || 'all'} value={cat.value || ''}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <button className="add-command-btn" onClick={onAddCommand} title="Add New Command">
            <MdAdd size={20} />
            <span>Add Command</span>
          </button>
        </div>
      </div>
      <div className="command-grid">
        {filteredCommands.length === 0 ? (
          <div className="command-board-empty">
            <p>No commands found. Click "Add Command" to create your first Git command button.</p>
          </div>
        ) : (
          filteredCommands.map((command) => (
            <CommandButton
              key={command.id}
              command={command}
              onClick={() => onCommandClick(command)}
              onEdit={onEditCommand ? () => onEditCommand(command) : undefined}
              onDelete={onDeleteCommand ? () => onDeleteCommand(command) : undefined}
              disabled={disabled}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CommandBoard;

