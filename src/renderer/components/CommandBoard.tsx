import React, { useState } from 'react';
import { MdAdd, MdFilterList } from 'react-icons/md';
import CommandButton from './CommandButton';
import './CommandBoard.css';
import { GitCommand } from '../data/dummyCommands';
import { SystemCommand } from '../data/dummySystemCommands';

interface CommandBoardProps {
  commands: (GitCommand | SystemCommand)[];
  onCommandClick: (command: GitCommand | SystemCommand) => void;
  onAddCommand: () => void;
  onEditCommand?: (command: GitCommand | SystemCommand) => void;
  onDeleteCommand?: (command: GitCommand | SystemCommand) => void;
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

  // Dynamically determine categories based on commands
  const getCategories = () => {
    const uniqueCategories = new Set<string>();
    commands.forEach((cmd) => {
      if (cmd.category) {
        uniqueCategories.add(cmd.category);
      }
    });
    
    const categoryLabels: Record<string, string> = {
      'branching': 'Branching',
      'commits': 'Commits',
      'sync': 'Sync',
      'advanced': 'Advanced',
      'power': 'Power',
      'network': 'Network',
      'audio': 'Audio',
      'utilities': 'Utilities',
    };
    
    const categoriesList: Array<{ value: string | null; label: string }> = [
      { value: null, label: 'All' },
    ];
    
    Array.from(uniqueCategories).sort().forEach((cat) => {
      categoriesList.push({
        value: cat,
        label: categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
      });
    });
    
    return categoriesList;
  };
  
  const categories = getCategories();

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

