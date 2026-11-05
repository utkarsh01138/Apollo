import React from 'react';
import { Music2, Radio, GitBranch } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">
          <Music2 className="brand-icon" size={24} />
        </div>
        <div>
          <h1 className="brand-title">Apollo</h1>
          <p className="brand-subtitle">Local Music Layer Separation & Dynamic Notation</p>
        </div>
      </div>

      <div className="header-meta">
        <span className="status-badge live">
          <Radio size={14} className="pulse-icon" />
          <span>Local Engine Active</span>
        </span>
        <a
          href="https://github.com/utkarsh01138/Apollo"
          target="_blank"
          rel="noopener noreferrer"
          className="header-link"
          aria-label="View on GitHub"
        >
          <GitBranch size={16} />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
};
