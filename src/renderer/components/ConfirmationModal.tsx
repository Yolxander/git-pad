import React from 'react';
import { MdClose, MdWarning } from 'react-icons/md';
import './ConfirmationModal.css';
import { GitCommand } from '../data/dummyCommands';
import { SystemCommand } from '../data/dummySystemCommands';

interface ConfirmationModalProps {
  command: GitCommand | SystemCommand;
  finalCommand: string;
  repoPath: string;
  isDangerous: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  command,
  finalCommand,
  repoPath,
  isDangerous,
  onConfirm,
  onCancel,
}) => {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <h3 className="modal-title">
              {isDangerous ? (
                <>
                  <MdWarning size={24} style={{ color: '#ff4757', marginRight: '8px' }} />
                  Confirm Dangerous Command
                </>
              ) : (
                'Confirm Command Execution'
              )}
            </h3>
          </div>
          <button className="modal-close" onClick={onCancel}>
            <MdClose size={24} />
          </button>
        </div>
        <div className="modal-body">
          <div className="confirmation-content">
            {isDangerous && (
              <div className="dangerous-warning">
                <MdWarning size={32} />
                <p>This command is potentially dangerous and could cause data loss!</p>
                <p>Are you absolutely sure you want to proceed?</p>
              </div>
            )}

            <div className="confirmation-section">
              <div className="confirmation-label">Command Name:</div>
              <div className="confirmation-value">{command.name}</div>
            </div>

            <div className="confirmation-section">
              <div className="confirmation-label">Full Command:</div>
              <div className="command-preview">
                <code>{finalCommand}</code>
              </div>
            </div>

            <div className="confirmation-section">
              <div className="confirmation-label">Repository:</div>
              <div className="confirmation-value repo-path" title={repoPath}>
                {repoPath.length > 60 ? `...${repoPath.slice(-57)}` : repoPath}
              </div>
            </div>

            {command.description && (
              <div className="confirmation-section">
                <div className="confirmation-label">Description:</div>
                <div className="confirmation-value">{command.description}</div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <button
              className={`btn-primary ${isDangerous ? 'dangerous-btn' : ''}`}
              onClick={onConfirm}
            >
              {isDangerous ? '⚠️ Execute Anyway' : 'Execute Command'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;

