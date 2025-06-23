import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from 'rehype-highlight';
import CodeBlock from "./CodeBlock";
import LoadingIndicator from "./LoadingIndicator";
import "./MarkdownRenderer.css";

const MarkdownRenderer = ({ content, isTyping }) => {
  // Simple function to extract raw code from markdown before it gets processed
  const extractRawCodeBlocks = (text) => {
    if (!text) return [];
    
    const codeBlocks = [];
    const codeBlockRegex = /```(\w*)?\n?([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      const [fullMatch, language, code] = match;
      const trimmedCode = code.trim();
      
      if (trimmedCode) {
        // Auto-detect language if not specified
        let detectedLanguage = language || '';
        if (!detectedLanguage) {
          if (trimmedCode.includes('print(') || trimmedCode.includes('def ')) {
            detectedLanguage = 'python';
          } else if (trimmedCode.includes('console.log') || trimmedCode.includes('function')) {
            detectedLanguage = 'javascript';
          } else if (trimmedCode.includes('<html>') || trimmedCode.includes('<!DOCTYPE')) {
            detectedLanguage = 'html';
          } else if (trimmedCode.includes('#include') || trimmedCode.includes('int main')) {
            detectedLanguage = 'c';
          } else if (trimmedCode.includes('public class') || trimmedCode.includes('System.out')) {
            detectedLanguage = 'java';
          }
        }
        
        codeBlocks.push({
          fullMatch,
          language: detectedLanguage,
          code: trimmedCode,
          index: codeBlocks.length
        });
      }
    }
    
    return codeBlocks;
  };

  const processContent = (text) => {
    if (!text) return '';

    let processedText = text;

    // --- STEP 1: Clean up malformed AI artifacts and repetitive content ---
    
    // Remove repetitive sections (common with this AI model)
    const lines = processedText.split('\n');
    const uniqueLines = [];
    const seenLines = new Set();
    
    for (const line of lines) {
      const cleanLine = line.trim().toLowerCase();
      if (cleanLine.length > 10 && !seenLines.has(cleanLine)) {
        uniqueLines.push(line);
        seenLines.add(cleanLine);
      } else if (cleanLine.length <= 10) {
        uniqueLines.push(line); // Keep short lines like headers
      }
    }
    processedText = uniqueLines.join('\n');
    
    // Fix malformed numbered list items like "**2.**" -> "2."
    processedText = processedText.replace(/\*\*(\d+\.)\*\*/g, '$1');
    
    // Fix malformed bullet points like "**-**" -> "-"
    processedText = processedText.replace(/\*\*(-|\*)\*\*/g, '$1');
    
    // Remove standalone asterisk lines
    processedText = processedText.replace(/^\s*\*{2,}\s*$/gm, '');
    
    // Fix titles ending in `:**` or `-**` by removing the `**`
    processedText = processedText.replace(/:\*\*/g, ':');
    processedText = processedText.replace(/-\*\*/g, '-');
    
    // Fix run-on list items by ensuring newlines before numbered items
    processedText = processedText.replace(/\s*\*\*(?=\s*\d+\.)/g, '\n');
    
    // Fix run-on bulleted items
    processedText = processedText.replace(/([.)])\s*-\s/g, '$1\n- ');

    // --- STEP 2: Convert pseudo-headings to proper markdown headings ---
    
    // Convert section headers like "Daily Routines:", "Weekly Routines:", etc. to headings
    processedText = processedText.replace(/^([A-Z][A-Za-z\s]{3,30}):$/gm, '## $1');
    
    // Convert section headers with parentheses and dates like "Soul (1960s-1970s):" or "R&B (1980s-present):"
    processedText = processedText.replace(/^([A-Z][A-Za-z&\s]{2,20}\s*\([^)]+\)):$/gm, '## $1');
    
    // Convert standalone section titles that are clearly headers (common in AI output)
    processedText = processedText.replace(/^(For [A-Z][A-Za-z\s]{3,30}):?$/gm, '## $1');
    processedText = processedText.replace(/^(Pros|Cons):?$/gm, '## $1');
    processedText = processedText.replace(/^(Daily Routines?|Weekly Routines?|Monthly Routines?|Seasonal Routines?):?$/gm, '## $1');
    processedText = processedText.replace(/^(Spring Cleaning|Summer [A-Za-z]+|Fall [A-Za-z]+|Winter [A-Za-z]+):?$/gm, '## $1');
    
    // Convert "Bold Section Titles:" style patterns to headings
    processedText = processedText.replace(/^(Bold Section Titles?|Numbered Learning Steps?|Bulleted Tips?|Code Examples?|Instructions?|Ingredients?|Conclusion|Introduction):?$/gm, '## $1');
    
    // Convert standalone lines that are clearly section headers (music genres, categories, etc.)
    // This handles patterns like "Soul (1960s-1970s):" that appear on their own line
    processedText = processedText.replace(/^([A-Z&][A-Za-z&\s]*\([^)]+\)):\s*$/gm, '## $1');
    
    // Convert numbered section patterns like "1. Introduction to..." to headings
    processedText = processedText.replace(/^(\d+\.\s+[A-Z][A-Za-z\s]{5,50})$/gm, '### $1');

    // --- STEP 3: Fix list formatting and spacing ---
    
    // FIX CRITICAL SPACING ISSUE: "2.Qi" -> "2. Qi" (missing space after period)
    // This handles cases where the AI might output malformed numbered lists
    processedText = processedText.replace(/^(\s*)(\d+\.)([A-Za-z])/gm, '$1$2 $3');
    
    // Also fix similar issues with bullet points: "-Word" -> "- Word"  
    processedText = processedText.replace(/^(\s*)([-*])([A-Za-z])/gm, '$1$2 $3');
    
    // Additional fix for numbered lists with missing spaces after periods in any position
    processedText = processedText.replace(/(\d+\.)([A-Za-z])/g, '$1 $2');
    
    // Fix bullet points with missing spaces anywhere in text
    processedText = processedText.replace(/(^|\s)([-*])([A-Za-z])/g, '$1$2 $3');
    
    // ENHANCED: Fix numbered lists with missing spaces after periods - more comprehensive
    // This catches patterns like "3.The" anywhere in the text, not just at line start
    processedText = processedText.replace(/(\d+\.)([A-Z][a-z])/g, '$1 $2');
    
    // ENHANCED: Fix spacing issues with "The" specifically (common in AI output)
    processedText = processedText.replace(/(\d+\.)The\s/g, '$1 The ');
    processedText = processedText.replace(/(\d+\.)A\s/g, '$1 A ');
    processedText = processedText.replace(/(\d+\.)An\s/g, '$1 An ');
    
    // Convert pseudo-numbered lists to proper markdown (AI often forgets line breaks)
    processedText = processedText.replace(/(\d+\)\s)/g, '\n$1');
    processedText = processedText.replace(/(\d+\.\s)/g, '\n$1');
    
    // Convert pseudo-bullet lists to proper markdown
    processedText = processedText.replace(/([.!?])\s*-\s+/g, '$1\n- ');
    processedText = processedText.replace(/^(\s*)-\s+/gm, '- ');
    
    // Fix lists that start mid-paragraph
    processedText = processedText.replace(/([a-z])\s+1\.\s+/g, '$1\n\n1. ');
    processedText = processedText.replace(/([a-z])\s+-\s+/g, '$1\n\n- ');

    // --- ENHANCED: Convert bullet points that follow numbered items to nested lists ---
    // This handles cases where AI outputs bullet points after numbered items that should be nested
    // Pattern: "1. Title: explanation\n• Item" or "1. Title: explanation\n- Item"
    processedText = processedText.replace(/^(\d+\.\s+[^:\n]*:.*?)(\n)([-•*]\s+)/gm, '$1$2  $3');
    
    // Also handle cases where there might be multiple bullet points that should be nested
    // Convert consecutive bullet points after a numbered item to nested format
    const textLines = processedText.split('\n');
    const processedLines = [];
    let inNestedBulletSection = false;
    let lastLineWasNumbered = false;
    
    for (let i = 0; i < textLines.length; i++) {
      const line = textLines[i];
      const trimmedLine = line.trim();
      
      // Check if current line is a numbered list item
      const isNumberedItem = /^\d+\.\s+/.test(trimmedLine);
      
      // Check if current line is a bullet point
      const isBulletPoint = /^[-•*]\s+/.test(trimmedLine);
      
      if (isNumberedItem) {
        // Reset nested section tracking
        inNestedBulletSection = false;
        lastLineWasNumbered = true;
        processedLines.push(line);
      } else if (isBulletPoint && (lastLineWasNumbered || inNestedBulletSection)) {
        // This bullet point should be nested under the previous numbered item
        inNestedBulletSection = true;
        lastLineWasNumbered = false;
        // Add proper indentation (2 spaces for nested list)
        processedLines.push('  ' + trimmedLine);
      } else if (trimmedLine === '') {
        // Empty line - preserve but don't change tracking
        processedLines.push(line);
      } else {
        // Any other content resets the nested section
        inNestedBulletSection = false;
        lastLineWasNumbered = false;
        processedLines.push(line);
      }
    }
    
    processedText = processedLines.join('\n');

    // --- STEP 4: SELECTIVE bold formatting - only for list titles and intro paragraphs ---
    
    // Bold ONLY the title portion of numbered list items - ENHANCED to handle more patterns
    // Pattern 1: Items with colons and explanatory text - IMPROVED for short titles
    processedText = processedText.replace(/^(\s*)(\d+\.\s*)([^:\n]{1,150})(:)(\s+.+)?$/gm, (match, indent, number, title, colon, rest) => {
      // Only bold if there's a colon AND the title doesn't look like a complete sentence
      // Avoid bolding complete sentences by checking for sentence-ending patterns
      const trimmedTitle = title.trim();
      const looksLikeCompleteSentence = /^[A-Z][^.!?]*[.!?]$/.test(trimmedTitle) || 
                                       /\b(the|and|or|but|with|for|by|in|on|at|to|from)\s+\w+$/.test(trimmedTitle.toLowerCase()) ||
                                       /^(Start|Begin|Make|Take|Do|Go|Try|Use|Keep|Put|Get|Set)\s+/.test(trimmedTitle);
      
      // Special handling for very short titles (like "Qi", "Yin", etc.) - these are likely concepts/terms
      const isShortConceptTitle = trimmedTitle.length <= 20 && /^[A-Z][a-z]*(\s+[A-Z][a-z]*)*$/.test(trimmedTitle);
      
      if ((!looksLikeCompleteSentence || isShortConceptTitle) && rest) {
        return `${indent}${number}**${trimmedTitle}**${colon}${rest}`;
      }
      return match;
    });
    
    // Pattern 2: Items that are clearly titles based on content - ENHANCED for short titles
    // Look for list items that contain key title-like words and are followed by explanatory text
    processedText = processedText.replace(/^(\s*)(\d+\.\s*)([A-Z][^:\n.!?]{1,80})\s*:\s*(.+)$/gm, (match, indent, number, title, explanation) => {
      // Check if this looks like a title (starts with capital, contains title-like words)
      const titleWords = title.toLowerCase();
      const titleIndicators = ['exercise', 'diet', 'sleep', 'stress', 'health', 'practice', 'maintain', 'improve', 'reduce', 'increase', 'avoid', 'limit', 'focus', 'engage', 'develop', 'build', 'create', 'establish', 'prioritize'];
      const hasIndicator = titleIndicators.some(indicator => titleWords.includes(indicator));
      
      // Short titles or titles with indicators are likely to be actual titles
      if (hasIndicator || title.length < 50) {
        return `${indent}${number}**${title}**: ${explanation}`;
      }
      return match;
    });
    
    // Bold ONLY the title portion of bulleted list items - ENHANCED to handle more patterns  
    // Pattern 1: Items with colons and explanatory text - IMPROVED for short titles
    processedText = processedText.replace(/^(\s*)([-*]\s*)([^:\n]{1,150})(:)(\s+.+)?$/gm, (match, indent, bullet, title, colon, rest) => {
      // Only bold if there's a colon AND the title doesn't look like a complete sentence
      const trimmedTitle = title.trim();
      const looksLikeCompleteSentence = /^[A-Z][^.!?]*[.!?]$/.test(trimmedTitle) || 
                                       /\b(the|and|or|but|with|for|by|in|on|at|to|from)\s+\w+$/.test(trimmedTitle.toLowerCase()) ||
                                       /^(Start|Begin|Make|Take|Do|Go|Try|Use|Keep|Put|Get|Set)\s+/.test(trimmedTitle);
      
      // Special handling for very short titles
      const isShortConceptTitle = trimmedTitle.length <= 20 && /^[A-Z][a-z]*(\s+[A-Z][a-z]*)*$/.test(trimmedTitle);
      
      if ((!looksLikeCompleteSentence || isShortConceptTitle) && rest) {
        return `${indent}${bullet}**${trimmedTitle}**${colon}${rest}`;
      }
      return match;
    });
    
    // Pattern 2: Bulleted items that are clearly titles - ENHANCED for short titles
    processedText = processedText.replace(/^(\s*)([-*]\s*)([A-Z][^:\n.!?]{1,80})\s*:\s*(.+)$/gm, (match, indent, bullet, title, explanation) => {
      const titleWords = title.toLowerCase();
      const titleIndicators = ['exercise', 'diet', 'sleep', 'stress', 'health', 'practice', 'maintain', 'improve', 'reduce', 'increase', 'avoid', 'limit', 'focus', 'engage', 'develop', 'build', 'create', 'establish', 'prioritize'];
      const hasIndicator = titleIndicators.some(indicator => titleWords.includes(indicator));
      
      if (hasIndicator || title.length < 50) {
        return `${indent}${bullet}**${title}**: ${explanation}`;
      }
      return match;
    });

    // Bold the first introductory paragraph if it's at the beginning and relatively short
    const paragraphs = processedText.split('\n\n');
    if (paragraphs.length > 0 && paragraphs[0].trim().length > 20 && paragraphs[0].trim().length < 300) {
      const firstPara = paragraphs[0].trim();
      // Check if it's not already bolded and doesn't contain markdown formatting
      if (!firstPara.includes('**') && !firstPara.includes('##') && !firstPara.match(/^\d+\./)) {
        paragraphs[0] = `**${firstPara}**`;
        processedText = paragraphs.join('\n\n');
      }
    }

    // --- STEP 5: Clean up spacing and structure ---
    
    // Ensure proper spacing around headings
    processedText = processedText.replace(/\n(#{1,6}\s)/g, '\n\n$1');
    processedText = processedText.replace(/(#{1,6}.*)\n(?!\n)/g, '$1\n\n');
    
    // Ensure proper spacing around lists
    processedText = processedText.replace(/\n(\d+\.\s)/g, '\n\n$1');
    processedText = processedText.replace(/\n(-\s)/g, '\n\n$1');
    
    // Clean up multiple consecutive line breaks
    processedText = processedText.replace(/\n{3,}/g, '\n\n');
    
    // Remove trailing whitespace
    processedText = processedText.replace(/[ \t]+$/gm, '');

    // FINAL STEP: Clean up spaces before colons in list items - COMPREHENSIVE VERSION
    // This runs AFTER all other processing to ensure no other regex interferes
    // This handles spaces before colons anywhere in the list item text
    
    // AGGRESSIVE APPROACH: Remove ALL spaces before colons globally, then be more specific
    // First, remove any sequence of whitespace characters before colons
    processedText = processedText.replace(/\s+:/g, ':');
    
    // Then handle edge cases where there might be multiple spaces or tabs
    processedText = processedText.replace(/[ \t]+:/g, ':');
    
    // Extra aggressive: handle any Unicode whitespace before colons
    processedText = processedText.replace(/[\s\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]+:/g, ':');

    return processedText;
  };

  // Extract raw code blocks from the original content
  const rawCodeBlocks = extractRawCodeBlocks(content);
  const processedContent = processContent(content);

  console.log('🔍 MarkdownRenderer Debug:');
  console.log('- Original content length:', content?.length || 0);
  console.log('- Extracted raw code blocks:', rawCodeBlocks.length);
  console.log('- Raw code blocks:', rawCodeBlocks.map(block => `${block.language}: "${block.code.substring(0, 30)}..."`));
  
  // Debug: Show first 200 characters of original content
  if (content) {
    console.log('- First 200 chars of original:', JSON.stringify(content.substring(0, 200)));
  }
  
  // Debug: Show first 200 characters of processed content
  if (processedContent) {
    console.log('- First 200 chars of processed:', JSON.stringify(processedContent.substring(0, 200)));
  }

  if (isTyping) {
    return <LoadingIndicator />;
  }

  // Helper function to recursively extract text from React elements
  const extractTextRecursively = (element) => {
    if (typeof element === 'string') {
      return element;
    }
    if (typeof element === 'number') {
      return element.toString();
    }
    if (Array.isArray(element)) {
      return element.map(extractTextRecursively).join('');
    }
    if (element && typeof element === 'object') {
      if (element.props && element.props.children) {
        return extractTextRecursively(element.props.children);
      }
      if (element.children) {
        return extractTextRecursively(element.children);
      }
    }
    return '';
  };

  // Counter to track which code block we're currently rendering
  let codeBlockIndex = 0;

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
            
            // Get the corresponding raw code block
            let rawCode = '';
            if (rawCodeBlocks[codeBlockIndex]) {
              rawCode = rawCodeBlocks[codeBlockIndex].code;
              console.log(`✅ Using raw code block ${codeBlockIndex}:`, rawCode.substring(0, 50) + '...');
            }
            
            // Increment counter for next code block
            codeBlockIndex++;
            
            // Fallback: extract from node or children if no raw code found
            if (!rawCode) {
              if (node && node.children && node.children.length > 0) {
                rawCode = node.children
                  .filter(child => child.type === 'text')
                  .map(child => child.value || '')
                  .join('');
              }
              
              if (!rawCode && children) {
                if (typeof children === 'string') {
                  rawCode = children;
                } else if (Array.isArray(children)) {
                  rawCode = children
                    .filter(child => typeof child === 'string')
                    .join('');
                }
              }
              
              if (!rawCode) {
                rawCode = extractTextRecursively(children);
              }
              
              console.log('⚠️ Using fallback code extraction:', rawCode.substring(0, 50) + '...');
            }

            return (
              <CodeBlock
                language={language}
                codeString={rawCode}
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