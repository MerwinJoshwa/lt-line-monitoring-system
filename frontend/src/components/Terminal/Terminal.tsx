import React, { useEffect, useRef } from 'react';
import './Terminal.css';

interface TerminalProps {
  output: string[];
  onClear: () => void;
}

const Terminal: React.FC<TerminalProps> = ({ output, onClear }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new output is added
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  const formatOutputLine = (line: string, index: number) => {
    // Color-code different types of output
    let className = 'terminal-line';
    
    if (line.startsWith('>')) {
      className += ' terminal-command';
    } else if (line.toLowerCase().includes('error') || line.toLowerCase().includes('exception')) {
      className += ' terminal-error';
    } else if (line.includes('Warning') || line.includes('warning')) {
      className += ' terminal-warning';
    } else if (line.includes('AI Code Explanation') || line.includes('End Explanation')) {
      className += ' terminal-ai';
    }

    return (
      <div key={index} className={className}>
        {line || '\u00A0'} {/* Non-breaking space for empty lines */}
      </div>
    );
  };

  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-title">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0h13A1.5 1.5 0 0 1 16 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 14.5v-13zM1.5 1a.5.5 0 0 0-.5.5V5h15V1.5a.5.5 0 0 0-.5-.5h-13zM15 6H1v8.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V6z"/>
          </svg>
          <span>Terminal</span>
        </div>
        
        <div className="terminal-controls">
          <button 
            className="terminal-button"
            onClick={onClear}
            title="Clear terminal"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
            </svg>
            Clear
          </button>
        </div>
      </div>
      
      <div className="terminal-content" ref={terminalRef}>
        {output.length === 0 ? (
          <div className="terminal-line terminal-empty">
            Terminal ready - run some code to see output here
          </div>
        ) : (
          output.map((line, index) => formatOutputLine(line, index))
        )}
      </div>
    </div>
  );
};

export default Terminal;
