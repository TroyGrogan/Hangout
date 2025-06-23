import React, { useState, useRef, useEffect } from 'react';
import { Copy } from 'lucide-react';
import 'highlight.js/styles/atom-one-dark.css';
import './CodeBlock.css';

const CodeBlock = ({ language, children, codeString, className }) => {
  const [copied, setCopied] = useState(false);
  const [finalCodeString, setFinalCodeString] = useState('');
  const codeRef = useRef(null);

  // Effect to determine the final code string to use
  useEffect(() => {
    let textToUse = '';
    
    // Priority 1: Use codeString prop if available and not empty
    if (codeString && typeof codeString === 'string' && codeString.trim()) {
      textToUse = codeString.trim();
      console.log('✅ CodeBlock using codeString prop:', textToUse.substring(0, 30) + '...');
    }
    // Priority 2: Extract from DOM element after it's rendered
    else if (codeRef.current) {
      textToUse = codeRef.current.textContent || codeRef.current.innerText || '';
      console.log('⚠️ CodeBlock using DOM extraction:', textToUse.substring(0, 30) + '...');
    }
    // Priority 3: Convert children to string
    else if (children) {
      textToUse = String(children).trim();
      console.log('⚠️ CodeBlock using children conversion:', textToUse.substring(0, 30) + '...');
    }
    
    setFinalCodeString(textToUse);
  }, [codeString, children]);

  // Also update when DOM content changes
  useEffect(() => {
    if (!finalCodeString && codeRef.current) {
      const domText = codeRef.current.textContent || codeRef.current.innerText || '';
      if (domText.trim()) {
        setFinalCodeString(domText.trim());
      }
    }
  }, [finalCodeString]);

  const handleCopy = async () => {
    // Use the final determined code string
    let textToCopy = finalCodeString;
    
    // Final fallback: try to get text from DOM again
    if (!textToCopy && codeRef.current) {
      textToCopy = codeRef.current.textContent || codeRef.current.innerText || '';
    }
    
    // Last resort: use children
    if (!textToCopy && children) {
      textToCopy = String(children);
    }
    
    textToCopy = textToCopy.trim();

    if (!textToCopy) {
      console.error('No text found to copy');
      alert('No code content available to copy');
      return;
    }

    try {
      // Check if clipboard API is available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        console.log('✅ Successfully copied to clipboard via Clipboard API');
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('execCommand copy failed');
        }
        console.log('✅ Successfully copied to clipboard via execCommand fallback');
      }
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
    } catch (err) {
      console.error('❌ Failed to copy to clipboard:', err);
      
      // Final fallback - show an alert with the text
      const shouldShowText = window.confirm('Copy failed. Would you like to see the code to copy manually?');
      if (shouldShowText) {
        alert(textToCopy);
      }
    }
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
        <code ref={codeRef} className={className}>
          {children}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock; 