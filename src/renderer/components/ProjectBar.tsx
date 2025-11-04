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
      <button className="pick-repo-btn" onClick={onPickProject} title="Pick Project Folder">
        <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
          <path fill="none" d="M0 0h24v24H0z"></path>
          <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"></path>
        </svg>
        <span>Pick Project</span>
      </button>
      {projectPath && (
        <div className="repo-path-display">
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="14" width="14" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <span className="repo-path-text" title={projectPath}>
            {projectPath.length > 60 ? `...${projectPath.slice(-57)}` : projectPath}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProjectBar;

