import React from 'react';
import './RepositoryBar.css';

interface ProjectBarProps {
  projectPath: string | null;
  onPickProject: () => void;
}

const ProjectBar: React.FC<ProjectBarProps> = ({
  projectPath,
  onPickProject,
}) => {
  return (
    <div className="repository-bar">
      <button className="folder-icon-btn" onClick={onPickProject} title="Pick Project Folder">
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
          <path fill="none" d="M0 0h24v24H0z"></path>
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path>
        </svg>
      </button>
      <span className="repo-path-text" title={projectPath || 'No project selected'}>
        {projectPath ? (projectPath.length > 60 ? `...${projectPath.slice(-57)}` : projectPath) : 'No project selected'}
          </span>
    </div>
  );
};

export default ProjectBar;

