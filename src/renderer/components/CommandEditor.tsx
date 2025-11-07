import React, { useState, useEffect } from 'react';
import { MdClose } from 'react-icons/md';
import './CommandEditor.css';
import { GitCommand, GitCommandVariable } from '../data/dummyCommands';
import { SystemCommand, SystemCommandVariable } from '../data/dummySystemCommands';
import { ProjectCommand, ProjectCommandVariable } from '../data/dummyProjectCommands';
import { Prompt } from '../data/prompts';

interface CommandEditorProps {
  command: GitCommand | SystemCommand | ProjectCommand | Prompt | null;
  onSave: (command: GitCommand | SystemCommand | ProjectCommand | Prompt) => void;
  onCancel: () => void;
  isSystemCommand?: boolean;
  isProjectCommand?: boolean;
  isPrompt?: boolean;
}

const CommandEditor: React.FC<CommandEditorProps> = ({ command, onSave, onCancel, isSystemCommand = false, isProjectCommand = false, isPrompt = false }) => {
  const defaultCategory = isPrompt ? 'ai' : isSystemCommand ? 'power' : isProjectCommand ? 'server' : 'branching';
  const [formData, setFormData] = useState<GitCommand | SystemCommand | ProjectCommand | Prompt>({
    id: '',
    name: '',
    ...(isPrompt ? { text: '', category: 'ai' as const } : { description: '', command: '', category: defaultCategory as any, requiresConfirmation: false, variables: [] }),
  });

  useEffect(() => {
    if (command) {
      setFormData(command);
    } else {
      // New command/prompt - generate ID
      if (isPrompt) {
        setFormData({
          id: `prompt-${Date.now()}`,
          name: '',
          text: '',
          category: 'ai' as const,
        } as Prompt);
      } else {
        setFormData({
          id: `cmd-${Date.now()}`,
          name: '',
          description: '',
          command: '',
          category: defaultCategory as any,
          requiresConfirmation: false,
          variables: [],
        });
      }
    }
  }, [command, isPrompt]);

  const handleAddVariable = () => {
    const newVar: GitCommandVariable | SystemCommandVariable | ProjectCommandVariable = {
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

  const handleVariableChange = (index: number, field: keyof (GitCommandVariable | SystemCommandVariable | ProjectCommandVariable), value: string) => {
    const newVars = [...(formData.variables || [])];
    newVars[index] = { ...newVars[index], [field]: value };
    setFormData({ ...formData, variables: newVars });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPrompt) {
      const promptData = formData as Prompt;
      if (!promptData.name || !promptData.text) {
        alert('Name and text content are required');
        return;
      }
      onSave(promptData);
    } else {
      const cmdData = formData as GitCommand | SystemCommand | ProjectCommand;
      if (!cmdData.name || !cmdData.command) {
        alert('Name and command are required');
        return;
      }

      // Extract variables from command template if not manually added
      const commandVars = cmdData.command.match(/\{\{(\w+)\}\}/g) || [];
      const varNames = commandVars.map((v) => v.replace(/[{}]/g, ''));

      // Ensure all variables in command template have corresponding entries
      const existingVarNames = cmdData.variables?.map((v) => v.name) || [];
      const missingVars = varNames.filter((name) => !existingVarNames.includes(name));

      let finalVars = [...(cmdData.variables || [])];

      missingVars.forEach((name) => {
        finalVars.push({
          name,
          label: name.charAt(0).toUpperCase() + name.slice(1),
          type: 'text',
        });
      });

      onSave({ ...cmdData, variables: finalVars });
    }
  };

  const commandPreview = () => {
    if (isPrompt) return '';
    const cmdData = formData as GitCommand | SystemCommand | ProjectCommand;
    let preview = cmdData.command;
    cmdData.variables?.forEach((variable) => {
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
              {command ? (isPrompt ? 'Edit Prompt' : 'Edit Command') : (isPrompt ? 'Create New Prompt' : 'Create New Command')}
            </h3>
          </div>
          <button className="modal-close" onClick={onCancel}>
            <MdClose size={24} />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSubmit} className="command-editor-form">
            <div className="form-group">
              <label>{isPrompt ? 'Prompt Name *' : 'Command Name *'}</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={isPrompt ? "e.g., Code Review Prompt" : "e.g., Commit & Push"}
                required
              />
            </div>

            {!isPrompt && (
              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  value={(formData as GitCommand | SystemCommand | ProjectCommand).description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What does this command do?"
                />
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as any,
                    })
                  }
                >
                  {isPrompt ? (
                    <>
                      <option value="ai">AI</option>
                      <option value="code">Code</option>
                      <option value="writing">Writing</option>
                      <option value="general">General</option>
                    </>
                  ) : isSystemCommand ? (
                    <>
                      <option value="power">Power</option>
                      <option value="network">Network</option>
                      <option value="audio">Audio</option>
                      <option value="utilities">Utilities</option>
                    </>
                  ) : isProjectCommand ? (
                    <>
                      <option value="server">Server</option>
                      <option value="build">Build</option>
                      <option value="test">Test</option>
                      <option value="database">Database</option>
                      <option value="utilities">Utilities</option>
                    </>
                  ) : (
                    <>
                      <option value="branching">Branching</option>
                      <option value="commits">Commits</option>
                      <option value="sync">Sync</option>
                      <option value="advanced">Advanced</option>
                    </>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label>Icon</label>
                <input
                  type="text"
                  value={(isPrompt ? (formData as Prompt).icon : (formData as GitCommand | SystemCommand | ProjectCommand).icon) || ''}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="⚡ (emoji)"
                />
              </div>
            </div>

            {isPrompt ? (
              <div className="form-group prompt-text-group">
                <label>Prompt Text *</label>
                <textarea
                  value={(formData as Prompt).text || ''}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value } as Prompt)}
                  placeholder="Enter the prompt text that will be copied to clipboard..."
                  required
                  rows={12}
                  className="prompt-textarea"
                />
                <small className="form-hint">
                  This text will be copied to the clipboard when the prompt button is clicked.
                </small>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>{isSystemCommand ? 'System Command' : 'Git Command'} *</label>
                  <input
                    type="text"
                    value={(formData as GitCommand | SystemCommand | ProjectCommand).command}
                    onChange={(e) => setFormData({ ...formData, command: e.target.value })}
                    placeholder={isSystemCommand ? "e.g., say \"{{message}}\"" : "e.g., git commit -m '{{message}}'"}
                    required
                  />
                  <small className="form-hint">
                    Use {'{{variable}}'} for user input. Example: {isSystemCommand ? 'say "{{message}}"' : 'git checkout {{branch}}'}
                  </small>
                </div>

                {(formData as GitCommand | SystemCommand | ProjectCommand).command && (
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
                      checked={(formData as GitCommand | SystemCommand | ProjectCommand).requiresConfirmation}
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
                    {(formData as GitCommand | SystemCommand | ProjectCommand).variables && (formData as GitCommand | SystemCommand | ProjectCommand).variables!.length > 0 && (
                      <div className="variables-list">
                        {(formData as GitCommand | SystemCommand | ProjectCommand).variables!.map((variable, index) => (
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
              </>
            )}

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={onCancel}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {command ? (isPrompt ? 'Save Changes' : 'Save Changes') : (isPrompt ? 'Create Prompt' : 'Create Command')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CommandEditor;

