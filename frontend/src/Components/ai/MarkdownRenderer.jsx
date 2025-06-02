import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import CodeBlock from "./CodeBlock";
import "./MarkdownRenderer.css";

const MarkdownRenderer = ({ content }) => {
  // Pre-process the content to add bold formatting to titles (words before colons)
  const processContent = (text) => {
    if (!text) return '';
    
    // First, handle specific markers like "these steps:" and add appropriate newlines
    // This specifically targets the pattern shown in the screenshot
    let processed = text.replace(
      /(these steps:|follow these steps:|following steps:|steps below:|instructions:|how to:|guidelines:|ways to:)(\s*)(?=[0-9]+\.|\-|\*|\+)/gi,
      '$1\n\n'
    );
    
    // Format titles in numbered lists and add a newline after the colon
    processed = processed.replace(
      /^(\s*[0-9]+\.\s+)([^:\n]+):/gm, 
      '$1**$2**:\n'
    );

    // Handle bulleted lists similarly (with - * or + bullets)
    processed = processed.replace(
      /^(\s*[-*+]\s+)([^:\n]+):/gm, 
      '$1**$2**:\n'
    );
    
    // Add extra spacing between list items for better readability
    // This ensures there's a blank line between numbered items
    processed = processed.replace(
      /^([0-9]+\.[^\n]+)(\n)(?=[0-9]+\.)/gm,
      '$1\n\n'
    );
    
    // Add extra spacing between bulleted list items
    processed = processed.replace(
      /^([-*+][^\n]+)(\n)(?=[-*+])/gm,
      '$1\n\n'
    );
    
    // Handle standalone lines with titles/labels (not in lists)
    processed = processed.replace(
      /^([^:\n*\d-][^:\n]{2,}):\s+/gm, 
      '**$1**:\n'
    );
    
    // Handle specific cases for labels that commonly appear in AI responses
    const labelPhrases = [
      'Note', 'Important', 'Remember', 'Warning', 'Tip', 'Example', 'Key point',
      'Attend', 'Join', 'Create', 'Network', 'Learn', 'Volunteer', 'Participate',
      'Research', 'Steps', 'Benefits', 'Requirements', 'Overview', 'Summary'
    ];
    
    // Build a regex pattern that matches these specific label phrases
    const labelPattern = new RegExp(
      `(^|\\s)(${labelPhrases.join('|')})(\\s[^:\\n]{0,40})?:`, 
      'gi'
    );
    
    processed = processed.replace(labelPattern, '$1**$2$3**:\n');
    
    // IMPROVED: Use universal paragraph detection instead of hardcoded topics
    
    // 1. Add paragraph breaks between sentences where a natural break seems appropriate
    // Look for complete sentences (ending with period, question mark, or exclamation)
    // followed by a capital letter starting a new sentence
    processed = processed.replace(/([.!?])(\s+)([A-Z][a-z]+\s)/g, (match, p1, p2, p3, offset, string) => {
      // Don't add paragraph break for common abbreviations like "e.g.", "i.e.", "Dr.", "Mr.", "vs.", etc.
      if (string.substring(Math.max(0, offset - 3), offset).match(/\b(e\.g|i\.e|Dr|Mr|vs|St|No|Mt)\.$/) ||
          string.substring(Math.max(0, offset - 2), offset).match(/\b(vs|Dr|Mr|Ms|Jr|Sr)\.$/) ||
          string.substring(Math.max(0, offset - 1), offset).match(/\b[A-Z]\.$/) // For initials like "J."
      ) {
        // This is likely an abbreviation, keep original spacing
        return p1 + p2 + p3;
      }
      
      // Check the word count of the preceding sentence to avoid breaking too short sentences
      const precedingText = string.substring(0, offset + 1);
      const lastSentenceBreak = Math.max(
        precedingText.lastIndexOf('.'), 
        precedingText.lastIndexOf('!'), 
        precedingText.lastIndexOf('?'),
        precedingText.lastIndexOf('\n')
      );
      
      const currentSentence = precedingText.substring(lastSentenceBreak + 1);
      const wordCount = currentSentence.trim().split(/\s+/).length;
      
      // Only add paragraph break if sentence is a reasonable length
      // and not part of existing lists or the beginning of a paragraph
      if (wordCount >= 2 && !string.substring(offset - 20, offset).includes('\n') &&
          !string.substring(offset - 5, offset).match(/^\d+\./)) {
        return p1 + '\n\n' + p3;
      }
      return p1 + p2 + p3;
    });
    
    // 2. Special case for "In conclusion" and similar paragraph transitions
    // These should always start a new paragraph
    processed = processed.replace(
      /([^.\n])([\s,]+)(In conclusion|To summarize|In summary|Finally|Overall|Furthermore|Moreover|Additionally|In addition|To conclude|Therefore|Thus|As a result|Consequently)/gi,
      '$1.\n\n$3'
    );
    
    // 3. Preserve existing paragraph breaks that may be in the original text
    processed = processed.replace(/\n\s*\n/g, '\n\n');
    
    // 4. Ensure lists are properly separated from preceding paragraphs
    processed = processed.replace(/([.!?])(\s*)(\d+\.\s)/g, '$1\n\n$3');
    
    return processed;
  };

  // Apply the pre-processing
  const processedContent = processContent(content);

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            
            return !inline && match ? (
              <CodeBlock
                language={match[1]}
                value={String(children).replace(/\n$/, '')}
                {...props}
              />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
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