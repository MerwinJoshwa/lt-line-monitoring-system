import React, { useState } from 'react';
import './FileExplorer.css';
import { FileItem } from '../../App';

interface FileExplorerProps {
  files: FileItem[];
  onFileSelect: (file: FileItem) => void;
  currentFile: FileItem | null;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
  files,
  onFileSelect,
  currentFile
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['2']) // Expand the examples folder by default
  );

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const getFileIcon = (file: FileItem) => {
    if (file.type === 'folder') {
      return expandedFolders.has(file.id) ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M.54 3.87L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3h4.672a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4a2 2 0 0 1 .54-.13z"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.828 3h3.982a2 2 0 0 1 1.992 2.181l-.637 7A2 2 0 0 1 13.174 14H2.825a2 2 0 0 1-1.991-1.819l-.637-7a1.99 1.99 0 0 1 .342-1.31L.5 3a2 2 0 0 1 2-2h3.672a2 2 0 0 1 1.414.586l.828.828A2 2 0 0 0 9.828 3zm-8.322.12C1.72 3.042 1.95 3 2.19 3h5.396l-.707-.707A1 1 0 0 0 6.172 2H2.5a1 1 0 0 0-1 .981l.006.139z"/>
        </svg>
      );
    }
    
    // Python file icon
    if (file.name.endsWith('.py')) {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9.5a.5.5 0 0 1-1 0V3z"/>
        </svg>
      );
    }
    
    // Default file icon
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
      </svg>
    );
  };

  const renderFileItem = (file: FileItem, depth = 0) => {
    const isFolder = file.type === 'folder';
    const isExpanded = expandedFolders.has(file.id);
    const isSelected = currentFile?.id === file.id;

    return (
      <div key={file.id} className="file-item-container">
        <div
          className={`file-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(file.id);
            } else {
              onFileSelect(file);
            }
          }}
        >
          <div className="file-item-content">
            <span className="file-icon">
              {getFileIcon(file)}
            </span>
            <span className="file-name">{file.name}</span>
          </div>
        </div>
        
        {isFolder && isExpanded && file.children && (
          <div className="folder-children">
            {file.children.map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-explorer">
      <div className="file-explorer-header">
        <h3>Explorer</h3>
      </div>
      <div className="file-explorer-content">
        {files.map(file => renderFileItem(file))}
      </div>
    </div>
  );
};

export default FileExplorer;
