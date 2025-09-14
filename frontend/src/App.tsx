import React, { useState, useEffect } from 'react';
import Split from 'react-split';
import './App.css';
import Toolbar from './components/Toolbar/Toolbar';
import FileExplorer from './components/FileExplorer/FileExplorer';
import CodeEditor from './components/CodeEditor/CodeEditor';
import Terminal from './components/Terminal/Terminal';

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileItem[];
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [currentFile, setCurrentFile] = useState<FileItem | null>(null);
  const [files, setFiles] = useState<FileItem[]>([
    {
      id: '1',
      name: 'main.py',
      type: 'file',
      content: '# Welcome to Python IDE\n# Write your Python code here\n\nprint("Hello, World!")\n\n# Example function\ndef greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Python"))'
    },
    {
      id: '2',
      name: 'examples',
      type: 'folder',
      children: [
        {
          id: '3',
          name: 'calculator.py',
          type: 'file',
          content: '# Simple Calculator\n\ndef add(x, y):\n    return x + y\n\ndef subtract(x, y):\n    return x - y\n\ndef multiply(x, y):\n    return x * y\n\ndef divide(x, y):\n    if y != 0:\n        return x / y\n    else:\n        return "Error: Division by zero!"\n\n# Test the functions\nprint(add(5, 3))\nprint(subtract(10, 4))\nprint(multiply(3, 7))\nprint(divide(15, 3))'
        }
      ]
    }
  ]);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    'Welcome to Python IDE Terminal',
    'Ready to execute Python code...',
  ]);

  useEffect(() => {
    // Set initial file
    setCurrentFile(files[0]);
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    // Handle keyboard shortcut for running code
    const handleRunCodeShortcut = () => {
      handleRunCode();
    };

    window.addEventListener('runCode', handleRunCodeShortcut);
    return () => window.removeEventListener('runCode', handleRunCodeShortcut);
  }, [currentFile]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleFileSelect = (file: FileItem) => {
    if (file.type === 'file') {
      setCurrentFile(file);
    }
  };

  const handleCodeChange = (code: string) => {
    if (currentFile) {
      const updatedFile = { ...currentFile, content: code };
      setCurrentFile(updatedFile);
      
      // Update files state
      const updateFileInTree = (items: FileItem[]): FileItem[] => {
        return items.map(item => {
          if (item.id === updatedFile.id) {
            return updatedFile;
          }
          if (item.children) {
            return { ...item, children: updateFileInTree(item.children) };
          }
          return item;
        });
      };
      
      setFiles(updateFileInTree(files));
    }
  };

  const handleRunCode = async () => {
    if (!currentFile?.content) {
      setTerminalOutput(prev => [...prev, 'No code to run']);
      return;
    }

    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: currentFile.content }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTerminalOutput(prev => [
          ...prev,
          `> Running ${currentFile.name}`,
          ...result.output.split('\n').filter((line: string) => line.trim())
        ]);
      } else {
        setTerminalOutput(prev => [
          ...prev,
          `> Error in ${currentFile.name}`,
          result.error || 'Unknown error occurred'
        ]);
      }
    } catch (error) {
      setTerminalOutput(prev => [
        ...prev,
        '> Connection error',
        'Could not connect to Python execution server'
      ]);
    }
  };

  const handleExplainCode = async () => {
    if (!currentFile?.content) {
      setTerminalOutput(prev => [...prev, 'No code to explain']);
      return;
    }

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: currentFile.content }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setTerminalOutput(prev => [
          ...prev,
          `> Explaining ${currentFile.name}`,
          '--- AI Code Explanation ---',
          ...result.explanation.split('\n').filter((line: string) => line.trim()),
          '--- End Explanation ---'
        ]);
      } else {
        setTerminalOutput(prev => [
          ...prev,
          '> Error explaining code',
          result.error || 'Could not explain code'
        ]);
      }
    } catch (error) {
      setTerminalOutput(prev => [
        ...prev,
        '> Connection error',
        'Could not connect to AI explanation service'
      ]);
    }
  };

  return (
    <div className="app" data-theme={theme}>
      <Toolbar 
        theme={theme}
        onToggleTheme={toggleTheme}
        onRunCode={handleRunCode}
        onExplainCode={handleExplainCode}
        currentFile={currentFile}
      />
      
      <div className="app-body">
        <Split
          sizes={[20, 80]}
          minSize={200}
          gutterSize={4}
          direction="horizontal"
          className="split-horizontal"
        >
          <FileExplorer
            files={files}
            onFileSelect={handleFileSelect}
            currentFile={currentFile}
          />
          
          <Split
            sizes={[70, 30]}
            minSize={150}
            gutterSize={4}
            direction="vertical"
            className="split-vertical"
          >
            <CodeEditor
              code={currentFile?.content || ''}
              onChange={handleCodeChange}
              theme={theme}
              language="python"
            />
            
            <Terminal
              output={terminalOutput}
              onClear={() => setTerminalOutput([])}
            />
          </Split>
        </Split>
      </div>
    </div>
  );
}

export default App;
