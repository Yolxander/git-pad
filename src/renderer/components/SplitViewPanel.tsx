import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { MdClose, MdFullscreen, MdFullscreenExit, MdSwapHoriz, MdSwapVert } from 'react-icons/md';
import './SplitViewPanel.css';

interface PanelConfig {
  id: string;
  title: string;
  content: ReactNode;
  minWidth?: number;
  minHeight?: number;
  closable?: boolean;
}

interface SplitViewPanelProps {
  panels: PanelConfig[];
  orientation?: 'horizontal' | 'vertical';
  defaultSizes?: number[];
  onPanelClose?: (panelId: string) => void;
  onOrientationChange?: (orientation: 'horizontal' | 'vertical') => void;
  resizable?: boolean;
  className?: string;
}

const SplitViewPanel: React.FC<SplitViewPanelProps> = ({
  panels,
  orientation = 'horizontal',
  defaultSizes,
  onPanelClose,
  onOrientationChange,
  resizable = true,
  className
}) => {
  const [sizes, setSizes] = useState<number[]>(
    defaultSizes || Array(panels.length).fill(100 / panels.length)
  );
  const [isResizing, setIsResizing] = useState(false);
  const [resizeIndex, setResizeIndex] = useState<number>(-1);
  const [maximizedPanel, setMaximizedPanel] = useState<string | null>(null);
  const [currentOrientation, setCurrentOrientation] = useState(orientation);

  const containerRef = useRef<HTMLDivElement>(null);
  const startPos = useRef<number>(0);
  const startSizes = useRef<number[]>([]);

  // Hotkeys for panel management
  useHotkeys('ctrl+shift+h', (e) => {
    e.preventDefault();
    setCurrentOrientation('horizontal');
    onOrientationChange?.('horizontal');
  });

  useHotkeys('ctrl+shift+v', (e) => {
    e.preventDefault();
    setCurrentOrientation('vertical');
    onOrientationChange?.('vertical');
  });

  useHotkeys('ctrl+shift+m', (e) => {
    e.preventDefault();
    if (maximizedPanel) {
      setMaximizedPanel(null);
    }
  });

  useEffect(() => {
    setCurrentOrientation(orientation);
  }, [orientation]);

  useEffect(() => {
    if (panels.length !== sizes.length) {
      setSizes(Array(panels.length).fill(100 / panels.length));
    }
  }, [panels.length]);

  const handleMouseDown = (e: React.MouseEvent, index: number) => {
    if (!resizable) return;

    e.preventDefault();
    setIsResizing(true);
    setResizeIndex(index);
    startPos.current = currentOrientation === 'horizontal' ? e.clientX : e.clientY;
    startSizes.current = [...sizes];

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const container = containerRef.current;
    const containerSize = currentOrientation === 'horizontal'
      ? container.offsetWidth
      : container.offsetHeight;

    const currentPos = currentOrientation === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - startPos.current;
    const deltaPercent = (delta / containerSize) * 100;

    const newSizes = [...startSizes.current];
    const leftPanelIndex = resizeIndex;
    const rightPanelIndex = resizeIndex + 1;

    if (rightPanelIndex < newSizes.length) {
      const newLeftSize = Math.max(5, Math.min(95, newSizes[leftPanelIndex] + deltaPercent));
      const newRightSize = Math.max(5, Math.min(95, newSizes[rightPanelIndex] - deltaPercent));

      // Ensure minimum sizes are respected
      const leftPanel = panels[leftPanelIndex];
      const rightPanel = panels[rightPanelIndex];
      const minLeftSize = leftPanel?.minWidth ? (leftPanel.minWidth / containerSize) * 100 : 5;
      const minRightSize = rightPanel?.minWidth ? (rightPanel.minWidth / containerSize) * 100 : 5;

      if (newLeftSize >= minLeftSize && newRightSize >= minRightSize) {
        newSizes[leftPanelIndex] = newLeftSize;
        newSizes[rightPanelIndex] = newRightSize;
        setSizes(newSizes);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    setResizeIndex(-1);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handlePanelMaximize = (panelId: string) => {
    setMaximizedPanel(maximizedPanel === panelId ? null : panelId);
  };

  const handlePanelClose = (panelId: string) => {
    onPanelClose?.(panelId);
  };

  const toggleOrientation = () => {
    const newOrientation = currentOrientation === 'horizontal' ? 'vertical' : 'horizontal';
    setCurrentOrientation(newOrientation);
    onOrientationChange?.(newOrientation);
  };

  if (panels.length === 0) {
    return (
      <div className="split-view-empty">
        <p>No panels to display</p>
      </div>
    );
  }

  if (maximizedPanel) {
    const panel = panels.find(p => p.id === maximizedPanel);
    if (panel) {
      return (
        <div className="split-view-maximized">
          <div className="panel-header">
            <span className="panel-title">{panel.title}</span>
            <div className="panel-actions">
              <button
                className="panel-action-btn"
                onClick={() => setMaximizedPanel(null)}
                title="Restore"
              >
                <MdFullscreenExit />
              </button>
            </div>
          </div>
          <div className="panel-content maximized">
            {panel.content}
          </div>
        </div>
      );
    }
  }

  return (
    <div
      ref={containerRef}
      className={`split-view-container ${currentOrientation} ${className || ''}`}
    >
      <div className="split-view-header">
        <div className="split-view-title">
          Split View ({panels.length} panels)
        </div>
        <div className="split-view-controls">
          <button
            className="split-view-control-btn"
            onClick={toggleOrientation}
            title={`Switch to ${currentOrientation === 'horizontal' ? 'vertical' : 'horizontal'} layout`}
          >
            {currentOrientation === 'horizontal' ? <MdSwapVert /> : <MdSwapHoriz />}
          </button>
        </div>
      </div>

      <div className="split-view-content">
        {panels.map((panel, index) => (
          <React.Fragment key={panel.id}>
            <div
              className="split-view-panel"
              style={{
                [currentOrientation === 'horizontal' ? 'width' : 'height']: `${sizes[index]}%`,
              }}
            >
              <div className="panel-header">
                <span className="panel-title">{panel.title}</span>
                <div className="panel-actions">
                  <button
                    className="panel-action-btn"
                    onClick={() => handlePanelMaximize(panel.id)}
                    title="Maximize"
                  >
                    <MdFullscreen />
                  </button>
                  {panel.closable !== false && (
                    <button
                      className="panel-action-btn close"
                      onClick={() => handlePanelClose(panel.id)}
                      title="Close"
                    >
                      <MdClose />
                    </button>
                  )}
                </div>
              </div>
              <div className="panel-content">
                {panel.content}
              </div>
            </div>

            {index < panels.length - 1 && resizable && (
              <div
                className={`split-view-divider ${currentOrientation} ${isResizing && resizeIndex === index ? 'resizing' : ''}`}
                onMouseDown={(e) => handleMouseDown(e, index)}
              >
                <div className="divider-handle">
                  <div className="divider-line"></div>
                  <div className="divider-line"></div>
                  <div className="divider-line"></div>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="split-view-footer">
        <div className="split-view-shortcuts">
          <kbd>Ctrl+Shift+H</kbd> Horizontal •
          <kbd>Ctrl+Shift+V</kbd> Vertical •
          <kbd>Ctrl+Shift+M</kbd> Exit Maximize
        </div>
      </div>
    </div>
  );
};

export default SplitViewPanel;
