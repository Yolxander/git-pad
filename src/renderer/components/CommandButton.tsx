import React from 'react';
import { MdEdit, MdDelete } from 'react-icons/md';
import './CommandButton.css';
import { GitCommand } from '../data/dummyCommands';
import { SystemCommand } from '../data/dummySystemCommands';
import { ProjectCommand } from '../data/dummyProjectCommands';

interface CommandButtonProps {
  command: GitCommand | SystemCommand | ProjectCommand;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
  isRunning?: boolean;
}

const CommandButton: React.FC<CommandButtonProps> = ({
  command,
  onClick,
  onEdit,
  onDelete,
  disabled = false,
  isRunning = false,
}) => {
  // Use consistent border color for all buttons (matching system pad style)
  const categoryColor = '#D1FF75';

  return (
    <div className="command-button-wrapper">
      <button
        className={`command-button ${command.category} ${isRunning ? 'active-running' : ''}`}
        onClick={onClick}
        disabled={disabled && !isRunning}
        style={{
          borderColor: categoryColor,
        }}
        title={isRunning ? `Click to kill: ${command.description}` : command.description}
      >
        <div className="command-icon">{command.icon || '⚡'}</div>
        <div className="command-content">
          <div className="command-name">{command.name}</div>
          <div className="command-description">{command.description}</div>
          <div className="command-footer">
            <span className="command-category">{command.category}</span>
            {command.requiresConfirmation && (
              <span className="confirmation-badge" title="Requires confirmation">
                ⚠️
              </span>
            )}
          </div>
        </div>
      </button>
      {(onEdit || onDelete) && (
        <div className="command-actions">
          {onEdit && (
            <button className="command-action-btn edit-btn" onClick={onEdit} title="Edit Command">
              <MdEdit size={16} />
            </button>
          )}
          {onDelete && (
            <button className="command-action-btn delete-btn" onClick={onDelete} title="Delete Command">
              <MdDelete size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default CommandButton;

