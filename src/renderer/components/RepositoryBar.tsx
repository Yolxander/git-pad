import React from 'react';
import { FiFolder } from 'react-icons/fi';
import { MdFolder } from 'react-icons/md';
import './RepositoryBar.css';

interface RepositoryBarProps {
  repoPath: string | null;
  onPickRepository: () => void;
}

const RepositoryBar: React.FC<RepositoryBarProps> = ({
  repoPath,
  onPickRepository,
}) => {
  return (
    <div className="repository-bar">
      <button className="pick-repo-btn" onClick={onPickRepository} title="Pick Git Repository">
        <MdFolder size={16} />
        <span>Pick Repository</span>
      </button>
      {repoPath && (
        <div className="repo-path-display">
          <FiFolder size={14} />
          <span className="repo-path-text" title={repoPath}>
            {repoPath.length > 60 ? `...${repoPath.slice(-57)}` : repoPath}
          </span>
        </div>
      )}
    </div>
  );
};

export default RepositoryBar;

