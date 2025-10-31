import React from 'react';
import { FiFolder, FiGitBranch, FiAlertCircle } from 'react-icons/fi';
import { MdFolder, MdRefresh } from 'react-icons/md';
import './RepositoryBar.css';
import { RepoInfo } from '../preload.d';

interface RepositoryBarProps {
  repoPath: string | null;
  repoInfo: RepoInfo | null;
  onPickRepository: () => void;
  onRefreshInfo: () => void;
}

const RepositoryBar: React.FC<RepositoryBarProps> = ({
  repoPath,
  repoInfo,
  onPickRepository,
  onRefreshInfo,
}) => {
  return (
    <div className="repository-bar">
      <div className="repo-bar-left">
        <button className="pick-repo-btn" onClick={onPickRepository} title="Pick Git Repository">
          <MdFolder size={20} />
          <span>Pick Repository</span>
        </button>
        {repoPath && (
          <div className="repo-path-display">
            <FiFolder size={16} />
            <span className="repo-path-text" title={repoPath}>
              {repoPath.length > 60 ? `...${repoPath.slice(-57)}` : repoPath}
            </span>
          </div>
        )}
      </div>

      {repoInfo && repoPath && (
        <div className="repo-bar-right">
          <button className="refresh-repo-btn" onClick={onRefreshInfo} title="Refresh Repository Info">
            <MdRefresh size={18} />
          </button>
          <div className="repo-info">
            <div className="repo-branch-info">
              <FiGitBranch size={16} />
              <span className="branch-name">{repoInfo.branch}</span>
            </div>
            {repoInfo.hasUncommittedChanges && (
              <div className="repo-status-warning" title="Uncommitted changes detected">
                <FiAlertCircle size={16} />
                <span>Uncommitted Changes</span>
              </div>
            )}
          </div>
        </div>
      )}

      {!repoPath && (
        <div className="repo-bar-empty">
          <span>No repository selected. Click "Pick Repository" to get started.</span>
        </div>
      )}
    </div>
  );
};

export default RepositoryBar;

