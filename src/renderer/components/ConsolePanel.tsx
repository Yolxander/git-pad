import React, { useEffect, useRef } from 'react';
import { MdClear, MdContentCopy } from 'react-icons/md';
import './ConsolePanel.css';

interface ConsoleEntry {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning' | 'command';
  message: string;
}

interface ConsolePanelProps {
  entries: ConsoleEntry[];
  onClear: () => void;
}

const ConsolePanel: React.FC<ConsolePanelProps> = ({ entries, onClear }) => {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new entries are added
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [entries]);

  const copyToClipboard = () => {
    const text = entries.map((e) => `[${e.timestamp.toLocaleTimeString()}] ${e.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const formatMessage = (message: string): string => {
    // Split by newlines and format
    return message.split('\n').join('\n');
  };

  return (
    <div className="console-panel">
      <div className="console-header">
        <div className="console-title">
          <span>COMMAND OUTPUT</span>
          <span className="console-entry-count">{entries.length} entries</span>
        </div>
        <div className="console-actions">
          <button className="console-action-btn" onClick={copyToClipboard} title="Copy to Clipboard">
            <MdContentCopy size={18} />
          </button>
          <button className="console-action-btn" onClick={onClear} title="Clear Console">
            <MdClear size={18} />
          </button>
        </div>
      </div>
      <div className="console-content" ref={consoleRef}>
        {entries.length === 0 ? (
          <div className="console-empty">
            <p>No output yet. Execute a Git command to see results here.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className={`console-entry ${entry.type}`}>
              <span className="console-timestamp">
                {entry.timestamp.toLocaleTimeString()}
              </span>
              <pre className="console-message">{formatMessage(entry.message)}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;

export type { ConsoleEntry };

