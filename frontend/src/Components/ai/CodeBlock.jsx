import React, { useState } from 'react';
import { Copy } from 'lucide-react';
import 'highlight.js/styles/atom-one-dark.css';
import './CodeBlock.css';

const CodeBlock = ({ language, children, codeString, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = codeString || children?.toString() || '';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-container">
      <div className="code-header">
        <span className="code-language">{language || 'code'}</span>
        <button onClick={handleCopy} className="copy-button">
          <Copy size={14} className="copy-icon" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="pre-style">
        <code className={className}>
          {children}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock; 