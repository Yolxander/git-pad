import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './QACompletion.css';
import logo from '../../../assets/logo.png';
import { qaService, QaChecklist } from '../services/api';
import { authService } from '../services/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ChecklistItem {
  id: number;
  identifier: string;
  answer: string | null;
  item_text: string | null;
  failure_reason: string | null;
  status: string;
}

interface ExtendedQaChecklist extends QaChecklist {
  items: ChecklistItem[];
}

function QACompletion() {
  const navigate = useNavigate();
  const [selectedChecklist, setSelectedChecklist] = useState<ExtendedQaChecklist | null>(null);
  const [checklists, setChecklists] = useState<ExtendedQaChecklist[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [itemAnswer, setItemAnswer] = useState('');
  const [itemFailureReason, setItemFailureReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'passed' | 'failed' | 'pending'>('pending');

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        const token = authService.getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const fetchedChecklists = await qaService.getQaChecklists(token);
        console.log('QA Checklists Response:', fetchedChecklists);
        setChecklists(fetchedChecklists);
      } catch (error) {
        console.error('Error fetching QA checklists:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChecklists();
  }, []);

  const handleMinimize = () => {
    window.electron.minimizeWindow();
    setIsMinimized(true);
  };
  const handleRestore = () => {
    window.electron.restoreWindow();
    setIsMinimized(false);
  };
  const handleClose = () => {
    window.electron.closeWindow();
  };
  const handleBackHome = () => {
    navigate('/home');
  };

  const handleChecklistSelect = (checklist: ExtendedQaChecklist) => setSelectedChecklist(checklist);
  const handleBack = () => setSelectedChecklist(null);

  const handleToggleItem = async (itemId: number) => {
    try {
      const token = authService.getToken();
      if (!token || !selectedChecklist) return;

      const updatedItems = selectedChecklist.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              status: item.status === 'completed' ? 'pending' : 'completed',
              answer: item.status === 'completed' ? null : 'Completed',
            }
          : item
      );

      const updatedChecklist = {
        ...selectedChecklist,
        items: updatedItems,
      };

      setSelectedChecklist(updatedChecklist);
      setChecklists(prev =>
        prev.map(checklist =>
          checklist.id === selectedChecklist.id ? updatedChecklist : checklist
        )
      );
    } catch (error) {
      console.error('Error updating checklist item:', error);
    }
  };

  const handleEditItem = (itemId: number) => {
    const item = selectedChecklist?.items.find(i => i.id === itemId);
    if (item) {
      setEditingItem(itemId);
      setItemAnswer(item.answer || '');
      setItemFailureReason(item.failure_reason || '');
      setSelectedStatus(item.status as 'passed' | 'failed' | 'pending');
    }
  };

  const handleSaveItem = async (itemId: number) => {
    try {
      const token = authService.getToken();
      if (!token || !selectedChecklist) {
        console.error('No token or selected checklist');
        return;
      }

      const item = selectedChecklist.items.find(i => i.id === itemId);
      if (!item) {
        console.error('Item not found');
        return;
      }

      const updatedItem = await qaService.updateChecklistItem(
        token,
        selectedChecklist.id,
        itemId,
        {
          order_number: item.order_number,
          status: selectedStatus,
          answer: itemAnswer,
          failure_reason: selectedStatus === 'failed' ? itemFailureReason : null,
        }
      );

      const updatedItems = selectedChecklist.items.map(item =>
        item.id === itemId ? updatedItem : item
      );

      const updatedChecklist = {
        ...selectedChecklist,
        items: updatedItems,
      };

      setSelectedChecklist(updatedChecklist);
      setChecklists(prev =>
        prev.map(checklist =>
          checklist.id === selectedChecklist.id ? updatedChecklist : checklist
        )
      );
      setEditingItem(null);

      // Show success toast
      toast.success('Checklist item updated successfully', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error('Error updating checklist item:', error);
      // Show error toast
      toast.error('Failed to update checklist item', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }
  };

  const handleMarkAsFailed = async (itemId: number) => {
    try {
      const token = authService.getToken();
      if (!token || !selectedChecklist) return;

      const updatedItems = selectedChecklist.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              status: 'failed',
              failure_reason: itemFailureReason || 'Failed',
            }
          : item
      );

      const updatedChecklist = {
        ...selectedChecklist,
        items: updatedItems,
      };

      setSelectedChecklist(updatedChecklist);
      setChecklists(prev =>
        prev.map(checklist =>
          checklist.id === selectedChecklist.id ? updatedChecklist : checklist
        )
      );
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating checklist item:', error);
    }
  };

  const handleMarkAsPassed = async (itemId: number) => {
    try {
      const token = authService.getToken();
      if (!token || !selectedChecklist) return;

      const updatedItems = selectedChecklist.items.map(item =>
        item.id === itemId
          ? {
              ...item,
              status: 'completed',
              answer: itemAnswer || 'Passed',
              failure_reason: null,
            }
          : item
      );

      const updatedChecklist = {
        ...selectedChecklist,
        items: updatedItems,
      };

      setSelectedChecklist(updatedChecklist);
      setChecklists(prev =>
        prev.map(checklist =>
          checklist.id === selectedChecklist.id ? updatedChecklist : checklist
        )
      );
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating checklist item:', error);
    }
  };

  const renderMinimized = () => (
    <div className="minimized-widget" onClick={handleRestore} tabIndex={0} role="button">
      <img src={logo} alt="Bug Smasher Logo" className="minimized-logo" />
    </div>
  );

  if (isMinimized) {
    return renderMinimized();
  }

  return (
    <div>
      <ToastContainer />
      {selectedChecklist && (
        <div style={{ padding: '0 24px', marginTop: 8 }}>
          <button className="qa-back-btn" onClick={handleBack}>
            ← Back to All Tests
          </button>
        </div>
      )}
      <main className="qa-main-section">
        {!selectedChecklist ? (
          <div className="tests-list">
            {loading ? (
              <div className="loading-message">Loading QA checklists...</div>
            ) : checklists.length > 0 ? (
              checklists.map(checklist => {
                const completedItems = checklist.items.filter(item => item.status === 'completed').length;
                const totalItems = checklist.items.length;
                return (
                  <div
                    key={checklist.id}
                    className="test-item"
                    tabIndex={0}
                    onClick={() => handleChecklistSelect(checklist)}
                    onKeyDown={e => e.key === 'Enter' && handleChecklistSelect(checklist)}
                  >
                    <div className="test-content">
                      <h3 className="test-title">{checklist.title}</h3>
                      <p className="test-description">{checklist.description}</p>
                      <div className="test-progress">
                        <span className="progress-text">
                          {completedItems} of {totalItems} items completed
                        </span>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${(completedItems / totalItems) * 100}%`,
                              backgroundColor: completedItems === totalItems ? '#4CAF50' : '#FFC107',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-items">No QA checklists available</div>
            )}
          </div>
        ) : (
          <div className="items-list">
            {selectedChecklist.items.map(item => (
              <div
                key={item.id}
                className={`item ${editingItem === item.id ? 'editing' : ''}`}
                onClick={() => !editingItem && handleEditItem(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !editingItem) {
                    handleEditItem(item.id);
                  }
                }}
              >
                <div className="item-header">
                  <span className="item-title">
                    {item.identifier} - {item.item_text}
                  </span>
                  <div className="item-status">
                    {item.status === 'completed' && <span className="status-badge passed">Passed</span>}
                    {item.status === 'failed' && <span className="status-badge failed">Failed</span>}
                    {item.status === 'pending' && <span className="status-badge pending">Pending</span>}
                  </div>
                </div>

                {editingItem === item.id ? (
                  <div className="item-edit-form" onClick={(e) => e.stopPropagation()}>
                    <div className="form-group">
                      <label>Answer:</label>
                      <textarea
                        value={itemAnswer}
                        onChange={(e) => setItemAnswer(e.target.value)}
                        placeholder="Enter your answer..."
                        rows={3}
                      />
                    </div>
                    <div className="status-pills">
                      <button
                        className={`status-pill ${selectedStatus === 'passed' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('passed')}
                      >
                        Passed
                      </button>
                      <button
                        className={`status-pill ${selectedStatus === 'failed' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('failed')}
                      >
                        Failed
                      </button>
                      <button
                        className={`status-pill ${selectedStatus === 'pending' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('pending')}
                      >
                        Pending
                      </button>
                    </div>
                    {selectedStatus === 'failed' && (
                      <div className="form-group">
                        <label>Failure Reason (if applicable):</label>
                        <textarea
                          value={itemFailureReason}
                          onChange={(e) => setItemFailureReason(e.target.value)}
                          placeholder="Enter failure reason..."
                          rows={3}
                        />
                      </div>
                    )}
                    <div className="item-actions">
                      <button
                        className="action-btn save"
                        onClick={() => handleSaveItem(item.id)}
                      >
                        Save
                      </button>
                      <button
                        className="action-btn cancel"
                        onClick={() => setEditingItem(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="item-content">
                    {item.answer && (
                      <div className="item-answer">
                        <strong>Answer:</strong> {item.answer}
                      </div>
                    )}
                    {item.failure_reason && (
                      <div className="item-failure">
                        <strong>Failure Reason:</strong> {item.failure_reason}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default QACompletion;
