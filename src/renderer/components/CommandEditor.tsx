import React, { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import './CommandEditor.css';
import { GitCommand, GitCommandVariable } from '../data/dummyCommands';

interface CommandEditorProps {
  command: GitCommand | null;
  onSave: (command: GitCommand) => void;
  onCancel: () => void;
}

const CommandEditor: React.FC<CommandEditorProps> = ({ command, onSave, onCancel }) => {
  const [formData, setFormData] = useState<GitCommand>({
    id: '',
    name: '',
    description: '',
    command: '',
    category: 'branching',
    requiresConfirmation: false,
    variables: [],
  });

  useEffect(() => {
    if (command) {
      setFormData(command);
    } else {
      // New command - generate ID
      setFormData({
        id: `cmd-${Date.now()}`,
        name: '',
        description: '',
        command: '',
        category: 'branching',
        requiresConfirmation: false,
        variables: [],
      });
    }
  }, [command]);

  const handleAddVariable = () => {
    const newVar: GitCommandVariable = {
      name: '',
      label: '',
      type: 'text',
    };
    setFormData({
      ...formData,
      variables: [...(formData.variables || []), newVar],
    });
  };

  const handleRemoveVariable = (index: number) => {
    const newVars = formData.variables?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, variables: newVars });
  };

  const handleVariableChange = (index: number, field: keyof GitCommandVariable, value: string) => {
    const newVars = [...(formData.variables || [])];
    newVars[index] = { ...newVars[index], [field]: value };
    setFormData({ ...formData, variables: newVars });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.command) {
      alert('Name and command are required');
      return;
    }

    // Extract variables from command template if not manually added
    const commandVars = formData.command.match(/\{\{(\w+)\}\}/g) || [];
    const varNames = commandVars.map((v) => v.replace(/[{}]/g, ''));

    // Ensure all variables in command template have corresponding entries
    const existingVarNames = formData.variables?.map((v) => v.name) || [];
    const missingVars = varNames.filter((name) => !existingVarNames.includes(name));

    let finalVars = [...(formData.variables || [])];

    missingVars.forEach((name) => {
      finalVars.push({
        name,
        label: name.charAt(0).toUpperCase() + name.slice(1),
        type: 'text',
      });
    });

    onSave({ ...formData, variables: finalVars });
  };

  const commandPreview = () => {
    let preview = formData.command;
    formData.variables?.forEach((variable) => {
      preview = preview.replace(
        new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g'),
        `[${variable.label}]`
      );
    });
    return preview;
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content command-editor-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <h3 className="modal-title">
              {command ? 'Edit Command' : 'Create New Command'}
            </h3>
          </div>
          <button className="modal-close" onClick={onCancel}>
            <MdClose size={24} />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="command-editor-form">
            <div className="form-group">
              <label>Command Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Commit & Push"
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What does this command do?"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as GitCommand['category'],
                    })
                  }
                >
                  <option value="branching">Branching</option>
                  <option value="commits">Commits</option>
                  <option value="sync">Sync</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="form-group">
                <label>Icon</label>
                <input
                  type="text"
                  value={formData.icon || ''}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="⚡ (emoji)"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Git Command *</label>
              <input
                type="text"
                value={formData.command}
                onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                placeholder="e.g., git commit -m '{{message}}'"
                required
              />
              <small className="form-hint">
                Use {'{{variable}}'} for user input. Example: git checkout {'{{branch}}'}
              </small>
            </div>

            {formData.command && (
              <div className="form-group">
                <label>Command Preview</label>
                <div className="command-preview-box">
                  <code>{commandPreview()}</code>
                </div>
              </div>
            )}

            <div className="form-group">
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  id="requiresConfirmation"
                  checked={formData.requiresConfirmation}
                  onChange={(e) =>
                    setFormData({ ...formData, requiresConfirmation: e.target.checked })
                  }
                />
                <label htmlFor="requiresConfirmation">Require confirmation before execution</label>
              </div>
            </div>

            <div className="form-group">
              <div className="variables-section">
                <div className="variables-header">
                  <label>Variables</label>
                  <button
                    type="button"
                    className="add-variable-btn"
                    onClick={handleAddVariable}
                  >
                    + Add Variable
                  </button>
                </div>
                {formData.variables && formData.variables.length > 0 && (
                  <div className="variables-list">
                    {formData.variables.map((variable, index) => (
                      <div key={index} className="variable-item">
                        <input
                          type="text"
                          placeholder="Variable name (e.g., branch)"
                          value={variable.name}
                          onChange={(e) =>
                            handleVariableChange(index, 'name', e.target.value)
                          }
                          className="variable-name-input"
                        />
                        <input
                          type="text"
                          placeholder="Label (e.g., Branch Name)"
                          value={variable.label}
                          onChange={(e) =>
                            handleVariableChange(index, 'label', e.target.value)
                          }
                          className="variable-label-input"
                        />
                        <select
                          value={variable.type}
                          onChange={(e) =>
                            handleVariableChange(index, 'type', e.target.value)
                          }
                          className="variable-type-input"
                        >
                          <option value="text">Text</option>
                          <option value="dropdown">Dropdown</option>
                        </select>
                        <button
                          type="button"
                          className="remove-variable-btn"
                          onClick={() => handleRemoveVariable(index)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {command ? 'Save Changes' : 'Create Command'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommandEditor;

