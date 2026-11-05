import React from 'react';
import { GitBranch, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenTutorial: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenTutorial }) => {
  return (
    <header className="app-header nothing-header">
      <div className="header-brand">
        <div className="brand-logo nothing-logo">
          <span className="nothing-logo-dot" />
          <span className="nothing-logo-text">A</span>
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-title nothing-font-dot">APOLLO</h1>
            <span className="nothing-version-tag">OS_v1.0</span>
          </div>
          <p className="brand-subtitle nothing-font-mono">
            LOCAL STEM DECOMPOSITION // ADAPTIVE NOTATION
          </p>
        </div>
      </div>

      <div className="header-meta">
        {/* Real-time Local Engine Status */}
        <span className="status-badge live nothing-status-badge">
          <span className="nothing-led-dot red-pulse" />
          <span className="nothing-status-label">ENGINE // ACTIVE</span>
        </span>

        {/* Guided Tutorial Launch Button */}
        <button
          type="button"
          className="nothing-guide-btn"
          onClick={onOpenTutorial}
          title="Open Apollo Guided Tutorial"
        >
          <HelpCircle size={15} className="guide-icon" />
          <span>// GUIDE</span>
        </button>

        {/* GitHub Link */}
        <a
          href="https://github.com/utkarsh01138/Apollo"
          target="_blank"
          rel="noopener noreferrer"
          className="header-link nothing-link"
          aria-label="View on GitHub"
        >
          <GitBranch size={15} />
          <span>REPO</span>
        </a>
      </div>
    </header>
  );
};
