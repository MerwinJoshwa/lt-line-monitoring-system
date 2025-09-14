import React, { useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import './CodeEditor.css';

interface CodeEditorProps {
  code: string;
  onChange: (code: string) => void;
  theme: 'light' | 'dark';
  language: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  theme,
  language
}) => {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Configure Python language features
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
    
    // Add Python built-ins for autocomplete
    monaco.languages.registerCompletionItemProvider('python', {
      provideCompletionItems: (model: any, position: any) => {
        const suggestions = [
          {
            label: 'print',
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: 'Print objects to the text stream file',
            insertText: 'print(${1:value})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'len',
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: 'Return the length of an object',
            insertText: 'len(${1:obj})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'range',
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: 'Create a sequence of numbers',
            insertText: 'range(${1:start}, ${2:stop})',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'for',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'For loop',
            insertText: 'for ${1:item} in ${2:iterable}:\n    ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'if',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'If statement',
            insertText: 'if ${1:condition}:\n    ${2:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'def',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Function definition',
            insertText: 'def ${1:function_name}(${2:args}):\n    ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'class',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Class definition',
            insertText: 'class ${1:ClassName}:\n    def __init__(self${2:, args}):\n        ${3:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'try',
            kind: monaco.languages.CompletionItemKind.Snippet,
            documentation: 'Try-except block',
            insertText: 'try:\n    ${1:pass}\nexcept ${2:Exception} as ${3:e}:\n    ${4:pass}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'import',
            kind: monaco.languages.CompletionItemKind.Keyword,
            documentation: 'Import statement',
            insertText: 'import ${1:module}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
          {
            label: 'from',
            kind: monaco.languages.CompletionItemKind.Keyword,
            documentation: 'From import statement',
            insertText: 'from ${1:module} import ${2:item}',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          },
        ];

        return { suggestions };
      }
    });

    // Add error diagnostics simulation
    const updateDiagnostics = () => {
      const model = editor.getModel();
      if (!model) return;

      const markers: any[] = [];
      const content = model.getValue();
      const lines = content.split('\n');

      lines.forEach((line, lineNumber) => {
        // Simple syntax error detection
        if (line.includes('print(') && !line.includes(')')) {
          markers.push({
            severity: monaco.MarkerSeverity.Error,
            startLineNumber: lineNumber + 1,
            startColumn: 1,
            endLineNumber: lineNumber + 1,
            endColumn: line.length + 1,
            message: 'SyntaxError: Missing closing parenthesis',
          });
        }
        
        // Indentation error detection
        if (line.match(/^\s*(if|for|def|class|try|except|with|while).*:$/)) {
          const nextLine = lines[lineNumber + 1];
          if (nextLine && nextLine.trim() && !nextLine.startsWith('    ') && !nextLine.startsWith('\t')) {
            markers.push({
              severity: monaco.MarkerSeverity.Error,
              startLineNumber: lineNumber + 2,
              startColumn: 1,
              endLineNumber: lineNumber + 2,
              endColumn: (nextLine?.length || 0) + 1,
              message: 'IndentationError: Expected an indented block',
            });
          }
        }

        // Undefined variable warning (simplified)
        const undefinedVars = line.match(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g);
        if (undefinedVars) {
          undefinedVars.forEach(varName => {
            if (!['print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'True', 'False', 'None'].includes(varName) && 
                !content.includes(`${varName} =`) && 
                !content.includes(`def ${varName}`) &&
                line.includes(varName) && 
                !line.includes(`def `) && 
                !line.includes(`import `) &&
                !line.includes(`#`)) {
              const startCol = line.indexOf(varName) + 1;
              if (startCol > 0) {
                markers.push({
                  severity: monaco.MarkerSeverity.Warning,
                  startLineNumber: lineNumber + 1,
                  startColumn: startCol,
                  endLineNumber: lineNumber + 1,
                  endColumn: startCol + varName.length,
                  message: `NameError: Variable '${varName}' might not be defined`,
                });
              }
            }
          });
        }
      });

      monaco.editor.setModelMarkers(model, 'python', markers);
    };

    // Update diagnostics when content changes
    editor.onDidChangeModelContent(() => {
      setTimeout(updateDiagnostics, 500);
    });

    // Initial diagnostics
    setTimeout(updateDiagnostics, 100);

    // Add keyboard shortcut for running code
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      // Trigger run code via custom event
      const runEvent = new CustomEvent('runCode');
      window.dispatchEvent(runEvent);
    });
  };

  useEffect(() => {
    const handleRunCode = () => {
      // This will be handled by the parent component
      console.log('Run code shortcut triggered');
    };

    window.addEventListener('runCode', handleRunCode);
    return () => window.removeEventListener('runCode', handleRunCode);
  }, []);

  const handleChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 20,
    wordWrap: 'on' as const,
    automaticLayout: true,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    tabSize: 4,
    insertSpaces: true,
    scrollBeyondLastLine: false,
    renderLineHighlight: 'all' as const,
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line' as const,
    folding: true,
    glyphMargin: true,
    contextmenu: true,
    mouseWheelZoom: true,
    smoothScrolling: true,
  };

  return (
    <div className="code-editor">
      <Editor
        height="100%"
        language={language}
        value={code}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
        options={editorOptions}
        loading={<div className="editor-loading">Loading editor...</div>}
      />
    </div>
  );
};

export default CodeEditor;
