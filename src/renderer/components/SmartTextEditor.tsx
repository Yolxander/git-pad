import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import Fuse from 'fuse.js';
import './SmartTextEditor.css';

interface Suggestion {
  id: string;
  text: string;
  category: string;
  description?: string;
  insertText?: string;
}

interface SmartTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  suggestions?: Suggestion[];
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
  autoFocus?: boolean;
}

const DEFAULT_SUGGESTIONS: Suggestion[] = [
  // Task-related suggestions
  { id: 'bug-fix', text: 'Bug Fix', category: 'Task Type', description: 'Fix a bug or error', insertText: 'Bug Fix: ' },
  { id: 'feature', text: 'Feature', category: 'Task Type', description: 'Add new functionality', insertText: 'Feature: ' },
  { id: 'improvement', text: 'Improvement', category: 'Task Type', description: 'Enhance existing functionality', insertText: 'Improvement: ' },
  { id: 'refactor', text: 'Refactor', category: 'Task Type', description: 'Restructure code', insertText: 'Refactor: ' },
  { id: 'documentation', text: 'Documentation', category: 'Task Type', description: 'Update documentation', insertText: 'Documentation: ' },

  // Priority indicators
  { id: 'urgent', text: 'URGENT', category: 'Priority', description: 'High priority task', insertText: '[URGENT] ' },
  { id: 'asap', text: 'ASAP', category: 'Priority', description: 'As soon as possible', insertText: '[ASAP] ' },
  { id: 'low-priority', text: 'Low Priority', category: 'Priority', description: 'Low priority task', insertText: '[Low Priority] ' },

  // Common actions
  { id: 'todo', text: 'TODO', category: 'Action', description: 'Task to be done', insertText: 'TODO: ' },
  { id: 'fixme', text: 'FIXME', category: 'Action', description: 'Something needs to be fixed', insertText: 'FIXME: ' },
  { id: 'note', text: 'NOTE', category: 'Action', description: 'Important note', insertText: 'NOTE: ' },
  { id: 'review', text: 'REVIEW', category: 'Action', description: 'Needs review', insertText: 'REVIEW: ' },

  // Time estimates
  { id: 'quick', text: 'Quick Task', category: 'Time', description: '< 30 minutes', insertText: 'Quick Task (~30min): ' },
  { id: 'medium', text: 'Medium Task', category: 'Time', description: '1-4 hours', insertText: 'Medium Task (~2h): ' },
  { id: 'large', text: 'Large Task', category: 'Time', description: '> 4 hours', insertText: 'Large Task (4h+): ' },

  // Status indicators
  { id: 'in-progress', text: 'In Progress', category: 'Status', description: 'Currently working on', insertText: '[In Progress] ' },
  { id: 'blocked', text: 'Blocked', category: 'Status', description: 'Cannot proceed', insertText: '[Blocked] ' },
  { id: 'waiting', text: 'Waiting', category: 'Status', description: 'Waiting for input', insertText: '[Waiting] ' },
];

interface CursorPosition {
  start: number;
  end: number;
}

const SmartTextEditor: React.FC<SmartTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  disabled,
  multiline = false,
  rows = 3,
  suggestions = DEFAULT_SUGGESTIONS,
  onKeyDown,
  className,
  autoFocus
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<Suggestion[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState<CursorPosition>({ start: 0, end: 0 });
  const [multiCursors, setMultiCursors] = useState<CursorPosition[]>([]);
  const [isMultiCursorMode, setIsMultiCursorMode] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsPanelRef = useRef<HTMLDivElement>(null);

  const fuse = new Fuse(suggestions, {
    keys: ['text', 'category', 'description'],
    threshold: 0.3,
    includeScore: true,
  });

  const getCurrentInput = () => multiline ? textareaRef.current : inputRef.current;

  // Handle autocomplete trigger
  useEffect(() => {
    const input = getCurrentInput();
    if (!input) return;

    const handleInput = () => {
      const cursorPos = input.selectionStart || 0;
      const textBeforeCursor = value.substring(0, cursorPos);
      const words = textBeforeCursor.split(/\s+/);
      const currentWord = words[words.length - 1];

      if (currentWord.length >= 2) {
        const results = fuse.search(currentWord).map(result => result.item);
        setFilteredSuggestions(results.slice(0, 8));
        setShowSuggestions(results.length > 0);
        setSelectedSuggestionIndex(0);
      } else {
        setShowSuggestions(false);
      }
    };

    input.addEventListener('input', handleInput);
    return () => input.removeEventListener('input', handleInput);
  }, [value, fuse, multiline]);

  // Multi-cursor mode hotkeys
  useHotkeys('ctrl+d', (e) => {
    e.preventDefault();
    handleAddMultiCursor();
  }, { enableOnFormTags: true });

  useHotkeys('ctrl+shift+l', (e) => {
    e.preventDefault();
    handleSelectAllOccurrences();
  }, { enableOnFormTags: true });

  useHotkeys('escape', (e) => {
    if (isMultiCursorMode) {
      e.preventDefault();
      exitMultiCursorMode();
    } else if (showSuggestions) {
      e.preventDefault();
      setShowSuggestions(false);
    }
  }, { enableOnFormTags: true });

  const handleAddMultiCursor = () => {
    const input = getCurrentInput();
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;

    if (!isMultiCursorMode) {
      setIsMultiCursorMode(true);
      setMultiCursors([{ start, end }]);
    } else {
      const newCursor = { start, end };
      if (!multiCursors.some(cursor => cursor.start === start && cursor.end === end)) {
        setMultiCursors([...multiCursors, newCursor]);
      }
    }
  };

  const handleSelectAllOccurrences = () => {
    const input = getCurrentInput();
    if (!input) return;

    const selectedText = input.value.substring(input.selectionStart || 0, input.selectionEnd || 0);
    if (!selectedText) return;

    const occurrences: CursorPosition[] = [];
    let index = 0;
    while ((index = value.indexOf(selectedText, index)) !== -1) {
      occurrences.push({ start: index, end: index + selectedText.length });
      index += selectedText.length;
    }

    if (occurrences.length > 1) {
      setIsMultiCursorMode(true);
      setMultiCursors(occurrences);
    }
  };

  const exitMultiCursorMode = () => {
    setIsMultiCursorMode(false);
    setMultiCursors([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedSuggestionIndex(prev =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedSuggestionIndex(prev =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1
          );
          break;
        case 'Tab':
        case 'Enter':
          e.preventDefault();
          if (filteredSuggestions[selectedSuggestionIndex]) {
            insertSuggestion(filteredSuggestions[selectedSuggestionIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setShowSuggestions(false);
          break;
      }
    }

    if (isMultiCursorMode && (e.key === 'Backspace' || e.key === 'Delete' || e.key.length === 1)) {
      e.preventDefault();
      handleMultiCursorEdit(e.key, e.key === 'Backspace', e.key === 'Delete');
    }

    onKeyDown?.(e);
  };

  const handleMultiCursorEdit = (key: string, isBackspace: boolean, isDelete: boolean) => {
    if (multiCursors.length === 0) return;

    let newValue = value;
    let offset = 0;

    // Sort cursors by position to handle edits correctly
    const sortedCursors = [...multiCursors].sort((a, b) => a.start - b.start);

    for (const cursor of sortedCursors) {
      const adjustedStart = cursor.start + offset;
      const adjustedEnd = cursor.end + offset;

      if (isBackspace && adjustedStart > 0) {
        newValue = newValue.slice(0, adjustedStart - 1) + newValue.slice(adjustedStart);
        offset -= 1;
      } else if (isDelete && adjustedEnd < newValue.length) {
        newValue = newValue.slice(0, adjustedEnd) + newValue.slice(adjustedEnd + 1);
        offset -= 1;
      } else if (key.length === 1) {
        if (adjustedStart !== adjustedEnd) {
          // Replace selection
          newValue = newValue.slice(0, adjustedStart) + key + newValue.slice(adjustedEnd);
          offset += key.length - (adjustedEnd - adjustedStart);
        } else {
          // Insert character
          newValue = newValue.slice(0, adjustedStart) + key + newValue.slice(adjustedStart);
          offset += key.length;
        }
      }
    }

    onChange(newValue);
  };

  const insertSuggestion = (suggestion: Suggestion) => {
    const input = getCurrentInput();
    if (!input) return;

    const cursorPos = input.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);
    const words = textBeforeCursor.split(/\s+/);
    const currentWord = words[words.length - 1];

    const insertText = suggestion.insertText || suggestion.text;
    const beforeCurrentWord = textBeforeCursor.substring(0, textBeforeCursor.length - currentWord.length);
    const newValue = beforeCurrentWord + insertText + textAfterCursor;

    onChange(newValue);
    setShowSuggestions(false);

    // Set cursor position after insertion
    setTimeout(() => {
      const newCursorPos = beforeCurrentWord.length + insertText.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    }, 0);
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    insertSuggestion(suggestion);
  };

  const renderSuggestions = () => {
    if (!showSuggestions || filteredSuggestions.length === 0) return null;

    return (
      <div className="smart-suggestions-panel" ref={suggestionsPanelRef}>
        <div className="suggestions-header">
          <span className="suggestions-title">Suggestions</span>
          <kbd className="suggestions-hint">Tab/Enter to insert</kbd>
        </div>
        <div className="suggestions-list">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`suggestion-item ${index === selectedSuggestionIndex ? 'selected' : ''}`}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="suggestion-main">
                <span className="suggestion-text">{suggestion.text}</span>
                <span className="suggestion-category">{suggestion.category}</span>
              </div>
              {suggestion.description && (
                <div className="suggestion-description">{suggestion.description}</div>
              )}
            </div>
          ))}
        </div>
        <div className="suggestions-footer">
          <kbd>Ctrl+D</kbd> Multi-cursor • <kbd>Ctrl+Shift+L</kbd> Select all • <kbd>Esc</kbd> Cancel
        </div>
      </div>
    );
  };

  const inputProps = {
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    onKeyDown: handleKeyDown,
    placeholder,
    disabled,
    className: `smart-text-input ${className || ''} ${isMultiCursorMode ? 'multi-cursor-mode' : ''}`,
    autoFocus,
  };

  return (
    <div className="smart-text-editor">
      {multiline ? (
        <textarea
          ref={textareaRef}
          rows={rows}
          {...inputProps}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          {...inputProps}
        />
      )}

      {isMultiCursorMode && (
        <div className="multi-cursor-indicator">
          <span className="multi-cursor-text">Multi-cursor mode ({multiCursors.length} cursors)</span>
          <button className="exit-multi-cursor" onClick={exitMultiCursorMode}>
            × Exit
          </button>
        </div>
      )}

      {renderSuggestions()}
    </div>
  );
};

export default SmartTextEditor;
