import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from "./CodeBlock";
import LoadingIndicator from "./LoadingIndicator";
import "./MarkdownRenderer.css";

const MarkdownRenderer = ({ content, isTyping }) => {
  const processContent = (text) => {
    if (!text) return '';

    let processedText = text;

    // --- "ONCE AND FOR ALL" UNIFIED LIST PROCESSING ---
    // This single, powerful function replaces all previous list-related regexes.
    // It processes the entire text block to handle all known AI formatting issues in the correct order.

    // Step 1: Globally sanitize all AI artifacts first. This is the key to fixing the conflicts.
    processedText = processedText
      // A. Fixes titles ending in `:**` or `-**` by removing the `**`.
      .replace(/:\*\*/g, ':')
      .replace(/-\*\*/g, '-')
      // B. Fixes run-on list items by forcing a newline before a `**` separator.
      .replace(/\s*\*\*(?=\s*\d+\.)/g, '\n')
      // C. Fixes run-on bulleted list items by forcing a newline after a sentence-ending punctuation and before a hyphen.
      .replace(/([.)])\s*-\s/g, '$1\n- ')
      // D. Removes any lines that consist ONLY of two or more asterisks.
      .replace(/^\s*\*{2,}\s*$/gm, '');

    // Step 2: Now that the text is clean, apply our desired formatting rules.
    
    // A. Bold introductory sentences that end with a colon and are followed by a list.
    const introSentenceRegex = /(^.*:)(?=\s*\n\s*(\*|\-|\d+\.))/gm;
    processedText = processedText.replace(introSentenceRegex, '**$&**');

    // B. Conditionally bold parts of each list item line.
    processedText = processedText.replace(/(^\s*([*\-]|(\d+\.))\s*.*)/gm, (line) => {
      const titlePattern = /^((?:\s*(?:[*\-]|(?:\d+\.))\s+.*?)(?::| -))/;
      if (titlePattern.test(line)) {
        return line.replace(titlePattern, '**$1**');
      }
      const numberPattern = /^(\s*\d+\.)/;
      if (numberPattern.test(line)) {
        return line.replace(numberPattern, '**$1**');
      }
      return line;
    });

    // Step 3: Final pass to remove any code blocks.
    const codeBlockRegex = /```(\w*)?\n?([\s\S]*?)```/g;
    processedText = processedText.replace(codeBlockRegex, (fullMatch, language, code) => {
      const trimmedCode = code.trim();
      if (!trimmedCode) return '';
      const isSingleLine = !trimmedCode.includes('\n');
      if (isSingleLine && (language.toLowerCase() === 'text' || language === '')) {
        return `<code>${trimmedCode}</code>`;
      }
      return fullMatch;
    });

    return processedText;
  };

  const processedContent = processContent(content);

  if (isTyping) {
    return <LoadingIndicator />;
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          code({ node, inline, className, children, ...props }) {
            if (inline) {
              return <code className={className} {...props}>{children}</code>;
            }

            const match = /language-(\w+)/.exec(className || '');
            const language = match ? match[1] : 'text';
            const codeString = node.children.map(child => child.value || '').join('');

            return (
              <CodeBlock
                language={language}
                codeString={codeString}
                className={className}
                {...props}
              >
                {children}
              </CodeBlock>
            );
          },
          a: ({ node, ...props }) => (
            <a target="_blank" rel="noopener noreferrer" {...props} />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer; 