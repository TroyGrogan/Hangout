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

    const codeBlockRegex = /```(\w*)?\n?([\s\S]*?)```/g;
    
    // This is the definitive, rules-based post-processing function.
    // It will fix the AI's inconsistent markdown output.
    const processedText = text.replace(codeBlockRegex, (fullMatch, language, code) => {
        const trimmedCode = code.trim();

        // Rule 1: If a code block is empty, it is deleted.
        if (!trimmedCode) {
            return '';
        }

        // Rule 2: If a block is single-line AND labeled 'text' or has no label,
        // it is converted into an inline <code> tag. This will be styled by
        // existing CSS to give it a highlighted background.
        const isSingleLine = !trimmedCode.includes('\n');
        if (isSingleLine && (language.toLowerCase() === 'text' || language === '')) {
            return `<code>${trimmedCode}</code>`;
        }

        // Rule 3: All other legitimate code blocks are left completely untouched.
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